const ACTIVITY_ACTION_TEXT_FIELDS_ = [
  'instansi', 'jenis_kegiatan', 'regional', 'kebun_lokasi', 'pic', 'status_biaya', 'no_surat_masuk', 'no_spk', 'catatan',
];
const ACTIVITY_ACTION_DATE_FIELDS_ = [
  'tanggal_surat_masuk', 'tanggal_spk', 'tanggal_mulai', 'tanggal_selesai',
];
const ACTIVITY_ACTION_NUMBER_FIELDS_ = ['nilai_kontrak', 'hpp'];

function actionText_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

function actionHas_(payload, field) {
  return Object.prototype.hasOwnProperty.call(payload || {}, field);
}

function actionLetterDefaults_() {
  return { incoming: null, outgoing: null, visit: null, assignment: null, report: null };
}

function activityReportMap_() {
  const map = {};
  getRows_('MONITORING_LAPORAN', false).forEach(function (report) {
    const activityId = actionText_(report.activity_id);
    if (!activityId) return;
    if (!map[activityId] || String(report.updated_at || report.created_at || '') > String(map[activityId].updated_at || map[activityId].created_at || '')) map[activityId] = report;
  });
  return map;
}

function activityCompleteness_(activity, lettersByActivity, report) {
  const letters = (lettersByActivity && lettersByActivity[String(activity.activity_id)]) || actionLetterDefaults_();
  const incoming = letters.incoming || {}, outgoing = letters.outgoing || {}, visit = letters.visit || {}, assignment = letters.assignment || {};
  const checks = [
    ['jenis_kegiatan', activity.jenis_kegiatan, 'Jenis kegiatan'],
    ['regional', activity.regional, 'Regional'],
    ['kebun_lokasi', activity.kebun_lokasi, 'Kebun/lokasi'],
    ['pic', activity.pic, 'PIC'],
    ['no_surat_masuk', incoming.nomor_surat || activity.no_surat_masuk, 'No. surat masuk'],
    ['tanggal_surat_masuk', incoming.tanggal || activity.tanggal_surat_masuk, 'Tanggal surat masuk'],
    ['no_surat_keluar', outgoing.nomor_surat, 'No. surat balasan/keluar'],
    ['tanggal_surat_keluar', outgoing.tanggal, 'Tanggal surat balasan/keluar'],
    ['no_surat_kunjungan', visit.nomor_surat, 'No. surat kunjungan'],
    ['tanggal_surat_kunjungan', visit.tanggal, 'Tanggal surat kunjungan'],
    ['no_surat_tugas', assignment.nomor_surat || activity.no_spk, 'No. surat tugas/SPK'],
    ['tanggal_surat_tugas', assignment.tanggal || activity.tanggal_spk, 'Tanggal surat tugas/SPK'],
    ['report_id', report && report.report_id, 'Monitoring laporan'],
  ];
  const missing = checks.filter(function (item) { return !actionText_(item[1]); }).map(function (item) { return item[2]; });
  return {
    missing_fields: missing,
    missing_count: missing.length,
    completeness_percent: Math.round((checks.length - missing.length) / checks.length * 100),
    completeness_label: missing.length ? 'Belum lengkap' : 'Lengkap',
  };
}

function getActivityActionData(activityId) {
  assertConfigured_();
  const id = actionText_(activityId);
  if (!id) throw new Error('ID kegiatan wajib diisi.');
  const activity = getRows_('KEGIATAN', false).find(function (row) { return String(row.activity_id) === id; });
  if (!activity) throw new Error('Kegiatan tidak ditemukan atau sudah diarsipkan.');
  const lettersByActivity = correspondenceByActivity_();
  const report = activityReportMap_()[id] || null;
  return success_({
    activity: activity,
    letters: lettersByActivity[id] || actionLetterDefaults_(),
    report: report ? reportProgress_(report) : null,
    completeness: activityCompleteness_(activity, lettersByActivity, report),
  });
}

