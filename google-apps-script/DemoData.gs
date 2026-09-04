function offsetDate_(days) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return dateIso_(value);
}

function seedDemoData() {
  assertConfigured_();
  const timestamp = nowIso_();
  const year = Number(Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyy'));
  const companies = [
    ['PRSH-DEMO-0001', 'PT Agro Sejahtera', 'R1'],
    ['PRSH-DEMO-0002', 'PT Sawit Makmur', 'R2'],
    ['PRSH-DEMO-0003', 'PT Perkebunan Nusantara', 'R4P'],
    ['PRSH-DEMO-0004', 'PT Palma Lestari', 'SW'],
  ];
  const grouped = {
    MASTER_PERUSAHAAN: companies.map(function (item) { return { company_id: item[0], nama: item[1], nama_singkat: item[1], regional: item[2], status_aktif: 'YA', catatan: 'DEMO / SAMPLE DATA', created_at: timestamp, updated_at: timestamp }; }),
    KEGIATAN: [
      { activity_id: 'ACT-DEMO-0001', display_id: 'RP-UPJKP-0001', company_id: companies[0][0], perusahaan: companies[0][1], subbagian: 'RPJID', kategori: 'RP', jenis_kegiatan: 'Rekomendasi Pemupukan 2027', regional: 'R1', kebun_lokasi: 'Kebun A', tahun: year, tanggal_surat_masuk: offsetDate_(-50), tanggal_spk: offsetDate_(-42), nilai_kontrak: 475000000, hpp: 62000000, pic: 'Dewi', status: 'AKTIF', catatan: 'DEMO / SAMPLE DATA', created_at: timestamp, updated_at: timestamp },
      { activity_id: 'ACT-DEMO-0002', display_id: 'BT-UPJKP-0001', company_id: companies[1][0], perusahaan: companies[1][1], subbagian: 'BT', kategori: 'BT', jenis_kegiatan: 'Evaluasi TBM Kelapa Sawit', regional: 'R2', kebun_lokasi: 'Kebun Bahagia', tahun: year, tanggal_surat_masuk: offsetDate_(-28), tanggal_spk: offsetDate_(-24), batas_akhir: offsetDate_(8), nilai_kontrak: 185000000, hpp: 38500000, pic: 'Rizal', status: 'AKTIF', catatan: 'DEMO / SAMPLE DATA', created_at: timestamp, updated_at: timestamp },
      { activity_id: 'ACT-DEMO-0003', display_id: 'TR-UPJKP-0001', company_id: companies[2][0], perusahaan: companies[2][1], subbagian: 'PLT', kategori: 'TR', jenis_kegiatan: 'Pelatihan Panen Presisi', regional: 'R4P', kebun_lokasi: 'Medan', tahun: year, tanggal_surat_masuk: offsetDate_(-12), nilai_kontrak: 125000000, hpp: 31000000, pic: 'Nina', status: 'AKTIF', catatan: 'DEMO / SAMPLE DATA', created_at: timestamp, updated_at: timestamp },
      { activity_id: 'ACT-DEMO-0004', display_id: 'JID-UPJKP-0001', company_id: companies[3][0], perusahaan: companies[3][1], subbagian: 'RPJID', kategori: 'JID', jenis_kegiatan: 'Pengadaan Automatic Weather Station', regional: 'SW', kebun_lokasi: 'Kebun Lestari', tahun: year, tanggal_surat_masuk: offsetDate_(-18), nilai_kontrak: 210000000, hpp: 118000000, pic: 'Agus', status: 'AKTIF', catatan: 'DEMO / SAMPLE DATA', created_at: timestamp, updated_at: timestamp },
      { activity_id: 'ACT-DEMO-0005', display_id: 'ADM-UPJKP-0001', company_id: companies[0][0], perusahaan: companies[0][1], subbagian: 'ADM', kategori: 'LN', jenis_kegiatan: 'Pembaruan Kontrak Payung', regional: 'R1', kebun_lokasi: 'Kantor Pusat', tahun: year, tanggal_surat_masuk: offsetDate_(-9), nilai_kontrak: 0, hpp: 0, pic: 'Sari', status: 'PROSES', catatan: 'DEMO / SAMPLE DATA', created_at: timestamp, updated_at: timestamp },
    ],
    MONITORING_LAPORAN: [
      { report_id: 'LAP-DEMO-0001', activity_id: 'ACT-DEMO-0001', company_id: companies[0][0], perusahaan: companies[0][1], regional: 'R1', kebun: 'Kebun A', nama_kegiatan: 'Rekomendasi Pemupukan 2027', tahun: year, workflow: 'RP', tanggal_draft_masuk: offsetDate_(-35), checkpoint_terakhir: 'KOREKTOR 2 CETAK', korektor_terakhir: 'Edi Sigit', tanggal_checkpoint: offsetDate_(-4), status: 'KOREKTOR 2 CETAK', pic: 'Dewi', catatan: 'DEMO / SAMPLE DATA', created_at: timestamp, updated_at: timestamp },
      { report_id: 'LAP-DEMO-0002', activity_id: 'ACT-DEMO-0002', company_id: companies[1][0], perusahaan: companies[1][1], regional: 'R2', kebun: 'Kebun Bahagia', nama_kegiatan: 'Evaluasi TBM Kelapa Sawit', tahun: year, workflow: 'UMUM', tanggal_draft_masuk: offsetDate_(-26), checkpoint_terakhir: 'DIREVISI', korektor_terakhir: 'Josep', tanggal_checkpoint: offsetDate_(-2), tanggal_revisi: offsetDate_(-2), status: 'DIREVISI', pic: 'Rizal', catatan: 'DEMO / SAMPLE DATA', created_at: timestamp, updated_at: timestamp },
      { report_id: 'LAP-DEMO-0003', activity_id: 'ACT-DEMO-0004', company_id: companies[3][0], perusahaan: companies[3][1], regional: 'SW', kebun: 'Kebun Lestari', nama_kegiatan: 'Dokumentasi Instalasi AWS', tahun: year, workflow: 'UMUM', tanggal_draft_masuk: offsetDate_(-18), checkpoint_terakhir: 'DIKOREKSI', korektor_terakhir: 'Desra', tanggal_checkpoint: offsetDate_(-5), status: 'DIKOREKSI', pic: 'Agus', catatan: 'DEMO / SAMPLE DATA', created_at: timestamp, updated_at: timestamp },
      { report_id: 'LAP-DEMO-0004', activity_id: 'ACT-DEMO-0003', company_id: companies[2][0], perusahaan: companies[2][1], regional: 'R4P', kebun: 'Medan', nama_kegiatan: 'Laporan Pelatihan Panen Presisi', tahun: year, workflow: 'UMUM', tanggal_draft_masuk: offsetDate_(-40), tanggal_kirim: offsetDate_(-12), tanggal_net: offsetDate_(-13), checkpoint_terakhir: 'NET / RP27', rp27: 'RP27_Pelatihan_PTPN_Medan', status: 'NET / RP27', pic: 'Nina', catatan: 'DEMO / SAMPLE DATA', created_at: timestamp, updated_at: timestamp },
    ],
    ANALISIS_LAB: [
      { lab_id: 'LAB-DEMO-0001', company_id: companies[0][0], perusahaan: companies[0][1], activity_id: 'ACT-DEMO-0001', kebun: 'Kebun A', jenis_analisis: 'DAUN', jumlah_kcd: 128, tahun: year, tanggal_sampel_masuk: offsetDate_(-14), tanggal_mulai_proses: offsetDate_(-12), status: 'PROSES', pic: 'Budi', catatan: 'DEMO / SAMPLE DATA', created_at: timestamp, updated_at: timestamp },
      { lab_id: 'LAB-DEMO-0002', company_id: companies[1][0], perusahaan: companies[1][1], kebun: 'Kebun Bahagia', jenis_analisis: 'TANAH', jumlah_kcd: 74, tahun: year, tanggal_sampel_masuk: offsetDate_(-31), tanggal_selesai: offsetDate_(-3), status: 'SELESAI', pic: 'Budi', catatan: 'DEMO / SAMPLE DATA', created_at: timestamp, updated_at: timestamp },
    ],
    MASTER_PRODUK_JID: [
      { product_id: 'PRD-DEMO-0001', nama: 'Ombrometer', deskripsi: 'Alat ukur curah hujan manual', spesifikasi: 'Tabung presisi dan dudukan lapangan', harga: 2500000, satuan: 'unit', minimum_stok: 5, status_aktif: 'YA', created_at: timestamp, updated_at: timestamp },
      { product_id: 'PRD-DEMO-0002', nama: 'Gelas Ukur', deskripsi: 'Gelas ukur lapangan', spesifikasi: 'Skala permanen', harga: 350000, satuan: 'unit', minimum_stok: 10, status_aktif: 'YA', created_at: timestamp, updated_at: timestamp },
      { product_id: 'PRD-DEMO-0003', nama: 'Automatic Weather Station', deskripsi: 'Pemantauan cuaca otomatis', spesifikasi: 'Sensor hujan, suhu, RH, dan angin', harga: 70000000, satuan: 'unit', minimum_stok: 2, status_aktif: 'YA', created_at: timestamp, updated_at: timestamp },
    ],
    STOK_JID: [
      { stock_id: 'STK-DEMO-0001', product_id: 'PRD-DEMO-0001', jenis_mutasi: 'STOK AWAL', tanggal: offsetDate_(-90), jumlah: 18, pic: 'Agus', created_at: timestamp },
      { stock_id: 'STK-DEMO-0002', product_id: 'PRD-DEMO-0001', jenis_mutasi: 'PENJUALAN', tanggal: offsetDate_(-12), jumlah: 11, pic: 'Agus', created_at: timestamp },
      { stock_id: 'STK-DEMO-0003', product_id: 'PRD-DEMO-0002', jenis_mutasi: 'STOK AWAL', tanggal: offsetDate_(-90), jumlah: 40, pic: 'Agus', created_at: timestamp },
      { stock_id: 'STK-DEMO-0004', product_id: 'PRD-DEMO-0002', jenis_mutasi: 'PENJUALAN', tanggal: offsetDate_(-16), jumlah: 12, pic: 'Agus', created_at: timestamp },
      { stock_id: 'STK-DEMO-0005', product_id: 'PRD-DEMO-0003', jenis_mutasi: 'STOK AWAL', tanggal: offsetDate_(-90), jumlah: 4, pic: 'Agus', created_at: timestamp },
      { stock_id: 'STK-DEMO-0006', product_id: 'PRD-DEMO-0003', jenis_mutasi: 'PENJUALAN', tanggal: offsetDate_(-18), jumlah: 2, pic: 'Agus', created_at: timestamp },
    ],
    TRANSAKSI_JID: [
      { transaction_id: 'JID-DEMO-0001', product_id: 'PRD-DEMO-0003', company_id: companies[3][0], perusahaan: companies[3][1], activity_id: 'ACT-DEMO-0004', tanggal: offsetDate_(-18), jumlah: 2, harga_satuan: 70000000, nilai: 140000000, status_tagihan: 'BELUM DITAGIH', pic: 'Agus', created_at: timestamp, updated_at: timestamp },
      { transaction_id: 'JID-DEMO-0002', product_id: 'PRD-DEMO-0001', company_id: companies[0][0], perusahaan: companies[0][1], tanggal: offsetDate_(-12), jumlah: 11, harga_satuan: 2500000, nilai: 27500000, status_tagihan: 'LUNAS', pic: 'Agus', created_at: timestamp, updated_at: timestamp },
    ],
    PENAGIHAN: [
      { billing_id: 'BIL-DEMO-0001', company_id: companies[0][0], perusahaan: companies[0][1], source_type: 'LAPORAN', source_id: 'LAP-DEMO-0001', nilai: 475000000, tanggal_siap_tagih: offsetDate_(-6), nomor_invoice: 'INV-DEMO-001', tanggal_invoice: offsetDate_(-5), jatuh_tempo: offsetDate_(25), status: 'MENUNGGU PEMBAYARAN', total_pembayaran: 0, pic: 'Sari', created_at: timestamp, updated_at: timestamp },
      { billing_id: 'BIL-DEMO-0002', company_id: companies[1][0], perusahaan: companies[1][1], source_type: 'KEGIATAN', source_id: 'ACT-DEMO-0002', nilai: 185000000, tanggal_siap_tagih: offsetDate_(-50), nomor_invoice: 'INV-DEMO-002', tanggal_invoice: offsetDate_(-45), jatuh_tempo: offsetDate_(-15), status: 'JATUH TEMPO', total_pembayaran: 60000000, pic: 'Sari', created_at: timestamp, updated_at: timestamp },
      { billing_id: 'BIL-DEMO-0003', company_id: companies[2][0], perusahaan: companies[2][1], source_type: 'PELATIHAN', source_id: 'ACT-DEMO-0003', nilai: 125000000, tanggal_siap_tagih: offsetDate_(-12), nomor_invoice: 'INV-DEMO-003', tanggal_invoice: offsetDate_(-10), jatuh_tempo: offsetDate_(20), status: 'LUNAS', total_pembayaran: 125000000, tanggal_pembayaran: offsetDate_(-2), pic: 'Sari', created_at: timestamp, updated_at: timestamp },
    ],
    KEGIATAN_PELATIHAN: [
      { training_id: 'PLT-DEMO-0001', company_id: companies[2][0], perusahaan: companies[2][1], nama_kegiatan: 'Pelatihan Panen Presisi', lokasi: 'Medan', tanggal_mulai: offsetDate_(12), tanggal_selesai: offsetDate_(14), jumlah_peserta: 35, pic: 'Nina', status: 'PERSIAPAN', billing_id: 'BIL-DEMO-0003', catatan: 'DEMO / SAMPLE DATA', created_at: timestamp, updated_at: timestamp },
      { training_id: 'PLT-DEMO-0002', company_id: companies[3][0], perusahaan: companies[3][1], nama_kegiatan: 'Interpretasi Data Cuaca', lokasi: 'Palembang', tanggal_mulai: offsetDate_(28), tanggal_selesai: offsetDate_(29), jumlah_peserta: 24, pic: 'Nina', status: 'DIJADWALKAN', catatan: 'DEMO / SAMPLE DATA', created_at: timestamp, updated_at: timestamp },
    ],
    TENAGA_AHLI: [
      { expert_id: 'EXP-DEMO-0001', nama: 'Dr. Edi Sigit', bidang_keahlian: 'Agronomi', status_aktif: 'YA', created_at: timestamp, updated_at: timestamp },
      { expert_id: 'EXP-DEMO-0002', nama: 'Ir. Josep', bidang_keahlian: 'Pemupukan', status_aktif: 'YA', created_at: timestamp, updated_at: timestamp },
      { expert_id: 'EXP-DEMO-0003', nama: 'Dr. Desra', bidang_keahlian: 'Tanah dan Air', status_aktif: 'YA', created_at: timestamp, updated_at: timestamp },
    ],
  };
  grouped.RKAP = [];
  for (let month = 1; month <= 12; month += 1) {
    [['RPJID', 120000000], ['BT', 80000000], ['PLT', 45000000]].forEach(function (item) {
      grouped.RKAP.push({ rkap_id: 'RKAP-DEMO-' + year + '-' + item[0] + '-' + String(month).padStart(2, '0'), tahun: year, subbagian: item[0], kategori: item[0], bulan: month, nilai: item[1], created_at: timestamp, updated_at: timestamp });
    });
  }

  const inserted = {};
  withWriteTransaction_({
    actor: currentUser_(), action: 'seed_demo', tableName: 'MULTI', recordId: 'DEMO',
    reason: 'Data contoh dimuat secara eksplisit',
  }, function (spreadsheet) {
    Object.keys(grouped).forEach(function (sheetName) {
      const sheet = spreadsheet.getSheetByName(sheetName);
      if (sheet.getLastRow() > 1) {
        inserted[sheetName] = 0;
        return;
      }
      grouped[sheetName].forEach(function (row) { appendRecord_(sheet, row); });
      inserted[sheetName] = grouped[sheetName].length;
    });
  });
  return success_({ inserted: inserted, message: 'Data demo ditambahkan hanya ke tabel yang kosong.' });
}
