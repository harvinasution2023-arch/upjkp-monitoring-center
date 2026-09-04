function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');
  template.appName = APP.NAME;
  template.version = APP.VERSION;
  return template.evaluate()
    .setTitle(APP.NAME)
    .setFaviconUrl('https://www.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function getBootstrap(year) {
  if (!isConfigured_()) {
    return success_({ configured: false, application: APP.NAME, version: APP.VERSION });
  }
  const spreadsheet = getDatabase_();
  validateSchema_(spreadsheet);
  return success_({
    configured: true,
    application: APP.NAME,
    version: APP.VERSION,
    user: currentUser_(),
    databaseName: spreadsheet.getName(),
    databaseUrl: spreadsheet.getUrl(),
    dashboard: buildDashboard_(year ? Number(year) : null),
  });
}

function createActivity(payload) {
  payload = payload || {};
  const companyName = String(payload.perusahaan || '').trim();
  if (!companyName) throw new Error('Nama perusahaan wajib diisi.');
  const category = String(payload.kategori || 'BT').toUpperCase();
  const subsection = String(payload.subbagian || CATEGORY_TO_SUBBAGIAN[category] || 'ADM').toUpperCase();
  if (!SUBBAGIAN[subsection]) throw new Error('Subbagian tidak valid.');
  const year = Number(payload.tahun || Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyy'));
  if (!isFinite(year) || year < 2000 || year > 2100) throw new Error('Tahun tidak valid.');

  let created = null;
  const transaction = withWriteTransaction_({
    actor: currentUser_(), action: 'create', tableName: 'KEGIATAN', recordId: 'AUTO',
    reason: 'Pencatatan kegiatan dari web app',
  }, function (spreadsheet) {
    const companySheet = spreadsheet.getSheetByName('MASTER_PERUSAHAAN');
    const companyRows = rowsFromSheet_(companySheet, false);
    let company = companyRows.find(function (row) {
      return String(row.nama || '').toLowerCase() === companyName.toLowerCase();
    });
    const timestamp = nowIso_();
    if (!company) {
      const companyNumber = nextSequence_(companySheet, 'company_id', 'PRSH-');
      company = {
        company_id: 'PRSH-' + String(companyNumber).padStart(4, '0'), nama: companyName,
        nama_singkat: companyName, jenis_instansi: payload.instansi || '', regional: payload.regional || '',
        status_aktif: 'YA', created_at: timestamp, updated_at: timestamp,
      };
      appendRecord_(companySheet, company);
    }
    const activitySheet = spreadsheet.getSheetByName('KEGIATAN');
    const prefix = 'ACT-' + year + '-';
    const sequence = nextSequence_(activitySheet, 'activity_id', prefix);
    created = {
      activity_id: prefix + String(sequence).padStart(4, '0'),
      display_id: category + '-' + String(payload.instansi || 'UPJKP').toUpperCase() + '-' + String(sequence).padStart(4, '0'),
      company_id: company.company_id,
      perusahaan: companyName,
      subbagian: subsection,
      kategori: category,
      instansi: payload.instansi || '',
      jenis_kegiatan: payload.jenis_kegiatan || '',
      status_biaya: payload.status_biaya || 'Biaya',
      regional: payload.regional || '',
      kebun_lokasi: payload.kebun_lokasi || '',
      tahun: year,
      tanggal_surat_masuk: dateIso_(payload.tanggal_surat_masuk),
      nilai_kontrak: number_(payload.nilai_kontrak),
      hpp: number_(payload.hpp),
      pic: payload.pic || '',
      status: payload.status || 'AKTIF',
      catatan: payload.catatan || '',
      created_at: timestamp,
      updated_at: timestamp,
      archived_at: '',
    };
    appendRecord_(activitySheet, created);
    return created;
  });
  return success_({ activity: created, backupId: transaction.backupId });
}

function archiveActivity(activityId, reason) {
  if (!activityId) throw new Error('Activity ID wajib diisi.');
  let archived = null;
  withWriteTransaction_({
    actor: currentUser_(), action: 'archive', tableName: 'KEGIATAN', recordId: activityId,
    reason: reason || 'Diarsipkan melalui web app',
  }, function (spreadsheet) {
    const sheet = spreadsheet.getSheetByName('KEGIATAN');
    const row = findRow_(sheet, 'activity_id', activityId);
    if (!row) throw new Error('Kegiatan tidak ditemukan.');
    const headers = getHeaders_(sheet);
    sheet.getRange(row, headers.indexOf('archived_at') + 1).setValue(nowIso_());
    sheet.getRange(row, headers.indexOf('updated_at') + 1).setValue(nowIso_());
    archived = activityId;
  });
  return success_({ activityId: archived });
}

function markNotificationRead(notificationId) {
  withWriteTransaction_({
    actor: currentUser_(), action: 'read', tableName: 'NOTIFIKASI', recordId: notificationId,
    reason: 'Notifikasi ditandai sudah dibaca',
  }, function (spreadsheet) {
    const sheet = spreadsheet.getSheetByName('NOTIFIKASI');
    const row = findRow_(sheet, 'notification_id', notificationId);
    if (!row) throw new Error('Notifikasi tidak ditemukan.');
    const headers = getHeaders_(sheet);
    sheet.getRange(row, headers.indexOf('read_at') + 1).setValue(nowIso_());
  });
  return success_({ notificationId: notificationId, readAt: nowIso_() });
}

function rowsFromSheet_(sheet, includeArchived) {
  const headers = getHeaders_(sheet);
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues().map(function (values) {
    const row = {};
    headers.forEach(function (header, index) { row[header] = jsonSafe_(values[index]); });
    return row;
  }).filter(function (row) {
    return includeArchived || !row.archived_at;
  });
}