function updateActivityCompletion(payload) {
  payload = payload || {};
  const activityId = actionText_(payload.activity_id);
  if (!activityId) throw new Error('ID kegiatan wajib diisi.');
  let summary = null;
  const transaction = withWriteTransaction_({
    actor: currentUser_(), action: 'complete_activity', tableName: 'KEGIATAN', recordId: activityId,
    reason: 'Melengkapi data kegiatan dan surat melalui menu tindakan',
  }, function (spreadsheet) {
    const activitySheet = spreadsheet.getSheetByName('KEGIATAN');
    const activityRow = findRow_(activitySheet, 'activity_id', activityId);
    if (!activityRow) throw new Error('Kegiatan tidak ditemukan atau sudah diarsipkan.');
    const activityHeaders = getHeaders_(activitySheet);
    const activityPatch = {};
    ACTIVITY_ACTION_TEXT_FIELDS_.forEach(function (field) { if (actionHas_(payload, field)) activityPatch[field] = actionText_(payload[field]); });
    ACTIVITY_ACTION_DATE_FIELDS_.forEach(function (field) { if (actionHas_(payload, field)) activityPatch[field] = dateIso_(payload[field]); });
    ACTIVITY_ACTION_NUMBER_FIELDS_.forEach(function (field) { if (actionHas_(payload, field)) activityPatch[field] = number_(payload[field]); });
    if (actionHas_(payload, 'tahun')) activityPatch.tahun = Number(payload.tahun || 0);
    activityPatch.updated_at = nowIso_();
    Object.keys(activityPatch).forEach(function (field) {
      const column = activityHeaders.indexOf(field);
      if (column >= 0) activitySheet.getRange(activityRow, column + 1).setValue(activityPatch[field]);
    });

    const correspondenceSheet = spreadsheet.getSheetByName('KORESPONDENSI');
    const correspondenceTable = recommendationMemoryTable_(correspondenceSheet, 'correspondence_id');
    const correspondenceRows = correspondenceTable.rows.map(function (values) {
      const row = {};
      correspondenceTable.headers.forEach(function (header, index) { row[header] = values[index]; });
      return row;
    });
    const currentBySlot = {};
    correspondenceRows.filter(function (row) { return String(row.activity_id) === activityId; }).forEach(function (row) {
      const slot = correspondenceSlot_(row);
      if (!slot || !currentBySlot[slot] || String(row.updated_at || row.created_at || '') > String(currentBySlot[slot].updated_at || currentBySlot[slot].created_at || '')) currentBySlot[slot] = row;
    });
    let correspondenceRowsUpdated = 0;
    function saveLetter(slot, kind, numberField, dateField, subjectField) {
      if (!actionHas_(payload, numberField) && !actionHas_(payload, dateField) && !actionHas_(payload, subjectField)) return;
      const current = currentBySlot[slot] || {};
      const correspondenceId = current.correspondence_id || 'KOR-ACT-' + idSafeKey_(activityId) + '-' + slot.toUpperCase();
      correspondenceTable.upsert(correspondenceId, {
        correspondence_id: correspondenceId,
        activity_id: activityId,
        jenis_surat: kind,
        nomor_surat: actionText_(payload[numberField]),
        tanggal: dateIso_(payload[dateField]),
        perihal: actionText_(payload[subjectField]),
        created_at: current.created_at || nowIso_(),
        updated_at: nowIso_(),
      });
      correspondenceRowsUpdated += 1;
    }
    saveLetter('incoming', 'SURAT MASUK', 'no_surat_masuk', 'tanggal_surat_masuk', 'perihal_surat_masuk');
    saveLetter('outgoing', 'SURAT BALASAN/KELUAR', 'no_surat_keluar', 'tanggal_surat_keluar', 'perihal_surat_keluar');
    saveLetter('visit', 'SURAT KUNJUNGAN', 'no_surat_kunjungan', 'tanggal_surat_kunjungan', 'perihal_surat_kunjungan');
    saveLetter('assignment', 'SURAT TUGAS', 'no_surat_tugas', 'tanggal_surat_tugas', 'perihal_surat_tugas');
    saveLetter('report', 'PENGIRIMAN LAPORAN', 'no_surat_pengiriman_laporan', 'tanggal_pengiriman_laporan', 'perihal_pengiriman_laporan');
    correspondenceTable.flush();
    summary = { activityId: activityId, correspondenceRowsUpdated: correspondenceRowsUpdated, updatedFields: Object.keys(activityPatch).length };
    return summary;
  });
  return success_({ activityId: summary.activityId, correspondenceRowsUpdated: summary.correspondenceRowsUpdated, updatedFields: summary.updatedFields, backupId: transaction.backupId });
}

