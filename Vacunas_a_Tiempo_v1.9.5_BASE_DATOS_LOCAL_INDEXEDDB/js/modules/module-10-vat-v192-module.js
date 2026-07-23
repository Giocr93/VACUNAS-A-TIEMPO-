
/* v1.9.2 · Asistente Inteligente de Captura */
const VAT_CAPTURE_ASSIST_VERSION='1.9.2';
const VAT_V192_RULES=[
 {keys:['bcg'],route:'Intradérmica',site:'Brazo derecho',volume:'0.1 ml'},
 {keys:['hepatitis b'],route:'Intramuscular',site:'Muslo anterolateral',volume:'0.5 ml'},
 {keys:['hexavalente'],route:'Intramuscular',site:'Muslo anterolateral',volume:'0.5 ml'},
 {keys:['dpt','tdpa','td'],route:'Intramuscular',site:'Deltoides',volume:'0.5 ml'},
 {keys:['rotavirus'],route:'Oral',site:'Oral',volume:'Según presentación'},
 {keys:['neumoc'],route:'Intramuscular',site:'Muslo anterolateral',volume:'0.5 ml'},
 {keys:['influenza'],route:'Intramuscular',site:'Muslo anterolateral o deltoides',volume:'Según edad/presentación'},
 {keys:['srp','triple viral','sr '],route:'Subcutánea',site:'Brazo',volume:'0.5 ml'},
 {keys:['varicela'],route:'Subcutánea',site:'Brazo',volume:'0.5 ml'},
 {keys:['hepatitis a'],route:'Intramuscular',site:'Muslo anterolateral o deltoides',volume:'0.5 ml'},
 {keys:['vph'],route:'Intramuscular',site:'Deltoides',volume:'0.5 ml'},
 {keys:['covid'],route:'Intramuscular',site:'Deltoides',volume:'Según biológico'}
];
function vatV192Rule(vaccine){const n=vatV165Norm(vaccine);return VAT_V192_RULES.find(r=>r.keys.some(k=>n.includes(vatV165Norm(k))))||null}
function vatV192SetSelect(select,value){if(!select||!value)return false;const opt=[...select.options].find(o=>vatV165Norm(o.value)===vatV165Norm(value)||vatV165Norm(o.textContent).includes(vatV165Norm(value)));if(opt){select.value=opt.value;return true}return false}
function vatV192AssistRow(row){if(!row)return;const vaccine=row.querySelector('.m65-vaccine')?.value||'',rule=vatV192Rule(vaccine),route=row.querySelector('.m65-route'),site=row.querySelector('.m65-site');
 if(rule){if(route&&!route.value)vatV192SetSelect(route,rule.route);if(site&&!site.value)vatV192SetSelect(site,rule.site)}
 let help=row.querySelector('.vat-v192-row-help');if(!help){help=document.createElement('div');help.className='vat-v192-row-help';row.querySelector('.vat-v165-fields')?.appendChild(help)}
 const lot=row.querySelector('.m65-lot'),expiry=row.querySelector('.m65-expiry')?.value,date=row.querySelector('.m65-date')?.value,mode=row.querySelector('.m65-mode')?.value;
 const parts=[];if(rule)parts.push(`<b>Sugerencia:</b> ${esc(rule.route)} · ${esc(rule.site)} · ${esc(rule.volume)}`);else if(vaccine)parts.push('<b>Verificar:</b> no hay una ficha automática para este nombre de biológico.');
 if(mode==='current'){if(lot?.value){const inv=(data.inventory||[]).find(x=>String(x.id)===String(lot.value));if(inv){parts.push(`<span class="${Number(inv.qty)<=5?'vat-v192-warn':'vat-v192-ok'}">Lote ${esc(inv.lot)} · ${Number(inv.qty)||0} dosis${Number(inv.qty)<=5?' (existencia baja)':''}</span>`)} }else if(vaccine)parts.push('<span class="vat-v192-bad">Seleccione un lote vigente.</span>')}
 if(expiry&&date&&expiry<date)parts.push('<span class="vat-v192-bad">La caducidad es anterior a la aplicación.</span>');help.innerHTML=parts.join(' · ')||'Escriba el biológico para recibir sugerencias.';
 vatV192RenderSummary();vatV192SaveDraft();
}
const vatV192LoadLotsBase=vatV165LoadLots;vatV165LoadLots=function(row){vatV192LoadLotsBase(row);const sel=row?.querySelector('.m65-lot');if(sel&&row.querySelector('.m65-mode')?.value==='current'&&!sel.value&&sel.options.length>1){sel.selectedIndex=1;vatV165LotChanged(row)}vatV192AssistRow(row)};
const vatV192LotChangedBase=vatV165LotChanged;vatV165LotChanged=function(row){vatV192LotChangedBase(row);vatV192AssistRow(row)};
const vatV192ModeBase=vatV165Mode;vatV165Mode=function(row){vatV192ModeBase(row);vatV192AssistRow(row)};
function vatV192SummaryData(){const pid=document.getElementById('vatV165Patient')?.value,rows=typeof vatV165Collect==='function'?vatV165Collect():[],issues=[];if(!pid)issues.push('Seleccione paciente');if(!rows.length)issues.push('Agregue al menos una vacuna');rows.forEach(x=>{if(!x.date)issues.push(`Vacuna ${x.index}: falta fecha`);if(x.mode==='current'&&!x.lotId)issues.push(`Vacuna ${x.index}: falta lote`);if(!x.route)issues.push(`Vacuna ${x.index}: falta vía`);if(!x.site)issues.push(`Vacuna ${x.index}: falta sitio`);if(x.expiry&&x.date&&x.expiry<x.date)issues.push(`Vacuna ${x.index}: lote caducado`)});return{pid,rows,issues,current:rows.filter(x=>x.mode==='current').length,history:rows.filter(x=>x.mode==='history').length}}
function vatV192RenderSummary(){const box=document.getElementById('vatV192Assistant');if(!box)return;const r=vatV192SummaryData();box.innerHTML=`<div class="row" style="justify-content:space-between"><div><b>✨ Asistente de captura</b><div class="muted">Completa sugerencias, prioriza lotes vigentes y revisa datos antes de guardar.</div></div><span class="badge">v${VAT_CAPTURE_ASSIST_VERSION}</span></div><div class="vat-v192-grid"><div class="vat-v192-chip">Registros preparados<br><b>${r.rows.length}</b></div><div class="vat-v192-chip">Aplicadas hoy<br><b>${r.current}</b></div><div class="vat-v192-chip">Históricas<br><b>${r.history}</b></div><div class="vat-v192-chip">Pendientes de completar<br><b class="${r.issues.length?'vat-v192-warn':'vat-v192-ok'}">${r.issues.length}</b></div></div>${r.issues.length?`<div class="notice" style="margin-top:10px"><b>Antes de guardar:</b> ${r.issues.slice(0,5).map(esc).join(' · ')}${r.issues.length>5?' · …':''}</div>`:'<div class="success" style="margin-top:10px"><b>Captura completa para revisión clínica.</b> Use “Revisar captura” antes de guardar.</div>'}<div class="vat-v192-draft" id="vatV192DraftStatus">Borrador local activo.</div>`}
function vatV192DraftPayload(){return{patient:document.getElementById('vatV165Patient')?.value||'',commonDate:document.getElementById('vatV165CommonDate')?.value||'',vaccinator:document.getElementById('vatV165Vaccinator')?.value||'',reviewed:!!document.getElementById('vatV165Reviewed')?.checked,rows:[...document.querySelectorAll('#vatV165Rows .vat-v165-row')].map(r=>({mode:r.querySelector('.m65-mode')?.value,vaccine:r.querySelector('.m65-vaccine')?.value,dose:r.querySelector('.m65-dose')?.value,date:r.querySelector('.m65-date')?.value,lotId:r.querySelector('.m65-lot')?.value,manualLot:r.querySelector('.m65-manual-lot')?.value,expiry:r.querySelector('.m65-expiry')?.value,lab:r.querySelector('.m65-lab')?.value,route:r.querySelector('.m65-route')?.value,site:r.querySelector('.m65-site')?.value,obs:r.querySelector('.m65-obs')?.value}))}}
const VAT_V192_DRAFT_KEY='vat.captureDraft.v192';
const VAT_V192_DRAFT_MAX_AGE=7*86400000;
let vatV192DraftOperation=false;
let vatV192RestorePromise=null;

