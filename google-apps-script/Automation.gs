function installDailyTrigger_() {
  const existing = ScriptApp.getProjectTriggers().some(function (trigger) {
    return trigger.getHandlerFunction() === 'runDailyMonitor';
  });
  if (!existing) {
    ScriptApp.newTrigger('runDailyMonitor').timeBased().everyDays(1).atHour(7).create();
  }
}

function runDailyMonitor() {
  assertConfigured_();
  const sourceId = getProperties_().getProperty('UPJKP_BT_SOURCE_ID');
  if (sourceId) {
    try { syncBantuanTeknisNow({ automatic: true, sourceSpreadsheetId: sourceId }); }
    catch (error) { console.warn('Sinkronisasi Bantuan Teknis dilewati: ' + error.message); }
  }
  const adminSourceId = getProperties_().getProperty('UPJKP_ADM_SOURCE_ID');
  if (adminSourceId) {
    try { syncAdministrasiNow({ automatic: true, sourceSpreadsheetId: adminSourceId }); }
    catch (error) { console.warn('Sinkronisasi Administrasi dilewati: ' + error.message); }
  }
  const reports = getRows_('MONITORING_LAPORAN', false).map(reportProgress_);
  const billings = getRows_('PENAGIHAN', false).map(billingProgress_);
  const labs = getRows_('ANALISIS_LAB', false);
  const trainings = getRows_('KEGIATAN_PELATIHAN', false);
  const products = stockProducts_(getRows_('MASTER_PRODUK_JID', false), getRows_('STOK_JID', false));
  const existingNotifications = getRows_('NOTIFIKASI', true);
  const existingKeys = {};
  existingNotifications.forEach(function (row) { existingKeys[String(row.dedupe_key)] = true; });
  const existingBillingSources = {};
  billings.forEach(function (row) {
    if (String(row.source_type).toUpperCase() === 'LAPORAN') existingBillingSources[String(row.source_id)] = true;
  });

  const candidates = [];
  const billingDrafts = [];
  function addNotification(key, category, priority, title, body, table, recordId, route) {
    if (existingKeys[key]) return;
    existingKeys[key] = true;
    candidates.push({
      notification_id: 'NTF-' + Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase(),
      dedupe_key: key, kategori: category, prioritas: priority, judul: title, isi: body,
      source_table: table, source_id: recordId, target_route: route, created_at: nowIso_(),
      read_at: '', resolved_at: '',
    });
  }

  reports.forEach(function (row) {
    const reportId = String(row.report_id || '');
    if (row.status_hitung === 'NET / RP27') {
      addNotification(
        'report:' + reportId + ':net', 'BILLING', 'TINGGI', 'Laporan NET siap ditagih',
        (row.perusahaan || '') + ' · ' + (row.kebun || '') + ' · ' + (row.rp27 || ''),
        'MONITORING_LAPORAN', reportId, 'reports-rp'
      );
      if (!existingBillingSources[reportId]) {
        existingBillingSources[reportId] = true;
        billingDrafts.push({
          company_id: row.company_id || '', perusahaan: row.perusahaan || '', kebun: row.kebun || '',
          source_type: 'LAPORAN', source_id: reportId, nilai: 0,
          tanggal_siap_tagih: row.tanggal_net || todayIso_(), status: 'SIAP TAGIH',
          total_pembayaran: 0, pic: row.pic || '',
          catatan: 'Dibuat otomatis dari laporan NET; nilai perlu dilengkapi.',
        });
      }
      return;
    }
    const elapsed = Number(row.hari_berjalan || 0);
    if ([21, 26, 29, 30].indexOf(elapsed) >= 0 || elapsed > 30) {
      const milestone = elapsed > 30 ? 'overdue' : String(elapsed);
      addNotification(
        'report:' + reportId + ':deadline:' + milestone,
        elapsed >= 30 ? 'URGENT' : 'REMINDER', elapsed >= 30 ? 'KRITIS' : 'TINGGI',
        elapsed >= 30 ? 'Laporan melewati SLA' : 'Laporan memasuki hari ke-' + elapsed,
        (row.perusahaan || '') + ' · status ' + row.status_hitung + ' · deadline ' + row.deadline,
        'MONITORING_LAPORAN', reportId, row.workflow === 'RP' ? 'reports-rp' : 'reports-bt'
      );
    }
  });

  billings.forEach(function (row) {
    if (row.status_hitung !== 'JATUH TEMPO') return;
    addNotification(
      'billing:' + row.billing_id + ':overdue', 'BILLING', 'KRITIS', 'Invoice jatuh tempo',
      (row.perusahaan || '') + ' · piutang Rp ' + Math.round(row.piutang),
      'PENAGIHAN', row.billing_id, 'billing'
    );
  });

  const today = parseDate_(todayIso_());
  labs.forEach(function (row) {
    const sample = parseDate_(row.tanggal_sampel_masuk);
    if (!sample || String(row.status).toUpperCase() === 'SELESAI') return;
    const age = daysBetween_(sample, today);
    if (age > 21) {
      addNotification(
        'lab:' + row.lab_id + ':age:21', 'LAB', 'TINGGI', 'Sampel terlalu lama diproses',
        (row.perusahaan || '') + ' · ' + age + ' hari · ' + number_(row.jumlah_kcd) + ' KCD',
        'ANALISIS_LAB', row.lab_id, 'labs'
      );
    }
  });

  products.forEach(function (row) {
    if (!row.kritis) return;
    addNotification(
      'stock:' + row.product_id + ':low:' + row.stok, 'STOCK', row.stok > 0 ? 'TINGGI' : 'KRITIS',
      'Stok produk rendah', row.nama + ' · stok ' + row.stok + ' · minimum ' + number_(row.minimum_stok),
      'MASTER_PRODUK_JID', row.product_id, 'jid'
    );
  });

  trainings.forEach(function (row) {
    const start = parseDate_(row.tanggal_mulai);
    if (!start) return;
    const remaining = daysBetween_(today, start);
    if (remaining >= 0 && remaining <= 3) {
      addNotification(
        'training:' + row.training_id + ':h-' + remaining, 'TRAINING', 'TINGGI',
        'Pelatihan H-' + remaining, (row.nama_kegiatan || '') + ' · ' + (row.perusahaan || ''),
        'KEGIATAN_PELATIHAN', row.training_id, 'training'
      );
    }
  });

  if (!candidates.length && !billingDrafts.length) {
    return success_({ notificationsCreated: 0, billingDraftsCreated: 0, message: 'Tidak ada notifikasi baru.' });
  }

  let createdNotifications = 0;
  let createdBillings = 0;
  withWriteTransaction_({
    actor: currentUser_(), action: 'daily_monitor', tableName: 'MULTI', recordId: todayIso_(),
    reason: 'Pemantauan harian idempotent',
  }, function (spreadsheet) {
    const notificationSheet = spreadsheet.getSheetByName('NOTIFIKASI');
    const liveKeys = {};
    rowsFromSheet_(notificationSheet, true).forEach(function (row) { liveKeys[String(row.dedupe_key)] = true; });
    candidates.forEach(function (row) {
      if (liveKeys[row.dedupe_key]) return;
      appendRecord_(notificationSheet, row);
      liveKeys[row.dedupe_key] = true;
      createdNotifications += 1;
    });

    const billingSheet = spreadsheet.getSheetByName('PENAGIHAN');
    const liveSources = {};
    rowsFromSheet_(billingSheet, true).forEach(function (row) {
      if (String(row.source_type).toUpperCase() === 'LAPORAN') liveSources[String(row.source_id)] = true;
    });
    let sequence = nextSequence_(billingSheet, 'billing_id', 'BIL-' + Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyy') + '-');
    billingDrafts.forEach(function (row) {
      if (liveSources[String(row.source_id)]) return;
      row.billing_id = 'BIL-' + Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyy') + '-' + String(sequence).padStart(4, '0');
      row.created_at = nowIso_();
      row.updated_at = nowIso_();
      appendRecord_(billingSheet, row);
      liveSources[String(row.source_id)] = true;
      sequence += 1;
      createdBillings += 1;
    });
  });
  return success_({ notificationsCreated: createdNotifications, billingDraftsCreated: createdBillings });
}

function manualBackup() {
  assertConfigured_();
  const lock = LockService.getScriptLock();
  lock.waitLock(APP.LOCK_TIMEOUT_MS);
  try {
    const backup = createBackup_('manual');
    appendAudit_(getDatabase_(), {
      actor: currentUser_(), action: 'backup', tableName: 'SYSTEM', recordId: backup.getId(),
      reason: 'Backup manual dari dashboard',
    });
    SpreadsheetApp.flush();
    return success_({ backupId: backup.getId(), backupUrl: backup.getUrl(), name: backup.getName() });
  } finally {
    lock.releaseLock();
  }
}
