const RP_FORMAT_SYNC_TAG = 'SOURCE_SYNC=RP/FORMAT_SERAGAM';
const RP_FORMAT_LEGACY_SYNC_TAG = 'SOURCE_SYNC=RP/BT_FORMAT';

function recommendationBTFormatActivityId_(sourceKey) {
  return categorySourceId_('RP', sourceKey);
}

function recommendationBTFormatReportId_(sourceKey) {
  return reportIdForActivity_(recommendationBTFormatActivityId_(sourceKey));
}

function recommendationBTFormatSourceNote_(sourceNote, sheetName) {
  return [RP_FORMAT_SYNC_TAG, sourceNote.replace('SOURCE_SYNC=BT', '').trim(), 'SHEET=' + sheetName]
    .filter(Boolean)
    .join(' | ');
}

function recommendationBTFormatIsSourceNote_(note) {
  note = String(note || '');
  return note.indexOf(RP_FORMAT_SYNC_TAG) >= 0 || note.indexOf(RP_FORMAT_LEGACY_SYNC_TAG) >= 0;
}

function recommendationBTFormatExplicitCorrectors_(value) {
  const text = sourceText_(value);
  const marker = 'KOREKTOR_RP_JSON=';
  const start = text.indexOf(marker);
  if (start < 0) return [];
  try {
    const parsed = JSON.parse(text.slice(start + marker.length));
    if (!Array.isArray(parsed)) return [];
    return parsed.map(function (item, index) {
      return {
        code: sourceText_(item.t) || ('KOREKTOR ' + (index + 1)),
        order: index + 1,
        person: sourceText_(item.n),
        incoming: sourceDate_(item.m),
        outgoing: sourceDate_(item.k),
      };
    }).filter(function (stage) { return Boolean(stage.person); });
  } catch (error) {
    throw new Error('Detail korektor RP format seragam tidak valid: ' + error.message);
  }
}

