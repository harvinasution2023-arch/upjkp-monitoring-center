# Progress UPJKP Monitoring Center

## Status terakhir

- Status: **Berjalan**
- Deployment aktif: **@90**
- URL aplikasi: `https://script.google.com/macros/s/AKfycbxT0gids44DaWESXxIDj6Mrjc146qhsqoq-4b-605j3bLrSfjyCNLELdbIm_FN0fJP-6A/exec`
- Branch GitHub: `main`
- Versi aplikasi: **v2.10.0**

## Sudah selesai

- File `Nama petugas untuk kegiatan upjkp.xlsx` telah dimasukkan sebagai referensi `MASTER_PETUGAS` di Google Sheet Master: 182 nama unik, dengan kelompok Peneliti, Staff Penunjang, dan Pelaksana/Teknis.
- Menu **Rekap Petugas** menghitung keterlibatan kegiatan unik per nama untuk BT, RP, dan TR berdasarkan `TIM_SPJ`, PIC kegiatan, dan PIC laporan. Perbedaan gelar dinormalisasi dan tidak dihitung sebagai nama berbeda.
- `Sheet2` pada workbook yang sama telah dipetakan ke `MASTER_PETUGAS_UPJKP`: 21 nama/jabatan, 14 cocok dengan `MASTER_PETUGAS`, dan 7 ditandai **PERLU VERIFIKASI** karena perbedaannya bukan hanya gelar.
- Menu **Rekap Petugas** menampilkan tabel pemetaan Subbagian UPJKP, jabatan, nama master, status kecocokan, dan `personnel_id`.
- Verifikasi produksi melalui Chrome menemukan sheet `MASTER_PETUGAS` berisi 182 nama, serta rekap aktif menampilkan 798 kegiatan BT, 386 RP, dan 46 TR.

