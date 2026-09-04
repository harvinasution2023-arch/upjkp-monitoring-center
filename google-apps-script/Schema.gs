const APP = Object.freeze({
  NAME: 'UPJKP Monitoring Center',
  VERSION: '1.1.0',
  TIMEZONE: 'Asia/Jakarta',
  PROPERTY_DATABASE_ID: 'UPJKP_SPREADSHEET_ID',
  PROPERTY_ROOT_FOLDER_ID: 'UPJKP_ROOT_FOLDER_ID',
  PROPERTY_DOCUMENT_FOLDER_ID: 'UPJKP_DOCUMENT_FOLDER_ID',
  PROPERTY_BACKUP_FOLDER_ID: 'UPJKP_BACKUP_FOLDER_ID',
  PROPERTY_SCHEMA_VERSION: 'UPJKP_SCHEMA_VERSION',
  BACKUP_RETENTION: 30,
  LOCK_TIMEOUT_MS: 30000,
});

const SUBBAGIAN = Object.freeze({
  RPJID: 'Rekomendasi Pemupukan & Jasa Informasi Digital',
  BT: 'Bantuan Teknis',
  PLT: 'Pelatihan',
  ADM: 'Administrasi',
});

const CATEGORY_TO_SUBBAGIAN = Object.freeze({ RP: 'RPJID', JID: 'RPJID', BT: 'BT', TR: 'PLT', LN: 'ADM' });

