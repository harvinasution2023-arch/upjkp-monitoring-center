# Changelog

## 2026-09-10 - v2.7.0

- Daftar kegiatan dan Administrasi menampilkan indikator kelengkapan data serta menu Tindakan untuk melengkapi data kegiatan dan surat terkait.
- Monitoring Laporan RP, BT, dan Pelatihan menambahkan menu Tindakan untuk memperbarui checkpoint/korektor, dokumen, dan catatan laporan.
- Monitoring laporan menambahkan kolom Link Laporan NET yang membuka link Drive/berkas NET jika tersedia.
- Deployment produksi diperbarui ke **@76**.

## 2026-09-10 — v2.6.8

- Monitoring Laporan RP sekarang menampilkan ID kegiatan RP dari Administrasi RP (`RP-*`) sebagai ID utama pada daftar dan detail laporan.
- ID laporan teknis `LAP-*` tetap disimpan sebagai kunci internal agar klik detail dan histori laporan tetap stabil.
- Deployment produksi diperbarui ke **@74**.

## 2026-09-10 — v2.6.7

- ID dari database Administrasi menjadi acuan aktif untuk kegiatan RP, BT, dan Pelatihan (`RP-*`, `BT-*`, `TR-*`) saat sinkronisasi menemukan record yang cocok.
- ID kegiatan/laporan/tagihan lama yang cocok diarsipkan dengan catatan migrasi agar data baru dari Administrasi otomatis terhubung ke subbagian terkait tanpa duplikasi.
- Sinkronisasi Administrasi menambahkan korespondensi `SURAT KUNJUNGAN` dan `SURAT TUGAS` dari kolom sumber Administrasi.
- Monitoring Laporan RP, BT, dan Pelatihan menampilkan nomor/tanggal Surat Masuk, nomor/tanggal Surat Balasan/Keluar, serta nomor Surat Kunjungan/Surat Tugas.
- Dropdown template korespondensi diperluas mengikuti jenis surat Administrasi.
- Deployment produksi diperbarui ke **@72**.

## 2026-09-10 — v2.6.6

- Menyimpan laporan Bantuan Teknis baru dengan `workflow=BT` agar detail laporan memakai timeline enam checkpoint BT.
- Filter Monitoring Laporan BT tetap menerima data historis `workflow=UMUM` selama subbagian kegiatannya `BT`.
- Dropdown template monitoring laporan menambahkan opsi workflow `BT`.
- Deployment produksi diperbarui ke **@68**.

## 2026-09-09 — v2.6.5

- Menyeragamkan ID aktif berdasarkan kategori: `RP-*` untuk Rekomendasi Pemupukan, `BT-*` untuk Bantuan Teknis, dan `TR-*` untuk Pelatihan.
- Input manual dari dashboard sekarang membuat ID `RP-YYYY-####`, `BT-YYYY-####`, atau `TR-YYYY-####`, bukan `ACT-YYYY-####`.
- Sinkronisasi Administrasi memigrasikan `ADM-SRC-RP-*`, `ADM-SRC-BT-*`, dan `ADM-SRC-TR-*` ke ID kategori aktif serta mengarsipkan report/billing lama agar KPI tidak dobel.
- Prefix lama `RP-BT`, `RP-FMT`, `RP-MON`, dan `ADM-SRC-RP/BT/TR` hanya dipakai sebagai legacy key untuk arsip/migrasi, bukan ID aktif baru.
- Data demo ikut memakai prefix kategori.
- Deployment produksi diperbarui ke **@66**; sinkronisasi RP dan Administrasi dijalankan ulang melalui akun pemilik, lalu endpoint maintenance sementara dihapus.

## 2026-09-09 — v2.6.4

- Mengganti prefix ID aktif RP dari sumber Format Seragam menjadi `RP-FMT` / `LAP-RP-FMT` agar tidak lagi muncul kode `BT` pada kegiatan atau detail laporan RP.
- Sinkronisasi RP tetap mengenali prefix/tag lama `RP-BT` hanya untuk mengarsipkan data aktif yang sudah terlanjur dibuat.
- Deployment produksi diperbarui ke **@63** dan sinkronisasi RP dijalankan ulang melalui akun pemilik.

## 2026-09-09 — v2.6.3

- Data lama pada tahap `KOREKTOR FINAL` atau `PENGIRIMAN` dianggap **SELESAI** walaupun tanggal NET kosong.
- Form **Catat kegiatan** menambahkan input `Tanggal NET (opsional)` dan membuat record monitoring baru dengan checkpoint NET jika diisi.

## 2026-09-09 — v2.6.2