- Dashboard Utama dan dashboard khusus empat subbagian.
- Google Sheet khusus **Monitoring Rekomendasi Pemupukan** dengan sepuluh tab regional/swasta.
- Sinkronisasi Rekomendasi Pemupukan ke kegiatan, laporan, histori checkpoint, perusahaan, dan tim.
- Sebanyak **170 kegiatan**, **170 laporan**, dan **586 baris tim** terverifikasi tanpa error.
- Nama korektor/verifikator RP dari workbook asli telah dipetakan untuk **170 laporan**, terdiri dari **461 penugasan** dan **14 nama unik**.
- `korektor_terakhir` RP tidak lagi kosong saat checkpoint terakhir berupa cetak/kirim; detail setiap penugasan tersimpan sebagai riwayat laporan.
- Dashboard Rekomendasi menampilkan indikator **Korektor terpantau**, kolom **Korektor Terakhir**, pencarian nama, dan **Riwayat Korektor** pada detail laporan.
- Workbook `Monitoring Rekomendasi Pemupukan - Format Seragam.xlsx` telah diisi ulang mengikuti pasangan nama/tanggal format Bantuan Teknis; salinan sebelum perubahan disimpan sebagai backup.
- Tahap koreksi sesudah `CETAK 1` pada RP sekarang bernama **KOREKTOR FINAL** dan tetap membawa nama serta tanggal korektor ke dashboard dan histori.
- Alur BT kini menggunakan label **KOREKTOR FINAL** untuk korektor terakhir, termasuk pada histori dan detail Monitoring Laporan BT.
- Monitoring RP dan BT sekarang memakai enam checkpoint: `DRAFT`, `KOREKTOR 1`, `KOREKTOR 2`, `CETAK 1`, `KOREKTOR FINAL`, `NET`.
- Semua monitoring laporan yang sudah NET kini berstatus **SELESAI**, tidak masuk daftar menunggu/terlambat, dan countdown SLA berhenti.
- Data lama yang sudah mencapai `KOREKTOR FINAL` atau `PENGIRIMAN` juga diperlakukan sebagai selesai saat tanggal NET kosong; input kegiatan baru menyediakan `Tanggal NET (opsional)`.
- ID aktif diseragamkan berdasarkan kategori: `RP-*` untuk Rekomendasi Pemupukan, `BT-*` untuk Bantuan Teknis, dan `TR-*` untuk Pelatihan. Prefix lama seperti `RP-BT`, `RP-FMT`, `RP-MON`, dan `ADM-SRC-RP/BT/TR` hanya dikenali untuk arsip saat sinkronisasi ulang.
- Audit workbook lokal `Data base Admin.xlsx` pada **10 September 2026** menemukan **3.063 baris data Administrasi** dengan ID terisi dan tanpa duplikasi: **226 RP**, **2.791 BT**, dan **46 Pelatihan (TR)**.
- Sinkronisasi Administrasi v2.6.7 memakai ID sumber Administrasi sebagai ID aktif kegiatan RP/BT/TR ketika record cocok, lalu mengarsipkan ID kegiatan/laporan/tagihan lama dengan catatan `MIGRATED_TO`.
- Korespondensi Administrasi sekarang menyimpan `SURAT KUNJUNGAN` dan `SURAT TUGAS` selain Surat Masuk, Surat Balasan/Keluar, dan Pengiriman Laporan.
- Monitoring Laporan RP, BT, dan Pelatihan menampilkan nomor/tanggal Surat Masuk, nomor/tanggal Surat Balasan/Keluar, nomor Surat Kunjungan, dan nomor Surat Tugas.
- Monitoring Laporan RP sekarang memakai ID kegiatan RP dari Administrasi RP (`RP-*`) sebagai ID utama pada daftar dan detail; `LAP-*` tetap menjadi kunci internal untuk histori/detail laporan.
- Sebanyak **26 data penagihan** dari sumber lama tetap dipertahankan.
- Baris Swasta tanpa nama kebun tetap dimuat dengan lokasi `Belum ditentukan`.
- Nomor ganda pada Reg II KSO dibuat unik agar tidak saling menimpa.
- Trigger perubahan otomatis dipindahkan ke sumber monitoring Rekomendasi yang baru.
- Menu Administrasi → Import / Export menjadi pusat kontrol dengan tombol **Sinkronkan Semua Sumber** untuk RP, Bantuan Teknis, dan Administrasi.
- Sinkronisasi Bantuan Teknis dan Administrasi tetap aktif.
- Data korektor Bantuan Teknis dipetakan dari nama korektor pada baris 2 serta pasangan tanggal masuk/selesai kolom J:Y di setiap sheet sumber.
- Sumber BT terverifikasi mempunyai **166 laporan dengan korektor** dan **395 tahap korektor**; nama terakhir disimpan ke `MONITORING_LAPORAN.korektor_terakhir` dan setiap tahap disimpan ke `HISTORI_LAPORAN`.
- Monitoring Laporan BT sekarang menampilkan kolom dan pencarian **Korektor Terakhir**, indikator jumlah korektor terpantau, serta tabel **Riwayat Korektor** pada detail laporan.
- Laporan BT baru disimpan dengan `workflow=BT`; filter Monitoring Laporan BT tetap membaca data historis `workflow=UMUM` selama subbagiannya `BT`.
- Database Administrasi baru telah dipetakan berdasarkan nama header, meliputi sheet `Bu Sri & Bu Desii`, `Laporan`, `Tim`, dan `Menu Drop down`.
- Submenu **Administrasi RP**, **Administrasi BT**, dan **Administrasi Pelatihan** menampilkan perusahaan, kebun/lokasi, perihal, kegiatan, leader, petugas, Surat Masuk/Keluar beserta tanggal, dan status monitoring laporan.
- Sebanyak **821 record Administrasi** diproses: 820 dari sheet utama dan 1 laporan historis BT tanpa baris utama.
- Hasil Administrasi operasional terdiri dari **226 RP**, **549 BT**, dan **46 Pelatihan (TR)**; seluruh 821 record mempunyai relasi monitoring laporan.
- Sebanyak **1.403 korespondensi**, **852 baris petugas**, **403 penagihan**, dan **240 nilai dropdown** telah masuk ke database master.
- Sebanyak **14 kegiatan** dicocokkan langsung ke kegiatan master RP/BT/TR; data lain dipertahankan sebagai riwayat Administrasi tersendiri untuk mencegah salah gabung.
- Audit sebelumnya atas 775 record Administrasi RP/BT menemukan **0 tanggal tidak valid**; pemetaan TR juga lulus pengujian tanggal dan kategori.
- Backup, audit trail, filter per subbagian, dan static test tersedia.
- Diagram alur integrasi tersimpan di `docs/alur-integrasi-dashboard.png` (sumber editable: `docs/alur-integrasi-dashboard.html`).

