const TEMPLATE_GROUPS = Object.freeze([
  {
    code: 'RPJID', label: 'Rekomendasi Pemupukan & Jasa Informasi Digital',
    tables: [
      ['KEGIATAN', 'Data kegiatan rekomendasi dan layanan JID'],
      ['MONITORING_LAPORAN', 'Checkpoint dan SLA laporan rekomendasi'],
      ['ANALISIS_LAB', 'Sampel daun, tanah, dan KCD'],
      ['LAMPIRAN_DOSIS', 'Lampiran dosis dan status verifikasi'],
      ['MASTER_PRODUK_JID', 'Master produk JID'],
      ['STOK_JID', 'Ledger mutasi stok JID'],
      ['TRANSAKSI_JID', 'Penjualan produk JID'],
    ],
  },
  {
    code: 'BT', label: 'Bantuan Teknis',
    tables: [
      ['KEGIATAN', 'Data kegiatan bantuan teknis'],
      ['MONITORING_LAPORAN', 'Checkpoint laporan bantuan teknis'],
      ['LOKASI_KEGIATAN', 'Lokasi dan urutan kunjungan lapangan'],
      ['TIM_SPJ', 'Anggota tim, HK, panjar, dan SPJ'],
    ],
  },
  {
    code: 'PLT', label: 'Pelatihan',
    tables: [
      ['KEGIATAN_PELATIHAN', 'Agenda, lokasi, peserta, dan status pelatihan'],
      ['JADWAL_TENAGA_AHLI', 'Jadwal dan potensi konflik tenaga ahli'],
      ['TENAGA_AHLI', 'Master kompetensi tenaga ahli'],
      ['MASTER_SOUVENIR', 'Master stok souvenir'],
      ['TRANSAKSI_SOUVENIR', 'Ledger distribusi dan pengadaan souvenir'],
    ],
  },
  {
    code: 'ADM', label: 'Administrasi',
    tables: [
      ['MASTER_PERUSAHAAN', 'Master identitas perusahaan dan PIC'],
      ['KORESPONDENSI', 'Surat masuk dan korespondensi kegiatan'],
      ['PENAGIHAN', 'Billing, invoice, pembayaran, dan piutang'],
      ['RKAP', 'Target pendapatan bulanan per subbagian'],
      ['DOKUMEN', 'Arsip dokumen dan versi'],
    ],
  },
]);

const TEMPLATE_DROPDOWNS = Object.freeze({
  status_aktif: ['YA', 'TIDAK'],
  status_biaya: ['Biaya', 'Non Biaya'],
  subbagian: ['RPJID', 'BT', 'PLT', 'ADM'],
  kategori: ['RP', 'JID', 'BT', 'TR', 'LN'],
  workflow: ['RP', 'UMUM'],
  jenis_analisis: ['DAUN', 'TANAH'],
  jenis_mutasi: ['STOK AWAL', 'MASUK', 'PENGADAAN', 'PENJUALAN', 'KELUAR', 'DISTRIBUSI', 'PEMAKAIAN', 'PENYESUAIAN KELUAR'],
  status: ['AKTIF', 'PROSES', 'PERSIAPAN', 'DIJADWALKAN', 'RENCANA', 'SELESAI', 'DRAFT', 'DRAFT MASUK', 'DIREVISI', 'DIKOREKSI', 'DICETAK', 'KOREKTOR 1', 'KOREKTOR 2', 'KOREKTOR 1 CETAK', 'KOREKTOR 2 CETAK', 'NET / RP27', 'VALID', 'TIDAK AKTIF'],
  status_tagihan: ['BELUM DITAGIH', 'SIAP TAGIH', 'MENUNGGU PEMBAYARAN', 'BAYAR SEBAGIAN', 'LUNAS'],
  jenis_surat: ['SURAT MASUK', 'SURAT KELUAR', 'SPK', 'KONTRAK', 'LAINNYA'],
  activity_type: ['PELATIHAN', 'BANTUAN TEKNIS', 'REKOMENDASI', 'LAINNYA'],
  module: ['RPJID', 'BT', 'PLT', 'ADM'],
  tahap: ['DRAFT', 'KOREKSI', 'CETAK', 'NET', 'ARSIP'],
});

