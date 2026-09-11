const PERSONNEL_TABLE_NAME_ = 'MASTER_PETUGAS';
const PERSONNEL_TABLE_HEADERS_ = Object.freeze([
  'personnel_id', 'nama', 'kelompok', 'bidang', 'nama_normalisasi',
  'status_aktif', 'sumber_file', 'sumber_versi', 'created_at', 'updated_at', 'archived_at',
]);

const PERSONNEL_DEGREE_TOKENS_ = Object.freeze({
  agr: true, biotech: true, d: true, dea: true, dirs: true, dr: true, drs: true,
  env: true, eng: true, h: true, hj: true, ir: true, m: true, ma: true, magr: true,
  meng: true, mp: true, msc: true, msi: true, mt: true, p: true, pd: true, ph: true,
  phd: true, pn: true, prof: true, rer: true, s: true, se: true, sh: true, si: true,
  silv: true, sos: true, sp: true, st: true, stp: true, t: true, tp: true,
});

function personnelNormalizeName_(value) {
  const source = String(value || '').trim();
  if (!source || source === '#REF!') return '';
  const ascii = source.toLowerCase().replace(/[.,;:/()\[\]{}&]/g, ' ');
  return ascii.split(/\s+/).filter(function (token) {
    return token && !PERSONNEL_DEGREE_TOKENS_[token];
  }).join(' ');
}

function personnelNameParts_(value) {
  return String(value || '').split(/[;,\/\n]+/).map(function (part) {
    return part.trim();
  }).filter(Boolean);
}

function personnelCategoryForActivity_(activity) {
  const subsection = String(activity.subbagian || '').toUpperCase();
  const category = String(activity.kategori || '').toUpperCase();
  if (subsection === 'BT' || category === 'BT') return 'BT';
  if (subsection === 'RPJID' || category === 'RP') return 'RP';
  if (subsection === 'PLT' || category === 'TR') return 'TR';
  return '';
}

function ensurePersonnelRosterSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(PERSONNEL_TABLE_NAME_);
  if (!sheet) sheet = spreadsheet.insertSheet(PERSONNEL_TABLE_NAME_);
  const existing = getHeaders_(sheet);
  if (!existing.length) {
    sheet.getRange(1, 1, 1, PERSONNEL_TABLE_HEADERS_.length).setValues([PERSONNEL_TABLE_HEADERS_]);
  } else {
    const missing = PERSONNEL_TABLE_HEADERS_.filter(function (header) {
      return existing.indexOf(header) < 0;
    });
    if (missing.length) sheet.getRange(1, sheet.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  }
  formatSheet_(sheet);
  return sheet;
}

function importPersonnelRosterIfNeeded_() {
  const spreadsheet = getDatabase_();
  const existing = spreadsheet.getSheetByName(PERSONNEL_TABLE_NAME_);
  if (existing && existing.getLastRow() > 1) {
    return { imported: false, count: existing.getLastRow() - 1, version: PERSONNEL_ROSTER_SOURCE_VERSION_ };
  }

  return withWriteTransaction_({
    action: 'import_personnel_roster', tableName: PERSONNEL_TABLE_NAME_,
    recordId: PERSONNEL_ROSTER_SOURCE_FILE_, reason: 'Import daftar petugas dari workbook sumber',
  }, function (target) {
    const sheet = ensurePersonnelRosterSheet_(target);
    const createdAt = nowIso_();
    const records = PERSONNEL_ROSTER_SOURCE_.map(function (person, index) {
      return {
        personnel_id: 'PET-' + String(index + 1).padStart(4, '0'),
        nama: person.nama,
        kelompok: person.kelompok,
        bidang: (person.bidang || []).join(' | '),
        nama_normalisasi: personnelNormalizeName_(person.nama),
        status_aktif: 'YA',
        sumber_file: PERSONNEL_ROSTER_SOURCE_FILE_,
        sumber_versi: PERSONNEL_ROSTER_SOURCE_VERSION_,
        created_at: createdAt,
        updated_at: createdAt,
        archived_at: '',
      };
    });
    const headers = getHeaders_(sheet);
    const values = records.map(function (record) {
      return headers.map(function (header) { return record[header] === undefined ? '' : record[header]; });
    });
    if (values.length) sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
    return { imported: true, count: PERSONNEL_ROSTER_SOURCE_.length, version: PERSONNEL_ROSTER_SOURCE_VERSION_ };
  }).result;
}

