# Progress UPJKP Monitoring Center

## Status terakhir

- Status: **Berjalan**
- Deployment aktif: **@30**
- URL aplikasi: `https://script.google.com/macros/s/AKfycbxT0gids44DaWESXxIDj6Mrjc146qhsqoq-4b-605j3bLrSfjyCNLELdbIm_FN0fJP-6A/exec`
- Branch GitHub: `main`
- Versi aplikasi: **v2.2.0**

## Sudah selesai

- Dashboard Utama dan dashboard khusus empat subbagian.
- Google Sheet khusus **Monitoring Rekomendasi Pemupukan** dengan sepuluh tab regional/swasta.
- Sinkronisasi Rekomendasi Pemupukan ke kegiatan, laporan, histori checkpoint, perusahaan, dan tim.
- Sebanyak **170 kegiatan**, **170 laporan**, dan **587 baris tim** terverifikasi tanpa error.
- Sebanyak **26 data penagihan** dari sumber lama tetap dipertahankan.
- Baris Swasta tanpa nama kebun tetap dimuat dengan lokasi `Belum ditentukan`.
- Nomor ganda pada Reg II KSO dibuat unik agar tidak saling menimpa.
- Trigger perubahan otomatis dipindahkan ke sumber monitoring Rekomendasi yang baru.
- Sinkronisasi Bantuan Teknis dan Administrasi tetap aktif.
- Backup, audit trail, filter per subbagian, dan static test tersedia.

## Sumber data aktif

| Subbagian | Spreadsheet ID | Status |
|---|---|---|
| Rekomendasi Pemupukan | `1lOn9KmGBMgWiroBHzIZ-JGPR0AZ-8LnEkwNxbyJXsGg` | Terhubung — 170 kegiatan, 170 laporan, 587 tim |
| Administrasi/penagihan | `12gHG4c4t8_JeL_nW2YJ4bmgSCKE7krvSB4turxR6TTE` | Terhubung — 26 penagihan RP dipertahankan |
| Bantuan Teknis | `1P7_1s7YQYxj2Ee-IsZQoQJEd0lsJT7ANfD2iH2dOgB8` | Terhubung |

## Verifikasi terakhir

- Waktu sinkronisasi: **7 September 2026 pukul 11:01 WIB**.
- Status internal: `connected=true`, `sourceLayout=MONITORING_REKOMENDASI_REGIONAL`, `errors=0`.
- Sumber terdiri dari `REG I P`, `REG 1 KSO`, `Reg II P`, `Reg II KSO`, `Reg III P`, `Reg IV P`, `Reg V P`, `REG 6 KSO`, `Reg VII`, dan `Swasta`.
- Pemeriksaan `node .\tests\gas_static_test.js` lulus.
- Pemeriksaan `python -m unittest discover -s .\tests -p "test_*.py"` lulus: **5 dari 5 test**.
- Branch lokal `main` lebih maju dari `origin/main`; push GitHub memerlukan kredensial sesi terminal.

## Tindak lanjut

- Isi nama kebun pada 19 baris Swasta yang saat ini bertanda `Belum ditentukan` bila informasinya tersedia.
- Gunakan **Import / Export → Sinkronkan Rekomendasi** setelah sumber diubah, lalu refresh dashboard.
- Atur akses deployment menjadi **Anyone with Google account** bila dashboard akan dipakai pengguna internal selain pemilik.
