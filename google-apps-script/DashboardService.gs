function daysBetween_(start, end) {
  const left = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const right = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return Math.floor((right - left) / 86400000);
}

function yearOf_(row, dateFields) {
  if (row.tahun !== '' && row.tahun !== undefined) {
    const numeric = Number(row.tahun);
    if (isFinite(numeric)) return numeric;
  }
  for (let index = 0; index < dateFields.length; index += 1) {
    const parsed = parseDate_(row[dateFields[index]]);
    if (parsed) return Number(Utilities.formatDate(parsed, APP.TIMEZONE, 'yyyy'));
  }
  return null;
}

function reportProgress_(row) {
  const today = parseDate_(todayIso_());
  const draft = parseDate_(row.tanggal_draft_masuk);
  const net = parseDate_(row.tanggal_net);
  const sent = parseDate_(row.tanggal_kirim);
  const printed = parseDate_(row.tanggal_cetak);
  const revised = parseDate_(row.tanggal_revisi);
  const checkpoint = String(row.checkpoint_terakhir || '').toUpperCase();
  let status = 'BELUM DIMULAI';
  if (net) status = 'NET / RP27';
  else if (sent) status = 'SELESAI';
  else if (checkpoint) status = checkpoint;
  else if (printed) status = 'DICETAK';
  else if (revised) status = 'DIREVISI';
  else if (draft) status = 'DRAFT MASUK';

  const deadline = draft ? new Date(draft.getTime() + 30 * 86400000) : null;
  const stopDate = net || sent || today;
  const elapsed = draft ? Math.max(0, daysBetween_(draft, stopDate)) : 0;
  const remaining = deadline && !net && !sent ? daysBetween_(today, deadline) : null;
  let deadlineStatus = 'BELUM DIMULAI';
  if (net || sent) deadlineStatus = 'SELESAI';
  else if (draft && elapsed <= 20) deadlineStatus = 'AMAN';
  else if (draft && elapsed <= 25) deadlineStatus = 'PERHATIAN';
  else if (draft && elapsed <= 29) deadlineStatus = 'SEGERA SELESAIKAN';
  else if (draft) deadlineStatus = 'TERLAMBAT';

  return Object.assign({}, row, {
    status_hitung: status,
    deadline: deadline ? dateIso_(deadline) : '',
    hari_berjalan: elapsed,
    hari_tersisa: remaining,
    persentase_waktu: draft ? Math.min(100, Math.round(elapsed / 30 * 100)) : 0,
    status_deadline: deadlineStatus,
  });
}

function billingProgress_(row) {
  const today = parseDate_(todayIso_());
  const value = number_(row.nilai);
  const paid = number_(row.total_pembayaran);
  const invoice = parseDate_(row.tanggal_invoice);
  const due = parseDate_(row.jatuh_tempo);
  const ready = parseDate_(row.tanggal_siap_tagih);
  let status = 'BELUM SIAP TAGIH';
  if (value > 0 && paid >= value) status = 'LUNAS';
  else if (paid > 0) status = 'BAYAR SEBAGIAN';
  else if (due && due.getTime() < today.getTime()) status = 'JATUH TEMPO';
  else if (invoice) status = 'MENUNGGU PEMBAYARAN';
  else if (ready) status = 'SIAP TAGIH';
  const receivable = Math.max(0, value - paid);
  const age = invoice && receivable ? Math.max(0, daysBetween_(invoice, today)) : 0;
  let aging = '0–30';
  if (age > 90) aging = '>90';
  else if (age > 60) aging = '61–90';
  else if (age > 30) aging = '31–60';
  return Object.assign({}, row, { status_hitung: status, piutang: receivable, umur_piutang: age, aging: aging });
}

function stockProducts_(products, stockRows) {
  const quantities = {};
  stockRows.forEach(function (row) {
    const productId = String(row.product_id || '');
    const mutation = String(row.jenis_mutasi || '').toUpperCase();
    const direction = ['PENJUALAN', 'PENYESUAIAN KELUAR', 'KELUAR'].indexOf(mutation) >= 0 ? -1 : 1;
    quantities[productId] = (quantities[productId] || 0) + direction * number_(row.jumlah);
  });
  return products.map(function (product) {
    const available = quantities[String(product.product_id)] || 0;
    return Object.assign({}, product, {
      stok: available,
      kritis: available <= number_(product.minimum_stok),
    });
  });
}

