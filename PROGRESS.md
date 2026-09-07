# Progress UPJKP Monitoring Center

## Status terakhir

- Status: **Berjalan**
- Deployment aktif: **@25**
- URL aplikasi: `https://script.google.com/macros/s/AKfycbxT0gids44DaWESXxIDj6Mrjc146qhsqoq-4b-605j3bLrSfjyCNLELdbIm_FN0fJP-6A/exec`
- Branch GitHub: `main`
- Versi aplikasi: **v2.1.0**

## Sudah selesai

- Dashboard Utama light enterprise.
- Empat subbagian: RPJID, Bantuan Teknis, Pelatihan, Administrasi.
- Koneksi Bantuan Teknis ke Google Sheet regional.
- Koneksi Administrasi ke Google Sheet utama.
- Koneksi Rekomendasi Pemupukan ke tab `Rekapitulasi` pada Google Sheet penagihan 2026.
- Sinkronisasi Rekomendasi: 26 kegiatan, perusahaan, kontrak, invoice, jatuh tempo, dan pembayaran tanpa error.
- Sinkronisasi Administrasi: kegiatan, perusahaan, billing.
- Sinkronisasi Administrasi: Tim dan Laporan.
- Histori checkpoint laporan.
- Dashboard khusus Administrasi.
- Format inti Rekomendasi Pemupukan mengikuti Bantuan Teknis: Kegiatan, Monitoring Laporan, Perusahaan, serta Tim & SPJ.
- Filter laporan, regional, dan tim dipisahkan per subbagian agar data tidak bercampur.
- Dashboard khusus tersedia untuk seluruh subbagian: Rekomendasi & JID, Bantuan Teknis, Pelatihan, dan Administrasi.
- Dashboard subbagian dan Dashboard Utama membaca database master yang sama serta teragregasi otomatis.
- Repository GitHub privat.
- Static test Apps Script lulus.

## Sumber data aktif

| Subbagian | Spreadsheet ID | Status |
|---|---|---|
| Rekomendasi Pemupukan | `12gHG4c4t8_JeL_nW2YJ4bmgSCKE7krvSB4turxR6TTE` | Terhubung — 26 kegiatan dan 26 penagihan |
| Administrasi | `12gHG4c4t8_JeL_nW2YJ4bmgSCKE7krvSB4turxR6TTE` | Terhubung |
| Bantuan Teknis | `1P7_1s7YQYxj2Ee-IsZQoQJEd0lsJT7ANfD2iH2dOgB8` | Terhubung |

## Tindak lanjut

- Jalankan tombol sinkronisasi satu kali setelah deployment baru.
- Pastikan sheet sumber dibagikan kepada akun pemilik Apps Script.
- Tambahkan sumber monitoring laporan/tim Rekomendasi dan sumber Pelatihan jika sudah tersedia.
- Jika diperlukan, tambahkan formulir edit detail delapan tahap langsung dari UI.
- Atur akses deployment menjadi **Anyone with Google account** untuk pengguna internal.

## Checkpoint untuk dilanjutkan

Checkpoint disimpan pada **7 September 2026** setelah rilis `v2.1.0`.

- Deployment produksi aktif: `@25` — **UPJKP Monitoring Center v2.1.0 Rekomendasi Pemupukan database**.
- Sumber produksi Rekomendasi adalah workbook **Pencatatan penagihan admin 2026**, tab `Rekapitulasi`.
- Sinkronisasi terakhir: **7 September 2026 pukul 10:14 WIB**.
- Hasil verifikasi database master: **26 kegiatan RP**, **26 penagihan**, **0 error**.
- Seluruh 26 baris merupakan kombinasi perusahaan dan kegiatan yang unik; tidak ada duplikasi termin/pelunasan pada hitungan kegiatan.
- Data sumber saat ini berisi kegiatan dan penagihan. Monitoring laporan serta tim belum tersedia pada workbook ini, sehingga masing-masing masih 0.
- Konektor memetakan format angka Indonesia/US, tanggal berbahasa Indonesia, jatuh tempo bulanan, nilai kontrak, invoice, pembayaran, NPWP, dan alamat.
- Sinkronisasi dapat dijalankan dari **Import / Export → Sinkronkan Rekomendasi** dan diperbarui melalui trigger/periksa harian.
- Pemeriksaan `node .\tests\gas_static_test.js` lulus.
- Pemeriksaan `python -m unittest discover -s .\tests -v` lulus: **5 dari 5 test**.
- Status internal deployment terverifikasi: `connected=true`, `sourceLayout=REKAPITULASI_PENAGIHAN`.
- Pemanggilan `clasp run` tetap tidak tersedia karena proyek memakai default GCP project; sinkronisasi produksi berhasil melalui Web App terautentikasi.
- Branch lokal `main` lebih maju dari `origin/main`; push GitHub tertahan karena kredensial GitHub belum tersedia pada sesi terminal.

Langkah awal saat melanjutkan:

1. Jalankan `git status --short --branch` dan `clasp deployments`.
2. Buka deployment `@25`, login sebagai pemilik, lalu lakukan pemeriksaan visual Dashboard Rekomendasi dan menu Penagihan.
3. Jika data sumber berubah, jalankan sinkronisasi Rekomendasi, Administrasi, atau Bantuan Teknis lalu refresh Dashboard Utama.
4. Login GitHub pada terminal dan jalankan `git push origin main` untuk mengirim seluruh commit lokal.
5. Lanjutkan integrasi monitoring laporan/tim Rekomendasi dan sumber Pelatihan setelah spreadsheet tersedia.
