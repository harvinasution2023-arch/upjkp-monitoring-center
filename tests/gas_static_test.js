const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', 'google-apps-script');
const files = [
  'Schema.gs', 'Config.gs', 'Repository.gs', 'DashboardService.gs',
  'Automation.gs', 'DemoData.gs', 'Code.gs', 'SelfTest.gs', 'TemplateService.gs', 'SourceSync.gs', 'AdminSync.gs',
];
const source = files.map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
new vm.Script(source);

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

const styles = fs.readFileSync(path.join(root, 'Styles.html'), 'utf8').toLowerCase();
for (const token of ['--bg:#f5f8fc', '--card:#fff', '--navy:#123a63', '.hero-row', '.kpis', '.sidebar']) {
  if (!styles.includes(token)) throw new Error(`Design token/komponen hilang: ${token}`);
}
if (styles.includes('color-scheme:dark')) throw new Error('Sisa dark theme ditemukan');

const dashboard = fs.readFileSync(path.join(root, 'Dashboard.html'), 'utf8');
for (const label of ['Total Kegiatan', 'Laporan Aktif', 'Laporan Terlambat', 'Laporan NET', 'Siap Penagihan', 'Piutang', 'Pendapatan', 'Kegiatan Pelatihan']) {
  if (!dashboard.includes(label)) throw new Error(`KPI dashboard hilang: ${label}`);
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

console.log(`Valid: ${files.length} file server, ${clientFiles.length} modul client, light theme, 8 KPI, dan empat subbagian.`);