function personnelAddInvolvement_(peopleByKey, involvement, rawName, activityId, category) {
  const key = personnelNormalizeName_(rawName);
  const person = peopleByKey[key];
  if (!person || !category || !activityId) return;
  const item = involvement[person.personnel_id];
  item[category][String(activityId)] = true;
  const raw = String(rawName || '').trim();
  if (raw && item.nama_database.indexOf(raw) < 0) item.nama_database.push(raw);
}

function getPersonnelRecapInternal_(options) {
  assertConfigured_();
  options = options || {};
  const importState = importPersonnelRosterIfNeeded_();
  const roster = getRows_(PERSONNEL_TABLE_NAME_, false);
  const peopleByKey = {};
  const people = [];
  roster.forEach(function (row) {
    const key = personnelNormalizeName_(row.nama_normalisasi || row.nama);
    if (!key) return;
    if (!peopleByKey[key]) {
      const person = {
        personnel_id: row.personnel_id || ('PET-' + key),
        nama: row.nama || '', kelompok: row.kelompok || '', bidang: row.bidang || '',
      };
      peopleByKey[key] = person;
      people.push(person);
    }
  });

  const involvement = {};
  people.forEach(function (person) {
    involvement[person.personnel_id] = { BT: {}, RP: {}, TR: {}, nama_database: [] };
  });

  const activities = {};
  getRows_('KEGIATAN', false).forEach(function (activity) {
    const activityId = String(activity.activity_id || '');
    const category = personnelCategoryForActivity_(activity);
    if (!activityId || !category) return;
    activities[activityId] = { category: category, pic: String(activity.pic || '') };
  });

  Object.keys(activities).forEach(function (activityId) {
    const activity = activities[activityId];
    personnelNameParts_(activity.pic).forEach(function (name) {
      personnelAddInvolvement_(peopleByKey, involvement, name, activityId, activity.category);
    });
  });

  getRows_('TIM_SPJ', false).forEach(function (team) {
    const activity = activities[String(team.activity_id || '')];
    if (!activity) return;
    personnelAddInvolvement_(peopleByKey, involvement, team.nama, team.activity_id, activity.category);
  });

  getRows_('MONITORING_LAPORAN', false).forEach(function (report) {
    const activity = activities[String(report.activity_id || '')];
    if (!activity) return;
    personnelNameParts_(report.pic).forEach(function (name) {
      personnelAddInvolvement_(peopleByKey, involvement, name, report.activity_id, activity.category);
    });
  });

  const items = people.map(function (person) {
    const item = involvement[person.personnel_id] || { BT: {}, RP: {}, TR: {}, nama_database: [] };
    const bt = Object.keys(item.BT).length;
    const rp = Object.keys(item.RP).length;
    const tr = Object.keys(item.TR).length;
    return {
      personnel_id: person.personnel_id,
      nama: person.nama,
      kelompok: person.kelompok,
      bidang: person.bidang,
      nama_database: item.nama_database.join(' | '),
      cocok_database: item.nama_database.length ? 'COCOK' : 'BELUM DITEMUKAN',
      BT: bt, RP: rp, TR: tr, total: bt + rp + tr,
    };
  }).sort(function (left, right) {
    return right.total - left.total || String(left.nama).localeCompare(String(right.nama));
  });

  const summary = {
    total_people: items.length,
    matched_people: items.filter(function (item) { return item.cocok_database === 'COCOK'; }).length,
    active_people: items.filter(function (item) { return item.total > 0; }).length,
    activity_totals: { BT: 0, RP: 0, TR: 0 },
    groups: {},
  };
  Object.keys(activities).forEach(function (activityId) {
    summary.activity_totals[activities[activityId].category] += 1;
  });
  items.forEach(function (item) {
    const group = item.kelompok || 'Lainnya';
    if (!summary.groups[group]) summary.groups[group] = { people: 0, matched: 0, BT: 0, RP: 0, TR: 0, total: 0 };
    summary.groups[group].people += 1;
    if (item.cocok_database === 'COCOK') summary.groups[group].matched += 1;
    summary.groups[group].BT += item.BT;
    summary.groups[group].RP += item.RP;
    summary.groups[group].TR += item.TR;
    summary.groups[group].total += item.total;
  });

  const query = String(options.query || '').trim().toLowerCase();
  const filtered = query ? items.filter(function (item) {
    return [item.nama, item.kelompok, item.bidang, item.nama_database, item.cocok_database]
      .join(' ').toLowerCase().indexOf(query) >= 0;
  }) : items;
  return success_({
    items: filtered, total: filtered.length, summary: summary,
    source: { file: PERSONNEL_ROSTER_SOURCE_FILE_, version: PERSONNEL_ROSTER_SOURCE_VERSION_, import: importState },
  });
}