function buildDashboard_(selectedYear) {
  const spreadsheet = getDatabase_();
  function rows(name) { return rowsFromSheet_(spreadsheet.getSheetByName(name), false); }
  function byYear(items, fields) {
    return items.filter(function (row) { return !selectedYear || yearOf_(row, fields) === selectedYear; });
  }

  const activities = byYear(rows('KEGIATAN'), ['tanggal_surat_masuk', 'tanggal_spk', 'created_at']);
  const reports = byYear(rows('MONITORING_LAPORAN'), ['tanggal_draft_masuk', 'created_at']).map(reportProgress_);
  const billings = byYear(rows('PENAGIHAN'), ['tanggal_invoice', 'tanggal_siap_tagih', 'created_at']).map(billingProgress_);
  const labs = byYear(rows('ANALISIS_LAB'), ['tanggal_sampel_masuk', 'created_at']);
  const trainings = byYear(rows('KEGIATAN_PELATIHAN'), ['tanggal_mulai', 'created_at']);
  const jidTransactions = byYear(rows('TRANSAKSI_JID'), ['tanggal', 'created_at']);
  const rkap = byYear(rows('RKAP'), ['created_at']);
  const notifications = rows('NOTIFIKASI');
  const products = stockProducts_(rows('MASTER_PRODUK_JID'), rows('STOK_JID'));

  const reportDone = reports.filter(function (row) { return ['NET / RP27', 'SELESAI'].indexOf(row.status_hitung) >= 0; }).length;
  const reportLate = reports.filter(function (row) { return row.status_deadline === 'TERLAMBAT'; }).length;
  const reportWarning = reports.filter(function (row) { return ['PERHATIAN', 'SEGERA SELESAIKAN'].indexOf(row.status_deadline) >= 0; }).length;
  const totalRevenue = billings.reduce(function (sum, row) { return sum + number_(row.nilai); }, 0);
  const totalPaid = billings.reduce(function (sum, row) { return sum + number_(row.total_pembayaran); }, 0);
  const receivable = billings.reduce(function (sum, row) { return sum + number_(row.piutang); }, 0);
  const hpp = activities.reduce(function (sum, row) { return sum + number_(row.hpp); }, 0);
  const grossProfit = totalRevenue - hpp;
  const totalRkap = rkap.reduce(function (sum, row) { return sum + number_(row.nilai); }, 0);
  const netReportIds = reports.filter(function (row) { return row.status_hitung === 'NET / RP27'; }).map(function (row) { return String(row.report_id); });
  const billedSources = billings.map(function (row) { return String(row.source_id); });
  const netReady = netReportIds.filter(function (id) { return billedSources.indexOf(id) < 0; }).length;

  const subsectionCounts = { RPJID: 0, BT: 0, PLT: 0, ADM: 0 };
  const subsectionRevenue = { RPJID: 0, BT: 0, PLT: 0, ADM: 0 };
  const subsectionDone = { RPJID: 0, BT: 0, PLT: 0, ADM: 0 };
  const activitySubsection = {};
  activities.forEach(function (row) {
    const code = row.subbagian || CATEGORY_TO_SUBBAGIAN[row.kategori] || 'ADM';
    if (subsectionCounts[code] === undefined) return;
    subsectionCounts[code] += 1;
    subsectionRevenue[code] += number_(row.nilai_kontrak);
    activitySubsection[String(row.activity_id)] = code;
  });
  reports.forEach(function (row) {
    const code = activitySubsection[String(row.activity_id)];
    if (code && ['NET / RP27', 'SELESAI'].indexOf(row.status_hitung) >= 0) subsectionDone[code] += 1;
  });
  const subsections = Object.keys(SUBBAGIAN).map(function (code) {
    const count = subsectionCounts[code];
    const done = subsectionDone[code];
    return {
      code: code, label: SUBBAGIAN[code], count: count, done: done,
      completion: count ? Math.round(done / count * 100) : 0,
      revenue: subsectionRevenue[code],
    };
  });

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthly = monthLabels.map(function (month) { return { month: month, revenue: 0, hpp: 0, rkap: 0 }; });
  billings.forEach(function (row) {
    const parsed = parseDate_(row.tanggal_invoice || row.tanggal_siap_tagih);
    if (parsed) monthly[parsed.getMonth()].revenue += number_(row.nilai);
  });
  activities.forEach(function (row) {
    const parsed = parseDate_(row.tanggal_spk || row.tanggal_surat_masuk);
    if (parsed) monthly[parsed.getMonth()].hpp += number_(row.hpp);
  });
  rkap.forEach(function (row) {
    const index = Number(row.bulan) - 1;
    if (index >= 0 && index < 12) monthly[index].rkap += number_(row.nilai);
  });

  const reportStatus = { draft: 0, process: 0, print1: 0, printNet: 0, net: 0 };
  reports.forEach(function (row) {
    const status = String(row.status_hitung || '').toUpperCase();
    if (status.indexOf('CETAK NET') >= 0) reportStatus.printNet += 1;
    else if (status.indexOf('NET') >= 0 || status === 'SELESAI') reportStatus.net += 1;
    else if (status.indexOf('CETAK') >= 0) reportStatus.print1 += 1;
    else if (status.indexOf('DRAFT') >= 0 || status === 'BELUM DIMULAI') reportStatus.draft += 1;
    else reportStatus.process += 1;
  });

  const regionalMap = {};
  reports.forEach(function (row) {
    const key = String(row.regional || 'Belum ditentukan');
    if (!regionalMap[key]) regionalMap[key] = { regional: key, total: 0, selesai: 0, terlambat: 0 };
    regionalMap[key].total += 1;
    if (['NET / RP27', 'SELESAI'].indexOf(row.status_hitung) >= 0) regionalMap[key].selesai += 1;
    if (row.status_deadline === 'TERLAMBAT') regionalMap[key].terlambat += 1;
  });
  const regional = Object.keys(regionalMap).sort().map(function (key) {
    const item = regionalMap[key];
    item.proses = item.total - item.selesai;
    item.completion = item.total ? Math.round(item.selesai / item.total * 100) : 0;
    return item;
  });

  const attention = [];
  reports.forEach(function (row) {
    if (['TERLAMBAT', 'SEGERA SELESAIKAN', 'PERHATIAN'].indexOf(row.status_deadline) < 0) return;
    attention.push({
      priority: row.status_deadline === 'TERLAMBAT' ? 1 : 2,
      type: 'LAPORAN', title: row.perusahaan || row.nama_kegiatan || 'Laporan',
      detail: (row.kebun || 'Tanpa lokasi') + ' · ' + row.status_deadline + ' · hari ke-' + row.hari_berjalan,
      sourceId: row.report_id, view: row.workflow === 'RP' ? 'reports-rp' : 'reports-bt',
    });
  });
  billings.filter(function (row) { return row.status_hitung === 'JATUH TEMPO'; }).forEach(function (row) {
    attention.push({ priority: 1, type: 'BILLING', title: row.perusahaan || 'Tagihan', detail: 'Jatuh tempo · piutang Rp ' + Math.round(row.piutang), sourceId: row.billing_id, view: 'billing' });
  });
  products.filter(function (row) { return row.kritis; }).forEach(function (row) {
    attention.push({ priority: 2, type: 'STOK', title: row.nama, detail: 'Stok ' + row.stok + ' · minimum ' + number_(row.minimum_stok), sourceId: row.product_id, view: 'jid' });
  });
  attention.sort(function (left, right) { return left.priority - right.priority || String(left.title).localeCompare(String(right.title)); });

  const years = {};
  [activities, reports, billings].forEach(function (items) {
    items.forEach(function (row) {
      const found = yearOf_(row, ['tanggal_surat_masuk', 'tanggal_draft_masuk', 'tanggal_invoice', 'created_at']);
      if (found) years[found] = true;
    });
  });
  years[Number(Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyy'))] = true;

  return {
    year: selectedYear || '',
    years: Object.keys(years).map(Number).sort(function (a, b) { return b - a; }),
    kpis: {
      activities: activities.length, reports: reports.length, reports_process: reports.length - reportDone,
      reports_done: reportDone, reports_warning: reportWarning, reports_late: reportLate,
      net_ready: netReady, completion: reports.length ? Math.round(reportDone / reports.length * 100) : 0,
      revenue: totalRevenue, hpp: hpp, gross_profit: grossProfit,
      margin: totalRevenue ? Math.round(grossProfit / totalRevenue * 1000) / 10 : 0,
      rkap: totalRkap, rkap_achievement: totalRkap ? Math.round(totalRevenue / totalRkap * 1000) / 10 : 0,
      receivable: receivable, paid: totalPaid,
      lab_active: labs.filter(function (row) { return String(row.status).toUpperCase() !== 'SELESAI'; }).length,
      kcd: labs.reduce(function (sum, row) { return sum + number_(row.jumlah_kcd); }, 0),
      training_upcoming: trainings.filter(function (row) { const start = parseDate_(row.tanggal_mulai); return start && start.getTime() >= parseDate_(todayIso_()).getTime(); }).length,
      jid_revenue: jidTransactions.reduce(function (sum, row) { return sum + number_(row.nilai); }, 0),
      critical_stock: products.filter(function (row) { return row.kritis; }).length,
      notifications_unread: notifications.filter(function (row) { return !row.read_at && !row.resolved_at; }).length,
    },
    subsections: subsections, monthly: monthly, regional: regional, attention: attention.slice(0, 12),
    report_status: reportStatus,
    recent_reports: reports.sort(function (a, b) { return String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at)); }).slice(0, 8),
    upcoming_trainings: trainings.filter(function (row) {
      const start = parseDate_(row.tanggal_mulai);
      return start && start.getTime() >= parseDate_(todayIso_()).getTime();
    }).sort(function (a, b) { return String(a.tanggal_mulai).localeCompare(String(b.tanggal_mulai)); }).slice(0, 7),
    sample_data: activities.some(function (row) { return String(row.activity_id).indexOf('DEMO') >= 0; }),
    recent_activities: activities.sort(function (a, b) { return String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at)); }).slice(0, 8),
    products: products,
  };
}

