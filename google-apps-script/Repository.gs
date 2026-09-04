function setupApplication(options) {
  options = options || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(APP.LOCK_TIMEOUT_MS);
  try {
    if (isConfigured_()) {
      const existing = getConfiguration_();
      const spreadsheet = SpreadsheetApp.openById(existing.databaseId);
      ensureSchema_(spreadsheet);
      return success_({
        configured: true,
        databaseId: existing.databaseId,
        databaseName: spreadsheet.getName(),
        databaseUrl: spreadsheet.getUrl(),
        rootFolderId: existing.rootFolderId,
        message: 'Konfigurasi sudah tersedia dan skema telah divalidasi.',
      });
    }

    const rootFolder = options.rootFolderId
      ? DriveApp.getFolderById(String(options.rootFolderId))
      : DriveApp.createFolder('UPJKP Monitoring Center');
    const documentFolder = rootFolder.createFolder('Dokumen');
    const backupFolder = rootFolder.createFolder('Backup');
    const spreadsheet = options.spreadsheetId
      ? SpreadsheetApp.openById(String(options.spreadsheetId))
      : SpreadsheetApp.create('UPJKP Master Database');

    if (!options.spreadsheetId) {
      DriveApp.getFileById(spreadsheet.getId()).moveTo(rootFolder);
    }
    ensureSchema_(spreadsheet);
    setMeta_(spreadsheet, 'schema_version', APP.VERSION);
    setMeta_(spreadsheet, 'created_at', nowIso_());
    setMeta_(spreadsheet, 'application', APP.NAME);

    getProperties_().setProperties({
      [APP.PROPERTY_DATABASE_ID]: spreadsheet.getId(),
      [APP.PROPERTY_ROOT_FOLDER_ID]: rootFolder.getId(),
      [APP.PROPERTY_DOCUMENT_FOLDER_ID]: documentFolder.getId(),
      [APP.PROPERTY_BACKUP_FOLDER_ID]: backupFolder.getId(),
      [APP.PROPERTY_SCHEMA_VERSION]: APP.VERSION,
    });

    appendAudit_(spreadsheet, {
      action: 'setup', tableName: 'SYSTEM_META', recordId: spreadsheet.getId(),
      reason: 'Inisialisasi aplikasi Google Apps Script', actor: currentUser_(),
    });
    SpreadsheetApp.flush();
    installDailyTrigger_();

    return success_({
      configured: true,
      databaseId: spreadsheet.getId(),
      databaseName: spreadsheet.getName(),
      databaseUrl: spreadsheet.getUrl(),
      rootFolderId: rootFolder.getId(),
      rootFolderUrl: rootFolder.getUrl(),
      message: 'Database, folder dokumen, backup, dan trigger harian berhasil dibuat.',
    });
  } finally {
    lock.releaseLock();
  }
}

function resetConfigurationForDevelopment() {
  throw new Error('Reset konfigurasi dinonaktifkan untuk melindungi database. Ubah Script Properties secara manual setelah membuat backup.');
}

function getDatabase_() {
  assertConfigured_();
  const id = getConfiguration_().databaseId;
  try {
    return SpreadsheetApp.openById(id);
  } catch (error) {
    throw new Error('Database tidak dapat dibuka. Periksa izin dan Script Property UPJKP_SPREADSHEET_ID. ' + error.message);
  }
}

function ensureSchema_(spreadsheet) {
  Object.keys(DB_SCHEMA).forEach(function (sheetName) {
    const headers = DB_SCHEMA[sheetName];
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) sheet = spreadsheet.insertSheet(sheetName);
    const lastColumn = Math.max(sheet.getLastColumn(), 1);
    const existing = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].filter(String);
    if (!existing.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      const missing = headers.filter(function (header) { return existing.indexOf(header) < 0; });
      if (missing.length) {
        sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
      }
    }
    formatSheet_(sheet);
  });

  const defaultSheet = spreadsheet.getSheetByName('Sheet1') || spreadsheet.getSheetByName('Sheet 1');
  if (defaultSheet && spreadsheet.getSheets().length > 1 && defaultSheet.getLastRow() <= 1) {
    spreadsheet.deleteSheet(defaultSheet);
  }
}

