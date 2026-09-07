const RP_SOURCE_DEFAULT_ID = '12gHG4c4t8_JeL_nW2YJ4bmgSCKE7krvSB4turxR6TTE';
const RP_SYNC_SCHEMA_VERSION = '2';

function getRekomendasiSourceId_() {
  return getProperties_().getProperty('UPJKP_RP_SOURCE_ID') || RP_SOURCE_DEFAULT_ID;
}

function recommendationMoney_(value) {
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  let text = adminText_(value);
  if (!text) return 0;
  const negative = /^\(.*\)$/.test(text);
  text = text.replace(/[^0-9,.-]/g, '').replace(/^\(|\)$/g, '');
  if (!text || text === '-' || text === '.' || text === ',') return 0;
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    text = lastComma > lastDot ? text.replace(/\./g, '').replace(/,/g, '.') : text.replace(/,/g, '');
  } else if (lastComma >= 0) {
    const parts = text.split(',');
    text = parts.length > 2 || (parts.length === 2 && parts[1].length === 3) ? parts.join('') : text.replace(',', '.');
  } else if (lastDot >= 0) {
    const parts = text.split('.');
    text = parts.length > 2 || (parts.length === 2 && parts[1].length === 3) ? parts.join('') : text;
  }
  const parsed = Number(text);
  return isFinite(parsed) ? (negative ? -Math.abs(parsed) : parsed) : 0;
}

function recommendationDate_(value, endOfMonth) {
  const text = adminText_(value).replace(/\s+/g, ' ');
  if (!text) return '';
  const months = {
    januari: 1, februari: 2, pebruari: 2, maret: 3, april: 4, mei: 5, juni: 6,
    juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
  };
  let match = text.toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (match && months[match[2]]) {
    return match[3] + '-' + String(months[match[2]]).padStart(2, '0') + '-' + String(match[1]).padStart(2, '0');
  }
  match = text.toLowerCase().match(/^([a-z]+)\s+(\d{4})$/);
  if (match && months[match[1]]) {
    const month = months[match[1]];
    const day = endOfMonth ? new Date(Number(match[2]), month, 0).getDate() : 1;
    return match[2] + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  }
  return sourceDate_(text);
}