function vatV192DraftText(value,max=500){
 if(typeof value!=='string'&&typeof value!=='number')return'';
 return String(value).slice(0,max);
}
function vatV192DraftDate(value,warnings,label){
 const text=vatV192DraftText(value,10);
 if(!text)return'';
 if(/^\d{4}-\d{2}-\d{2}$/.test(text)&&!Number.isNaN(Date.parse(text+'T12:00:00')))return text;
 warnings.push(`${label}: fecha inválida`);
 return'';
}
function vatV192NormalizeDraft(raw,source){
 const warnings=[];
 let draft=raw;
 if(typeof draft==='string'){
  try{draft=JSON.parse(draft)}catch(error){console.warn(`[Borrador] JSON corrupto en ${source}:`,error);return{source,invalid:true,warnings:[`${source}: contenido corrupto`]}}
 }
 if(!draft||typeof draft!=='object'||Array.isArray(draft))return{source,invalid:true,warnings:[`${source}: estructura inválida`]};
 const originalPayload=draft.payload&&typeof draft.payload==='object'?draft.payload:draft;
 const originalRows=Array.isArray(originalPayload.rows)?originalPayload.rows:Array.isArray(originalPayload.vaccines)?originalPayload.vaccines:[];
 if(!Array.isArray(originalPayload.rows)&&!Array.isArray(originalPayload.vaccines)&&originalPayload.rows!=null)warnings.push('La lista de vacunas no era válida');
 const rows=originalRows.slice(0,VAT_MULTI_MAX).map((row,index)=>{
  if(!row||typeof row!=='object'||Array.isArray(row)){warnings.push(`Vacuna ${index+1}: registro inválido`);return null}
  const mode=row.mode==='history'?'history':'current';
  if(row.mode&&row.mode!=='current'&&row.mode!=='history')warnings.push(`Vacuna ${index+1}: tipo de registro inválido`);
  return{
   mode,
   vaccine:vatV192DraftText(row.vaccine??row.biologico),
   dose:vatV192DraftText(row.dose??row.dosis,100),
   date:vatV192DraftDate(row.date??row.fecha,warnings,`Vacuna ${index+1}`),
   lotId:vatV192DraftText(row.lotId??row.inventoryId,100),
   manualLot:vatV192DraftText(row.manualLot??row.lot??row.lote,150),
   expiry:vatV192DraftDate(row.expiry??row.caducidad,warnings,`Vacuna ${index+1} caducidad`),
   lab:vatV192DraftText(row.lab??row.laboratory??row.laboratorio,200),
   route:vatV192DraftText(row.route??row.via,100),
   site:vatV192DraftText(row.site??row.sitio,100),
   obs:vatV192DraftText(row.obs??row.observations??row.observaciones,1000)
  };
 }).filter(Boolean);
 if(originalRows.length>VAT_MULTI_MAX)warnings.push(`Se ignoraron ${originalRows.length-VAT_MULTI_MAX} vacunas por exceder el máximo`);
 const patientValue=originalPayload.patientId??originalPayload.patient?.id??originalPayload.patient??'';
 const payload={
  patient:vatV192DraftText(patientValue,100),
  commonDate:vatV192DraftDate(originalPayload.commonDate??originalPayload.fechaComun,warnings,'Fecha común'),
  vaccinator:vatV192DraftText(originalPayload.vaccinator??originalPayload.vacunador,200),
  reviewed:originalPayload.reviewed===true||originalPayload.reviewed===1||originalPayload.reviewed==='true',
  rows
 };
 const hasRowData=rows.some(row=>Object.values(row).some(Boolean));
 return{source,at:Number(draft.at||draft.updatedAt||draft.timestamp||Date.now()),payload,warnings,invalid:!payload.patient&&!hasRowData};
}
async function vatV192ReadDraft(){
 const candidates=[];
 let localRaw=null;
 try{localRaw=localStorage.getItem(VAT_V192_DRAFT_KEY)}catch(error){console.warn('[Borrador] No se pudo leer localStorage:',error)}
 if(localRaw!=null)candidates.push(vatV192NormalizeDraft(localRaw,'localStorage'));
 if(window.VATStorage){
  try{const idb=await VATStorage.get(VAT_V192_DRAFT_KEY);if(idb!=null)candidates.push(vatV192NormalizeDraft(idb,'IndexedDB'))}
  catch(error){console.warn('[Borrador] No se pudo leer IndexedDB; se continuará con localStorage:',error)}
 }
 const valid=candidates.filter(x=>!x.invalid).sort((a,b)=>b.at-a.at);
 if(valid.length)return valid[0];
 if(candidates.length)return{invalid:true,warnings:candidates.flatMap(x=>x.warnings||[])};
 return null;
}
async function vatV192SaveDraft(){
 if(vatV192DraftOperation||!document.getElementById('vatV165Rows'))return;
 try{
  const draft={schemaVersion:2,at:Date.now(),payload:vatV192DraftPayload()};
  localStorage.setItem(VAT_V192_DRAFT_KEY,JSON.stringify(draft));
  if(window.VATStorage)VATStorage.put(VAT_V192_DRAFT_KEY,draft,{entity:'captureDraft',schemaVersion:2}).catch(error=>console.warn('[Borrador] No se pudo copiar a IndexedDB:',error));
  const s=document.getElementById('vatV192DraftStatus');if(s)s.textContent='Borrador guardado automáticamente a las '+new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});
 }catch(error){console.error('[Borrador] Falló el autoguardado:',error)}
}
async function vatV192ClearDraft(){
 try{localStorage.removeItem(VAT_V192_DRAFT_KEY)}catch(error){console.warn('[Borrador] No se pudo limpiar localStorage:',error)}
 if(window.VATStorage){
  try{await VATStorage.remove(VAT_V192_DRAFT_KEY)}catch(error){console.warn('[Borrador] No se pudo limpiar IndexedDB:',error)}
 }
 console.info('[Borrador] Borrador descartado.');
}
function vatV192SetValue(root,selector,value){
 const field=root?.querySelector(selector);if(field)field.value=value??'';return field;
}
async function vatV192ApplyDraft(draft){
 if(!document.getElementById('vatV165Rows')){quick('vaccination');await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))}
 const p=draft.payload,warnings=[...(draft.warnings||[])],patient=document.getElementById('vatV165Patient');
 if(!patient)throw new Error('El módulo de captura no pudo abrirse');
 patient.value=p.patient||'';
 if(p.patient&&!patient.value)warnings.push('El paciente del borrador ya no existe en el padrón');
 patient.dispatchEvent(new Event('change',{bubbles:true}));
 const common=document.getElementById('vatV165CommonDate');if(common)common.value=p.commonDate||isoToday();
 const vacc=document.getElementById('vatV165Vaccinator');if(vacc)vacc.value=p.vaccinator||'';
 const reviewed=document.getElementById('vatV165Reviewed');if(reviewed)reviewed.checked=!!p.reviewed;
 const box=document.getElementById('vatV165Rows');box.innerHTML='';
 const rows=p.rows.length?p.rows:[{mode:'current',vaccine:'',dose:'',date:p.commonDate||'',lotId:'',manualLot:'',expiry:'',lab:'',route:'',site:'',obs:''}];
 rows.forEach((saved,index)=>{
  vatV165AddRow();
  const row=[...box.querySelectorAll('.vat-v165-row')].pop();if(!row){warnings.push(`Vacuna ${index+1}: no pudo crearse`);return}
  vatV192SetValue(row,'.m65-mode',saved.mode||'current');vatV165Mode(row);
  vatV192SetValue(row,'.m65-vaccine',saved.vaccine);
  const dose=vatV192SetValue(row,'.m65-dose',saved.dose||'No especificada');if(saved.dose&&dose&&!dose.value){dose.value='No especificada';warnings.push(`Vacuna ${index+1}: dosis no reconocida`)}
  vatV192SetValue(row,'.m65-date',saved.date||p.commonDate||isoToday());
  vatV165LoadLots(row);
  const lot=vatV192SetValue(row,'.m65-lot',saved.lotId);if(saved.lotId&&lot&&!lot.value)warnings.push(`Vacuna ${index+1}: lote de inventario no disponible`);
  if(lot?.value)vatV165LotChanged(row);
  vatV192SetValue(row,'.m65-manual-lot',saved.manualLot);
  vatV192SetValue(row,'.m65-expiry',saved.expiry);
  vatV192SetValue(row,'.m65-lab',saved.lab);
  if(saved.route&&!vatV192SetSelect(row.querySelector('.m65-route'),saved.route))warnings.push(`Vacuna ${index+1}: vía no reconocida`);
  if(saved.site&&!vatV192SetSelect(row.querySelector('.m65-site'),saved.site))warnings.push(`Vacuna ${index+1}: sitio no reconocido`);
  vatV192SetValue(row,'.m65-obs',saved.obs);
  vatV192AssistRow(row);
 });
 vatV165Renumber();vatV192RenderSummary();
 const msg=document.getElementById('vatV165Msg'),uniqueWarnings=[...new Set(warnings)];
 if(msg)msg.innerHTML=uniqueWarnings.length?`<div class="notice"><b>Borrador recuperado parcialmente.</b> Se conservaron los campos válidos. ${uniqueWarnings.map(esc).join(' · ')}</div>`:'<div class="success"><b>Borrador recuperado correctamente.</b> Revise los datos antes de guardar.</div>';
 console.info(`[Borrador] Recuperado desde ${draft.source}.`,{rows:p.rows.length,warnings:uniqueWarnings});
 if(uniqueWarnings.length)alert('El borrador se recuperó parcialmente. Algunos campos inválidos o antiguos fueron ignorados; revise el aviso en el formulario.');
}
function vatV192RestoreDraft(){
 if(vatV192RestorePromise)return vatV192RestorePromise;
 vatV192DraftOperation=true;
 vatV192RestorePromise=(async()=>{
  const draft=await vatV192ReadDraft();
  if(!draft)return;
  if(draft.invalid){
   console.warn('[Borrador] No hay campos recuperables:',draft.warnings);
   await vatV192ClearDraft();
   alert('El borrador estaba corrupto o no contenía campos recuperables. Fue descartado y la aplicación puede continuar.');
   return;
  }
  if(Date.now()-draft.at>VAT_V192_DRAFT_MAX_AGE){console.info('[Borrador] Borrador vencido; se descartará.');await vatV192ClearDraft();return}
  if(!confirm('Se encontró una captura sin finalizar. ¿Desea recuperarla?')){await vatV192ClearDraft();return}
  try{await vatV192ApplyDraft(draft);await vatV192ClearDraft()}
  catch(error){console.error('[Borrador] No fue posible restaurar la captura:',error);alert('No fue posible recuperar completamente el borrador. La aplicación continuará abierta; revise la consola para diagnóstico.')}
 })().finally(()=>{vatV192DraftOperation=false;vatV192RestorePromise=null});
 return vatV192RestorePromise;
}
const vatV192VaccinationBase=vaccination;vaccination=function(){vatV192DraftOperation=true;vatV192VaccinationBase();const card=document.querySelector('#view .vat-v165-head')?.parentElement;if(card&&!document.getElementById('vatV192Assistant'))document.getElementById('vatV165Suggest')?.insertAdjacentHTML('beforebegin','<div id="vatV192Assistant" class="vat-v192-assistant"></div>');const rows=document.getElementById('vatV165Rows');if(rows){rows.addEventListener('input',e=>vatV192AssistRow(e.target.closest('.vat-v165-row')));rows.addEventListener('change',e=>vatV192AssistRow(e.target.closest('.vat-v165-row')))}['vatV165Patient','vatV165CommonDate','vatV165Vaccinator','vatV165Reviewed'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>{vatV192RenderSummary();vatV192SaveDraft()}));document.querySelectorAll('#vatV165Rows .vat-v165-row').forEach(vatV192AssistRow);vatV192RenderSummary();setTimeout(vatV192RestoreDraft,100)};
const vatV192InitBase=init;init=function(){vatV192InitBase();setTimeout(vatV192RestoreDraft,150)};
const vatV192SaveBase=vatV165Save;vatV165Save=function(){const r=vatV192SummaryData();if(r.issues.length){const msg=document.getElementById('vatV165Msg');if(msg)msg.innerHTML='<div class="notice"><b>No se guardó.</b> Complete primero: '+r.issues.slice(0,6).map(esc).join(' · ')+'</div>';return}vatV192SaveBase();setTimeout(()=>{const m=document.getElementById('vatV165Msg');if(m&&m.textContent.includes('registradas'))vatV192ClearDraft()},50)};