function formatSheet_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const header = sheet.getRange(1, 1, 1, lastColumn);
  header.setBackground('#12332e').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.setHiddenGridlines(true);
  if (!sheet.getFilter() && sheet.getLastRow() >= 1) {
    header.createFilter();
  }
}

function getHeaders_(sheet) {
  if (sheet.getLastColumn() < 1) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(String);
}

function getRows_(sheetName, includeArchived) {
  const spreadsheet = getDatabase_();
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet tidak ditemukan: ' + sheetName);
  const headers = getHeaders_(sheet);
  if (sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  return values.map(function (row) {
    const record = {};
    headers.forEach(function (header, index) { if (header) record[header] = jsonSafe_(row[index]); });
    return record;
  }).filter(function (record) {
    const hasValue = Object.keys(record).some(function (key) { return record[key] !== ''; });
    return hasValue && (includeArchived || !record.archived_at);
  });
}

function appendRecord_(sheet, data) {
  const headers = getHeaders_(sheet);
  const row = headers.map(function (header) { return data[header] === undefined ? '' : data[header]; });
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues([row]);
}

function findRow_(sheet, idField, recordId) {
  const headers = getHeaders_(sheet);
  const columnIndex = headers.indexOf(idField);
  if (columnIndex < 0 || sheet.getLastRow() < 2) return null;
  const values = sheet.getRange(2, columnIndex + 1, sheet.getLastRow() - 1, 1).getDisplayValues();
  for (let index = 0; index < values.length; index += 1) {
    if (String(values[index][0]) === String(recordId)) return index + 2;
  }
  return null;
}

function nextSequence_(sheet, idField, prefix) {
  const headers = getHeaders_(sheet);
  const columnIndex = headers.indexOf(idField);
  if (columnIndex < 0 || sheet.getLastRow() < 2) return 1;
  const values = sheet.getRange(2, columnIndex + 1, sheet.getLastRow() - 1, 1).getDisplayValues();
  let highest = 0;
  values.forEach(function (row) {
    const value = String(row[0] || '');
    if (value.indexOf(prefix) !== 0) return;
    const match = value.match(/(\d+)$/);
    if (match) highest = Math.max(highest, Number(match[1]));
  });
  return highest + 1;
}

function setMeta_(spreadsheet, key, value) {
  const sheet = spreadsheet.getSheetByName('SYSTEM_META');
  const row = findRow_(sheet, 'key', key);
  if (row) {
    const headers = getHeaders_(sheet);
    sheet.getRange(row, headers.indexOf('value') + 1).setValue(value);
    sheet.getRange(row, headers.indexOf('updated_at') + 1).setValue(nowIso_());
  } else {
    appendRecord_(sheet, { key: key, value: value, updated_at: nowIso_() });
  }
}

function appendAudit_(spreadsheet, context) {
  const sheet = spreadsheet.getSheetByName('AUDIT_LOG');
  appendRecord_(sheet, {
    audit_id: 'AUD-' + Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase(),
    timestamp: nowIso_(),
    actor: context.actor || currentUser_(),
    action: context.action || 'update',
    table_name: context.tableName || 'SYSTEM',
    record_id: context.recordId || '',
    field_name: context.fieldName || '',
    old_value: context.oldValue === undefined ? '' : JSON.stringify(context.oldValue),
    new_value: context.newValue === undefined ? '' : JSON.stringify(context.newValue),
    reason: context.reason || '',
    correlation_id: context.correlationId || Utilities.getUuid(),
  });
}

function withWriteTransaction_(context, callback, options) {
  options = options || {};
  assertConfigured_();
  const lock = LockService.getScriptLock();
  lock.waitLock(APP.LOCK_TIMEOUT_MS);
  try {
    const spreadsheet = getDatabase_();
    validateSchema_(spreadsheet);
    const backup = options.skipBackup ? null : createBackup_('before-' + (context.action || 'write'));
    const result = callback(spreadsheet);
    appendAudit_(spreadsheet, context);
    setMeta_(spreadsheet, 'updated_at', nowIso_());
    SpreadsheetApp.flush();
    validateSchema_(spreadsheet);
    return { result: result, backupId: backup ? backup.getId() : '' };
  } finally {
    lock.releaseLock();
  }
}

function validateSchema_(spreadsheet) {
  const problems = [];
  Object.keys(DB_SCHEMA).forEach(function (sheetName) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      problems.push('Sheet ' + sheetName + ' tidak ditemukan');
      return;
    }
    const headers = getHeaders_(sheet);
    DB_SCHEMA[sheetName].forEach(function (header) {
      if (headers.indexOf(header) < 0) problems.push(sheetName + ': kolom ' + header + ' tidak ditemukan');
    });
  });
  if (problems.length) throw new Error('Validasi skema gagal: ' + problems.slice(0, 5).join('; '));
  return true;
}

