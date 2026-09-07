function syncAllOperationalSources() {
  assertConfigured_();
  const jobs = [
    { code: 'RP', label: 'Rekomendasi Pemupukan', run: function () { return connectRekomendasiSource(); } },
    { code: 'BT', label: 'Bantuan Teknis', run: function () { return connectBantuanTeknisSource(); } },
    { code: 'ADM', label: 'Administrasi', run: function () { return connectAdministrasiSource(); } },
  ];
  const results = [], errors = [];
  jobs.forEach(function (job) {
    try {
      const result = job.run();
      const row = result.data || {};
      const rowErrors = row.errors || [];
      results.push({ code: job.code, label: job.label, ok: rowErrors.length === 0, message: row.message || 'Sinkronisasi selesai.', rowsRead: row.rowsRead || 0, errors: rowErrors });
      if (rowErrors.length) errors.push(job.label + ': ' + rowErrors.join('; '));
    } catch (error) {
      const message = String(error && error.message ? error.message : error);
      results.push({ code: job.code, label: job.label, ok: false, message: message, rowsRead: 0, errors: [message] });
      errors.push(job.label + ': ' + message);
    }
  });
  return success_({ results: results, errors: errors, message: errors.length ? 'Sinkronisasi terpusat selesai dengan beberapa masalah.' : 'Semua sumber utama berhasil disinkronkan melalui Administrasi.' });
}
