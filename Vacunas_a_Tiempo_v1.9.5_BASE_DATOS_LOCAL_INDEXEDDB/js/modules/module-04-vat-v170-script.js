
/* v1.7.0 · Encabezado clínico permanente y motor orientativo de sitio anatómico */
const VAT_V170_VERSION='1.7.0';
function vatV170PatientById(id){return (data.patients||[]).find(x=>String(x.id)===String(id))}
function vatV170Age(patient,onDate=isoToday()){
 try{return patient?.birth&&typeof vatEngineAge==='function'?vatEngineAge(patient.birth,onDate):null}catch(e){return null}
}
function vatV170PatientStrip(patient){
 const age=vatV170Age(patient),birth=patient.birth?formatDateMX(patient.birth):'NO REGISTRADA';
 return `<div class="vat-v170-clinical-strip" role="region" aria-label="Datos clínicos esenciales"><div class="vat-v170-clinical-grid"><div class="dob"><b>📅 FECHA DE NACIMIENTO:</b> ${esc(birth)}</div><div class="age">🎂 Edad exacta: ${esc(age?.label||'No calculable')}</div><div><b>Sexo:</b> ${esc(patient.sex||'No registrado')}</div><div><b>CURP:</b> ${esc(patient.curp||'No registrada')}</div></div><div class="vat-v170-source">Dato visible para verificación humana. El motor orienta; el profesional de enfermería confirma la decisión.</div></div>`;
}
const vatV170PatientRecordBase=patientRecord;
patientRecord=function(id){
 vatV170PatientRecordBase(id);
 const p=vatV170PatientById(id),root=document.querySelector('#view .smart-record');
 if(!p||!root)return;
 root.querySelector('.vat-v170-clinical-strip')?.remove();
 root.insertAdjacentHTML('afterbegin',vatV170PatientStrip(p));
};
function vatV170SiteOptions(){return ['Muslo anterolateral derecho','Muslo anterolateral izquierdo','Deltoides derecho','Deltoides izquierdo','Región deltoidea derecha','Región deltoidea izquierda','Región tricipital derecha','Región tricipital izquierda','Vía oral','Intranasal','Otro','No especificado']}
function vatV170SiteRule(vaccine,patient,index=0){
 const n=vatV165Norm(vaccine),age=vatV170Age(patient),months=age?age.totalMonths:999;
 if(/rotavirus|sabin|opv|poliomielitis oral/.test(n))return{site:'Vía oral',route:'Oral',why:'Biológico de administración oral.'};
 if(/intranasal/.test(n))return{site:'Intranasal',route:'Intranasal',why:'Presentación de administración intranasal.'};
 if(/bcg|tuberculosis/.test(n))return{site:'Región deltoidea derecha',route:'Intradérmica',why:'BCG: región deltoidea del brazo derecho.'};
 if(/srp|triple viral|sarampion rubeola parotiditis|\bsr\b|doble viral|varicela/.test(n))return{site:index%2?'Región tricipital derecha':'Región tricipital izquierda',route:'Subcutánea',why:'Vacuna subcutánea; confirmar ficha técnica y lineamiento institucional.'};
 if(months<12){const site=index%3===2?'Muslo anterolateral izquierdo':'Muslo anterolateral derecho';return{site,route:'Intramuscular',why:'En lactantes se prefiere el muslo anterolateral por su masa muscular.'}}
 if(months<36){const site=index%2?'Muslo anterolateral izquierdo':'Muslo anterolateral derecho';return{site,route:'Intramuscular',why:'En menores pequeños el muslo es sitio preferente; el deltoides puede valorarse si la masa muscular es adecuada.'}}
 return{site:index%2?'Deltoides izquierdo':'Deltoides derecho',route:'Intramuscular',why:'En niños mayores y adultos suele preferirse el deltoides, según biológico y masa muscular.'};
}
function vatV170SiteSelect(selected){return vatV170SiteOptions().map(x=>`<option ${x===selected?'selected':''}>${esc(x)}</option>`).join('')}
let vatV170SuggestionPatientId='';
const vatV170RenderSuggestionsBase=vatV166RenderSuggestions;
vatV166RenderSuggestions=function(patient){vatV170SuggestionPatientId=String(patient?.id||'');vatV170RenderSuggestionsBase(patient);const box=document.getElementById('vatV165Suggest');if(box&&patient){const age=vatV170Age(patient);box.insertAdjacentHTML('afterbegin',`<div class="vat-v170-patient-summary"><b>${esc(full(patient))}</b><br><b>Fecha de nacimiento:</b> ${esc(formatDateMX(patient.birth))} · <b>Edad exacta:</b> ${esc(age?.label||'No calculable')}<br><small>Verifica estos datos antes de aceptar las sugerencias del motor.</small></div>`)}}
vatV166SuggestItem=function(x,i){
 const date=isoToday(),patient=vatV170PatientById(vatV170SuggestionPatientId),rule=vatV170SiteRule(x.vaccine,patient,i);
 return `<div class="vat-v166-item" data-index="${i}" data-vaccine="${esc(x.vaccine)}" data-dose="${esc(x.dose||'No especificada')}">
  <div class="vat-v166-title"><label><input class="v166-check" type="checkbox" onchange="vatV166Toggle(this)"><span><b>${esc(x.vaccine)} · ${esc(x.dose||'No especificada')}</b><br><small>${esc(x.reason||x.action||'Sugerida para valoración hoy')}</small></span></label><span class="badge danger">Sugerida</span></div>
  <div class="vat-v166-sub"><div class="vat-v166-grid">
   <div class="field"><label>Registrar como</label><select class="v166-mode" onchange="vatV166Mode(this.closest('.vat-v166-item'))"><option value="current">Aplicada hoy / en consulta</option><option value="history">Ya aplicada / cartilla</option></select></div>
   <div class="field"><label>Fecha de aplicación</label><input class="v166-date" type="date" value="${date}" onchange="vatV166RefreshLots(this.closest('.vat-v166-item'))"></div>
   <div class="field vat-v166-stock"><label>Lote en uso</label><select class="v166-lot" onchange="vatV166LotChange(this.closest('.vat-v166-item'))">${vatV166LotOptions(x.vaccine,date)}</select></div>
   <div class="field vat-v166-manual hidden"><label>Lote anterior (cartilla)</label><input class="v166-manual-lot" placeholder="Escribe el lote anotado"></div>
   <div class="field"><label>Caducidad</label><input class="v166-expiry" type="date"></div>
   <div class="field"><label>Laboratorio</label><input class="v166-lab" placeholder="Opcional"></div>
   <div class="field"><label>Vía sugerida</label><select class="v166-route"><option ${rule.route==='Intramuscular'?'selected':''}>Intramuscular</option><option ${rule.route==='Subcutánea'?'selected':''}>Subcutánea</option><option ${rule.route==='Intradérmica'?'selected':''}>Intradérmica</option><option ${rule.route==='Oral'?'selected':''}>Oral</option><option ${rule.route==='Intranasal'?'selected':''}>Intranasal</option><option>No especificada</option></select></div>
   <div class="field"><label>Sitio anatómico sugerido</label><select class="v166-site" onchange="vatV170CheckSuggestedSites()">${vatV170SiteSelect(rule.site)}</select><small>${esc(rule.why)}</small></div>
   <div class="vat-v170-site-note"><b>Aplicaciones simultáneas:</b> se permite usar el mismo muslo o el mismo deltoides para más de una vacuna, utilizando puntos diferentes y separados al menos 2.5 cm (aprox. dos dedos), con jeringas separadas y registrando el sitio de cada biológico. No se bloqueará la selección repetida del mismo miembro.</div>
  </div></div></div>`;
}
function vatV170CheckSuggestedSites(){
 const selected=[...document.querySelectorAll('.vat-v166-item.selected')],counts={};selected.forEach(i=>{const s=i.querySelector('.v166-site')?.value;if(s&&!['Vía oral','Intranasal','Otro','No especificado'].includes(s))counts[s]=(counts[s]||0)+1});
 let box=document.getElementById('vatV170SiteStatus');if(!box){box=document.createElement('div');box.id='vatV170SiteStatus';box.className='vat-v170-site-status ok';document.querySelector('.vat-v166-actions')?.insertAdjacentElement('afterend',box)}
 const same=Object.entries(counts).filter(([,n])=>n>1);box.innerHTML=same.length?`<b>Mismo miembro seleccionado:</b> ${same.map(([s,n])=>`${esc(s)} (${n})`).join(', ')}. Es válido cuando cada inyección utiliza un punto distinto, separado ≥2.5 cm, y se documenta correctamente.`:'<b>Sitios:</b> puedes alternar miembros o usar el mismo miembro en puntos separados ≥2.5 cm, según valoración clínica y características del biológico.';
}
const vatV170ToggleBase=vatV166Toggle;vatV166Toggle=function(input){vatV170ToggleBase(input);vatV170CheckSuggestedSites()}
const vatV170SelectAllBase=vatV166SelectAll;vatV166SelectAll=function(state){vatV170SelectAllBase(state);vatV170CheckSuggestedSites()}
const vatV170AddSelectedBase=vatV166AddSelected;
vatV166AddSelected=function(){
 const selected=[...document.querySelectorAll('.vat-v166-item .v166-check:checked')].map(c=>({item:c.closest('.vat-v166-item'),site:c.closest('.vat-v166-item').querySelector('.v166-site')?.value,route:c.closest('.vat-v166-item').querySelector('.v166-route')?.value,vaccine:c.closest('.vat-v166-item').dataset.vaccine}));
 vatV170AddSelectedBase();
 selected.forEach(x=>{const rows=[...document.querySelectorAll('#vatV165Rows .vat-v165-row')].filter(r=>vatV165Norm(r.querySelector('.m65-vaccine')?.value)===vatV165Norm(x.vaccine));const row=rows[rows.length-1];if(row){if(x.site)row.querySelector('.m65-site').value=x.site;if(x.route)row.querySelector('.m65-route').value=x.route}});
};
const vatV170VaccinationBase=vaccination;
vaccination=function(){vatV170VaccinationBase();const badge=document.querySelector('#view .vat-v165-head .badge');if(badge)badge.textContent='v1.7.0'};
