function runSelfTest() {
  const results = [];
  function check(name, condition) {
    if (!condition) throw new Error('Self-test gagal: ' + name);
    results.push({ name: name, passed: true });
  }

  check('Empat subbagian', Object.keys(SUBBAGIAN).length === 4);
  check('Dua puluh empat tabel', Object.keys(DB_SCHEMA).length === 24);
  check('Kategori RP masuk RPJID', CATEGORY_TO_SUBBAGIAN.RP === 'RPJID');
  check('Kategori BT masuk Bantuan Teknis', CATEGORY_TO_SUBBAGIAN.BT === 'BT');

  const overdueDate = new Date();
  overdueDate.setDate(overdueDate.getDate() - 31);
  const overdue = reportProgress_({ tanggal_draft_masuk: dateIso_(overdueDate) });
  check('SLA lebih dari 30 hari terlambat', overdue.status_deadline === 'TERLAMBAT');

  const net = reportProgress_({ tanggal_draft_masuk: dateIso_(overdueDate), tanggal_net: todayIso_() });
  check('NET menghentikan countdown', net.status_deadline === 'SELESAI' && net.hari_tersisa === null);

  const stock = stockProducts_(
    [{ product_id: 'TEST', minimum_stok: 2 }],
    [{ product_id: 'TEST', jenis_mutasi: 'STOK AWAL', jumlah: 4 }, { product_id: 'TEST', jenis_mutasi: 'PENJUALAN', jumlah: 3 }]
  );
  check('Ledger stok dihitung', stock[0].stok === 1 && stock[0].kritis === true);

  return success_({ passed: results.length, tests: results });
}