function templateLabel_(field) {
  return String(field).split('_').map(function (part) {
    return part ? part.charAt(0).toUpperCase() + part.slice(1) : part;
  }).join(' ');
}

function templateType_(field) {
  const name = String(field).toLowerCase();
  if (name === 'created_at' || name === 'updated_at' || name === 'archived_at') return 'SYSTEM';
  if (name.indexOf('tanggal') === 0 || name.endsWith('_at') || name === 'deadline' || name === 'batas_akhir') return 'DATE';
  if (name.indexOf('nilai') >= 0 || name.indexOf('harga') >= 0 || name.indexOf('jumlah') >= 0 || name.indexOf('nominal') >= 0 || name.indexOf('total') >= 0 || name === 'hpp' || name === 'panjar' || name === 'hk' || name === 'versi' || name === 'ukuran' || name === 'bulan' || name === 'tahun') return 'NUMBER';
  if (TEMPLATE_DROPDOWNS[field]) return 'DROPDOWN';
  if (name.indexOf('link') >= 0 || name.indexOf('file') >= 0 || name.indexOf('document') >= 0 || name.indexOf('folder') >= 0 || name.indexOf('path') >= 0) return 'LINK';
  return 'TEXT';
}

function templateRequired_(field) {
  return !['created_at', 'updated_at', 'archived_at'].includes(field) && (field.endsWith('_id') || ['perusahaan', 'nama', 'status', 'tanggal'].includes(field));
}

function templateExample_(field, type) {
  if (type === 'DATE') return '2026-09-04';
  if (type === 'NUMBER') return '0';
  if (type === 'DROPDOWN') return (TEMPLATE_DROPDOWNS[field] || ['Pilih'])[0];
  if (field.endsWith('_id')) return 'ISI-ID-001';
  if (field === 'perusahaan') return 'Nama perusahaan';
  if (field === 'nama') return 'Nama record';
  return 'Isi data';
}

function templateSheetName_(code, table) {
  const names = {
    KEGIATAN: 'KEGIATAN', MONITORING_LAPORAN: 'LAPORAN', ANALISIS_LAB: 'LAB',
    LAMPIRAN_DOSIS: 'DOSIS', MASTER_PRODUK_JID: 'PRODUK_JID', STOK_JID: 'STOK_JID',
    TRANSAKSI_JID: 'PENJUALAN_JID', LOKASI_KEGIATAN: 'LOKASI', TIM_SPJ: 'TIM_SPJ',
    KEGIATAN_PELATIHAN: 'KEGIATAN', JADWAL_TENAGA_AHLI: 'JADWAL_AHLI', TENAGA_AHLI: 'TENAGA_AHLI',
    MASTER_SOUVENIR: 'MASTER_SOUVENIR', TRANSAKSI_SOUVENIR: 'TRANSAKSI_SOUVENIR',
    MASTER_PERUSAHAAN: 'PERUSAHAAN', KORESPONDENSI: 'SURAT_MASUK', PENAGIHAN: 'BILLING',
    RKAP: 'RKAP', DOKUMEN: 'DOKUMEN',
  };
  return code + '_' + (names[table] || table).slice(0, 80);
}

