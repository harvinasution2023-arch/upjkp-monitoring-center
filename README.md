# UPJKP Monitoring Center

Dashboard lokal untuk memonitor empat subbagian UPJKP:

1. Rekomendasi Pemupukan dan Jasa Informasi Digital.
2. Bantuan Teknis.
3. Pelatihan.
4. Administrasi.

Dashboard utama berada di atas empat subbagian sebagai ringkasan lintas unit.

## Versi Google Apps Script

Versi online tersedia pada folder [google-apps-script](./google-apps-script). Versi ini memakai Google Sheets sebagai database, Google Drive untuk dokumen/backup, `LockService` untuk mencegah tabrakan write, dan trigger Apps Script untuk pemeriksaan harian.

Frontend Web App menggunakan light enterprise design: sidebar empat subbagian, delapan KPI, hero perkebunan, alert center, chart SVG/CSS, tabel monitoring, serta layout responsif desktop, tablet, dan mobile.

Web App aktif:

```text
https://script.google.com/macros/s/AKfycbxT0gids44DaWESXxIDj6Mrjc146qhsqoq-4b-605j3bLrSfjyCNLELdbIm_FN0fJP-6A/exec
```

Deployment awal bersifat privat (`MYSELF`). Login menggunakan akun Google pemilik proyek, lalu tekan **Siapkan aplikasi** untuk membuat database dan folder Drive. Petunjuk lengkap tersedia di `google-apps-script/README.md`.

## Status implementasi

Versi saat ini mencakup fondasi database dan dashboard operasional awal:

- Workbook master dengan 24 sheet/tabel dan ID stabil.
- Repository Excel dengan file lock, backup sebelum write, validasi hasil, replace atomik, soft archive, dan audit dasar.
- Dashboard responsif dengan KPI, empat kartu subbagian, grafik bulanan, panel Perlu Perhatian, progres regional, dan kegiatan terbaru.
- Daftar kegiatan dan form pencatatan kegiatan.
- Monitoring laporan umum serta rekomendasi dengan SLA 30 hari.
- Tampilan laboratorium, inventory/transaksi JID, pelatihan, tenaga ahli, Billing Center, perusahaan, validasi, audit, dan Notification Center.
- Data contoh opsional yang tidak menimpa tabel berisi data.
- Daily monitor idempotent untuk laporan, NET, billing, laboratorium, stok, serta pelatihan.
- Ekspor salinan workbook melalui dashboard.

Fitur impor dua format Excel lama, upload/versioning dokumen OneDrive, editor lengkap seluruh modul, RKAP editor, kalender interaktif, restore UI, dan autentikasi multi-user dilanjutkan pada fase berikutnya.

## Persyaratan

- Windows dengan Python 3.11 atau lebih baru.
- Paket `openpyxl`.

Periksa instalasi:

```powershell
python --version
python -c "import openpyxl; print(openpyxl.__version__)"
```

Jika `openpyxl` belum tersedia:

```powershell
python -m pip install -r .\requirements.txt
```

## Menjalankan dashboard

Dari PowerShell pada folder proyek:

```powershell
.\run_dashboard.ps1
```

Atau jalankan manual:

```powershell
python .\scripts\init_database.py
python .\backend\server.py
```

Buka `http://127.0.0.1:8765`. Server hanya mendengarkan koneksi lokal secara default.

## Konfigurasi OneDrive

Salin `.env.example` menjadi `.env`, lalu sesuaikan path lokal OneDrive:

```text
ONEDRIVE_DATABASE_PATH=D:\Path\OneDrive\UPJKP\Database\UPJKP_DB.xlsx
ONEDRIVE_DOCUMENT_PATH=D:\Path\OneDrive\UPJKP\Dokumen
UPJKP_BACKUP_PATH=D:\Path\OneDrive\UPJKP\Backup
```

Jangan memasukkan `.env`, database, backup, atau dokumen internal ke GitHub. Jika variabel tidak diatur, lingkungan pengembangan menggunakan `data/UPJKP_DB.xlsx` di dalam proyek.

## Data contoh

Pada database kosong, klik **Muat data contoh**. Data diberi label `DEMO / SAMPLE DATA` dan hanya dimasukkan ke tabel yang masih kosong. Data yang sudah ada tidak ditimpa.

## Daily monitor

Jalankan manual:

```powershell
python .\scripts\daily_monitor.py
```

Script memeriksa SLA laporan, NET baru, billing draft, invoice jatuh tempo, umur sampel, stok JID, pelatihan mendatang, serta konflik tenaga ahli. Notifikasi menggunakan kunci deduplikasi sehingga eksekusi berulang tidak membuat notifikasi yang sama.

Untuk Windows Task Scheduler, buat Basic Task harian dengan:

- Program: path lengkap menuju `python.exe`.
- Arguments: path lengkap menuju `scripts\daily_monitor.py`.
- Start in: folder root proyek.

Jika workbook sedang terkunci, proses berhenti aman dengan exit code nonnol dan tidak memaksa overwrite.

## Backup dan restore

Setiap perubahan database membuat backup di struktur `backup/YYYY/MM`. Jumlah backup yang dipertahankan dikendalikan oleh `UPJKP_BACKUP_RETENTION`.

Restore belum diekspos sebagai tombol pada versi ini. Untuk menjaga data, jangan mengganti file master saat server aktif. Verifikasi file backup terlebih dahulu dan simpan salinan kondisi terkini sebelum restore manual.

## Pengujian

Jalankan seluruh test:

```powershell
python -m unittest discover -s .\tests -v
```

Test menggunakan direktori sementara dan tidak menyentuh database kerja.

## Struktur proyek

```text
backend/              API, repository Excel, service, validasi, otomasi
frontend/             antarmuka HTML/CSS/JavaScript
scripts/              inisialisasi database dan daily monitor
tests/                unit/integration test berbasis unittest
docs/                 desain database
data/                 database pengembangan; diabaikan Git
documents/            dokumen pengembangan; diabaikan Git
logs/                 log server; diabaikan Git
run_dashboard.ps1     peluncur Windows
```

## Troubleshooting

- **Port 8765 digunakan:** ubah `UPJKP_PORT` di `.env`.
- **Database terkunci:** tutup Excel dan tunggu sinkronisasi OneDrive selesai. Jangan menghapus file `.lock` saat proses Python masih aktif.
- **Workbook tidak valid:** periksa log dan gunakan backup terakhir yang sudah diverifikasi.
- **Font tidak tampil:** dashboard otomatis memakai Segoe UI bila Google Fonts tidak dapat diakses.
- **Dashboard tidak memuat:** pastikan terminal server masih berjalan dan buka endpoint `/api/health`.

## Git workflow

Repository kode dapat dibuat dengan Git, tetapi file `.env`, Excel, PDF, dokumen, backup, dan log harus tetap di luar commit. Tinjau `git status` sebelum setiap commit.
