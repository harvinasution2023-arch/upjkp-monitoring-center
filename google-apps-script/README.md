# UPJKP Monitoring Center — Google Apps Script

Versi ini berjalan sebagai Google Apps Script Web App tanpa server Python. Google Sheets menjadi database, Google Drive menyimpan dokumen/backup, dan trigger Apps Script menjalankan pemeriksaan harian.

## Proyek dan deployment

- Script ID disimpan lokal pada `.clasp.json` dan tidak dimasukkan ke Git.
- Web app awal dibatasi untuk akun pemilik deployment (`MYSELF`).
- Jangan mengubah akses menjadi anonim untuk database produksi.

## Struktur

- `Schema.gs` — 24 tabel dan empat subbagian.
- `Config.gs` — konfigurasi, tanggal, angka, dan helper.
- `Repository.gs` — setup, LockService, Sheets, backup Excel, dan audit.
- `DashboardService.gs` — KPI, agregasi chart, laporan, billing, stok, filter, dan validasi.
- `Automation.gs` — trigger serta daily monitor idempotent.
- `DemoData.gs` — data contoh eksplisit dan tidak menimpa tabel yang sudah berisi data.
- `TemplateService.gs` — generator dan importer workbook template pengisian untuk empat subbagian.
- `SourceSync.gs` — sinkronisasi Bantuan Teknis dari Google Sheet regional dan trigger perubahan otomatis.
- `Code.gs` — entry web app dan operasi kegiatan.
- `Index.html` — shell aplikasi, sidebar, topbar, dialog, dan SVG icon sprite.
- `Styles.html` — design system light enterprise dan responsive breakpoints.
- `Components.html` — KPI, badge, progress, chart, donut, dan reusable UI components.
- `Dashboard.html` — hero, delapan KPI, empat subbagian, alert center, chart, dan tabel dashboard.
- `Modules.html` — halaman laporan, laboratorium, JID, billing, pelatihan, serta administrasi.
- `JavaScript.html` — state, routing, integrasi server, form, drawer, dan interaksi global.
- `SelfTest.gs` — pemeriksaan fungsi murni.

## Upload kode

```powershell
Set-Location '.\google-apps-script'
clasp push
```

## Deployment baru

```powershell
clasp deploy --description "UPJKP Monitoring Center"
```

Untuk memperbarui deployment yang sudah ada:

```powershell
clasp deploy --deploymentId DEPLOYMENT_ID --description "UPJKP Monitoring Center update"
```

## Setup pertama

1. Buka URL Web App dan login menggunakan akun pemilik.
2. Berikan izin Google Sheets, Google Drive, dan trigger saat diminta.
3. Tekan **Siapkan aplikasi**.
4. Aplikasi membuat folder `UPJKP Monitoring Center`, subfolder Dokumen dan Backup, serta Google Sheet master.
5. Data demo tidak dimuat otomatis. Gunakan tombol **Muat data contoh** hanya jika diperlukan.
6. Untuk pengisian terstruktur, buka **Import / Export → Buat Template Pengisian**. Setelah diisi, gunakan **Import Template ke Database**; ID duplikat akan dilewati dan import dicatat ke audit log.
7. Untuk sumber Bantuan Teknis, buka **Import / Export → Hubungkan & Sinkronkan BT**. Sumber Google Sheet regional akan dipetakan ke kegiatan dan monitoring laporan; edit berikutnya disinkronkan melalui trigger dan pemeriksaan harian.

## Membatasi akses organisasi

Deployment awal memakai `MYSELF`. Jika akan digunakan staf dalam satu domain Google Workspace, ubah `webapp.access` pada `appsscript.json` menjadi `DOMAIN`, push ulang, lalu buat versi deployment baru. Pastikan kebijakan administrator Workspace mengizinkan Apps Script Web Apps.

## Backup

Setiap write membuat ekspor `.xlsx` sebelum perubahan. Backup disimpan di folder Backup dan dibatasi 30 berkas terbaru. Tombol **Backup sekarang** juga tersedia pada dashboard.

## Pengujian

Jalankan fungsi `runSelfTest` dari editor Apps Script untuk menguji skema, pemetaan subbagian, SLA, NET, dan ledger stok. Pemeriksaan lokal dapat dijalankan dari root proyek:

```powershell
node .\tests\gas_static_test.js
```

Preview visual dengan sample data terisolasi dapat dijalankan tanpa mengubah database:

```powershell
node .\tests\gas_preview_server.js
```

Lalu buka `http://127.0.0.1:8787`.
