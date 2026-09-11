const PERSONNEL_TABLE_NAME_ = 'MASTER_PETUGAS';
const PERSONNEL_UPJKP_TABLE_NAME_ = 'MASTER_PETUGAS_UPJKP';
const PERSONNEL_TABLE_HEADERS_ = Object.freeze([
  'personnel_id', 'nama', 'kelompok', 'bidang', 'nama_normalisasi',
  'status_aktif', 'sumber_file', 'sumber_versi', 'created_at', 'updated_at', 'archived_at',
]);
const PERSONNEL_UPJKP_TABLE_HEADERS_ = Object.freeze([
  'assignment_id', 'personnel_upjkp_id', 'nama_sheet2', 'jabatan', 'nama_normalisasi', 'personnel_id', 'nama_master',
  'status_kecocokan', 'sumber_file', 'sumber_sheet', 'sumber_versi', 'created_at', 'updated_at', 'archived_at',
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

function ensurePersonnelUpjkpSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(PERSONNEL_UPJKP_TABLE_NAME_);
  if (!sheet) sheet = spreadsheet.insertSheet(PERSONNEL_UPJKP_TABLE_NAME_);
  const existing = getHeaders_(sheet);
  if (!existing.length) {
    sheet.getRange(1, 1, 1, PERSONNEL_UPJKP_TABLE_HEADERS_.length).setValues([PERSONNEL_UPJKP_TABLE_HEADERS_]);
  } else {
    const missing = PERSONNEL_UPJKP_TABLE_HEADERS_.filter(function (header) {
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

function personnelUpjkpReference_(roster, rawName) {
  const sourceKey = personnelNormalizeName_(rawName);
  const canonicalName = PERSONNEL_UPJKP_ALIAS_TO_MASTER_[sourceKey] || rawName;
  const key = personnelNormalizeName_(canonicalName);
  const matches = roster.filter(function (row) {
    return personnelNormalizeName_(row.nama_normalisasi || row.nama) === key;
  });
  return {
    person: matches.length === 1 ? matches[0] : null,
    status: matches.length === 1 ? 'COCOK' : matches.length > 1 ? 'GANDA' : 'PERLU VERIFIKASI',
  };
}

function importPersonnelUpjkpIfNeeded_(roster) {
  const spreadsheet = getDatabase_();
  const existing = spreadsheet.getSheetByName(PERSONNEL_UPJKP_TABLE_NAME_);
  const existingRows = existing && existing.getLastRow() > 1 ? rowsFromSheet_(existing, true) : [];
  const sourceIds = PERSONNEL_UPJKP_SOURCE_.map(function (source) { return source.assignment_id; });
  const currentIds = existingRows.map(function (row) { return String(row.assignment_id || ''); });
  const currentVersion = existingRows.length && existingRows.every(function (row) {
    return String(row.sumber_versi || '') === PERSONNEL_UPJKP_SOURCE_VERSION_;
  });
  const complete = existingRows.length === PERSONNEL_UPJKP_SOURCE_.length && currentVersion && sourceIds.every(function (id) {
    return currentIds.indexOf(id) >= 0;
  });
  if (complete) {
    return {
      imported: false, count: existingRows.length,
      matched: existingRows.filter(function (row) { return row.status_kecocokan === 'COCOK'; }).length,
      unmatched: existingRows.filter(function (row) { return row.status_kecocokan !== 'COCOK'; }).length,
      version: PERSONNEL_UPJKP_SOURCE_VERSION_, sheet: PERSONNEL_UPJKP_SOURCE_SHEET_,
    };
  }

  return withWriteTransaction_({
    action: 'import_personnel_upjkp', tableName: PERSONNEL_UPJKP_TABLE_NAME_,
    recordId: PERSONNEL_ROSTER_SOURCE_FILE_, reason: 'Import pemetaan petugas Subbagian UPJKP dari Sheet2',
  }, function (target) {
    const sheet = ensurePersonnelUpjkpSheet_(target);
    const headers = getHeaders_(sheet);
    const existingValues = sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues()
      : [];
    const rowById = {};
    existingValues.forEach(function (values, index) {
      const id = String(values[headers.indexOf('assignment_id')] || '');
      if (id) rowById[id] = index + 2;
    });
    const timestamp = nowIso_();
    const records = PERSONNEL_UPJKP_SOURCE_.map(function (source) {
      const reference = personnelUpjkpReference_(roster, source.nama);
      const person = reference.person || {};
      return {
        assignment_id: source.assignment_id,
        personnel_upjkp_id: 'UPJKP-PER-' + String(PERSONNEL_UPJKP_SOURCE_.indexOf(source) + 1).padStart(3, '0'),
        nama_sheet2: source.nama,
        jabatan: source.jabatan,
        nama_normalisasi: personnelNormalizeName_(source.nama),
        personnel_id: person.personnel_id || '',
        nama_master: person.nama || '',
        status_kecocokan: reference.status,
        sumber_file: PERSONNEL_ROSTER_SOURCE_FILE_,
        sumber_sheet: PERSONNEL_UPJKP_SOURCE_SHEET_,
        sumber_versi: PERSONNEL_UPJKP_SOURCE_VERSION_,
        created_at: timestamp,
        updated_at: timestamp,
        archived_at: '',
      };
    });
    const updates = [];
    const inserts = [];
    records.forEach(function (record) {
      const values = headers.map(function (header) { return record[header] === undefined ? '' : record[header]; });
      if (rowById[record.assignment_id]) updates.push({ row: rowById[record.assignment_id], values: values });
      else inserts.push(values);
    });
    updates.forEach(function (update) {
      sheet.getRange(update.row, 1, 1, headers.length).setValues([update.values]);
    });
    if (inserts.length) sheet.getRange(sheet.getLastRow() + 1, 1, inserts.length, headers.length).setValues(inserts);
    return {
      imported: true, count: records.length,
      matched: records.filter(function (record) { return record.status_kecocokan === 'COCOK'; }).length,
      unmatched: records.filter(function (record) { return record.status_kecocokan !== 'COCOK'; }).length,
      version: PERSONNEL_UPJKP_SOURCE_VERSION_, sheet: PERSONNEL_UPJKP_SOURCE_SHEET_,
    };
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
  const upjkpImportState = importPersonnelUpjkpIfNeeded_(roster);
  const upjkpAssignments = getRows_(PERSONNEL_UPJKP_TABLE_NAME_, false);
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

  const assignmentsByPersonnelId = {};
  upjkpAssignments.forEach(function (assignment) {
    const personnelId = String(assignment.personnel_id || '');
    if (!personnelId) return;
    if (!assignmentsByPersonnelId[personnelId]) assignmentsByPersonnelId[personnelId] = [];
    assignmentsByPersonnelId[personnelId].push(assignment);
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
    const assignments = assignmentsByPersonnelId[person.personnel_id] || [];
    const bt = Object.keys(item.BT).length;
    const rp = Object.keys(item.RP).length;
    const tr = Object.keys(item.TR).length;
    return {
      personnel_id: person.personnel_id,
      nama: person.nama,
      kelompok: person.kelompok,
      bidang: person.bidang,
      jabatan_upjkp: assignments.map(function (assignment) { return assignment.jabatan; }).filter(Boolean).join(' | '),
      personnel_upjkp_id: assignments.map(function (assignment) { return assignment.personnel_upjkp_id; }).filter(Boolean).join(' | '),
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
    return [item.nama, item.kelompok, item.bidang, item.jabatan_upjkp, item.personnel_upjkp_id, item.nama_database, item.cocok_database]
      .join(' ').toLowerCase().indexOf(query) >= 0;
  }) : items;
  const filteredAssignments = query ? upjkpAssignments.filter(function (assignment) {
    return [assignment.nama_sheet2, assignment.nama_master, assignment.jabatan, assignment.status_kecocokan]
      .join(' ').toLowerCase().indexOf(query) >= 0;
  }) : upjkpAssignments;
  const upjkpMatched = upjkpAssignments.filter(function (assignment) {
    return assignment.status_kecocokan === 'COCOK';
  }).length;
  return success_({
    items: filtered, total: filtered.length, summary: Object.assign(summary, {
      upjkp_assignments: upjkpAssignments.length,
      upjkp_matched: upjkpMatched,
      upjkp_unmatched: upjkpAssignments.length - upjkpMatched,
    }),
    assignments: filteredAssignments,
    source: {
      file: PERSONNEL_ROSTER_SOURCE_FILE_, version: PERSONNEL_ROSTER_SOURCE_VERSION_, import: importState,
      sheet: PERSONNEL_UPJKP_SOURCE_SHEET_, assignmentVersion: PERSONNEL_UPJKP_SOURCE_VERSION_,
      assignmentImport: upjkpImportState,
    },
  });
}