function createBackup_(reason) {
  const config = getConfiguration_();
  const folder = DriveApp.getFolderById(config.backupFolderId);
  const stamp = Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyy-MM-dd_HHmmss');
  const exportUrl = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(config.databaseId) + '/export?format=xlsx';
  const response = UrlFetchApp.fetch(exportUrl, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('Backup Excel gagal dibuat (HTTP ' + response.getResponseCode() + '). Write dibatalkan.');
  }
  const backup = folder.createFile(response.getBlob().setName('UPJKP_DB_' + stamp + '_' + reason + '.xlsx'));
  pruneBackups_(folder);
  return backup;
}

function pruneBackups_(folder) {
  const files = folder.getFiles();
  const backups = [];
  while (files.hasNext()) {
    const file = files.next();
    if (file.getName().indexOf('UPJKP_DB_') === 0) backups.push(file);
  }
  backups.sort(function (left, right) { return right.getDateCreated().getTime() - left.getDateCreated().getTime(); });
  backups.slice(APP.BACKUP_RETENTION).forEach(function (file) { file.setTrashed(true); });
}

function getTablePage(tableName, options) {
  options = options || {};
  if (!DB_SCHEMA[tableName]) throw new Error('Tabel tidak diizinkan: ' + tableName);
  const query = String(options.query || '').trim().toLowerCase();
  const filters = options.filters || {};
  let rows = getRows_(tableName, false);
  rows = rows.filter(function (row) {
    if (query) {
      const haystack = Object.keys(row).map(function (key) { return String(row[key]); }).join(' ').toLowerCase();
      if (haystack.indexOf(query) < 0) return false;
    }
    return Object.keys(filters).every(function (key) {
      return !filters[key] || String(row[key] || '').toLowerCase() === String(filters[key]).toLowerCase();
    });
  });
  const pageSize = Math.max(1, Math.min(200, Number(options.pageSize || 100)));
  const page = Math.max(1, Number(options.page || 1));
  const start = (page - 1) * pageSize;
  return success_({
    items: rows.slice(start, start + pageSize), total: rows.length, page: page,
    pageSize: pageSize, pages: Math.max(1, Math.ceil(rows.length / pageSize)),
  });
}

function getDatabaseLinks() {
  assertConfigured_();
  const config = getConfiguration_();
  return success_({
    databaseUrl: SpreadsheetApp.openById(config.databaseId).getUrl(),
    rootFolderUrl: DriveApp.getFolderById(config.rootFolderId).getUrl(),
    documentFolderUrl: DriveApp.getFolderById(config.documentFolderId).getUrl(),
    backupFolderUrl: DriveApp.getFolderById(config.backupFolderId).getUrl(),
  });
}
