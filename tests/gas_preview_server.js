const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.resolve(__dirname, '..', 'google-apps-script');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const today = new Date();
const iso = (offset) => {
  const date = new Date(today);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

const reports = [
  { report_id: 'LAP-2026-012', perusahaan: 'PT Agro Sejahtera', nama_kegiatan: 'Rekomendasi Pemupukan', kebun: 'Kebun A', tanggal_draft_masuk: iso(-32), hari_berjalan: 32, deadline: iso(-2), status_deadline: 'TERLAMBAT', status_hitung: 'KOREKTOR 2 CETAK', checkpoint_terakhir: 'KOREKTOR 2 CETAK', workflow: 'RP', pic: 'Dewi' },
  { report_id: 'LAP-2026-027', perusahaan: 'PT Sawit Makmur', nama_kegiatan: 'Rekomendasi Pemupukan', kebun: 'Kebun B', tanggal_draft_masuk: iso(-27), hari_berjalan: 27, deadline: iso(3), status_deadline: 'SEGERA SELESAIKAN', status_hitung: 'KOREKTOR 1 CETAK', checkpoint_terakhir: 'KOREKTOR 1 CETAK', workflow: 'RP', pic: 'Rizal' },
  { report_id: 'LAP-2026-031', perusahaan: 'PT Palma Lestari', nama_kegiatan: 'Evaluasi TBM', kebun: 'Kebun Lestari', tanggal_draft_masuk: iso(-24), hari_berjalan: 24, deadline: iso(6), status_deadline: 'PERHATIAN', status_hitung: 'DICETAK', checkpoint_terakhir: 'CETAK 1', workflow: 'UMUM', pic: 'Agus' },
  { report_id: 'LAP-2026-044', perusahaan: 'PT Nusantara Jaya', nama_kegiatan: 'Kajian Agronomi', kebun: 'Kebun Selatan', tanggal_draft_masuk: iso(-18), hari_berjalan: 18, deadline: iso(12), status_deadline: 'SELESAI', status_hitung: 'NET / RP27', checkpoint_terakhir: 'NET / RP27', workflow: 'RP', pic: 'Nina' },
];

const dashboard = {
  years: [2026, 2025], sample_data: true,
  kpis: { activities: 84, reports: 42, reports_process: 31, reports_done: 11, reports_warning: 7, reports_late: 5, net_ready: 8, completion: 72, revenue: 1240000000, hpp: 410000000, gross_profit: 830000000, margin: 67, rkap: 1720000000, rkap_achievement: 72, receivable: 385000000, paid: 855000000, lab_active: 16, kcd: 834, training_upcoming: 6, jid_revenue: 214000000, critical_stock: 2, notifications_unread: 12 },
  subsections: [
    { code: 'RPJID', label: 'Rekomendasi Pemupukan & Jasa Informasi Digital', count: 24, done: 18, completion: 75, revenue: 620000000 },
    { code: 'BT', label: 'Bantuan Teknis', count: 31, done: 22, completion: 71, revenue: 340000000 },
    { code: 'PLT', label: 'Pelatihan', count: 17, done: 14, completion: 82, revenue: 220000000 },
    { code: 'ADM', label: 'Administrasi', count: 12, done: 9, completion: 75, revenue: 60000000 },
  ],
  attention: [
    { priority: 1, type: 'LAPORAN', title: 'PT Agro Sejahtera', detail: 'Kebun A · TERLAMBAT · hari ke-32', view: 'reports-rp' },
    { priority: 2, type: 'LAPORAN', title: 'PT Sawit Makmur', detail: 'Kebun B · SEGERA SELESAIKAN · hari ke-27', view: 'reports-rp' },
    { priority: 2, type: 'LAPORAN', title: 'PT Palma Lestari', detail: 'Kebun Lestari · PERHATIAN · hari ke-24', view: 'reports-bt' },
    { priority: 2, type: 'BILLING', title: 'PT Nusantara Jaya', detail: 'NET siap penagihan', view: 'billing' },
    { priority: 2, type: 'STOK', title: 'Automatic Weather Station', detail: 'Stok 2 · minimum 2', view: 'jid' },
  ],
  monthly: ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'].map((month,index)=>({ month, revenue: [50,72,85,110,92,140,126,152,133,168,70,42][index]*1000000, hpp: 0, rkap: 145000000 })),
  report_status: { draft: 5, process: 16, print1: 4, printNet: 6, net: 11 },
  recent_reports: reports,
  upcoming_trainings: [
    { tanggal_mulai: iso(3), perusahaan: 'PT Bumi Sawit', nama_kegiatan: 'Pelatihan Panen Presisi', lokasi: 'Medan', jumlah_peserta: 35, status: 'PERSIAPAN' },
    { tanggal_mulai: iso(12), perusahaan: 'PT Palma Lestari', nama_kegiatan: 'Interpretasi Data Cuaca', lokasi: 'Palembang', jumlah_peserta: 24, status: 'DIJADWALKAN' },
    { tanggal_mulai: iso(20), perusahaan: 'PT Sawit Makmur', nama_kegiatan: 'Manajemen Pemupukan', lokasi: 'Pekanbaru', jumlah_peserta: 42, status: 'RENCANA' },
  ],
  regional: [], recent_activities: [], products: [],
};

const mock = `
window.google={script:{run:{
  success:null,failure:null,
  withSuccessHandler(fn){this.success=fn;return this},
  withFailureHandler(fn){this.failure=fn;return this},
  getBootstrap(){setTimeout(()=>this.success(${JSON.stringify({ ok: true, data: { configured: true, user: 'administrator@ppks.test', databaseName: 'UPJKP_MASTER_DATABASE', dashboard } })}),30)}
}}};`;

let html = read('Index.html')
  .replace('<?= appName ?>', 'UPJKP Monitoring Center')
  .replace("<?!= include('Styles'); ?>", read('Styles.html'))
  .replace("<?!= include('Components'); ?>", `<script>${mock}</script>${read('Components.html')}`)
  .replace("<?!= include('Dashboard'); ?>", read('Dashboard.html'))
  .replace("<?!= include('Modules'); ?>", read('Modules.html'))
  .replace("<?!= include('JavaScript'); ?>", read('JavaScript.html'));

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
});
server.listen(8787, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:8787'));
