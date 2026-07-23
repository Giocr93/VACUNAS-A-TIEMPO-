
/* v1.9.0 · Motor de Estado del Esquema.
   Interpreta la base ya configurada, explica hallazgos y conserva la decisión profesional. */
const VAT_STATE_VERSION='1.9.0';
const VAT_NORMATIVE_LIBRARY={
 'bcg':{via:'Intradérmica',volumen:'Según presentación y edad',sitio:'Región deltoidea derecha',fuente:'Base clínica configurada 2026'},
 'hepatitis b':{via:'Intramuscular',volumen:'0.5 mL',sitio:'Muslo anterolateral en menores',fuente:'Base clínica configurada 2026'},
 'hexavalente':{via:'Intramuscular',volumen:'0.5 mL',sitio:'Muslo anterolateral; deltoides según edad y masa muscular',fuente:'Base clínica configurada 2026'},
 'rotavirus':{via:'Oral',volumen:'Según producto',sitio:'Vía oral',fuente:'Base clínica configurada 2026'},
 'neumococo':{via:'Intramuscular',volumen:'0.5 mL',sitio:'Muslo anterolateral; deltoides según edad',fuente:'Base clínica configurada 2026'},
 'influenza':{via:'Intramuscular',volumen:'Según edad y producto',sitio:'Muslo o deltoides según edad',fuente:'Base clínica configurada 2026'},
 'srp':{via:'Subcutánea',volumen:'0.5 mL',sitio:'Región deltoidea',fuente:'Base clínica configurada 2026'},
 'dpt':{via:'Intramuscular',volumen:'0.5 mL',sitio:'Deltoides o muslo según edad',fuente:'Base clínica configurada 2026'},
 'hepatitis a':{via:'Intramuscular',volumen:'Según producto',sitio:'Muslo o deltoides según edad',fuente:'Base clínica configurada 2026'},
 'varicela':{via:'Subcutánea',volumen:'0.5 mL',sitio:'Región deltoidea',fuente:'Base clínica configurada 2026'}
};
function vatStateKey(v){return vatEngineNormalize(v||'')}
function vatStateLibrary(v){const k=vatStateKey(v);return VAT_NORMATIVE_LIBRARY[k]||{via:'Verificar ficha técnica',volumen:'Verificar producto',sitio:'Verificar edad, producto y lineamiento',fuente:'Base clínica configurada 2026'}}
function vatStateGroup(patient,onDate=isoToday()){
 const engine=vatEngineEvaluate(patient,onDate),groups={};
 (engine.items||[]).forEach(x=>{const k=vatStateKey(x.vaccine);(groups[k]||(groups[k]={vaccine:x.vaccine,items:[]})).items.push(x)});
 const biologics=Object.values(groups).map(g=>{
  const completed=g.items.filter(x=>x.status==='complete'),missing=g.items.filter(x=>x.status!=='complete');
  const closed=missing.filter(x=>x.status==='out_of_time'),available=missing.filter(x=>['due','special'].includes(x.status)),upcoming=missing.filter(x=>x.status==='upcoming');
  let state='FUTURO',label='Aún no corresponde',rank=6,reason='Las dosis restantes se encuentran fuera de la ventana próxima configurada.';
  if(closed.length){state='REVISAR';label='Requiere revisión';rank=1;reason=`${closed.length} dosis aparece(n) fuera de la ventana de edad configurada.`}
  else if(available.length&&completed.length){state='RECUPERACION';label='En recuperación';rank=2;reason=`Hay antecedente de ${completed.length} dosis y ${available.length} dosis disponible(s) para revisión.`}
  else if(available.length){state='DISPONIBLE';label='Disponible';rank=3;reason=`${available.length} dosis aparece(n) disponible(s) según edad y reglas configuradas.`}
  else if(!missing.length){state='COMPLETA';label='Completa';rank=5;reason='Todas las dosis configuradas para este biológico están registradas.'}
  else if(upcoming.length){state='PROXIMA';label='Próxima';rank=4;reason='Existe al menos una dosis próxima dentro de un mes.'}
  const next=missing.sort((a,b)=>(a.minimumDate||a.targetDate||'9999').localeCompare(b.minimumDate||b.targetDate||'9999'))[0]||null;
  return{...g,state,label,rank,reason,completed:completed.length,total:g.items.length,next,library:vatStateLibrary(g.vaccine)};
 }).sort((a,b)=>a.rank-b.rank||a.vaccine.localeCompare(b.vaccine));
 const counts={complete:biologics.filter(x=>x.state==='COMPLETA').length,available:biologics.filter(x=>x.state==='DISPONIBLE').length,recovery:biologics.filter(x=>x.state==='RECUPERACION').length,review:biologics.filter(x=>x.state==='REVISAR').length,upcoming:biologics.filter(x=>x.state==='PROXIMA').length};
 const total=biologics.length,percent=total?Math.round((counts.complete/total)*100):0;
 const general=counts.review?'REVISAR':counts.recovery?'RECUPERACION':counts.available?'DISPONIBLE':counts.upcoming?'PROXIMA':'COMPLETO';
 const generalLabel={REVISAR:'Requiere revisión clínica',RECUPERACION:'Esquema en recuperación',DISPONIBLE:'Hay vacunas disponibles',PROXIMA:'Próxima dosis cercana',COMPLETO:'Sin pendientes detectados'}[general];
 return{engine,biologics,counts,total,percent,general,generalLabel,priorities:biologics.filter(x=>['REVISAR','RECUPERACION','DISPONIBLE'].includes(x.state))};
}
function vatStatePill(x){const cls={COMPLETA:'complete',DISPONIBLE:'available',RECUPERACION:'recovery',REVISAR:'review',PROXIMA:'upcoming',FUTURO:'future'}[x.state]||'future';return `<span class="vat-v190-pill vat-v190-${cls}">${esc(x.label)}</span>`}
function vatStateEvidence(x){return `<details class="vat-v190-evidence"><summary><b>📚 Información clínica configurada</b></summary><p><b>Vía:</b> ${esc(x.library.via)}</p><p><b>Volumen:</b> ${esc(x.library.volumen)}</p><p><b>Sitio:</b> ${esc(x.library.sitio)}</p><p class="muted"><b>Fuente interna:</b> ${esc(x.library.fuente)}. Confirmar siempre con ficha técnica, cartilla, lineamiento institucional y condición del paciente.</p></details>`}
function stateEngine(){
 view.innerHTML=`<div class="card vat-v190-hero"><div class="row" style="justify-content:space-between"><div><h2>🧭 Estado del esquema</h2><p class="muted">Motor v${VAT_STATE_VERSION}. Integra dosis registradas, pendientes, recuperación y situaciones para revisión.</p></div><span class="badge">v${VAT_STATE_VERSION}</span></div><div class="two"><div class="field"><label>Paciente</label><select id="vatStatePatient" onchange="vatRenderStateEngine()"><option value="">Seleccione</option>${data.patients.map(p=>`<option value="${p.id}">${esc(full(p))}</option>`).join('')}</select></div><div class="field"><label>Evaluar al día</label><input id="vatStateDate" type="date" value="${isoToday()}" onchange="vatRenderStateEngine()"></div></div><div class="notice"><b>Alcance:</b> organiza y explica la información disponible; no sustituye valoración, interrogatorio, cartilla original ni decisión profesional.</div></div><div id="vatStateResult" class="section"><div class="card"><p class="muted">Seleccione un paciente.</p></div></div>`;
}
function vatRenderStateEngine(){
 const p=data.patients.find(x=>String(x.id)===String(document.getElementById('vatStatePatient')?.value)),date=document.getElementById('vatStateDate')?.value||isoToday(),box=document.getElementById('vatStateResult');if(!box)return;
 if(!p){box.innerHTML='<div class="card"><p class="muted">Seleccione un paciente.</p></div>';return}
 const r=vatStateGroup(p,date);
 box.innerHTML=`<div class="card"><div class="row" style="justify-content:space-between"><div><h3>${esc(full(p))}</h3><p><b>Edad:</b> ${esc(r.engine.age?.label||'No calculable')} · <b>Estado:</b> ${esc(r.generalLabel)}</p></div><button class="btn primary" onclick="patientRecord(${JSON.stringify(p.id)})">Abrir expediente</button></div><div class="vat-v190-grid section"><div class="vat-v190-stat"><span>Avance por biológicos</span><b>${r.percent}%</b></div><div class="vat-v190-stat"><span>Disponibles</span><b>${r.counts.available}</b></div><div class="vat-v190-stat"><span>En recuperación</span><b>${r.counts.recovery}</b></div><div class="vat-v190-stat"><span>Para revisión</span><b>${r.counts.review}</b></div></div><div class="vat-v190-progress section"><span style="width:${r.percent}%"></span></div></div>
 <div class="card vat-v190-priority section"><h3>Prioridades para revisión profesional</h3>${r.priorities.length?r.priorities.map((x,i)=>`<div class="vat-v190-row"><div><b>${i+1}. ${esc(x.vaccine)}</b><br>${vatStatePill(x)}</div><div>${x.next?esc(x.next.dose):'—'}</div><div class="vat-v190-reason">${esc(x.reason)}${x.next?.minimumDate?`<br>Fecha mínima/objetivo configurada: <b>${formatDateMX(x.next.minimumDate||x.next.targetDate)}</b>`:''}</div><button class="btn secondary" onclick="vatStatePrepare('${esc(x.vaccine)}','${esc(x.next?.dose||'')}','${p.id}')">Preparar captura</button></div>`).join(''):'<div class="success">No se identificaron prioridades inmediatas en la evaluación automática.</div>'}</div>
 <div class="card section"><h3>Estado por biológico</h3>${r.biologics.map(x=>`<div class="vat-v190-row"><div><b>${esc(x.vaccine)}</b><br><span class="muted">${x.completed}/${x.total} dosis localizadas</span></div><div>${vatStatePill(x)}</div><div class="vat-v190-reason">${esc(x.reason)}${vatStateEvidence(x)}</div><div>${x.next?`<b>${esc(x.next.dose)}</b><br><span class="muted">${x.next.minimumDate?formatDateMX(x.next.minimumDate):x.next.targetDate?formatDateMX(x.next.targetDate):''}</span>`:'—'}</div></div>`).join('')}</div>`;
}
function vatStatePrepare(vaccine,dose,pid){quick('vaccination');setTimeout(()=>{const s=document.getElementById('vatV165Patient');if(s){s.value=pid;s.dispatchEvent(new Event('change'))}setTimeout(()=>{if(typeof vatV165AddRow==='function')vatV165AddRow({vaccine,dose});},80)},50)}
if(!tabs.some(t=>t[0]==='stateEngine')){const i=tabs.findIndex(t=>t[0]==='recoveryPlanner');tabs.splice(i<0?3:i+1,0,['stateEngine','Estado del esquema'])}
const vatV190PatientRecordBase=patientRecord;patientRecord=function(id){vatV190PatientRecordBase(id);const p=data.patients.find(x=>x.id===id),root=document.querySelector('#view .smart-record');if(!p||!root)return;const r=vatStateGroup(p),head=root.querySelector('.smart-head');if(head)head.insertAdjacentHTML('afterend',`<div class="vat-v190-record"><div class="row" style="justify-content:space-between"><div><b>🧭 Estado integral:</b> ${esc(r.generalLabel)} · ${r.percent}% de biológicos completos · ${r.counts.available} disponible(s) · ${r.counts.recovery} en recuperación · ${r.counts.review} para revisión.</div><button class="btn secondary no-print" onclick="quick('stateEngine');setTimeout(()=>{const s=document.getElementById('vatStatePatient');if(s){s.value='${id}';vatRenderStateEngine()}},40)">Ver estado completo</button></div></div>`)};
