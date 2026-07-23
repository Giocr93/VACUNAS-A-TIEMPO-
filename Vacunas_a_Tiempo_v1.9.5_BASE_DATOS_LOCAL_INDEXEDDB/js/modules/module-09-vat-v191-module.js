
/* v1.9.1 · Motor de Consistencia Clínica */
const VAT_CONSISTENCY_VERSION='1.9.1';
function vatV191Date(v){if(!v)return null;const d=new Date(String(v).slice(0,10)+'T12:00:00');return isNaN(d)?null:d}
function vatV191Days(a,b){const x=vatV191Date(a),y=vatV191Date(b);return x&&y?Math.round((y-x)/86400000):null}
function vatV191Finding(level,title,detail,action,refs=[]){return{level,title,detail,action,refs}}
function vatV191PatientApps(p){return (data.vaccinations||[]).filter(v=>String(v.patientId)===String(p.id)||(!v.patientId&&v.patient===full(p))).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')))}
function vatV191DoseNum(v){const m=String(v?.dose||'').match(/\d+/);return m?Number(m[0]):null}
function vatV191Analyze(p,onDate=isoToday()){
 const apps=vatV191PatientApps(p),f=[],birth=p.birth||p.dob||p.birthDate||'',today=onDate;
 const seen=new Map(),byBio={};
 apps.forEach((v,i)=>{
  const tag=`${v.vaccine||'Vacuna'}${v.dose?' · '+v.dose:''}`;
  if(!v.date)f.push(vatV191Finding('critical',tag,'El registro no tiene fecha de aplicación.','Completar o corregir la fecha antes de interpretar el esquema.'));
  if(v.date&&birth&&v.date<birth)f.push(vatV191Finding('critical',tag,'La fecha de aplicación es anterior al nacimiento.','Verificar fecha de nacimiento y fecha del evento.'));
  if(v.date&&v.date>today)f.push(vatV191Finding('critical',tag,'La aplicación está registrada en una fecha futura.','Corregir la fecha o confirmar que se trate de una programación y no de una aplicación.'));
  const key=[vatEngineNormalize(v.vaccine||''),vatEngineNormalize(v.dose||''),v.date||''].join('|');
  if(seen.has(key))f.push(vatV191Finding('review',tag,'Existe otro registro con la misma vacuna, dosis y fecha.','Confirmar si son eventos distintos o un duplicado de captura.'));
  else seen.set(key,i);
  const k=vatEngineNormalize(v.vaccine||'');(byBio[k]||(byBio[k]=[])).push(v);
  if(v.expiry&&v.date&&v.expiry<v.date)f.push(vatV191Finding('critical',tag,`El lote aparece caducado para la fecha de aplicación (${v.expiry}).`,'Revisar lote, caducidad y fuente del registro.'));
  if((v.recordType!=='history'&&v.source!=='Histórica / cartilla')&&!String(v.lot||'').trim())f.push(vatV191Finding('review',tag,'Aplicación actual sin lote registrado.','Completar el lote para conservar trazabilidad.'));
  if(!String(v.route||'').trim())f.push(vatV191Finding('info',tag,'No se registró la vía de administración.','Completarla cuando el dato esté disponible.'));
  if(!String(v.site||'').trim())f.push(vatV191Finding('info',tag,'No se registró el sitio anatómico.','Completarlo cuando el dato esté disponible.'));
 });
 Object.entries(byBio).forEach(([k,list])=>{
  list.sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
  const nums=list.map(vatV191DoseNum).filter(Number.isFinite);
  nums.forEach(n=>{if(n>1&&!nums.includes(n-1))f.push(vatV191Finding('review',list.find(x=>vatV191DoseNum(x)===n)?.vaccine||k,`Se localizó dosis ${n} sin dosis ${n-1} en este expediente.`,'Revisar cartilla, antecedentes de otra unidad o nomenclatura de dosis.'))});
  for(let i=1;i<list.length;i++){
   const d=vatV191Days(list[i-1].date,list[i].date);if(d!==null&&d<0)f.push(vatV191Finding('review',list[i].vaccine,'El orden cronológico del biológico es inconsistente.','Revisar fechas y orden de dosis.'));
   if(d===0&&vatV191DoseNum(list[i])!==vatV191DoseNum(list[i-1]))f.push(vatV191Finding('review',list[i].vaccine,'Hay dosis diferentes del mismo biológico registradas el mismo día.','Confirmar que no exista duplicidad o error de dosis.'));
  }
 });
 const critical=f.filter(x=>x.level==='critical').length,review=f.filter(x=>x.level==='review').length,info=f.filter(x=>x.level==='info').length;
 return{apps,findings:f,critical,review,info,status:critical?'REVISAR':review?'OBSERVAR':'CONSISTENTE'};
}
function vatV191Pill(level){return level==='critical'?'<span class="badge" style="background:#fee2e2;color:#991b1b">CRÍTICO</span>':level==='review'?'<span class="badge warn">REVISAR</span>':'<span class="badge">INFORMACIÓN</span>'}
function consistencyEngine(){
 view.innerHTML=`<div class="card vat-v191-hero"><div class="row" style="justify-content:space-between"><div><h2>🛡️ Consistencia clínica</h2><p class="muted">Revisa calidad y coherencia del expediente sin sustituir la valoración profesional.</p></div><span class="badge">v${VAT_CONSISTENCY_VERSION}</span></div><div class="two"><div class="field"><label>Paciente</label><select id="vatV191Patient" onchange="vatV191Render()"><option value="">Seleccione</option>${data.patients.map(p=>`<option value="${p.id}">${esc(full(p))}</option>`).join('')}</select></div><div class="field"><label>Revisar al día</label><input id="vatV191Date" type="date" value="${isoToday()}" onchange="vatV191Render()"></div></div></div><div id="vatV191Result" class="section"><div class="card"><p class="muted">Seleccione un paciente para ejecutar la revisión.</p></div></div>`;
}
function vatV191Render(){
 const pid=document.getElementById('vatV191Patient')?.value,box=document.getElementById('vatV191Result'),p=data.patients.find(x=>String(x.id)===String(pid));if(!box)return;if(!p){box.innerHTML='<div class="card"><p class="muted">Seleccione un paciente.</p></div>';return}
 const r=vatV191Analyze(p,document.getElementById('vatV191Date')?.value||isoToday());
 box.innerHTML=`<div class="card"><div class="row" style="justify-content:space-between"><div><h3>${esc(full(p))}</h3><b>${r.status==='CONSISTENTE'?'🟢 Expediente consistente':r.status==='OBSERVAR'?'🟠 Requiere observación':'🔴 Requiere revisión'}</b></div><button class="btn secondary" onclick="patientRecord(${JSON.stringify(p.id)})">Abrir expediente</button></div><div class="vat-v191-summary"><div class="vat-v191-stat">Aplicaciones<b>${r.apps.length}</b></div><div class="vat-v191-stat">Críticas<b>${r.critical}</b></div><div class="vat-v191-stat">Para revisar<b>${r.review}</b></div><div class="vat-v191-stat">Datos incompletos<b>${r.info}</b></div></div></div><div class="card section"><h3>Hallazgos</h3>${r.findings.length?r.findings.map(x=>`<div class="vat-v191-finding vat-v191-${x.level}"><div class="vat-v191-level">${vatV191Pill(x.level)}</div><div><b>${esc(x.title)}</b><div class="vat-v191-meta">${esc(x.detail)}</div></div><div><b>Verificar:</b> ${esc(x.action)}</div></div>`).join(''):'<div class="vat-v191-clean"><b>Sin inconsistencias detectadas con las reglas automáticas actuales.</b><br><span class="muted">La ausencia de alertas no sustituye la revisión de cartilla, interrogatorio, lineamientos vigentes ni criterio profesional.</span></div>'}</div>`;
}
if(!tabs.some(t=>t[0]==='consistencyEngine')){const i=tabs.findIndex(t=>t[0]==='stateEngine');tabs.splice(i<0?4:i+1,0,['consistencyEngine','Consistencia clínica'])}
const vatV191PatientRecordBase=patientRecord;patientRecord=function(id){vatV191PatientRecordBase(id);const p=data.patients.find(x=>String(x.id)===String(id)),root=document.querySelector('#view .smart-record');if(!p||!root)return;const r=vatV191Analyze(p);const head=root.querySelector('.smart-head');if(head)head.insertAdjacentHTML('afterend',`<div class="vat-v191-record"><div class="row" style="justify-content:space-between"><div><b>${r.critical?'🔴':r.review?'🟠':'🟢'} Consistencia:</b> ${r.critical} crítica(s), ${r.review} para revisar y ${r.info} dato(s) incompleto(s).</div><button class="btn secondary no-print" onclick="quick('consistencyEngine');setTimeout(()=>{const s=document.getElementById('vatV191Patient');if(s){s.value='${id}';vatV191Render()}},40)">Revisar consistencia</button></div></div>`)};
