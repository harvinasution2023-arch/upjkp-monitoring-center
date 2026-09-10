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
  // Data lama sering tidak memiliki tanggal NET. Jika sudah mencapai
  // Korektor Final/Pengiriman, perlakukan sebagai selesai; input baru dapat
  // mengisi tanggal NET secara eksplisit melalui formulir kegiatan.
  const legacyCompleted = checkpoint === 'KOREKTOR FINAL' || checkpoint === 'PENGIRIMAN';
  const completed = Boolean(net || sent || checkpoint === 'NET' || checkpoint === 'NET / RP27' || legacyCompleted);
  let status = 'BELUM DIMULAI';
  if (completed) status = 'SELESAI';
  else if (checkpoint) status = checkpoint;
  else if (printed) status = 'DICETAK';
  else if (revised) status = 'DIREVISI';
  else if (draft) status = 'DRAFT MASUK';

  const deadline = draft ? new Date(draft.getTime() + 30 * 86400000) : null;
  const stopDate = net || sent || today;
  const elapsed = draft ? Math.max(0, daysBetween_(draft, stopDate)) : 0;
  const remaining = deadline && !completed ? daysBetween_(today, deadline) : null;
  let deadlineStatus = 'BELUM DIMULAI';
  if (completed) deadlineStatus = 'SELESAI';
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
  const netReportIds = reports.filter(function (row) { return Boolean(row.tanggal_net) || String(row.checkpoint_terakhir || '').toUpperCase() === 'NET' || row.status_hitung === 'NET / RP27'; }).map(function (row) { return String(row.report_id); });
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

function correspondenceSlot_(letter) {
  const type = String(letter.jenis_surat || '').toUpperCase();
  if (type.indexOf('TUGAS') >= 0) return 'assignment';
  if (type.indexOf('KUNJUNGAN') >= 0) return 'visit';
  if (type.indexOf('MASUK') >= 0) return 'incoming';
  if (type.indexOf('KELUAR') >= 0 || type.indexOf('BALASAN') >= 0) return 'outgoing';
  if (type.indexOf('LAPORAN') >= 0) return 'report';
  return '';
}

function correspondenceByActivity_() {
  const byActivity = {};
  getRows_('KORESPONDENSI', false).forEach(function (letter) {
    const key = String(letter.activity_id || '');
    if (!key) return;
    if (!byActivity[key]) byActivity[key] = { incoming: null, outgoing: null, visit: null, assignment: null, report: null };
    const slot = correspondenceSlot_(letter);
    if (!slot) return;
    const current = byActivity[key][slot];
    if (!current || String(letter.tanggal || letter.updated_at || '') >= String(current.tanggal || current.updated_at || '')) byActivity[key][slot] = letter;
  });
  return byActivity;
}