function recommendationBTFormatRecord_(values, sheetName, rowNumber, correctorHeaders) {
  const source = sourceRecord_(values, sheetName, rowNumber, correctorHeaders);
  if (!source) return null;
  const directCorrector = sourceText_(values[8]);
  const explicitCorrectors = recommendationBTFormatExplicitCorrectors_(values[31]);
  if (explicitCorrectors.length) {
    source.correctorStages = explicitCorrectors;
  } else {
    source.correctorStages = source.correctorStages.filter(function (stage) { return stage.code !== 'DRAFT KOREKTOR'; });
    if (directCorrector && !source.correctorStages.some(function (stage) { return stage.person === directCorrector; })) {
      source.correctorStages.push({
        code: 'KOREKTOR TAMBAHAN', order: 9, person: directCorrector,
        incoming: sourceDate_(values[7]), outgoing: '',
      });
    }
  }
  const lastCorrector = source.correctorStages.slice().reverse().filter(function (stage) { return Boolean(stage.person); })[0] || null;
  source.corrector = lastCorrector ? lastCorrector.person : (directCorrector || source.corrector);
  if (!source.printed && !source.sent) {
    const latestStage = source.correctorStages.reduce(function (latest, stage) {
      const date = stage.outgoing || stage.incoming;
      return date && (!latest || date > latest.date) ? { code: stage.code, date: date } : latest;
    }, null);
    if (latestStage) {
      source.checkpoint = latestStage.code;
      source.checkpointDate = latestStage.date;
    } else if (lastCorrector) {
      source.checkpoint = lastCorrector.code;
    }
  }
  source.activityId = recommendationBTFormatActivityId_(source.sourceKey);
  source.reportId = recommendationBTFormatReportId_(source.sourceKey);
  source.note = recommendationBTFormatSourceNote_(source.note, sheetName);
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
    const correctorHeaders = sheet.getRange(2, 1, 1, 32).getDisplayValues()[0];
    sheet.getRange(4, 1, lastRow - 3, 32).getDisplayValues().forEach(function (values, index) {
      const rowNumber = index + 4;
      const record = recommendationBTFormatRecord_(values, sheetName, rowNumber, correctorHeaders);
      if (!record) return;
      const originalKey = record.sourceKey;
      let uniqueKey = originalKey;
      if (seen[uniqueKey]) uniqueKey += '-ROW' + rowNumber;
      seen[uniqueKey] = true;
      if (uniqueKey !== originalKey) {
        record.sourceKey = uniqueKey;
        record.activityId = recommendationBTFormatActivityId_(uniqueKey);
        record.reportId = recommendationBTFormatReportId_(uniqueKey);
        record.note += ' | NOMOR_SUMBER_GANDA=' + originalKey;
      }
      records.push(record);
    });
  });
  if (!records.length) throw new Error('Tidak ada baris format Data R1–Data SW yang dapat dipetakan.');
  let insertedActivities = 0, updatedActivities = 0, insertedReports = 0, updatedReports = 0, companiesCreated = 0, obsoleteActivitiesArchived = 0, teamRows = 0, historyRows = 0;
  const errors = [], liveActivities = {};
  records.forEach(function (record) { liveActivities[record.activityId] = true; });
  const transaction = withWriteTransaction_({ actor: currentUser_(), action: 'sync_rp_bt_format_source', tableName: 'MULTI', recordId: source.getId(), reason: 'Sinkronisasi format Data regional Rekomendasi Pemupukan' }, function (master) {
    const companiesTable = recommendationMemoryTable_(master.getSheetByName('MASTER_PERUSAHAAN'), 'company_id');
    const activitiesTable = recommendationMemoryTable_(master.getSheetByName('KEGIATAN'), 'activity_id');
    const reportsTable = recommendationMemoryTable_(master.getSheetByName('MONITORING_LAPORAN'), 'report_id');
    const historyTable = recommendationMemoryTable_(master.getSheetByName('HISTORI_LAPORAN'), 'history_id');
    const teamTable = recommendationMemoryTable_(master.getSheetByName('TIM_SPJ'), 'team_id');
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
      if (!row.archived_at && String(row.kategori || '').toUpperCase() === 'RP' && (note.indexOf('SOURCE_SYNC=RP/MONITORING') >= 0 || recommendationBTFormatIsSourceNote_(note)) && !liveActivities[String(row.activity_id)]) {
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
          companiesTable.upsert(companyId, { company_id: companyId, nama: companyName, nama_singkat: companyName, jenis_instansi: record.region === 'SW' ? 'Swasta' : 'PTPN', regional: record.region, status_aktif: 'YA', catatan: RP_FORMAT_SYNC_TAG, created_at: nowIso_(), updated_at: nowIso_(), archived_at: '' });
          companies[companyKey] = companyId;
          companiesCreated += 1;
        }
        const activityResult = activitiesTable.upsert(record.activityId, { activity_id: record.activityId, display_id: record.activityId, company_id: companyId, perusahaan: companyName, subbagian: 'RPJID', kategori: 'RP', instansi: record.region, jenis_kegiatan: record.activity || 'Rekomendasi Pemupukan', regional: record.region, kebun_lokasi: record.kebun, tahun: record.year, tanggal_surat_masuk: record.draft, tanggal_mulai: record.draft, pic: record.pic, status: record.statusSource === 'SELESAI' || record.sent ? 'SELESAI' : 'AKTIF', catatan: record.note, created_at: nowIso_(), updated_at: nowIso_(), archived_at: '' });
        if (activityResult === 'inserted') insertedActivities += 1; else updatedActivities += 1;
        const reportResult = reportsTable.upsert(record.reportId, { report_id: record.reportId, activity_id: record.activityId, company_id: companyId, perusahaan: companyName, regional: record.region, kebun: record.kebun, nama_kegiatan: record.activity || 'Rekomendasi Pemupukan', tahun: record.year, workflow: 'RP', tanggal_draft_masuk: record.draft, checkpoint_terakhir: record.checkpoint, korektor_terakhir: record.corrector, tanggal_checkpoint: record.checkpointDate, tanggal_revisi: record.revised, tanggal_cetak: record.printed, tanggal_kirim: record.sent, status: record.statusSource || (record.checkpoint ? 'PROSES' : 'DRAFT'), pic: record.pic, catatan: record.note, created_at: nowIso_(), updated_at: nowIso_(), archived_at: '' });
        if (reportResult === 'inserted') insertedReports += 1; else updatedReports += 1;
        record.correctorStages.forEach(function (stage) {
          const historyId = record.reportId + '-' + stage.code.replace(/\s+/g, '-');
          historyTable.upsert(historyId, {
            history_id: historyId, report_id: record.reportId, checkpoint: stage.code, urutan: stage.order,
            korektor: stage.person, tanggal_masuk: stage.incoming, tanggal_selesai: stage.outgoing,
            catatan: RP_FORMAT_SYNC_TAG, created_at: nowIso_(), created_by: currentUser_(),
          });
          historyRows += 1;
        });
        recommendationMonitoringTeam_(record.pic).forEach(function (name, index) {
          teamTable.upsert('TEAM-' + record.activityId + '-' + (index + 1), { team_id: 'TEAM-' + record.activityId + '-' + (index + 1), activity_id: record.activityId, nama: name, peran: index === 0 ? 'Leader' : 'Anggota', hk: 0, nominal_hk: 0, total_spj: 0, panjar: 0, realisasi_panjar: 0, catatan: RP_FORMAT_SYNC_TAG, created_at: nowIso_(), updated_at: nowIso_() });
          teamRows += 1;
        });
      } catch (error) { errors.push(record.sourceKey + ': ' + error.message); }
    });
    reportsTable.rows.forEach(function (values) {
      const row = {};
      reportsTable.headers.forEach(function (header, index) { row[header] = values[index]; });
      if (!row.archived_at && String(row.catatan || '').indexOf('SOURCE_SYNC=RP/') >= 0 && !liveActivities[String(row.activity_id)]) reportsTable.upsert(row.report_id, { archived_at: nowIso_(), updated_at: nowIso_() });
    });
    companiesTable.flush(); activitiesTable.flush(); reportsTable.flush(); historyTable.flush(); teamTable.flush();
  }, { skipBackup: Boolean(options.automatic) });
  return success_({ sourceSpreadsheetId: source.getId(), sourceUrl: source.getUrl(), sourceLayout: 'RP_FORMAT_SERAGAM_REGIONAL', sourceSheets: availableSheets, rowsRead: records.length, insertedActivities: insertedActivities, updatedActivities: updatedActivities, insertedReports: insertedReports, updatedReports: updatedReports, insertedBilling: 0, updatedBilling: 0, historyRows: historyRows, teamRows: teamRows, companiesCreated: companiesCreated, obsoleteActivitiesArchived: obsoleteActivitiesArchived, legacyReportsArchived: 0, errors: errors.slice(0, 20), backupId: transaction.backupId, message: records.length + ' kegiatan format Data regional disinkronkan sebagai Rekomendasi Pemupukan (' + historyRows + ' tahap korektor).' });
}
