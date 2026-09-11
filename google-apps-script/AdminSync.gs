const ADM_SOURCE_DEFAULT_ID = '1k587rOiqhWk2uIWrSlhxxjRmD_LW1biy1SR76KsTk0o';
const ADM_SOURCE_MAIN_SHEET = 'Bu Sri & Bu Desii';
const ADM_SOURCE_REPORT_SHEET = 'Laporan';
const ADM_SOURCE_TEAM_SHEET = 'Tim';
const ADM_SOURCE_DROPDOWN_SHEET = 'Menu Drop down';

function getAdministrasiSourceId_() {
  return getProperties_().getProperty('UPJKP_ADM_SOURCE_ID') || ADM_SOURCE_DEFAULT_ID;
}

function adminText_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

function adminNormalize_(value) {
  return adminText_(value).toLowerCase().replace(/\s+/g, ' ');
}

function adminNormalizeHeader_(value) {
  return adminNormalize_(value).replace(/[^a-z0-9]+/g, ' ').trim();
}

function adminHeaderMap_(headers) {
  const map = {};
  headers.forEach(function (header, index) {
    const key = adminNormalizeHeader_(header);
    if (!key) return;
    if (!map[key]) map[key] = [];
    map[key].push(index);
  });
  return map;
}

function adminCell_(values, headerMap, header, occurrence, fallbackIndex) {
  const indexes = headerMap[adminNormalizeHeader_(header)] || [];
  const index = indexes[Number(occurrence || 0)];
  if (index !== undefined) return values[index];
  return fallbackIndex === undefined ? '' : values[fallbackIndex];
}

function adminNumber_(value) {
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  let text = adminText_(value).replace(/[^0-9,.-]/g, '');
  if (!text) return 0;
  const comma = text.lastIndexOf(','), dot = text.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) text = comma > dot ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
  else if (comma >= 0) text = text.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, '');
  const parsed = Number(text);
  return isFinite(parsed) ? parsed : 0;
}

