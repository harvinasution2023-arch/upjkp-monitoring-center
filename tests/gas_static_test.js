const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', 'google-apps-script');
const files = [
  'Schema.gs', 'Config.gs', 'Repository.gs', 'DashboardService.gs', 'PersonnelRoster.gs', 'PersonnelService.gs', 'Actions.gs',
  'Automation.gs', 'CentralSync.gs', 'DemoData.gs', 'Code.gs', 'SelfTest.gs', 'TemplateService.gs', 'SourceSync.gs', 'AdminSync.gs', 'RecommendationSync.gs', 'RecommendationMonitoringSync.gs', 'RecommendationBTFormatSync.gs', 'RecommendationWorkbook.gs',
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
if (vm.runInContext("categorySourceId_('RP', 'R1-1')", serverContext) !== 'RP-R1-1') throw new Error('Prefix ID RP tidak konsisten');
if (vm.runInContext("categorySourceId_('BT', 'BT-S-384')", serverContext) !== 'BT-S-384') throw new Error('Prefix ID BT terduplikasi atau tidak konsisten');
if (vm.runInContext("categorySourceId_('TR', 'S-28')", serverContext) !== 'TR-S-28') throw new Error('Prefix ID TR tidak konsisten');
if (vm.runInContext("sourceDate_('21/04/2026')", serverContext) !== '2026-04-21') throw new Error('Tanggal DD/MM/YYYY tidak dinormalisasi');
if (vm.runInContext("sourceDate_('04/21/2026')", serverContext) !== '2026-04-21') throw new Error('Tanggal MM/DD/YYYY tidak dinormalisasi');
if (vm.runInContext("sourceDate_('2026-21-04')", serverContext) !== '2026-04-21') throw new Error('Tanggal YYYY/DD/MM tidak dinormalisasi');
if (vm.runInContext("sourceDate_('31/02/2026')", serverContext) !== '') throw new Error('Tanggal yang mustahil tidak ditolak');
const btCorrectorHeaders = Array(32).fill('');
btCorrectorHeaders[9] = 'Pak Edi Sigit Sutarta';
btCorrectorHeaders[11] = 'Pak Iput Pradiko';
const btCorrectorFixture = Array(32).fill('');
btCorrectorFixture[0] = 2;
btCorrectorFixture[1] = 'PTPN IV Regional I';
btCorrectorFixture[2] = 'Batang Toru';
btCorrectorFixture[6] = '22/07/2025';
btCorrectorFixture[9] = '22/07/2025';
btCorrectorFixture[10] = '23/07/2025';
btCorrectorFixture[11] = '04/09/2025';
btCorrectorFixture[12] = '05/09/2025';
serverContext.btCorrectorHeaders = btCorrectorHeaders;
serverContext.btCorrectorFixture = btCorrectorFixture;
const mappedBtCorrectors = vm.runInContext("sourceRecord_(btCorrectorFixture, 'Data R1', 5, btCorrectorHeaders)", serverContext);
if (mappedBtCorrectors.corrector !== 'Pak Iput Pradiko' || mappedBtCorrectors.correctorStages.length !== 2 || mappedBtCorrectors.correctorStages[1].code !== 'KOREKTOR FINAL' || mappedBtCorrectors.checkpoint !== 'KOREKTOR FINAL' || mappedBtCorrectors.checkpointDate !== '2025-09-05') {
  throw new Error('Nama dan histori korektor Bantuan Teknis tidak terpetakan');
}
const netProgress = vm.runInContext("reportProgress_({ tanggal_draft_masuk: '2026-01-01', tanggal_net: '2026-01-10', checkpoint_terakhir: 'NET' })", serverContext);
if (netProgress.status_hitung !== 'SELESAI' || netProgress.status_deadline !== 'SELESAI') throw new Error('Laporan NET belum berstatus SELESAI');
const legacyProgress = vm.runInContext("reportProgress_({ tanggal_draft_masuk: '2026-01-01', checkpoint_terakhir: 'KOREKTOR FINAL' })", serverContext);
if (legacyProgress.status_hitung !== 'SELESAI' || legacyProgress.status_deadline !== 'SELESAI') throw new Error('Data lama Korektor Final belum dianggap selesai');

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
for (const view of ['admin-rp', 'admin-bt', 'admin-tr', 'reports-tr', 'correspondence']) {
  if (!index.includes(`data-view="${view}"`)) throw new Error(`Navigasi Administrasi terintegrasi tidak ditemukan: ${view}`);
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
if (!modules.includes("renderRegional(workflow='BT',subbagian='BT')")) throw new Error('Ringkasan regional per workflow tidak ditemukan');
if (!modules.includes('renderTeam(subbagian,kategori,key)')) throw new Error('Tim & SPJ per subbagian tidak ditemukan');
if (!modules.includes('unitOperationalCards(code,activities,reports,regional)')) throw new Error('Indikator dashboard subbagian tidak ditemukan');
if (!modules.includes('TERHUBUNG DASHBOARD UTAMA')) throw new Error('Koneksi dashboard subbagian ke dashboard utama tidak ditemukan');
if (!modules.includes("key=subbagian==='PLT'?'reports-tr'")) throw new Error('Monitoring laporan Pelatihan tidak memakai judul dan jalur TR');
for (const token of ['Surat Masuk / Tgl', 'Surat Keluar / Tgl', 'Kunjungan / Tugas', 'visitTaskLetterCell', 'reportDisplayId', 'ID RP']) {
  if (!modules.includes(token)) throw new Error(`Kolom surat monitoring laporan belum lengkap: ${token}`);
}
for (const token of ['Korektor terpantau', 'Korektor Terakhir', 'Riwayat Korektor', 'Kelengkapan', 'Tindakan', 'Link Laporan NET', 'activityActionMenu', 'reportActionMenu', 'netLinkCell']) {
  if (!modules.includes(token)) throw new Error(`Data korektor tidak tampil pada Dashboard BT: ${token}`);
}

const actions = fs.readFileSync(path.join(root, 'Actions.gs'), 'utf8');
for (const token of ['getActivityActionData', 'updateActivityCompletion', 'getTrainingActionData', 'updateTrainingCompletion', 'getReportActionData', 'updateReportAction', 'complete_activity', 'complete_training', 'update_report_action', 'link_net', 'HISTORI_LAPORAN']) {
  if (!actions.includes(token)) throw new Error(`Menu tindakan belum lengkap: ${token}`);
}
const dashboardService = fs.readFileSync(path.join(root, 'DashboardService.gs'), 'utf8');
if (!dashboardService.includes('subbagian: activity.subbagian')) throw new Error('Relasi laporan ke subbagian kegiatan tidak ditemukan');
for (const token of ['getAdministrativeMonitoring', 'isAdministrativeOperationalActivity_', 'correspondenceByActivity_', 'display_id: displayId', 'activity_display_id: displayId', 'no_surat_keluar', 'tanggal_surat_keluar', 'no_surat_kunjungan', 'no_surat_tugas', 'status_laporan', 'tr: items.filter']) {
  if (!dashboardService.includes(token)) throw new Error(`Relasi Administrasi ke laporan tidak lengkap: ${token}`);
}
if (!dashboardService.includes('activityCompleteness_(row, lettersByActivity')) throw new Error('Indikator kelengkapan kegiatan belum terhubung');
if (!dashboardService.includes('activityCompleteness_(activity, correspondenceByActivity, report.report_id')) throw new Error('Indikator kelengkapan Administrasi belum terhubung');
if (!dashboardService.includes('trainingCompleteness_(row)')) throw new Error('Indikator kelengkapan pelatihan belum terhubung');
if (!modules.includes('trainingActionMenu')) throw new Error('Menu tindakan pelatihan belum ditemukan');
if (vm.runInContext("correspondenceSlot_({ jenis_surat: 'SURAT TUGAS' })", serverContext) !== 'assignment') throw new Error('Surat tugas tidak terbaca sebagai korespondensi laporan');
if (vm.runInContext("correspondenceSlot_({ jenis_surat: 'SURAT KUNJUNGAN' })", serverContext) !== 'visit') throw new Error('Surat kunjungan tidak terbaca sebagai korespondensi laporan');
serverContext.adminTrOperationalFixture = { subbagian: 'PLT', kategori: 'TR' };
serverContext.adminJidOperationalFixture = { subbagian: 'RPJID', kategori: 'JID' };
if (!vm.runInContext('isAdministrativeOperationalActivity_(adminTrOperationalFixture)', serverContext)) throw new Error('Administrasi TR masih tertahan dari API monitoring');
if (vm.runInContext('isAdministrativeOperationalActivity_(adminJidOperationalFixture)', serverContext)) throw new Error('Kategori non-operasional ikut masuk monitoring Administrasi');
serverContext.legacyBtReportFilterFixture = { workflow: 'UMUM', subbagian: 'BT' };
serverContext.newBtReportFilterFixture = { workflow: 'BT', subbagian: 'BT' };
serverContext.trainingReportFilterFixture = { workflow: 'UMUM', subbagian: 'PLT' };
if (!vm.runInContext("moduleFilterMatches_(legacyBtReportFilterFixture, { workflow: 'BT', subbagian: 'BT' }, 'reports')", serverContext)) throw new Error('Laporan BT historis UMUM tidak masuk filter BT');
if (!vm.runInContext("moduleFilterMatches_(newBtReportFilterFixture, { workflow: 'UMUM', subbagian: 'BT' }, 'reports')", serverContext)) throw new Error('Laporan BT baru tidak kompatibel dengan filter lama');
if (vm.runInContext("moduleFilterMatches_(trainingReportFilterFixture, { workflow: 'BT', subbagian: 'BT' }, 'reports')", serverContext)) throw new Error('Filter BT menarik laporan Pelatihan');
if (vm.runInContext("personnelNormalizeName_('Dr. Edy Suprianto, M.Si.')", serverContext) !== vm.runInContext("personnelNormalizeName_('Edy Suprianto')", serverContext)) throw new Error('Normalisasi gelar nama petugas tidak konsisten');
if (vm.runInContext("personnelNormalizeName_('M. Yusuf Muslim')", serverContext) !== vm.runInContext("personnelNormalizeName_('M Yusuf Muslim')", serverContext)) throw new Error('Normalisasi format nama petugas tidak konsisten');
serverContext.upjkpRosterFixture = [{ personnel_id: 'PET-0001', nama: 'Agus Eko Prasetyo, M.Si', nama_normalisasi: 'agus eko prasetyo m si' }];
const upjkpReference = vm.runInContext("personnelUpjkpReference_(upjkpRosterFixture, 'Agus Eko Prasetyo')", serverContext);
if (upjkpReference.status !== 'COCOK' || upjkpReference.person.personnel_id !== 'PET-0001') throw new Error('Pemetaan Sheet2 dengan gelar nama tidak konsisten');
serverContext.upjkpAliasRosterFixture = [{ personnel_id: 'PET-0002', nama: 'Chandra O. Debataraja', nama_normalisasi: 'chandra o debataraja' }];
const upjkpAliasReference = vm.runInContext("personnelUpjkpReference_(upjkpAliasRosterFixture, 'Chandra Oktavianus Debataraja')", serverContext);
if (upjkpAliasReference.status !== 'COCOK' || upjkpAliasReference.person.nama !== 'Chandra O. Debataraja') throw new Error('Alias nama Sheet2 belum diarahkan ke nama MASTER_PETUGAS');
const orderedUpjkp = vm.runInContext('PERSONNEL_UPJKP_SOURCE_ORDERED_', serverContext);
if (orderedUpjkp.length !== 22 || orderedUpjkp[1].nama !== 'Muhayat' || orderedUpjkp[1].assignment_id !== 'UPJKP-002' || orderedUpjkp[21].assignment_id !== 'UPJKP-022') throw new Error('Urutan ID personel UPJKP tidak konsisten');
for (const token of ['MASTER_PETUGAS_UPJKP', 'PERSONNEL_UPJKP_SOURCE_SHEET_', 'personnel_upjkp_id', 'UPJKP-PER-', 'status_kecocokan', 'Pemetaan Subbagian UPJKP', 'renderPersonnelRecapV2']) {
  if (!source.includes(token) && !fs.readFileSync(path.join(root, 'Modules.html'), 'utf8').includes(token) && !fs.readFileSync(path.join(root, 'PersonnelService.gs'), 'utf8').includes(token)) throw new Error(`Pemetaan Sheet2 belum lengkap: ${token}`);
}
for (const section of ['Empat Subbagian UPJKP', 'Perlu Perhatian', 'Pendapatan vs RKAP', 'Laporan Terbaru', 'Kegiatan Pelatihan Mendatang']) {
  if (!dashboard.includes(section)) throw new Error(`Bagian dashboard hilang: ${section}`);
}

const templateService = fs.readFileSync(path.join(root, 'TemplateService.gs'), 'utf8');
for (const code of ['RPJID', 'BT', 'PLT', 'ADM']) {
  if (!templateService.includes(`code: '${code}'`)) throw new Error(`Template ${code} hilang`);
}
if (!templateService.includes('createInputTemplates')) throw new Error('Generator template tidak ditemukan');
if (!templateService.includes('importInputTemplates')) throw new Error('Importer template tidak ditemukan');
for (const token of ['SURAT BALASAN/KELUAR', 'SURAT KUNJUNGAN', 'SURAT TUGAS', 'PENGIRIMAN LAPORAN']) {
  if (!templateService.includes(token)) throw new Error(`Dropdown template korespondensi belum lengkap: ${token}`);
}

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
if (mappedReport.report.workflow !== 'RP' || mappedReport.report.checkpoint_terakhir !== 'CETAK FINAL' || mappedReport.report.tanggal_net !== '2024-04-22' || mappedReport.report.korektor_terakhir !== 'Korektor Satu') {
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
if (mappedMonitoring.company !== 'PT Perkebunan Nusantara IV Regional I' || mappedMonitoring.activityId !== 'RP-R1P-1' || mappedMonitoring.reportId !== 'LAP-RP-R1P-1' || mappedMonitoring.visitDate !== '2025-07-21' || mappedMonitoring.draft !== '2025-09-25' || mappedMonitoring.latest.code !== 'KOREKTOR FINAL' || mappedMonitoring.lastCorrector.person !== 'Iput Pradiko') {
  throw new Error('Pemetaan monitoring regional Rekomendasi tidak sesuai');
}
const monitoringR5Fixture = Array(18).fill('');
monitoringR5Fixture[0] = 1;
monitoringR5Fixture[1] = 'Kebun Pamukan';
monitoringR5Fixture[2] = 'Petugas Satu';
monitoringR5Fixture[6] = 'Edy Sigit Sutarta';
monitoringR5Fixture[7] = '2026-05-25';
monitoringR5Fixture[8] = 'Chandra O. Debataraja';
monitoringR5Fixture[9] = '2026-05-29';
serverContext.monitoringR5Fixture = monitoringR5Fixture;
const mappedMonitoringR5 = vm.runInContext("recommendationMonitoringRecord_(monitoringR5Fixture, 'Reg V P', 4)", serverContext);
if (mappedMonitoringR5.stages[1].person !== 'Chandra O. Debataraja' || mappedMonitoringR5.stages[1].incoming !== '2026-05-29' || mappedMonitoringR5.lastCorrector.person !== 'Chandra O. Debataraja') {
  throw new Error('Pergeseran kolom korektor Reg V tidak ditangani');
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
  sourceKey: 'R2KSO-10', activityId: 'RP-R2KSO-10', reportId: 'LAP-RP-R2KSO-10', kebun: 'Kebun Contoh', note: 'SOURCE_SYNC=RP/MONITORING',
};
const mappedDuplicate = vm.runInContext('recommendationMonitoringUniqueRecord_(duplicateRecord, duplicateSeen, 14)', serverContext);
if (mappedDuplicate.sourceKey === 'R2KSO-10' || !mappedDuplicate.note.includes('NOMOR_SUMBER_GANDA')) {
  throw new Error('Nomor monitoring ganda masih dapat saling menimpa');
}

const monitoringSync = fs.readFileSync(path.join(root, 'RecommendationMonitoringSync.gs'), 'utf8');
for (const token of ['REG I P', 'REG 1 KSO', 'REG 6 KSO', 'Reg VII', 'Swasta', 'financialActivitiesArchived']) {
  if (!monitoringSync.includes(token)) throw new Error(`Konektor monitoring Rekomendasi tidak lengkap: ${token}`);
}
const btRecommendationSync = fs.readFileSync(path.join(root, 'RecommendationBTFormatSync.gs'), 'utf8');
for (const token of ['Data R1', 'RP_FORMAT_SERAGAM_REGIONAL', 'SOURCE_SYNC=RP/FORMAT_SERAGAM', 'correctorHeaders', 'historyTable', 'korektor_terakhir']) {
  if (!btRecommendationSync.includes(token)) throw new Error(`Konektor format BT Rekomendasi tidak lengkap: ${token}`);
}
const uniformRpHeaders = Array(32).fill('');
uniformRpHeaders[9] = 'Edy Sigit Sutarta';
uniformRpHeaders[11] = 'Iput Pradiko';
const uniformRpFixture = Array(32).fill('');
uniformRpFixture[0] = 1;
uniformRpFixture[1] = 'PTPN IV Regional I';
uniformRpFixture[2] = 'Tanah Raja';
uniformRpFixture[6] = '2025-09-25';
uniformRpFixture[8] = 'Iput Pradiko';
uniformRpFixture[9] = '2025-09-25';
uniformRpFixture[11] = '2025-10-08';
serverContext.uniformRpHeaders = uniformRpHeaders;
serverContext.uniformRpFixture = uniformRpFixture;
const mappedUniformRp = vm.runInContext("recommendationBTFormatRecord_(uniformRpFixture, 'Data R1', 4, uniformRpHeaders)", serverContext);
if (mappedUniformRp.corrector !== 'Iput Pradiko' || mappedUniformRp.correctorStages.length !== 2 || mappedUniformRp.correctorStages[1].person !== 'Iput Pradiko') {
  throw new Error('Nama korektor format seragam Rekomendasi tidak terpetakan');
}
if (mappedUniformRp.activityId !== 'RP-R1-1' || mappedUniformRp.reportId !== 'LAP-RP-R1-1' || !mappedUniformRp.reportId.match(/^LAP-RP-/) || mappedUniformRp.reportId.indexOf('BT') >= 0 || mappedUniformRp.reportId.indexOf('FMT') >= 0) {
  throw new Error('ID format seragam Rekomendasi belum memakai prefix kategori RP');
}
const explicitUniformRpFixture = uniformRpFixture.slice();
explicitUniformRpFixture[31] = 'No sumber: 1.0 | KOREKTOR_RP_JSON=[{"t":"KOREKTOR 1","n":"Edy Sigit Sutarta","m":"2025-09-25","k":""},{"t":"KOREKTOR 2","n":"Desra Sahputra","m":"","k":""},{"t":"KOREKTOR FINAL","n":"Iput Pradiko","m":"2026-02-27","k":""}]';
serverContext.explicitUniformRpFixture = explicitUniformRpFixture;
const mappedExplicitUniformRp = vm.runInContext("recommendationBTFormatRecord_(explicitUniformRpFixture, 'Data R1', 4, uniformRpHeaders)", serverContext);
if (mappedExplicitUniformRp.correctorStages.length !== 3 || mappedExplicitUniformRp.corrector !== 'Iput Pradiko' || mappedExplicitUniformRp.correctorStages[1].person !== 'Desra Sahputra') {
  throw new Error('Detail penugasan korektor RP dari format seragam tidak dipertahankan');
}
const adminSync = fs.readFileSync(path.join(root, 'AdminSync.gs'), 'utf8');
for (const token of ['1k587rOiqhWk2uIWrSlhxxjRmD_LW1biy1SR76KsTk0o', 'adminHeaderMap_', 'SURAT MASUK', 'SURAT BALASAN/KELUAR', 'SURAT KUNJUNGAN', 'SURAT TUGAS', 'Menu Drop down', 'migrateMatched', 'migratedFromActivityId', 'claimedActivities[id]', 'linkedActivities']) {
  if (!adminSync.includes(token)) throw new Error(`Sinkronisasi Administrasi RP/BT tidak lengkap: ${token}`);
}
const adminHeaders = ['Kegiatan', 'ID', 'Nama Perusahaan', 'No. Surat Masuk', 'Tanggal Surat Masuk', 'Perihal', 'Jenis Kegiatan', 'No. Surat Balasan / Keluar', 'Tanggal Balasan / Keluar', 'Perihal', 'No. Surat Kunjungan', 'No. Surat Tugas', 'Tanggal Balasan Kunjungan', 'Perihal', 'Lokasi kegiatan', 'Leader', 'Tim'];
const adminValues = ['RP', 'RP-S-15', 'PT Tasma Puja', '007/TP-KP/I/2024', '05/01/2024', 'Permohonan rekomendasi', 'Rekomendasi Pemupukan', '011507/RPN-PPKS/I/2024', '15/01/2024', 'Balasan rekomendasi', 'KUNJ-001/RP/I/2024', 'ST-001/RP/I/2024', '20/01/2024', 'Kunjungan rekomendasi', 'Kebun A', 'Leader Satu', 'Petugas Satu, Petugas Dua'];
serverContext.adminHeaders = adminHeaders;
serverContext.adminValues = adminValues;
const mappedAdmin = vm.runInContext('adminActivityRecord_(adminValues, adminHeaderMap_(adminHeaders), 2)', serverContext);
if (mappedAdmin.company !== 'PT Tasma Puja' || mappedAdmin.location !== 'Kebun A' || mappedAdmin.kind !== 'Rekomendasi Pemupukan' || mappedAdmin.incomingNo !== '007/TP-KP/I/2024' || mappedAdmin.outgoingNo !== '011507/RPN-PPKS/I/2024' || mappedAdmin.visitNo !== 'KUNJ-001/RP/I/2024' || mappedAdmin.assignmentNo !== 'ST-001/RP/I/2024' || mappedAdmin.visitDate !== '2024-01-20' || mappedAdmin.incomingSubject !== 'Permohonan rekomendasi' || mappedAdmin.outgoingSubject !== 'Balasan rekomendasi' || mappedAdmin.visitSubject !== 'Kunjungan rekomendasi') {
  throw new Error('Pemetaan header Administrasi ke perusahaan, kebun, perihal, kegiatan, dan surat tidak sesuai');
}
serverContext.mappedAdmin = mappedAdmin;
if (vm.runInContext('adminPreferredActivityId_(mappedAdmin)', serverContext) !== 'RP-S-15') throw new Error('ID Administrasi RP tidak memakai prefix RP');
serverContext.adminMasterFixture = { perusahaan: 'PT Tasma Puja', kebun_lokasi: 'Kebun A', jenis_kegiatan: 'Rekomendasi Pemupukan', kategori: 'RP', subbagian: 'RPJID', tahun: 2024 };
if (vm.runInContext('adminActivityMatchScore_(adminMasterFixture, mappedAdmin)', serverContext) < 115) throw new Error('Kegiatan Administrasi tidak dapat dihubungkan ke master RP');
serverContext.adminTrainingValues = ['TR', 'TR-S-28', 'PT Berau Coal', '-', '06/02/2024', 'Permohonan pelatihan', 'HPT', '022903/RPN-PPKS/II/2024', '29/02/2024', 'Pelatihan kultur teknis', 'KUNJ-TR-001', 'ST-TR-001', '05/03/2024', 'Kunjungan pelatihan', 'Marihat dan Kebun Adolina', 'Leader Pelatihan', 'Petugas Pelatihan'];
const mappedTrainingAdmin = vm.runInContext('adminActivityRecord_(adminTrainingValues, adminHeaderMap_(adminHeaders), 29)', serverContext);
if (mappedTrainingAdmin.category !== 'PLT' || mappedTrainingAdmin.categoryCode !== 'TR' || mappedTrainingAdmin.location !== 'Marihat dan Kebun Adolina') {
  throw new Error('Data Administrasi Pelatihan TR tidak terpetakan ke subbagian Pelatihan');
}
serverContext.mappedTrainingAdmin = mappedTrainingAdmin;
if (vm.runInContext('adminPreferredActivityId_(mappedTrainingAdmin)', serverContext) !== 'TR-S-28') throw new Error('ID Administrasi Pelatihan tidak memakai prefix TR');
serverContext.adminTrainingMasterFixture = { perusahaan: 'PT Berau Coal', kebun_lokasi: 'Marihat dan Kebun Adolina', jenis_kegiatan: 'HPT', kategori: 'TR', subbagian: 'PLT', tahun: 2024 };
if (vm.runInContext('adminActivityMatchScore_(adminTrainingMasterFixture, mappedTrainingAdmin)', serverContext) < 115) throw new Error('Kegiatan Administrasi TR tidak dapat dihubungkan ke master Pelatihan');
if (vm.runInContext("adminPeople_(mappedAdmin, null, null, {}).length", serverContext) !== 3) throw new Error('Leader dan petugas Administrasi tidak terpetakan');
if (vm.runInContext("adminNumber_('50.968.841')", serverContext) !== 50968841) throw new Error('Nominal Administrasi dengan pemisah ribuan tidak terpetakan');
serverContext.adminOrphanReport = {
  sourceKey: 'BT-S-384', company: 'PT Contoh BT', subject: 'Laporan bantuan teknis', kind: 'Bantuan Teknis',
  leader: 'Leader BT', teamText: 'Petugas BT', stages: [],
  fields: { tanggal_draft_masuk: '2025-01-10', tanggal_checkpoint: '2025-02-01', tanggal_kirim: '', status: 'PROSES' },
};
const orphanActivity = vm.runInContext('adminActivityFromReport_(adminOrphanReport)', serverContext);
if (orphanActivity.category !== 'BT' || orphanActivity.categoryCode !== 'BT' || !orphanActivity.reportOnly || orphanActivity.year !== 2025) {
  throw new Error('Laporan Administrasi tanpa baris utama tidak dipertahankan sebagai record historis');
}
serverContext.orphanActivity = orphanActivity;
if (vm.runInContext('adminPreferredActivityId_(orphanActivity)', serverContext) !== 'BT-S-384') throw new Error('ID Administrasi BT tidak memakai prefix BT');
const centralSync = fs.readFileSync(path.join(root, 'CentralSync.gs'), 'utf8');
for (const token of ['syncAllOperationalSources', 'Rekomendasi Pemupukan', 'Bantuan Teknis', 'Administrasi']) {
  if (!centralSync.includes(token)) throw new Error(`Sinkronisasi terpusat Administrasi tidak lengkap: ${token}`);
}
const recommendationWorkbook = fs.readFileSync(path.join(root, 'RecommendationWorkbook.gs'), 'utf8');
for (const token of ['importRecommendationWorkbook', 'UPJKP_RP_MONITORING_SOURCE_ID', 'makeCopy', 'moveTo']) {
  if (!recommendationWorkbook.includes(token)) throw new Error(`Importer workbook Rekomendasi tidak lengkap: ${token}`);
}

console.log(`Valid: ${files.length} file server, ${clientFiles.length} modul client, light theme, 8 KPI, dan empat subbagian.`);
