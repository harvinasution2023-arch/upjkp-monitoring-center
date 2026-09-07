const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', 'google-apps-script');
const files = [
  'Schema.gs', 'Config.gs', 'Repository.gs', 'DashboardService.gs',
  'Automation.gs', 'DemoData.gs', 'Code.gs', 'SelfTest.gs', 'TemplateService.gs', 'SourceSync.gs', 'AdminSync.gs', 'RecommendationSync.gs', 'RecommendationMonitoringSync.gs', 'RecommendationWorkbook.gs',
];
const source = files.map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
new vm.Script(source);
const serverContext = vm.createContext({
  Utilities: {
    formatDate(date, timezone, format) {
      if (format === 'yyyy') return String(date.getFullYear());
      if (format === 'yyyy-MM-dd') return date.toISOString().slice(0, 10);
      return date.toISOString();
    },
  },
});
new vm.Script(source).runInContext(serverContext);

const clientFiles = ['Components.html', 'Dashboard.html', 'Modules.html', 'JavaScript.html'];
for (const file of clientFiles) {
  const clientFile = fs.readFileSync(path.join(root, file), 'utf8');
  const client = clientFile.slice(clientFile.indexOf('>') + 1, clientFile.lastIndexOf('<'));
  new vm.Script(client);
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'appsscript.json'), 'utf8'));
if (manifest.timeZone !== 'Asia/Jakarta') throw new Error('Timezone manifest tidak sesuai');
if (manifest.webapp.access !== 'MYSELF') throw new Error('Deployment awal harus privat');

const schemaText = fs.readFileSync(path.join(root, 'Schema.gs'), 'utf8');
for (const code of ['RPJID', 'BT', 'PLT', 'ADM']) {
  if (!schemaText.includes(code + ':')) throw new Error(`Subbagian ${code} tidak ditemukan`);
}

const index = fs.readFileSync(path.join(root, 'Index.html'), 'utf8');
for (const include of ["include('Styles')", "include('Components')", "include('Dashboard')", "include('Modules')", "include('JavaScript')"]) {
  if (!index.includes(include)) throw new Error(`Template include hilang: ${include}`);
}
for (const view of ['activities-rp', 'reports-rp', 'regional-rp', 'rp-team', 'activities-bt', 'reports-bt', 'regional', 'bt-team']) {
  if (!index.includes(`data-view="${view}"`)) throw new Error(`Navigasi subbagian tidak lengkap: ${view}`);
}
for (const view of ['rpjid', 'bt', 'plt', 'admin']) {
  if (!index.includes(`data-view="${view}"`)) throw new Error(`Dashboard subbagian tidak ditemukan: ${view}`);
}

const styles = fs.readFileSync(path.join(root, 'Styles.html'), 'utf8').toLowerCase();
for (const token of ['--bg:#f5f8fc', '--card:#fff', '--navy:#123a63', '.hero-row', '.kpis', '.sidebar']) {
  if (!styles.includes(token)) throw new Error(`Design token/komponen hilang: ${token}`);
}
if (styles.includes('color-scheme:dark')) throw new Error('Sisa dark theme ditemukan');

const dashboard = fs.readFileSync(path.join(root, 'Dashboard.html'), 'utf8');
for (const label of ['Total Kegiatan', 'Laporan Aktif', 'Laporan Terlambat', 'Laporan NET', 'Siap Penagihan', 'Piutang', 'Pendapatan', 'Kegiatan Pelatihan']) {
  if (!dashboard.includes(label)) throw new Error(`KPI dashboard hilang: ${label}`);
}

const modules = fs.readFileSync(path.join(root, 'Modules.html'), 'utf8');
if (!modules.includes("renderRegional(workflow='UMUM',subbagian='BT')")) throw new Error('Ringkasan regional per workflow tidak ditemukan');
if (!modules.includes('renderTeam(subbagian,kategori,key)')) throw new Error('Tim & SPJ per subbagian tidak ditemukan');
if (!modules.includes('unitOperationalCards(code,activities,reports,regional)')) throw new Error('Indikator dashboard subbagian tidak ditemukan');
if (!modules.includes('TERHUBUNG DASHBOARD UTAMA')) throw new Error('Koneksi dashboard subbagian ke dashboard utama tidak ditemukan');