function adminSafeKey_(value) {
  return adminText_(value).replace(/[^A-Za-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 100) || 'ROW';
}

function adminCategory_(value) {
  const code = adminText_(value).toUpperCase();
  return code === 'BT' ? 'BT' : code === 'TR' ? 'PLT' : (code === 'RP' || code === 'JID') ? 'RPJID' : 'ADM';
}

function adminCategoryCode_(value) {
  const code = adminText_(value).toUpperCase();
  return code === 'RP' || code === 'JID' ? 'RP' : code === 'BT' ? 'BT' : code === 'TR' ? 'TR' : 'ADM';
}

function adminActivityRecord_(values, headerMap, rowNumber) {
  const company = adminText_(adminCell_(values, headerMap, 'Nama Perusahaan', 0, 5));
  if (!company) return null;
  const categorySource = adminText_(adminCell_(values, headerMap, 'Kegiatan', 0, 0));
  const sourceKey = adminText_(adminCell_(values, headerMap, 'ID', 0, 3)) || 'ROW-' + rowNumber;
  const incoming = sourceDate_(adminCell_(values, headerMap, 'Tanggal Surat Masuk', 0, 7));
  const start = sourceDate_(adminCell_(values, headerMap, 'Tanggal mulai Kunjungan', 0, 31));
  const end = sourceDate_(adminCell_(values, headerMap, 'Tanggal selesai kunjungan', 0, 32));
  const reportSent = sourceDate_(adminCell_(values, headerMap, 'Tanggal Pengiriman Laporan', 0, 19));
  const yearSource = incoming || start || end || reportSent || Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyy');
  return {
    sourceKey: sourceKey,
    safeKey: adminSafeKey_(sourceKey),
    category: adminCategory_(categorySource),
    categoryCode: adminCategoryCode_(categorySource),
    company: company,
    institution: adminText_(adminCell_(values, headerMap, 'Instansi', 0, 1)),
    costStatus: adminText_(adminCell_(values, headerMap, 'Status biaya', 0, 4)),
    incomingNo: adminText_(adminCell_(values, headerMap, 'No. Surat Masuk', 0, 6)),
    incoming: incoming,
    incomingSubject: adminText_(adminCell_(values, headerMap, 'Perihal', 0, 8)),
    kind: adminText_(adminCell_(values, headerMap, 'Jenis Kegiatan', 0, 9)) || 'Administrasi',
    outgoingNo: adminText_(adminCell_(values, headerMap, 'No. Surat Balasan / Keluar', 0, 10)),
    outgoing: sourceDate_(adminCell_(values, headerMap, 'Tanggal Balasan / Keluar', 0, 11)),
    outgoingSubject: adminText_(adminCell_(values, headerMap, 'Perihal', 1, 12)),
    visitNo: adminText_(adminCell_(values, headerMap, 'No. Surat Kunjungan', 0, 15)),
    assignmentNo: adminText_(adminCell_(values, headerMap, 'No. Surat Tugas', 0, 16)),
    visitDate: sourceDate_(adminCell_(values, headerMap, 'Tanggal Balasan Kunjungan', 0, 17)),
    visitSubject: adminText_(adminCell_(values, headerMap, 'Perihal', 2, 18)),
    reportLetterNo: adminText_(adminCell_(values, headerMap, 'No. Surat pengiriman laporan', 0, 18)),
    reportSent: reportSent,
    reportSubject: adminText_(adminCell_(values, headerMap, 'Perihal', 3, 20)),
    spkNo: adminText_(adminCell_(values, headerMap, 'No SPK', 0, 24)),
    spkDate: sourceDate_(adminCell_(values, headerMap, 'Tanggal', 0, 25)),
    value: adminNumber_(adminCell_(values, headerMap, 'Jumlah biaya', 0, 29)),
    location: adminText_(adminCell_(values, headerMap, 'Lokasi kegiatan', 0, 30)),
    start: start,
    end: end,
    leader: adminText_(adminCell_(values, headerMap, 'Leader', 0, 34)),
    teamText: adminText_(adminCell_(values, headerMap, 'Tim', 0, 35)),
    invoice: adminText_(adminCell_(values, headerMap, 'No Invoice', 0, 41)) || adminText_(adminCell_(values, headerMap, 'No Invoice thp 1', 0, 37)),
    invoiceDate: sourceDate_(adminCell_(values, headerMap, 'Tanggal Invoice', 0, 42)),
    due: sourceDate_(adminCell_(values, headerMap, 'Jatuh Tempo Faktur', 0, 44)) || sourceDate_(adminCell_(values, headerMap, 'Jatuh Tempo Faktur thp 1', 0, 38)),
    journal: adminText_(adminCell_(values, headerMap, 'No. Transaksi Jurnal.id', 0, 45)) || adminText_(adminCell_(values, headerMap, 'No. Transaksi Jurnal.id thp 1', 0, 39)),
    status: adminText_(adminCell_(values, headerMap, 'Status biaya', 0, 4)) || 'PROSES',
    year: Number(String(yearSource).slice(0, 4)),
  };
}

function adminReportRecord_(values, headerMap) {
  const sourceKey = adminText_(adminCell_(values, headerMap, 'ID', 0, 0));
  if (!sourceKey) return null;
  const stages = [];
  function addStage(code, order, personHeader, incomingHeader, outgoingHeader) {
    const incoming = sourceDate_(adminCell_(values, headerMap, incomingHeader, 0));
    const outgoing = outgoingHeader ? sourceDate_(adminCell_(values, headerMap, outgoingHeader, 0)) : '';
    if (!incoming && !outgoing) return;
    stages.push({ code: code, order: order, person: personHeader ? adminText_(adminCell_(values, headerMap, personHeader, 0)) : '', incoming: incoming, outgoing: outgoing });
  }
  const draft = sourceDate_(adminCell_(values, headerMap, 'Tanggal Masuk Draft', 0, 6));
  if (draft) stages.push({ code: 'DRAFT', order: 1, person: adminText_(adminCell_(values, headerMap, 'PIC UPJKP', 0, 7)), incoming: draft, outgoing: '' });
  addStage('KOREKTOR 1', 2, 'Korektor 1', 'Tanggal masuk korektor 1', 'Tanggal Keluar Korektor 1');
  addStage('KOREKTOR 2', 3, 'Korektor 2', 'Tanggal masuk korektor 2', 'Tanggal Keluar Korektor 2');
  addStage('CETAK 1', 4, 'Verifikator', 'Masuk Cetak 1', 'Keluar Cetak 1');
  addStage('KOREKTOR FINAL', 5, 'Korektor final', 'Tanggal Koreksi Final Masuk', 'Tanggal Koreksi Final Keluar');
  addStage('CETAK FINAL', 6, '', 'Cetak Final Masuk', 'Cetak Final Selesai');
  const sent = sourceDate_(adminCell_(values, headerMap, 'Pengiriman Laporan', 0, 30));
  if (sent) stages.push({ code: 'PENGIRIMAN', order: 7, person: adminText_(adminCell_(values, headerMap, 'PIC UPJKP', 0, 7)), incoming: sent, outgoing: sent });
  const latest = stages.length ? stages[stages.length - 1] : null;
  return {
    sourceKey: sourceKey,
    company: adminText_(adminCell_(values, headerMap, 'Nama Perusahaan', 0, 1)),
    subject: adminText_(adminCell_(values, headerMap, 'Perihal', 0, 2)),
    kind: adminText_(adminCell_(values, headerMap, 'Jenis Kegiatan', 0, 3)),
    leader: adminText_(adminCell_(values, headerMap, 'Leader', 0, 4)),
    teamText: adminText_(adminCell_(values, headerMap, 'Tim', 0, 5)),
    pic: adminText_(adminCell_(values, headerMap, 'PIC UPJKP', 0, 7)),
    stages: stages,
    fields: {
      tanggal_draft_masuk: draft,
      checkpoint_terakhir: latest ? latest.code : '',
      korektor_terakhir: latest ? latest.person : '',
      tanggal_checkpoint: latest ? (latest.outgoing || latest.incoming) : '',
      tanggal_revisi: sourceDate_(adminCell_(values, headerMap, 'Penyelesaian Perbaikan final', 0, 27)) || sourceDate_(adminCell_(values, headerMap, 'Penyelesaian Perbaikan', 0, 17)),
      tanggal_cetak: sourceDate_(adminCell_(values, headerMap, 'Cetak Final Selesai', 0, 29)) || sourceDate_(adminCell_(values, headerMap, 'Keluar Cetak 1', 0, 21)),
      tanggal_kirim: sent,
      status: sent ? 'NET' : (latest ? 'PROSES' : 'DRAFT'),
    },
  };
}

function adminActivityFromReport_(report) {
  const code = adminText_(report.sourceKey).split('-')[0].toUpperCase();
  const categoryCode = code === 'RP' || code === 'JID' ? 'RP' : code === 'BT' ? 'BT' : code === 'TR' ? 'TR' : 'ADM';
  const date = report.fields.tanggal_draft_masuk || report.fields.tanggal_checkpoint || report.fields.tanggal_kirim || '';
  return {
    sourceKey: report.sourceKey,
    safeKey: adminSafeKey_(report.sourceKey),
    category: adminCategory_(categoryCode),
    categoryCode: categoryCode,
    company: report.company,
    institution: '',
    costStatus: '',
    incomingNo: '',
    incoming: '',
    incomingSubject: report.subject,
    kind: report.kind || 'Administrasi laporan',
    outgoingNo: '',
    outgoing: '',
    outgoingSubject: '',
    visitNo: '',
    assignmentNo: '',
    visitDate: '',
    visitSubject: '',
    reportLetterNo: '',
    reportSent: report.fields.tanggal_kirim || '',
    reportSubject: report.subject,
    spkNo: '',
    spkDate: '',
    value: 0,
    location: '',
    start: '',
    end: '',
    leader: report.leader,
    teamText: report.teamText,
    invoice: '',
    invoiceDate: '',
    due: '',
    journal: '',
    status: report.fields.status || 'PROSES',
    year: date ? Number(String(date).slice(0, 4)) : Number(Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyy')),
    reportOnly: true,
  };
}

function adminMergeNote_(existing, additions) {
  const parts = adminText_(existing).split('|').map(function (part) { return part.trim(); }).filter(Boolean);
  additions.filter(Boolean).forEach(function (addition) { if (parts.indexOf(addition) < 0) parts.push(addition); });
  return parts.join(' | ');
}

function adminPutNonEmpty_(target, source) {
  Object.keys(source).forEach(function (key) { if (source[key] !== '' && source[key] !== null && source[key] !== undefined) target[key] = source[key]; });
  return target;
}

function adminSplitPeople_(value) {
  return adminText_(value).split(/[,;\n]+/).map(function (name) { return name.trim(); }).filter(Boolean);
}

function adminPeople_(activity, report, teamValues, teamHeaderMap) {
  const people = [], seen = {};
  function add(value, role) {
    adminSplitPeople_(value).forEach(function (name) {
      const key = adminNormalize_(name);
      if (!key) return;
      if (seen[key] !== undefined) { if (role === 'Leader') people[seen[key]].role = 'Leader'; return; }
      seen[key] = people.length;
      people.push({ name: name, role: role });
    });
  }
  add(activity.leader, 'Leader');
  add(report ? report.leader : '', 'Leader');
  add(activity.teamText, 'Petugas');
  add(report ? report.teamText : '', 'Petugas');
  if (teamValues) {
    add(adminCell_(teamValues, teamHeaderMap, 'Leader', 0, 1), 'Leader');
    add(adminCell_(teamValues, teamHeaderMap, 'Leader', 1, 3), 'Leader');
    Object.keys(teamHeaderMap).filter(function (header) { return header.indexOf('anggota ') === 0; }).forEach(function (header) {
      (teamHeaderMap[header] || []).forEach(function (index) { add(teamValues[index], 'Petugas'); });
    });
  }
  return people;
}

function adminActivityMatchScore_(activity, record) {
  const category = adminText_(activity.kategori).toUpperCase(), subsection = adminText_(activity.subbagian).toUpperCase();
  if (category !== record.categoryCode && subsection !== record.category) return -1;
  if (adminNormalize_(activity.perusahaan) !== adminNormalize_(record.company)) return -1;
  let score = 100;
  const location = adminNormalize_(activity.kebun_lokasi), sourceLocation = adminNormalize_(record.location);
  if (location && sourceLocation) score += location === sourceLocation ? 40 : -10;
  const kind = adminNormalize_(activity.jenis_kegiatan), sourceKind = adminNormalize_(record.kind);
  if (kind && sourceKind) score += kind === sourceKind ? 30 : (kind.indexOf(sourceKind) >= 0 || sourceKind.indexOf(kind) >= 0 ? 15 : 0);
  if (Number(activity.tahun) && Number(record.year) && Number(activity.tahun) === Number(record.year)) score += 20;
  return score;
}

function adminLegacyActivityId_(record) {
  return 'ADM-SRC-' + record.safeKey;
}

function adminPreferredActivityId_(record) {
  if (['RP', 'BT', 'TR'].indexOf(record.categoryCode) >= 0) return categorySourceId_(record.categoryCode, record.safeKey, record.category);
  return adminLegacyActivityId_(record);
}

function adminSyncDropdowns_(sourceSheet, targetSheet) {
  if (!sourceSheet || sourceSheet.getLastRow() < 2) return 0;
  const source = sourceSheet.getRange(1, 1, sourceSheet.getLastRow(), sourceSheet.getLastColumn()).getDisplayValues();
  const headers = getHeaders_(targetSheet), rows = targetSheet.getLastRow() < 2 ? [] : targetSheet.getRange(2, 1, targetSheet.getLastRow() - 1, headers.length).getValues();
  const groupIndex = headers.indexOf('group_name'), valueIndex = headers.indexOf('value'), sortIndex = headers.indexOf('sort_order'), activeIndex = headers.indexOf('status_aktif');
  const existing = {};
  rows.forEach(function (row, index) { existing[adminNormalize_(row[groupIndex]) + '|' + adminNormalize_(row[valueIndex])] = index; });
  let synced = 0;
  source[0].forEach(function (header, columnIndex) {
    const group = adminNormalizeHeader_(header).replace(/\s+/g, '_').toUpperCase();
    if (!group) return;
    source.slice(1).forEach(function (row, rowIndex) {
      const value = adminText_(row[columnIndex]);
      if (!value) return;
      const key = adminNormalize_(group) + '|' + adminNormalize_(value);
      let index = existing[key];
      if (index === undefined) { index = rows.length; existing[key] = index; rows.push(headers.map(function () { return ''; })); }
      rows[index][groupIndex] = group;
      rows[index][valueIndex] = value;
      rows[index][sortIndex] = rowIndex + 1;
      rows[index][activeIndex] = 'YA';
      synced += 1;
    });
  });
  if (rows.length) targetSheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  return synced;
}

function syncAdministrasiNow(options) {
  options = options || {};
  assertConfigured_();
  const sourceId = options.sourceSpreadsheetId || getAdministrasiSourceId_();
  const source = SpreadsheetApp.openById(sourceId), activitySheet = source.getSheetByName(ADM_SOURCE_MAIN_SHEET);
  if (!activitySheet) throw new Error('Sheet ' + ADM_SOURCE_MAIN_SHEET + ' tidak ditemukan pada sumber Administrasi.');

  const activityHeaders = activitySheet.getRange(1, 1, 1, activitySheet.getLastColumn()).getDisplayValues()[0], activityHeaderMap = adminHeaderMap_(activityHeaders);
  const activityValues = activitySheet.getLastRow() < 2 ? [] : activitySheet.getRange(2, 1, Math.min(activitySheet.getLastRow() - 1, 10000), activityHeaders.length).getValues();
  const records = activityValues.map(function (values, index) { return adminActivityRecord_(values, activityHeaderMap, index + 2); }).filter(Boolean);
  const mainRowsRead = records.length;

  const reportSheet = source.getSheetByName(ADM_SOURCE_REPORT_SHEET), reportsBySource = {};
  let reportRowsRead = 0;
  if (reportSheet && reportSheet.getLastRow() > 1) {
    const headers = reportSheet.getRange(1, 1, 1, reportSheet.getLastColumn()).getDisplayValues()[0], headerMap = adminHeaderMap_(headers);
    reportSheet.getRange(2, 1, Math.min(reportSheet.getLastRow() - 1, 10000), headers.length).getValues().forEach(function (values) {
      const report = adminReportRecord_(values, headerMap);
      if (report && (report.company || report.subject || report.kind || report.stages.length)) {
        reportsBySource[report.sourceKey] = report;
        reportRowsRead += 1;
      }
    });
  }
  const mainSourceKeys = {};
  records.forEach(function (record) { mainSourceKeys[record.sourceKey] = true; });
  let reportOnlyRows = 0;
  Object.keys(reportsBySource).forEach(function (sourceKey) {
    const report = reportsBySource[sourceKey];
    if (!mainSourceKeys[sourceKey] && report.company) {
      records.push(adminActivityFromReport_(report));
      mainSourceKeys[sourceKey] = true;
      reportOnlyRows += 1;
    }
  });
  const teamSheet = source.getSheetByName(ADM_SOURCE_TEAM_SHEET), teamsBySource = {}, teamHeaderMap = {};
  let teamSourceRows = 0;
  if (teamSheet && teamSheet.getLastRow() > 1) {
    const headers = teamSheet.getRange(1, 1, 1, teamSheet.getLastColumn()).getDisplayValues()[0];
    Object.assign(teamHeaderMap, adminHeaderMap_(headers));
    teamSheet.getRange(2, 1, Math.min(teamSheet.getLastRow() - 1, 10000), headers.length).getDisplayValues().forEach(function (values) {
      const sourceKey = adminText_(adminCell_(values, teamHeaderMap, 'ID', 0, 0));
      if (sourceKey) { teamsBySource[sourceKey] = values; teamSourceRows += 1; }
    });
  }

  let insertedActivities = 0, updatedActivities = 0, linkedActivities = 0, insertedReports = 0, updatedReports = 0;
  let insertedBilling = 0, updatedBilling = 0, historyRows = 0, teamRows = 0, companiesCreated = 0, correspondenceRows = 0, migratedIds = 0;
  const transaction = withWriteTransaction_({ actor: currentUser_(), action: 'sync_adm_source', tableName: 'MULTI', recordId: sourceId, reason: 'Sinkronisasi database Administrasi dan relasi RP/BT/TR' }, function (master) {
    const companiesTable = recommendationMemoryTable_(master.getSheetByName('MASTER_PERUSAHAAN'), 'company_id');
    const activitiesTable = recommendationMemoryTable_(master.getSheetByName('KEGIATAN'), 'activity_id');
    const reportsTable = recommendationMemoryTable_(master.getSheetByName('MONITORING_LAPORAN'), 'report_id');
    const historyTable = recommendationMemoryTable_(master.getSheetByName('HISTORI_LAPORAN'), 'history_id');
    const correspondenceTable = recommendationMemoryTable_(master.getSheetByName('KORESPONDENSI'), 'correspondence_id');
    const billingTable = recommendationMemoryTable_(master.getSheetByName('PENAGIHAN'), 'billing_id');
    const teamTable = recommendationMemoryTable_(master.getSheetByName('TIM_SPJ'), 'team_id');
    function memoryRows(table) { return table.rows.map(function (values) { const row = {}; table.headers.forEach(function (header, index) { row[header] = values[index]; }); return row; }); }

    const companyByName = {}, activityRows = memoryRows(activitiesTable).filter(function (row) { return !row.archived_at; });
    const activityById = {}, sourceActivity = {}, claimedActivities = {};
    let nextCompanyNumber = 1;
    memoryRows(companiesTable).forEach(function (company) {
      if (!company.archived_at) companyByName[adminNormalize_(company.nama)] = company.company_id;
      const match = adminText_(company.company_id).match(/^PRSH-(\d+)$/);
      if (match) nextCompanyNumber = Math.max(nextCompanyNumber, Number(match[1]) + 1);
    });
    activityRows.forEach(function (activity) {
      activityById[String(activity.activity_id)] = activity;
      const match = adminText_(activity.catatan).match(/(?:^|\|)\s*ADMIN_SOURCE_ID=([^|]+)/);
      if (match) sourceActivity[adminText_(match[1])] = activity;
    });
    const reportByActivity = {};
    memoryRows(reportsTable).forEach(function (report) {
      if (report.archived_at) return;
      const key = String(report.activity_id || '');
      if (!reportByActivity[key] || String(report.updated_at || '') > String(reportByActivity[key].updated_at || '')) reportByActivity[key] = report;
    });
    const billingByActivity = {}, billingByInvoice = {};
    memoryRows(billingTable).forEach(function (billing) {
      if (billing.archived_at) return;
      if (billing.source_id) billingByActivity[String(billing.source_id)] = billing;
      if (billing.nomor_invoice) billingByInvoice[adminNormalize_(billing.nomor_invoice)] = billing;
    });

    records.forEach(function (record) {
      const preferredActivityId = adminPreferredActivityId_(record);
      const legacyActivityId = adminLegacyActivityId_(record);
      const legacyActivity = activityById[legacyActivityId] || null;
      let activity = activityById[preferredActivityId] || sourceActivity[record.sourceKey] || null;
      if (activity && String(activity.activity_id) === legacyActivityId && preferredActivityId !== legacyActivityId) activity = null;
      if (!activity) {
        const candidates = activityRows.filter(function (candidate) { return String(candidate.activity_id) !== legacyActivityId && !claimedActivities[String(candidate.activity_id)]; }).map(function (candidate) { return { activity: candidate, score: adminActivityMatchScore_(candidate, record) }; }).filter(function (candidate) { return candidate.score >= 115; }).sort(function (left, right) { return right.score - left.score; });
        if (candidates.length && (candidates.length === 1 || candidates[0].score > candidates[1].score)) activity = candidates[0].activity;
      }
      const oldActivityId = activity ? String(activity.activity_id) : '';
      const migrateMatched = Boolean(activity && ['RP', 'BT', 'TR'].indexOf(record.categoryCode) >= 0 && oldActivityId !== preferredActivityId && !activityById[preferredActivityId]);
      const migrateLegacy = Boolean(!activity && legacyActivity && preferredActivityId !== legacyActivityId);
      if (!activity && legacyActivity) activity = legacyActivity;
      const migratedFromActivityId = migrateMatched ? oldActivityId : (migrateLegacy ? legacyActivityId : '');
      const existed = Boolean(activity) && !migrateLegacy && !migrateMatched, activityId = (migrateLegacy || migrateMatched) ? preferredActivityId : (activity ? String(activity.activity_id) : preferredActivityId);
      const companyKey = adminNormalize_(record.company);
      let companyId = activity && activity.company_id ? activity.company_id : companyByName[companyKey];
      if (!companyId) {
        companyId = 'PRSH-' + String(nextCompanyNumber++).padStart(4, '0');
        companiesTable.upsert(companyId, { company_id: companyId, nama: record.company, nama_singkat: record.company, jenis_instansi: record.institution, status_aktif: 'YA', catatan: 'SOURCE_SYNC=ADM', created_at: nowIso_(), updated_at: nowIso_(), archived_at: '' });
        companyByName[companyKey] = companyId;
        companiesCreated += 1;
      }
      const activityMapped = { activity_id: activityId, company_id: companyId, perusahaan: record.company, subbagian: record.category, kategori: record.categoryCode, instansi: record.institution || (activity ? activity.instansi : ''), jenis_kegiatan: record.kind || (activity ? activity.jenis_kegiatan : ''), status_biaya: record.costStatus || (activity ? activity.status_biaya : ''), kebun_lokasi: record.location || (activity ? activity.kebun_lokasi : ''), tahun: record.year || (activity ? activity.tahun : ''), tanggal_surat_masuk: record.incoming || (activity ? activity.tanggal_surat_masuk : ''), no_surat_masuk: record.incomingNo || (activity ? activity.no_surat_masuk : ''), tanggal_spk: record.spkDate || (activity ? activity.tanggal_spk : ''), no_spk: record.spkNo || (activity ? activity.no_spk : ''), tanggal_mulai: record.start || (activity ? activity.tanggal_mulai : ''), tanggal_selesai: record.end || (activity ? activity.tanggal_selesai : ''), nilai_kontrak: record.value || (activity ? activity.nilai_kontrak : 0), pic: record.leader || record.teamText || (activity ? activity.pic : ''), status: record.reportSent ? 'SELESAI' : (activity ? activity.status : 'AKTIF'), catatan: adminMergeNote_(activity ? activity.catatan : '', ['SOURCE_SYNC=ADM', 'ADMIN_SOURCE_ID=' + record.sourceKey]), updated_at: nowIso_(), archived_at: '' };
      if (!existed) { activityMapped.display_id = activityId; activityMapped.created_at = nowIso_(); }
      const activityResult = activitiesTable.upsert(activityId, activityMapped);
      if (activityResult === 'inserted') insertedActivities += 1; else updatedActivities += 1;
      if (existed && String(activity.activity_id).indexOf('ADM-SRC-') !== 0) linkedActivities += 1;
      if (migrateMatched && activity && !activity.archived_at) {
        activitiesTable.upsert(oldActivityId, {
          archived_at: nowIso_(),
          updated_at: nowIso_(),
          catatan: adminMergeNote_(activity.catatan, ['MIGRATED_TO=' + activityId, 'ADMIN_SOURCE_ID=' + record.sourceKey]),
        });
        migratedIds += 1;
      }
      if (legacyActivity && String(legacyActivity.activity_id) !== activityId && !legacyActivity.archived_at) {
        activitiesTable.upsert(legacyActivityId, {
          archived_at: nowIso_(),
          updated_at: nowIso_(),
          catatan: adminMergeNote_(legacyActivity.catatan, ['MIGRATED_TO=' + activityId]),
        });
        migratedIds += 1;
      }
      activity = activitiesTable.get(activityId);
      activityById[activityId] = activity; sourceActivity[record.sourceKey] = activity; claimedActivities[activityId] = true;
      [migratedFromActivityId, legacyActivityId].forEach(function (id) { if (id && id !== activityId) claimedActivities[id] = true; });

      const reportSource = reportsBySource[record.sourceKey] || null;
      const previousActivityIds = [migratedFromActivityId, legacyActivityId].filter(function (id, index, ids) { return id && id !== activityId && ids.indexOf(id) === index; });
      const legacyReport = previousActivityIds.map(function (id) { return reportByActivity[id] || null; }).filter(Boolean)[0] || null;
      let report = reportByActivity[activityId] || null;
      if (!report && legacyReport) report = legacyReport;
      const reportUsesLegacy = Boolean(report && String(report.activity_id) !== activityId);
      const reportId = report && !reportUsesLegacy ? String(report.report_id) : reportIdForActivity_(activityId);
      const reportMapped = { report_id: reportId, activity_id: activityId, company_id: companyId, perusahaan: record.company, regional: activity.regional || '', kebun: record.location || activity.kebun_lokasi || '', nama_kegiatan: record.kind, tahun: record.year, workflow: record.categoryCode === 'RP' ? 'RP' : record.categoryCode === 'BT' ? 'BT' : record.categoryCode === 'ADM' ? 'ADMINISTRASI' : 'UMUM', pic: (reportSource && (reportSource.pic || reportSource.leader)) || record.leader || activity.pic || '', catatan: adminMergeNote_(report ? report.catatan : '', ['SOURCE_SYNC=ADM/LAPORAN', 'ADMIN_SOURCE_ID=' + record.sourceKey]), updated_at: nowIso_(), archived_at: '' };
      if (!report || reportUsesLegacy) { reportMapped.created_at = nowIso_(); reportMapped.status = 'DRAFT'; }
      if (reportUsesLegacy) {
        adminPutNonEmpty_(reportMapped, {
          tanggal_draft_masuk: report.tanggal_draft_masuk,
          checkpoint_terakhir: report.checkpoint_terakhir,
          korektor_terakhir: report.korektor_terakhir,
          tanggal_checkpoint: report.tanggal_checkpoint,
          tanggal_revisi: report.tanggal_revisi,
          tanggal_cetak: report.tanggal_cetak,
          tanggal_kirim: report.tanggal_kirim,
          tanggal_net: report.tanggal_net,
          status: report.status,
        });
      }
      if (reportSource) adminPutNonEmpty_(reportMapped, reportSource.fields);
      if (record.reportSent) { reportMapped.tanggal_kirim = record.reportSent; reportMapped.checkpoint_terakhir = 'PENGIRIMAN'; reportMapped.tanggal_checkpoint = record.reportSent; reportMapped.status = 'NET'; }
      const reportResult = reportsTable.upsert(reportId, reportMapped);
      if (reportResult === 'inserted') insertedReports += 1; else updatedReports += 1;
      previousActivityIds.map(function (id) { return reportByActivity[id] || null; }).filter(Boolean).forEach(function (oldReport) {
        if (String(oldReport.report_id) === reportId || oldReport.archived_at) return;
        reportsTable.upsert(oldReport.report_id, {
          archived_at: nowIso_(),
          updated_at: nowIso_(),
          catatan: adminMergeNote_(oldReport.catatan, ['MIGRATED_TO=' + reportId]),
        });
        migratedIds += 1;
      });
      report = reportsTable.get(reportId); reportByActivity[activityId] = report;
      (reportSource ? reportSource.stages : []).forEach(function (stage) {
        const historyId = reportId + '-' + stage.code.replace(/\s+/g, '-');
        historyTable.upsert(historyId, { history_id: historyId, report_id: reportId, checkpoint: stage.code, urutan: stage.order, korektor: stage.person, tanggal_masuk: stage.incoming, tanggal_selesai: stage.outgoing, catatan: 'SOURCE_SYNC=ADM/LAPORAN', created_at: nowIso_(), created_by: currentUser_() });
        historyRows += 1;
      });

      if (record.incomingNo || record.incoming || record.incomingSubject) {
        const correspondenceId = 'KOR-ADM-' + record.safeKey + '-MASUK';
        correspondenceTable.upsert(correspondenceId, { correspondence_id: correspondenceId, activity_id: activityId, jenis_surat: 'SURAT MASUK', nomor_surat: record.incomingNo, tanggal: record.incoming, perihal: record.incomingSubject, updated_at: nowIso_(), created_at: nowIso_() });
        correspondenceRows += 1;
      }
      if (record.outgoingNo || record.outgoing || record.outgoingSubject) {
        const correspondenceId = 'KOR-ADM-' + record.safeKey + '-KELUAR';
        correspondenceTable.upsert(correspondenceId, { correspondence_id: correspondenceId, activity_id: activityId, jenis_surat: 'SURAT BALASAN/KELUAR', nomor_surat: record.outgoingNo, tanggal: record.outgoing, perihal: record.outgoingSubject, updated_at: nowIso_(), created_at: nowIso_() });
        correspondenceRows += 1;
      }
      if (record.visitNo || record.visitDate || record.visitSubject) {
        const correspondenceId = 'KOR-ADM-' + record.safeKey + '-KUNJUNGAN';
        correspondenceTable.upsert(correspondenceId, { correspondence_id: correspondenceId, activity_id: activityId, jenis_surat: 'SURAT KUNJUNGAN', nomor_surat: record.visitNo, tanggal: record.visitDate, perihal: record.visitSubject, updated_at: nowIso_(), created_at: nowIso_() });
        correspondenceRows += 1;
      }
      if (record.assignmentNo) {
        const correspondenceId = 'KOR-ADM-' + record.safeKey + '-TUGAS';
        correspondenceTable.upsert(correspondenceId, { correspondence_id: correspondenceId, activity_id: activityId, jenis_surat: 'SURAT TUGAS', nomor_surat: record.assignmentNo, tanggal: record.visitDate, perihal: record.visitSubject, updated_at: nowIso_(), created_at: nowIso_() });
        correspondenceRows += 1;
      }
      if (record.reportLetterNo || record.reportSent || record.reportSubject) {
        const correspondenceId = 'KOR-ADM-' + record.safeKey + '-LAPORAN';
        correspondenceTable.upsert(correspondenceId, { correspondence_id: correspondenceId, activity_id: activityId, jenis_surat: 'PENGIRIMAN LAPORAN', nomor_surat: record.reportLetterNo, tanggal: record.reportSent, perihal: record.reportSubject, updated_at: nowIso_(), created_at: nowIso_() });
        correspondenceRows += 1;
      }

      const people = adminPeople_(record, reportSource, teamsBySource[record.sourceKey], teamHeaderMap);
      people.forEach(function (person, index) {
        const teamId = 'ADM-TEAM-' + record.safeKey + '-' + (index + 1);
        teamTable.upsert(teamId, { team_id: teamId, activity_id: activityId, nama: person.name, peran: person.role, hk: 0, nominal_hk: 0, total_spj: 0, panjar: 0, realisasi_panjar: 0, created_at: nowIso_(), updated_at: nowIso_() });
        teamRows += 1;
      });

      if (record.value || record.invoice || record.invoiceDate) {
        const legacyBilling = previousActivityIds.map(function (id) { return billingByActivity[id] || null; }).filter(Boolean)[0] || null;
        let billing = billingByActivity[activityId] || (record.invoice ? billingByInvoice[adminNormalize_(record.invoice)] : null) || null;
        if (billing && previousActivityIds.indexOf(String(billing.source_id || '')) >= 0) billing = null;
        if (!billing && legacyBilling) billing = legacyBilling;
        const billingUsesLegacy = Boolean(billing && String(billing.source_id || '') !== activityId);
        const billingId = billing && !billingUsesLegacy ? String(billing.billing_id) : 'BILL-' + activityId;
        const billingMapped = { billing_id: billingId, company_id: companyId, perusahaan: record.company, kebun: record.location || activity.kebun_lokasi || (billing ? billing.kebun : ''), source_type: record.categoryCode === 'ADM' ? 'ADMINISTRASI' : 'KEGIATAN', source_id: activityId, nilai: record.value || (billing ? billing.nilai : 0), nomor_invoice: record.invoice || (billing ? billing.nomor_invoice : ''), tanggal_invoice: record.invoiceDate || (billing ? billing.tanggal_invoice : ''), jatuh_tempo: record.due || (billing ? billing.jatuh_tempo : ''), status: record.invoice ? 'TERBIT' : (billing ? billing.status : 'DRAFT'), nomor_jurnal: record.journal || (billing ? billing.nomor_jurnal : ''), pic: record.leader || activity.pic || (billing ? billing.pic : ''), catatan: adminMergeNote_(billing ? billing.catatan : '', ['SOURCE_SYNC=ADM', 'ADMIN_SOURCE_ID=' + record.sourceKey]), updated_at: nowIso_(), archived_at: '' };
        if (!billing || billingUsesLegacy) billingMapped.created_at = nowIso_();
        const billingResult = billingTable.upsert(billingId, billingMapped);
        if (billingResult === 'inserted') insertedBilling += 1; else updatedBilling += 1;
        previousActivityIds.map(function (id) { return billingByActivity[id] || null; }).filter(Boolean).forEach(function (oldBilling) {
          if (String(oldBilling.billing_id) === billingId || oldBilling.archived_at) return;
          billingTable.upsert(oldBilling.billing_id, {
            archived_at: nowIso_(),
            updated_at: nowIso_(),
            catatan: adminMergeNote_(oldBilling.catatan, ['MIGRATED_TO=' + billingId]),
          });
          migratedIds += 1;
        });
        billing = billingTable.get(billingId); billingByActivity[activityId] = billing;
        if (record.invoice) billingByInvoice[adminNormalize_(record.invoice)] = billing;
      }
    });

    companiesTable.flush(); activitiesTable.flush(); reportsTable.flush(); historyTable.flush(); correspondenceTable.flush(); billingTable.flush(); teamTable.flush();
    return { dropdownRows: adminSyncDropdowns_(source.getSheetByName(ADM_SOURCE_DROPDOWN_SHEET), master.getSheetByName('DROPDOWN')) };
  }, { skipBackup: Boolean(options.automatic) });

  const summary = { sourceSpreadsheetId: sourceId, sourceUrl: source.getUrl(), rowsRead: records.length, mainRowsRead: mainRowsRead, reportRowsRead: reportRowsRead, reportOnlyRows: reportOnlyRows, teamSourceRows: teamSourceRows, linkedActivities: linkedActivities, insertedActivities: insertedActivities, updatedActivities: updatedActivities, insertedReports: insertedReports, updatedReports: updatedReports, insertedBilling: insertedBilling, updatedBilling: updatedBilling, historyRows: historyRows, teamRows: teamRows, correspondenceRows: correspondenceRows, dropdownRows: transaction.result.dropdownRows, companiesCreated: companiesCreated, migratedIds: migratedIds, backupId: transaction.backupId, message: records.length + ' data Administrasi diproses (' + reportOnlyRows + ' berasal dari laporan tanpa baris utama); ' + linkedActivities + ' kegiatan terhubung ke master RP/BT/TR, ' + migratedIds + ' ID lama dimigrasikan, ' + correspondenceRows + ' korespondensi, dan ' + teamRows + ' petugas disinkronkan.' };
  getProperties_().setProperties({ UPJKP_ADM_SOURCE_ID: sourceId, UPJKP_ADM_LAST_SYNC_AT: nowIso_(), UPJKP_ADM_LAST_SYNC_SUMMARY: JSON.stringify(summary) });
  return success_(summary);
}

function syncAdministrasi() { return syncAdministrasiNow({ automatic: false }); }
function syncAdministrasiFromEdit() { return syncAdministrasiNow({ automatic: true }); }

function reclassifyMisfiledBtActivities() {
  assertConfigured_();
  const sourceId = getAdministrasiSourceId_();
  const source = SpreadsheetApp.openById(sourceId);
  const activitySheet = source.getSheetByName(ADM_SOURCE_MAIN_SHEET);
  if (!activitySheet) throw new Error('Sheet ' + ADM_SOURCE_MAIN_SHEET + ' tidak ditemukan pada sumber Administrasi.');

  const headers = activitySheet.getRange(1, 1, 1, activitySheet.getLastColumn()).getDisplayValues()[0];
  const headerMap = adminHeaderMap_(headers);
  const categoryColumn = (headerMap[adminNormalizeHeader_('Kegiatan')] || [0])[0];
  const kindColumn = (headerMap[adminNormalizeHeader_('Jenis Kegiatan')] || [9])[0];
  const idColumn = (headerMap[adminNormalizeHeader_('ID')] || [3])[0];
  const values = activitySheet.getLastRow() < 2
    ? []
    : activitySheet.getRange(2, 1, Math.min(activitySheet.getLastRow() - 1, 10000), headers.length).getDisplayValues();
  const targetKinds = { 'fs.lahan': true, 'ev.prod': true };
  const changes = [];
  values.forEach(function (row, index) {
    const category = adminText_(row[categoryColumn]).toUpperCase();
    const kind = adminNormalize_(row[kindColumn]);
    if (category !== 'RP' || !targetKinds[kind]) return;
    changes.push({ row: index + 2, sourceKey: adminText_(row[idColumn]), kind: adminText_(row[kindColumn]) });
  });
  let backupId = '';
  if (changes.length) {
    const backupFolderId = getConfiguration_().backupFolderId;
    if (!backupFolderId) throw new Error('Folder backup belum dikonfigurasi.');
    const stamp = Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyy-MM-dd_HHmmss');
    backupId = DriveApp.getFileById(sourceId).makeCopy('Data base Admin backup sebelum koreksi BT ' + stamp, DriveApp.getFolderById(backupFolderId)).getId();
    changes.forEach(function (item) { activitySheet.getRange(item.row, categoryColumn + 1).setValue('BT'); });
    SpreadsheetApp.flush();
  }

  const refreshedHeaders = activitySheet.getRange(1, 1, 1, activitySheet.getLastColumn()).getDisplayValues()[0];
  const refreshedHeaderMap = adminHeaderMap_(refreshedHeaders);
  const refreshedValues = activitySheet.getLastRow() < 2
    ? []
    : activitySheet.getRange(2, 1, Math.min(activitySheet.getLastRow() - 1, 10000), refreshedHeaders.length).getValues();
  const btRecords = refreshedValues.map(function (row, index) {
    return adminActivityRecord_(row, refreshedHeaderMap, index + 2);
  }).filter(function (record) {
    return record && record.categoryCode === 'BT' && targetKinds[adminNormalize_(record.kind)];
  });

  const sync = syncAdministrasiNow({ automatic: false, sourceSpreadsheetId: sourceId });
  const masterRepair = repairMisclassifiedBtMaster_(btRecords);
  return success_({
    changed: changes,
    sourceBackupId: backupId,
    sourceSpreadsheetId: sourceId,
    sync: sync.data,
    masterRepair: masterRepair,
    message: changes.length
      ? changes.length + ' kegiatan dipindahkan dari RP ke BT dan database master diperbarui.'
      : 'Tidak ada baris sumber RP yang perlu diubah; pemeriksaan relasi database master tetap dijalankan.',
  });
}

function repairMisclassifiedBtMaster_(sourceRecords) {
  const candidates = (sourceRecords || []).filter(function (record) {
    return record && record.categoryCode === 'BT' && ['fs.lahan', 'ev.prod'].indexOf(adminNormalize_(record.kind)) >= 0;
  });
  if (!candidates.length) return { migrated: [], referencesUpdated: 0, message: 'Tidak ada sumber BT FS.lahan/Ev.Prod untuk diperiksa.' };

  let migrated = [], referencesUpdated = 0;
  const transaction = withWriteTransaction_({
    actor: currentUser_(),
    action: 'repair_bt_master_category',
    tableName: 'MULTI',
    recordId: candidates.map(function (record) { return record.sourceKey; }).join(','),
    reason: 'Memindahkan relasi kegiatan BT yang sebelumnya tersimpan sebagai RP',
  }, function (master) {
    const tableByName = {};
    ['KEGIATAN', 'MONITORING_LAPORAN', 'HISTORI_LAPORAN', 'KORESPONDENSI', 'LOKASI_KEGIATAN', 'TIM_SPJ', 'ANALISIS_LAB', 'LAMPIRAN_DOSIS', 'TRANSAKSI_JID', 'PENAGIHAN', 'JADWAL_TENAGA_AHLI', 'DOKUMEN', 'NOTIFIKASI'].forEach(function (name) {
      const sheet = master.getSheetByName(name);
      if (!sheet) return;
      const idField = name === 'KEGIATAN' ? 'activity_id'
        : name === 'MONITORING_LAPORAN' ? 'report_id'
          : name === 'HISTORI_LAPORAN' ? 'history_id'
            : name === 'KORESPONDENSI' ? 'correspondence_id'
              : name === 'LOKASI_KEGIATAN' ? 'location_id'
                : name === 'TIM_SPJ' ? 'team_id'
                  : name === 'ANALISIS_LAB' ? 'lab_id'
                    : name === 'LAMPIRAN_DOSIS' ? 'dose_id'
                      : name === 'TRANSAKSI_JID' ? 'transaction_id'
                        : name === 'PENAGIHAN' ? 'billing_id'
                          : name === 'JADWAL_TENAGA_AHLI' ? 'schedule_id'
                            : name === 'DOKUMEN' ? 'document_id' : 'notification_id';
      tableByName[name] = recommendationMemoryTable_(sheet, idField);
    });
    const activityTable = tableByName.KEGIATAN;
    const reportTable = tableByName.MONITORING_LAPORAN;

    function rows(table) {
      if (!table) return [];
      return table.rows.map(function (values) {
        const row = {};
        table.headers.forEach(function (header, index) { row[header] = values[index]; });
        return row;
      });
    }
    function text(value) { return adminText_(value); }
    function same(value, expected) { return adminNormalize_(value) === adminNormalize_(expected); }
    function containsNote(row, value) { return text(row.catatan).toLowerCase().indexOf(String(value).toLowerCase()) >= 0; }
    function mergeRows(table, base, overlay) {
      const merged = {};
      table.headers.forEach(function (header) { merged[header] = base && base[header] !== undefined ? base[header] : ''; });
      if (overlay) table.headers.forEach(function (header) {
        if (overlay[header] !== undefined && overlay[header] !== null && overlay[header] !== '') merged[header] = overlay[header];
      });
      return merged;
    }
    function updateLinkedRows(table, field, oldId, newId) {
      if (!table || table.headers.indexOf(field) < 0) return 0;
      let count = 0;
      rows(table).forEach(function (row) {
        if (text(row[field]) !== oldId) return;
        if (table.headers.indexOf('archived_at') >= 0 && text(row.archived_at)) return;
        const id = text(row[table.headers[0]]);
        if (!id) return;
        const update = {}; update[field] = newId;
        if (table.headers.indexOf('updated_at') >= 0) update.updated_at = nowIso_();
        table.upsert(id, update);
        count += 1;
      });
      return count;
    }
    function activityScore(activity, record) {
      let score = 0;
      if (same(activity.kategori, 'RP') || same(activity.subbagian, 'RPJID')) score += 20;
      if (same(activity.jenis_kegiatan, record.kind)) score += 80;
      if (same(activity.perusahaan, record.company)) score += 80;
      if (same(activity.kebun_lokasi, record.location)) score += 50;
      if (record.incomingNo && same(activity.no_surat_masuk, record.incomingNo)) score += 35;
      if (record.outgoingNo && same(activity.no_surat_keluar, record.outgoingNo)) score += 35;
      const suffix = text(record.sourceKey).match(/-(\d+)$/);
      if (suffix && containsNote(activity, 'ADMIN_SOURCE_ID=RP-N-' + suffix[1])) score += 45;
      return score;
    }
    function pickLegacyActivity(record, used) {
      const matches = rows(activityTable).filter(function (activity) {
        return !text(activity.archived_at)
          && text(activity.activity_id) !== text(record.sourceKey)
          && (same(activity.kategori, 'RP') || same(activity.subbagian, 'RPJID'))
          && ['fs.lahan', 'ev.prod'].indexOf(adminNormalize_(activity.jenis_kegiatan)) >= 0
          && !used[text(activity.activity_id)];
      }).map(function (activity) { return { activity: activity, score: activityScore(activity, record) }; })
        .filter(function (match) { return match.score >= 180; })
        .sort(function (left, right) { return right.score - left.score; });
      if (!matches.length) return null;
      if (matches.length > 1 && matches[0].score === matches[1].score) return null;
      return matches[0].activity;
    }

    const used = {};
    candidates.forEach(function (record) {
      const newActivityId = categorySourceId_('BT', record.sourceKey, 'BT');
      const legacy = pickLegacyActivity(record, used);
      if (!legacy) return;
      const oldActivityId = text(legacy.activity_id);
      used[oldActivityId] = true;
      const existingActivity = activityTable.get(newActivityId);
      let activity = mergeRows(activityTable, legacy, existingActivity);
      activity.activity_id = newActivityId;
      activity.display_id = newActivityId;
      activity.subbagian = 'BT';
      activity.kategori = 'BT';
      activity.jenis_kegiatan = record.kind || activity.jenis_kegiatan;
      activity.catatan = adminMergeNote_(activity.catatan, ['SOURCE_SYNC=ADM', 'ADMIN_SOURCE_ID=' + record.sourceKey, 'CATEGORY_CORRECTION=RP_TO_BT', 'MIGRATED_FROM=' + oldActivityId]);
      activity.updated_at = nowIso_();
      activity.archived_at = '';
      if (!activity.created_at) activity.created_at = nowIso_();
      activityTable.upsert(newActivityId, activity);
      activityTable.upsert(oldActivityId, {
        archived_at: nowIso_(),
        updated_at: nowIso_(),
        catatan: adminMergeNote_(legacy.catatan, ['MIGRATED_TO=' + newActivityId, 'CATEGORY_CORRECTION=RP_TO_BT']),
      });

      const oldReports = rows(reportTable).filter(function (report) { return !text(report.archived_at) && text(report.activity_id) === oldActivityId; });
      const targetReportId = reportIdForActivity_(newActivityId);
      const existingReport = reportTable.get(targetReportId);
      const legacyReport = oldReports.length ? oldReports[oldReports.length - 1] : null;
      if (legacyReport || existingReport) {
        let report = mergeRows(reportTable, legacyReport || existingReport, existingReport);
        report.report_id = targetReportId;
        report.activity_id = newActivityId;
        report.workflow = 'BT';
        report.nama_kegiatan = record.kind || report.nama_kegiatan;
        report.catatan = adminMergeNote_(report.catatan, ['CATEGORY_CORRECTION=RP_TO_BT', 'MIGRATED_FROM=' + (legacyReport ? legacyReport.report_id : oldActivityId)]);
        report.updated_at = nowIso_();
        report.archived_at = '';
        if (!report.created_at) report.created_at = nowIso_();
        reportTable.upsert(targetReportId, report);
        oldReports.forEach(function (oldReport) {
          if (text(oldReport.report_id) === targetReportId) return;
          reportTable.upsert(oldReport.report_id, { archived_at: nowIso_(), updated_at: nowIso_(), catatan: adminMergeNote_(oldReport.catatan, ['MIGRATED_TO=' + targetReportId, 'CATEGORY_CORRECTION=RP_TO_BT']) });
        });
        referencesUpdated += updateLinkedRows(tableByName.HISTORI_LAPORAN, 'report_id', legacyReport ? text(legacyReport.report_id) : reportIdForActivity_(oldActivityId), targetReportId);
      }

      ['KORESPONDENSI', 'LOKASI_KEGIATAN', 'TIM_SPJ', 'ANALISIS_LAB', 'LAMPIRAN_DOSIS', 'TRANSAKSI_JID', 'JADWAL_TENAGA_AHLI', 'DOKUMEN'].forEach(function (name) {
        referencesUpdated += updateLinkedRows(tableByName[name], 'activity_id', oldActivityId, newActivityId);
      });
      referencesUpdated += updateLinkedRows(tableByName.PENAGIHAN, 'source_id', oldActivityId, newActivityId);
      if (tableByName.NOTIFIKASI) {
        rows(tableByName.NOTIFIKASI).forEach(function (notification) {
          if (text(notification.source_id) !== oldActivityId || text(notification.source_table).toUpperCase() !== 'KEGIATAN') return;
          tableByName.NOTIFIKASI.upsert(text(notification.notification_id), { source_id: newActivityId });
          referencesUpdated += 1;
        });
      }
      migrated.push({ sourceKey: record.sourceKey, fromActivityId: oldActivityId, toActivityId: newActivityId, reportId: targetReportId });
    });

    Object.keys(tableByName).forEach(function (name) { tableByName[name].flush(); });
    return { migrated: migrated, referencesUpdated: referencesUpdated };
  });
  return { migrated: migrated, referencesUpdated: referencesUpdated, backupId: transaction.backupId, message: migrated.length + ' relasi kegiatan RP dimigrasikan ke BT.' };
}

function connectAdministrasiSource() {
  const properties = getProperties_();
  properties.setProperty('UPJKP_ADM_SOURCE_ID', ADM_SOURCE_DEFAULT_ID);
  const result = syncAdministrasiNow({ automatic: false, sourceSpreadsheetId: ADM_SOURCE_DEFAULT_ID });
  try {
    let sourceTriggerExists = false;
    ScriptApp.getProjectTriggers().forEach(function (trigger) {
      if (trigger.getHandlerFunction() !== 'syncAdministrasiFromEdit') return;
      let triggerSourceId = '';
      try { triggerSourceId = trigger.getTriggerSourceId(); }
      catch (error) { triggerSourceId = ''; }
      if (triggerSourceId === ADM_SOURCE_DEFAULT_ID) sourceTriggerExists = true;
      else ScriptApp.deleteTrigger(trigger);
    });
    if (!sourceTriggerExists) ScriptApp.newTrigger('syncAdministrasiFromEdit').forSpreadsheet(ADM_SOURCE_DEFAULT_ID).onEdit().create();
  } catch (error) {
    result.data.triggerWarning = 'Sinkronisasi selesai, tetapi trigger perubahan belum dibuat: ' + error.message;
  }
  return result;
}
