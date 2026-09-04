const BT_SOURCE_DEFAULT_ID = '1P7_1s7YQYxj2Ee-IsZQoQjEd0lsJT7ANfD2iH2dOgB8';
const BT_SOURCE_SHEETS = ['Data R1', 'Data R2', 'Data R3', 'Data R4', 'Data R5', 'Data R6', 'Data R7', 'Data R4P', 'Data SW'];

function getBantuanTeknisSourceId_() {
  return getProperties_().getProperty('UPJKP_BT_SOURCE_ID') || BT_SOURCE_DEFAULT_ID;
}

function sourceRegionCode_(sheetName) {
  const value = String(sheetName).replace(/^Data\s+/, '').toUpperCase();
  return value === 'R4P' ? 'R4P' : value === 'SW' ? 'SW' : value;
}

function sourceDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) return dateIso_(value);
  const text = String(value || '').trim();
  if (!text) return '';
  let match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (match) return match[3] + '-' + String(match[2]).padStart(2, '0') + '-' + String(match[1]).padStart(2, '0');
  match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) return match[1] + '-' + String(match[2]).padStart(2, '0') + '-' + String(match[3]).padStart(2, '0');
  const parsed = parseDate_(text);
  return parsed ? dateIso_(parsed) : '';
}

function sourceText_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

