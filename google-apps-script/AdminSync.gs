const ADM_SOURCE_DEFAULT_ID = '12gHG4c4t8_JeL_nW2YJ4bmgSCKE7krvSB4turxR6TTE';
function getAdministrasiSourceId_() { return getProperties_().getProperty('UPJKP_ADM_SOURCE_ID') || ADM_SOURCE_DEFAULT_ID; }
function adminText_(v) { return String(v == null ? '' : v).trim(); }
function adminCategory_(v) { const c = adminText_(v).toUpperCase(); return c === 'BT' ? 'BT' : c === 'TR' ? 'PLT' : (c === 'RP' || c === 'JID') ? 'RPJID' : 'ADM'; }
function syncAdministrasiNow(options) {
  options = options || {}; assertConfigured_();
  const sourceId = options.sourceSpreadsheetId || getAdministrasiSourceId_();
  const source = SpreadsheetApp.openById(sourceId), sheet = source.getSheetByName('Bu Sri & Bu Desii');
  if (!sheet) throw new Error('Sheet Bu Sri & Bu Desii tidak ditemukan pada sumber Administrasi.');
  const last = Math.min(Math.max(sheet.getLastRow(), 1), 10000), values = last < 2 ? [] : sheet.getRange(2, 1, last - 1, 53).getValues();
  const records = values.map(function(v, i) {
    const company = adminText_(v[6]); if (!company) return null;
    const stable = adminText_(v[3]) || ('ROW-' + (i + 2)), incoming = sourceDate_(v[8]), start = sourceDate_(v[32]), end = sourceDate_(v[33]), sent = sourceDate_(v[20]);
    const category = adminCategory_(v[0]), activityId = 'ADM-SRC-' + stable.replace(/[^A-Za-z0-9_-]/g, '-');
    return { activityId: activityId, reportId: 'LAP-' + activityId, company: company, category: category, region: adminText_(v[1]), kind: adminText_(v[10]) || adminText_(v[9]) || 'Administrasi', location: adminText_(v[31]), pic: adminText_(v[35]) || adminText_(v[37]), year: (incoming || start || new Date()).getFullYear(), incoming: incoming, start: start, end: end, sent: sent, value: Number(v[30]) || Number(v[28]) || 0, invoice: adminText_(v[42]) || adminText_(v[22]), invoiceDate: sourceDate_(v[43]), due: sourceDate_(v[45]), noIncoming: adminText_(v[7]), journal: adminText_(v[46]) || adminText_(v[40]), status: adminText_(v[4]) || 'PROSES', note: ['SOURCE_SYNC=ADM', adminText_(v[9]), adminText_(v[24]), adminText_(v[47])].filter(Boolean).join(' | ') };
  }).filter(Boolean);
  const reportSheet=source.getSheetByName('Laporan'), teamSheet=source.getSheetByName('Tim');
  const reportRows=reportSheet&&reportSheet.getLastRow()>1?reportSheet.getRange(2,1,Math.min(reportSheet.getLastRow()-1,10000),32).getDisplayValues():[];
  const teamRows=teamSheet&&teamSheet.getLastRow()>1?teamSheet.getRange(2,1,Math.min(teamSheet.getLastRow()-1,10000),26).getDisplayValues():[];
  let ia=0,ua=0,ir=0,ur=0,ib=0,ub=0,cc=0,ih=0,ut=0;
  const tx = withWriteTransaction_({actor:currentUser_(), action:'sync_adm_source', tableName:'MULTI', recordId:sourceId, reason:'Sinkronisasi Google Sheet Administrasi'}, function(master) {
    const cs=master.getSheetByName('MASTER_PERUSAHAAN'), as=master.getSheetByName('KEGIATAN'), rs=master.getSheetByName('MONITORING_LAPORAN'), bs=master.getSheetByName('PENAGIHAN'), companies={};
    rowsFromSheet_(cs,false).forEach(function(r){ companies[adminText_(r.nama).toLowerCase()]=r.company_id; });
    records.forEach(function(r){
      let cid=companies[r.company.toLowerCase()]; if(!cid){cid='PRSH-'+String(nextSequence_(cs,'company_id','PRSH-')).padStart(4,'0'); upsertMappedRecord_(cs,'company_id',cid,{company_id:cid,nama:r.company,nama_singkat:r.company,regional:r.region,status_aktif:'YA',catatan:'SOURCE_SYNC=ADM',created_at:nowIso_(),updated_at:nowIso_()}); companies[r.company.toLowerCase()]=cid; cc++;}
      const ar=upsertMappedRecord_(as,'activity_id',r.activityId,{activity_id:r.activityId,display_id:r.activityId,company_id:cid,perusahaan:r.company,subbagian:r.category,kategori:r.category==='RPJID'?'RP':r.category==='PLT'?'TR':r.category,instansi:r.region,jenis_kegiatan:r.kind,regional:r.region,kebun_lokasi:r.location,tahun:r.year,tanggal_surat_masuk:r.incoming,no_surat_masuk:r.noIncoming,tanggal_mulai:r.start,tanggal_selesai:r.end,nilai_kontrak:r.value,pic:r.pic,status:r.status,catatan:r.note,created_at:nowIso_(),updated_at:nowIso_(),archived_at:''}); if(ar==='inserted')ia++;else ua++;
      const rr=upsertMappedRecord_(rs,'report_id',r.reportId,{report_id:r.reportId,activity_id:r.activityId,company_id:cid,perusahaan:r.company,regional:r.region,kebun:r.location,nama_kegiatan:r.kind,tahun:r.year,workflow:'UMUM',tanggal_draft_masuk:r.incoming,checkpoint_terakhir:r.sent?'SELESAI':(r.end?'PELAKSANAAN':(r.incoming?'DRAFT':'')),tanggal_checkpoint:r.sent||r.end||r.incoming,tanggal_kirim:r.sent,status:r.sent?'NET':r.status,pic:r.pic,catatan:r.note,created_at:nowIso_(),updated_at:nowIso_(),archived_at:''}); if(rr==='inserted')ir++;else ur++;
      if(r.value||r.invoice||r.invoiceDate){const br=upsertMappedRecord_(bs,'billing_id','BILL-'+r.activityId,{billing_id:'BILL-'+r.activityId,company_id:cid,perusahaan:r.company,kebun:r.location,source_type:'ADMINISTRASI',source_id:r.activityId,nilai:r.value,nomor_invoice:r.invoice,tanggal_invoice:r.invoiceDate,jatuh_tempo:r.due,status:r.invoice?'TERBIT':'DRAFT',nomor_jurnal:r.journal,pic:r.pic,catatan:r.note,created_at:nowIso_(),updated_at:nowIso_(),archived_at:''});if(br==='inserted')ib++;else ub++;}
    });
    const activityIndex={}; records.forEach(function(r){activityIndex[r.company.toLowerCase()+'|'+r.kind.toLowerCase()]=r;});
    reportRows.forEach(function(v,i){
      const company=adminText_(v[1]), kind=adminText_(v[3])||adminText_(v[2]); if(!company) return;
      const linked=activityIndex[company.toLowerCase()+'|'+kind.toLowerCase()]||records[i]||records.find(function(r){return r.company.toLowerCase()===company.toLowerCase();}); if(!linked) return;
      const rid=adminText_(v[0])||('LAP-ADM-ROW-'+(i+2));
      const rr=upsertMappedRecord_(rs,'report_id',rid,{report_id:rid,activity_id:linked.activityId,company_id:companies[company.toLowerCase()]||'',perusahaan:company,nama_kegiatan:kind,tahun:(sourceDate_(v[6])||new Date()).getFullYear(),workflow:'ADMINISTRASI',tanggal_draft_masuk:sourceDate_(v[6]),tanggal_checkpoint:sourceDate_(v[30])||sourceDate_(v[29])||sourceDate_(v[21]),tanggal_cetak:sourceDate_(v[29]),tanggal_kirim:sourceDate_(v[30]),checkpoint_terakhir:sourceDate_(v[30])?'SELESAI':(sourceDate_(v[29])?'CETAK NET':(sourceDate_(v[21])?'CETAK 1':'DRAFT')),status:sourceDate_(v[30])?'NET':'PROSES',pic:adminText_(v[7])||linked.pic,catatan:'SOURCE_SYNC=ADM/LAPORAN',created_at:nowIso_(),updated_at:nowIso_(),archived_at:''}); if(rr==='inserted')ir++;else ur++;
      [['DRAFT',6,9,8],['KOREKTOR 1',9,10,8],['KOREKTOR 2',13,14,12],['CETAK 1',20,21,19],['NET',28,29,30]].forEach(function(stage){const masuk=sourceDate_(v[stage[1]]),keluar=sourceDate_(v[stage[2]]);if(masuk||keluar){const hid=rid+'-'+stage[0].replace(/\s/g,'-');const hs=upsertMappedRecord_(master.getSheetByName('HISTORI_LAPORAN'),'history_id',hid,{history_id:hid,report_id:rid,checkpoint:stage[0],urutan:stage[3],korektor:adminText_(v[stage[1]-1]),tanggal_masuk:masuk,tanggal_selesai:keluar,catatan:'SOURCE_SYNC=ADM/LAPORAN',created_at:nowIso_(),created_by:currentUser_()});if(hs==='inserted')ih++;}});
    });
    teamRows.forEach(function(v,i){
      const linked=records[i]; if(!linked) return;
      const people=[]; if(adminText_(v[1])) people.push({name:adminText_(v[1]),role:'Leader'});
      for(let j=4;j<=22;j++) if(adminText_(v[j])) people.push({name:adminText_(v[j]),role:'Anggota'});
      people.forEach(function(p,k){const tid='TEAM-'+linked.activityId+'-'+(k+1),tr=upsertMappedRecord_(master.getSheetByName('TIM_SPJ'),'team_id',tid,{team_id:tid,activity_id:linked.activityId,nama:p.name,peran:p.role,hk:0,nominal_hk:0,total_spj:0,panjar:0,realisasi_panjar:0,catatan:'SOURCE_SYNC=ADM/TIM',created_at:nowIso_()});if(tr==='inserted')ut++;});
    });
  }, {skipBackup:Boolean(options.automatic)});
  return success_({sourceSpreadsheetId:sourceId,sourceUrl:source.getUrl(),rowsRead:records.length,insertedActivities:ia,updatedActivities:ua,insertedReports:ir,updatedReports:ur,insertedBilling:ib,updatedBilling:ub,historyRows:ih,teamRows:ut,companiesCreated:cc,backupId:tx.backupId,message:records.length+' baris Administrasi, '+ut+' anggota tim, dan '+ih+' checkpoint laporan disinkronkan.'});
}
function syncAdministrasi(){return syncAdministrasiNow({automatic:false});}
function syncAdministrasiFromEdit(){return syncAdministrasiNow({automatic:true});}
function connectAdministrasiSource(){getProperties_().setProperty('UPJKP_ADM_SOURCE_ID',ADM_SOURCE_DEFAULT_ID);const e=ScriptApp.getProjectTriggers().some(function(t){return t.getHandlerFunction()==='syncAdministrasiFromEdit';});if(!e)ScriptApp.newTrigger('syncAdministrasiFromEdit').forSpreadsheet(ADM_SOURCE_DEFAULT_ID).onEdit().create();return syncAdministrasiNow({automatic:false,sourceSpreadsheetId:ADM_SOURCE_DEFAULT_ID});}
