# Desain database UPJKP Monitoring Center

Database awal menggunakan workbook Excel terstruktur. Setiap sheet diperlakukan sebagai tabel dan diakses hanya melalui backend.

## Relasi inti

```text
MASTER_PERUSAHAAN (1)
  ├──< KEGIATAN
  │     ├──< KORESPONDENSI
  │     ├──< LOKASI_KEGIATAN
  │     ├──< TIM_SPJ
  │     ├──< MONITORING_LAPORAN ──< HISTORI_LAPORAN
  │     └──< DOKUMEN
  ├──< ANALISIS_LAB
  ├──< TRANSAKSI_JID >── MASTER_PRODUK_JID ──< STOK_JID
  ├──< PENAGIHAN
  └──< KEGIATAN_PELATIHAN
          ├──< JADWAL_TENAGA_AHLI >── TENAGA_AHLI
          └──< TRANSAKSI_SOUVENIR >── MASTER_SOUVENIR
```

`PENAGIHAN` dapat merujuk kegiatan, laporan, transaksi JID, atau pelatihan melalui `source_type` dan `source_id`. `DOKUMEN`, `NOTIFIKASI`, serta `AUDIT_LOG` menggunakan pasangan jenis sumber dan ID sumber agar dapat dipakai lintas modul.

## Empat subbagian

| Kode | Subbagian |
|---|---|
| RPJID | Rekomendasi Pemupukan dan Jasa Informasi Digital |
| BT | Bantuan Teknis |
| PLT | Pelatihan |
| ADM | Administrasi |

Dashboard berada di atas keempat subbagian dan hanya menyajikan agregasi lintas unit.

## Jaminan integritas awal

- ID internal tidak berubah setelah dibuat.
- Record bisnis diarsipkan dengan `archived_at`, bukan dihapus langsung.
- Setiap transaksi write membuat backup workbook terlebih dahulu.
- Workbook hasil tulis divalidasi sebelum menggantikan database master.
- Audit log ditambahkan dalam transaksi yang sama.
- File lock mencegah dua proses lokal menulis bersamaan.
- Dokumen hanya disimpan sebagai metadata dan path relatif terhadap root OneDrive.

## Migrasi masa depan

Nama tabel, ID, dan relasi sengaja tidak bergantung pada koordinat Excel. Implementasi repository dapat diganti dengan SQLite/PostgreSQL tanpa mengubah kontrak API atau logika dashboard.