const dashboardService = fs.readFileSync(path.join(root, 'DashboardService.gs'), 'utf8');
if (!dashboardService.includes('subbagian: activity.subbagian')) throw new Error('Relasi laporan ke subbagian kegiatan tidak ditemukan');
for (const section of ['Empat Subbagian UPJKP', 'Perlu Perhatian', 'Pendapatan vs RKAP', 'Laporan Terbaru', 'Kegiatan Pelatihan Mendatang']) {
  if (!dashboard.includes(section)) throw new Error(`Bagian dashboard hilang: ${section}`);
}

const templateService = fs.readFileSync(path.join(root, 'TemplateService.gs'), 'utf8');
for (const code of ['RPJID', 'BT', 'PLT', 'ADM']) {
  if (!templateService.includes(`code: '${code}'`)) throw new Error(`Template ${code} hilang`);
}
if (!templateService.includes('createInputTemplates')) throw new Error('Generator template tidak ditemukan');
if (!templateService.includes('importInputTemplates')) throw new Error('Importer template tidak ditemukan');

const recommendationSync = fs.readFileSync(path.join(root, 'RecommendationSync.gs'), 'utf8');
for (const token of ['connectRekomendasiSource', 'getRekomendasiSyncStatus', "workflow: 'RP'", "SOURCE_SYNC=RP/LAPORAN", 'reportIndex[record.sourceKey]', 'teamIndex[record.sourceKey]']) {
  if (!recommendationSync.includes(token)) throw new Error(`Sinkronisasi Rekomendasi tidak lengkap: ${token}`);
}
if (!modules.includes('data-action="sync-rp"')) throw new Error('Tombol sinkronisasi Rekomendasi tidak ditemukan');
const code = fs.readFileSync(path.join(root, 'Code.gs'), 'utf8');
if (!code.includes('ensureRekomendasiSourceInitialized_')) throw new Error('Inisialisasi satu kali sumber Rekomendasi tidak ditemukan');
if (!code.includes("event.parameter.status === 'rp'")) throw new Error('Status sinkronisasi internal Rekomendasi tidak ditemukan');

