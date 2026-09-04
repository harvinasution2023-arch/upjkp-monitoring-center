function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function nowIso_() {
  return Utilities.formatDate(new Date(), APP.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function todayIso_() {
  return Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyy-MM-dd');
}

function currentUser_() {
  return Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || 'web-user';
}

function getProperties_() {
  return PropertiesService.getScriptProperties();
}

function getConfiguration_() {
  const properties = getProperties_();
  return {
    databaseId: properties.getProperty(APP.PROPERTY_DATABASE_ID) || '',
    rootFolderId: properties.getProperty(APP.PROPERTY_ROOT_FOLDER_ID) || '',
    documentFolderId: properties.getProperty(APP.PROPERTY_DOCUMENT_FOLDER_ID) || '',
    backupFolderId: properties.getProperty(APP.PROPERTY_BACKUP_FOLDER_ID) || '',
    schemaVersion: properties.getProperty(APP.PROPERTY_SCHEMA_VERSION) || '',
  };
}

function isConfigured_() {
  const config = getConfiguration_();
  return Boolean(config.databaseId && config.documentFolderId && config.backupFolderId);
}

function assertConfigured_() {
  if (!isConfigured_()) {
    throw new Error('Aplikasi belum disiapkan. Jalankan setup dari halaman awal.');
  }
}

function parseDate_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) return value;
  const text = String(value).trim();
  const parsed = new Date(text.length === 10 ? text + 'T00:00:00+07:00' : text);
  return isNaN(parsed) ? null : parsed;
}

function dateIso_(value) {
  const parsed = parseDate_(value);
  return parsed ? Utilities.formatDate(parsed, APP.TIMEZONE, 'yyyy-MM-dd') : '';
}

function number_(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  let text = String(value).replace(/Rp/gi, '').replace(/\s/g, '');
  if (text.indexOf(',') >= 0 && text.indexOf('.') >= 0) text = text.replace(/\./g, '').replace(',', '.');
  else if ((text.match(/\./g) || []).length > 1) text = text.replace(/\./g, '');
  else text = text.replace(',', '.');
  const parsed = Number(text);
  return isFinite(parsed) ? parsed : 0;
}

function jsonSafe_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, APP.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
  }
  if (value === null || value === undefined) return '';
  return value;
}

function success_(data) {
  return { ok: true, data: data, meta: { version: APP.VERSION, generatedAt: nowIso_() } };
}