function recommendationBillingRecord_(values, rowNumber, sourceName) {
  if (!/rekomendasi\s+pemupukan/i.test(adminText_(values[5]))) return null;
  const company = adminText_(values[4]);
  if (!company) return null;
  const invoice = adminText_(values[14]);
  const journal = adminText_(values[30]) || adminText_(values[11]);
  const sourceKey = invoice || journal || ('RP-PENAGIHAN-ROW-' + rowNumber);
  const safeKey = sourceKey.replace(/[^A-Za-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 100);
  const invoiceDate = recommendationDate_(values[15], false);
  const due = recommendationDate_(values[16], true);
  const paymentDate = recommendationDate_(values[24], false);
  const invoiceValue = recommendationMoney_(values[20]) || recommendationMoney_(values[17]) + recommendationMoney_(values[19]);
  const contractValue = recommendationMoney_(values[21]) || invoiceValue;
  let paid = recommendationMoney_(values[22]) + recommendationMoney_(values[23]);
  if (paymentDate && !paid) paid = invoiceValue;
  const sourceYear = (String(sourceName || '').match(/20\d{2}/) || [String(new Date().getFullYear())])[0];
  const year = Number((invoiceDate || sourceYear).slice(0, 4));
  return {
    sourceKey: sourceKey,
    activityId: 'RP-BILL-' + safeKey,
    billingId: 'BILL-RP-' + safeKey,
    company: company,
    companyType: adminText_(values[3]),
    activity: adminText_(values[7]) || 'Rekomendasi Pemupukan',
    area: adminText_(values[6]),
    billingType: adminText_(values[8]),
    billingPercent: recommendationMoney_(values[9]),
    billingLetter: adminText_(values[10]),
    npwp: adminText_(values[12]),
    address: adminText_(values[13]),
    invoice: invoice,
    invoiceDate: invoiceDate,
    due: due,
    invoiceValue: invoiceValue,
    contractValue: contractValue,
    paid: paid,
    paymentDate: paymentDate,
    journal: journal,
    year: year,
    note: ['SOURCE_SYNC=RP/REKAPITULASI', adminText_(values[25]), adminText_(values[26]), adminText_(values[27]), adminText_(values[34])].filter(Boolean).join(' | '),
  };
}

function syncRekomendasiBillingSourceNow_(source, sheet, options) {
  const lastRow = Math.min(Math.max(sheet.getLastRow(), 6), 10000);
  const records = lastRow < 7 ? [] : sheet.getRange(7, 1, lastRow - 6, Math.min(sheet.getLastColumn(), 36)).getDisplayValues().map(function (values, index) {
    return recommendationBillingRecord_(values, index + 7, source.getName());
  }).filter(Boolean);
  let insertedActivities = 0;
  let updatedActivities = 0;
  let insertedBilling = 0;
  let updatedBilling = 0;
  let companiesCreated = 0;
  const errors = [];
  const transaction = withWriteTransaction_({
    actor: currentUser_(),
    action: 'sync_rp_source',
    tableName: 'MULTI',
    recordId: source.getId(),
    reason: 'Sinkronisasi Rekapitulasi Penagihan Rekomendasi Pemupukan',
  }, function (master) {
    const companiesTable = recommendationMemoryTable_(master.getSheetByName('MASTER_PERUSAHAAN'), 'company_id');
    const activitiesTable = recommendationMemoryTable_(master.getSheetByName('KEGIATAN'), 'activity_id');
    const billingTable = recommendationMemoryTable_(master.getSheetByName('PENAGIHAN'), 'billing_id');
    const companies = {};
    let nextCompanyNumber = 1;
    companiesTable.rows.forEach(function (values) {
      const row = {};
      companiesTable.headers.forEach(function (header, index) { row[header] = values[index]; });
      if (row.archived_at) return;
      companies[adminText_(row.nama).toLowerCase().replace(/\s+/g, ' ')] = row.company_id;
      const match = String(row.company_id || '').match(/^PRSH-(\d+)$/);
      if (match) nextCompanyNumber = Math.max(nextCompanyNumber, Number(match[1]) + 1);
    });
    records.forEach(function (record) {
      try {
        const companyKey = record.company.toLowerCase().replace(/\s+/g, ' ');
        let companyId = companies[companyKey];
        if (!companyId) {
          companyId = 'PRSH-' + String(nextCompanyNumber).padStart(4, '0');
          nextCompanyNumber += 1;
          companiesTable.upsert(companyId, {
            company_id: companyId,
            nama: record.company,
            nama_singkat: record.company,
            jenis_instansi: record.companyType,
            alamat: record.address,
            status_aktif: 'YA',
            catatan: ['SOURCE_SYNC=RP/REKAPITULASI', record.npwp ? 'NPWP=' + record.npwp : ''].filter(Boolean).join(' | '),
            created_at: nowIso_(),
            updated_at: nowIso_(),
            archived_at: '',
          });
          companies[companyKey] = companyId;
          companiesCreated += 1;
        }
        const activityResult = activitiesTable.upsert(record.activityId, {
          activity_id: record.activityId,
          display_id: record.sourceKey,
          company_id: companyId,
          perusahaan: record.company,
          subbagian: 'RPJID',
          kategori: 'RP',
          instansi: record.companyType,
          jenis_kegiatan: record.activity,
          status_biaya: record.billingType,
          kebun_lokasi: record.area,
          tahun: record.year,
          tanggal_surat_masuk: record.invoiceDate,
          no_surat_masuk: record.billingLetter,
          tanggal_mulai: record.invoiceDate,
          nilai_kontrak: record.contractValue,
          pic: 'Administrasi UPJKP',
          status: record.paymentDate || (record.paid && record.paid >= record.invoiceValue * 0.99) ? 'SELESAI' : 'AKTIF',
          catatan: record.note,
          created_at: nowIso_(),
          updated_at: nowIso_(),
          archived_at: '',
        });
        if (activityResult === 'inserted') insertedActivities += 1;
        else updatedActivities += 1;
        const billingResult = billingTable.upsert(record.billingId, {
          billing_id: record.billingId,
          company_id: companyId,
          perusahaan: record.company,
          kebun: record.area,
          source_type: 'KEGIATAN',
          source_id: record.activityId,
          nilai: record.invoiceValue,
          tanggal_siap_tagih: record.invoiceDate,
          nomor_invoice: record.invoice,
          tanggal_invoice: record.invoiceDate,
          jatuh_tempo: record.due,
          status: record.paymentDate || (record.paid && record.paid >= record.invoiceValue * 0.99) ? 'LUNAS' : 'TERBIT',
          total_pembayaran: record.paid,
          tanggal_pembayaran: record.paymentDate,
          nomor_jurnal: record.journal,
          pic: 'Administrasi UPJKP',
          catatan: [record.note, record.billingPercent ? 'PERSENTASE=' + record.billingPercent + '%' : ''].filter(Boolean).join(' | '),
          created_at: nowIso_(),
          updated_at: nowIso_(),
          archived_at: '',
        });
        if (billingResult === 'inserted') insertedBilling += 1;
        else updatedBilling += 1;
      } catch (error) {
        errors.push(record.sourceKey + ': ' + error.message);
      }
    });
    companiesTable.flush();
    activitiesTable.flush();
    billingTable.flush();
  }, { skipBackup: Boolean(options.automatic) });
  return success_({
    sourceSpreadsheetId: source.getId(),
    sourceUrl: source.getUrl(),
    sourceLayout: 'REKAPITULASI_PENAGIHAN',
    rowsRead: records.length,
    insertedActivities: insertedActivities,
    updatedActivities: updatedActivities,
    insertedReports: 0,
    updatedReports: 0,
    insertedBilling: insertedBilling,
    updatedBilling: updatedBilling,
    historyRows: 0,
    teamRows: 0,
    companiesCreated: companiesCreated,
    legacyReportsArchived: 0,
    errors: errors.slice(0, 20),
    backupId: transaction.backupId,
    message: records.length + ' baris penagihan Rekomendasi Pemupukan disinkronkan (' + insertedBilling + ' baru, ' + updatedBilling + ' diperbarui).',
  });
}

function recommendationYear_(record) {
  const date = record.incoming || record.start || record.end;
  if (date) return Number(String(date).slice(0, 4));
  return Number(Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyy'));
}

function recommendationActivityRecord_(values, rowNumber) {
  if (adminText_(values[0]).toUpperCase() !== 'RP') return null;
  const company = adminText_(values[6]);
  if (!company) return null;
  const sourceKey = adminText_(values[3]) || ('RP-ROW-' + rowNumber);
  const activityId = 'ADM-SRC-' + sourceKey.replace(/[^A-Za-z0-9_-]/g, '-');
  const incoming = sourceDate_(values[8]);
  const start = sourceDate_(values[32]);
  const end = sourceDate_(values[33]);
  const sent = sourceDate_(values[20]);
  const record = {
    sourceKey: sourceKey,
    activityId: activityId,
    reportId: 'LAP-' + activityId,
    company: company,
    region: adminText_(values[1]),
    kind: adminText_(values[10]) || adminText_(values[9]) || 'Rekomendasi Pemupukan',
    location: adminText_(values[31]),
    pic: adminText_(values[35]) || adminText_(values[37]),
    incoming: incoming,
    start: start,
    end: end,
    sent: sent,
    statusBiaya: adminText_(values[4]),
    noIncoming: adminText_(values[7]),
    noSpk: adminText_(values[25]),
    spkDate: sourceDate_(values[26]),
    value: number_(values[30]) || number_(values[28]),
    invoice: adminText_(values[42]) || adminText_(values[38]) || adminText_(values[22]),
    invoiceDate: sourceDate_(values[43]),
    due: sourceDate_(values[45]) || sourceDate_(values[39]),
    journal: adminText_(values[46]) || adminText_(values[40]),
    note: ['SOURCE_SYNC=RP', adminText_(values[9]), adminText_(values[24]), adminText_(values[47])].filter(Boolean).join(' | '),
  };
  record.year = recommendationYear_(record);
  return record;
}

function recommendationReportRecord_(record, values) {
  values = values || [];
  const draft = sourceDate_(values[6]);
  const sent = sourceDate_(values[30]) || record.sent;
  const net = sourceDate_(values[29]);
  const stages = [
    { code: 'DRAFT', order: 1, person: adminText_(values[7]), incoming: draft, outgoing: '' },
    { code: 'KOREKTOR 1', order: 2, person: adminText_(values[8]), incoming: sourceDate_(values[9]), outgoing: sourceDate_(values[10]) },
    { code: 'KOREKTOR 2', order: 3, person: adminText_(values[12]), incoming: sourceDate_(values[13]), outgoing: sourceDate_(values[14]) },
    { code: 'PERBAIKAN', order: 4, person: '', incoming: sourceDate_(values[16]), outgoing: sourceDate_(values[17]) },
    { code: 'CETAK 1', order: 5, person: adminText_(values[19]), incoming: sourceDate_(values[20]), outgoing: sourceDate_(values[21]) },
    { code: 'KOREKSI FINAL', order: 6, person: adminText_(values[22]), incoming: sourceDate_(values[23]), outgoing: sourceDate_(values[24]) },
    { code: 'PERBAIKAN FINAL', order: 7, person: '', incoming: sourceDate_(values[26]), outgoing: sourceDate_(values[27]) },
    { code: 'CETAK FINAL', order: 8, person: '', incoming: sourceDate_(values[28]), outgoing: net },
    { code: 'PENGIRIMAN', order: 9, person: '', incoming: sent, outgoing: sent },
  ];
  let latest = null;
  stages.forEach(function (stage) {
    const date = stage.outgoing || stage.incoming;
    if (date) latest = { code: stage.code, date: date, person: stage.person };
  });
  return {
    report: {
      report_id: record.reportId,
      activity_id: record.activityId,
      perusahaan: record.company,
      regional: record.region,
      kebun: record.location,
      nama_kegiatan: record.kind,
      tahun: record.year,
      workflow: 'RP',
      tanggal_draft_masuk: draft,
      checkpoint_terakhir: latest ? latest.code : '',
      korektor_terakhir: latest ? latest.person : '',
      tanggal_checkpoint: latest ? latest.date : '',
      tanggal_revisi: sourceDate_(values[27]) || sourceDate_(values[24]),
      tanggal_cetak: net || sourceDate_(values[21]),
      tanggal_kirim: sent,
      tanggal_net: net,
      status: net || sent ? 'NET' : (draft ? 'PROSES' : 'DRAFT'),
      pic: adminText_(values[7]) || record.pic,
      catatan: 'SOURCE_SYNC=RP/LAPORAN | SOURCE_ID=' + record.sourceKey,
      created_at: nowIso_(),
      updated_at: nowIso_(),
      archived_at: '',
    },
    stages: stages,
  };
}

function recommendationTeam_(values) {
  if (!values) return [];
  const people = [];
  const seen = {};
  function add(name, role) {
    name = adminText_(name);
    if (!name || name === '0') return;
    const key = name.toLowerCase().replace(/\s+/g, ' ');
    if (seen[key]) return;
    seen[key] = true;
    people.push({ name: name, role: role });
  }
  add(values[3] || values[1], 'Leader');
  for (let index = 4; index <= 22; index += 1) add(values[index], 'Anggota');
  return people;
}

function recommendationMemoryTable_(sheet, idField) {
  const headers = getHeaders_(sheet);
  const idIndex = headers.indexOf(idField);
  const rows = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  const index = {};
  rows.forEach(function (row, rowIndex) {
    const id = String(row[idIndex] === null || row[idIndex] === undefined ? '' : row[idIndex]);
    if (id) index[id] = rowIndex;
  });
  return {
    headers: headers,
    rows: rows,
    get: function (id) {
      const rowIndex = index[String(id)];
      if (rowIndex === undefined) return null;
      const record = {};
      headers.forEach(function (header, columnIndex) { record[header] = rows[rowIndex][columnIndex]; });
      return record;
    },
    upsert: function (id, mapped) {
      const key = String(id);
      let rowIndex = index[key];
      const inserted = rowIndex === undefined;
      if (inserted) {
        rowIndex = rows.length;
        index[key] = rowIndex;
        rows.push(headers.map(function () { return ''; }));
      }
      Object.keys(mapped).forEach(function (field) {
        const columnIndex = headers.indexOf(field);
        if (columnIndex >= 0) rows[rowIndex][columnIndex] = mapped[field] === undefined ? '' : mapped[field];
      });
      return inserted ? 'inserted' : 'updated';
    },
    flush: function () {
      if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    },
  };
}

function archiveLegacyRecommendationReport_(table, record) {
  if (record.sourceKey === record.reportId) return false;
  const current = table.get(record.sourceKey);
  if (!current) return false;
  if (String(current.activity_id || '') !== record.activityId && String(current.catatan || '').indexOf('SOURCE_SYNC=ADM/LAPORAN') < 0) return false;
  table.upsert(record.sourceKey, {
    archived_at: nowIso_(),
    updated_at: nowIso_(),
    catatan: [current.catatan, 'MIGRATED_TO=' + record.reportId].filter(Boolean).join(' | '),
  });
  return true;
}

function syncRekomendasiNow(options) {
  options = options || {};
  assertConfigured_();
  const sourceId = options.sourceSpreadsheetId || getRekomendasiSourceId_();
  let source;
  try {
    source = SpreadsheetApp.openById(sourceId);
  } catch (error) {
    throw new Error('Google Sheet sumber Rekomendasi Pemupukan tidak dapat dibuka. Pastikan akun pemilik Apps Script memiliki akses. ' + error.message);
  }
  const activitySheet = source.getSheetByName('Bu Sri & Bu Desii');
  const monitoringSheetCount = recommendationMonitoringSheetNames_().filter(function (sheetName) {
    return Boolean(source.getSheetByName(sheetName));
  }).length;
  if (monitoringSheetCount >= 3) return syncRekomendasiMonitoringNow_(source, options);
  if (!activitySheet) {
    const billingSourceSheet = source.getSheetByName('Rekapitulasi');
    if (billingSourceSheet) return syncRekomendasiBillingSourceNow_(source, billingSourceSheet, options);
    throw new Error('Sheet sumber Rekomendasi Pemupukan tidak ditemukan. Diperlukan Bu Sri & Bu Desii atau Rekapitulasi.');
  }
  const reportSheet = source.getSheetByName('Laporan');
  const teamSheet = source.getSheetByName('Tim');
  const reportIndex = {};
  const teamIndex = {};
  if (reportSheet && reportSheet.getLastRow() > 1) {
    reportSheet.getRange(2, 1, Math.min(reportSheet.getLastRow() - 1, 10000), 32).getValues().forEach(function (values) {
      const id = adminText_(values[0]);
      if (id) reportIndex[id] = values;
    });
  }
  if (teamSheet && teamSheet.getLastRow() > 1) {
    teamSheet.getRange(2, 1, Math.min(teamSheet.getLastRow() - 1, 10000), 26).getDisplayValues().forEach(function (values) {
      const id = adminText_(values[0]);
      if (id) teamIndex[id] = values;
    });
  }
  const lastRow = Math.min(Math.max(activitySheet.getLastRow(), 1), 10000);
  const records = lastRow < 2 ? [] : activitySheet.getRange(2, 1, lastRow - 1, 53).getValues().map(function (values, index) {
    return recommendationActivityRecord_(values, index + 2);
  }).filter(Boolean);
  let insertedActivities = 0;
  let updatedActivities = 0;
  let insertedReports = 0;
  let updatedReports = 0;
  let insertedBilling = 0;
  let updatedBilling = 0;
  let historyRows = 0;
  let teamRows = 0;
  let companiesCreated = 0;
  let legacyReportsArchived = 0;
  const errors = [];
  const transaction = withWriteTransaction_({
    actor: currentUser_(),
    action: 'sync_rp_source',
    tableName: 'MULTI',
    recordId: sourceId,
    reason: 'Sinkronisasi Google Sheet Rekomendasi Pemupukan',
  }, function (master) {
    const companiesTable = recommendationMemoryTable_(master.getSheetByName('MASTER_PERUSAHAAN'), 'company_id');
    const activitiesTable = recommendationMemoryTable_(master.getSheetByName('KEGIATAN'), 'activity_id');
    const reportsTable = recommendationMemoryTable_(master.getSheetByName('MONITORING_LAPORAN'), 'report_id');
    const historyTable = recommendationMemoryTable_(master.getSheetByName('HISTORI_LAPORAN'), 'history_id');
    const billingTable = recommendationMemoryTable_(master.getSheetByName('PENAGIHAN'), 'billing_id');
    const teamTable = recommendationMemoryTable_(master.getSheetByName('TIM_SPJ'), 'team_id');
    const companies = {};
    let nextCompanyNumber = 1;
    companiesTable.rows.forEach(function (values) {
      const row = {};
      companiesTable.headers.forEach(function (header, index) { row[header] = values[index]; });
      if (row.archived_at) return;
      companies[adminText_(row.nama).toLowerCase().replace(/\s+/g, ' ')] = row.company_id;
      const match = String(row.company_id || '').match(/^PRSH-(\d+)$/);
      if (match) nextCompanyNumber = Math.max(nextCompanyNumber, Number(match[1]) + 1);
    });
    records.forEach(function (record) {
      try {
        const companyKey = record.company.toLowerCase().replace(/\s+/g, ' ');
        let companyId = companies[companyKey];
        if (!companyId) {
          companyId = 'PRSH-' + String(nextCompanyNumber).padStart(4, '0');
          nextCompanyNumber += 1;
          companiesTable.upsert(companyId, {
            company_id: companyId,
            nama: record.company,
            nama_singkat: record.company,
            regional: record.region,
            status_aktif: 'YA',
            catatan: 'SOURCE_SYNC=RP',
            created_at: nowIso_(),
            updated_at: nowIso_(),
          });
          companies[companyKey] = companyId;
          companiesCreated += 1;
        }
        const activityResult = activitiesTable.upsert(record.activityId, {
          activity_id: record.activityId,
          display_id: record.sourceKey,
          company_id: companyId,
          perusahaan: record.company,
          subbagian: 'RPJID',
          kategori: 'RP',
          instansi: record.region,
          jenis_kegiatan: record.kind,
          status_biaya: record.statusBiaya,
          regional: record.region,
          kebun_lokasi: record.location,
          tahun: record.year,
          tanggal_surat_masuk: record.incoming,
          no_surat_masuk: record.noIncoming,
          tanggal_spk: record.spkDate,
          no_spk: record.noSpk,
          tanggal_mulai: record.start,
          tanggal_selesai: record.end,
          nilai_kontrak: record.value,
          pic: record.pic,
          status: record.sent ? 'SELESAI' : 'AKTIF',
          catatan: record.note,
          created_at: nowIso_(),
          updated_at: nowIso_(),
          archived_at: '',
        });
        if (activityResult === 'inserted') insertedActivities += 1;
        else updatedActivities += 1;
        const reportData = recommendationReportRecord_(record, reportIndex[record.sourceKey]);
        reportData.report.company_id = companyId;
        const reportResult = reportsTable.upsert(record.reportId, reportData.report);
        if (reportResult === 'inserted') insertedReports += 1;
        else updatedReports += 1;
        reportData.stages.forEach(function (stage) {
          if (!stage.incoming && !stage.outgoing) return;
          const historyId = record.reportId + '-' + stage.code.replace(/\s+/g, '-');
          historyTable.upsert(historyId, {
            history_id: historyId,
            report_id: record.reportId,
            checkpoint: stage.code,
            urutan: stage.order,
            korektor: stage.person,
            tanggal_masuk: stage.incoming,
            tanggal_selesai: stage.outgoing,
            catatan: 'SOURCE_SYNC=RP/LAPORAN',
            created_at: nowIso_(),
            created_by: currentUser_(),
          });
          historyRows += 1;
        });
        recommendationTeam_(teamIndex[record.sourceKey]).forEach(function (person, index) {
          const teamId = 'TEAM-' + record.activityId + '-' + (index + 1);
          teamTable.upsert(teamId, {
            team_id: teamId,
            activity_id: record.activityId,
            nama: person.name,
            peran: person.role,
            hk: 0,
            nominal_hk: 0,
            total_spj: 0,
            panjar: 0,
            realisasi_panjar: 0,
            catatan: 'SOURCE_SYNC=RP/TIM',
            created_at: nowIso_(),
            updated_at: nowIso_(),
          });
          teamRows += 1;
        });
        if (record.value || record.invoice || record.invoiceDate) {
          const billingResult = billingTable.upsert('BILL-' + record.activityId, {
            billing_id: 'BILL-' + record.activityId,
            company_id: companyId,
            perusahaan: record.company,
            kebun: record.location,
            source_type: 'KEGIATAN',
            source_id: record.activityId,
            nilai: record.value,
            nomor_invoice: record.invoice,
            tanggal_invoice: record.invoiceDate,
            jatuh_tempo: record.due,
            status: record.invoice ? 'TERBIT' : 'DRAFT',
            nomor_jurnal: record.journal,
            pic: record.pic,
            catatan: 'SOURCE_SYNC=RP',
            created_at: nowIso_(),
            updated_at: nowIso_(),
            archived_at: '',
          });
          if (billingResult === 'inserted') insertedBilling += 1;
          else updatedBilling += 1;
        }
        if (archiveLegacyRecommendationReport_(reportsTable, record)) legacyReportsArchived += 1;
      } catch (error) {
        errors.push(record.sourceKey + ': ' + error.message);
      }
    });
    companiesTable.flush();
    activitiesTable.flush();
    reportsTable.flush();
    historyTable.flush();
    billingTable.flush();
    teamTable.flush();
  }, { skipBackup: Boolean(options.automatic) });
  return success_({
    sourceSpreadsheetId: sourceId,
    sourceUrl: source.getUrl(),
    rowsRead: records.length,
    insertedActivities: insertedActivities,
    updatedActivities: updatedActivities,
    insertedReports: insertedReports,
    updatedReports: updatedReports,
    insertedBilling: insertedBilling,
    updatedBilling: updatedBilling,
    historyRows: historyRows,
    teamRows: teamRows,
    companiesCreated: companiesCreated,
    legacyReportsArchived: legacyReportsArchived,
    errors: errors.slice(0, 20),
    backupId: transaction.backupId,
    message: records.length + ' kegiatan Rekomendasi Pemupukan disinkronkan (' + insertedReports + ' laporan baru, ' + updatedReports + ' diperbarui).',
  });
}

function syncRekomendasi() {
  return syncRekomendasiNow({ automatic: false });
}

function syncRekomendasiFromEdit() {
  return syncRekomendasiNow({ automatic: true });
}

function ensureRekomendasiSourceInitialized_() {
  const properties = getProperties_();
  if (properties.getProperty('UPJKP_RP_SYNC_SCHEMA_VERSION') === RP_SYNC_SCHEMA_VERSION) return null;
  properties.setProperty('UPJKP_RP_SOURCE_ID', RP_SOURCE_DEFAULT_ID);
  const result = syncRekomendasiNow({ automatic: false, sourceSpreadsheetId: RP_SOURCE_DEFAULT_ID });
  saveRekomendasiSyncStatus_(properties, result);
  return result;
}

function saveRekomendasiSyncStatus_(properties, result) {
  properties.setProperties({
    UPJKP_RP_SYNC_SCHEMA_VERSION: RP_SYNC_SCHEMA_VERSION,
    UPJKP_RP_LAST_SYNC_AT: nowIso_(),
    UPJKP_RP_LAST_SYNC_SUMMARY: JSON.stringify({
      rowsRead: result.data.rowsRead,
      insertedActivities: result.data.insertedActivities,
      updatedActivities: result.data.updatedActivities,
      insertedReports: result.data.insertedReports,
      updatedReports: result.data.updatedReports,
      insertedBilling: result.data.insertedBilling,
      updatedBilling: result.data.updatedBilling,
      sourceLayout: result.data.sourceLayout || 'OPERASIONAL',
      legacyReportsArchived: result.data.legacyReportsArchived,
      errors: result.data.errors.length,
    }),
    UPJKP_RP_LAST_ERROR: '',
  });
}

function getRekomendasiSyncStatus() {
  assertConfigured_();
  const properties = getProperties_();
  const activities = getRows_('KEGIATAN', false).filter(function (row) {
    return String(row.kategori || '').toUpperCase() === 'RP';
  });
  const activityIds = {};
  activities.forEach(function (row) { activityIds[String(row.activity_id)] = true; });
  const allReports = getRows_('MONITORING_LAPORAN', true);
  const reports = allReports.filter(function (row) {
    return !row.archived_at && String(row.workflow || '').toUpperCase() === 'RP' && activityIds[String(row.activity_id)];
  });
  const teams = getRows_('TIM_SPJ', false).filter(function (row) {
    return activityIds[String(row.activity_id)];
  });
  const billings = getRows_('PENAGIHAN', false).filter(function (row) {
    return activityIds[String(row.source_id)] || String(row.catatan || '').indexOf('SOURCE_SYNC=RP/') >= 0;
  });
  let summary = {};
  try { summary = JSON.parse(properties.getProperty('UPJKP_RP_LAST_SYNC_SUMMARY') || '{}'); }
  catch (error) { summary = {}; }
  return success_({
    connected: properties.getProperty('UPJKP_RP_SYNC_SCHEMA_VERSION') === RP_SYNC_SCHEMA_VERSION,
    sourceSpreadsheetId: getRekomendasiSourceId_(),
    lastSyncAt: properties.getProperty('UPJKP_RP_LAST_SYNC_AT') || '',
    sourceRows: Number(summary.rowsRead || 0),
    activities: activities.length,
    reports: reports.length,
    teams: teams.length,
    billings: billings.length,
    sourceLayout: summary.sourceLayout || '',
    archivedLegacyReports: allReports.filter(function (row) {
      return Boolean(row.archived_at) && String(row.catatan || '').indexOf('MIGRATED_TO=') >= 0;
    }).length,
    errors: Number(summary.errors || 0),
    lastError: properties.getProperty('UPJKP_RP_LAST_ERROR') || '',
    monitoringSourceSpreadsheetId: properties.getProperty('UPJKP_RP_MONITORING_SOURCE_ID') || '',
    importProgress: properties.getProperty('UPJKP_RP_IMPORT_PROGRESS') || '',
    importError: properties.getProperty('UPJKP_RP_IMPORT_LAST_ERROR') || '',
  });
}

function connectRekomendasiSource() {
  const properties = getProperties_();
  const sourceId = getRekomendasiSourceId_();
  properties.setProperty('UPJKP_RP_SOURCE_ID', sourceId);
  const result = syncRekomendasiNow({ automatic: false, sourceSpreadsheetId: sourceId });
  try {
    let sourceTriggerExists = false;
    ScriptApp.getProjectTriggers().forEach(function (trigger) {
      if (trigger.getHandlerFunction() !== 'syncRekomendasiFromEdit') return;
      let triggerSourceId = '';
      try { triggerSourceId = trigger.getTriggerSourceId(); }
      catch (error) { triggerSourceId = ''; }
      if (triggerSourceId === sourceId) sourceTriggerExists = true;
      else ScriptApp.deleteTrigger(trigger);
    });
    if (!sourceTriggerExists) ScriptApp.newTrigger('syncRekomendasiFromEdit').forSpreadsheet(sourceId).onEdit().create();
  } catch (error) {
    result.data.triggerWarning = 'Sinkronisasi selesai, tetapi trigger perubahan belum dibuat: ' + error.message;
  }
  saveRekomendasiSyncStatus_(properties, result);
  return result;
}
