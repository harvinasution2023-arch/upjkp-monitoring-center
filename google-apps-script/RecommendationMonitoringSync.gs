const RP_MONITORING_SHEET_CONFIG = Object.freeze({
  'REG I P': { code: 'R1P', company: 'PT Perkebunan Nusantara IV Regional I', region: 'Regional I', layout: 'STANDARD' },
  'REG 1 KSO': { code: 'R1KSO', company: 'PT Perkebunan Nusantara IV Regional I KSO', region: 'Regional I KSO', layout: 'R1KSO' },
  'Reg II P': { code: 'R2P', company: 'PT Perkebunan Nusantara IV Regional II', region: 'Regional II', layout: 'STANDARD' },
  'Reg II KSO': { code: 'R2KSO', company: 'PT Perkebunan Nusantara IV Regional II KSO', region: 'Regional II KSO', layout: 'STANDARD' },
  'Reg III P': { code: 'R3P', company: 'PT Perkebunan Nusantara IV Regional III', region: 'Regional III', layout: 'STANDARD' },
  'Reg IV P': { code: 'R4P', company: 'PT Perkebunan Nusantara IV Regional IV', region: 'Regional IV', layout: 'STANDARD' },
  'Reg V P': { code: 'R5P', company: 'PT Perkebunan Nusantara IV Regional V', region: 'Regional V', layout: 'STANDARD' },
  'REG 6 KSO': { code: 'R6KSO', company: 'PT Perkebunan Nusantara IV Regional VI KSO', region: 'Regional VI KSO', layout: 'R6KSO' },
  'Reg VII': { code: 'R7', company: 'PT Perkebunan Nusantara IV Regional VII', region: 'Regional VII', layout: 'R7' },
  'Swasta': { code: 'SW', company: '', region: 'Swasta', layout: 'PRIVATE' },
});

function recommendationMonitoringSheetNames_() {
  return Object.keys(RP_MONITORING_SHEET_CONFIG);
}

function recommendationVisitDate_(value) {
  const text = adminText_(value).replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const months = {
    jan: 1, januari: 1, feb: 2, februari: 2, pebruari: 2, mar: 3, maret: 3,
    apr: 4, april: 4, mei: 5, jun: 6, juni: 6, jul: 7, juli: 7,
    agu: 8, ags: 8, agustus: 8, sep: 9, september: 9, okt: 10, oktober: 10,
    nov: 11, november: 11, des: 12, desember: 12,
  };
  const match = text.toLowerCase().match(/^(\d{1,2})(?:\s*-\s*\d{1,2})?\s+([a-z]+)\s+(\d{4})$/);
  if (match && months[match[2]]) {
    return match[3] + '-' + String(months[match[2]]).padStart(2, '0') + '-' + String(match[1]).padStart(2, '0');
  }
  return recommendationDate_(value, false);
}

function recommendationMonitoringStage_(code, order, person, incoming, outgoing) {
  return {
    code: code,
    order: order,
    person: adminText_(person),
    incoming: recommendationDate_(incoming, false),
    outgoing: recommendationDate_(outgoing, false),
  };
}