const TRAINING_ACTION_TEXT_FIELDS_ = ['perusahaan', 'nama_kegiatan', 'lokasi', 'pic', 'status', 'catatan'];
const TRAINING_ACTION_DATE_FIELDS_ = ['tanggal_mulai', 'tanggal_selesai'];

function trainingCompleteness_(training) {
  const checks = [
    ['perusahaan', training.perusahaan, 'Perusahaan'],
    ['nama_kegiatan', training.nama_kegiatan, 'Nama kegiatan'],
    ['lokasi', training.lokasi, 'Lokasi'],
    ['tanggal_mulai', training.tanggal_mulai, 'Tanggal mulai'],
    ['tanggal_selesai', training.tanggal_selesai, 'Tanggal selesai'],
    ['jumlah_peserta', training.jumlah_peserta, 'Jumlah peserta'],
    ['pic', training.pic, 'PIC'],
    ['status', training.status, 'Status'],
  ];
  const missing = checks.filter(function (item) { return !actionText_(item[1]); }).map(function (item) { return item[2]; });
  return {
    missing_fields: missing,
    missing_count: missing.length,
    completeness_percent: Math.round((checks.length - missing.length) / checks.length * 100),
    completeness_label: missing.length ? 'Belum lengkap' : 'Lengkap',
  };
}

function getTrainingActionData(trainingId) {
  assertConfigured_();
  const id = actionText_(trainingId);
  if (!id) throw new Error('ID pelatihan wajib diisi.');
  const training = getRows_('KEGIATAN_PELATIHAN', false).find(function (row) { return String(row.training_id) === id; });
  if (!training) throw new Error('Kegiatan pelatihan tidak ditemukan atau sudah diarsipkan.');
  return success_({ training: training, completeness: trainingCompleteness_(training) });
}

function updateTrainingCompletion(payload) {
  payload = payload || {};
  const trainingId = actionText_(payload.training_id);
  if (!trainingId) throw new Error('ID pelatihan wajib diisi.');
  let summary = null;
  const transaction = withWriteTransaction_({
    actor: currentUser_(), action: 'complete_training', tableName: 'KEGIATAN_PELATIHAN', recordId: trainingId,
    reason: 'Melengkapi data kegiatan pelatihan melalui menu tindakan',
  }, function (spreadsheet) {
    const sheet = spreadsheet.getSheetByName('KEGIATAN_PELATIHAN');
    const rowNumber = findRow_(sheet, 'training_id', trainingId);
    if (!rowNumber) throw new Error('Kegiatan pelatihan tidak ditemukan atau sudah diarsipkan.');
    const headers = getHeaders_(sheet), patch = {};
    TRAINING_ACTION_TEXT_FIELDS_.forEach(function (field) { if (actionHas_(payload, field)) patch[field] = actionText_(payload[field]); });
    TRAINING_ACTION_DATE_FIELDS_.forEach(function (field) { if (actionHas_(payload, field)) patch[field] = dateIso_(payload[field]); });
    if (actionHas_(payload, 'jumlah_peserta')) patch.jumlah_peserta = Math.max(0, Number(payload.jumlah_peserta || 0));
    patch.updated_at = nowIso_();
    Object.keys(patch).forEach(function (field) {
      const column = headers.indexOf(field);
      if (column >= 0) sheet.getRange(rowNumber, column + 1).setValue(patch[field]);
    });
    summary = { trainingId: trainingId, updatedFields: Object.keys(patch).length };
    return summary;
  });
  return success_({ trainingId: summary.trainingId, updatedFields: summary.updatedFields, backupId: transaction.backupId });
}

function getReportActionData(reportId) {
  assertConfigured_();
  const id = actionText_(reportId);
  if (!id) throw new Error('ID laporan wajib diisi.');
  const report = getRows_('MONITORING_LAPORAN', false).find(function (row) { return String(row.report_id) === id; });
  if (!report) throw new Error('Laporan tidak ditemukan atau sudah diarsipkan.');
  const histories = getRows_('HISTORI_LAPORAN', false).filter(function (row) { return String(row.report_id) === id; });
  return success_({ report: reportProgress_(report), histories: histories });
}

