function recommendationBTFormatRecord_(values, sheetName, rowNumber) {
  const source = sourceRecord_(values, sheetName, rowNumber);
  if (!source) return null;
  source.activityId = 'RP-BT-' + source.sourceKey;
  source.reportId = 'LAP-RP-BT-' + source.sourceKey;
  source.note = ['SOURCE_SYNC=RP/BT_FORMAT', source.note.replace('SOURCE_SYNC=BT', ''), 'SHEET=' + sheetName].filter(Boolean).join(' | ');
  return source;
}

function syncRekomendasiBTFormatNow_(source, options) {
  const records = [], availableSheets = [], seen = {};
  BT_SOURCE_SHEETS.forEach(function (sheetName) {
    const sheet = source.getSheetByName(sheetName);
    if (!sheet) return;
    availableSheets.push(sheetName);
    const lastRow = Math.min(Math.max(sheet.getLastRow(), 3), 10000);
    if (lastRow < 4) return;
    sheet.getRange(4, 1, lastRow - 3, 32).getDisplayValues().forEach(function (values, index) {
      const rowNumber = index + 4;
      const record = recommendationBTFormatRecord_(values, sheetName, rowNumber);
      if (!record) return;
      const originalKey = record.sourceKey;
      let uniqueKey = originalKey;
      if (seen[uniqueKey]) uniqueKey += '-ROW' + rowNumber;
      seen[uniqueKey] = true;
      if (uniqueKey !== originalKey) {
        record.sourceKey = uniqueKey;
        record.activityId = 'RP-BT-' + uniqueKey;
        record.reportId = 'LAP-RP-BT-' + uniqueKey;
        record.note += ' | NOMOR_SUMBER_GANDA=' + originalKey;
      }
      records.push(record);
    });
  });
  if (!records.length) throw new Error('Tidak ada baris format Data R1–Data SW yang dapat dipetakan.');
  let insertedActivities = 0, updatedActivities = 0, insertedReports = 0, updatedReports = 0, companiesCreated = 0, obsoleteActivitiesArchived = 0;
  const errors = [], liveActivities = {};
  records.forEach(function (record) { liveActivities[record.activityId] = true; });
  const transaction = withWriteTransaction_({ actor: currentUser_(), action: 'sync_rp_bt_format_source', tableName: 'MULTI', recordId: source.getId(), reason: 'Sinkronisasi format Data regional Rekomendasi Pemupukan' }, function (master) {
    const companiesTable = recommendationMemoryTable_(master.getSheetByName('MASTER_PERUSAHAAN'), 'company_id');
    const activitiesTable = recommendationMemoryTable_(master.getSheetByName('KEGIATAN'), 'activity_id');
    const reportsTable = recommendationMemoryTable_(master.getSheetByName('MONITORING_LAPORAN'), 'report_id');
    const companies = {};
    let nextCompanyNumber = 1;
    companiesTable.rows.forEach(function (values) {
      const row = {};
      companiesTable.headers.forEach(function (header, index) { row[header] = values[index]; });
      if (row.archived_at) return;
      companies[String(row.nama || '').toLowerCase().replace(/\s+/g, ' ').trim()] = row.company_id;
      const match = String(row.company_id || '').match(/^PRSH-(\d+)$/);
      if (match) nextCompanyNumber = Math.max(nextCompanyNumber, Number(match[1]) + 1);
    });
    activitiesTable.rows.forEach(function (values) {
      const row = {};
      activitiesTable.headers.forEach(function (header, index) { row[header] = values[index]; });
      const note = String(row.catatan || '');
      if (!row.archived_at && String(row.kategori || '').toUpperCase() === 'RP' && (note.indexOf('SOURCE_SYNC=RP/MONITORING') >= 0 || note.indexOf('SOURCE_SYNC=RP/BT_FORMAT') >= 0) && !liveActivities[String(row.activity_id)]) {
        activitiesTable.upsert(row.activity_id, { archived_at: nowIso_(), updated_at: nowIso_() });
        obsoleteActivitiesArchived += 1;
      }
    });
    records.forEach(function (record) {
      try {
        const companyName = String(record.company || record.kebun || 'Belum ditentukan').trim();
        const companyKey = companyName.toLowerCase().replace(/\s+/g, ' ');
        let companyId = companies[companyKey];
        if (!companyId) {
          companyId = 'PRSH-' + String(nextCompanyNumber).padStart(4, '0');
          nextCompanyNumber += 1;
          companiesTable.upsert(companyId, { company_id: companyId, nama: companyName, nama_singkat: companyName, jenis_instansi: record.region === 'SW' ? 'Swasta' : 'PTPN', regional: record.region, status_aktif: 'YA', catatan: 'SOURCE_SYNC=RP/BT_FORMAT', created_at: nowIso_(), updated_at: nowIso_(), archived_at: '' });
          companies[companyKey] = companyId;
          companiesCreated += 1;
        }
        const activityResult = activitiesTable.upsert(record.activityId, { activity_id: record.activityId, display_id: record.sourceKey, company_id: companyId, perusahaan: companyName, subbagian: 'RPJID', kategori: 'RP', instansi: record.region, jenis_kegiatan: record.activity || 'Rekomendasi Pemupukan', regional: record.region, kebun_lokasi: record.kebun, tahun: record.year, tanggal_surat_masuk: record.draft, tanggal_mulai: record.draft, pic: record.pic, status: record.statusSource === 'SELESAI' || record.sent ? 'SELESAI' : 'AKTIF', catatan: record.note, created_at: nowIso_(), updated_at: nowIso_(), archived_at: '' });
        if (activityResult === 'inserted') insertedActivities += 1; else updatedActivities += 1;
        const reportResult = reportsTable.upsert(record.reportId, { report_id: record.reportId, activity_id: record.activityId, company_id: companyId, perusahaan: companyName, regional: record.region, kebun: record.kebun, nama_kegiatan: record.activity || 'Rekomendasi Pemupukan', tahun: record.year, workflow: 'RP', tanggal_draft_masuk: record.draft, checkpoint_terakhir: record.checkpoint, tanggal_checkpoint: record.checkpointDate, tanggal_revisi: record.revised, tanggal_cetak: record.printed, tanggal_kirim: record.sent, status: record.statusSource || (record.checkpoint ? 'PROSES' : 'DRAFT'), pic: record.pic, catatan: record.note, created_at: nowIso_(), updated_at: nowIso_(), archived_at: '' });
        if (reportResult === 'inserted') insertedReports += 1; else updatedReports += 1;
      } catch (error) { errors.push(record.sourceKey + ': ' + error.message); }
    });
    reportsTable.rows.forEach(function (values) {
      const row = {};
      reportsTable.headers.forEach(function (header, index) { row[header] = values[index]; });
      if (!row.archived_at && String(row.catatan || '').indexOf('SOURCE_SYNC=RP/') >= 0 && !liveActivities[String(row.activity_id)]) reportsTable.upsert(row.report_id, { archived_at: nowIso_(), updated_at: nowIso_() });
    });
    companiesTable.flush(); activitiesTable.flush(); reportsTable.flush();
  }, { skipBackup: Boolean(options.automatic) });
  return success_({ sourceSpreadsheetId: source.getId(), sourceUrl: source.getUrl(), sourceLayout: 'BT_FORMAT_REGIONAL', sourceSheets: availableSheets, rowsRead: records.length, insertedActivities: insertedActivities, updatedActivities: updatedActivities, insertedReports: insertedReports, updatedReports: updatedReports, insertedBilling: 0, updatedBilling: 0, historyRows: 0, teamRows: 0, companiesCreated: companiesCreated, obsoleteActivitiesArchived: obsoleteActivitiesArchived, legacyReportsArchived: 0, errors: errors.slice(0, 20), backupId: transaction.backupId, message: records.length + ' kegiatan format Data regional disinkronkan sebagai Rekomendasi Pemupukan.' });
}