function formatTemplateSheet_(sheet, table, description) {
  const headers = DB_SCHEMA[table];
  sheet.setName(sheet.getName().slice(0, 99));
  sheet.setFrozenRows(1);
  sheet.setHiddenGridlines(true);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  const notes = [headers.map(function (field) {
    const type = templateType_(field);
    return templateLabel_(field) + '\nTipe: ' + type + '\nWajib: ' + (templateRequired_(field) ? 'YA' : 'TIDAK') + '\nContoh: ' + templateExample_(field, type);
  })];
  sheet.getRange(1, 1, 1, headers.length).setNotes(notes);
  sheet.getRange(1, 1, 1, headers.length).setBackground('#123A63').setFontColor('#ffffff').setFontWeight('bold').setWrap(true);
  sheet.setRowHeight(1, 36);
  if (!sheet.getFilter()) sheet.getRange(1, 1, 1000, headers.length).createFilter();
  sheet.getRange(2, 1, 999, headers.length).setFontSize(10).setVerticalAlignment('top');
  headers.forEach(function (field, index) {
    const type = templateType_(field);
    const range = sheet.getRange(2, index + 1, 999, 1);
    if (type === 'DATE') range.setNumberFormat('yyyy-mm-dd');
    if (type === 'NUMBER') range.setNumberFormat('#,##0');
    if (type === 'DROPDOWN') {
      const values = TEMPLATE_DROPDOWNS[field] || [];
      if (values.length) range.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build());
    }
  });
  sheet.autoResizeColumns(1, headers.length);
  headers.forEach(function (field, index) { if (sheet.getColumnWidth(index + 1) > 220) sheet.setColumnWidth(index + 1, 220); });
  sheet.getRange(1, 1).setNote('Tabel database: ' + table + '\nSubbagian: ' + description + '\nIsi mulai dari baris 2. Jangan mengubah nama header.');
}

function createInputTemplates() {
  assertConfigured_();
  const properties = getProperties_();
  const existingId = properties.getProperty('UPJKP_TEMPLATE_SPREADSHEET_ID');
  if (existingId) {
    try {
      const existing = SpreadsheetApp.openById(existingId);
      return success_(templateResult_(existing));
    } catch (error) {
      properties.deleteProperty('UPJKP_TEMPLATE_SPREADSHEET_ID');
    }
  }
  const config = getConfiguration_();
  const root = DriveApp.getFolderById(config.rootFolderId);
  const templateFolder = root.getFoldersByName('Template Pengisian').hasNext()
    ? root.getFoldersByName('Template Pengisian').next()
    : root.createFolder('Template Pengisian');
  const spreadsheet = SpreadsheetApp.create('UPJKP Template Pengisian Data');
  DriveApp.getFileById(spreadsheet.getId()).moveTo(templateFolder);
  const guide = spreadsheet.getSheets()[0];
  guide.setName('00_PETUNJUK');
  guide.getRange('A1:F1').merge().setValue('UPJKP – TEMPLATE PENGISIAN DATA').setBackground('#123A63').setFontColor('#ffffff').setFontWeight('bold').setFontSize(14);
  guide.getRange('A3:F3').setValues([['Subbagian', 'Nama Tab', 'Tabel Database', 'Keterangan', 'Kolom Wajib', 'Cara Pengisian']]).setBackground('#e8f2f8').setFontWeight('bold');
  const indexRows = [];
  TEMPLATE_GROUPS.forEach(function (group) {
    group.tables.forEach(function (tableInfo) {
      const table = tableInfo[0];
      const name = templateSheetName_(group.code, table);
      const sheet = spreadsheet.insertSheet(name);
      formatTemplateSheet_(sheet, table, group.label);
      const required = DB_SCHEMA[table].filter(templateRequired_).join(', ');
      indexRows.push([group.label, name, table, tableInfo[1], required || 'Tidak ada', 'Isi mulai baris 2; jangan ubah header. Tanggal gunakan YYYY-MM-DD.']);
    });
  });
  guide.getRange(4, 1, indexRows.length, 6).setValues(indexRows);
  guide.getRange(4, 1, indexRows.length, 6).setWrap(true).setVerticalAlignment('top');
  guide.setFrozenRows(3);guide.setHiddenGridlines(true);guide.autoResizeColumns(1, 6);guide.setColumnWidth(4, 260);guide.setColumnWidth(6, 300);
  const last = 5 + indexRows.length;
  [
    'CATATAN PENTING',
    '1. Isi data pada tab sesuai subbagian dan tabelnya.',
    '2. Jangan mengubah nama header, karena header dipakai untuk pemetaan database.',
    '3. Kolom created_at, updated_at, dan archived_at dikelola aplikasi; biarkan kosong.',
  ].forEach(function (text, offset) {
    const row = last + offset;
    guide.getRange(row, 1, 1, 6).mergeAcross().setValue(text).setWrap(true);
  });
  guide.getRange(last, 1).setBackground('#fff4df').setFontWeight('bold');
  properties.setProperty('UPJKP_TEMPLATE_SPREADSHEET_ID', spreadsheet.getId());
  return success_(templateResult_(spreadsheet));
}