## Sumber data aktif

| Subbagian | Spreadsheet ID | Status |
|---|---|---|
| Rekomendasi Pemupukan | `1FDJQIZnrPDgAtTOoyLryTqlnRL69xGgBBzmNPmwzctc` | Terhubung — 170 laporan, 461 penugasan korektor/verifikator, 14 nama unik |
| Administrasi/penagihan | `1k587rOiqhWk2uIWrSlhxxjRmD_LW1biy1SR76KsTk0o` | Terhubung — 821 record, seluruh 4 sheet dipetakan |
| Bantuan Teknis | `1P7_1s7YQYxj2Ee-IsZQoQjEd0lsJT7ANfD2iH2dOgB8` | Terhubung — 320 laporan sumber, 166 mempunyai korektor, 395 tahap korektor |

## Verifikasi terakhir

- Waktu sinkronisasi Administrasi terakhir: **8 September 2026 pukul 18:31 WIB**.
- Status internal: sumber Administrasi baru aktif, trigger perubahan berhasil dipindahkan, dan audit tanggal `errors=0`.
- Verifikasi sumber pada **9 September 2026** menemukan **46 record TR**, dari `TR-S-28` sampai `TR-N-821`; filter API dan jalur menu Pelatihan telah diuji.
- Verifikasi sumber BT pada **9 September 2026** menemukan **320 laporan**, **166 laporan dengan korektor**, dan **395 penugasan/tahap korektor**.
- Kode v2.5.0 telah dirilis ke produksi sebagai deployment **@46**; pemuatan data korektor ke database produksi memerlukan eksekusi tombol **Sinkronkan BT** karena Execution API menolak eksekusi terminal.
- Verifikasi workbook dan sumber Google RP pada **9 September 2026** menemukan **170 laporan**, **461 penugasan korektor/verifikator**, dan **14 nama unik**; contoh tanggal sumber tetap tepat `25-09-2025` dan `27-02-2026` setelah normalisasi timezone.
- Migrasi RP dijalankan melalui akun pemilik dashboard, dengan backup Google Sheet sebelum perubahan; endpoint migrasi sekali pakai telah dihapus kembali.
- Kode final v2.6.0 telah dirilis ke produksi sebagai deployment **@50**.
- Migrasi label **KOREKTOR FINAL** berhasil dijalankan melalui akun pemilik dengan backup sumber Google, lalu endpoint migrasi sekali pakai dihapus.
- Kode v2.6.1 telah dirilis ke produksi sebagai deployment **@52**.
- Kode v2.6.2 untuk label Korektor Final RP dan BT telah dirilis ke produksi sebagai deployment **@54**.
- Sinkronisasi BT sekali jalan telah dijalankan melalui akun pemilik untuk memperbarui histori database master; endpoint sementara kemudian dihapus.
- Sinkronisasi enam checkpoint RP dan BT telah dijalankan melalui akun pemilik; endpoint sementara kemudian dihapus.
- Sumber terdiri dari `REG I P`, `REG 1 KSO`, `Reg II P`, `Reg II KSO`, `Reg III P`, `Reg IV P`, `Reg V P`, `REG 6 KSO`, `Reg VII`, dan `Swasta`.
- Pemeriksaan `node .\tests\gas_static_test.js` lulus.
- Pemeriksaan `python -m unittest discover -s .\tests -p "test_*.py"` lulus: **5 dari 5 test**.
- Standardisasi ID kategori v2.6.5 dijalankan ulang melalui akun pemilik pada **9 September 2026**; deployment final tanpa endpoint maintenance aktif sebagai **@66**.
- Perbaikan workflow BT v2.6.6 dibuat pada **10 September 2026 pukul 10:36 WIB**; source berhasil `clasp push`, versi Apps Script **67** dibuat, dan deployment produksi aktif sebagai **@68**.
- Kode v2.6.7 untuk ID Administrasi sebagai acuan RP/BT/TR dan kolom surat monitoring laporan dirilis pada **10 September 2026 pukul 12:02 WIB**; source berhasil `clasp push`, versi Apps Script **71** dibuat, dan deployment produksi aktif sebagai **@72**.
- Kode v2.6.8 untuk koneksi ID Monitoring Laporan RP ke ID Administrasi RP dirilis pada **10 September 2026 pukul 14:30 WIB**; source berhasil `clasp push`, versi Apps Script **73** dibuat, dan deployment produksi aktif sebagai **@74**.
- Kode v2.7.0 untuk menu Tindakan kelengkapan kegiatan, pembaruan korektor/checkpoint laporan, dan kolom Link Laporan NET dirilis sebagai versi Apps Script **77**; deployment produksi aktif sebagai **@78**.
- Koreksi v2.7.1 disiapkan untuk memindahkan kegiatan `FS.lahan` dan `Ev.Prod` yang salah berkategori RP ke BT, dengan backup sumber dan sinkronisasi relasi database melalui menu **Perbaiki Kategori BT**.
- Pada **11 September 2026**, dua kegiatan sumber Administrasi berhasil dikoreksi dan disinkronkan ke database master sebagai `BT-N-70` (`FS.lahan`) dan `BT-N-75` (`Ev.Prod`); laporan aktif menjadi `LAP-BT-N-70` dan `LAP-BT-N-75`, dengan relasi surat dan tim terverifikasi ke ID BT.
- Database master Google Sheet berhasil diverifikasi melalui sesi Chrome pemilik dengan status **Saved to Drive**; baris RP lama tetap tersimpan sebagai arsip untuk menjaga histori.
- Kode v2.7.1 berhasil dibuat sebagai Apps Script version **81** dan deployment produksi aktif sebagai **@82**. Dashboard dikembalikan ke Chrome yang sedang berjalan tanpa memilih profil tertentu.
- Kode v2.8.0 menambahkan tindakan enam checkpoint pada setiap monitoring laporan: Draft/PIC, Korektor 1, Korektor 2, Revisi/Cetak 1, Korektor Final, dan Selesai/NET.
- Tindakan checkpoint tersedia pada setiap baris Monitoring Laporan dan pada detail laporan; field yang tampil menyesuaikan checkpoint yang dipilih.
- Setiap checkpoint menyimpan perubahan laporan dan histori dengan transaction lock, backup, audit trail, dan satu histori per checkpoint.
- Kode v2.8.0 berhasil dibuat sebagai Apps Script version **85** dan deployment produksi aktif sebagai **@86**; kolom Tindakan terverifikasi tampil pada halaman Monitoring Laporan melalui Chrome aktif.
- Kode v2.9.0 berhasil dibuat sebagai Apps Script version **87** dan deployment produksi aktif sebagai **@89**; menu Rekap Petugas dan import `MASTER_PETUGAS` terverifikasi melalui Chrome aktif.
- Kode v2.10.0 berhasil dibuat sebagai Apps Script version **90** dan deployment produksi aktif sebagai **@90**; `MASTER_PETUGAS_UPJKP` terisi melalui Rekap Petugas dan terverifikasi lewat export Google Sheet.
- Percobaan `clasp run syncAdministrasi --params "[{}]"` setelah deployment final **@72** pada **10 September 2026 pukul 12:20 WIB** ditolak oleh Execution API (`Unable to run script function`), sehingga migrasi data aktual perlu dipicu dari akun pemilik lewat **Administrasi -> Import / Export -> Sinkronkan Administrasi** atau **Sinkronkan Semua Sumber**.
- Dashboard produksi dibuka di Chrome Profile 2 pada halaman **Import / Export** agar sinkronisasi Administrasi dapat dijalankan dari UI pemilik.
- Verifikasi endpoint `?status=rp` dari terminal pada **10 September 2026** dialihkan ke halaman login Google karena akses web app masih `MYSELF`; deployment dikonfirmasi melalui `clasp deployments`.
- Branch lokal `main` tersinkron dengan `origin/main` setelah commit `ec1920f`.