- Menetapkan tahap koreksi setelah `CETAK 1` sebagai **KOREKTOR FINAL** untuk RP.
- Menyamakan pemetaan BT: korektor terakhir setelah Korektor 1/2 ditampilkan sebagai **KOREKTOR FINAL** pada histori dan detail dashboard.
- Memperbarui timeline, status checkpoint, histori, dan `korektor_terakhir` agar nama korektor final tampil konsisten.
- Deployment produksi diperbarui ke versi v2.6.2 untuk RP dan BT.
- Alur monitoring diringkas menjadi enam checkpoint: DRAFT, Korektor 1, Korektor 2, Cetak 1, Korektor Final, dan NET.
- Semua monitoring laporan menetapkan status **SELESAI** ketika checkpoint atau tanggal NET tercatat; laporan NET tidak lagi dianggap menunggu atau terlambat.
- Memigrasikan 170 laporan sumber RP ke label baru dengan backup Google Sheet otomatis.

## 2026-09-09 — v2.6.0

- Membaca nama korektor/verifikator pada 170 laporan Rekomendasi Pemupukan secara terpisah dari checkpoint terakhir sehingga tahap cetak/kirim tidak lagi mengosongkan `korektor_terakhir`.
- Memetakan 461 penugasan korektor/verifikator RP ke `HISTORI_LAPORAN`, termasuk nama yang sudah ditugaskan walaupun tanggal proses belum diisi.
- Memperbaiki pergeseran kolom korektor khusus sheet `Reg V P` (nama kedua di kolom I dan tanggalnya di kolom J).
- Menambahkan indikator **Korektor terpantau** pada Dashboard Rekomendasi dan mempertahankan kolom serta detail riwayat korektor pada Monitoring Laporan.
- Mengisi workbook **Monitoring Rekomendasi Pemupukan - Format Seragam.xlsx** dengan nama korektor dan pasangan tanggal seperti format Bantuan Teknis; backup sebelum perubahan turut disimpan.
- Memperluas konektor format seragam agar membaca header nama korektor, mengisi `korektor_terakhir`, dan menyimpan riwayat korektor.

## 2026-09-09 — v2.5.0

- Membaca nama korektor Bantuan Teknis secara dinamis dari baris 2 setiap sheet regional dan memasangkannya dengan tanggal masuk/keluar pada kolom J–Y.
- Menyimpan setiap tahap korektor BT ke `HISTORI_LAPORAN` serta mengisi `korektor_terakhir` pada `MONITORING_LAPORAN`.
- Menambahkan kolom **Korektor Terakhir**, pencarian korektor, indikator jumlah korektor, dan tabel **Riwayat Korektor** pada Dashboard BT.
- Memperbaiki tanggal checkpoint agar mengikuti tanggal cetak/pengiriman ketika laporan sudah melewati tahap koreksi.

## 2026-09-09 — v2.4.0

- Membuka 46 record Administrasi berkode `TR` yang sebelumnya sudah tersinkron ke master tetapi belum diloloskan oleh API monitoring Administrasi.
- Menambahkan submenu **Administrasi Pelatihan** pada subbagian Pelatihan dengan data perusahaan, lokasi, perihal, kegiatan, leader, petugas, Surat Masuk/Keluar, dan status laporan.
- Menambahkan halaman **Monitoring Laporan Pelatihan** serta pintasan dari Dashboard Pelatihan.
- Memperluas Dashboard Administrasi dari RP/BT menjadi RP/BT/TR beserta indikator jumlah data Pelatihan.

## 2026-09-08 — v2.3.0

- Menghubungkan spreadsheet **Data base Admin** `1k587rOiqhWk2uIWrSlhxxjRmD_LW1biy1SR76KsTk0o` sebagai sumber Administrasi aktif.
- Memetakan seluruh sheet sumber Administrasi: `Bu Sri & Bu Desii`, `Laporan`, `Tim`, dan `Menu Drop down`.
- Menggabungkan field perusahaan, kebun/lokasi, perihal, kegiatan, leader, dan petugas ke kegiatan RP/BT yang cocok tanpa menggandakan record master.
- Menambahkan relasi nomor/tanggal Surat Masuk serta Surat Balasan/Keluar melalui tabel korespondensi.
- Menghubungkan data Administrasi ke monitoring laporan RP dan BT serta menyediakan submenu **Administrasi RP** dan **Administrasi BT**.
- Mempertahankan data sumber yang tidak dapat dicocokkan secara pasti sebagai record historis Administrasi tersendiri agar tidak salah menimpa kegiatan RP/BT.
- Menormalkan campuran tanggal `DD/MM/YYYY`, `MM/DD/YYYY`, dan `YYYY/DD/MM`, serta menolak tanggal yang tidak valid.
- Menyinkronkan 821 record Administrasi, 1.403 korespondensi, 852 baris petugas, 403 penagihan, dan 240 nilai dropdown ke database master.