function sourceRecord_(values, sheetName, rowNumber) {
  const region = sourceRegionCode_(sheetName);
  const no = sourceText_(values[0]) || String(rowNumber - 3);
  const company = sourceText_(values[1]);
  const kebun = sourceText_(values[2]);
  if (!company && !kebun) return null;
  const sourceKey = region + '-' + no.replace(/[^A-Za-z0-9]/g, '');
  const activityId = 'BT-' + sourceKey.padStart(4, '0');
  const reportId = 'LAP-BT-' + sourceKey.padStart(4, '0');
  const statusSource = sourceText_(values[28]).toUpperCase();
  const draft = sourceDate_(values[6]);
  const sent = sourceDate_(values[27]);
  const revised = sourceDate_(values[25]);
  const printed = sourceDate_(values[26]);
  const checkpointDates = [];
  for (let index = 9; index <= 24; index += 2) {
    if (sourceDate_(values[index])) checkpointDates.push({ date: sourceDate_(values[index]), in: true, number: (index - 9) / 2 + 1 });
    if (sourceDate_(values[index + 1])) checkpointDates.push({ date: sourceDate_(values[index + 1]), in: false, number: (index - 9) / 2 + 1 });
  }
  const lastCheckpoint = checkpointDates.length ? checkpointDates[checkpointDates.length - 1] : null;
  let checkpoint = lastCheckpoint ? 'KOREKTOR ' + lastCheckpoint.number : '';
  if (printed) checkpoint = 'CETAK 1';
  if (sent || statusSource === 'SELESAI') checkpoint = 'SELESAI';
  const year = Number(sourceText_(values[29])) || (draft ? Number(draft.slice(0, 4)) : Number(Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyy')));
  const visit = sourceText_(values[4]);
  const note = ['SOURCE_SYNC=BT', visit ? 'Tanggal kunjungan: ' + visit : '', sourceText_(values[31])].filter(Boolean).join(' | ');
  return {
    sourceKey: sourceKey, activityId: activityId, reportId: reportId, company: company, kebun: kebun,
    pic: sourceText_(values[3]), activity: sourceText_(values[5]) || 'Bantuan Teknis', region: region, year: year,
    draft: draft, revised: revised, printed: printed, sent: sent, checkpoint: checkpoint,
    checkpointDate: lastCheckpoint ? lastCheckpoint.date : (printed || revised || draft), statusSource: statusSource,
    folder: sourceText_(values[30]), note: note,
  };
}

function upsertMappedRecord_(sheet, idField, id, mapped) {
  const rowNumber = findRow_(sheet, idField, id);
  const headers = getHeaders_(sheet);
  if (!rowNumber) {
    appendRecord_(sheet, mapped);
    return 'inserted';
  }
  const current = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  const merged = {};
  headers.forEach(function (header, index) { merged[header] = current[index]; });
  Object.keys(mapped).forEach(function (key) { merged[key] = mapped[key]; });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([headers.map(function (header) { return merged[header] === undefined ? '' : merged[header]; })]);
  return 'updated';
}

function syncBantuanTeknisNow(options) {
  options = options || {};
  assertConfigured_();
  const sourceId = options.sourceSpreadsheetId || getBantuanTeknisSourceId_();
  let source;
  try { source = SpreadsheetApp.openById(sourceId); } catch (error) { throw new Error('Google Sheet sumber Bantuan Teknis tidak dapat dibuka. Pastikan akses akun Apps Script tersedia. ' + error.message); }
  const records = [];
  const missingSheets = [];
  BT_SOURCE_SHEETS.forEach(function (sheetName) {
    const sheet = source.getSheetByName(sheetName);
    if (!sheet) { missingSheets.push(sheetName); return; }
    const lastRow = Math.min(Math.max(sheet.getLastRow(), 3), 1001);
    if (lastRow < 4) return;
    sheet.getRange(4, 1, lastRow - 3, 32).getDisplayValues().forEach(function (values, index) {
      const record = sourceRecord_(values, sheetName, index + 4);
      if (record) records.push(record);
    });
  });
  let insertedActivities = 0, updatedActivities = 0, insertedReports = 0, updatedReports = 0, companiesCreated = 0;
  const errors = [];
  const transaction = withWriteTransaction_({
    actor: currentUser_(), action: 'sync_bt_source', tableName: 'MULTI', recordId: sourceId,
    reason: 'Sinkronisasi Google Sheet Bantuan Teknis',
  }, function (master) {
    const companiesSheet = master.getSheetByName('MASTER_PERUSAHAAN');
    const activitiesSheet = master.getSheetByName('KEGIATAN');
    const reportsSheet = master.getSheetByName('MONITORING_LAPORAN');
    const companies = {};
    rowsFromSheet_(companiesSheet, false).forEach(function (row) { companies[String(row.nama || '').toLowerCase().replace(/\s+/g, ' ').trim()] = row.company_id; });
    records.forEach(function (record) {
      try {
        const companyKey = record.company.toLowerCase().replace(/\s+/g, ' ').trim();
        let companyId = companies[companyKey];
        if (!companyId) {
          companyId = 'PRSH-' + String(nextSequence_(companiesSheet, 'company_id', 'PRSH-')).padStart(4, '0');
          upsertMappedRecord_(companiesSheet, 'company_id', companyId, { company_id: companyId, nama: record.company, nama_singkat: record.company, regional: record.region, status_aktif: 'YA', catatan: 'SOURCE_SYNC=BT', created_at: nowIso_(), updated_at: nowIso_() });
          companies[companyKey] = companyId; companiesCreated += 1;
        }
        const activityResult = upsertMappedRecord_(activitiesSheet, 'activity_id', record.activityId, {
          activity_id: record.activityId, display_id: record.activityId, company_id: companyId, perusahaan: record.company,
          subbagian: 'BT', kategori: 'BT', instansi: '', jenis_kegiatan: record.activity, regional: record.region,
          kebun_lokasi: record.kebun, tahun: record.year, tanggal_surat_masuk: record.draft, nilai_kontrak: 0, hpp: 0,
          pic: record.pic, status: record.statusSource === 'SELESAI' ? 'SELESAI' : 'AKTIF', catatan: record.note,
          updated_at: nowIso_(), created_at: nowIso_(), archived_at: '',
        });
        if (activityResult === 'inserted') insertedActivities += 1; else updatedActivities += 1;
        const reportResult = upsertMappedRecord_(reportsSheet, 'report_id', record.reportId, {
          report_id: record.reportId, activity_id: record.activityId, company_id: companyId, perusahaan: record.company,
          regional: record.region, kebun: record.kebun, nama_kegiatan: record.activity, tahun: record.year, workflow: 'UMUM',
          tanggal_draft_masuk: record.draft, checkpoint_terakhir: record.checkpoint, tanggal_checkpoint: record.checkpointDate,
          tanggal_revisi: record.revised, tanggal_cetak: record.printed, tanggal_kirim: record.sent,
          folder_laporan: record.folder, status: record.statusSource || (record.checkpoint ? 'PROSES' : 'DRAFT'), pic: record.pic,
          catatan: record.note, updated_at: nowIso_(), created_at: nowIso_(), archived_at: '',
        });
        if (reportResult === 'inserted') insertedReports += 1; else updatedReports += 1;
      } catch (error) { errors.push(record.sourceKey + ': ' + error.message); }
    });
  }, { skipBackup: Boolean(options.automatic) });
  return success_({
    sourceSpreadsheetId: sourceId, sourceUrl: source.getUrl(), rowsRead: records.length,
    insertedActivities: insertedActivities, updatedActivities: updatedActivities,
    insertedReports: insertedReports, updatedReports: updatedReports, companiesCreated: companiesCreated,
    missingSheets: missingSheets, errors: errors.slice(0, 20), backupId: transaction.backupId,
    message: records.length + ' baris Bantuan Teknis disinkronkan (' + insertedReports + ' baru, ' + updatedReports + ' diperbarui).',
  });
}

function syncBantuanTeknis() {
  const result = syncBantuanTeknisNow({ automatic: false });
  return result;
}

function syncBantuanTeknisFromEdit() {
  return syncBantuanTeknisNow({ automatic: true });
}

function connectBantuanTeknisSource() {
  const properties = getProperties_();
  properties.setProperty('UPJKP_BT_SOURCE_ID', BT_SOURCE_DEFAULT_ID);
  const existing = ScriptApp.getProjectTriggers().some(function (trigger) { return trigger.getHandlerFunction() === 'syncBantuanTeknisFromEdit'; });
  if (!existing) ScriptApp.newTrigger('syncBantuanTeknisFromEdit').forSpreadsheet(BT_SOURCE_DEFAULT_ID).onEdit().create();
  return syncBantuanTeknisNow({ automatic: false, sourceSpreadsheetId: BT_SOURCE_DEFAULT_ID });
}