function updateReportAction(payload) {
  payload = payload || {};
  const reportId = actionText_(payload.report_id);
  if (!reportId) throw new Error('ID laporan wajib diisi.');
  let summary = null;
  const transaction = withWriteTransaction_({
    actor: currentUser_(), action: 'update_report_action', tableName: 'MONITORING_LAPORAN', recordId: reportId,
    reason: 'Melengkapi laporan dan penugasan korektor melalui menu tindakan',
  }, function (spreadsheet) {
    const reportSheet = spreadsheet.getSheetByName('MONITORING_LAPORAN');
    const reportRow = findRow_(reportSheet, 'report_id', reportId);
    if (!reportRow) throw new Error('Laporan tidak ditemukan atau sudah diarsipkan.');
    const headers = getHeaders_(reportSheet), patch = {};
    ['checkpoint_terakhir', 'korektor_terakhir', 'link_draft', 'nama_file_draft', 'file_net', 'rp27', 'link_net', 'pic', 'catatan'].forEach(function (field) {
      if (actionHas_(payload, field)) patch[field] = actionText_(payload[field]);
    });
    ['tanggal_checkpoint', 'tanggal_revisi', 'tanggal_cetak', 'tanggal_kirim', 'tanggal_net'].forEach(function (field) {
      if (actionHas_(payload, field)) patch[field] = dateIso_(payload[field]);
    });
    const checkpoint = actionText_(actionHas_(payload, 'checkpoint_terakhir') ? payload.checkpoint_terakhir : '').toUpperCase();
    const netDate = actionHas_(payload, 'tanggal_net') ? dateIso_(payload.tanggal_net) : '';
    if (checkpoint || netDate) patch.status = (netDate || checkpoint.indexOf('NET') >= 0 || checkpoint === 'PENGIRIMAN') ? 'NET' : 'PROSES';
    patch.updated_at = nowIso_();
    Object.keys(patch).forEach(function (field) {
      const column = headers.indexOf(field);
      if (column >= 0) reportSheet.getRange(reportRow, column + 1).setValue(patch[field]);
    });

    let historyUpdated = false;
    if (checkpoint) {
      const historySheet = spreadsheet.getSheetByName('HISTORI_LAPORAN');
      const historyTable = recommendationMemoryTable_(historySheet, 'history_id');
      const orderMap = { DRAFT: 1, 'KOREKTOR 1': 2, 'KOREKTOR 2': 3, 'CETAK 1': 4, 'KOREKTOR FINAL': 5, 'CETAK FINAL': 6, PENGIRIMAN: 7, NET: 7 };
      const historyId = reportId + '-' + idSafeKey_(checkpoint);
      const existing = historyTable.get(historyId) || historyTable.rows.map(function (values) {
        const row = {};
        historyTable.headers.forEach(function (header, index) { row[header] = values[index]; });
        return row;
      }).filter(function (row) {
        return String(row.report_id) === reportId && String(row.checkpoint || '').toUpperCase() === checkpoint;
      }).sort(function (left, right) {
        return String(right.updated_at || right.created_at || '').localeCompare(String(left.updated_at || left.created_at || ''));
      })[0] || null;
      const current = existing || {};
      const targetHistoryId = current.history_id || historyId;
      historyTable.upsert(targetHistoryId, {
        history_id: targetHistoryId,
        report_id: reportId,
        checkpoint: checkpoint,
        urutan: orderMap[checkpoint] || Number(current.urutan || 0) || 1,
        korektor: actionText_(payload.korektor_terakhir),
        tanggal_masuk: dateIso_(payload.korektor_tanggal_masuk) || dateIso_(payload.tanggal_checkpoint),
        tanggal_selesai: dateIso_(payload.korektor_tanggal_selesai) || dateIso_(payload.tanggal_checkpoint),
        catatan: 'ACTION_MENU_REPORT',
        created_at: current.created_at || nowIso_(),
        created_by: current.created_by || currentUser_(),
      });
      historyTable.flush();
      historyUpdated = true;
    }
    summary = { reportId: reportId, historyUpdated: historyUpdated, updatedFields: Object.keys(patch).length };
    return summary;
  });
  return success_({ reportId: summary.reportId, historyUpdated: summary.historyUpdated, updatedFields: summary.updatedFields, backupId: transaction.backupId });
}