function templateResult_(spreadsheet) {
  return {
    templateId: spreadsheet.getId(), templateName: spreadsheet.getName(), templateUrl: spreadsheet.getUrl(),
    folderName: 'Template Pengisian', tabs: spreadsheet.getSheets().map(function (sheet) { return { name: sheet.getName(), gid: sheet.getSheetId() }; }),
    message: 'Template pengisian berhasil disiapkan. Tersedia untuk empat subbagian dan ' + (spreadsheet.getSheets().length - 1) + ' tab data.',
  };
}

function templateEntries_() {
  const entries = [];
  TEMPLATE_GROUPS.forEach(function (group) {
    group.tables.forEach(function (tableInfo) {
      entries.push({ code: group.code, table: tableInfo[0], sheetName: templateSheetName_(group.code, tableInfo[0]) });
    });
  });
  return entries;
}

function tableIdField_(table) {
  return DB_SCHEMA[table].find(function (field) { return field.endsWith('_id'); }) || DB_SCHEMA[table][0];
}

function importInputTemplates() {
  assertConfigured_();
  const templateId = getProperties_().getProperty('UPJKP_TEMPLATE_SPREADSHEET_ID');
  if (!templateId) throw new Error('Template belum dibuat. Klik Buat Template Pengisian terlebih dahulu.');
  let template;
  try { template = SpreadsheetApp.openById(templateId); } catch (error) { throw new Error('Template tidak dapat dibuka. Buat ulang template dari menu Import / Export.'); }
  const pending = [];
  const errors = [];
  templateEntries_().forEach(function (entry) {
    const sheet = template.getSheetByName(entry.sheetName);
    if (!sheet || sheet.getLastRow() < 2) return;
    const headers = getHeaders_(sheet);
    const expected = DB_SCHEMA[entry.table];
    if (expected.some(function (field) { return headers.indexOf(field) < 0; })) {
      errors.push(entry.sheetName + ': header tidak lengkap');
      return;
    }
    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
    const idField = tableIdField_(entry.table);
    values.forEach(function (row, index) {
      const hasValue = row.some(function (value) { return value !== '' && value !== null; });
      if (!hasValue) return;
      const record = {};
      headers.forEach(function (header, column) { record[header] = row[column]; });
      const recordId = String(record[idField] || '').trim();
      if (!recordId || recordId.indexOf('ISI-ID') === 0) {
        errors.push(entry.sheetName + ' baris ' + (index + 2) + ': ' + idField + ' wajib diisi');
        return;
      }
      pending.push({ entry: entry, idField: idField, id: recordId, record: record });
    });
  });
  let inserted = 0;
  let skipped = 0;
  if (pending.length) {
    withWriteTransaction_({
      actor: currentUser_(), action: 'import_template', tableName: 'MULTI', recordId: templateId,
      reason: 'Import data dari workbook template empat subbagian',
    }, function (spreadsheet) {
      const seen = {};
      pending.forEach(function (item) {
        const key = item.entry.table + '|' + item.id;
        if (seen[key]) { skipped += 1; return; }
        const target = spreadsheet.getSheetByName(item.entry.table);
        if (findRow_(target, item.idField, item.id)) { skipped += 1; seen[key] = true; return; }
        const record = item.record;
        if (DB_SCHEMA[item.entry.table].indexOf('created_at') >= 0 && !record.created_at) record.created_at = nowIso_();
        if (DB_SCHEMA[item.entry.table].indexOf('updated_at') >= 0 && !record.updated_at) record.updated_at = nowIso_();
        appendRecord_(target, record);
        inserted += 1; seen[key] = true;
      });
    });
  }
  return success_({ inserted: inserted, skipped: skipped, errors: errors, templateUrl: template.getUrl(), message: inserted + ' baris diimpor, ' + skipped + ' duplikat dilewati, ' + errors.length + ' baris perlu diperbaiki.' });
}
