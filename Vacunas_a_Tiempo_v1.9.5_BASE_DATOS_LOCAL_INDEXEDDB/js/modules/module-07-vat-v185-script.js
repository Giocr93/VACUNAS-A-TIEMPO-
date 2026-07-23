

/* v1.8.5 · Mapa educativo para recuperación de esquemas.
   Organiza la información configurada; no prescribe ni sustituye lineamientos. */
const VAT_RECOVERY_VERSION='1.8.5';
function vatRecoveryKey(v){return vatEngineNormalize(v||'')}
function vatRecoveryBuild(patient,onDate=isoToday()){
 const e=vatEngineEvaluate(patient,onDate),groups={};
 (e.items||[]).forEach(item=>{const k=vatRecoveryKey(item.vaccine);(groups[k]||(groups[k]=[])).push(item)});
 const reviewToday=[],later=[],closed=[],complete=[];
 Object.values(groups).forEach(items=>{
  items.sort((a,b)=>(a.dueMonths||0)-(b.dueMonths||0));
  const completed=items.filter(x=>x.status==='complete');
  const missing=items.filter(x=>x.status!=='complete');
  const closedItems=missing.filter(x=>x.status==='out_of_time');
  const available=missing.filter(x=>['due','special'].includes(x.status));
  const future=missing.filter(x=>['upcoming','future'].includes(x.status));
  if(completed.length)complete.push(...completed);
  if(available.length){
   const first=available[0];
   reviewToday.push({...first,remainingSeries:available.slice(1).concat(future),completedCount:completed.length});
   later.push(...available.slice(1).map(x=>({...x,sequenceReason:'Dosis posterior de la misma serie; verificar intervalo mínimo desde la dosis que se confirme o aplique.'})));
  } else later.push(...future);
  closed.push(...closedItems);
 });
 reviewToday.sort((a,b)=>(a.dueMonths||0)-(b.dueMonths||0));
 later.sort((a,b)=>(a.minimumDate||a.targetDate||'9999').localeCompare(b.minimumDate||b.targetDate||'9999'));
 closed.sort((a,b)=>(a.dueMonths||0)-(b.dueMonths||0));
 return{engine:e,reviewToday,later,closed,complete};
}
function vatRecoveryDoseHtml(x,kind){
 const date=x.minimumDate||x.targetDate||'';
 const reason=kind==='today'
  ?`${x.completedCount?`Se localizaron ${x.completedCount} dosis previas. `:''}Es la primera dosis faltante de este biológico que el motor coloca para revisión.`
  :kind==='closed'?(x.reason||'La ventana de edad configurada aparece cerrada.')
  :(x.sequenceReason||`Fecha orientativa por edad configurada${date?': '+formatDateMX(date):''}.`);
 const badge=kind==='today'?'Revisar hoy':kind==='closed'?'Ventana cerrada':'Etapa posterior';
 return `<div class="vat-v185-dose"><div><b>${esc(x.vaccine)} · ${esc(x.dose)}</b><br><span class="vat-v185-chip">${esc(badge)}</span>${x.kind==='special'?'<span class="vat-v185-chip">Criterio especial</span>':''}</div><div class="vat-v185-reason">${esc(reason)}</div><div>${kind==='today'?`<button class="btn secondary" onclick="vatRecoveryPrepare(${JSON.stringify(x.vaccine)},${JSON.stringify(x.dose)})">Preparar captura</button>`:''}</div></div>`;
}
function recoveryPlanner(){
 view.innerHTML=`<div class="card"><div class="row" style="justify-content:space-between"><div><h2>🧩 Recuperación de esquemas</h2><p class="muted">Mapa educativo v${VAT_RECOVERY_VERSION}. Ordena la primera dosis faltante por biológico y separa etapas posteriores.</p></div><span class="badge">v${VAT_RECOVERY_VERSION}</span></div><div class="two"><div class="field"><label>Paciente</label><select id="vatRecoveryPatient" onchange="vatRenderRecovery()"><option value="">Seleccione</option>${data.patients.map(p=>`<option value="${p.id}">${esc(full(p))}</option>`).join('')}</select></div><div class="field"><label>Evaluar al día</label><input id="vatRecoveryDate" type="date" value="${isoToday()}" onchange="vatRenderRecovery()"></div></div><div class="notice"><b>Uso responsable:</b> este mapa no indica por sí mismo qué aplicar. La enfermera debe verificar cartilla original, antecedentes, estado clínico, intervalos mínimos específicos, fichas técnicas, disponibilidad y lineamientos vigentes.</div></div><div id="vatRecoveryResult" class="section"><div class="card"><p class="muted">Seleccione un paciente para construir el mapa.</p></div></div>`;
}
function vatRenderRecovery(){
 const p=data.patients.find(x=>String(x.id)===String(document.getElementById('vatRecoveryPatient')?.value)),date=document.getElementById('vatRecoveryDate')?.value||isoToday(),box=document.getElementById('vatRecoveryResult');if(!box)return;
 if(!p){box.innerHTML='<div class="card"><p class="muted">Seleccione un paciente.</p></div>';return}
 const r=vatRecoveryBuild(p,date),e=r.engine;
 box.innerHTML=`<div class="card vat-v185-summary"><div class="row" style="justify-content:space-between"><div><h3>${esc(full(p))}</h3><p><b>Fecha de nacimiento:</b> ${esc(formatDateMX(p.birth))} · <b>Edad:</b> ${esc(e.age?.label||'No calculable')}</p></div><div class="row"><button class="btn secondary" onclick="vatExportRecoveryCSV(${JSON.stringify(p.id)},'${date}')">Exportar CSV</button><button class="btn primary" onclick="patientRecord(${JSON.stringify(p.id)})">Expediente</button></div></div><div class="vat-v185-grid"><div class="vat-v185-stat"><span>Biológicos para revisar</span><b>${r.reviewToday.length}</b></div><div class="vat-v185-stat"><span>Dosis en etapas posteriores</span><b>${r.later.length}</b></div><div class="vat-v185-stat"><span>Ventanas cerradas</span><b>${r.closed.length}</b></div><div class="vat-v185-stat"><span>Dosis localizadas</span><b>${r.complete.length}</b></div></div><div class="vat-v185-warning"><b>Regla de seguridad del mapa:</b> cuando faltan varias dosis del mismo biológico, solo se coloca la primera dosis faltante en la revisión inicial. Las siguientes se muestran aparte para evitar sugerir varias dosis de una misma serie en la misma visita.</div></div>
 <div class="vat-v185-stage today"><h3>1. Primera jornada de revisión</h3><p class="muted">Biológicos cuya primera dosis faltante aparece disponible por edad en la base configurada.</p>${r.reviewToday.length?r.reviewToday.map(x=>vatRecoveryDoseHtml(x,'today')).join(''):'<div class="success">No se detectaron primeras dosis faltantes disponibles en la evaluación automática.</div>'}</div>
 <div class="vat-v185-stage later"><h3>2. Etapas posteriores</h3><p class="muted">No son órdenes ni citas definitivas. Deben recalcularse después de confirmar cada antecedente o aplicación y verificar el intervalo específico.</p>${r.later.length?r.later.slice(0,30).map(x=>vatRecoveryDoseHtml(x,'later')).join(''):'<p class="muted">Sin etapas posteriores calculadas.</p>'}</div>
 <div class="vat-v185-stage stop"><h3>3. Ventanas de edad cerradas</h3><p class="muted">Requieren revisión normativa; el sistema no las traslada automáticamente a otro esquema.</p>${r.closed.length?r.closed.map(x=>vatRecoveryDoseHtml(x,'closed')).join(''):'<p class="muted">No se detectaron ventanas cerradas.</p>'}</div>
 <div class="notice section"><b>Alcance actual:</b> esta versión usa las reglas ya configuradas en el motor 2026. Todavía no constituye una biblioteca normativa completa por producto, condición clínica o grupo de riesgo.</div>`;
}
function vatRecoveryPrepare(vaccine,dose){
 const pid=document.getElementById('vatRecoveryPatient')?.value;quick('vaccination');setTimeout(()=>{const s=document.getElementById('vatV165Patient');if(s){s.value=pid;s.dispatchEvent(new Event('change'))}setTimeout(()=>{if(typeof vatV165AddRow==='function')vatV165AddRow({vaccine,dose});},80)},50);
}
function vatExportRecoveryCSV(patientId,onDate){
 const p=data.patients.find(x=>String(x.id)===String(patientId));if(!p)return;const r=vatRecoveryBuild(p,onDate),rows=[['Paciente',full(p)],['Fecha de nacimiento',p.birth||''],['Edad',r.engine.age?.label||''],[],['Etapa','Biológico','Dosis','Estado/fecha','Nota']];
 r.reviewToday.forEach(x=>rows.push(['Primera jornada de revisión',x.vaccine,x.dose,'Revisar hoy','Primera dosis faltante del biológico según reglas configuradas']));
 r.later.forEach(x=>rows.push(['Etapa posterior',x.vaccine,x.dose,x.minimumDate||x.targetDate||'',x.sequenceReason||'Verificar intervalo específico']));
 r.closed.forEach(x=>rows.push(['Ventana cerrada',x.vaccine,x.dose,x.maxAgeLabel||'',x.reason||'Revisión normativa requerida']));
 rows.push([],['Aviso','Herramienta educativa. Confirmar cartilla, antecedentes, estado clínico, intervalos, fichas técnicas y lineamientos vigentes.']);downloadCSV('mapa_recuperacion_'+vatEngineNormalize(full(p)).replace(/ /g,'_')+'_'+onDate+'.csv',rows);
}
if(!tabs.some(t=>t[0]==='recoveryPlanner')){const i=tabs.findIndex(t=>t[0]==='vaccineEngine');tabs.splice(i<0?3:i+1,0,['recoveryPlanner','Recuperación de esquemas'])}
const vatV185PatientRecordBase=patientRecord;patientRecord=function(id){vatV185PatientRecordBase(id);const p=data.patients.find(x=>x.id===id),root=document.querySelector('#view .smart-record');if(!p||!root)return;const r=vatRecoveryBuild(p),head=root.querySelector('.smart-head');if(head)head.insertAdjacentHTML('afterend',`<div class="notice section"><b>🧩 Mapa de recuperación:</b> ${r.reviewToday.length} biológico(s) con primera dosis faltante para revisar · ${r.later.length} dosis en etapas posteriores · ${r.closed.length} ventana(s) cerrada(s). <button class="btn secondary" onclick="quick('recoveryPlanner');setTimeout(()=>{const s=document.getElementById('vatRecoveryPatient');if(s){s.value='${id}';vatRenderRecovery()}},40)">Abrir mapa</button></div>`)};