## 2026-09-07 — Centralisasi sumber melalui Administrasi

- Menambahkan tombol **Sinkronkan Semua Sumber** pada area Administrasi → Import / Export.
- Menjalankan sinkronisasi Rekomendasi Pemupukan, Bantuan Teknis, dan Administrasi secara berurutan dengan ringkasan hasil per sumber.

## 2026-09-07 — v2.2.0

- Mengganti sumber produksi ke Google Sheet **Database Rekomendasi Pemupukan** baru yang seragam dengan format Bantuan Teknis (`Data R1`–`Data SW`).
- Menyinkronkan 170 kegiatan dan 170 laporan Rekomendasi Pemupukan, termasuk 586 baris tim dari kolom PIC, tanpa error.
- Mempertahankan 19 baris Swasta yang belum memiliki nama kebun dengan penanda `Belum ditentukan`.
- Mencegah nomor sumber ganda pada Reg II KSO saling menimpa.
- Memisahkan sumber monitoring rekomendasi dari sumber Administrasi/penagihan serta mempertahankan 26 data penagihan lama.
- Memindahkan trigger perubahan otomatis ke Google Sheet rekomendasi yang baru.

## 2026-09-07 — v2.1.0

- Menambahkan konektor khusus Rekomendasi Pemupukan ke Google Sheet operasional.
- Memetakan kegiatan RP, monitoring laporan, histori checkpoint, tim, perusahaan, dan penagihan berdasarkan ID sumber.
- Memastikan laporan rekomendasi menggunakan workflow `RP` agar tampil pada Dashboard Rekomendasi.
- Mengarsipkan record laporan lama yang terduplikasi setelah migrasi ke ID laporan dashboard.
- Menambahkan sinkronisasi manual dari Pusat Data dan sinkronisasi otomatis harian/perubahan sumber.
- Memperbaiki pemetaan tahun, status biaya, workflow, serta relasi laporan dan tim pada konektor database operasional.

## 2026-09-05 — v2.0.0

- Menambahkan dashboard khusus Rekomendasi & JID, Bantuan Teknis, Pelatihan, dan Administrasi.
- Menghubungkan seluruh dashboard subbagian ke agregasi Dashboard Utama melalui database master yang sama.
- Menambahkan KPI kegiatan, perusahaan, laporan aktif/selesai/terlambat, nilai kegiatan, status laporan, serta progres regional.
- Menambahkan indikator operasional khusus untuk setiap subbagian.
- Menambahkan filter tahun dan pintasan kembali ke Dashboard Utama.
- Memperbarui Web App aktif ke deployment `@17`.

## 2026-09-05 — v1.9.1

- Mengganti label menu **Regional** menjadi **Perusahaan** pada Rekomendasi Pemupukan dan Bantuan Teknis.
- Memperbarui Web App aktif ke deployment `@16`.

## 2026-09-05 — v1.9.0

- Menyamakan format inti Rekomendasi Pemupukan dengan Bantuan Teknis.
- Menambahkan menu Kegiatan, Regional, serta Tim & SPJ untuk Rekomendasi Pemupukan.
- Mempertahankan modul khusus Laboratorium, Lampiran Dosis, JID, dan Katalog Produk.
- Memisahkan data laporan, regional, dan tim berdasarkan subbagian terkait.
- Memperbarui Web App aktif ke deployment `@15`.

## 2026-09-04 — v1.8.0

- Menambahkan sinkronisasi sheet **Tim** Administrasi ke `TIM_SPJ`.
- Menambahkan sinkronisasi sheet **Laporan** Administrasi ke `MONITORING_LAPORAN`.
- Menambahkan histori checkpoint ke `HISTORI_LAPORAN`.
- Menambahkan dashboard khusus Administrasi.
- Menambahkan menu Dashboard Administrasi dan Daftar Pekerjaan Administrasi.
- Menghubungkan sumber Administrasi Google Sheet terbaru.
- Menjaga agregasi data ke Dashboard Utama.

## v1.7.0

- Menambahkan area kerja Administrasi khusus.
- Menambahkan KPI Administrasi, tahapan administrasi, billing, RKAP, dan dokumen.

## v1.6.0

- Menambahkan konektor Administrasi dan sinkronisasi kegiatan utama.

## v1.5.0

- Menambahkan konektor Google Sheet Bantuan Teknis.
- Menambahkan sinkronisasi otomatis melalui trigger edit dan pemeriksaan harian.

## v1.3.0–v1.4.0

- Menambahkan template empat subbagian.
- Menambahkan import template ke database master.
- Menambahkan desain dashboard light enterprise.
