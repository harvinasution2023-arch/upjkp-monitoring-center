# Progress UPJKP Monitoring Center

## Status terakhir

- Status: **Berjalan**
- Deployment aktif: **@17**
- URL aplikasi: `https://script.google.com/macros/s/AKfycbxT0gids44DaWESXxIDj6Mrjc146qhsqoq-4b-605j3bLrSfjyCNLELdbIm_FN0fJP-6A/exec`
- Branch GitHub: `main`
- Commit implementasi terbaru: `f2d0ab1`

## Sudah selesai

- Dashboard Utama light enterprise.
- Empat subbagian: RPJID, Bantuan Teknis, Pelatihan, Administrasi.
- Koneksi Bantuan Teknis ke Google Sheet regional.
- Koneksi Administrasi ke Google Sheet utama.
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
| Administrasi | `12gHG4c4t8_JeL_nW2YJ4bmgSCKE7krvSB4turxR6TTE` | Terhubung |
| Bantuan Teknis | `1P7_1s7YQYxj2Ee-IsZQoQJEd0lsJT7ANfD2iH2dOgB8` | Terhubung |

## Tindak lanjut

- Jalankan tombol sinkronisasi satu kali setelah deployment baru.
- Pastikan sheet sumber dibagikan kepada akun pemilik Apps Script.
- Tambahkan sumber RPJID dan Pelatihan jika sudah tersedia.
- Jika diperlukan, tambahkan formulir edit detail delapan tahap langsung dari UI.
- Atur akses deployment menjadi **Anyone with Google account** untuk pengguna internal.

## Checkpoint untuk dilanjutkan

Checkpoint disimpan pada **5 September 2026** setelah rilis `v2.0.0`.

- Deployment produksi aktif: `@17` — **UPJKP Monitoring Center v2.0.0 Subsection dashboards**.
- Commit implementasi utama: `f2d0ab1`.
- Dashboard Rekomendasi & JID, Bantuan Teknis, Pelatihan, dan Administrasi sudah tersedia dari sidebar dan kartu Dashboard Utama.
- Seluruh dashboard membaca Google Sheet master yang sama; penyimpanan dan sinkronisasi diikuti refresh agregasi Dashboard Utama.
- Label menu **Regional** telah diganti menjadi **Perusahaan** pada Rekomendasi dan Bantuan Teknis; pengelompokan data internal tetap memakai kode regional.
- Pemeriksaan `node .\tests\gas_static_test.js` lulus.
- Pemeriksaan `python -m unittest discover -s .\tests -v` lulus: **5 dari 5 test**.
- Pemanggilan `clasp run runSelfTest` belum tersedia karena izin fungsi eksekusi Apps Script, bukan karena kegagalan Web App.
- Branch lokal `main` lebih maju dari `origin/main`; push GitHub tertahan karena kredensial GitHub belum tersedia pada sesi terminal.

Langkah awal saat melanjutkan:

1. Jalankan `git status --short --branch` dan `clasp deployments`.
2. Buka deployment `@17`, login sebagai pemilik, lalu lakukan pemeriksaan visual setiap dashboard subbagian.
3. Jika data sumber berubah, jalankan sinkronisasi Administrasi dan Bantuan Teknis lalu refresh Dashboard Utama.
4. Login GitHub pada terminal dan jalankan `git push origin main` untuk mengirim seluruh commit lokal.
5. Lanjutkan integrasi sumber data RPJID dan Pelatihan setelah ID spreadsheet serta format kolom tersedia.