const activityFixture = Array(53).fill('');
activityFixture[0] = 'RP';
activityFixture[3] = 'RP-S-15';
activityFixture[4] = 'Biaya';
activityFixture[6] = 'PT Tasma Puja';
activityFixture[8] = '05/01/2024';
activityFixture[10] = 'Rekomendasi Pemupukan';
activityFixture[25] = 'SPK-15';
activityFixture[26] = '01/03/2024';
activityFixture[30] = 50968841.25;
serverContext.activityFixture = activityFixture;
const mappedActivity = vm.runInContext('recommendationActivityRecord_(activityFixture, 2)', serverContext);
if (mappedActivity.sourceKey !== 'RP-S-15' || mappedActivity.year !== 2024 || mappedActivity.value !== 50968841.25) {
  throw new Error('Pemetaan kegiatan Rekomendasi tidak sesuai sumber');
}
const reportFixture = Array(32).fill('');
reportFixture[0] = 'RP-S-15';
reportFixture[6] = '02/04/2024';
reportFixture[8] = 'Korektor Satu';
reportFixture[9] = '03/04/2024';
reportFixture[10] = '05/04/2024';
reportFixture[28] = '20/04/2024';
reportFixture[29] = '22/04/2024';
serverContext.mappedActivity = mappedActivity;
serverContext.reportFixture = reportFixture;
const mappedReport = vm.runInContext('recommendationReportRecord_(mappedActivity, reportFixture)', serverContext);
if (mappedReport.report.workflow !== 'RP' || mappedReport.report.checkpoint_terakhir !== 'CETAK FINAL' || mappedReport.report.tanggal_net !== '2024-04-22') {
  throw new Error('Pemetaan workflow laporan Rekomendasi tidak sesuai');
}
const billingFixture = Array(36).fill('');
billingFixture[3] = 'PTPN';
billingFixture[4] = 'PT Perkebunan Nusantara IV Regional IV';
billingFixture[5] = 'Rekomendasi Pemupukan';
billingFixture[7] = 'Penagihan biaya rekomendasi pemupukan tahun 2025';
billingFixture[8] = 'Pelunasan';
billingFixture[9] = '100';
billingFixture[14] = '052/01/2026/INV/RPN/01';
billingFixture[15] = '09 Januari 2026';
billingFixture[16] = 'Maret 2026';
billingFixture[20] = '345,051,590.76';
billingFixture[21] = '383,007,265.74';
billingFixture[22] = '337,536,559.00';
billingFixture[23] = '7,515,031.76';
billingFixture[24] = '13 April 2026';
serverContext.billingFixture = billingFixture;
const mappedBilling = vm.runInContext("recommendationBillingRecord_(billingFixture, 8, 'Pencatatan penagihan admin 2026')", serverContext);
if (mappedBilling.invoiceValue !== 345051590.76 || mappedBilling.contractValue !== 383007265.74 || mappedBilling.invoiceDate !== '2026-01-09' || mappedBilling.due !== '2026-03-31') {
  throw new Error('Pemetaan Rekapitulasi penagihan Rekomendasi tidak sesuai');
}
const monitoringFixture = Array(22).fill('');
monitoringFixture[0] = 1;
monitoringFixture[1] = 'Tanah Raja';
monitoringFixture[2] = 'Erwin Nyak Akoeb, Erlianto, Syarifuddin';
monitoringFixture[3] = '21-24 Jul 2025';
monitoringFixture[6] = 'Edy Sigit Sutarta';
monitoringFixture[7] = '2025-09-25';
monitoringFixture[9] = 'Desra Sahputra';
monitoringFixture[10] = '2025-10-08';
monitoringFixture[12] = 'Iput Pradiko';
monitoringFixture[13] = '2026-02-27';
monitoringFixture[14] = '2026-03-04';
serverContext.monitoringFixture = monitoringFixture;
const mappedMonitoring = vm.runInContext("recommendationMonitoringRecord_(monitoringFixture, 'REG I P', 4)", serverContext);
if (mappedMonitoring.company !== 'PT Perkebunan Nusantara IV Regional I' || mappedMonitoring.visitDate !== '2025-07-21' || mappedMonitoring.draft !== '2025-09-25' || mappedMonitoring.latest.code !== 'CETAK FINAL') {
  throw new Error('Pemetaan monitoring regional Rekomendasi tidak sesuai');
}
serverContext.teamFixture = mappedMonitoring.teamText;
if (vm.runInContext('recommendationMonitoringTeam_(teamFixture).length', serverContext) !== 3) throw new Error('Pemetaan tim monitoring Rekomendasi tidak sesuai');
const privateFixture = Array(18).fill('');
privateFixture[0] = 2;
privateFixture[1] = 'PT Contoh Swasta';
privateFixture[3] = 'Petugas Satu';
serverContext.privateFixture = privateFixture;
const mappedPrivate = vm.runInContext("recommendationMonitoringRecord_(privateFixture, 'Swasta', 5)", serverContext);
if (!mappedPrivate || mappedPrivate.kebun !== 'Belum ditentukan' || !mappedPrivate.note.includes('LOKASI_BELUM_DIISI')) {
  throw new Error('Baris Swasta tanpa nama kebun tidak dipertahankan');
}
serverContext.duplicateSeen = { 'R2KSO-10': true };
serverContext.duplicateRecord = {
  sourceKey: 'R2KSO-10', activityId: 'RP-MON-R2KSO-10', reportId: 'LAP-RP-MON-R2KSO-10', kebun: 'Kebun Contoh', note: 'SOURCE_SYNC=RP/MONITORING',
};
const mappedDuplicate = vm.runInContext('recommendationMonitoringUniqueRecord_(duplicateRecord, duplicateSeen, 14)', serverContext);
if (mappedDuplicate.sourceKey === 'R2KSO-10' || !mappedDuplicate.note.includes('NOMOR_SUMBER_GANDA')) {
  throw new Error('Nomor monitoring ganda masih dapat saling menimpa');
}

const monitoringSync = fs.readFileSync(path.join(root, 'RecommendationMonitoringSync.gs'), 'utf8');
for (const token of ['REG I P', 'REG 1 KSO', 'REG 6 KSO', 'Reg VII', 'Swasta', 'financialActivitiesArchived']) {
  if (!monitoringSync.includes(token)) throw new Error(`Konektor monitoring Rekomendasi tidak lengkap: ${token}`);
}
const recommendationWorkbook = fs.readFileSync(path.join(root, 'RecommendationWorkbook.gs'), 'utf8');
for (const token of ['importRecommendationWorkbook', 'UPJKP_RP_MONITORING_SOURCE_ID', 'makeCopy', 'moveTo']) {
  if (!recommendationWorkbook.includes(token)) throw new Error(`Importer workbook Rekomendasi tidak lengkap: ${token}`);
}

console.log(`Valid: ${files.length} file server, ${clientFiles.length} modul client, light theme, 8 KPI, dan empat subbagian.`);