function moduleFilterMatches_(row, filters, moduleName) {
  return Object.keys(filters).every(function (key) {
    const expected = String(filters[key] || '').toLowerCase();
    if (!expected) return true;
    if (moduleName === 'reports' && key === 'workflow' && String(row.subbagian || '').toUpperCase() === 'BT') {
      const workflow = String(row.workflow || '').toUpperCase();
      return ['BT', 'UMUM', ''].indexOf(workflow) >= 0 && ['bt', 'umum'].indexOf(expected) >= 0;
    }
    return String(row[key] || '').toLowerCase() === expected;
  });
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
  if (moduleName === 'activities') {
    const lettersByActivity = correspondenceByActivity_();
    const reportsByActivity = activityReportMap_();
    rows = rows.map(function (row) {
      return Object.assign({}, row, activityCompleteness_(row, lettersByActivity, reportsByActivity[String(row.activity_id)] || null));
    });
  }
  if (moduleName === 'training') rows = rows.map(function (row) { return Object.assign({}, row, trainingCompleteness_(row)); });
  if (moduleName === 'reports') {
    const activityMap = {};
    const lettersByActivity = correspondenceByActivity_();
    getRows_('KEGIATAN', false).forEach(function (activity) { activityMap[String(activity.activity_id)] = activity; });
    rows = rows.map(function (row) {
      const activity = activityMap[String(row.activity_id)] || {};
      const letters = lettersByActivity[String(row.activity_id)] || {};
      const incoming = letters.incoming || {}, outgoing = letters.outgoing || {}, visit = letters.visit || {}, assignment = letters.assignment || {};
      const displayId = activity.display_id || activity.activity_id || row.activity_id || row.report_id || '';
      return Object.assign({}, reportProgress_(row), {
        display_id: displayId,
        activity_display_id: displayId,
        subbagian: activity.subbagian || CATEGORY_TO_SUBBAGIAN[activity.kategori] || '',
        kategori: activity.kategori || '',
        no_surat_masuk: incoming.nomor_surat || activity.no_surat_masuk || '',
        tanggal_surat_masuk: incoming.tanggal || activity.tanggal_surat_masuk || '',
        no_surat_keluar: outgoing.nomor_surat || '',
        tanggal_surat_keluar: outgoing.tanggal || '',
        no_surat_kunjungan: visit.nomor_surat || '',
        tanggal_surat_kunjungan: visit.tanggal || '',
        no_surat_tugas: assignment.nomor_surat || activity.no_spk || '',
        tanggal_surat_tugas: assignment.tanggal || activity.tanggal_spk || '',
      });
    });
  }
  if (moduleName === 'billing') rows = rows.map(billingProgress_);
  if (moduleName === 'products') rows = stockProducts_(rows, getRows_('STOK_JID', false));
  const query = String(options.query || '').trim().toLowerCase();
  const filters = options.filters || {};
  rows = rows.filter(function (row) {
    if (query) {
      const text = Object.keys(row).map(function (key) { return String(row[key]); }).join(' ').toLowerCase();
      if (text.indexOf(query) < 0) return false;
    }
    return moduleFilterMatches_(row, filters, moduleName);
  });
  const pageSize = Math.min(200, Math.max(1, Number(options.pageSize || 100)));
  const page = Math.max(1, Number(options.page || 1));
  const start = (page - 1) * pageSize;
  return success_({ items: rows.slice(start, start + pageSize), total: rows.length, page: page, pages: Math.max(1, Math.ceil(rows.length / pageSize)) });
}

function isAdministrativeOperationalActivity_(activity) {
  const subsection = String(activity.subbagian || CATEGORY_TO_SUBBAGIAN[activity.kategori] || '').toUpperCase();
  const category = String(activity.kategori || '').toUpperCase();
  return (subsection === 'RPJID' && category === 'RP') || subsection === 'BT' || (subsection === 'PLT' && category === 'TR');
}

