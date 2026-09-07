function importRecommendationWorkbook(payload) {
  assertConfigured_();
  payload = payload || {};
  const incomingSheets = Array.isArray(payload.sheets) ? payload.sheets : [];
  if (!incomingSheets.length) throw new Error('Payload workbook Rekomendasi tidak memiliki sheet.');
  const allowed = recommendationMonitoringSheetNames_();
  incomingSheets.forEach(function (item) {
    if (allowed.indexOf(String(item.name || '')) < 0) throw new Error('Nama sheet tidak didukung: ' + item.name);
    if (!Array.isArray(item.values) || !item.values.length) throw new Error('Data sheet kosong: ' + item.name);
  });
  const lock = LockService.getScriptLock();
  lock.waitLock(APP.LOCK_TIMEOUT_MS);
  try {
    const properties = getProperties_();
    const existingId = properties.getProperty('UPJKP_RP_MONITORING_SOURCE_ID');
    let spreadsheet = null;
    let backupId = '';
    if (existingId) {
      try {
        spreadsheet = SpreadsheetApp.openById(existingId);
        const backupFolder = DriveApp.getFolderById(getConfiguration_().backupFolderId);
        const stamp = Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyy-MM-dd_HHmmss');
        backupId = DriveApp.getFileById(existingId).makeCopy('Monitoring Rekomendasi Pemupukan backup ' + stamp, backupFolder).getId();
      } catch (error) {
        spreadsheet = null;
      }
    }
    if (!spreadsheet) {
      const rootFolder = DriveApp.getFolderById(getConfiguration_().rootFolderId);
      const candidates = rootFolder.getFilesByName(payload.name || 'Monitoring Rekomendasi Pemupukan');
      if (candidates.hasNext()) {
        spreadsheet = SpreadsheetApp.openById(candidates.next().getId());
      } else {
        spreadsheet = SpreadsheetApp.create(payload.name || 'Monitoring Rekomendasi Pemupukan');
        DriveApp.getFileById(spreadsheet.getId()).moveTo(rootFolder);
      }
    }
    spreadsheet.rename(payload.name || 'Monitoring Rekomendasi Pemupukan');
    incomingSheets.forEach(function (item, index) {
      properties.setProperty('UPJKP_RP_IMPORT_PROGRESS', 'Memproses ' + item.name);
      let sheet = spreadsheet.getSheetByName(item.name);
      if (!sheet && index === 0 && spreadsheet.getSheets().length === 1 && spreadsheet.getSheets()[0].getLastRow() <= 1) {
        sheet = spreadsheet.getSheets()[0].setName(item.name);
      }
      if (!sheet) sheet = spreadsheet.insertSheet(item.name);
      const filter = sheet.getFilter();
      if (filter) filter.remove();
      sheet.getDataRange().getMergedRanges().forEach(function (range) { range.breakApart(); });
      sheet.clear();
      const values = item.values;
      const columnCount = values.reduce(function (max, row) { return Math.max(max, row.length); }, 1);
      const normalized = values.map(function (row) {
        const output = row.slice(0, columnCount);
        while (output.length < columnCount) output.push('');
        return output.map(function (value) { return value === null || value === undefined ? '' : value; });
      });
      sheet.getRange(1, 1, normalized.length, columnCount).setValues(normalized);
      (item.merges || []).forEach(function (a1) {
        try { sheet.getRange(a1).merge(); } catch (error) { console.warn(item.name + ' merge ' + a1 + ' dilewati: ' + error.message); }
      });
      sheet.setFrozenRows(Math.min(3, normalized.length));
      sheet.setFrozenColumns(0);
      sheet.setHiddenGridlines(true);
      sheet.setTabColor(item.name === 'Swasta' ? '#14b8a6' : '#1f78d1');
      if (normalized.length >= 1) sheet.getRange(1, 1, 1, columnCount).setBackground('#123a63').setFontColor('#ffffff').setFontWeight('bold');
      if (normalized.length >= 3) sheet.getRange(2, 1, 2, columnCount).setBackground('#e8f4ff').setFontColor('#123a63').setFontWeight('bold').setWrap(true).setVerticalAlignment('middle');
      sheet.getRange(1, 1, normalized.length, columnCount).setFontFamily('Arial').setFontSize(9);
      sheet.autoResizeColumns(1, Math.min(columnCount, 22));
    });
    const keep = {};
    incomingSheets.forEach(function (item) { keep[item.name] = true; });
    spreadsheet.getSheets().slice().forEach(function (sheet) {
      if (!keep[sheet.getName()] && spreadsheet.getSheets().length > 1) spreadsheet.deleteSheet(sheet);
    });
    properties.setProperties({
      UPJKP_RP_MONITORING_SOURCE_ID: spreadsheet.getId(),
      UPJKP_RP_SOURCE_ID: spreadsheet.getId(),
      UPJKP_RP_WORKBOOK_IMPORTED_AT: nowIso_(),
      UPJKP_RP_IMPORT_PROGRESS: 'Selesai',
      UPJKP_RP_IMPORT_LAST_ERROR: '',
    });
    properties.deleteProperty('UPJKP_RP_SYNC_SCHEMA_VERSION');
    return success_({
      sourceSpreadsheetId: spreadsheet.getId(),
      sourceUrl: spreadsheet.getUrl(),
      sourceName: spreadsheet.getName(),
      sheets: incomingSheets.map(function (item) { return { name: item.name, rows: item.values.length }; }),
      backupId: backupId,
      message: 'Workbook Rekomendasi Pemupukan berhasil disiapkan di Google Drive.',
    });
  } finally {
    lock.releaseLock();
  }
}