## Checkpoint untuk dilanjutkan

- Checkpoint aktif: koreksi kategori BT v2.7.1 selesai dan fitur tindakan enam checkpoint v2.8.0 sudah dirilis; deployment produksi menggunakan URL yang sama pada **@86 / Apps Script version 85**. Dashboard/Monitoring Laporan terakhir dibuka pada Chrome yang sedang berjalan.
- Verifikasi terakhir: `node .\tests\gas_static_test.js` lulus dan `python -m unittest discover -s .\tests -p "test_*.py"` lulus **5 dari 5 test**.
- Fitur v2.7.0 yang siap digunakan: indikator kelengkapan, menu Tindakan kegiatan/surat, menu Lengkapi laporan, menu Atur korektor, histori korektor tanpa duplikasi, dan kolom Link Laporan NET.
- Checkpoint terbaru disimpan pada **11 September 2026** setelah deployment **@82 / v2.7.1** dan koreksi dua kegiatan `FS.lahan`/`Ev.Prod` dari RP ke BT di sumber Administrasi serta database master.
- Checkpoint sebelumnya disimpan pada **10 September 2026 pukul 12:20 WIB** setelah deployment **@72 / v2.6.7** untuk ID Administrasi sebagai acuan RP/BT/TR dan kolom surat monitoring laporan.
- Checkpoint sebelumnya disimpan pada **10 September 2026 pukul 10:36 WIB** setelah deployment **@68 / v2.6.6** untuk kompatibilitas workflow BT.
- Checkpoint ini disimpan pada **9 September 2026 pukul 18:45 WIB** setelah dashboard produksi dibuka ulang dari Chrome Profile 2.
- Checkpoint terbaru dibuat pada **9 September 2026** setelah deployment **@66 / v2.6.5** untuk menyeragamkan ID aktif menjadi `RP-*`, `BT-*`, dan `TR-*`.
- Kondisi kerja terakhir: dashboard produksi aktif pada v2.7.1; menu **Perbaiki Kategori BT** sudah dijalankan dan master Google Sheet sudah terbarui. File Excel lokal tetap merupakan snapshot/manual, bukan database yang tersinkron otomatis.
- Tindak lanjut aktif: gunakan tindakan checkpoint pada masing-masing laporan; pengisian data aktual dilakukan oleh operator sesuai tahap laporan.
- Perubahan kode dan dokumentasi v2.7.0 telah dirilis ke Apps Script dan dicatat di GitHub.
- Pusat input/sinkronisasi berada di **Administrasi → Import / Export → Sinkronkan Semua Sumber**.
- Jangan mengaktifkan kembali sumber lama `1tNZmCWPzHOB69yEwNOJTijwQxCyJkzMnilh79T4FFtc`.
- Saat melanjutkan, mulai dengan `git status --short --branch`, buka `PROGRESS.md`, lalu verifikasi status `?status=rp` sebelum perubahan baru.

## Tindak lanjut

- Isi nama kebun pada 19 baris Swasta yang saat ini bertanda `Belum ditentukan` bila informasinya tersedia.
- Gunakan **Import / Export → Sinkronkan Rekomendasi** setelah sumber diubah, lalu refresh dashboard.
- Atur akses deployment menjadi **Anyone with Google account** bila dashboard akan dipakai pengguna internal selain pemilik.