function getAdministrativeMonitoring(options) {
  assertConfigured_();
  options = options || {};
  const selectedSubsection = String(options.subbagian || '').toUpperCase();
  const selectedCategory = String(options.kategori || '').toUpperCase();
  const selectedYear = Number(options.tahun || 0);
  const query = String(options.query || '').trim().toLowerCase();
  const activities = getRows_('KEGIATAN', false).filter(function (activity) {
    const subsection = String(activity.subbagian || CATEGORY_TO_SUBBAGIAN[activity.kategori] || '').toUpperCase();
    const category = String(activity.kategori || '').toUpperCase();
    if (!isAdministrativeOperationalActivity_(activity)) return false;
    if (selectedSubsection && subsection !== selectedSubsection) return false;
    if (selectedCategory && category !== selectedCategory) return false;
    if (selectedYear && yearOf_(activity, ['tanggal_surat_masuk', 'tanggal_mulai', 'created_at']) !== selectedYear) return false;
    return true;
  });

  const reportsByActivity = {};
  getRows_('MONITORING_LAPORAN', false).map(reportProgress_).forEach(function (report) {
    const key = String(report.activity_id || '');
    if (!key) return;
    const current = reportsByActivity[key];
    if (!current || String(report.updated_at || report.created_at || '') > String(current.updated_at || current.created_at || '')) reportsByActivity[key] = report;
  });

  const correspondenceByActivity = correspondenceByActivity_();

  const peopleByActivity = {};
  getRows_('TIM_SPJ', false).forEach(function (person) {
    const activityId = String(person.activity_id || ''), name = String(person.nama || '').trim();
    if (!activityId || !name) return;
    if (!peopleByActivity[activityId]) peopleByActivity[activityId] = { leader: [], workers: [], seen: {} };
    const group = peopleByActivity[activityId], nameKey = name.toLowerCase().replace(/\s+/g, ' '), leader = String(person.peran || '').toUpperCase().indexOf('LEADER') >= 0;
    if (group.seen[nameKey] !== undefined) {
      if (leader && group.seen[nameKey] !== 'leader') {
        group.workers = group.workers.filter(function (worker) { return worker.toLowerCase().replace(/\s+/g, ' ') !== nameKey; });
        group.leader.push(name);
        group.seen[nameKey] = 'leader';
      }
      return;
    }
    if (leader) group.leader.push(name); else group.workers.push(name);
    group.seen[nameKey] = leader ? 'leader' : 'worker';
  });

  let items = activities.map(function (activity) {
    const activityId = String(activity.activity_id), report = reportsByActivity[activityId] || {};
    const letters = correspondenceByActivity[activityId] || {}, incoming = letters.incoming || {}, outgoing = letters.outgoing || {}, visit = letters.visit || {}, assignment = letters.assignment || {};
    const completeness = activityCompleteness_(activity, correspondenceByActivity, report.report_id ? report : null);
    const people = peopleByActivity[activityId] || { leader: [], workers: [] };
    const leader = people.leader.join(', ') || activity.pic || '';
    const workers = people.workers.filter(function (name) { return name.toLowerCase().replace(/\s+/g, ' ') !== String(leader).toLowerCase().replace(/\s+/g, ' '); });
    return Object.assign({}, report, completeness, {
      activity_id: activityId,
      report_id: report.report_id || '',
      display_id: activity.display_id || activityId,
      subbagian: activity.subbagian,
      kategori: activity.kategori,
      perusahaan: activity.perusahaan,
      kebun: activity.kebun_lokasi || report.kebun || '',
      perihal: incoming.perihal || outgoing.perihal || '',
      kegiatan: activity.jenis_kegiatan || report.nama_kegiatan || '',
      nilai_kontrak: activity.nilai_kontrak || 0,
      tahun: activity.tahun || report.tahun || '',
      status_kegiatan: activity.status || '',
      leader: leader,
      petugas: workers.join(', '),
      no_surat_masuk: incoming.nomor_surat || activity.no_surat_masuk || '',
      tanggal_surat_masuk: incoming.tanggal || activity.tanggal_surat_masuk || '',
      no_surat_keluar: outgoing.nomor_surat || '',
      tanggal_surat_keluar: outgoing.tanggal || '',
      perihal_surat_keluar: outgoing.perihal || '',
      no_surat_kunjungan: visit.nomor_surat || '',
      tanggal_surat_kunjungan: visit.tanggal || '',
      no_surat_tugas: assignment.nomor_surat || activity.no_spk || '',
      tanggal_surat_tugas: assignment.tanggal || activity.tanggal_spk || '',
      status_laporan: report.status_hitung || report.status || 'BELUM TERHUBUNG',
      checkpoint_laporan: report.checkpoint_terakhir || '',
    });
  });
  if (query) {
    items = items.filter(function (item) {
      return Object.keys(item).map(function (key) { return String(item[key] || ''); }).join(' ').toLowerCase().indexOf(query) >= 0;
    });
  }
  items.sort(function (left, right) {
    return String(right.tanggal_surat_masuk || right.updated_at || '').localeCompare(String(left.tanggal_surat_masuk || left.updated_at || ''));
  });
  const stats = {
    rp: items.filter(function (item) { return String(item.kategori).toUpperCase() === 'RP'; }).length,
    bt: items.filter(function (item) { return String(item.subbagian).toUpperCase() === 'BT'; }).length,
    tr: items.filter(function (item) { return String(item.subbagian).toUpperCase() === 'PLT' && String(item.kategori).toUpperCase() === 'TR'; }).length,
    incoming: items.filter(function (item) { return Boolean(item.no_surat_masuk || item.tanggal_surat_masuk); }).length,
    outgoing: items.filter(function (item) { return Boolean(item.no_surat_keluar || item.tanggal_surat_keluar); }).length,
    linkedReports: items.filter(function (item) { return Boolean(item.report_id); }).length,
    completedReports: items.filter(function (item) { return ['SELESAI', 'NET / RP27'].indexOf(String(item.status_laporan).toUpperCase()) >= 0; }).length,
  };
  const pageSize = Math.min(1000, Math.max(1, Number(options.pageSize || 200))), page = Math.max(1, Number(options.page || 1)), start = (page - 1) * pageSize;
  return success_({ items: items.slice(start, start + pageSize), total: items.length, page: page, pages: Math.max(1, Math.ceil(items.length / pageSize)), stats: stats });
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
