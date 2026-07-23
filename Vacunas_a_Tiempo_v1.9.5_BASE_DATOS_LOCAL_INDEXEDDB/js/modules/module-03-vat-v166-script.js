
/* v1.6.6 · Selección múltiple desde recomendaciones del motor clínico */
function vatV166LotOptions(vaccine,date){
 const lots=(data.inventory||[]).filter(x=>vatV165Norm(x.vaccine)===vatV165Norm(vaccine)&&Number(x.qty)>0&&(!x.expiry||!date||x.expiry>=date)).sort((a,b)=>String(a.expiry||'9999').localeCompare(String(b.expiry||'9999')));
 return '<option value="">Seleccione lote en uso</option>'+lots.map(x=>`<option value="${x.id}">${esc(x.lot)} · ${x.qty} dosis · cad. ${esc(x.expiry||'sin fecha')}</option>`).join('');
}
function vatV166SuggestItem(x,i){
 const date=isoToday();
 return `<div class="vat-v166-item" data-index="${i}" data-vaccine="${esc(x.vaccine)}" data-dose="${esc(x.dose||'No especificada')}">
  <div class="vat-v166-title"><label><input class="v166-check" type="checkbox" onchange="vatV166Toggle(this)"><span><b>${esc(x.vaccine)} · ${esc(x.dose||'No especificada')}</b><br><small>${esc(x.reason||x.action||'Sugerida para valoración hoy')}</small></span></label><span class="badge danger">Sugerida</span></div>
  <div class="vat-v166-sub"><div class="vat-v166-grid">
   <div class="field"><label>Registrar como</label><select class="v166-mode" onchange="vatV166Mode(this.closest('.vat-v166-item'))"><option value="current">Aplicada hoy / en consulta</option><option value="history">Ya aplicada / cartilla</option></select></div>
   <div class="field"><label>Fecha de aplicación</label><input class="v166-date" type="date" value="${date}" onchange="vatV166RefreshLots(this.closest('.vat-v166-item'))"></div>
   <div class="field vat-v166-stock"><label>Lote en uso</label><select class="v166-lot" onchange="vatV166LotChange(this.closest('.vat-v166-item'))">${vatV166LotOptions(x.vaccine,date)}</select></div>
   <div class="field vat-v166-manual hidden"><label>Lote anterior (cartilla)</label><input class="v166-manual-lot" placeholder="Escribe el lote anotado"></div>
   <div class="field"><label>Caducidad</label><input class="v166-expiry" type="date"></div>
   <div class="field"><label>Laboratorio</label><input class="v166-lab" placeholder="Opcional"></div>
  </div></div></div>`;
}
function vatV166RenderSuggestions(patient){
 const box=document.getElementById('vatV165Suggest'); if(!box)return;
 try{
  const d=typeof vatClinicalDecision==='function'?vatClinicalDecision(patient):null;
  const items=d?.apply||[];
  if(!items.length){box.innerHTML=`<div class="notice"><b>Motor clínico:</b> no detectó vacunas básicas pendientes para hoy. Confirma cartilla y lineamientos vigentes.</div>`;return}
  box.innerHTML=`<div class="vat-v166-panel"><h3>Vacunas sugeridas por el motor</h3><div class="vat-v166-summary">Selecciona todas las que aplicarás hoy o las que ya estén anotadas en la cartilla. Puedes configurar varias y guardarlas juntas una sola vez.</div><div class="vat-v166-actions"><button class="btn secondary" type="button" onclick="vatV166SelectAll(true)">Seleccionar todas</button><button class="btn secondary" type="button" onclick="vatV166SelectAll(false)">Quitar selección</button><button class="btn primary" type="button" onclick="vatV166AddSelected()">Agregar seleccionadas al formulario</button><span id="vatV166SelectedCount" class="badge">0 seleccionadas</span></div><div class="vat-v166-list">${items.map(vatV166SuggestItem).join('')}</div></div>`;
 }catch(e){console.warn('Motor de sugerencias no disponible',e);box.innerHTML='<div class="notice">No fue posible cargar las sugerencias. Puedes capturar las vacunas manualmente.</div>'}
}
function vatV166Toggle(input){const item=input.closest('.vat-v166-item');item.classList.toggle('selected',input.checked);vatV166Count()}
function vatV166Count(){const n=document.querySelectorAll('.v166-check:checked').length,tag=document.getElementById('vatV166SelectedCount');if(tag)tag.textContent=n+' seleccionada'+(n===1?'':'s')}
function vatV166SelectAll(state){document.querySelectorAll('.v166-check').forEach(c=>{c.checked=state;c.closest('.vat-v166-item').classList.toggle('selected',state)});vatV166Count()}
function vatV166Mode(item){const history=item.querySelector('.v166-mode').value==='history';item.querySelector('.vat-v166-stock').classList.toggle('hidden',history);item.querySelector('.vat-v166-manual').classList.toggle('hidden',!history);if(history)item.querySelector('.v166-lot').value=''}
function vatV166RefreshLots(item){const vaccine=item.dataset.vaccine,date=item.querySelector('.v166-date').value,sel=item.querySelector('.v166-lot');sel.innerHTML=vatV166LotOptions(vaccine,date)}
function vatV166LotChange(item){const id=item.querySelector('.v166-lot').value,lot=(data.inventory||[]).find(x=>String(x.id)===String(id));if(!lot)return;item.querySelector('.v166-expiry').value=lot.expiry||'';item.querySelector('.v166-lab').value=lot.laboratory||lot.lab||''}
function vatV166FindEmptyRow(){return [...document.querySelectorAll('#vatV165Rows .vat-v165-row')].find(r=>!r.querySelector('.m65-vaccine').value.trim())}
function vatV166AddSelected(){
 const selected=[...document.querySelectorAll('.vat-v166-item .v166-check:checked')].map(c=>c.closest('.vat-v166-item'));
 if(!selected.length){alert('Selecciona por lo menos una vacuna sugerida.');return}
 const current=document.querySelectorAll('#vatV165Rows .vat-v165-row').length,empty=vatV166FindEmptyRow()?1:0;
 if(current-empty+selected.length>VAT_MULTI_MAX){alert('La selección supera el máximo de 20 vacunas por consulta.');return}
 selected.forEach(item=>{
  let row=vatV166FindEmptyRow();if(!row){vatV165AddRow();row=[...document.querySelectorAll('#vatV165Rows .vat-v165-row')].pop()}
  const mode=item.querySelector('.v166-mode').value;
  row.querySelector('.m65-mode').value=mode;vatV165Mode(row);
  row.querySelector('.m65-vaccine').value=item.dataset.vaccine;
  const dose=item.dataset.dose||'No especificada',doseSel=row.querySelector('.m65-dose');
  const doseOpt=[...doseSel.options].find(o=>vatV165Norm(o.value)===vatV165Norm(dose));if(doseOpt)doseSel.value=doseOpt.value;
  row.querySelector('.m65-date').value=item.querySelector('.v166-date').value||isoToday();
  vatV165LoadLots(row);
  if(mode==='current')row.querySelector('.m65-lot').value=item.querySelector('.v166-lot').value;
  else row.querySelector('.m65-manual-lot').value=item.querySelector('.v166-manual-lot').value.trim();
  row.querySelector('.m65-expiry').value=item.querySelector('.v166-expiry').value;
  row.querySelector('.m65-lab').value=item.querySelector('.v166-lab').value.trim();
  if(mode==='current')vatV165LotChanged(row);
  item.querySelector('.v166-check').checked=false;item.classList.remove('selected');
 });
 vatV165Renumber();vatV166Count();document.getElementById('vatV165Rows')?.scrollIntoView({behavior:'smooth',block:'start'});
}
const vatV166PatientChangedBase=vatV165PatientChanged;
vatV165PatientChanged=function(){
 const p=(data.patients||[]).find(x=>String(x.id)===String(document.getElementById('vatV165Patient')?.value));
 if(!p){const box=document.getElementById('vatV165Suggest');if(box)box.innerHTML='';return}
 vatV166RenderSuggestions(p);
};