function getModuleData(moduleName, options) {
  assertConfigured_();
  options = options || {};
  const tableMap = {
    activities: 'KEGIATAN', reports: 'MONITORING_LAPORAN', labs: 'ANALISIS_LAB',
    products: 'MASTER_PRODUK_JID', stock: 'STOK_JID', jid: 'TRANSAKSI_JID', billing: 'PENAGIHAN',
    training: 'KEGIATAN_PELATIHAN', experts: 'TENAGA_AHLI', companies: 'MASTER_PERUSAHAAN',
    documents: 'DOKUMEN', notifications: 'NOTIFIKASI', audit: 'AUDIT_LOG', rkap: 'RKAP',
    doses: 'LAMPIRAN_DOSIS', correspondence: 'KORESPONDENSI', team: 'TIM_SPJ',
    souvenirs: 'MASTER_SOUVENIR', souvenirTransactions: 'TRANSAKSI_SOUVENIR',
    expertSchedules: 'JADWAL_TENAGA_AHLI', reportHistory: 'HISTORI_LAPORAN',
  };
  const tableName = tableMap[moduleName];
  if (!tableName) throw new Error('Modul tidak dikenal: ' + moduleName);
  let rows = getRows_(tableName, false);
  if (moduleName === 'reports') rows = rows.map(reportProgress_);
  if (moduleName === 'billing') rows = rows.map(billingProgress_);
  if (moduleName === 'products') rows = stockProducts_(rows, getRows_('STOK_JID', false));
  const query = String(options.query || '').trim().toLowerCase();
  const filters = options.filters || {};
  rows = rows.filter(function (row) {
    if (query) {
      const text = Object.keys(row).map(function (key) { return String(row[key]); }).join(' ').toLowerCase();
      if (text.indexOf(query) < 0) return false;
    }
    return Object.keys(filters).every(function (key) {
      return !filters[key] || String(row[key] || '').toLowerCase() === String(filters[key]).toLowerCase();
    });
  });
  const pageSize = Math.min(200, Math.max(1, Number(options.pageSize || 100)));
  const page = Math.max(1, Number(options.page || 1));
  const start = (page - 1) * pageSize;
  return success_({ items: rows.slice(start, start + pageSize), total: rows.length, page: page, pages: Math.max(1, Math.ceil(rows.length / pageSize)) });
}

