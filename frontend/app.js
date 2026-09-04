"use strict";

const state = {
  view: location.hash.replace(/^#\/?/, "") || "dashboard",
  year: "",
  search: "",
  health: null,
  dashboard: null,
  loading: false,
};

const main = document.querySelector("#main-content");
const dialog = document.querySelector("#activity-dialog");
const form = document.querySelector("#activity-form");
const drawer = document.querySelector(".notification-drawer");
const backdrop = document.querySelector(".drawer-backdrop");

const viewTitles = {
  dashboard: ["Dashboard", "Ringkasan terpadu seluruh kegiatan UPJKP"],
  rpjid: ["Rekomendasi Pemupukan & JID", "Laporan rekomendasi, laboratorium, lampiran dosis, produk, dan penjualan"],
  bt: ["Bantuan Teknis", "Kegiatan lapangan, regional, tim pelaksana, dan progres laporan"],
  plt: ["Pelatihan", "Agenda pelatihan, peserta, tenaga ahli, dan kebutuhan souvenir"],
  admin: ["Administrasi", "Basis data, surat, dokumen, billing, RKAP, validasi, dan audit"],
  activities: ["Daftar pekerjaan", "Seluruh kegiatan terintegrasi dalam satu basis data"],
  "activities-bt": ["Kegiatan Bantuan Teknis", "Daftar pekerjaan lapangan dan dukungan teknis"],
  "reports-rp": ["Monitoring Laporan Rekomendasi", "Deadline 30 hari, checkpoint koreksi, NET, dan RP27"],
  "reports-bt": ["Monitoring Laporan Bantuan Teknis", "Draft, koreksi, revisi, cetak, dan pengiriman"],
  labs: ["Analisis Laboratorium", "Monitoring sampel daun, tanah, jumlah KCD, dan umur proses"],
  jid: ["JID & Inventory", "Produk, mutasi stok, transaksi, dan pendapatan"],
  training: ["Kegiatan Pelatihan", "Jadwal, peserta, kesiapan, dan kalender kegiatan"],
  experts: ["Tenaga Ahli", "Kompetensi, status aktif, dan ketersediaan personel"],
  billing: ["UPJKP Billing Center", "Tagihan lintas subbagian, pembayaran, dan aging piutang"],
  companies: ["Master Perusahaan", "Satu identitas perusahaan untuk seluruh histori layanan"],
  validation: ["Validasi Data", "Temukan masalah kualitas data sebelum memengaruhi laporan"],
  audit: ["Audit Log", "Riwayat perubahan database yang dapat ditelusuri"],
};

const subsectionMeta = {
  RPJID: { label: "Rekomendasi Pemupukan & JID", className: "rpjid", view: "rpjid", color: "var(--teal)" },
  BT: { label: "Bantuan Teknis", className: "bt", view: "bt", color: "var(--lime)" },
  PLT: { label: "Pelatihan", className: "plt", view: "plt", color: "var(--magenta)" },
  ADM: { label: "Administrasi", className: "adm", view: "admin", color: "var(--amber)" },
};

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" });

function formatMoney(value) {
  return money.format(Number(value || 0));
}

function compactMoney(value) {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (Math.abs(amount) >= 1_000_000) return `Rp ${(amount / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (Math.abs(amount) >= 1_000) return `Rp ${(amount / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
  return formatMoney(amount);
}

function formatDate(value) {
  if (!value) return "·";
  const source = String(value);
  const parsed = new Date(source.length === 10 ? `${source}T00:00:00` : source);
  return Number.isNaN(parsed.getTime()) ? escapeHtml(source) : dateFormatter.format(parsed);
}

function statusClass(value) {
  const status = String(value || "").toUpperCase();
  if (["SELESAI", "LUNAS", "NET / RP27", "AMAN", "AKTIF", "TERVERIFIKASI"].some((item) => status.includes(item))) return "success";
  if (["TERLAMBAT", "JATUH TEMPO", "ERROR", "HABIS"].some((item) => status.includes(item))) return "danger";
  if (["PERHATIAN", "SEGERA", "WARNING", "TERBATAS", "SIAP TAGIH"].some((item) => status.includes(item))) return "warning";
  return "info";
}

function badge(value) {
  return `<span class="badge ${statusClass(value)}">${escapeHtml(value || "Belum diisi")}</span>`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;
  if (!response.ok || (payload && payload.ok === false)) {
    throw new Error(payload?.error || `Permintaan gagal (${response.status})`);
  }
  return payload?.data ?? payload;
}

function toast(message, type = "success") {
  const region = document.querySelector("#toast-region");
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.textContent = message;
  region.append(item);
  setTimeout(() => item.remove(), 3400);
}

function setLoading(message = "Memuat data…") {
  main.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>${escapeHtml(message)}</p></div>`;
}

function pageHead(title, subtitle, actions = "") {
  return `
    <header class="page-head">
      <div><span class="eyebrow">UPJKP MONITORING CENTER</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div>
      <div class="head-actions">${actions}</div>
    </header>`;
}

function emptyState(title, message, action = "") {
  return `<div class="panel empty-state"><div class="empty-visual">◇</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p>${action}</div>`;
}

function updateNav() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    const active = button.dataset.view === state.view;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

function updateNotificationCount(count) {
  const element = document.querySelector("#notification-count");
  element.textContent = count > 99 ? "99+" : String(count || 0);
  element.classList.toggle("hidden", !count);
}

function kpiCard(label, value, note, accent = "var(--teal)", trend = "") {
  return `<article class="kpi-card" style="--accent:${accent}"><div class="kpi-label"><span>${escapeHtml(label)}</span>${trend ? `<span class="trend">${escapeHtml(trend)}</span>` : ""}</div><div class="kpi-value">${escapeHtml(value)}</div><div class="kpi-note">${escapeHtml(note)}</div></article>`;
}

async function loadDashboard(force = false) {
  if (state.dashboard && !force) return state.dashboard;
  const query = state.year ? `?year=${encodeURIComponent(state.year)}` : "";
  state.dashboard = await api(`/api/dashboard${query}`);
  updateNotificationCount(state.dashboard.kpis.notifications_unread);
  return state.dashboard;
}

function dashboardHeader(data) {
  const options = [`<option value="">Semua tahun</option>`, ...data.years.map((year) => `<option value="${year}" ${String(year) === String(state.year) ? "selected" : ""}>${year}</option>`)].join("");
  return pageHead(
    `Dashboard${state.year ? ` ${state.year}` : ""}`,
    "Kinerja operasional dan keuangan empat subbagian dalam satu pandangan.",
    `<select class="select-control" data-action="year" aria-label="Pilih tahun">${options}</select>
     <button class="btn ghost" data-action="export">Ekspor Excel</button>
     <button class="btn primary" data-action="open-create">＋ Catat kegiatan</button>`,
  );
}

function renderDashboard(data) {
  const k = data.kpis;
  const noData = k.activities === 0 && k.reports === 0;
  const maxChart = Math.max(1, ...data.monthly.flatMap((item) => [item.revenue, item.hpp, item.rkap]));
  const attention = data.attention.length
    ? data.attention.map((item) => `<button class="attention-item ${item.priority === 1 ? "critical" : ""}" data-view="${escapeHtml(item.route)}"><span class="attention-level"></span><span class="attention-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></span><span class="attention-type">${escapeHtml(item.type)}</span></button>`).join("")
    : `<div class="empty-state" style="min-height:190px"><div class="empty-visual">✓</div><h3>Tidak ada item mendesak</h3><p>Semua indikator yang terpantau berada dalam kondisi aman.</p></div>`;

  const chart = data.monthly.map((item) => {
    const revenueHeight = Math.max(item.revenue ? 2 : 0, item.revenue / maxChart * 100);
    const hppHeight = Math.max(item.hpp ? 2 : 0, item.hpp / maxChart * 100);
    const rkapHeight = Math.max(item.rkap ? 2 : 0, item.rkap / maxChart * 100);
    const title = `${item.month}: pendapatan ${formatMoney(item.revenue)}, HPP ${formatMoney(item.hpp)}, RKAP ${formatMoney(item.rkap)}`;
    return `<div class="month-group" title="${escapeHtml(title)}"><div class="bar-area"><span class="bar revenue" style="height:${revenueHeight}%"></span><span class="bar hpp" style="height:${hppHeight}%"></span><span class="bar rkap" style="height:${rkapHeight}%"></span></div><span class="month-label">${item.month}</span></div>`;
  }).join("");

  const subsectionCards = data.subsections.map((item) => {
    const meta = subsectionMeta[item.code] || subsectionMeta.ADM;
    return `<button class="subsection-card ${meta.className}" data-view="${meta.view}"><div class="subsection-top"><span class="subsection-code">${item.code}</span><span class="mono muted">↗</span></div><h3>${escapeHtml(item.label)}</h3><div class="subsection-count">${integer.format(item.count)}</div><div class="subsection-meta"><span>${item.done} selesai</span><span>${item.completion}%</span></div><div class="meter"><span style="width:${Math.min(100, item.completion)}%"></span></div></button>`;
  }).join("");

  const regionalRows = data.regional.length ? data.regional.map((row) => `<tr><td><strong>${escapeHtml(row.regional)}</strong></td><td class="number">${row.total}</td><td class="number">${row.proses}</td><td class="number">${row.selesai}</td><td>${badge(row.terlambat ? `${row.terlambat} terlambat` : "Aman")}</td><td class="progress-cell"><div class="progress-track"><span style="width:${row.completion}%"></span></div><small>${row.completion}% selesai</small></td></tr>`).join("") : `<tr><td colspan="6" class="muted">Belum ada data regional.</td></tr>`;
  const recentRows = data.recent_activities.length ? data.recent_activities.map((row) => `<tr><td><span class="mono">${escapeHtml(row.display_id || row.activity_id)}</span></td><td><strong>${escapeHtml(row.perusahaan)}</strong><br><span class="muted">${escapeHtml(row.jenis_kegiatan || "·")}</span></td><td>${escapeHtml(row.regional || "·")}</td><td>${badge(subsectionMeta[row.subbagian]?.label || row.subbagian)}</td><td class="number">${compactMoney(row.nilai_kontrak)}</td><td>${badge(row.status)}</td></tr>`).join("") : `<tr><td colspan="6" class="muted">Belum ada kegiatan.</td></tr>`;

  main.innerHTML = `
    ${dashboardHeader(data)}
    ${noData ? `<div class="panel" style="margin-bottom:15px;border-color:rgba(43,245,197,.25)"><div class="panel-head" style="margin:0"><div><span class="eyebrow">DATABASE BARU</span><h2 style="margin-top:7px">Dashboard siap digunakan</h2><p>Catat kegiatan pertama atau muat data contoh berlabel DEMO untuk melihat seluruh komponen.</p></div><div class="head-actions"><button class="btn ghost" data-action="load-demo">Muat data contoh</button><button class="btn primary" data-action="open-create">Catat kegiatan</button></div></div></div>` : ""}
    <section class="kpi-grid" aria-label="Indikator kinerja utama">
      ${kpiCard("Kegiatan aktif", integer.format(k.activities), "Empat subbagian", "var(--blue)")}
      ${kpiCard("Laporan proses", integer.format(k.reports_process), `${k.reports_done} selesai dari ${k.reports}`, "var(--lime)", `${k.completion}%`)}
      ${kpiCard("Mendekati tenggat", integer.format(k.reports_warning), `${k.reports_late} laporan terlambat`, "var(--amber)")}
      ${kpiCard("Pendapatan", compactMoney(k.revenue), `Capaian RKAP ${k.rkap_achievement}%`, "var(--teal)")}
      ${kpiCard("Piutang", compactMoney(k.receivable), `${compactMoney(k.paid)} telah dibayar`, "var(--danger)")}
      ${kpiCard("Laba kotor", compactMoney(k.gross_profit), `Margin ${k.margin}%`, "var(--teal)")}
      ${kpiCard("Sampel / KCD", integer.format(k.kcd), `${k.lab_active} analisis aktif`, "var(--blue)")}
      ${kpiCard("Pendapatan JID", compactMoney(k.jid_revenue), `${k.critical_stock} produk stok kritis`, "var(--amber)")}
      ${kpiCard("Pelatihan mendatang", integer.format(k.training_upcoming), "Agenda terjadwal", "var(--magenta)")}
      ${kpiCard("NET siap tagih", integer.format(k.net_ready), "Perlu diproses administrasi", "var(--lime)")}
    </section>

    <section class="subsection-grid" aria-label="Empat subbagian UPJKP">${subsectionCards}</section>

    <section class="dashboard-grid">
      <article class="panel">
        <div class="panel-head"><div><h2>Tren keuangan bulanan</h2><p>Pendapatan, HPP, dan target RKAP</p></div><div class="legend"><span><i></i>Pendapatan</span><span><i class="hpp"></i>HPP</span><span><i class="rkap"></i>RKAP</span></div></div>
        <div class="chart" aria-label="Grafik keuangan bulanan">${chart}</div>
      </article>
      <article class="panel">
        <div class="panel-head"><div><h2>Perlu perhatian</h2><p>Diurutkan dari prioritas tertinggi</p></div><span class="panel-tag">${data.attention.length} ITEM</span></div>
        <div class="attention-list">${attention}</div>
      </article>
    </section>

    <section class="dashboard-grid">
      <article class="panel">
        <div class="panel-head"><div><h2>Progres laporan per regional</h2><p>Ringkasan SLA dan penyelesaian</p></div><button class="btn ghost small" data-view="reports-bt">Lihat laporan</button></div>
        <div class="table-wrap"><table><thead><tr><th>Regional</th><th class="number">Total</th><th class="number">Proses</th><th class="number">Selesai</th><th>Status</th><th>Capaian</th></tr></thead><tbody>${regionalRows}</tbody></table></div>
      </article>
      <article class="panel">
        <div class="panel-head"><div><h2>Ringkasan operasi</h2><p>Indikator lintas subbagian</p></div></div>
        <div class="summary-strip" style="grid-template-columns:1fr 1fr"><div class="summary-item"><small>HPP</small><strong>${compactMoney(k.hpp)}</strong></div><div class="summary-item"><small>RKAP</small><strong>${compactMoney(k.rkap)}</strong></div><div class="summary-item"><small>Laporan terlambat</small><strong>${k.reports_late}</strong></div><div class="summary-item"><small>Notifikasi</small><strong>${k.notifications_unread}</strong></div></div>
      </article>
    </section>

    <section class="panel" style="margin-top:15px">
      <div class="panel-head"><div><h2>Kegiatan terbaru</h2><p>Pembaruan terakhir pada basis data</p></div><button class="btn ghost small" data-view="activities">Lihat semua</button></div>
      <div class="table-wrap"><table><thead><tr><th>ID</th><th>Perusahaan / kegiatan</th><th>Regional</th><th>Subbagian</th><th class="number">Nilai</th><th>Status</th></tr></thead><tbody>${recentRows}</tbody></table></div>
    </section>`;
}

async function fetchList(route, filters = {}) {
  const params = new URLSearchParams({ page_size: "200" });
  if (state.search) params.set("q", state.search);
  Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
  return api(`/api/${route}?${params}`);
}

function toolbar(extra = "") {
  return `<div class="module-toolbar"><input class="input-control" data-role="module-search" value="${escapeHtml(state.search)}" placeholder="Cari dalam tabel…" aria-label="Cari dalam tabel"><button class="btn ghost" data-action="apply-search">Cari</button>${extra}<span class="toolbar-spacer"></span><button class="btn primary" data-action="open-create">＋ Catat kegiatan</button></div>`;
}

function activityTable(items) {
  if (!items.length) return emptyState("Belum ada kegiatan", "Gunakan tombol Catat kegiatan untuk menambahkan record pertama.", `<button class="btn primary" data-action="open-create">Catat kegiatan</button>`);
  const rows = items.map((row) => `<tr><td><span class="mono">${escapeHtml(row.display_id || row.activity_id)}</span></td><td><strong>${escapeHtml(row.perusahaan)}</strong><br><span class="muted">${escapeHtml(row.jenis_kegiatan || "·")}</span></td><td>${escapeHtml(row.kebun_lokasi || "·")}</td><td>${escapeHtml(row.regional || "·")}</td><td>${badge(subsectionMeta[row.subbagian]?.label || row.subbagian)}</td><td>${escapeHtml(row.pic || "·")}</td><td class="number">${compactMoney(row.nilai_kontrak)}</td><td>${badge(row.status)}</td></tr>`).join("");
  return `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Perusahaan / kegiatan</th><th>Lokasi</th><th>Regional</th><th>Subbagian</th><th>PIC</th><th class="number">Nilai</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

async function renderActivities(filters = {}) {
  const [title, subtitle] = viewTitles[state.view] || viewTitles.activities;
  const data = await fetchList("activities", filters);
  main.innerHTML = `${pageHead(title, subtitle, `<button class="btn ghost" data-action="export">Ekspor Excel</button><button class="btn primary" data-action="open-create">＋ Catat kegiatan</button>`)}${toolbar()}<div class="panel"><div class="panel-head"><div><h2>${integer.format(data.total)} kegiatan</h2><p>Data aktif; record terarsip tidak ditampilkan</p></div><span class="panel-tag">HALAMAN ${data.page}/${data.pages}</span></div>${activityTable(data.items)}</div>`;
}

async function renderSubsection(code) {
  const meta = subsectionMeta[code];
  const dashboard = await loadDashboard();
  const card = dashboard.subsections.find((item) => item.code === code) || { count: 0, done: 0, completion: 0, revenue: 0 };
  const data = await fetchList("activities", { subbagian: code });
  const shortcuts = {
    RPJID: [["reports-rp", "Monitoring laporan"], ["labs", "Analisis laboratorium"], ["jid", "JID & inventory"]],
    BT: [["activities-bt", "Daftar kegiatan"], ["reports-bt", "Monitoring laporan"]],
    PLT: [["training", "Kegiatan & kalender"], ["experts", "Tenaga ahli"]],
    ADM: [["billing", "Billing Center"], ["companies", "Perusahaan"], ["validation", "Validasi"]],
  }[code];
  const actions = shortcuts.map(([view, label]) => `<button class="btn ghost" data-view="${view}">${escapeHtml(label)}</button>`).join("");
  main.innerHTML = `
    ${pageHead(meta.label, viewTitles[meta.view][1], `<button class="btn primary" data-action="open-create">＋ Catat kegiatan</button>`)}
    <section class="summary-strip">
      ${kpiCard("Kegiatan", integer.format(card.count), "Record aktif", meta.color)}
      ${kpiCard("Laporan selesai", integer.format(card.done), `Capaian ${card.completion}%`, meta.color)}
      ${kpiCard("Nilai kegiatan", compactMoney(card.revenue), "Akumulasi kontrak", meta.color)}
      ${kpiCard("Kontribusi", `${card.completion}%`, "Penyelesaian laporan", meta.color)}
    </section>
    <div class="module-toolbar">${actions}<span class="toolbar-spacer"></span><input class="input-control" data-role="module-search" value="${escapeHtml(state.search)}" placeholder="Cari kegiatan…"><button class="btn ghost" data-action="apply-search">Cari</button></div>
    <section class="panel"><div class="panel-head"><div><h2>Aktivitas subbagian</h2><p>${integer.format(data.total)} kegiatan ditemukan</p></div></div>${activityTable(data.items)}</section>`;
}

async function renderReports(workflow) {
  const titleKey = workflow === "RP" ? "reports-rp" : "reports-bt";
  const data = await fetchList("reports", { workflow });
  const late = data.items.filter((row) => row.status_deadline === "TERLAMBAT").length;
  const done = data.items.filter((row) => ["NET / RP27", "SELESAI"].includes(row.status_hitung)).length;
  const warning = data.items.filter((row) => ["PERHATIAN", "SEGERA SELESAIKAN"].includes(row.status_deadline)).length;
  const rows = data.items.length ? data.items.map((row) => {
    const remaining = row.hari_tersisa == null ? "Countdown berhenti" : row.hari_tersisa < 0 ? `Lewat ${Math.abs(row.hari_tersisa)} hari` : `Sisa ${row.hari_tersisa} hari`;
    return `<tr><td><span class="mono">${escapeHtml(row.report_id)}</span></td><td><strong>${escapeHtml(row.perusahaan)}</strong><br><span class="muted">${escapeHtml(row.kebun || "·")}</span></td><td>${escapeHtml(row.regional || "·")}</td><td>${formatDate(row.tanggal_draft_masuk)}</td><td><strong>${escapeHtml(row.checkpoint_terakhir || row.status_hitung)}</strong><br><span class="muted">${escapeHtml(row.korektor_terakhir || "·")}</span></td><td>${badge(row.status_deadline)}<br><span class="muted mono">${escapeHtml(remaining)}</span></td><td class="progress-cell"><div class="progress-track"><span style="width:${Math.min(100, row.persentase_waktu)}%"></span></div><small>Hari ke-${row.hari_berjalan} · ${formatDate(row.deadline)}</small></td><td>${badge(row.status_hitung)}</td></tr>`;
  }).join("") : `<tr><td colspan="8" class="muted">Belum ada laporan pada workflow ini.</td></tr>`;
  main.innerHTML = `
    ${pageHead(...viewTitles[titleKey], `<button class="btn ghost" data-action="run-monitor">Jalankan reminder</button><button class="btn primary" data-action="open-create">＋ Catat kegiatan</button>`)}
    <section class="summary-strip"><div class="summary-item"><small>Total laporan</small><strong>${data.total}</strong></div><div class="summary-item"><small>Selesai / NET</small><strong>${done}</strong></div><div class="summary-item"><small>Perlu perhatian</small><strong>${warning}</strong></div><div class="summary-item"><small>Terlambat</small><strong>${late}</strong></div></section>
    ${toolbar(`<span class="badge info">SLA 30 HARI</span>`)}
    <section class="panel"><div class="panel-head"><div><h2>Timeline laporan</h2><p>Status dihitung dari checkpoint dan tanggal sumber</p></div><span class="panel-tag">${workflow === "RP" ? "WORKFLOW RP / NET" : "WORKFLOW UMUM"}</span></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Perusahaan / kebun</th><th>Regional</th><th>Draft masuk</th><th>Checkpoint</th><th>SLA</th><th>Waktu</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

async function renderLabs() {
  const data = await fetchList("labs");
  const totalKcd = data.items.reduce((sum, row) => sum + Number(row.jumlah_kcd || 0), 0);
  const active = data.items.filter((row) => String(row.status).toUpperCase() !== "SELESAI").length;
  const leaf = data.items.filter((row) => String(row.jenis_analisis).toUpperCase() === "DAUN").reduce((sum, row) => sum + Number(row.jumlah_kcd || 0), 0);
  const soil = totalKcd - leaf;
  const rows = data.items.length ? data.items.map((row) => {
    const start = row.tanggal_sampel_masuk ? new Date(`${row.tanggal_sampel_masuk}T00:00:00`) : null;
    const age = start && !Number.isNaN(start) ? Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000)) : 0;
    return `<tr><td class="mono">${escapeHtml(row.lab_id)}</td><td><strong>${escapeHtml(row.perusahaan)}</strong><br><span class="muted">${escapeHtml(row.kebun || "·")}</span></td><td>${badge(row.jenis_analisis)}</td><td class="number">${integer.format(row.jumlah_kcd || 0)}</td><td>${formatDate(row.tanggal_sampel_masuk)}</td><td class="mono">${age} hari</td><td>${escapeHtml(row.pic || "·")}</td><td>${badge(row.status)}</td></tr>`;
  }).join("") : `<tr><td colspan="8" class="muted">Belum ada data laboratorium.</td></tr>`;
  main.innerHTML = `${pageHead(...viewTitles.labs)}<section class="summary-strip"><div class="summary-item"><small>Total KCD</small><strong>${integer.format(totalKcd)}</strong></div><div class="summary-item"><small>KCD daun</small><strong>${integer.format(leaf)}</strong></div><div class="summary-item"><small>KCD tanah</small><strong>${integer.format(soil)}</strong></div><div class="summary-item"><small>Analisis aktif</small><strong>${active}</strong></div></section>${toolbar()}<section class="panel"><div class="panel-head"><div><h2>Daftar sampel</h2><p>Umur sampel dihitung otomatis dari tanggal masuk</p></div><span class="panel-tag">${data.total} RECORD</span></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Perusahaan / kebun</th><th>Jenis</th><th class="number">KCD</th><th>Sampel masuk</th><th>Umur</th><th>PIC</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

async function renderJid() {
  const dashboard = await loadDashboard();
  const tx = await fetchList("jid-transactions");
  const revenue = tx.items.reduce((sum, row) => sum + Number(row.nilai || 0), 0);
  const sold = tx.items.reduce((sum, row) => sum + Number(row.jumlah || 0), 0);
  const products = dashboard.products;
  const productCards = products.length ? products.map((row) => `<article class="subsection-card adm" style="--accent:${row.kritis ? "var(--danger)" : "var(--teal)"}"><div class="subsection-top"><span class="subsection-code">${escapeHtml(row.product_id)}</span>${badge(row.kritis ? (row.stok <= 0 ? "HABIS" : "TERBATAS") : "TERSEDIA")}</div><h3>${escapeHtml(row.nama)}</h3><div class="subsection-count">${integer.format(row.stok)} <small style="font-size:11px;color:var(--ink-3)">${escapeHtml(row.satuan || "unit")}</small></div><div class="subsection-meta"><span>Minimum ${integer.format(row.minimum_stok)}</span><span>${compactMoney(row.harga)}</span></div></article>`).join("") : `<div class="panel empty-state"><p>Belum ada master produk.</p></div>`;
  const txRows = tx.items.length ? tx.items.map((row) => `<tr><td class="mono">${escapeHtml(row.transaction_id)}</td><td>${escapeHtml(row.product_id)}</td><td><strong>${escapeHtml(row.perusahaan)}</strong></td><td>${formatDate(row.tanggal)}</td><td class="number">${integer.format(row.jumlah)}</td><td class="number">${formatMoney(row.nilai)}</td><td>${badge(row.status_tagihan)}</td></tr>`).join("") : `<tr><td colspan="7" class="muted">Belum ada transaksi JID.</td></tr>`;
  main.innerHTML = `${pageHead(...viewTitles.jid)}<section class="summary-strip"><div class="summary-item"><small>Produk aktif</small><strong>${products.length}</strong></div><div class="summary-item"><small>Unit terjual</small><strong>${integer.format(sold)}</strong></div><div class="summary-item"><small>Pendapatan</small><strong>${compactMoney(revenue)}</strong></div><div class="summary-item"><small>Stok kritis</small><strong>${products.filter((p) => p.kritis).length}</strong></div></section><section class="subsection-grid">${productCards}</section><section class="panel" style="margin-top:15px"><div class="panel-head"><div><h2>Transaksi terbaru</h2><p>Penjualan dan status penagihan produk</p></div></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Produk</th><th>Perusahaan</th><th>Tanggal</th><th class="number">Jumlah</th><th class="number">Nilai</th><th>Tagihan</th></tr></thead><tbody>${txRows}</tbody></table></div></section>`;
}

async function renderTraining() {
  const data = await fetchList("training");
  const upcoming = data.items.filter((row) => row.tanggal_mulai && new Date(`${row.tanggal_mulai}T00:00:00`) >= new Date()).length;
  const participants = data.items.reduce((sum, row) => sum + Number(row.jumlah_peserta || 0), 0);
  const rows = data.items.length ? data.items.map((row) => `<tr><td class="mono">${escapeHtml(row.training_id)}</td><td><strong>${escapeHtml(row.nama_kegiatan)}</strong><br><span class="muted">${escapeHtml(row.perusahaan)}</span></td><td>${escapeHtml(row.lokasi || "·")}</td><td>${formatDate(row.tanggal_mulai)}</td><td>${formatDate(row.tanggal_selesai)}</td><td class="number">${integer.format(row.jumlah_peserta || 0)}</td><td>${escapeHtml(row.pic || "·")}</td><td>${badge(row.status)}</td></tr>`).join("") : `<tr><td colspan="8" class="muted">Belum ada kegiatan pelatihan.</td></tr>`;
  main.innerHTML = `${pageHead(...viewTitles.training)}<section class="summary-strip"><div class="summary-item"><small>Total kegiatan</small><strong>${data.total}</strong></div><div class="summary-item"><small>Akan datang</small><strong>${upcoming}</strong></div><div class="summary-item"><small>Total peserta</small><strong>${integer.format(participants)}</strong></div><div class="summary-item"><small>Status</small><strong>${data.total ? "Terpantau" : "·"}</strong></div></section>${toolbar()}<section class="panel"><div class="panel-head"><div><h2>Agenda pelatihan</h2><p>Urutan kegiatan dan kesiapan pelaksanaan</p></div></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Kegiatan / perusahaan</th><th>Lokasi</th><th>Mulai</th><th>Selesai</th><th class="number">Peserta</th><th>PIC</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

async function renderExperts() {
  const data = await fetchList("experts");
  const rows = data.items.length ? data.items.map((row) => `<tr><td class="mono">${escapeHtml(row.expert_id)}</td><td><strong>${escapeHtml(row.nama)}</strong></td><td>${escapeHtml(row.bidang_keahlian || "·")}</td><td>${escapeHtml(row.kontak || "·")}</td><td>${badge(String(row.status_aktif).toUpperCase() === "YA" ? "AKTIF" : "TIDAK AKTIF")}</td><td>${escapeHtml(row.catatan || "·")}</td></tr>`).join("") : `<tr><td colspan="6" class="muted">Belum ada tenaga ahli.</td></tr>`;
  main.innerHTML = `${pageHead(...viewTitles.experts)}${toolbar()}<section class="panel"><div class="panel-head"><div><h2>${data.total} tenaga ahli</h2><p>Master kompetensi dan status ketersediaan</p></div></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Nama</th><th>Bidang keahlian</th><th>Kontak</th><th>Status</th><th>Catatan</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

async function renderBilling() {
  const data = await fetchList("billing");
  const total = data.items.reduce((sum, row) => sum + Number(row.nilai || 0), 0);
  const receivable = data.items.reduce((sum, row) => sum + Number(row.piutang || 0), 0);
  const paid = data.items.reduce((sum, row) => sum + Number(row.total_pembayaran || 0), 0);
  const overdue = data.items.filter((row) => row.status_hitung === "JATUH TEMPO").length;
  const rows = data.items.length ? data.items.map((row) => `<tr><td class="mono">${escapeHtml(row.billing_id)}</td><td><strong>${escapeHtml(row.perusahaan)}</strong><br><span class="muted">${escapeHtml(row.source_type)} · ${escapeHtml(row.source_id)}</span></td><td>${escapeHtml(row.nomor_invoice || "·")}</td><td>${formatDate(row.tanggal_invoice)}</td><td>${formatDate(row.jatuh_tempo)}</td><td class="number">${formatMoney(row.nilai)}</td><td class="number">${formatMoney(row.piutang)}</td><td>${badge(row.status_hitung)}</td><td class="mono">${escapeHtml(row.aging)}</td></tr>`).join("") : `<tr><td colspan="9" class="muted">Belum ada penagihan.</td></tr>`;
  main.innerHTML = `${pageHead(...viewTitles.billing, `<button class="btn ghost" data-action="run-monitor">Periksa jatuh tempo</button><button class="btn ghost" data-action="export">Ekspor Excel</button>`)}<section class="summary-strip"><div class="summary-item"><small>Total invoice</small><strong>${compactMoney(total)}</strong></div><div class="summary-item"><small>Total dibayar</small><strong>${compactMoney(paid)}</strong></div><div class="summary-item"><small>Total piutang</small><strong>${compactMoney(receivable)}</strong></div><div class="summary-item"><small>Jatuh tempo</small><strong>${overdue}</strong></div></section>${toolbar()}<section class="panel"><div class="panel-head"><div><h2>Daftar tagihan</h2><p>Status dihitung dari invoice dan pembayaran</p></div><span class="panel-tag">AGING PIUTANG</span></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Perusahaan / sumber</th><th>Invoice</th><th>Tanggal</th><th>Jatuh tempo</th><th class="number">Nilai</th><th class="number">Piutang</th><th>Status</th><th>Aging</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

async function renderCompanies() {
  const data = await fetchList("companies");
  const rows = data.items.length ? data.items.map((row) => `<tr><td class="mono">${escapeHtml(row.company_id)}</td><td><strong>${escapeHtml(row.nama)}</strong><br><span class="muted">${escapeHtml(row.nama_singkat || "·")}</span></td><td>${escapeHtml(row.jenis_instansi || "·")}</td><td>${escapeHtml(row.regional || "·")}</td><td>${escapeHtml(row.pic || "·")}</td><td>${escapeHtml(row.kontak || "·")}</td><td>${badge(String(row.status_aktif).toUpperCase() === "YA" ? "AKTIF" : "TIDAK AKTIF")}</td></tr>`).join("") : `<tr><td colspan="7" class="muted">Belum ada perusahaan.</td></tr>`;
  main.innerHTML = `${pageHead(...viewTitles.companies, `<button class="btn primary" data-action="open-create">＋ Catat kegiatan</button>`)}${toolbar()}<section class="panel"><div class="panel-head"><div><h2>${data.total} perusahaan</h2><p>Identitas master untuk seluruh layanan UPJKP</p></div></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Perusahaan</th><th>Instansi</th><th>Regional</th><th>PIC</th><th>Kontak</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

async function renderValidation() {
  const data = await api("/api/validation");
  const rows = data.items.length ? data.items.map((row) => `<tr><td>${badge(row.level)}</td><td class="mono">${escapeHtml(row.table)}</td><td class="mono">${escapeHtml(row.record_id || "·")}</td><td>${escapeHtml(row.message)}</td></tr>`).join("") : `<tr><td colspan="4">${badge("VALID")} <span style="margin-left:8px">Tidak ditemukan masalah pada relasi dan aturan yang diperiksa.</span></td></tr>`;
  main.innerHTML = `${pageHead(...viewTitles.validation, `<button class="btn ghost" data-action="refresh">Jalankan ulang</button>`)}<section class="summary-strip"><div class="summary-item"><small>Total masalah</small><strong>${data.total}</strong></div><div class="summary-item"><small>Error</small><strong>${data.errors}</strong></div><div class="summary-item"><small>Warning</small><strong>${data.warnings}</strong></div><div class="summary-item"><small>Status</small><strong>${data.errors ? "Perlu tindakan" : "Valid"}</strong></div></section><section class="panel"><div class="panel-head"><div><h2>Hasil validasi</h2><p>Error menghalangi commit; warning memerlukan peninjauan</p></div></div><div class="table-wrap"><table><thead><tr><th>Level</th><th>Tabel</th><th>Record</th><th>Masalah</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

async function renderAudit() {
  const data = await fetchList("audit");
  const rows = data.items.length ? data.items.slice().reverse().map((row) => `<tr><td>${formatDate(row.timestamp)}</td><td>${escapeHtml(row.actor || "system")}</td><td>${badge(row.action)}</td><td class="mono">${escapeHtml(row.table_name)}</td><td class="mono">${escapeHtml(row.record_id || "·")}</td><td>${escapeHtml(row.reason || "·")}</td></tr>`).join("") : `<tr><td colspan="6" class="muted">Belum ada perubahan tercatat.</td></tr>`;
  main.innerHTML = `${pageHead(...viewTitles.audit)}${toolbar()}<section class="panel"><div class="panel-head"><div><h2>Riwayat perubahan</h2><p>Log append-only dari transaksi database</p></div><span class="panel-tag">${data.total} EVENT</span></div><div class="table-wrap"><table><thead><tr><th>Waktu</th><th>Aktor</th><th>Aksi</th><th>Tabel</th><th>Record</th><th>Alasan</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

async function renderCurrentView() {
  updateNav();
  setLoading();
  try {
    switch (state.view) {
      case "dashboard": renderDashboard(await loadDashboard()); break;
      case "rpjid": await renderSubsection("RPJID"); break;
      case "bt": await renderSubsection("BT"); break;
      case "plt": await renderSubsection("PLT"); break;
      case "admin": await renderSubsection("ADM"); break;
      case "activities": await renderActivities(); break;
      case "activities-bt": await renderActivities({ subbagian: "BT" }); break;
      case "reports-rp": await renderReports("RP"); break;
      case "reports-bt": await renderReports("UMUM"); break;
      case "labs": await renderLabs(); break;
      case "jid": await renderJid(); break;
      case "training": await renderTraining(); break;
      case "experts": await renderExperts(); break;
      case "billing": await renderBilling(); break;
      case "companies": await renderCompanies(); break;
      case "validation": await renderValidation(); break;
      case "audit": await renderAudit(); break;
      default:
        state.view = "dashboard";
        renderDashboard(await loadDashboard());
    }
    main.focus({ preventScroll: true });
  } catch (error) {
    main.innerHTML = `${pageHead("Dashboard tidak dapat dimuat", "Terjadi gangguan ketika membaca basis data.")} ${emptyState("Gagal memuat data", error.message, `<button class="btn primary" data-action="refresh">Coba lagi</button>`)}`;
    toast(error.message, "error");
  }
}

function navigate(view) {
  state.view = view;
  state.search = "";
  location.hash = `/${view}`;
  renderCurrentView();
}

async function openNotifications() {
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  backdrop.classList.remove("hidden");
  const list = document.querySelector("#notification-list");
  list.innerHTML = `<div class="loading-inline">Memuat notifikasi…</div>`;
  try {
    const data = await api("/api/notifications?page_size=100");
    const items = data.items.filter((item) => !item.resolved_at).reverse();
    list.innerHTML = items.length ? items.map((item) => `<article class="notification-item ${String(item.kategori).toUpperCase() === "URGENT" ? "urgent" : ""}"><i></i><div><strong>${escapeHtml(item.judul)}</strong><p>${escapeHtml(item.isi)}</p><time>${formatDate(item.created_at)} · ${escapeHtml(item.kategori)}</time>${!item.read_at ? `<div style="margin-top:8px"><button class="btn ghost small" data-action="mark-read" data-id="${escapeHtml(item.notification_id)}">Tandai dibaca</button></div>` : ""}</div></article>`).join("") : `<div class="empty-state"><div class="empty-visual">✓</div><h3>Belum ada notifikasi</h3><p>Jalankan pemeriksaan untuk memperbarui pengingat.</p></div>`;
  } catch (error) {
    list.innerHTML = `<div class="empty-state"><p>${escapeHtml(error.message)}</p></div>`;
  }
}

function closeNotifications() {
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  backdrop.classList.add("hidden");
}

async function runMonitor() {
  try {
    toast("Pemeriksaan otomatis sedang dijalankan…");
    const result = await api("/api/monitor/run", { method: "POST", body: "{}" });
    state.dashboard = null;
    toast(`${result.notifications_created} notifikasi dan ${result.billing_drafts_created} draft tagihan dibuat.`);
    if (drawer.classList.contains("open")) await openNotifications();
    await renderCurrentView();
  } catch (error) {
    toast(error.message, "error");
  }
}

document.addEventListener("click", async (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    navigate(viewButton.dataset.view);
    return;
  }
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  const action = actionButton.dataset.action;
  if (action === "open-create") {
    form.reset();
    form.elements.tahun.value = new Date().getFullYear();
    dialog.showModal();
  } else if (action === "refresh") {
    state.dashboard = null;
    await renderCurrentView();
    toast("Data telah diperbarui.");
  } else if (action === "year") {
    // ditangani oleh event change
  } else if (action === "notifications") {
    await openNotifications();
  } else if (action === "close-notifications") {
    closeNotifications();
  } else if (action === "run-monitor") {
    await runMonitor();
  } else if (action === "export") {
    location.href = "/api/export";
    toast("Workbook sedang disiapkan untuk diunduh.");
  } else if (action === "load-demo") {
    if (!confirm("Muat data contoh berlabel DEMO? Data yang sudah ada tidak akan ditimpa.")) return;
    try {
      const result = await api("/api/demo", { method: "POST", body: "{}" });
      state.dashboard = null;
      toast(`Data contoh dimuat ke ${Object.values(result).filter((n) => n > 0).length} tabel.`);
      await renderCurrentView();
    } catch (error) { toast(error.message, "error"); }
  } else if (action === "apply-search") {
    state.search = document.querySelector("[data-role='module-search']")?.value.trim() || "";
    await renderCurrentView();
  } else if (action === "mark-read") {
    try {
      await api(`/api/notifications/${encodeURIComponent(actionButton.dataset.id)}/read`, { method: "POST", body: "{}" });
      await openNotifications();
      state.dashboard = null;
    } catch (error) { toast(error.message, "error"); }
  }
});

document.addEventListener("change", async (event) => {
  if (event.target.matches("[data-action='year']")) {
    state.year = event.target.value;
    state.dashboard = null;
    await renderCurrentView();
  }
  if (event.target.matches("#activity-form [name='subbagian']")) {
    const defaultCategory = { RPJID: "RP", BT: "BT", PLT: "TR", ADM: "LN" }[event.target.value];
    form.elements.kategori.value = defaultCategory;
  }
});

document.querySelector("#global-search").addEventListener("submit", (event) => {
  event.preventDefault();
  state.search = document.querySelector("#search-input").value.trim();
  state.view = "activities";
  location.hash = "/activities";
  renderCurrentView();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const submit = form.querySelector("button[type='submit']");
  submit.disabled = true;
  submit.textContent = "Menyimpan…";
  const payload = Object.fromEntries(new FormData(form));
  payload.nilai_kontrak = String(payload.nilai_kontrak || "").replace(/[^0-9,-]/g, "").replace(",", ".");
  payload.hpp = String(payload.hpp || "").replace(/[^0-9,-]/g, "").replace(",", ".");
  try {
    const created = await api("/api/activities", { method: "POST", body: JSON.stringify(payload) });
    dialog.close();
    state.dashboard = null;
    toast(`Kegiatan ${created.display_id} berhasil disimpan.`);
    navigate("activities");
  } catch (error) {
    toast(error.message, "error");
  } finally {
    submit.disabled = false;
    submit.textContent = "Simpan kegiatan";
  }
});

window.addEventListener("hashchange", () => {
  const requested = location.hash.replace(/^#\/?/, "");
  if (requested && requested !== state.view) {
    state.view = requested;
    state.search = "";
    renderCurrentView();
  }
});

async function bootstrap() {
  try {
    state.health = await api("/api/health");
    document.querySelector("#db-name").textContent = state.health.database;
    await renderCurrentView();
  } catch (error) {
    main.innerHTML = `${pageHead("UPJKP Monitoring Center", "Backend belum dapat dihubungi.")}${emptyState("Aplikasi belum siap", error.message, `<button class="btn primary" data-action="refresh">Coba lagi</button>`)}`;
  }
}

bootstrap();
