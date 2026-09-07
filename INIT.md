# Inisialisasi UPJKP Monitoring Center

## Prasyarat

- Google Apps Script dan Google Sheet master sudah tersedia.
- `clasp` sudah login ke akun Google yang memiliki project Apps Script.
- Git sudah terhubung ke repository GitHub privat.

## Menjalankan ulang deployment

```powershell
Set-Location "D:\Dasboard monitoring kegiatan UPJKP-PPKS\google-apps-script"
clasp push --force
clasp deploy --deploymentId AKfycbxT0gids44DaWESXxIDj6Mrjc146qhsqoq-4b-605j3bLrSfjyCNLELdbIm_FN0fJP-6A --description "UPJKP Monitoring Center release"
```

URL aplikasi:

https://script.google.com/macros/s/AKfycbxT0gids44DaWESXxIDj6Mrjc146qhsqoq-4b-605j3bLrSfjyCNLELdbIm_FN0fJP-6A/exec

## Menghubungkan sumber data

1. Buka **Administrasi → Import / Export**.
2. Klik **Sinkronkan Rekomendasi** untuk membaca sepuluh tab monitoring regional dan swasta.
3. Klik **Sinkronkan Administrasi** jika diperlukan.
4. Klik **Sinkronkan BT** untuk Bantuan Teknis.
5. Berikan izin Google jika diminta, lalu refresh Dashboard Utama.

Sumber aktif:

- Rekomendasi Pemupukan: `1lOn9KmGBMgWiroBHzIZ-JGPR0AZ-8LnEkwNxbyJXsGg`
- Penagihan/Administrasi: `12gHG4c4t8_JeL_nW2YJ4bmgSCKE7krvSB4turxR6TTE`
- Administrasi: `12gHG4c4t8_JeL_nW2YJ4bmgSCKE7krvSB4turxR6TTE`
- Bantuan Teknis: `1P7_1s7YQYxj2Ee-IsZQoQjEd0lsJT7ANfD2iH2dOgB8`

## Pengujian lokal

```powershell
Set-Location "D:\Dasboard monitoring kegiatan UPJKP-PPKS\google-apps-script"
node ..\tests\gas_static_test.js
```

## GitHub

```powershell
Set-Location "D:\Dasboard monitoring kegiatan UPJKP-PPKS"
git pull origin main
git push origin main
```