function validateData() {
  assertConfigured_();
  const issues = [];
  const tables = ['MASTER_PERUSAHAAN', 'KEGIATAN', 'MONITORING_LAPORAN', 'ANALISIS_LAB', 'MASTER_PRODUK_JID', 'PENAGIHAN'];
  const idFields = ['company_id', 'activity_id', 'report_id', 'lab_id', 'product_id', 'billing_id'];
  tables.forEach(function (table, tableIndex) {
    const seen = {};
    getRows_(table, true).forEach(function (row) {
      const id = String(row[idFields[tableIndex]] || '');
      if (!id) issues.push({ level: 'ERROR', table: table, recordId: '', message: idFields[tableIndex] + ' kosong' });
      else if (seen[id]) issues.push({ level: 'ERROR', table: table, recordId: id, message: 'ID duplikat' });
      seen[id] = true;
      if (table === 'ANALISIS_LAB' && number_(row.jumlah_kcd) < 0) issues.push({ level: 'ERROR', table: table, recordId: id, message: 'Jumlah KCD negatif' });
      if (table === 'MONITORING_LAPORAN' && row.tanggal_net && !row.tanggal_draft_masuk) issues.push({ level: 'ERROR', table: table, recordId: id, message: 'NET tercatat tanpa tanggal draft masuk' });
      if (table === 'PENAGIHAN' && row.tanggal_pembayaran && !row.tanggal_invoice) issues.push({ level: 'ERROR', table: table, recordId: id, message: 'Pembayaran tercatat tanpa invoice' });
    });
  });
  return success_({
    items: issues, total: issues.length,
    errors: issues.filter(function (row) { return row.level === 'ERROR'; }).length,
    warnings: issues.filter(function (row) { return row.level === 'WARNING'; }).length,
  });
}