const DB_SCHEMA = Object.freeze({
  MASTER_PERUSAHAAN: [
    'company_id', 'nama', 'nama_singkat', 'jenis_instansi', 'regional', 'alamat',
    'kontak', 'pic', 'status_aktif', 'catatan', 'created_at', 'updated_at', 'archived_at',
  ],
  KEGIATAN: [
    'activity_id', 'display_id', 'company_id', 'perusahaan', 'subbagian', 'kategori',
    'instansi', 'jenis_kegiatan', 'status_biaya', 'regional', 'kebun_lokasi', 'tahun',
    'tanggal_surat_masuk', 'no_surat_masuk', 'tanggal_spk', 'no_spk', 'batas_akhir',
    'tanggal_mulai', 'tanggal_selesai', 'nilai_kontrak', 'hpp', 'pic', 'status', 'catatan',
    'created_at', 'updated_at', 'archived_at',
  ],
  MONITORING_LAPORAN: [
    'report_id', 'activity_id', 'company_id', 'perusahaan', 'regional', 'kebun',
    'nama_kegiatan', 'tahun', 'workflow', 'tanggal_draft_masuk', 'nama_file_draft',
    'link_draft', 'checkpoint_terakhir', 'korektor_terakhir', 'tanggal_checkpoint',
    'tanggal_revisi', 'tanggal_cetak', 'tanggal_kirim', 'tanggal_net', 'rp27', 'file_net',
    'link_net', 'status', 'pic', 'folder_laporan', 'catatan', 'created_at', 'updated_at',
    'archived_at',
  ],
  HISTORI_LAPORAN: [
    'history_id', 'report_id', 'checkpoint', 'urutan', 'korektor', 'tanggal_masuk',
    'tanggal_selesai', 'document_id', 'catatan', 'created_at', 'created_by',
  ],
  KORESPONDENSI: [
    'correspondence_id', 'activity_id', 'jenis_surat', 'nomor_surat', 'tanggal',
    'perihal', 'document_id', 'created_at', 'updated_at',
  ],
  LOKASI_KEGIATAN: ['location_id', 'activity_id', 'lokasi', 'urutan', 'created_at', 'updated_at'],
  TIM_SPJ: [
    'team_id', 'activity_id', 'expert_id', 'nama', 'peran', 'hk', 'nominal_hk',
    'total_spj', 'panjar', 'realisasi_panjar', 'created_at', 'updated_at',
  ],
  ANALISIS_LAB: [
    'lab_id', 'company_id', 'perusahaan', 'activity_id', 'kebun', 'jenis_analisis',
    'jumlah_kcd', 'tahun', 'tanggal_sampel_masuk', 'tanggal_mulai_proses', 'status',
    'tanggal_selesai', 'pic', 'catatan', 'created_at', 'updated_at', 'archived_at',
  ],
  LAMPIRAN_DOSIS: [
    'dose_id', 'company_id', 'perusahaan', 'activity_id', 'report_id', 'kebun',
    'tahun_rekomendasi', 'document_id', 'tanggal_upload', 'pic', 'status',
    'catatan_verifikasi', 'created_at', 'updated_at', 'archived_at',
  ],
  MASTER_PRODUK_JID: [
    'product_id', 'nama', 'foto', 'deskripsi', 'spesifikasi', 'harga', 'satuan',
    'minimum_stok', 'status_aktif', 'created_at', 'updated_at', 'archived_at',
  ],
  STOK_JID: [
    'stock_id', 'product_id', 'jenis_mutasi', 'tanggal', 'jumlah', 'referensi',
    'pic', 'catatan', 'created_at',
  ],
  TRANSAKSI_JID: [
    'transaction_id', 'product_id', 'company_id', 'perusahaan', 'activity_id', 'billing_id',
    'tanggal', 'jumlah', 'harga_satuan', 'nilai', 'status_tagihan', 'pic', 'catatan',
    'created_at', 'updated_at', 'archived_at',
  ],
  PENAGIHAN: [
    'billing_id', 'company_id', 'perusahaan', 'kebun', 'source_type', 'source_id', 'nilai',
    'tanggal_siap_tagih', 'nomor_invoice', 'tanggal_invoice', 'jatuh_tempo', 'status',
    'total_pembayaran', 'tanggal_pembayaran', 'nomor_jurnal', 'pic', 'catatan',
    'created_at', 'updated_at', 'archived_at',
  ],
  KEGIATAN_PELATIHAN: [
    'training_id', 'company_id', 'perusahaan', 'nama_kegiatan', 'lokasi', 'tanggal_mulai',
    'tanggal_selesai', 'jumlah_peserta', 'pic', 'status', 'billing_id', 'catatan',
    'created_at', 'updated_at', 'archived_at',
  ],
  TENAGA_AHLI: [
    'expert_id', 'nama', 'bidang_keahlian', 'status_aktif', 'kontak', 'catatan',
    'created_at', 'updated_at', 'archived_at',
  ],
  JADWAL_TENAGA_AHLI: [
    'schedule_id', 'expert_id', 'activity_type', 'activity_id', 'peran', 'tanggal_mulai',
    'tanggal_selesai', 'status', 'override_reason', 'created_at', 'updated_at',
  ],
  MASTER_SOUVENIR: [
    'item_id', 'nama', 'satuan', 'minimum_stok', 'status_aktif', 'created_at',
    'updated_at', 'archived_at',
  ],
  TRANSAKSI_SOUVENIR: [
    'souvenir_tx_id', 'item_id', 'training_id', 'jenis_mutasi', 'tanggal', 'jumlah',
    'pic', 'catatan', 'created_at',
  ],
  DOKUMEN: [
    'document_id', 'module', 'record_id', 'activity_id', 'nama_asli', 'nama_simpan',
    'tipe', 'ukuran', 'checksum', 'versi', 'tahap', 'file_id', 'path_relatif', 'pic',
    'created_at', 'archived_at',
  ],
  RKAP: ['rkap_id', 'tahun', 'subbagian', 'kategori', 'bulan', 'nilai', 'created_at', 'updated_at'],
  NOTIFIKASI: [
    'notification_id', 'dedupe_key', 'kategori', 'prioritas', 'judul', 'isi',
    'source_table', 'source_id', 'target_route', 'created_at', 'read_at', 'resolved_at',
  ],
  AUDIT_LOG: [
    'audit_id', 'timestamp', 'actor', 'action', 'table_name', 'record_id', 'field_name',
    'old_value', 'new_value', 'reason', 'correlation_id',
  ],
  DROPDOWN: ['group_name', 'value', 'sort_order', 'status_aktif'],
  SYSTEM_META: ['key', 'value', 'updated_at'],
});