function recommendationMonitoringRecord_(values, sheetName, rowNumber) {
  const config = RP_MONITORING_SHEET_CONFIG[sheetName];
  if (!config) return null;
  const no = adminText_(values[0]);
  if (!no) return null;
  let company = config.company;
  let kebun = adminText_(values[1]);
  let teamText = adminText_(values[2]);
  let visitText = adminText_(values[3]);
  let draftDue = adminText_(values[4]);
  let spkEnd = adminText_(values[5]);
  let sentValue = values[16];
  let locationMissing = false;
  let stages = [];
  if (config.layout === 'STANDARD') {
    stages = [
      recommendationMonitoringStage_('KOREKTOR 1', 1, values[6], values[7], values[8]),
      recommendationMonitoringStage_('KOREKTOR 2', 2, values[9], values[10], values[11]),
      recommendationMonitoringStage_('CETAK 1', 3, values[12], values[13], ''),
      recommendationMonitoringStage_('CETAK FINAL', 4, '', values[14], values[15]),
      recommendationMonitoringStage_('PENGIRIMAN', 5, '', values[16], values[16]),
    ];
  } else if (config.layout === 'R1KSO') {
    stages = [
      recommendationMonitoringStage_('KOREKTOR 1', 1, values[4], values[5], ''),
      recommendationMonitoringStage_('KOREKTOR 2', 2, values[6], values[7], values[8]),
      recommendationMonitoringStage_('VERIFIKASI DRAFT', 3, values[9], values[10], ''),
      recommendationMonitoringStage_('CETAK 1', 4, values[13], values[14], values[15]),
      recommendationMonitoringStage_('VERIFIKASI FINAL', 5, values[16], values[17], ''),
      recommendationMonitoringStage_('CETAK FINAL', 6, '', values[18], values[19]),
      recommendationMonitoringStage_('PENGIRIMAN', 7, '', values[20], values[20]),
    ];
    draftDue = '';
    spkEnd = '';
    sentValue = values[20];
  } else if (config.layout === 'R6KSO') {
    stages = [
      recommendationMonitoringStage_('KOREKTOR 1', 1, values[4], values[5], values[6]),
      recommendationMonitoringStage_('KOREKTOR 2', 2, values[7], values[8], values[9]),
      recommendationMonitoringStage_('VERIFIKASI DRAFT', 3, values[10], values[11], ''),
      recommendationMonitoringStage_('CETAK 1', 4, values[14], values[15], values[16]),
      recommendationMonitoringStage_('VERIFIKASI FINAL', 5, values[17], values[18], ''),
      recommendationMonitoringStage_('CETAK FINAL', 6, '', values[19], values[20]),
      recommendationMonitoringStage_('PENGIRIMAN', 7, '', values[21], values[21]),
    ];
    draftDue = '';
    spkEnd = '';
    sentValue = values[21];
  } else if (config.layout === 'R7') {
    stages = [
      recommendationMonitoringStage_('KOREKTOR 1', 1, values[6], values[7], ''),
      recommendationMonitoringStage_('KOREKTOR 2', 2, values[8], values[9], ''),
      recommendationMonitoringStage_('CETAK 1', 3, values[10], values[11], ''),
      recommendationMonitoringStage_('CETAK FINAL', 4, '', values[12], ''),
      recommendationMonitoringStage_('PENGIRIMAN', 5, '', values[13], values[13]),
    ];
    sentValue = values[13];
  } else if (config.layout === 'PRIVATE') {
    company = adminText_(values[1]);
    kebun = adminText_(values[2]);
    locationMissing = !kebun;
    if (locationMissing) kebun = 'Belum ditentukan';
    teamText = adminText_(values[3]);
    visitText = adminText_(values[4]);
    draftDue = adminText_(values[5]);
    spkEnd = adminText_(values[6]);
    sentValue = values[15];
    stages = [
      recommendationMonitoringStage_('KOREKTOR 1', 1, values[7], values[8], ''),
      recommendationMonitoringStage_('KOREKTOR 2', 2, values[9], values[10], ''),
      recommendationMonitoringStage_('CETAK 1', 3, values[11], values[12], ''),
      recommendationMonitoringStage_('CETAK FINAL', 4, '', values[13], values[14]),
      recommendationMonitoringStage_('PENGIRIMAN', 5, '', values[15], values[15]),
    ];
  }
  if (!company) return null;
  const sourceKey = config.code + '-' + no.replace(/[^A-Za-z0-9]/g, '');
  const visitDate = recommendationVisitDate_(visitText);
  const firstStageDate = stages.reduce(function (found, stage) { return found || stage.incoming || stage.outgoing; }, '');
  const year = Number(String(visitDate || firstStageDate || Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyy')).slice(0, 4));
  const sentDate = recommendationDate_(sentValue, false);
  let latest = null;
  stages.forEach(function (stage) {
    const date = stage.outgoing || stage.incoming;
    if (date) latest = { code: stage.code, date: date, person: stage.person };
  });
  const finalStage = stages.filter(function (stage) { return stage.code === 'CETAK FINAL'; })[0] || {};
  const firstPrint = stages.filter(function (stage) { return stage.code === 'CETAK 1'; })[0] || {};
  const secondReview = stages.filter(function (stage) { return stage.code === 'KOREKTOR 2'; })[0] || {};
  return {
    sourceKey: sourceKey,
    activityId: 'RP-MON-' + sourceKey,
    reportId: 'LAP-RP-MON-' + sourceKey,
    company: company,
    kebun: kebun,
    region: config.region,
    teamText: teamText,
    visitText: visitText,
    visitDate: visitDate,
    draftDue: recommendationDate_(draftDue, false),
    spkEnd: recommendationDate_(spkEnd, false),
    year: year,
    stages: stages,
    latest: latest,
    draft: firstStageDate,
    revised: secondReview.outgoing || secondReview.incoming || '',
    printed: firstPrint.outgoing || firstPrint.incoming || '',
    net: finalStage.outgoing || '',
    sent: sentDate,
    sendMarker: sentDate ? '' : adminText_(sentValue),
    note: ['SOURCE_SYNC=RP/MONITORING', 'SHEET=' + sheetName, locationMissing ? 'LOKASI_BELUM_DIISI' : '', visitText ? 'KUNJUNGAN=' + visitText : '', draftDue ? 'DRAFT_TARGET=' + draftDue : '', spkEnd ? 'SPK_BERAKHIR=' + spkEnd : ''].filter(Boolean).join(' | '),
  };
}

function recommendationMonitoringUniqueRecord_(record, seen, rowNumber) {
  if (!seen[record.sourceKey]) {
    seen[record.sourceKey] = true;
    return record;
  }
  const baseKey = record.sourceKey;
  const locationKey = adminText_(record.kebun).replace(/[^A-Za-z0-9]/g, '').slice(0, 36) || ('ROW' + rowNumber);
  let uniqueKey = baseKey + '-' + locationKey;
  if (seen[uniqueKey]) uniqueKey += '-ROW' + rowNumber;
  record.sourceKey = uniqueKey;
  record.activityId = 'RP-MON-' + uniqueKey;
  record.reportId = 'LAP-RP-MON-' + uniqueKey;
  record.note += ' | NOMOR_SUMBER_GANDA=' + baseKey;
  seen[uniqueKey] = true;
  return record;
}

function recommendationMonitoringTeam_(text) {
  const seen = {};
  return adminText_(text).split(/[,;\n]+/).map(function (name) { return name.trim(); }).filter(function (name) {
    const key = name.toLowerCase().replace(/\s+/g, ' ');
    if (!key || key === '0' || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function syncRekomendasiMonitoringNow_(source, options) {
  const records = [];
  const seenSourceKeys = {};
  const availableSheets = [];
  recommendationMonitoringSheetNames_().forEach(function (sheetName) {
    const sheet = source.getSheetByName(sheetName);
    if (!sheet) return;
    availableSheets.push(sheetName);
    const lastRow = Math.min(Math.max(sheet.getLastRow(), 3), 1000);
    if (lastRow < 4) return;
    const lastColumn = Math.min(Math.max(sheet.getLastColumn(), 18), 32);
    sheet.getRange(4, 1, lastRow - 3, lastColumn).getValues().forEach(function (values, index) {
      const rowNumber = index + 4;
      const record = recommendationMonitoringRecord_(values, sheetName, rowNumber);
      if (record) records.push(recommendationMonitoringUniqueRecord_(record, seenSourceKeys, rowNumber));
    });
  });
  if (!records.length) throw new Error('Tidak ada baris monitoring Rekomendasi Pemupukan yang dapat dipetakan.');
  let insertedActivities = 0;
  let updatedActivities = 0;
  let insertedReports = 0;
  let updatedReports = 0;
  let historyRows = 0;
  let teamRows = 0;
  let companiesCreated = 0;
  let financialActivitiesArchived = 0;
  let obsoleteActivitiesArchived = 0;
  const errors = [];
  const transaction = withWriteTransaction_({
    actor: currentUser_(),
    action: 'sync_rp_monitoring_source',
    tableName: 'MULTI',
    recordId: source.getId(),
    reason: 'Sinkronisasi database monitoring Rekomendasi Pemupukan regional',
  }, function (master) {
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
      companies[adminText_(row.nama).toLowerCase().replace(/\s+/g, ' ')] = row.company_id;
      const match = String(row.company_id || '').match(/^PRSH-(\d+)$/);
      if (match) nextCompanyNumber = Math.max(nextCompanyNumber, Number(match[1]) + 1);
    });
    const liveActivities = {};
    records.forEach(function (record) { liveActivities[record.activityId] = true; });
    activitiesTable.rows.forEach(function (values) {
      const row = {};
      activitiesTable.headers.forEach(function (header, index) { row[header] = values[index]; });
      if (row.archived_at) return;
      const note = String(row.catatan || '');
      if (note.indexOf('SOURCE_SYNC=RP/REKAPITULASI') >= 0) {
        activitiesTable.upsert(row.activity_id, { archived_at: nowIso_(), updated_at: nowIso_() });
        financialActivitiesArchived += 1;
      } else if (note.indexOf('SOURCE_SYNC=RP/MONITORING') >= 0 && !liveActivities[String(row.activity_id)]) {
        activitiesTable.upsert(row.activity_id, { archived_at: nowIso_(), updated_at: nowIso_() });
        obsoleteActivitiesArchived += 1;
      }
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
            jenis_instansi: record.region === 'Swasta' ? 'Swasta' : 'PTPN',
            regional: record.region,
            status_aktif: 'YA',
            catatan: 'SOURCE_SYNC=RP/MONITORING',
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
          instansi: record.region,
          jenis_kegiatan: 'Rekomendasi Pemupukan',
          regional: record.region,
          kebun_lokasi: record.kebun,
          tahun: record.year,
          tanggal_surat_masuk: record.visitDate,
          batas_akhir: record.spkEnd || record.draftDue,
          tanggal_mulai: record.visitDate,
          pic: recommendationMonitoringTeam_(record.teamText)[0] || '',
          status: record.sent || record.net ? 'SELESAI' : 'AKTIF',
          catatan: record.note,
          created_at: nowIso_(),
          updated_at: nowIso_(),
          archived_at: '',
        });
        if (activityResult === 'inserted') insertedActivities += 1;
        else updatedActivities += 1;
        const reportResult = reportsTable.upsert(record.reportId, {
          report_id: record.reportId,
          activity_id: record.activityId,
          company_id: companyId,
          perusahaan: record.company,
          regional: record.region,
          kebun: record.kebun,
          nama_kegiatan: 'Rekomendasi Pemupukan',
          tahun: record.year,
          workflow: 'RP',
          tanggal_draft_masuk: record.draft,
          checkpoint_terakhir: record.latest ? record.latest.code : '',
          korektor_terakhir: record.latest ? record.latest.person : '',
          tanggal_checkpoint: record.latest ? record.latest.date : '',
          tanggal_revisi: record.revised,
          tanggal_cetak: record.printed,
          tanggal_kirim: record.sent,
          tanggal_net: record.net,
          status: record.sent || record.net ? 'NET' : (record.draft ? 'PROSES' : 'DRAFT'),
          pic: recommendationMonitoringTeam_(record.teamText)[0] || '',
          catatan: [record.note, record.sendMarker ? 'KIRIM_MARKER=' + record.sendMarker : ''].filter(Boolean).join(' | '),
          created_at: nowIso_(),
          updated_at: nowIso_(),
          archived_at: '',
        });
        if (reportResult === 'inserted') insertedReports += 1;
        else updatedReports += 1;
        record.stages.forEach(function (stage) {
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
            catatan: 'SOURCE_SYNC=RP/MONITORING',
            created_at: nowIso_(),
            created_by: currentUser_(),
          });
          historyRows += 1;
        });
        recommendationMonitoringTeam_(record.teamText).forEach(function (name, index) {
          const teamId = 'TEAM-' + record.activityId + '-' + (index + 1);
          teamTable.upsert(teamId, {
            team_id: teamId,
            activity_id: record.activityId,
            nama: name,
            peran: index === 0 ? 'Leader' : 'Anggota',
            hk: 0,
            nominal_hk: 0,
            total_spj: 0,
            panjar: 0,
            realisasi_panjar: 0,
            catatan: 'SOURCE_SYNC=RP/MONITORING',
            created_at: nowIso_(),
            updated_at: nowIso_(),
          });
          teamRows += 1;
        });
      } catch (error) {
        errors.push(record.sourceKey + ': ' + error.message);
      }
    });
    reportsTable.rows.forEach(function (values) {
      const row = {};
      reportsTable.headers.forEach(function (header, index) { row[header] = values[index]; });
      if (row.archived_at || String(row.catatan || '').indexOf('SOURCE_SYNC=RP/MONITORING') < 0) return;
      if (!liveActivities[String(row.activity_id)]) reportsTable.upsert(row.report_id, { archived_at: nowIso_(), updated_at: nowIso_() });
    });
    companiesTable.flush();
    activitiesTable.flush();
    reportsTable.flush();
    historyTable.flush();
    teamTable.flush();
  }, { skipBackup: Boolean(options.automatic) });
  return success_({
    sourceSpreadsheetId: source.getId(),
    sourceUrl: source.getUrl(),
    sourceLayout: 'MONITORING_REKOMENDASI_REGIONAL',
    sourceSheets: availableSheets,
    rowsRead: records.length,
    insertedActivities: insertedActivities,
    updatedActivities: updatedActivities,
    insertedReports: insertedReports,
    updatedReports: updatedReports,
    insertedBilling: 0,
    updatedBilling: 0,
    historyRows: historyRows,
    teamRows: teamRows,
    companiesCreated: companiesCreated,
    financialActivitiesArchived: financialActivitiesArchived,
    obsoleteActivitiesArchived: obsoleteActivitiesArchived,
    legacyReportsArchived: 0,
    errors: errors.slice(0, 20),
    backupId: transaction.backupId,
    message: records.length + ' kegiatan monitoring Rekomendasi Pemupukan disinkronkan (' + insertedReports + ' laporan baru, ' + updatedReports + ' diperbarui).',
  });
}
