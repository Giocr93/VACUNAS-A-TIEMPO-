
const K='vat_v1_data'; const tabs=[['dashboard','Dashboard'],['patients','Pacientes'],['vaccination','Vacunación'],['inventory','Inventario'],['agenda','Agenda'],['qrCenter','QR inteligente'],['smartCapture','Captura inteligente'],['reports','Reportes']];
const DEFAULT_DATA={patients:[],vaccinations:[],inventory:[{id:1,vaccine:'BCG',lot:'BCG-001',expiry:'2027-06-30',qty:20},{id:2,vaccine:'Hepatitis B',lot:'HB-021',expiry:'2027-04-30',qty:30},{id:3,vaccine:'Hexavalente',lot:'HEX-110',expiry:'2027-02-28',qty:25},{id:4,vaccine:'SRP',lot:'SRP-009',expiry:'2027-08-31',qty:18}],appointments:[],stockAdjustments:[]};
function loadData(){
  try{
    const stored=JSON.parse(localStorage.getItem(K)||'null');
    if(!stored)return structuredClone(DEFAULT_DATA);
    return {...stored,patients:Array.isArray(stored.patients)?stored.patients:[],vaccinations:Array.isArray(stored.vaccinations)?stored.vaccinations:[],inventory:Array.isArray(stored.inventory)?stored.inventory:structuredClone(DEFAULT_DATA.inventory),appointments:Array.isArray(stored.appointments)?stored.appointments:[],stockAdjustments:Array.isArray(stored.stockAdjustments)?stored.stockAdjustments:[],monthClosures:Array.isArray(stored.monthClosures)?stored.monthClosures:[]};
  }catch(error){
    console.error('No fue posible leer los datos guardados:',error);
    return structuredClone(DEFAULT_DATA);
  }
}
let data=loadData();
let vatStorageReady=false;
async function vatInitStorage(){
  if(!window.VATStorage)return;
  try{
    await VATStorage.open();
    vatStorageReady=true;
    const localRaw=localStorage.getItem(K);
    if(localRaw){
      await VATStorage.mirrorMain(data);
    }else{
      const recovered=await VATStorage.restoreMain();
      if(recovered&&typeof recovered==='object'){
        data={...structuredClone(DEFAULT_DATA),...recovered};
        localStorage.setItem(K,JSON.stringify(data));
        if(!document.getElementById('app')?.classList.contains('hidden')) dashboard();
      }
    }
    window.dispatchEvent(new CustomEvent('vat-storage-ready',{detail:await VATStorage.status()}));
  }catch(error){
    console.warn('IndexedDB no disponible; continúa el almacenamiento compatible.',error);
  }
}
function save(){
  try{
    localStorage.setItem(K,JSON.stringify(data));
    if(window.VATStorage)VATStorage.mirrorMain(data).catch(error=>console.warn('No se pudo crear la copia IndexedDB:',error));
    const state=document.getElementById('saveState');if(state)state.textContent='Datos guardados';
    return true;
  }catch(error){
    console.error(error);alert('No fue posible guardar los cambios. Revisa el espacio disponible del navegador.');return false
  }
}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function signIn(event){
  if(event)event.preventDefault();
  const userEl=document.getElementById('user'),passEl=document.getElementById('pass');
  const loginEl=document.getElementById('login'),appEl=document.getElementById('app');
  const msgEl=document.getElementById('loginMsg'),button=document.getElementById('loginButton');
  const user=(userEl?.value||'').trim().toLowerCase(),pass=passEl?.value||'';
  if(button)button.disabled=true;
  if(user==='admin'&&pass==='admin123'){
    msgEl.textContent='';
    loginEl.classList.add('hidden');appEl.classList.remove('hidden');
    sessionStorage.setItem('vat_session','active');
    init();
  }else{
    msgEl.textContent='Usuario o contraseña incorrectos. Usa admin / admin123.';
    passEl?.focus();passEl?.select();
  }
  if(button)button.disabled=false;
}
function signOut(){
  sessionStorage.removeItem('vat_session');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login').classList.remove('hidden');
  document.getElementById('pass')?.focus();
}
function init(){const todayEl=document.getElementById('today'),navEl=document.getElementById('nav');todayEl.textContent=new Date().toLocaleDateString('es-MX',{weekday:'long',year:'numeric',month:'long',day:'numeric'});navEl.innerHTML=tabs.map((t,i)=>`<button class="btn ${i?'':'active'}" data-route="${t[0]}" onclick="show('${t[0]}',this)">${t[1]}</button>`).join('');const route=location.hash.replace(/^#\/?/,'')||'dashboard';const idx=tabs.findIndex(t=>t[0]===route);if(idx>=0){show(route,navEl.querySelectorAll('button')[idx],true)}else dashboard();vatInitStorage()}
function show(id,b,fromRoute){if(!fromRoute&&location.hash!=='#/'+id)history.replaceState(null,'','#/'+id);document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('active'));if(b){b.classList.add('active');requestAnimationFrame(()=>b.scrollIntoView({block:'nearest',behavior:'smooth'}))}const tab=tabs.find(x=>x[0]===id);document.getElementById('title').textContent=tab?tab[1]:'Vacunas a Tiempo';if(typeof window[id]==='function')window[id]();else document.getElementById('view').innerHTML='<div class="card"><h3>Módulo no disponible</h3><p>Recarga el sistema e inténtalo nuevamente.</p></div>'}
function dashboard(){let d=new Date().toISOString().slice(0,10),todayV=data.vaccinations.filter(x=>x.date===d),todayA=data.appointments.filter(x=>x.date===d);view.innerHTML=`<div class="grid"><div class="card stat"><span>Pacientes registrados</span><b>${data.patients.length}</b></div><div class="card stat"><span>Vacunas aplicadas hoy</span><b>${todayV.length}</b></div><div class="card stat"><span>Citas de hoy</span><b>${todayA.length}</b></div><div class="card stat"><span>Lotes con bajo stock</span><b>${data.inventory.filter(x=>x.qty<=5).length}</b></div></div><div class="two section"><div class="card"><h3>Acciones rápidas</h3><div class="row"><button class="btn primary" onclick="quick('patients')">Registrar paciente</button><button class="btn primary" onclick="quick('vaccination')">Aplicar vacuna</button><button class="btn secondary" onclick="quick('inventory')">Ver inventario</button></div></div><div class="card"><h3>Aviso clínico</h3><div class="notice">Prototipo demostrativo. Las reglas mostradas deben validarse contra lineamientos institucionales vigentes antes de uso clínico real.</div></div></div>`}
function quick(id){let b=[...document.querySelectorAll('.nav button')][tabs.findIndex(x=>x[0]===id)];show(id,b)}
function patients(){view.innerHTML=`<div class="two"><div class="card"><h3>Registrar paciente</h3><div class="field"><label>CURP</label><input id="pCurp"></div><div class="field"><label>Nombre(s)</label><input id="pName"></div><div class="field"><label>Apellido paterno</label><input id="pPat"></div><div class="field"><label>Apellido materno</label><input id="pMat"></div><div class="field"><label>Fecha de nacimiento</label><input id="pBirth" type="date"></div><div class="field"><label>Sexo</label><select id="pSex"><option>Femenino</option><option>Masculino</option></select></div><div class="field"><label>Madre, padre o tutor</label><input id="pGuardian"></div><div class="field"><label>Teléfono</label><input id="pPhone"></div><button class="btn primary" onclick="addPatient()">Guardar paciente</button><p id="pMsg"></p></div><div class="card"><h3>Buscar pacientes</h3><div class="toolbar"><input id="pSearch" placeholder="Nombre o CURP" oninput="renderPatients()" style="padding:10px;border:1px solid #ccc;border-radius:9px;flex:1"></div><div id="pList"></div></div></div>`;renderPatients()}
function addPatient(){if(!pName.value||!pBirth.value){pMsg.textContent='Captura nombre y fecha de nacimiento.';return}data.patients.push({id:Date.now(),curp:pCurp.value.trim().toUpperCase(),name:pName.value.trim(),pat:pPat.value.trim(),mat:pMat.value.trim(),birth:pBirth.value,sex:pSex.value,guardian:pGuardian.value.trim(),phone:pPhone.value.trim()});save();pMsg.innerHTML='<span class="success">Paciente guardado correctamente.</span>';renderPatients()}
function full(p){return [p.name,p.pat,p.mat].filter(Boolean).join(' ')} function renderPatients(){let q=(document.getElementById('pSearch')?.value||'').toLowerCase(),a=data.patients.filter(p=>(full(p)+' '+p.curp).toLowerCase().includes(q));pList.innerHTML=a.length?`<div class="tablewrap"><table class="table"><tr><th>Paciente</th><th>CURP</th><th>Nacimiento</th><th>Tutor</th></tr>${a.map(p=>`<tr><td>${esc(full(p))}</td><td>${esc(p.curp)}</td><td>${p.birth}</td><td>${esc(p.guardian)}</td></tr>`).join('')}</table></div>`:'<p class="muted">Sin registros.</p>'}
function ageDays(b){return Math.floor((new Date()-new Date(b))/(864e5))} function suggestion(p){let d=ageDays(p.birth),v=[];if(d<60)v=['BCG','Hepatitis B'];else if(d<365)v=['Hexavalente'];else v=['SRP'];return v}
function showSuggestion(){let p=data.patients.find(x=>x.id==vPatient.value);suggest.innerHTML=p?`<div class="notice"><b>¿Qué corresponde hoy?</b><br>${suggestion(p).map(x=>`<span class="badge">${x}</span>`).join(' ')}</div>`:''}
function loadLots(){let a=data.inventory.filter(x=>x.vaccine===vVaccine.value&&x.qty>0);vLot.innerHTML=a.map(x=>`<option value="${x.id}">${x.lot} · ${x.qty} dosis</option>`).join('')}
function inventory(){view.innerHTML=`<div class="two"><div class="card"><h3>Entrada de inventario</h3><div class="field"><label>Biológico</label><input id="iVac"></div><div class="field"><label>Lote</label><input id="iLot"></div><div class="field"><label>Caducidad</label><input id="iExp" type="date"></div><div class="field"><label>Cantidad</label><input id="iQty" type="number" min="1"></div><button class="btn primary" onclick="addInventory()">Registrar entrada</button><p id="iMsg"></p></div><div class="card"><h3>Existencias</h3><div id="iList"></div></div></div>`;renderInventory()}
function addInventory(){let q=+iQty.value;if(!iVac.value||!iLot.value||!iExp.value||q<1){iMsg.textContent='Completa todos los datos.';return}let x=data.inventory.find(x=>x.vaccine===iVac.value&&x.lot===iLot.value);if(x)x.qty+=q;else data.inventory.push({id:Date.now(),vaccine:iVac.value,lot:iLot.value,expiry:iExp.value,qty:q});save();iMsg.innerHTML='<span class="success">Entrada registrada.</span>';renderInventory()}
function renderInventory(){iList.innerHTML=`<table class="table"><tr><th>Biológico</th><th>Lote</th><th>Caducidad</th><th>Existencia</th><th>Estado</th></tr>${data.inventory.map(x=>`<tr><td>${esc(x.vaccine)}</td><td>${esc(x.lot)}</td><td>${x.expiry}</td><td>${x.qty}</td><td><span class="badge ${x.qty<=5?'danger':''}">${x.qty<=5?'Bajo':'Disponible'}</span></td></tr>`).join('')}</table>`}
function agenda(){view.innerHTML=`<div class="two"><div class="card"><h3>Nueva cita</h3><div class="field"><label>Paciente</label><select id="aPatient"><option value="">Seleccione</option>${data.patients.map(p=>`<option value="${p.id}">${esc(full(p))}</option>`).join('')}</select></div><div class="field"><label>Fecha</label><input id="aDate" type="date"></div><div class="field"><label>Motivo</label><input id="aReason" value="Seguimiento de vacunación"></div><button class="btn primary" onclick="addAppointment()">Agendar</button><p id="aMsg"></p></div><div class="card"><h3>Próximas citas</h3><div id="aList"></div></div></div>`;renderAppointments()}
function addAppointment(){let p=data.patients.find(x=>x.id==aPatient.value);if(!p||!aDate.value){aMsg.textContent='Selecciona paciente y fecha.';return}data.appointments.push({id:Date.now(),patient:full(p),patientId:p.id,date:aDate.value,reason:aReason.value,status:'Programada'});save();aMsg.innerHTML='<span class="success">Cita registrada.</span>';renderAppointments()}
function renderAppointments(){aList.innerHTML=data.appointments.length?`<table class="table"><tr><th>Fecha</th><th>Paciente</th><th>Motivo</th><th>Estado</th></tr>${data.appointments.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(x=>`<tr><td>${x.date}</td><td>${esc(x.patient)}</td><td>${esc(x.reason)}</td><td><span class="badge">${x.status}</span></td></tr>`).join('')}</table>`:'<p class="muted">Sin citas.</p>'}
function reports(){let by={};data.vaccinations.forEach(x=>by[x.vaccine]=(by[x.vaccine]||0)+1);view.innerHTML=`<div class="card"><div class="row no-print"><button class="btn primary" onclick="window.print()">Imprimir / Guardar como PDF</button><button class="btn secondary" onclick="exportCSV()">Exportar CSV</button></div><h2>Reporte general</h2><p>Fecha de generación: ${new Date().toLocaleString('es-MX')}</p><div class="grid"><div class="card stat"><span>Pacientes</span><b>${data.patients.length}</b></div><div class="card stat"><span>Aplicaciones</span><b>${data.vaccinations.length}</b></div><div class="card stat"><span>Citas</span><b>${data.appointments.length}</b></div><div class="card stat"><span>Dosis disponibles</span><b>${data.inventory.reduce((s,x)=>s+x.qty,0)}</b></div></div><div class="section"><h3>Aplicaciones por biológico</h3><table class="table"><tr><th>Biológico</th><th>Total</th></tr>${Object.entries(by).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join('')}</table></div></div>`}


/* Módulo v1.4.0: seguimiento y rezagos */
tabs.splice(5,0,['followUp','Seguimiento']);
function latestVaccinationForPatient(patientId){
  return data.vaccinations.filter(x=>x.patientId===patientId).sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0]||null;
}
function nextAppointmentForPatient(patientId){
  const today=isoToday();
  return data.appointments.filter(x=>x.patientId===patientId && x.date>=today && !['Atendida','Cancelada'].includes(x.status)).sort((a,b)=>a.date.localeCompare(b.date))[0]||null;
}
function overdueAppointmentsForPatient(patientId){
  const today=isoToday();
  return data.appointments.filter(x=>x.patientId===patientId && x.date<today && !['Atendida','Cancelada'].includes(x.status));
}
function followUpRows(){
  const today=isoToday();
  return data.patients.map(p=>{
    const last=latestVaccinationForPatient(p.id);
    const next=nextAppointmentForPatient(p.id);
    const overdue=overdueAppointmentsForPatient(p.id);
    const days=last?.date?daysBetween(last.date,today):null;
    let level='Al día',reason='Con seguimiento activo';
    if(overdue.length){level='Prioritario';reason=`${overdue.length} cita(s) vencida(s)`}
    else if(!last){level='Sin registro';reason='Sin vacunas registradas en el sistema'}
    else if(days>180 && !next){level='Revisar';reason=`${days} días desde la última aplicación y sin cita próxima`}
    else if(!next){level='Sin cita';reason='Sin cita próxima programada'}
    return {p,last,next,overdue,days,level,reason};
  });
}
function followBadge(level){
  const cls=level==='Prioritario'?'danger':(level==='Revisar'||level==='Sin registro'?'warn':'');
  return `<span class="badge ${cls}">${esc(level)}</span>`;
}
function followUp(){
  view.innerHTML=`<div class="card"><div class="row no-print"><input id="fSearch" placeholder="Buscar paciente, CURP o tutor" oninput="renderFollowUp()" style="padding:10px;border:1px solid #ccc;border-radius:9px;flex:1;min-width:240px"><select id="fFilter" onchange="renderFollowUp()" style="padding:10px;border:1px solid #ccc;border-radius:9px"><option value="">Todos</option><option>Prioritario</option><option>Sin registro</option><option>Revisar</option><option>Sin cita</option><option>Al día</option></select><button class="btn secondary" onclick="exportFollowUpCSV()">Exportar CSV</button><button class="btn secondary" onclick="window.print()">Imprimir</button></div><div class="grid section"><div class="card stat"><span>Pacientes a revisar</span><b id="fTotal">0</b></div><div class="card stat"><span>Citas vencidas</span><b>${data.appointments.filter(x=>x.date<isoToday()&&!['Atendida','Cancelada'].includes(x.status)).length}</b></div><div class="card stat"><span>Sin vacunas registradas</span><b>${data.patients.filter(p=>!data.vaccinations.some(v=>v.patientId===p.id)).length}</b></div><div class="card stat"><span>Sin cita próxima</span><b>${data.patients.filter(p=>!nextAppointmentForPatient(p.id)).length}</b></div></div><div class="notice section"><b>Uso del módulo:</b> organiza seguimiento administrativo. No sustituye la revisión de la Cartilla Nacional ni los lineamientos institucionales vigentes.</div><div id="fList" class="section"></div></div>`;
  renderFollowUp();
}
function renderFollowUp(){
  const q=(document.getElementById('fSearch')?.value||'').trim().toLowerCase();
  const filter=document.getElementById('fFilter')?.value||'';
  let rows=followUpRows().filter(r=>{
    const hay=(full(r.p)+' '+(r.p.curp||'')+' '+(r.p.guardian||'')).toLowerCase();
    return (!q||hay.includes(q))&&(!filter||r.level===filter);
  });
  const total=document.getElementById('fTotal');if(total)total.textContent=rows.filter(r=>r.level!=='Al día').length;
  const list=document.getElementById('fList');if(!list)return;
  list.innerHTML=rows.length?`<div class="tablewrap"><table class="table"><tr><th>Estado</th><th>Paciente</th><th>Última aplicación</th><th>Próxima cita</th><th>Motivo</th><th>Acciones</th></tr>${rows.map(r=>`<tr><td>${followBadge(r.level)}</td><td><b>${esc(full(r.p))}</b><br><span class="muted">${esc(r.p.curp||'Sin CURP')}</span></td><td>${r.last?`${formatDateMX(r.last.date)}<br><span class="muted">${esc(r.last.vaccine)}</span>`:'Sin registro'}</td><td>${r.next?`${formatDateMX(r.next.date)}<br><span class="muted">${esc(r.next.status||'Programada')}</span>`:'Sin cita'}</td><td>${esc(r.reason)}</td><td><button class="btn secondary" onclick="patientRecord(${JSON.stringify(r.p.id)})">Expediente</button> <button class="btn secondary" onclick="scheduleForPatient(${r.p.id})">Agendar</button> <button class="btn primary" onclick="sendFollowUpWhatsApp(${r.p.id})">WhatsApp</button></td></tr>`).join('')}</table></div>`:'<p class="muted">No hay pacientes con esos filtros.</p>';
}
function sendFollowUpWhatsApp(id){
  const p=data.patients.find(x=>x.id===id);if(!p)return;
  const phone=normalizePhone(p.phone||'');
  if(phone.length<10){alert('Este paciente no tiene un teléfono válido registrado.');return}
  const next=nextAppointmentForPatient(id);
  const text=next?`Hola, le recordamos la cita de vacunación de ${full(p)} para el ${formatDateMX(next.date)} en el Centro de Salud Venustiano Carranza.`:`Hola, le contactamos del Centro de Salud Venustiano Carranza para revisar y actualizar el seguimiento de vacunación de ${full(p)}. Favor de comunicarse o acudir con su cartilla.`;
  window.open(`https://wa.me/52${phone.slice(-10)}?text=${encodeURIComponent(text)}`,'_blank');
}
function exportFollowUpCSV(){
  const rows=followUpRows().map(r=>[r.level,full(r.p),r.p.curp||'',r.p.guardian||'',r.p.phone||'',r.last?.date||'',r.last?.vaccine||'',r.next?.date||'',r.reason]);
  downloadCSV('seguimiento_rezagos_'+isoToday()+'.csv',[['Estado','Paciente','CURP','Tutor','Teléfono','Última aplicación','Última vacuna','Próxima cita','Motivo'],...rows]);
}

/* Mejoras v1.1 */
tabs.push(['backup','Respaldo']);
const originalAddPatient=addPatient;
addPatient=function(){
  const curp=(pCurp.value||'').trim().toUpperCase();
  if(curp && data.patients.some(x=>(x.curp||'').toUpperCase()===curp)){
    pMsg.textContent='Ya existe un paciente registrado con esa CURP.'; return;
  }
  originalAddPatient();
}
renderPatients=function(){
  let q=(document.getElementById('pSearch')?.value||'').toLowerCase();
  let a=data.patients.filter(p=>(full(p)+' '+(p.curp||'')).toLowerCase().includes(q));
  pList.innerHTML=a.length?`<div class="tablewrap"><table class="table"><tr><th>Paciente</th><th>CURP</th><th>Nacimiento</th><th>Tutor</th><th>Acciones</th></tr>${a.map(p=>`<tr><td>${esc(full(p))}</td><td>${esc(p.curp)}</td><td>${p.birth}</td><td>${esc(p.guardian)}</td><td><button class="btn secondary" onclick="patientRecord(${JSON.stringify(p.id)})">Expediente</button> <button class="btn danger" onclick="deletePatient(${p.id})">Eliminar</button></td></tr>`).join('')}</table></div>`:'<p class="muted">Sin registros.</p>';
}
function patientRecord(id){
  const p=data.patients.find(x=>x.id===id); if(!p)return;
  const apps=data.vaccinations.filter(x=>x.patientId===id).sort((a,b)=>b.date.localeCompare(a.date));
  const cites=data.appointments.filter(x=>x.patientId===id).sort((a,b)=>a.date.localeCompare(b.date));
  view.innerHTML=`<div class="card"><div class="row"><button class="btn secondary" onclick="patients()">← Volver</button><button class="btn primary" onclick="editPatient(${id})">Editar datos</button></div><h2>${esc(full(p))}</h2><div class="two"><div><p><b>CURP:</b> ${esc(p.curp||'No registrada')}</p><p><b>Fecha de nacimiento:</b> ${p.birth}</p><p><b>Sexo:</b> ${esc(p.sex)}</p></div><div><p><b>Tutor:</b> ${esc(p.guardian||'No registrado')}</p><p><b>Teléfono:</b> ${esc(p.phone||'No registrado')}</p></div></div><div class="section"><h3>Cartilla digital / aplicaciones</h3>${apps.length?`<table class="table"><tr><th>Fecha</th><th>Vacuna</th><th>Lote</th><th>Observaciones</th></tr>${apps.map(x=>`<tr><td>${x.date}</td><td>${esc(x.vaccine)}</td><td>${esc(x.lot)}</td><td>${esc(x.obs||'')}</td></tr>`).join('')}</table>`:'<p class="muted">Sin vacunas registradas.</p>'}</div><div class="section"><h3>Citas</h3>${cites.length?`<table class="table"><tr><th>Fecha</th><th>Motivo</th><th>Estado</th></tr>${cites.map(x=>`<tr><td>${x.date}</td><td>${esc(x.reason)}</td><td>${esc(x.status)}</td></tr>`).join('')}</table>`:'<p class="muted">Sin citas.</p>'}</div></div>`;
}
function editPatient(id){
  const p=data.patients.find(x=>x.id===id); if(!p)return;
  view.innerHTML=`<div class="card"><h3>Editar paciente</h3><div class="two"><div><div class="field"><label>CURP</label><input id="eCurp" value="${esc(p.curp||'')}"></div><div class="field"><label>Nombre(s)</label><input id="eName" value="${esc(p.name)}"></div><div class="field"><label>Apellido paterno</label><input id="ePat" value="${esc(p.pat||'')}"></div><div class="field"><label>Apellido materno</label><input id="eMat" value="${esc(p.mat||'')}"></div></div><div><div class="field"><label>Fecha de nacimiento</label><input id="eBirth" type="date" value="${p.birth}"></div><div class="field"><label>Tutor</label><input id="eGuardian" value="${esc(p.guardian||'')}"></div><div class="field"><label>Teléfono</label><input id="ePhone" value="${esc(p.phone||'')}"></div></div></div><div class="row"><button class="btn primary" onclick="savePatientEdit(${id})">Guardar cambios</button><button class="btn secondary" onclick="patientRecord(${JSON.stringify(id)})">Cancelar</button></div><p id="eMsg"></p></div>`;
}
function savePatientEdit(id){
 const p=data.patients.find(x=>x.id===id); if(!p)return;
 const curp=eCurp.value.trim().toUpperCase();
 if(curp && data.patients.some(x=>x.id!==id&&(x.curp||'').toUpperCase()===curp)){eMsg.textContent='La CURP ya pertenece a otro paciente.';return}
 if(!eName.value.trim()||!eBirth.value){eMsg.textContent='Nombre y fecha de nacimiento son obligatorios.';return}
 Object.assign(p,{curp,name:eName.value.trim(),pat:ePat.value.trim(),mat:eMat.value.trim(),birth:eBirth.value,guardian:eGuardian.value.trim(),phone:ePhone.value.trim()});
 data.vaccinations.filter(x=>x.patientId===id).forEach(x=>x.patient=full(p)); data.appointments.filter(x=>x.patientId===id).forEach(x=>x.patient=full(p)); save(); patientRecord(id);
}
function deletePatient(id){
 const p=data.patients.find(x=>x.id===id); if(!p)return;
 if(data.vaccinations.some(x=>x.patientId===id)||data.appointments.some(x=>x.patientId===id)){alert('No se puede eliminar porque tiene vacunas o citas registradas.');return}
 if(confirm('¿Eliminar a '+full(p)+'?')){data.patients=data.patients.filter(x=>x.id!==id);save();renderPatients()}
}
renderAppointments=function(){
 aList.innerHTML=data.appointments.length?`<table class="table"><tr><th>Fecha</th><th>Paciente</th><th>Motivo</th><th>Estado</th><th>Acciones</th></tr>${data.appointments.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(x=>`<tr><td>${x.date}</td><td>${esc(x.patient)}</td><td>${esc(x.reason)}</td><td><span class="badge ${x.status==='No asistió'?'danger':x.status==='Atendida'?'':'warn'}">${x.status}</span></td><td><button class="btn secondary" onclick="setAppointment(${x.id},'Atendida')">Atendida</button> <button class="btn secondary" onclick="setAppointment(${x.id},'No asistió')">No asistió</button> <button class="btn danger" onclick="removeAppointment(${x.id})">Eliminar</button></td></tr>`).join('')}</table>`:'<p class="muted">Sin citas.</p>'
}
function setAppointment(id,status){const x=data.appointments.find(a=>a.id===id);if(x){x.status=status;save();renderAppointments()}}
function removeAppointment(id){if(confirm('¿Eliminar esta cita?')){data.appointments=data.appointments.filter(x=>x.id!==id);save();renderAppointments()}}
function backup(){
 view.innerHTML=`<div class="two"><div class="card"><h3>Crear respaldo</h3><p>Guarda pacientes, vacunas, inventario y citas en un solo archivo.</p><button class="btn primary" onclick="downloadBackup()">Descargar respaldo</button></div><div class="card"><h3>Restaurar respaldo</h3><div class="notice">Restaurar reemplaza los datos actuales. Haz primero un respaldo.</div><div class="field"><label>Archivo de respaldo (.json)</label><input id="restoreFile" type="file" accept="application/json,.json"></div><button class="btn danger" onclick="restoreBackup()">Restaurar datos</button><p id="restoreMsg"></p></div></div>`;
}
function downloadBackup(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='Vacunas_a_Tiempo_respaldo_'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(a.href)}
function restoreBackup(){const f=restoreFile.files[0];if(!f){restoreMsg.textContent='Selecciona un archivo.';return}const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.patients||!x.vaccinations||!x.inventory||!x.appointments)throw Error();if(confirm('¿Reemplazar todos los datos actuales?')){data=x;save();restoreMsg.innerHTML='<span class="success">Respaldo restaurado correctamente.</span>';dashboard()}}catch(e){restoreMsg.textContent='El archivo no es un respaldo válido.'}};r.readAsText(f)}


/* Mejoras v1.2: registro clínico ampliado, comprobante y próxima cita */
function vaccination(){
  view.innerHTML=`<div class="two"><div class="card"><h3>Nueva aplicación</h3>
  <div class="field"><label>Paciente</label><select id="vPatient" onchange="showSuggestion()"><option value="">Seleccione</option>${data.patients.map(p=>`<option value="${p.id}">${esc(full(p))}</option>`).join('')}</select></div>
  <div id="suggest"></div>
  <div class="field"><label>Vacuna</label><select id="vVaccine" onchange="loadLots()"><option value="">Seleccione</option>${[...new Set(data.inventory.map(x=>x.vaccine))].map(x=>`<option>${esc(x)}</option>`).join('')}</select></div>
  <div class="field"><label>Dosis</label><select id="vDose"><option>Única</option><option>Primera</option><option>Segunda</option><option>Tercera</option><option>Refuerzo</option><option>Dosis adicional</option></select></div>
  <div class="field"><label>Lote</label><select id="vLot"></select></div>
  <div class="field"><label>Fecha de aplicación</label><input id="vDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
  <div class="field"><label>Vía de administración</label><select id="vRoute"><option>Intramuscular</option><option>Subcutánea</option><option>Intradérmica</option><option>Oral</option><option>Intranasal</option></select></div>
  <div class="field"><label>Sitio anatómico</label><select id="vSite"><option>Muslo anterolateral derecho</option><option>Muslo anterolateral izquierdo</option><option>Deltoides derecho</option><option>Deltoides izquierdo</option><option>Región deltoidea derecha</option><option>Región deltoidea izquierda</option><option>Vía oral</option><option>Otro</option></select></div>
  <div class="field"><label>Vacunador responsable</label><input id="vVaccinator" value="Daniel Giovanni Cartas Rodríguez"></div>
  <div class="field"><label>Próxima cita (opcional)</label><input id="vNextDate" type="date"></div>
  <div class="field"><label>Observaciones</label><textarea id="vObs" placeholder="Sin reacción inmediata, indicaciones brindadas, etc."></textarea></div>
  <button class="btn primary" onclick="applyVaccine()">Registrar aplicación</button><p id="vMsg"></p></div>
  <div class="card"><h3>Aplicaciones recientes</h3><div id="vList"></div></div></div>`;
  renderVaccinations();
}

function applyVaccine(){
  const p=data.patients.find(x=>x.id==vPatient.value);
  const lot=data.inventory.find(x=>x.id==vLot.value);
  if(!p||!lot||!vVaccine.value||!vDate.value||!vVaccinator.value.trim()){
    vMsg.textContent='Selecciona paciente, vacuna y lote; captura fecha y vacunador.';return;
  }
  if(lot.qty<=0){vMsg.textContent='Lote sin existencia.';return}
  const rec={id:Date.now(),patientId:p.id,patient:full(p),vaccine:vVaccine.value,dose:vDose.value,lot:lot.lot,date:vDate.value,route:vRoute.value,site:vSite.value,vaccinator:vVaccinator.value.trim(),nextDate:vNextDate.value,obs:vObs.value.trim()};
  lot.qty--;
  data.vaccinations.push(rec);
  if(rec.nextDate){
    data.appointments.push({id:Date.now()+1,patient:full(p),patientId:p.id,date:rec.nextDate,reason:'Próxima dosis / seguimiento: '+rec.vaccine,status:'Programada'});
  }
  save();
  vMsg.innerHTML='<span class="success">Aplicación registrada, inventario actualizado'+(rec.nextDate?' y próxima cita agendada':'')+'. <button class="btn secondary" onclick="printProof('+rec.id+')">Imprimir comprobante</button></span>';
  renderVaccinations();
}

function renderVaccinations(){
  const list=data.vaccinations.slice().reverse().slice(0,30);
  vList.innerHTML=list.length?`<div class="tablewrap"><table class="table"><tr><th>Fecha</th><th>Paciente</th><th>Vacuna</th><th>Dosis</th><th>Lote</th><th>Acciones</th></tr>${list.map(x=>`<tr><td>${x.date}</td><td>${esc(x.patient)}</td><td>${esc(x.vaccine)}</td><td>${esc(x.dose||'No especificada')}</td><td>${esc(x.lot)}</td><td><button class="btn secondary" onclick="viewVaccination(${x.id})">Ver</button> <button class="btn secondary" onclick="printProof(${x.id})">Comprobante</button></td></tr>`).join('')}</table></div>`:'<p class="muted">Sin aplicaciones.</p>';
}

function viewVaccination(id){
  const x=data.vaccinations.find(v=>v.id===id);if(!x)return;
  view.innerHTML=`<div class="card"><div class="row"><button class="btn secondary" onclick="vaccination()">← Volver</button><button class="btn primary" onclick="printProof(${id})">Imprimir comprobante</button></div><h2>Detalle de aplicación</h2><div class="two"><div><p><b>Paciente:</b> ${esc(x.patient)}</p><p><b>Fecha:</b> ${x.date}</p><p><b>Vacuna:</b> ${esc(x.vaccine)}</p><p><b>Dosis:</b> ${esc(x.dose||'No especificada')}</p><p><b>Lote:</b> ${esc(x.lot)}</p></div><div><p><b>Vía:</b> ${esc(x.route||'No especificada')}</p><p><b>Sitio:</b> ${esc(x.site||'No especificado')}</p><p><b>Vacunador:</b> ${esc(x.vaccinator||'No especificado')}</p><p><b>Próxima cita:</b> ${x.nextDate||'No programada'}</p><p><b>Observaciones:</b> ${esc(x.obs||'Sin observaciones')}</p></div></div></div>`;
}

function printProof(id){
  const x=data.vaccinations.find(v=>v.id===id);if(!x)return;
  const p=data.patients.find(p=>p.id===x.patientId);
  const w=window.open('','_blank','width=850,height=650');
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Comprobante de vacunación</title><style>body{font-family:Arial,sans-serif;padding:35px;color:#1f2937}.head{border-bottom:3px solid #0b7a53;padding-bottom:14px;margin-bottom:22px}.brand{color:#0b7a53}.box{border:1px solid #cfd7d3;border-radius:12px;padding:18px;margin:15px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}small{color:#667085}@media print{button{display:none}}
.audit-list{display:grid;gap:10px}.audit-item{border:1px solid #e5e7eb;border-left:5px solid #98a2b3;border-radius:12px;padding:12px;background:#fff}.audit-item.critical{border-left-color:#b42318}.audit-item.high{border-left-color:#e04f3f}.audit-item.medium{border-left-color:#b7791f}.audit-item.clinical{border-left-color:#1565c0}.dash-list{display:grid;gap:9px}.dash-row{display:flex;justify-content:space-between;gap:12px;padding:10px;border-bottom:1px solid #eef2f6}.dash-row:last-child{border-bottom:0}.metric-note{font-size:12px;color:#667085}.stat.clickable{cursor:pointer;transition:.15s}.stat.clickable:hover{transform:translateY(-2px);box-shadow:0 12px 28px #0002}
</style>
<style id="v146patch">
.sidebar,.menu-lateral,#sidebar{
overflow-y:auto !important;
max-height:100vh !important;
scrollbar-width:thin;
position:sticky!important;
top:0;
}

.audit-list{display:grid;gap:10px}.audit-item{border:1px solid #e5e7eb;border-left:5px solid #98a2b3;border-radius:12px;padding:12px;background:#fff}.audit-item.critical{border-left-color:#b42318}.audit-item.high{border-left-color:#e04f3f}.audit-item.medium{border-left-color:#b7791f}.audit-item.clinical{border-left-color:#1565c0}.dash-list{display:grid;gap:9px}.dash-row{display:flex;justify-content:space-between;gap:12px;padding:10px;border-bottom:1px solid #eef2f6}.dash-row:last-child{border-bottom:0}.metric-note{font-size:12px;color:#667085}.stat.clickable{cursor:pointer;transition:.15s}.stat.clickable:hover{transform:translateY(-2px);box-shadow:0 12px 28px #0002}
</style>
<!-- v1.4.6 patch -->

<style id="v147styles">
.vat-searchbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:16px}.vat-searchbar input{min-width:280px;flex:1;padding:11px;border:1px solid #cfd7d3;border-radius:10px;background:#fff}.alert-card{border-left:5px solid var(--y)}.alert-card.danger{border-left-color:var(--r)}.alert-card.ok{border-left-color:var(--g)}.alert-list{display:grid;gap:10px}.alert-item{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fff}.alert-item strong{display:block}.search-results{display:grid;gap:10px;margin-top:14px}.search-result{padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fff}.search-result:hover{border-color:#9ccdb9;background:#f7fcfa}.mini{font-size:12px}.nowrap{white-space:nowrap}@media(max-width:700px){.vat-searchbar input{min-width:100%}.alert-item{display:block}.alert-item .row{margin-top:8px}}

.audit-list{display:grid;gap:10px}.audit-item{border:1px solid #e5e7eb;border-left:5px solid #98a2b3;border-radius:12px;padding:12px;background:#fff}.audit-item.critical{border-left-color:#b42318}.audit-item.high{border-left-color:#e04f3f}.audit-item.medium{border-left-color:#b7791f}.audit-item.clinical{border-left-color:#1565c0}.dash-list{display:grid;gap:9px}.dash-row{display:flex;justify-content:space-between;gap:12px;padding:10px;border-bottom:1px solid #eef2f6}.dash-row:last-child{border-bottom:0}.metric-note{font-size:12px;color:#667085}.stat.clickable{cursor:pointer;transition:.15s}.stat.clickable:hover{transform:translateY(-2px);box-shadow:0 12px 28px #0002}
</style>

<style id="v151styles">
.engine-status{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;font-weight:700;font-size:12px}.engine-complete{background:#dcfae6;color:#067647}.engine-due{background:#fee4e2;color:#b42318}.engine-upcoming{background:#fff3cd;color:#8a5a00}.engine-future{background:#eef2f6;color:#475467}.engine-special{background:#e9d7fe;color:#6941c6}.engine-out_of_time{background:#fde2e2;color:#8a1111;border:1px solid #f6b7b7}.engine-grid{display:grid;grid-template-columns:repeat(3,minmax(180px,1fr));gap:12px}.engine-rule{border:1px solid #e5e7eb;border-radius:12px;padding:14px;background:#fff}.engine-rule h4{margin:0 0 8px}.engine-timeline{display:grid;gap:9px}.engine-timeline .item{display:grid;grid-template-columns:125px 1fr auto;gap:12px;align-items:center;padding:11px;border-bottom:1px solid #eef2f6}.engine-summary{border-left:5px solid var(--g)}.engine-summary.warn{border-left-color:var(--y)}.engine-summary.danger{border-left-color:var(--r)}@media(max-width:850px){.engine-grid{grid-template-columns:1fr}.engine-timeline .item{grid-template-columns:1fr}}

.audit-list{display:grid;gap:10px}.audit-item{border:1px solid #e5e7eb;border-left:5px solid #98a2b3;border-radius:12px;padding:12px;background:#fff}.audit-item.critical{border-left-color:#b42318}.audit-item.high{border-left-color:#e04f3f}.audit-item.medium{border-left-color:#b7791f}.audit-item.clinical{border-left-color:#1565c0}.dash-list{display:grid;gap:9px}.dash-row{display:flex;justify-content:space-between;gap:12px;padding:10px;border-bottom:1px solid #eef2f6}.dash-row:last-child{border-bottom:0}.metric-note{font-size:12px;color:#667085}.stat.clickable{cursor:pointer;transition:.15s}.stat.clickable:hover{transform:translateY(-2px);box-shadow:0 12px 28px #0002}
</style>
<style id="v160styles">
.smart-record{padding:22px}.smart-head{display:flex;justify-content:space-between;gap:16px;align-items:center}.smart-head h2{margin:8px 0 4px}.smart-state{min-width:170px;text-align:center;border-radius:14px;padding:16px;background:#ecfdf3;border:1px solid #abefc6}.smart-state b,.smart-state span{display:block}.smart-state b{font-size:20px}.smart-state.warn{background:#fff8e6;border-color:#f4d58d}.smart-state.danger{background:#fee4e2;border-color:#f6b7b7}.smart-grid{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:12px}.smart-stat{border:1px solid #e5e7eb;border-radius:14px;padding:14px;background:#fff}.smart-stat span,.smart-stat small{display:block;color:#667085}.smart-stat b{display:block;font-size:22px;margin:5px 0}.smart-stat.warn{border-left:5px solid var(--y)}.smart-stat.danger{border-left:5px solid var(--r)}.progress-box{padding:14px;border:1px solid #e5e7eb;border-radius:14px}.progress-track{height:10px;background:#e5e7eb;border-radius:99px;overflow:hidden;margin-top:9px}.progress-track span{display:block;height:100%;background:var(--g)}.inset{box-shadow:none;border:1px solid #e5e7eb;padding:18px}.action-list{display:grid;gap:8px}.action-row{padding:11px;border-radius:10px;display:grid;gap:4px}.action-row.yes{background:#ecfdf3;border-left:4px solid var(--g)}.action-row.no{background:#fee4e2;border-left:4px solid var(--r)}.action-row.review{background:#f3e8ff;border-left:4px solid #6941c6}.action-row span{font-size:12px;color:#475467}.recovery-line{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #eef2f6}.recovery-line span{color:#667085;font-size:13px}.smart-timeline{position:relative;margin-left:8px}.smart-time-item{position:relative;display:grid;grid-template-columns:18px 1fr;gap:10px;padding:0 0 18px}.smart-time-item:before{content:"";position:absolute;left:6px;top:12px;bottom:-4px;width:2px;background:#d1e8de}.smart-time-item:last-child:before{display:none}.smart-dot{width:14px;height:14px;border-radius:50%;background:var(--g);margin-top:3px;z-index:1}@media(max-width:900px){.smart-grid{grid-template-columns:1fr 1fr}.smart-head{align-items:flex-start;flex-direction:column}.smart-state{width:100%}}@media(max-width:550px){.smart-grid{grid-template-columns:1fr}}

.audit-list{display:grid;gap:10px}.audit-item{border:1px solid #e5e7eb;border-left:5px solid #98a2b3;border-radius:12px;padding:12px;background:#fff}.audit-item.critical{border-left-color:#b42318}.audit-item.high{border-left-color:#e04f3f}.audit-item.medium{border-left-color:#b7791f}.audit-item.clinical{border-left-color:#1565c0}.dash-list{display:grid;gap:9px}.dash-row{display:flex;justify-content:space-between;gap:12px;padding:10px;border-bottom:1px solid #eef2f6}.dash-row:last-child{border-bottom:0}.metric-note{font-size:12px;color:#667085}.stat.clickable{cursor:pointer;transition:.15s}.stat.clickable:hover{transform:translateY(-2px);box-shadow:0 12px 28px #0002}
</style>

</head><body><div class="head"><h1 class="brand">💉 Vacunas a Tiempo</h1><b>Centro de Salud Venustiano Carranza</b><br><small>Comprobante demostrativo de aplicación</small></div><div class="box"><h2>${esc(x.patient)}</h2><div class="grid"><div><b>CURP:</b> ${esc(p?.curp||'No registrada')}</div><div><b>Fecha de nacimiento:</b> ${p?.birth||''}</div><div><b>Vacuna:</b> ${esc(x.vaccine)}</div><div><b>Dosis:</b> ${esc(x.dose||'No especificada')}</div><div><b>Lote:</b> ${esc(x.lot)}</div><div><b>Fecha:</b> ${x.date}</div><div><b>Vía:</b> ${esc(x.route||'No especificada')}</div><div><b>Sitio:</b> ${esc(x.site||'No especificado')}</div><div><b>Vacunador:</b> ${esc(x.vaccinator||'No especificado')}</div><div><b>Próxima cita:</b> ${x.nextDate||'No programada'}</div></div><p><b>Observaciones:</b> ${esc(x.obs||'Sin observaciones')}</p></div><p>____________________________________<br>Firma del responsable</p><p><small>Este comprobante pertenece a un prototipo académico y no sustituye la Cartilla Nacional de Salud ni documentos institucionales oficiales.</small></p><button onclick="window.print()">Imprimir / Guardar como PDF</button></body></html>`);
  w.document.close();
}

/* Mostrar campos nuevos también dentro del expediente */
const patientRecordV11=patientRecord;
patientRecord=function(id){
  const p=data.patients.find(x=>x.id===id);if(!p)return;
  const apps=data.vaccinations.filter(x=>x.patientId===id).sort((a,b)=>b.date.localeCompare(a.date));
  const cites=data.appointments.filter(x=>x.patientId===id).sort((a,b)=>a.date.localeCompare(b.date));
  view.innerHTML=`<div class="card"><div class="row"><button class="btn secondary" onclick="patients()">← Volver</button><button class="btn primary" onclick="editPatient(${id})">Editar datos</button></div><h2>${esc(full(p))}</h2><div class="two"><div><p><b>CURP:</b> ${esc(p.curp||'No registrada')}</p><p><b>Fecha de nacimiento:</b> ${p.birth}</p><p><b>Sexo:</b> ${esc(p.sex)}</p></div><div><p><b>Tutor:</b> ${esc(p.guardian||'No registrado')}</p><p><b>Teléfono:</b> ${esc(p.phone||'No registrado')}</p></div></div><div class="section"><h3>Cartilla digital / aplicaciones</h3>${apps.length?`<div class="tablewrap"><table class="table"><tr><th>Fecha</th><th>Vacuna</th><th>Dosis</th><th>Lote</th><th>Vía / sitio</th><th>Acción</th></tr>${apps.map(x=>`<tr><td>${x.date}</td><td>${esc(x.vaccine)}</td><td>${esc(x.dose||'No especificada')}</td><td>${esc(x.lot)}</td><td>${esc((x.route||'')+(x.site?' · '+x.site:''))}</td><td><button class="btn secondary" onclick="printProof(${x.id})">Comprobante</button></td></tr>`).join('')}</table></div>`:'<p class="muted">Sin vacunas registradas.</p>'}</div><div class="section"><h3>Citas</h3>${cites.length?`<table class="table"><tr><th>Fecha</th><th>Motivo</th><th>Estado</th></tr>${cites.map(x=>`<tr><td>${x.date}</td><td>${esc(x.reason)}</td><td>${esc(x.status)}</td></tr>`).join('')}</table>`:'<p class="muted">Sin citas.</p>'}</div></div>`;
}

/* Reporte CSV ampliado */
function exportCSV(){
  let rows=[['Fecha','Paciente','Vacuna','Dosis','Lote','Vía','Sitio','Vacunador','Próxima cita','Observaciones'],...data.vaccinations.map(x=>[x.date,x.patient,x.vaccine,x.dose||'',x.lot,x.route||'',x.site||'',x.vaccinator||'',x.nextDate||'',x.obs||''])];
  let csv=rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n'),a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv'}));a.download='reporte_vacunacion_detallado.csv';a.click();URL.revokeObjectURL(a.href);
}



/* =============================================================
   Mejoras v1.3: seguridad del registro, seguimiento y recordatorios
   ============================================================= */
function isoToday(){return new Date().toISOString().slice(0,10)}
function daysBetween(a,b){return Math.floor((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5)}
function patientPhone(id){return data.patients.find(p=>p.id==id)?.phone||''}
function normalizePhone(s){let n=String(s||'').replace(/\D/g,'');if(n.length===10)n='52'+n;return n}
function lotStatus(x){
  const left=daysBetween(isoToday(),x.expiry);
  if(left<0)return {text:'Caducado',cls:'danger'};
  if(left<=90)return {text:'Caduca pronto',cls:'warn'};
  if(x.qty<=5)return {text:'Stock bajo',cls:'warn'};
  return {text:'Disponible',cls:''};
}

/* Dashboard con citas vencidas y lotes próximos a caducar */
dashboard=function(){
  const d=isoToday();
  const todayV=data.vaccinations.filter(x=>x.date===d);
  const todayA=data.appointments.filter(x=>x.date===d && x.status!=='Atendida');
  const overdue=data.appointments.filter(x=>x.date<d && (x.status||'Programada')==='Programada');
  const expiring=data.inventory.filter(x=>x.qty>0 && daysBetween(d,x.expiry)>=0 && daysBetween(d,x.expiry)<=90);
  view.innerHTML=`<div class="grid"><div class="card stat"><span>Pacientes registrados</span><b>${data.patients.length}</b></div><div class="card stat"><span>Vacunas aplicadas hoy</span><b>${todayV.length}</b></div><div class="card stat"><span>Citas pendientes hoy</span><b>${todayA.length}</b></div><div class="card stat"><span>Citas vencidas</span><b>${overdue.length}</b></div></div>
  <div class="two section"><div class="card"><h3>Acciones rápidas</h3><div class="row"><button class="btn primary" onclick="quick('patients')">Registrar paciente</button><button class="btn primary" onclick="quick('vaccination')">Aplicar vacuna</button><button class="btn secondary" onclick="quick('agenda')">Seguimiento de citas</button></div></div>
  <div class="card"><h3>Alertas operativas</h3>${overdue.length?`<div class="notice"><b>${overdue.length}</b> cita(s) vencida(s) requieren seguimiento.</div>`:'<div class="success">No hay citas vencidas.</div>'}${expiring.length?`<div class="notice" style="margin-top:8px"><b>${expiring.length}</b> lote(s) caducan en los próximos 90 días.</div>`:''}</div></div>`;
}

/* Formulario de vacunación con tamiz de seguridad y validación de lotes */
vaccination=function(){
  view.innerHTML=`<div class="two"><div class="card"><h3>Nueva aplicación</h3>
  <div class="field"><label>Paciente</label><select id="vPatient" onchange="showSuggestion()"><option value="">Seleccione</option>${data.patients.map(p=>`<option value="${p.id}">${esc(full(p))}</option>`).join('')}</select></div>
  <div id="suggest"></div>
  <div class="field"><label>Vacuna</label><select id="vVaccine" onchange="loadLotsV13()"><option value="">Seleccione</option>${[...new Set(data.inventory.map(x=>x.vaccine))].map(x=>`<option>${esc(x)}</option>`).join('')}</select></div>
  <div class="field"><label>Dosis</label><select id="vDose"><option>Única</option><option>Primera</option><option>Segunda</option><option>Tercera</option><option>Refuerzo</option><option>Dosis adicional</option></select></div>
  <div class="field"><label>Lote disponible</label><select id="vLot"><option value="">Seleccione vacuna primero</option></select></div>
  <div class="field"><label>Fecha de aplicación</label><input id="vDate" type="date" value="${isoToday()}"></div>
  <div class="card" style="background:#f8faf9;box-shadow:none;border:1px solid #dce5e1"><h3 style="font-size:16px">Verificación previa</h3>
    <label style="display:block;margin:8px 0"><input id="vFever" type="checkbox"> Presenta enfermedad aguda o fiebre que requiere valoración</label>
    <label style="display:block;margin:8px 0"><input id="vReaction" type="checkbox"> Antecedente de reacción grave a una dosis o componente</label>
    <label style="display:block;margin:8px 0"><input id="vOtherRisk" type="checkbox"> Existe otra condición que requiere valoración clínica</label>
    <label style="display:block;margin:8px 0"><input id="vReviewed" type="checkbox"> Confirmo que revisé antecedentes, indicaciones y contraindicaciones</label>
  </div>
  <div class="field"><label>Vía de administración</label><select id="vRoute"><option>Intramuscular</option><option>Subcutánea</option><option>Intradérmica</option><option>Oral</option><option>Intranasal</option></select></div>
  <div class="field"><label>Sitio anatómico</label><select id="vSite"><option>Muslo anterolateral derecho</option><option>Muslo anterolateral izquierdo</option><option>Deltoides derecho</option><option>Deltoides izquierdo</option><option>Región deltoidea derecha</option><option>Región deltoidea izquierda</option><option>Vía oral</option><option>Otro</option></select></div>
  <div class="field"><label>Vacunador responsable</label><input id="vVaccinator" value="Daniel Giovanni Cartas Rodríguez"></div>
  <div class="field"><label>Próxima cita (opcional)</label><input id="vNextDate" type="date"></div>
  <div class="field"><label>Observaciones / valoración</label><textarea id="vObs" placeholder="Anote valoración, indicaciones o motivo de decisión clínica."></textarea></div>
  <button class="btn primary" onclick="applyVaccineV13()">Registrar aplicación</button><p id="vMsg"></p></div>
  <div class="card"><h3>Aplicaciones recientes</h3><div id="vList"></div></div></div>`;
  renderVaccinations();
}
function loadLotsV13(){
  const vaccine=vVaccine.value;
  const lots=data.inventory.filter(x=>x.vaccine===vaccine && x.qty>0 && x.expiry>=isoToday()).sort((a,b)=>a.expiry.localeCompare(b.expiry));
  vLot.innerHTML=lots.length?'<option value="">Seleccione</option>'+lots.map(x=>`<option value="${x.id}">${esc(x.lot)} · ${x.qty} dosis · cad. ${x.expiry}</option>`).join(''):'<option value="">Sin lotes vigentes disponibles</option>';
}
function applyVaccineV13(){
  const p=data.patients.find(x=>x.id==vPatient.value),lot=data.inventory.find(x=>x.id==vLot.value);
  if(!p||!lot||!vVaccine.value||!vDate.value||!vVaccinator.value.trim()){vMsg.textContent='Completa paciente, vacuna, lote, fecha y vacunador.';return}
  if(!vReviewed.checked){vMsg.textContent='Debes confirmar la verificación previa antes de registrar.';return}
  if(lot.expiry<vDate.value){vMsg.textContent='No se puede utilizar un lote caducado en la fecha seleccionada.';return}
  if(lot.qty<=0){vMsg.textContent='Lote sin existencia.';return}
  const risks=[vFever.checked?'Enfermedad aguda/fiebre':'',vReaction.checked?'Reacción grave previa':'',vOtherRisk.checked?'Otra condición':''].filter(Boolean);
  if(risks.length && !vObs.value.trim()){vMsg.textContent='Existe una alerta clínica. Registra la valoración o decisión en observaciones.';return}
  const dup=data.vaccinations.find(x=>x.patientId===p.id&&x.vaccine===vVaccine.value&&x.dose===vDose.value&&x.date===vDate.value);
  if(dup&&!confirm('Ya existe la misma vacuna y dosis para este paciente en esta fecha. ¿Deseas continuar?'))return;
  const rec={id:Date.now(),patientId:p.id,patient:full(p),vaccine:vVaccine.value,dose:vDose.value,lot:lot.lot,date:vDate.value,route:vRoute.value,site:vSite.value,vaccinator:vVaccinator.value.trim(),nextDate:vNextDate.value,obs:vObs.value.trim(),screening:{reviewed:true,alerts:risks}};
  lot.qty--;data.vaccinations.push(rec);
  if(rec.nextDate)data.appointments.push({id:Date.now()+1,patient:full(p),patientId:p.id,date:rec.nextDate,reason:'Próxima dosis / seguimiento: '+rec.vaccine,status:'Programada'});
  save();vMsg.innerHTML='<span class="success">Aplicación registrada correctamente. <button class="btn secondary" onclick="printProof('+rec.id+')">Imprimir comprobante</button></span>';renderVaccinations();
}

/* Inventario: estado de lote, ajuste y FEFO */
inventory=function(){
  view.innerHTML=`<div class="two"><div class="card"><h3>Entrada de inventario</h3><div class="field"><label>Biológico</label><input id="iVac"></div><div class="field"><label>Lote</label><input id="iLot"></div><div class="field"><label>Caducidad</label><input id="iExp" type="date"></div><div class="field"><label>Cantidad</label><input id="iQty" type="number" min="1"></div><button class="btn primary" onclick="addInventory()">Registrar entrada</button><p id="iMsg"></p><div class="notice">Los lotes se muestran por fecha de caducidad para facilitar el uso de primero en caducar, primero en salir.</div></div><div class="card"><h3>Existencias</h3><div id="iList"></div></div></div>`;renderInventoryV13();
}
function renderInventoryV13(){
  const arr=data.inventory.slice().sort((a,b)=>a.expiry.localeCompare(b.expiry));
  iList.innerHTML=arr.length?`<div class="tablewrap"><table class="table"><tr><th>Biológico</th><th>Lote</th><th>Caducidad</th><th>Existencia</th><th>Estado</th><th>Ajuste</th></tr>${arr.map(x=>{const s=lotStatus(x);return `<tr><td>${esc(x.vaccine)}</td><td>${esc(x.lot)}</td><td>${x.expiry}</td><td>${x.qty}</td><td><span class="badge ${s.cls}">${s.text}</span></td><td><button class="btn secondary" onclick="adjustStock(${x.id})">Ajustar</button></td></tr>`}).join('')}</table></div>`:'<p class="muted">Sin lotes.</p>';
}
function adjustStock(id){
  const x=data.inventory.find(i=>i.id===id);if(!x)return;
  const val=prompt('Existencia real del lote '+x.lot+':',x.qty);if(val===null)return;
  const qty=Number(val);if(!Number.isInteger(qty)||qty<0){alert('Captura un número entero igual o mayor a cero.');return}
  const reason=prompt('Motivo del ajuste (conteo físico, merma, frasco abierto, corrección):','Conteo físico');if(reason===null||!reason.trim())return;
  data.stockAdjustments=data.stockAdjustments||[];data.stockAdjustments.push({id:Date.now(),inventoryId:id,vaccine:x.vaccine,lot:x.lot,previous:x.qty,newQty:qty,reason:reason.trim(),date:new Date().toISOString()});x.qty=qty;save();renderInventoryV13();
}
const addInventoryOriginal=addInventory;
addInventory=function(){addInventoryOriginal();if(document.getElementById('iList'))renderInventoryV13()}

/* Agenda con filtros, vencidas y recordatorio de WhatsApp */
agenda=function(){
  view.innerHTML=`<div class="two"><div class="card"><h3>Nueva cita</h3><div class="field"><label>Paciente</label><select id="aPatient"><option value="">Seleccione</option>${data.patients.map(p=>`<option value="${p.id}">${esc(full(p))}</option>`).join('')}</select></div><div class="field"><label>Fecha</label><input id="aDate" type="date"></div><div class="field"><label>Motivo</label><input id="aReason" value="Seguimiento de vacunación"></div><button class="btn primary" onclick="addAppointment()">Agendar</button><p id="aMsg"></p></div><div class="card"><h3>Seguimiento de citas</h3><div class="toolbar"><select id="aFilter" onchange="renderAppointmentsV13()"><option value="all">Todas</option><option value="today">Hoy</option><option value="overdue">Vencidas</option><option value="upcoming">Próximas</option><option value="Programada">Programadas</option><option value="Atendida">Atendidas</option><option value="No asistió">No asistió</option></select></div><div id="aList"></div></div></div>`;renderAppointmentsV13();
}
function renderAppointmentsV13(){
  const d=isoToday(),f=document.getElementById('aFilter')?.value||'all';let arr=data.appointments.slice();
  if(f==='today')arr=arr.filter(x=>x.date===d);else if(f==='overdue')arr=arr.filter(x=>x.date<d&&(x.status||'Programada')==='Programada');else if(f==='upcoming')arr=arr.filter(x=>x.date>d&&(x.status||'Programada')==='Programada');else if(f!=='all')arr=arr.filter(x=>(x.status||'Programada')===f);
  arr.sort((a,b)=>a.date.localeCompare(b.date));
  aList.innerHTML=arr.length?`<div class="tablewrap"><table class="table"><tr><th>Fecha</th><th>Paciente</th><th>Motivo</th><th>Estado</th><th>Acciones</th></tr>${arr.map(x=>`<tr><td>${x.date}${x.date<d&&(x.status||'Programada')==='Programada'?' <span class="badge danger">Vencida</span>':''}</td><td>${esc(x.patient)}</td><td>${esc(x.reason)}</td><td>${esc(x.status||'Programada')}</td><td><button class="btn secondary" onclick="setAppointmentStatus(${x.id},'Atendida')">Atendida</button> <button class="btn secondary" onclick="setAppointmentStatus(${x.id},'No asistió')">No asistió</button> <button class="btn primary" onclick="sendWhatsAppReminder(${x.id})">WhatsApp</button> <button class="btn danger" onclick="deleteAppointment(${x.id})">Eliminar</button></td></tr>`).join('')}</table></div>`:'<p class="muted">No hay citas con este filtro.</p>';
}
function setAppointmentStatus(id,status){const x=data.appointments.find(a=>a.id===id);if(!x)return;x.status=status;save();renderAppointmentsV13()}
function sendWhatsAppReminder(id){
  const x=data.appointments.find(a=>a.id===id);if(!x)return;const phone=normalizePhone(patientPhone(x.patientId));
  if(!phone){alert('El paciente no tiene teléfono registrado. Edítalo en su expediente.');return}
  const msg=`Vacunas a Tiempo: recordatorio de cita para ${x.patient}, el ${x.date}. Motivo: ${x.reason}. Centro de Salud Venustiano Carranza.`;
  window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(msg),'_blank');
}
const addAppointmentOriginal=addAppointment;
addAppointment=function(){addAppointmentOriginal();if(document.getElementById('aList'))renderAppointmentsV13()}

/* Reporte de seguimiento */
reports=function(){
  const by={};data.vaccinations.forEach(x=>by[x.vaccine]=(by[x.vaccine]||0)+1);const d=isoToday();
  const overdue=data.appointments.filter(x=>x.date<d&&(x.status||'Programada')==='Programada').length;
  const noShow=data.appointments.filter(x=>x.status==='No asistió').length;
  view.innerHTML=`<div class="card"><div class="row no-print"><button class="btn primary" onclick="window.print()">Imprimir / Guardar como PDF</button><button class="btn secondary" onclick="exportCSV()">Exportar aplicaciones CSV</button><button class="btn secondary" onclick="exportAppointmentsCSV()">Exportar citas CSV</button></div><h2>Reporte general y seguimiento</h2><p>Fecha de generación: ${new Date().toLocaleString('es-MX')}</p><div class="grid"><div class="card stat"><span>Pacientes</span><b>${data.patients.length}</b></div><div class="card stat"><span>Aplicaciones</span><b>${data.vaccinations.length}</b></div><div class="card stat"><span>Citas vencidas</span><b>${overdue}</b></div><div class="card stat"><span>No asistencias</span><b>${noShow}</b></div></div><div class="section"><h3>Aplicaciones por biológico</h3><table class="table"><tr><th>Biológico</th><th>Total</th></tr>${Object.entries(by).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join('')}</table></div></div>`;
}
function exportAppointmentsCSV(){
  const rows=[['Fecha','Paciente','Motivo','Estado','Teléfono'],...data.appointments.map(x=>[x.date,x.patient,x.reason,x.status||'Programada',patientPhone(x.patientId)])];
  const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv'}));a.download='reporte_citas_seguimiento.csv';a.click();URL.revokeObjectURL(a.href);
}


/* Inicio seguro v1.3.2 */
window.addEventListener('error',function(event){console.error('Error de aplicación:',event.error||event.message)});
document.addEventListener('DOMContentLoaded',function(){
  const form=document.getElementById('loginForm'),showPass=document.getElementById('showPass'),pass=document.getElementById('pass');
  form?.addEventListener('submit',signIn);
  showPass?.addEventListener('change',()=>{pass.type=showPass.checked?'text':'password'});
  if(sessionStorage.getItem('vat_session')==='active'){
    document.getElementById('login').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    init();
  }else document.getElementById('user')?.focus();
});

/* =============================================================
   Mejoras v1.3.3: validación, exportaciones y estabilidad operativa
   ============================================================= */
const APP_VERSION='1.5.4';

function cleanText(value){return String(value||'').trim().replace(/\s+/g,' ')}
function validPhone(value){const n=String(value||'').replace(/\D/g,'');return !n||n.length===10||n.length===12}
function validCurp(value){const c=String(value||'').trim().toUpperCase();return !c||/^[A-ZÑ]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(c)}
function downloadCSV(filename,rows){
  const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
}
function formatDateMX(value){if(!value)return '';const d=new Date(value+'T12:00:00');return Number.isNaN(d.getTime())?value:d.toLocaleDateString('es-MX')}

/* Registro y búsqueda de pacientes más seguros */
patients=function(){
  view.innerHTML=`<div class="two"><div class="card"><h3>Registrar paciente</h3>
  <div class="field"><label>CURP</label><input id="pCurp" maxlength="18" placeholder="18 caracteres (opcional)"></div>
  <div class="field"><label>Nombre(s)</label><input id="pName" autocomplete="off"></div>
  <div class="field"><label>Apellido paterno</label><input id="pPat" autocomplete="off"></div>
  <div class="field"><label>Apellido materno</label><input id="pMat" autocomplete="off"></div>
  <div class="field"><label>Fecha de nacimiento</label><input id="pBirth" type="date" max="${isoToday()}"></div>
  <div class="field"><label>Sexo</label><select id="pSex"><option>Femenino</option><option>Masculino</option></select></div>
  <div class="field"><label>Madre, padre o tutor</label><input id="pGuardian"></div>
  <div class="field"><label>Teléfono</label><input id="pPhone" inputmode="numeric" maxlength="12" placeholder="10 dígitos"></div>
  <button class="btn primary" onclick="addPatientV133()">Guardar paciente</button><p id="pMsg" role="status"></p></div>
  <div class="card"><div class="row" style="justify-content:space-between"><h3>Buscar pacientes</h3><button class="btn secondary" onclick="exportPatientsCSV()">Exportar pacientes CSV</button></div>
  <div class="toolbar"><input id="pSearch" placeholder="Nombre, CURP, tutor o teléfono" oninput="renderPatientsV133()" style="padding:10px;border:1px solid #ccc;border-radius:9px;flex:1"></div>
  <div id="pCount" class="muted"></div><div id="pList"></div></div></div>`;
  renderPatientsV133();
}
function addPatientV133(){
  const curp=cleanText(pCurp.value).toUpperCase(),name=cleanText(pName.value),pat=cleanText(pPat.value),mat=cleanText(pMat.value),birth=pBirth.value,phone=cleanText(pPhone.value);
  if(!name||!birth){pMsg.textContent='Captura nombre y fecha de nacimiento.';return}
  if(birth>isoToday()){pMsg.textContent='La fecha de nacimiento no puede estar en el futuro.';return}
  if(!validCurp(curp)){pMsg.textContent='La CURP no tiene un formato válido. Debe contener 18 caracteres.';return}
  if(curp&&data.patients.some(x=>(x.curp||'').toUpperCase()===curp)){pMsg.textContent='Ya existe un paciente registrado con esa CURP.';return}
  if(!validPhone(phone)){pMsg.textContent='El teléfono debe contener 10 dígitos (o 12 con código de país).';return}
  const similar=data.patients.find(x=>full(x).toLowerCase()===([name,pat,mat].filter(Boolean).join(' ')).toLowerCase()&&x.birth===birth);
  if(similar&&!confirm('Ya existe un paciente con el mismo nombre y fecha de nacimiento. ¿Deseas registrarlo de todas formas?'))return;
  data.patients.push({id:Date.now(),curp,name,pat,mat,birth,sex:pSex.value,guardian:cleanText(pGuardian.value),phone});
  if(!save())return;
  ['pCurp','pName','pPat','pMat','pBirth','pGuardian','pPhone'].forEach(id=>document.getElementById(id).value='');
  pMsg.innerHTML='<span class="success">Paciente guardado correctamente.</span>';renderPatientsV133();pName.focus();
}
function renderPatientsV133(){
  const q=(document.getElementById('pSearch')?.value||'').trim().toLowerCase();
  const arr=data.patients.filter(p=>(full(p)+' '+(p.curp||'')+' '+(p.guardian||'')+' '+(p.phone||'')).toLowerCase().includes(q)).sort((a,b)=>full(a).localeCompare(full(b),'es'));
  if(document.getElementById('pCount'))pCount.textContent=`${arr.length} paciente${arr.length===1?'':'s'} encontrado${arr.length===1?'':'s'}`;
  pList.innerHTML=arr.length?`<div class="tablewrap"><table class="table"><tr><th>Paciente</th><th>CURP</th><th>Nacimiento</th><th>Tutor / teléfono</th><th>Acciones</th></tr>${arr.map(p=>`<tr><td>${esc(full(p))}</td><td>${esc(p.curp||'Sin CURP')}</td><td>${formatDateMX(p.birth)}</td><td>${esc(p.guardian||'')}<br><span class="muted">${esc(p.phone||'Sin teléfono')}</span></td><td><button class="btn primary" onclick="patientRecord(${JSON.stringify(p.id)})">Expediente</button> <button class="btn danger" onclick="deletePatient(${p.id})">Eliminar</button></td></tr>`).join('')}</table></div>`:'<p class="muted">Sin registros.</p>';
}
function exportPatientsCSV(){downloadCSV('pacientes_'+isoToday()+'.csv',[['CURP','Nombre(s)','Apellido paterno','Apellido materno','Fecha de nacimiento','Sexo','Tutor','Teléfono'],...data.patients.map(p=>[p.curp||'',p.name||'',p.pat||'',p.mat||'',p.birth||'',p.sex||'',p.guardian||'',p.phone||''])])}

/* Edición con las mismas validaciones */
const editPatientV132=editPatient;
editPatient=function(id){editPatientV132(id);const birth=document.getElementById('eBirth');if(birth)birth.max=isoToday();const phone=document.getElementById('ePhone');if(phone){phone.inputMode='numeric';phone.maxLength=12}}
savePatientEdit=function(id){
  const p=data.patients.find(x=>x.id===id);if(!p)return;
  const curp=cleanText(eCurp.value).toUpperCase(),name=cleanText(eName.value),birth=eBirth.value,phone=cleanText(ePhone.value);
  if(!name||!birth){eMsg.textContent='Nombre y fecha de nacimiento son obligatorios.';return}
  if(birth>isoToday()){eMsg.textContent='La fecha de nacimiento no puede estar en el futuro.';return}
  if(!validCurp(curp)){eMsg.textContent='La CURP no tiene un formato válido.';return}
  if(curp&&data.patients.some(x=>x.id!==id&&(x.curp||'').toUpperCase()===curp)){eMsg.textContent='La CURP ya pertenece a otro paciente.';return}
  if(!validPhone(phone)){eMsg.textContent='El teléfono debe contener 10 dígitos (o 12 con código de país).';return}
  Object.assign(p,{curp,name,pat:cleanText(ePat.value),mat:cleanText(eMat.value),birth,guardian:cleanText(eGuardian.value),phone});
  data.vaccinations.filter(x=>x.patientId===id).forEach(x=>x.patient=full(p));data.appointments.filter(x=>x.patientId===id).forEach(x=>x.patient=full(p));save();patientRecord(id);
}

/* Inventario: validación de lote y exportación */
inventory=function(){
  view.innerHTML=`<div class="two"><div class="card"><h3>Entrada de inventario</h3><div class="field"><label>Biológico</label><input id="iVac"></div><div class="field"><label>Lote</label><input id="iLot"></div><div class="field"><label>Caducidad</label><input id="iExp" type="date" min="${isoToday()}"></div><div class="field"><label>Cantidad</label><input id="iQty" type="number" min="1" step="1"></div><button class="btn primary" onclick="addInventoryV133()">Registrar entrada</button><p id="iMsg"></p><div class="notice">Los lotes se ordenan por caducidad para facilitar FEFO: primero en caducar, primero en salir.</div></div><div class="card"><div class="row" style="justify-content:space-between"><h3>Existencias</h3><button class="btn secondary" onclick="exportInventoryCSV()">Exportar inventario CSV</button></div><div id="iList"></div></div></div>`;renderInventoryV13();
}
function addInventoryV133(){
  const vaccine=cleanText(iVac.value),lot=cleanText(iLot.value).toUpperCase(),expiry=iExp.value,qty=Number(iQty.value);
  if(!vaccine||!lot||!expiry||!Number.isInteger(qty)||qty<1){iMsg.textContent='Completa todos los datos con una cantidad entera mayor a cero.';return}
  if(expiry<isoToday()){iMsg.textContent='No se puede registrar un lote ya caducado.';return}
  const existing=data.inventory.find(x=>x.vaccine.toLowerCase()===vaccine.toLowerCase()&&x.lot.toUpperCase()===lot);
  if(existing){if(existing.expiry!==expiry&&!confirm('El lote ya existe con otra caducidad. Se conservará la caducidad registrada ('+existing.expiry+'). ¿Continuar?'))return;existing.qty+=qty}
  else data.inventory.push({id:Date.now(),vaccine,lot,expiry,qty});
  if(!save())return;iMsg.innerHTML='<span class="success">Entrada registrada correctamente.</span>';iLot.value='';iQty.value='';renderInventoryV13();
}
function exportInventoryCSV(){downloadCSV('inventario_'+isoToday()+'.csv',[['Biológico','Lote','Caducidad','Existencia','Estado'],...data.inventory.slice().sort((a,b)=>a.expiry.localeCompare(b.expiry)).map(x=>[x.vaccine,x.lot,x.expiry,x.qty,lotStatus(x).text])])}

/* Agenda: corregir eliminación, validar fechas y evitar duplicados */
function deleteAppointment(id){removeAppointmentV133(id)}
function removeAppointmentV133(id){const x=data.appointments.find(a=>a.id===id);if(!x)return;if(confirm('¿Eliminar la cita de '+x.patient+' del '+formatDateMX(x.date)+'?')){data.appointments=data.appointments.filter(a=>a.id!==id);save();renderAppointmentsV13()}}
removeAppointment=removeAppointmentV133;
addAppointment=function(){
  const p=data.patients.find(x=>x.id==aPatient.value),date=aDate.value,reason=cleanText(aReason.value);
  if(!p||!date||!reason){aMsg.textContent='Selecciona paciente, fecha y motivo.';return}
  if(date<isoToday()&&!confirm('La fecha seleccionada ya pasó. ¿Deseas registrar la cita de todas formas?'))return;
  const dup=data.appointments.some(x=>x.patientId===p.id&&x.date===date&&(x.status||'Programada')==='Programada');
  if(dup&&!confirm('El paciente ya tiene una cita programada para esa fecha. ¿Deseas agregar otra?'))return;
  data.appointments.push({id:Date.now(),patient:full(p),patientId:p.id,date,reason,status:'Programada'});save();aMsg.innerHTML='<span class="success">Cita registrada.</span>';aDate.value='';renderAppointmentsV13();
}

/* Vacunación: opción de deshacer la última aplicación por error de captura */
const vaccinationV132=vaccination;
vaccination=function(){vaccinationV132();const card=document.getElementById('vList')?.closest('.card');if(card&&data.vaccinations.length){const b=document.createElement('button');b.className='btn danger';b.textContent='Deshacer última aplicación';b.onclick=undoLastVaccination;card.insertBefore(b,document.getElementById('vList'));}}
function undoLastVaccination(){
  const rec=data.vaccinations[data.vaccinations.length-1];if(!rec)return;
  if(!confirm('¿Deshacer la última aplicación registrada?\n'+rec.patient+' · '+rec.vaccine+' · '+rec.date))return;
  const lot=data.inventory.find(x=>x.lot===rec.lot&&x.vaccine===rec.vaccine);if(lot)lot.qty++;
  if(rec.nextDate){const idx=data.appointments.findIndex(x=>x.patientId===rec.patientId&&x.date===rec.nextDate&&x.reason.includes(rec.vaccine)&&x.status==='Programada');if(idx>=0)data.appointments.splice(idx,1)}
  data.vaccinations.pop();save();vaccination();alert('La aplicación fue eliminada y la dosis regresó al inventario.');
}

/* Respaldo con metadatos y diagnóstico de datos */
backup=function(){
  const issues=dataDiagnostics();
  view.innerHTML=`<div class="two"><div class="card"><h3>Crear respaldo</h3><p>Guarda pacientes, vacunas, inventario, citas y ajustes en un solo archivo.</p><button class="btn primary" onclick="downloadBackupV133()">Descargar respaldo</button><div class="section"><h3>Exportaciones independientes</h3><div class="row"><button class="btn secondary" onclick="exportPatientsCSV()">Pacientes CSV</button><button class="btn secondary" onclick="exportInventoryCSV()">Inventario CSV</button><button class="btn secondary" onclick="exportAppointmentsCSV()">Citas CSV</button><button class="btn secondary" onclick="exportCSV()">Aplicaciones CSV</button></div></div></div><div class="card"><h3>Restaurar respaldo</h3><div class="notice">Restaurar reemplaza los datos actuales. Descarga primero un respaldo.</div><div class="field"><label>Archivo (.json)</label><input id="restoreFile" type="file" accept="application/json,.json"></div><button class="btn danger" onclick="restoreBackupV133()">Restaurar datos</button><p id="restoreMsg"></p></div></div><div class="card section"><h3>Revisión de integridad</h3>${issues.length?`<div class="notice"><b>${issues.length} observación(es):</b><ul>${issues.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:'<div class="success">No se encontraron problemas básicos de integridad en los datos.</div>'}</div>`;
}
function dataDiagnostics(){
  const out=[];const ids=new Set(data.patients.map(p=>p.id));
  const duplicateCurps=data.patients.map(p=>(p.curp||'').toUpperCase()).filter(Boolean).filter((x,i,a)=>a.indexOf(x)!==i);if(duplicateCurps.length)out.push('Hay CURP duplicadas en pacientes.');
  const orphanVacc=data.vaccinations.filter(x=>!ids.has(x.patientId)).length;if(orphanVacc)out.push(orphanVacc+' aplicación(es) no están vinculadas a un paciente existente.');
  const orphanAppt=data.appointments.filter(x=>!ids.has(x.patientId)).length;if(orphanAppt)out.push(orphanAppt+' cita(s) no están vinculadas a un paciente existente.');
  const negative=data.inventory.filter(x=>Number(x.qty)<0).length;if(negative)out.push(negative+' lote(s) tienen existencia negativa.');
  return out;
}
function downloadBackupV133(){
  const payload={app:'Vacunas a Tiempo',version:APP_VERSION,createdAt:new Date().toISOString(),data};
  const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));a.href=url;a.download='Vacunas_a_Tiempo_respaldo_v'+APP_VERSION+'_'+isoToday()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
}
function restoreBackupV133(){
  const f=restoreFile.files[0];if(!f){restoreMsg.textContent='Selecciona un archivo.';return}
  const r=new FileReader();r.onload=()=>{try{const raw=JSON.parse(r.result),x=raw.data||raw;if(!Array.isArray(x.patients)||!Array.isArray(x.vaccinations)||!Array.isArray(x.inventory)||!Array.isArray(x.appointments))throw Error('estructura');
    const normalized={patients:x.patients,vaccinations:x.vaccinations,inventory:x.inventory,appointments:x.appointments,stockAdjustments:Array.isArray(x.stockAdjustments)?x.stockAdjustments:[]};
    if(confirm('¿Reemplazar todos los datos actuales con este respaldo?')){data=normalized;if(save()){restoreMsg.innerHTML='<span class="success">Respaldo restaurado correctamente.</span>';setTimeout(()=>dashboard(),400)}}
  }catch(e){restoreMsg.textContent='El archivo no es un respaldo válido o está dañado.'}};r.readAsText(f);
}

/* Dashboard operativo con listas accionables */
dashboard=function(){
  const d=isoToday(),todayV=data.vaccinations.filter(x=>x.date===d),todayA=data.appointments.filter(x=>x.date===d&&(x.status||'Programada')==='Programada'),overdue=data.appointments.filter(x=>x.date<d&&(x.status||'Programada')==='Programada'),alerts=data.inventory.filter(x=>x.qty<=5||x.expiry<d||daysBetween(d,x.expiry)<=90).sort((a,b)=>a.expiry.localeCompare(b.expiry));
  view.innerHTML=`<div class="grid"><div class="card stat"><span>Pacientes registrados</span><b>${data.patients.length}</b></div><div class="card stat"><span>Vacunas aplicadas hoy</span><b>${todayV.length}</b></div><div class="card stat"><span>Citas pendientes hoy</span><b>${todayA.length}</b></div><div class="card stat"><span>Citas vencidas</span><b>${overdue.length}</b></div></div>
  <div class="two section"><div class="card"><h3>Acciones rápidas</h3><div class="row"><button class="btn primary" onclick="quick('patients')">Registrar paciente</button><button class="btn primary" onclick="quick('vaccination')">Aplicar vacuna</button><button class="btn secondary" onclick="quick('agenda')">Abrir agenda</button><button class="btn secondary" onclick="quick('backup')">Respaldo</button></div></div><div class="card"><h3>Estado de datos</h3><div class="${dataDiagnostics().length?'notice':'success'}">${dataDiagnostics().length?dataDiagnostics().length+' observación(es) detectadas. Revisa el módulo Respaldo.':'Información guardada sin problemas básicos detectados.'}</div></div></div>
  <div class="two section"><div class="card"><h3>Citas que requieren seguimiento</h3>${overdue.length?`<div class="tablewrap"><table class="table"><tr><th>Fecha</th><th>Paciente</th><th>Acción</th></tr>${overdue.slice(0,6).map(x=>`<tr><td>${formatDateMX(x.date)}</td><td>${esc(x.patient)}</td><td><button class="btn primary" onclick="sendWhatsAppReminder(${x.id})">WhatsApp</button></td></tr>`).join('')}</table></div>`:'<p class="muted">No hay citas vencidas.</p>'}</div><div class="card"><h3>Alertas de inventario</h3>${alerts.length?`<div class="tablewrap"><table class="table"><tr><th>Biológico / lote</th><th>Existencia</th><th>Estado</th></tr>${alerts.slice(0,6).map(x=>{const s=lotStatus(x);return `<tr><td>${esc(x.vaccine)}<br><span class="muted">${esc(x.lot)} · ${formatDateMX(x.expiry)}</span></td><td>${x.qty}</td><td><span class="badge ${s.cls}">${s.text}</span></td></tr>`}).join('')}</table></div>`:'<p class="muted">Sin alertas de inventario.</p>'}</div></div>`;
}



/* =============================================================
   Mejoras v1.3.4: agenda editable, expediente imprimible y reportes
   ============================================================= */
const saveV133=save;
save=function(){
  const ok=saveV133();
  const el=document.getElementById('saveState');
  if(el){el.textContent=ok?'Datos guardados':'Error al guardar';el.className=ok?'badge':'badge danger';}
  return ok;
}
function monthKey(value){return String(value||'').slice(0,7)}
function currentMonth(){return isoToday().slice(0,7)}
function appointmentStatusBadge(status){
  const value=status||'Programada';
  const cls=value==='No asistió'?'badge danger':value==='Atendida'?'badge':'badge warn';
  return `<span class="${cls}">${esc(value)}</span>`;
}
function openPatientWhatsApp(id){
  const p=data.patients.find(x=>x.id===id);if(!p)return;
  const phone=normalizePhone(p.phone);
  if(!phone){alert('El paciente no tiene teléfono registrado.');return}
  const msg=`Vacunas a Tiempo: Hola, ${full(p)}. Este mensaje es del Centro de Salud Venustiano Carranza para dar seguimiento a su esquema de vacunación.`;
  window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(msg),'_blank');
}
function scheduleForPatient(id){
  const p=data.patients.find(x=>x.id===id);if(!p)return;
  quick('agenda');
  setTimeout(()=>{if(document.getElementById('aPatient'))aPatient.value=String(id);if(document.getElementById('aDate'))aDate.focus()},0);
}
function printPatientRecord(){window.print()}

patientRecord=function(id){
  const p=data.patients.find(x=>x.id===id);if(!p)return;
  const apps=data.vaccinations.filter(x=>x.patientId===id).sort((a,b)=>b.date.localeCompare(a.date));
  const cites=data.appointments.filter(x=>x.patientId===id).sort((a,b)=>b.date.localeCompare(a.date));
  const next=cites.filter(x=>x.date>=isoToday()&&(x.status||'Programada')==='Programada').sort((a,b)=>a.date.localeCompare(b.date))[0];
  view.innerHTML=`<div class="card"><div class="row no-print"><button class="btn secondary" onclick="patients()">← Volver</button><button class="btn primary" onclick="editPatient(${id})">Editar datos</button><button class="btn secondary" onclick="scheduleForPatient(${id})">Agendar cita</button><button class="btn secondary" onclick="openPatientWhatsApp(${id})">WhatsApp</button><button class="btn secondary" onclick="printPatientRecord()">Imprimir expediente</button></div>
  <h2>Expediente de ${esc(full(p))}</h2>${next?`<div class="notice"><b>Próxima cita:</b> ${formatDateMX(next.date)} · ${esc(next.reason)}</div>`:''}
  <div class="two section"><div><p><b>CURP:</b> ${esc(p.curp||'No registrada')}</p><p><b>Fecha de nacimiento:</b> ${formatDateMX(p.birth)}</p><p><b>Sexo:</b> ${esc(p.sex||'No registrado')}</p></div><div><p><b>Tutor:</b> ${esc(p.guardian||'No registrado')}</p><p><b>Teléfono:</b> ${esc(p.phone||'No registrado')}</p><p><b>Total de aplicaciones:</b> ${apps.length}</p></div></div>
  <div class="section"><h3>Cartilla digital / aplicaciones</h3>${apps.length?`<div class="tablewrap"><table class="table"><tr><th>Fecha</th><th>Vacuna</th><th>Lote</th><th>Observaciones</th></tr>${apps.map(x=>`<tr><td>${formatDateMX(x.date)}</td><td>${esc(x.vaccine)}</td><td>${esc(x.lot)}</td><td>${esc(x.obs||'')}</td></tr>`).join('')}</table></div>`:'<p class="muted">Sin vacunas registradas.</p>'}</div>
  <div class="section"><h3>Historial de citas</h3>${cites.length?`<div class="tablewrap"><table class="table"><tr><th>Fecha</th><th>Motivo</th><th>Estado</th></tr>${cites.map(x=>`<tr><td>${formatDateMX(x.date)}</td><td>${esc(x.reason)}</td><td>${appointmentStatusBadge(x.status)}</td></tr>`).join('')}</table></div>`:'<p class="muted">Sin citas.</p>'}</div></div>`;
}

agenda=function(){
  view.innerHTML=`<div class="two"><div class="card"><h3>Nueva cita</h3><div class="field"><label>Paciente</label><select id="aPatient"><option value="">Seleccione</option>${data.patients.slice().sort((a,b)=>full(a).localeCompare(full(b),'es')).map(p=>`<option value="${p.id}">${esc(full(p))}</option>`).join('')}</select></div><div class="field"><label>Fecha</label><input id="aDate" type="date" min="${isoToday()}"></div><div class="field"><label>Motivo</label><input id="aReason" value="Seguimiento de vacunación"></div><button class="btn primary" onclick="addAppointment()">Agendar</button><p id="aMsg"></p></div>
  <div class="card"><div class="row" style="justify-content:space-between"><h3>Agenda</h3><button class="btn secondary" onclick="exportAppointmentsCSV()">Exportar CSV</button></div><div class="toolbar"><input id="aSearch" placeholder="Buscar paciente o motivo" oninput="renderAppointmentsV134()" style="padding:10px;border:1px solid #ccc;border-radius:9px;flex:1"><select id="aFilter" onchange="renderAppointmentsV134()"><option value="all">Todas</option><option value="today">Hoy</option><option value="upcoming">Próximas</option><option value="overdue">Vencidas</option><option value="Programada">Programadas</option><option value="Atendida">Atendidas</option><option value="No asistió">No asistió</option></select></div><div id="aCount" class="muted"></div><div id="aList"></div></div></div>`;
  renderAppointmentsV134();
}
function renderAppointmentsV134(){
  const d=isoToday(),f=document.getElementById('aFilter')?.value||'all',q=(document.getElementById('aSearch')?.value||'').toLowerCase();let arr=data.appointments.slice();
  if(f==='today')arr=arr.filter(x=>x.date===d);else if(f==='overdue')arr=arr.filter(x=>x.date<d&&(x.status||'Programada')==='Programada');else if(f==='upcoming')arr=arr.filter(x=>x.date>d&&(x.status||'Programada')==='Programada');else if(f!=='all')arr=arr.filter(x=>(x.status||'Programada')===f);
  if(q)arr=arr.filter(x=>(x.patient+' '+x.reason).toLowerCase().includes(q));
  arr.sort((a,b)=>a.date.localeCompare(b.date));
  if(document.getElementById('aCount'))aCount.textContent=`${arr.length} cita${arr.length===1?'':'s'}`;
  aList.innerHTML=arr.length?`<div class="tablewrap"><table class="table"><tr><th>Fecha</th><th>Paciente</th><th>Motivo</th><th>Estado</th><th>Acciones</th></tr>${arr.map(x=>`<tr><td>${formatDateMX(x.date)}${x.date<d&&(x.status||'Programada')==='Programada'?' <span class="badge danger">Vencida</span>':''}</td><td>${esc(x.patient)}</td><td>${esc(x.reason)}</td><td>${appointmentStatusBadge(x.status)}</td><td><button class="btn secondary" onclick="editAppointment(${x.id})">Editar</button> <button class="btn secondary" onclick="setAppointmentStatusV134(${x.id},'Atendida')">Atendida</button> <button class="btn secondary" onclick="setAppointmentStatusV134(${x.id},'No asistió')">No asistió</button> <button class="btn primary" onclick="sendWhatsAppReminder(${x.id})">WhatsApp</button> <button class="btn danger" onclick="deleteAppointmentV134(${x.id})">Eliminar</button></td></tr>`).join('')}</table></div>`:'<p class="muted">No hay citas con este filtro.</p>';
}
function setAppointmentStatusV134(id,status){const x=data.appointments.find(a=>a.id===id);if(!x)return;x.status=status;save();renderAppointmentsV134()}
function deleteAppointmentV134(id){if(!confirm('¿Deseas eliminar esta cita?'))return;data.appointments=data.appointments.filter(x=>x.id!==id);save();renderAppointmentsV134()}
function editAppointment(id){
  const x=data.appointments.find(a=>a.id===id);if(!x)return;
  view.innerHTML=`<div class="card"><h3>Editar cita</h3><p><b>Paciente:</b> ${esc(x.patient)}</p><div class="field"><label>Fecha</label><input id="eaDate" type="date" value="${x.date}"></div><div class="field"><label>Motivo</label><input id="eaReason" value="${esc(x.reason)}"></div><div class="field"><label>Estado</label><select id="eaStatus"><option ${x.status==='Programada'?'selected':''}>Programada</option><option ${x.status==='Atendida'?'selected':''}>Atendida</option><option ${x.status==='No asistió'?'selected':''}>No asistió</option></select></div><div class="row"><button class="btn primary" onclick="saveAppointmentEdit(${id})">Guardar cambios</button><button class="btn secondary" onclick="agenda()">Cancelar</button></div><p id="eaMsg"></p></div>`;
}
function saveAppointmentEdit(id){
  const x=data.appointments.find(a=>a.id===id);if(!x)return;
  const date=eaDate.value,reason=cleanText(eaReason.value),status=eaStatus.value;
  if(!date||!reason){eaMsg.textContent='La fecha y el motivo son obligatorios.';return}
  const duplicate=data.appointments.some(a=>a.id!==id&&a.patientId===x.patientId&&a.date===date&&(a.status||'Programada')==='Programada');
  if(duplicate&&!confirm('Este paciente ya tiene otra cita programada en la misma fecha. ¿Guardar de todas formas?'))return;
  Object.assign(x,{date,reason,status});save();agenda();
}
const addAppointmentV133=addAppointment;
addAppointment=function(){
  const before=data.appointments.length;addAppointmentV133();
  if(data.appointments.length>before&&document.getElementById('aDate')){aDate.value='';aReason.value='Seguimiento de vacunación';}
  if(document.getElementById('aList'))renderAppointmentsV134();
}

dashboard=function(){
  const d=isoToday(),month=currentMonth();
  const todayV=data.vaccinations.filter(x=>x.date===d),todayA=data.appointments.filter(x=>x.date===d),monthV=data.vaccinations.filter(x=>monthKey(x.date)===month);
  const overdue=data.appointments.filter(x=>x.date<d&&(x.status||'Programada')==='Programada').sort((a,b)=>a.date.localeCompare(b.date));
  const expiring=data.inventory.filter(x=>x.expiry&&daysBetween(d,x.expiry)>=0&&daysBetween(d,x.expiry)<=90).sort((a,b)=>a.expiry.localeCompare(b.expiry));
  const low=data.inventory.filter(x=>Number(x.qty)<=5);
  view.innerHTML=`<div class="grid"><div class="card stat"><span>Pacientes registrados</span><b>${data.patients.length}</b></div><div class="card stat"><span>Vacunas aplicadas hoy</span><b>${todayV.length}</b></div><div class="card stat"><span>Aplicaciones del mes</span><b>${monthV.length}</b></div><div class="card stat"><span>Citas de hoy</span><b>${todayA.length}</b></div></div>
  <div class="two section"><div class="card"><h3>Acciones rápidas</h3><div class="row"><button class="btn primary" onclick="quick('patients')">Registrar paciente</button><button class="btn primary" onclick="quick('vaccination')">Aplicar vacuna</button><button class="btn secondary" onclick="quick('agenda')">Agendar cita</button><button class="btn secondary" onclick="quick('inventory')">Ver inventario</button></div></div><div class="card"><h3>Alertas operativas</h3><p><span class="badge danger">${overdue.length}</span> citas vencidas</p><p><span class="badge warn">${low.length}</span> lotes con bajo stock</p><p><span class="badge warn">${expiring.length}</span> lotes caducan en 90 días</p></div></div>
  <div class="two section"><div class="card"><h3>Citas vencidas prioritarias</h3>${overdue.length?`<table class="table"><tr><th>Fecha</th><th>Paciente</th><th>Acción</th></tr>${overdue.slice(0,5).map(x=>`<tr><td>${formatDateMX(x.date)}</td><td>${esc(x.patient)}</td><td><button class="btn primary" onclick="sendWhatsAppReminder(${x.id})">Recordar</button></td></tr>`).join('')}</table>`:'<p class="muted">No hay citas vencidas.</p>'}</div><div class="card"><h3>Inventario que requiere atención</h3>${[...new Map([...low,...expiring].map(x=>[x.id,x])).values()].length?`<table class="table"><tr><th>Biológico</th><th>Lote</th><th>Existencia</th></tr>${[...new Map([...low,...expiring].map(x=>[x.id,x])).values()].slice(0,5).map(x=>`<tr><td>${esc(x.vaccine)}</td><td>${esc(x.lot)}</td><td>${x.qty}</td></tr>`).join('')}</table>`:'<p class="muted">Sin alertas de inventario.</p>'}</div></div>`;
}

reports=function(){
  const month=currentMonth();
  view.innerHTML=`<div class="card"><div class="row no-print"><button class="btn primary" onclick="window.print()">Imprimir / Guardar como PDF</button><button class="btn secondary" onclick="exportFilteredReportCSV()">Exportar reporte filtrado CSV</button></div><h2>Reporte general y seguimiento</h2><div class="toolbar no-print"><label>Desde <input id="rFrom" type="date" onchange="renderReportV134()"></label><label>Hasta <input id="rTo" type="date" onchange="renderReportV134()"></label><button class="btn secondary" onclick="setReportMonth('${month}')">Mes actual</button><button class="btn secondary" onclick="clearReportDates()">Todo el historial</button></div><div id="reportBody"></div></div>`;
  setReportMonth(month);
}
function setReportMonth(month){const [y,m]=month.split('-').map(Number);rFrom.value=`${month}-01`;rTo.value=new Date(y,m,0).toISOString().slice(0,10);renderReportV134()}
function clearReportDates(){rFrom.value='';rTo.value='';renderReportV134()}
function filteredVaccinations(){const from=document.getElementById('rFrom')?.value||'',to=document.getElementById('rTo')?.value||'';return data.vaccinations.filter(x=>(!from||x.date>=from)&&(!to||x.date<=to))}
function filteredAppointments(){const from=document.getElementById('rFrom')?.value||'',to=document.getElementById('rTo')?.value||'';return data.appointments.filter(x=>(!from||x.date>=from)&&(!to||x.date<=to))}
function renderReportV134(){
  const vacc=filteredVaccinations(),apps=filteredAppointments(),by={};vacc.forEach(x=>by[x.vaccine]=(by[x.vaccine]||0)+1);
  const attended=apps.filter(x=>x.status==='Atendida').length,noShow=apps.filter(x=>x.status==='No asistió').length,programmed=apps.filter(x=>(x.status||'Programada')==='Programada').length;
  reportBody.innerHTML=`<p>Fecha de generación: ${new Date().toLocaleString('es-MX')}</p><div class="grid"><div class="card stat"><span>Aplicaciones</span><b>${vacc.length}</b></div><div class="card stat"><span>Citas programadas</span><b>${programmed}</b></div><div class="card stat"><span>Citas atendidas</span><b>${attended}</b></div><div class="card stat"><span>No asistencias</span><b>${noShow}</b></div></div><div class="section"><h3>Aplicaciones por biológico</h3>${Object.keys(by).length?`<table class="table"><tr><th>Biológico</th><th>Total</th></tr>${Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join('')}</table>`:'<p class="muted">No hay aplicaciones en el periodo seleccionado.</p>'}</div>`;
}
function exportFilteredReportCSV(){
  const rows=[['Tipo','Fecha','Paciente','Biológico / Motivo','Lote / Estado'],...filteredVaccinations().map(x=>['Vacunación',x.date,x.patient,x.vaccine,x.lot]),...filteredAppointments().map(x=>['Cita',x.date,x.patient,x.reason,x.status||'Programada'])];
  downloadCSV('reporte_filtrado_'+isoToday()+'.csv',rows);
}


/* =============================================================
   v1.3.5 · QR inteligente local y preparación de captura inteligente
   ============================================================= */
function qrChecksum(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36).toUpperCase()}
function patientQRPayload(p){
  const vacc=data.vaccinations.filter(x=>x.patientId===p.id).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const latest=vacc.length?vacc[vacc.length-1].date:'';
  const base=['VAT2',p.id,p.curp||'',p.birth||'',vacc.length,latest].join('|');
  return base+'|'+qrChecksum(base)
}
function parsePatientQR(raw){
  const parts=String(raw||'').trim().split('|');
  if(parts[0]==='VAT1'){
    if(parts.length!==5)throw new Error('El QR anterior está incompleto.');
    const base=parts.slice(0,4).join('|');if(qrChecksum(base)!==parts[4])throw new Error('El QR está incompleto o fue modificado.');
    const p=data.patients.find(x=>String(x.id)===parts[1]&&String(x.curp||'')===parts[2]&&String(x.birth||'')===parts[3]);
    if(!p)throw new Error('El paciente no existe o sus datos cambiaron. Genera un QR actualizado.');return p;
  }
  if(parts[0]!=='VAT2'||parts.length!==7)throw new Error('El código no pertenece a Vacunas a Tiempo.');
  const base=parts.slice(0,6).join('|');if(qrChecksum(base)!==parts[6])throw new Error('El QR está incompleto o fue modificado.');
  const p=data.patients.find(x=>String(x.id)===parts[1]&&String(x.curp||'')===parts[2]&&String(x.birth||'')===parts[3]);
  if(!p)throw new Error('El paciente no existe en esta base de datos o sus datos cambiaron. Genera un QR actualizado.');
  const vacc=data.vaccinations.filter(x=>x.patientId===p.id).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const latest=vacc.length?vacc[vacc.length-1].date:'';
  if(String(vacc.length)!==parts[4]||latest!==parts[5])throw new Error('El QR está desactualizado porque cambió el historial de vacunación. Genera uno nuevo.');
  return p;
}
function makeQR(canvasId,payload,size=260){const c=document.getElementById(canvasId);if(!c||!window.VATQR)throw new Error('No se pudo cargar el generador QR local.');VATQR.draw(payload,c,size);return c}
function openPatientQR(id){
  const p=data.patients.find(x=>x.id===id);if(!p)return;const payload=patientQRPayload(p);
  view.innerHTML=`<div class="two"><div class="card"><div class="row"><button class="btn secondary" onclick="patientRecord(${JSON.stringify(id)})">← Expediente</button><button class="btn secondary" onclick="qrCenter()">Centro QR</button></div><h2>QR dinámico del paciente</h2><p><b>${esc(full(p))}</b></p><p class="muted">Se genera localmente. No necesita internet y no incluye nombre ni teléfono dentro del código.</p><div class="qrbox"><canvas id="patientQR"></canvas></div><div class="row" style="margin-top:12px"><button class="btn primary" onclick="downloadPatientQR(${id})">Descargar PNG</button><button class="btn secondary" onclick="printPatientQR(${id})">Imprimir credencial</button><button class="btn secondary" onclick="copyQRToken(${id})">Copiar código</button></div></div><div class="card"><h3>Información vinculada</h3><p><b>CURP:</b> ${esc(p.curp||'No registrada')}</p><p><b>Nacimiento:</b> ${formatDateMX(p.birth)}</p><p><b>Vacunas registradas:</b> ${data.vaccinations.filter(x=>x.patientId===id).length}</p><p><b>Citas registradas:</b> ${data.appointments.filter(x=>x.patientId===id).length}</p><div class="notice">El QR es dinámico: cambia cuando se modifica la identidad del paciente o su historial de vacunación. Si aparece como desactualizado, genera e imprime uno nuevo.</div><h3 class="section">Código interno</h3><div class="code">${esc(payload)}</div></div></div>`;
  requestAnimationFrame(()=>makeQR('patientQR',payload));
}
function downloadPatientQR(id){const p=data.patients.find(x=>x.id===id);if(!p)return;const c=document.getElementById('patientQR')||document.createElement('canvas');if(!c.width)VATQR.draw(patientQRPayload(p),c,500);const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='QR_'+(p.curp||String(p.id))+'.png';a.click()}
function copyQRToken(id){const p=data.patients.find(x=>x.id===id);if(!p)return;navigator.clipboard?.writeText(patientQRPayload(p)).then(()=>alert('Código QR copiado.')).catch(()=>prompt('Copia este código:',patientQRPayload(p)))}
function printPatientQR(id){
 const p=data.patients.find(x=>x.id===id);if(!p)return;const c=document.createElement('canvas');VATQR.draw(patientQRPayload(p),c,360);const img=c.toDataURL('image/png'),w=window.open('','_blank','width=700,height=650');
 w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Credencial QR</title><style>body{font-family:Arial;text-align:center;padding:30px;color:#1f2937}.card{max-width:480px;margin:auto;border:2px solid #0b7a53;border-radius:18px;padding:24px}.brand{color:#0b7a53}img{width:280px}.muted{color:#667085;font-size:12px}@media print{button{display:none}}
.audit-list{display:grid;gap:10px}.audit-item{border:1px solid #e5e7eb;border-left:5px solid #98a2b3;border-radius:12px;padding:12px;background:#fff}.audit-item.critical{border-left-color:#b42318}.audit-item.high{border-left-color:#e04f3f}.audit-item.medium{border-left-color:#b7791f}.audit-item.clinical{border-left-color:#1565c0}.dash-list{display:grid;gap:9px}.dash-row{display:flex;justify-content:space-between;gap:12px;padding:10px;border-bottom:1px solid #eef2f6}.dash-row:last-child{border-bottom:0}.metric-note{font-size:12px;color:#667085}.stat.clickable{cursor:pointer;transition:.15s}.stat.clickable:hover{transform:translateY(-2px);box-shadow:0 12px 28px #0002}
</style>
<style id="v146patch">
.sidebar,.menu-lateral,#sidebar{
overflow-y:auto !important;
max-height:100vh !important;
scrollbar-width:thin;
position:sticky!important;
top:0;
}

.audit-list{display:grid;gap:10px}.audit-item{border:1px solid #e5e7eb;border-left:5px solid #98a2b3;border-radius:12px;padding:12px;background:#fff}.audit-item.critical{border-left-color:#b42318}.audit-item.high{border-left-color:#e04f3f}.audit-item.medium{border-left-color:#b7791f}.audit-item.clinical{border-left-color:#1565c0}.dash-list{display:grid;gap:9px}.dash-row{display:flex;justify-content:space-between;gap:12px;padding:10px;border-bottom:1px solid #eef2f6}.dash-row:last-child{border-bottom:0}.metric-note{font-size:12px;color:#667085}.stat.clickable{cursor:pointer;transition:.15s}.stat.clickable:hover{transform:translateY(-2px);box-shadow:0 12px 28px #0002}
</style>
<!-- v1.4.6 patch -->

<style id="v147styles">
.vat-searchbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:16px}.vat-searchbar input{min-width:280px;flex:1;padding:11px;border:1px solid #cfd7d3;border-radius:10px;background:#fff}.alert-card{border-left:5px solid var(--y)}.alert-card.danger{border-left-color:var(--r)}.alert-card.ok{border-left-color:var(--g)}.alert-list{display:grid;gap:10px}.alert-item{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fff}.alert-item strong{display:block}.search-results{display:grid;gap:10px;margin-top:14px}.search-result{padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fff}.search-result:hover{border-color:#9ccdb9;background:#f7fcfa}.mini{font-size:12px}.nowrap{white-space:nowrap}@media(max-width:700px){.vat-searchbar input{min-width:100%}.alert-item{display:block}.alert-item .row{margin-top:8px}}

.audit-list{display:grid;gap:10px}.audit-item{border:1px solid #e5e7eb;border-left:5px solid #98a2b3;border-radius:12px;padding:12px;background:#fff}.audit-item.critical{border-left-color:#b42318}.audit-item.high{border-left-color:#e04f3f}.audit-item.medium{border-left-color:#b7791f}.audit-item.clinical{border-left-color:#1565c0}.dash-list{display:grid;gap:9px}.dash-row{display:flex;justify-content:space-between;gap:12px;padding:10px;border-bottom:1px solid #eef2f6}.dash-row:last-child{border-bottom:0}.metric-note{font-size:12px;color:#667085}.stat.clickable{cursor:pointer;transition:.15s}.stat.clickable:hover{transform:translateY(-2px);box-shadow:0 12px 28px #0002}
</style>

<style id="v151styles">
.engine-status{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;font-weight:700;font-size:12px}.engine-complete{background:#dcfae6;color:#067647}.engine-due{background:#fee4e2;color:#b42318}.engine-upcoming{background:#fff3cd;color:#8a5a00}.engine-future{background:#eef2f6;color:#475467}.engine-special{background:#e9d7fe;color:#6941c6}.engine-out_of_time{background:#fde2e2;color:#8a1111;border:1px solid #f6b7b7}.engine-grid{display:grid;grid-template-columns:repeat(3,minmax(180px,1fr));gap:12px}.engine-rule{border:1px solid #e5e7eb;border-radius:12px;padding:14px;background:#fff}.engine-rule h4{margin:0 0 8px}.engine-timeline{display:grid;gap:9px}.engine-timeline .item{display:grid;grid-template-columns:125px 1fr auto;gap:12px;align-items:center;padding:11px;border-bottom:1px solid #eef2f6}.engine-summary{border-left:5px solid var(--g)}.engine-summary.warn{border-left-color:var(--y)}.engine-summary.danger{border-left-color:var(--r)}@media(max-width:850px){.engine-grid{grid-template-columns:1fr}.engine-timeline .item{grid-template-columns:1fr}}

.audit-list{display:grid;gap:10px}.audit-item{border:1px solid #e5e7eb;border-left:5px solid #98a2b3;border-radius:12px;padding:12px;background:#fff}.audit-item.critical{border-left-color:#b42318}.audit-item.high{border-left-color:#e04f3f}.audit-item.medium{border-left-color:#b7791f}.audit-item.clinical{border-left-color:#1565c0}.dash-list{display:grid;gap:9px}.dash-row{display:flex;justify-content:space-between;gap:12px;padding:10px;border-bottom:1px solid #eef2f6}.dash-row:last-child{border-bottom:0}.metric-note{font-size:12px;color:#667085}.stat.clickable{cursor:pointer;transition:.15s}.stat.clickable:hover{transform:translateY(-2px);box-shadow:0 12px 28px #0002}
</style>
<style id="v160styles">
.smart-record{padding:22px}.smart-head{display:flex;justify-content:space-between;gap:16px;align-items:center}.smart-head h2{margin:8px 0 4px}.smart-state{min-width:170px;text-align:center;border-radius:14px;padding:16px;background:#ecfdf3;border:1px solid #abefc6}.smart-state b,.smart-state span{display:block}.smart-state b{font-size:20px}.smart-state.warn{background:#fff8e6;border-color:#f4d58d}.smart-state.danger{background:#fee4e2;border-color:#f6b7b7}.smart-grid{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:12px}.smart-stat{border:1px solid #e5e7eb;border-radius:14px;padding:14px;background:#fff}.smart-stat span,.smart-stat small{display:block;color:#667085}.smart-stat b{display:block;font-size:22px;margin:5px 0}.smart-stat.warn{border-left:5px solid var(--y)}.smart-stat.danger{border-left:5px solid var(--r)}.progress-box{padding:14px;border:1px solid #e5e7eb;border-radius:14px}.progress-track{height:10px;background:#e5e7eb;border-radius:99px;overflow:hidden;margin-top:9px}.progress-track span{display:block;height:100%;background:var(--g)}.inset{box-shadow:none;border:1px solid #e5e7eb;padding:18px}.action-list{display:grid;gap:8px}.action-row{padding:11px;border-radius:10px;display:grid;gap:4px}.action-row.yes{background:#ecfdf3;border-left:4px solid var(--g)}.action-row.no{background:#fee4e2;border-left:4px solid var(--r)}.action-row.review{background:#f3e8ff;border-left:4px solid #6941c6}.action-row span{font-size:12px;color:#475467}.recovery-line{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #eef2f6}.recovery-line span{color:#667085;font-size:13px}.smart-timeline{position:relative;margin-left:8px}.smart-time-item{position:relative;display:grid;grid-template-columns:18px 1fr;gap:10px;padding:0 0 18px}.smart-time-item:before{content:"";position:absolute;left:6px;top:12px;bottom:-4px;width:2px;background:#d1e8de}.smart-time-item:last-child:before{display:none}.smart-dot{width:14px;height:14px;border-radius:50%;background:var(--g);margin-top:3px;z-index:1}@media(max-width:900px){.smart-grid{grid-template-columns:1fr 1fr}.smart-head{align-items:flex-start;flex-direction:column}.smart-state{width:100%}}@media(max-width:550px){.smart-grid{grid-template-columns:1fr}}

.audit-list{display:grid;gap:10px}.audit-item{border:1px solid #e5e7eb;border-left:5px solid #98a2b3;border-radius:12px;padding:12px;background:#fff}.audit-item.critical{border-left-color:#b42318}.audit-item.high{border-left-color:#e04f3f}.audit-item.medium{border-left-color:#b7791f}.audit-item.clinical{border-left-color:#1565c0}.dash-list{display:grid;gap:9px}.dash-row{display:flex;justify-content:space-between;gap:12px;padding:10px;border-bottom:1px solid #eef2f6}.dash-row:last-child{border-bottom:0}.metric-note{font-size:12px;color:#667085}.stat.clickable{cursor:pointer;transition:.15s}.stat.clickable:hover{transform:translateY(-2px);box-shadow:0 12px 28px #0002}
</style>

<style id="vat-v165-styles">
.vat-v165-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap}
.vat-v165-shared{display:grid;grid-template-columns:2fr 1fr 2fr;gap:12px;margin-top:14px}
.vat-v165-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:14px 0}
.vat-v165-rows{display:grid;gap:12px}
.vat-v165-row{border:1px solid #dce5e1;border-radius:14px;padding:14px;background:#fbfdfc;position:relative}
.vat-v165-row-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px}
.vat-v165-fields{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:10px}
.vat-v165-fields .field{margin:0}.vat-v165-wide{grid-column:span 2}.vat-v165-full{grid-column:1/-1}
.vat-v165-remove{border:0;background:#fee4e2;color:var(--r);border-radius:9px;padding:7px 11px;cursor:pointer}
.vat-v165-type{font-size:12px;font-weight:700;padding:4px 9px;border-radius:99px;background:#e8f5ef;color:var(--g)}
.vat-v165-type.history{background:#eaf2ff;color:#1565c0}.vat-v165-count{font-weight:700}
.vat-v165-hint{font-size:12px;color:#667085;margin-top:4px}.vat-v165-hidden{display:none!important}
@media(max-width:1100px){.vat-v165-fields{grid-template-columns:repeat(2,minmax(150px,1fr))}.vat-v165-shared{grid-template-columns:1fr 1fr}.vat-v165-shared .field:first-child{grid-column:1/-1}}
@media(max-width:650px){.vat-v165-fields,.vat-v165-shared{grid-template-columns:1fr}.vat-v165-wide{grid-column:auto}.vat-v165-shared .field:first-child{grid-column:auto}}
</style>
</head><body><div class="card"><h1 class="brand">💉 Vacunas a Tiempo</h1><h2>${esc(full(p))}</h2><img src="${img}"><p><b>CURP:</b> ${esc(p.curp||'No registrada')}</p><p><b>Fecha de nacimiento:</b> ${formatDateMX(p.birth)}</p><p class="muted">Código de acceso al expediente dentro de la base de datos autorizada. No sustituye la Cartilla Nacional de Salud.</p></div><p><button onclick="window.print()">Imprimir / Guardar PDF</button></p></body></html>`);w.document.close();
}
function qrCenter(){
  view.innerHTML=`<div class="two"><div class="card"><h3>Generar QR de paciente</h3><div class="field"><label>Paciente</label><select id="qrPatient"><option value="">Seleccione</option>${data.patients.map(p=>`<option value="${p.id}">${esc(full(p))}</option>`).join('')}</select></div><button class="btn primary" onclick="openSelectedQR()">Generar QR dinámico</button><div class="notice section">El código se genera completamente en este equipo, sin enviar datos a internet.</div></div><div class="card"><h3>Leer QR</h3><p class="muted">Carga una fotografía del QR. En navegadores compatibles se abrirá el expediente automáticamente.</p><div class="field"><label>Imagen con QR</label><input id="qrImage" type="file" accept="image/*" capture="environment" onchange="scanQRImage(this)"></div><div class="field"><label>O pega el código interno</label><textarea id="qrManual" rows="3" placeholder="VAT1|..."></textarea></div><button class="btn secondary" onclick="openManualQR()">Abrir código</button><p id="qrMsg"></p><canvas id="qrScanCanvas" class="hidden"></canvas></div></div><div class="card section"><h3>Captura inteligente disponible</h3><p>Ya puedes tomar o cargar una fotografía, mejorar su legibilidad, intentar OCR compatible y extraer automáticamente CURP, fecha de nacimiento y sexo para preparar un nuevo paciente.</p></div>`;
}
function openSelectedQR(){const id=Number(document.getElementById('qrPatient').value);if(!id){alert('Selecciona un paciente.');return}openPatientQR(id)}
function openManualQR(){try{patientRecord(parsePatientQR(document.getElementById('qrManual').value).id)}catch(e){qrMsg.innerHTML='<span class="badge danger">'+esc(e.message)+'</span>'}}
async function scanQRImage(input){
 const msg=document.getElementById('qrMsg');msg.textContent='Analizando imagen…';const file=input.files?.[0];if(!file)return;
 try{
   if(!('BarcodeDetector' in window))throw new Error('Este navegador no permite leer QR desde imágenes. Puedes escanearlo con el celular y pegar el código interno.');
   const bitmap=await createImageBitmap(file),detector=new BarcodeDetector({formats:['qr_code']}),codes=await detector.detect(bitmap);bitmap.close();
   if(!codes.length)throw new Error('No se detectó ningún QR. Toma la fotografía de frente, con buena luz y sin reflejos.');
   const p=parsePatientQR(codes[0].rawValue);patientRecord(p.id);
 }catch(e){msg.innerHTML='<span class="badge danger">'+esc(e.message)+'</span>'}
}

/* Agregar acceso QR a la lista sin perder las mejoras anteriores */
const renderPatientsV135Base=renderPatientsV133;
renderPatientsV133=function(){
  renderPatientsV135Base();document.querySelectorAll('#pList table tr').forEach((tr,i)=>{if(i===0){const th=document.createElement('th');th.textContent='QR';tr.appendChild(th);return}const btn=tr.querySelector('button[onclick^="patientRecord("]');if(!btn)return;const id=Number((btn.getAttribute('onclick').match(/\d+/)||[])[0]);const td=document.createElement('td');td.innerHTML=`<button class="btn secondary" onclick="openPatientQR(${id})">QR</button>`;tr.appendChild(td)});
}
const patientRecordV135Base=patientRecord;
patientRecord=function(id){patientRecordV135Base(id);const top=view.querySelector('.card .row');if(top){const b=document.createElement('button');b.className='btn secondary';b.textContent='QR del paciente';b.onclick=()=>openPatientQR(id);top.appendChild(b)}}



/* =============================================================
   v1.3.9 · Corrección de nombres y lector QR reforzado
   ============================================================= */
let smartCaptureState={file:null,fileType:'',rawText:'',parsed:null,pdfDoc:null,pdfPage:1,steps:[]};
const OCR_CDN={
 workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
 corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@5',
 langPath:'https://tessdata.projectnaptha.com/4.0.0'
};
function captureLog(step,state,detail=''){
 const i=smartCaptureState.steps.findIndex(x=>x.step===step),row={step,state,detail};if(i>=0)smartCaptureState.steps[i]=row;else smartCaptureState.steps.push(row);renderCaptureDiagnostics();
}
function renderCaptureDiagnostics(){const box=document.getElementById('ocrDiagnostics');if(!box)return;box.innerHTML=smartCaptureState.steps.map(x=>`<div style="padding:5px 0;border-bottom:1px solid #edf1ef"><b>${x.state==='ok'?'✅':x.state==='error'?'❌':'⏳'} ${esc(x.step)}</b>${x.detail?`<div class="muted">${esc(x.detail)}</div>`:''}</div>`).join('')||'<span class="muted">Aquí aparecerá el diagnóstico del proceso.</span>'}
function smartCapture(){
 view.innerHTML=`<div class="ocr-layout"><div class="card"><h2>Captura inteligente</h2><p class="muted">Carga una fotografía o un PDF de CURP, acta, cartilla o INE. Para OCR se requiere internet; el resto del sistema sigue funcionando localmente.</p><div class="field"><label>Tipo de documento</label><select id="ocrProfile"><option value="auto">Detección automática</option><option value="curp">CURP</option><option value="acta">Acta de nacimiento</option><option value="cartilla">Cartilla de salud</option><option value="ine">INE del tutor</option></select></div><div class="field"><label>Imagen o PDF</label><input id="ocrFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onchange="loadCaptureFile(this)"></div><div id="pdfControls" class="row hidden"><button class="btn secondary" onclick="changePdfPage(-1)">← Página anterior</button><span id="pdfPageLabel" class="badge"></span><button class="btn secondary" onclick="changePdfPage(1)">Página siguiente →</button></div><div class="row"><button class="btn secondary" onclick="preprocessCapture('contrast')">Mejorar contraste</button><button class="btn secondary" onclick="preprocessCapture('binary')">Blanco y negro</button><button class="btn secondary" onclick="restoreCapturePreview()">Restaurar</button></div><div class="row"><button id="ocrRunButton" class="btn primary" onclick="runSmartOCR()">Leer texto con OCR</button><button class="btn secondary" onclick="clearSmartCapture()">Limpiar</button></div><p id="ocrStatus" class="muted">Selecciona una imagen o PDF para comenzar.</p><div class="confidence section"><span id="ocrProgress" style="width:0%"></span></div><div class="ocr-stage section"><canvas id="ocrCanvas" width="720" height="420"></canvas></div></div><div class="card"><h3>Texto detectado</h3><textarea id="ocrText" class="ocr-result" placeholder="El texto reconocido aparecerá aquí…" oninput="smartCaptureState.rawText=this.value"></textarea><div class="row"><button class="btn primary" onclick="analyzeCaptureText()">Analizar datos</button><button class="btn secondary" onclick="copyCaptureText()">Copiar texto</button></div><div id="captureFields" class="section"></div><details class="section" open><summary><b>Diagnóstico del OCR</b></summary><div id="ocrDiagnostics" class="section"></div></details></div></div><div class="card section"><h3>Consejos</h3><p class="muted">Usa una imagen derecha, nítida, sin reflejos y con el texto ocupando la mayor parte del encuadre. En PDF selecciona la página correcta antes de iniciar el OCR.</p></div>`;
 drawCapturePlaceholder();renderCaptureDiagnostics();
}
function drawCapturePlaceholder(){const c=document.getElementById('ocrCanvas');if(!c)return;const x=c.getContext('2d');c.width=720;c.height=420;x.fillStyle='#f8fbfa';x.fillRect(0,0,c.width,c.height);x.fillStyle='#667085';x.font='22px Arial';x.textAlign='center';x.fillText('Vista previa del documento',c.width/2,c.height/2)}
async function loadCaptureFile(input){
 const file=input.files?.[0];if(!file)return;smartCaptureState={file,fileType:file.type,rawText:'',parsed:null,pdfDoc:null,pdfPage:1,steps:[]};captureLog('Archivo cargado','working',file.name);ocrStatus.textContent='Preparando archivo…';
 try{
  if(file.type==='application/pdf'||/\.pdf$/i.test(file.name)){await loadPdfDocument(file)}else{await drawImageFile(file)}
  captureLog('Archivo cargado','ok',file.name);ocrStatus.innerHTML='<span class="success">Documento listo para OCR.</span>';
 }catch(e){console.error(e);captureLog('Archivo cargado','error',e.message||String(e));ocrStatus.innerHTML='<span class="badge danger">No fue posible abrir el archivo.</span>'}
}
async function drawImageFile(file){const bitmap=await createImageBitmap(file);await drawBitmapToCanvas(bitmap);bitmap.close();smartCaptureState.originalData=document.getElementById('ocrCanvas').toDataURL('image/png');pdfControls.classList.add('hidden')}
async function drawBitmapToCanvas(bitmap){const c=document.getElementById('ocrCanvas'),x=c.getContext('2d');const maxW=1600,maxH=1200,scale=Math.min(maxW/bitmap.width,maxH/bitmap.height,1.6);c.width=Math.max(1,Math.round(bitmap.width*scale));c.height=Math.max(1,Math.round(bitmap.height*scale));x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(bitmap,0,0,c.width,c.height)}
async function getPdfJs(){if(window.pdfjsLib)return window.pdfjsLib;try{const lib=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');lib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';window.pdfjsLib=lib;return lib}catch(e){throw new Error('No se pudo cargar el lector PDF. Verifica internet.') }}
async function loadPdfDocument(file){captureLog('Lector PDF','working','Cargando biblioteca PDF.js');const lib=await getPdfJs();captureLog('Lector PDF','ok','PDF.js disponible');const bytes=new Uint8Array(await file.arrayBuffer());smartCaptureState.pdfDoc=await lib.getDocument({data:bytes}).promise;smartCaptureState.pdfPage=1;pdfControls.classList.remove('hidden');await renderPdfPage()}
async function renderPdfPage(){const doc=smartCaptureState.pdfDoc;if(!doc)return;const n=Math.min(Math.max(1,smartCaptureState.pdfPage),doc.numPages);smartCaptureState.pdfPage=n;pdfPageLabel.textContent=`Página ${n} de ${doc.numPages}`;const page=await doc.getPage(n),viewport=page.getViewport({scale:2});const c=document.getElementById('ocrCanvas'),x=c.getContext('2d');c.width=Math.round(viewport.width);c.height=Math.round(viewport.height);await page.render({canvasContext:x,viewport}).promise;smartCaptureState.originalData=c.toDataURL('image/png');captureLog('Página PDF','ok',`Página ${n} renderizada`)}
async function changePdfPage(delta){const doc=smartCaptureState.pdfDoc;if(!doc)return;smartCaptureState.pdfPage=Math.min(doc.numPages,Math.max(1,smartCaptureState.pdfPage+delta));await renderPdfPage()}
function preprocessCapture(mode='contrast'){
 const c=document.getElementById('ocrCanvas');if(!c||!smartCaptureState.file){alert('Primero selecciona un archivo.');return}const x=c.getContext('2d'),img=x.getImageData(0,0,c.width,c.height),d=img.data;for(let i=0;i<d.length;i+=4){let g=.299*d[i]+.587*d[i+1]+.114*d[i+2];if(mode==='binary')g=g>155?255:0;else g=Math.max(0,Math.min(255,(g-128)*1.8+128));d[i]=d[i+1]=d[i+2]=g}x.putImageData(img,0,0);captureLog('Preprocesamiento','ok',mode==='binary'?'Blanco y negro aplicado':'Contraste mejorado');ocrStatus.innerHTML='<span class="success">Imagen preparada. Ejecuta el OCR.</span>'
}
function restoreCapturePreview(){if(!smartCaptureState.originalData)return;const img=new Image();img.onload=()=>{const c=ocrCanvas,x=c.getContext('2d');c.width=img.width;c.height=img.height;x.drawImage(img,0,0);captureLog('Preprocesamiento','ok','Vista original restaurada')};img.src=smartCaptureState.originalData}
async function runSmartOCR(){
 const status=ocrStatus,button=ocrRunButton,progress=ocrProgress;if(!smartCaptureState.file){status.textContent='Primero selecciona una imagen o PDF.';return}if(typeof Tesseract==='undefined'){captureLog('Motor OCR','error','La biblioteca Tesseract.js no se cargó');status.innerHTML='<span class="badge danger">No se cargó Tesseract.js. Revisa internet y vuelve a abrir el sistema.</span>';return}
 button.disabled=true;progress.style.width='1%';smartCaptureState.steps=smartCaptureState.steps.filter(x=>!['Motor OCR','Idioma','Reconocimiento'].includes(x.step));captureLog('Motor OCR','working','Inicializando Tesseract.js');let worker=null;
 try{
  worker=await Tesseract.createWorker('spa',1,{workerPath:OCR_CDN.workerPath,corePath:OCR_CDN.corePath,langPath:OCR_CDN.langPath,logger:m=>{const pct=Math.round((m.progress||0)*100);progress.style.width=Math.max(2,pct)+'%';const labels={'loading tesseract core':'Cargando motor','initializing tesseract':'Inicializando','loading language traineddata':'Cargando español','initializing api':'Preparando OCR','recognizing text':'Reconociendo texto'};status.textContent=(labels[m.status]||m.status||'Procesando')+(m.progress!=null?` · ${pct}%`:'');if(m.status==='loading language traineddata')captureLog('Idioma','working','Descargando español');if(m.status==='recognizing text')captureLog('Idioma','ok','Español listo')}});
  captureLog('Motor OCR','ok','Worker iniciado correctamente');await worker.setParameters({preserve_interword_spaces:'1',tessedit_pageseg_mode:'6'});captureLog('Reconocimiento','working','Analizando la página visible');const result=await worker.recognize(ocrCanvas);const text=(result?.data?.text||'').trim(),confidence=Math.round(result?.data?.confidence||0);if(!text)throw new Error('El motor terminó sin detectar texto');ocrText.value=text;smartCaptureState.rawText=text;progress.style.width='100%';captureLog('Reconocimiento','ok',`${text.length} caracteres · confianza ${confidence}%`);status.innerHTML=`<span class="success">Texto detectado. Confianza aproximada: ${confidence}%.</span>`;analyzeCaptureText();
 }catch(e){console.error('OCR v1.3.8:',e);progress.style.width='0%';captureLog('Reconocimiento','error',e.message||String(e));status.innerHTML=`<span class="badge danger">OCR falló: ${esc(e.message||String(e))}. Abre “Diagnóstico del OCR” para ver el paso afectado.</span>`}finally{if(worker)try{await worker.terminate()}catch(e){}button.disabled=false}
}
function normalizeOCRText(s){return String(s||'').toUpperCase().replace(/[|]/g,'I').replace(/\s+/g,' ').trim()}
function validCURPStructure(curp){return /^[A-Z][AEIOUX][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM][A-Z]{5}[A-Z0-9]\d$/.test(curp)}
function repairCURPCandidate(s){s=s.toUpperCase().replace(/[^A-Z0-9]/g,'');if(s.length!==18)return s;let a=s.split('');for(const i of [4,5,6,7,8,9,17])a[i]=({'O':'0','I':'1','L':'1','S':'5','B':'8','Z':'2','G':'6'}[a[i]]||a[i]);if(a[10]==='N')a[10]='M';return a.join('')}
function extractCURP(text){const compact=normalizeOCRText(text).replace(/[^A-Z0-9]/g,' '),raw=compact.match(/[A-Z0-9]{18}/g)||[],candidates=raw.map(repairCURPCandidate);return candidates.find(validCURPStructure)||candidates[0]||''}
function curpDetails(curp){if(!curp||curp.length!==18)return{birth:'',sex:''};const yy=Number(curp.slice(4,6)),mm=curp.slice(6,8),dd=curp.slice(8,10),century=/\d/.test(curp[16])?1900:2000;return{birth:`${century+yy}-${mm}-${dd}`,sex:curp[10]==='H'?'Masculino':curp[10]==='M'?'Femenino':''}}
const OCR_STOP=new Set(['CURP','CLAVE','UNICA','REGISTRO','POBLACION','ESTADOS','UNIDOS','MEXICANOS','FECHA','NACIMIENTO','SEXO','NOMBRE','PRIMER','APELLIDO','SEGUNDO','DOCUMENTO','CERTIFICADA','CARTILLA','SALUD','NACIONAL','MEXICO','ENTIDAD']);
function probableName(text,curp){let words=normalizeOCRText(text).replace(curp,' ').match(/[A-ZÁÉÍÓÚÑ]{3,}/g)||[];words=words.filter(w=>!OCR_STOP.has(w));return{pat:words[0]||'',mat:words[1]||'',name:words.slice(2,5).join(' ')}}
function analyzeCaptureText(){const raw=ocrText?.value||smartCaptureState.rawText,curp=extractCURP(raw),details=curpDetails(curp),n=probableName(raw,curp);smartCaptureState.parsed={curp,birth:details.birth,sex:details.sex,name:n.name,pat:n.pat,mat:n.mat};renderCaptureFields()}
function renderCaptureFields(){const p=smartCaptureState.parsed||{},score=[p.curp,p.birth,p.sex,p.name,p.pat].filter(Boolean).length*20;captureFields.innerHTML=`<h3>Datos sugeridos</h3><div class="confidence"><span style="width:${score}%"></span></div><p class="muted">Completitud estimada: ${score}%. Confirma contra el documento original.</p><div class="field"><label>CURP</label><input id="capCurp" value="${esc(p.curp||'')}"></div><div class="field"><label>Nombre(s)</label><input id="capName" value="${esc(p.name||'')}"></div><div class="field"><label>Apellido paterno</label><input id="capPat" value="${esc(p.pat||'')}"></div><div class="field"><label>Apellido materno</label><input id="capMat" value="${esc(p.mat||'')}"></div><div class="field"><label>Fecha de nacimiento</label><input id="capBirth" type="date" value="${esc(p.birth||'')}"></div><div class="field"><label>Sexo</label><select id="capSex"><option value="">Seleccione</option><option ${p.sex==='Femenino'?'selected':''}>Femenino</option><option ${p.sex==='Masculino'?'selected':''}>Masculino</option></select></div><button class="btn primary" onclick="preparePatientFromCapture()">Revisar en registro de paciente</button>`}
function preparePatientFromCapture(){const draft={curp:capCurp.value.trim().toUpperCase(),name:capName.value.trim(),pat:capPat.value.trim(),mat:capMat.value.trim(),birth:capBirth.value,sex:capSex.value};if(!draft.curp&&!draft.name){alert('No se detectaron datos suficientes. Corrige la transcripción.');return}sessionStorage.setItem('vat_capture_draft',JSON.stringify(draft));quick('patients')}
function applyCaptureDraft(){const raw=sessionStorage.getItem('vat_capture_draft');if(!raw)return;sessionStorage.removeItem('vat_capture_draft');try{const d=JSON.parse(raw);if(document.getElementById('pCurp'))pCurp.value=d.curp||'';if(document.getElementById('pName'))pName.value=d.name||'';if(document.getElementById('pPat'))pPat.value=d.pat||'';if(document.getElementById('pMat'))pMat.value=d.mat||'';if(document.getElementById('pBirth'))pBirth.value=d.birth||'';if(document.getElementById('pSex')&&d.sex)pSex.value=d.sex;pMsg.innerHTML='<span class="success">Datos cargados desde Captura inteligente. Revísalos antes de guardar.</span>';pCurp?.focus()}catch(e){console.error(e)}}
function clearSmartCapture(){smartCaptureState={file:null,fileType:'',rawText:'',parsed:null,pdfDoc:null,pdfPage:1,steps:[]};smartCapture()}
function copyCaptureText(){const text=ocrText?.value||'';navigator.clipboard?.writeText(text).then(()=>alert('Texto copiado.')).catch(()=>prompt('Copia el texto:',text))}
const patientsV138Base=patients;patients=function(){patientsV138Base();requestAnimationFrame(applyCaptureDraft)};


/* =============================================================
   v1.3.9 · Corrección de nombres y lector QR reforzado
   ============================================================= */
const OCR_STOP_V139=new Set([
 'CURP','CLAVE','UNICA','ÚNICA','REGISTRO','POBLACION','POBLACIÓN','ESTADOS','UNIDOS','MEXICANOS','MEXICANO',
 'FECHA','NACIMIENTO','SEXO','NOMBRE','NOMBRES','PRIMER','APELLIDO','SEGUNDO','DOCUMENTO','CERTIFICADA','CERTIFICADO',
 'CARTILLA','SALUD','NACIONAL','MEXICO','MÉXICO','ENTIDAD','IDENTIFICACION','IDENTIFICACIÓN','CONSTANCIA','FOLIO',
 'DATOS','PERSONALES','PERSONA','TITULAR','HOMOCLAVE','EXPEDICION','EXPEDICIÓN','VALIDACION','VALIDACIÓN','GOBIERNO',
 'SECRETARIA','SECRETARÍA','INTERIOR','RENAPO','CODIGO','CÓDIGO','RESPUESTA','ESCANEA','ESCANEAR','DIGITAL'
]);
function cleanOCRWordV139(w){return String(w||'').toUpperCase().replace(/[^A-ZÁÉÍÓÚÜÑ]/g,'').trim()}
function probableName(text,curp){
 const normalized=String(text||'').toUpperCase().replace(curp||'',' ');
 const lines=normalized.split(/\r?\n/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
 const marker=/^(?:NOMBRE(?:S)?|NOMBRE COMPLETO|APELLIDO PATERNO|PRIMER APELLIDO|APELLIDO MATERNO|SEGUNDO APELLIDO)\s*[:\-]?\s*(.*)$/i;
 let named=[];
 for(let i=0;i<lines.length;i++){
   const m=lines[i].match(marker);
   if(m){
     const inline=m[1]?.trim();
     if(inline)named.push(inline);
     else if(lines[i+1])named.push(lines[i+1]);
   }
 }
 let words=(named.join(' ')||normalized).match(/[A-ZÁÉÍÓÚÜÑ]{2,}/g)||[];
 words=words.map(cleanOCRWordV139).filter(w=>w.length>=2&&!OCR_STOP_V139.has(w)&&!/^X+$/.test(w));
 // Evita que encabezados como IDENTIFICACIÓN terminen en el campo Nombre.
 if(words.length>=3)return{pat:words[0],mat:words[1],name:words.slice(2,6).join(' ')};
 return{pat:words[0]||'',mat:words[1]||'',name:words.slice(2).join(' ')};
}
function drawQRScanSource(bitmap,scale=1,invert=false,padding=40){
 const c=document.getElementById('qrScanCanvas'),max=1800;
 const ratio=Math.min(max/(bitmap.width||1),max/(bitmap.height||1),scale);
 const w=Math.max(1,Math.round(bitmap.width*ratio)),h=Math.max(1,Math.round(bitmap.height*ratio));
 c.width=w+padding*2;c.height=h+padding*2;const x=c.getContext('2d',{willReadFrequently:true});
 x.fillStyle=invert?'#000':'#fff';x.fillRect(0,0,c.width,c.height);x.imageSmoothingEnabled=false;x.drawImage(bitmap,padding,padding,w,h);
 if(invert){const img=x.getImageData(0,0,c.width,c.height),d=img.data;for(let i=0;i<d.length;i+=4){d[i]=255-d[i];d[i+1]=255-d[i+1];d[i+2]=255-d[i+2]}x.putImageData(img,0,0)}
 return c;
}
async function decodeQRV139(file){
 const bitmap=await createImageBitmap(file);let raw='';
 try{
   if('BarcodeDetector' in window){
     const detector=new BarcodeDetector({formats:['qr_code']});
     for(const src of [bitmap,drawQRScanSource(bitmap,2,false,80),drawQRScanSource(bitmap,3,false,120),drawQRScanSource(bitmap,2,true,80)]){
       try{const codes=await detector.detect(src);if(codes?.[0]?.rawValue){raw=codes[0].rawValue;break}}catch(_e){}
     }
   }
   if(!raw&&typeof window.jsQR==='function'){
     for(const mode of [[2,false,80],[3,false,120],[2,true,80]]){
       const c=drawQRScanSource(bitmap,...mode),x=c.getContext('2d',{willReadFrequently:true}),img=x.getImageData(0,0,c.width,c.height);
       const found=window.jsQR(img.data,img.width,img.height,{inversionAttempts:'attemptBoth'});if(found?.data){raw=found.data;break}
     }
   }
 }finally{bitmap.close()}
 return raw.trim();
}
async function scanQRImage(input){
 const msg=document.getElementById('qrMsg'),file=input.files?.[0];if(!file)return;
 msg.innerHTML='<span class="badge">Analizando el QR…</span>';
 try{
   const raw=await decodeQRV139(file);
   if(!raw){
     const support=('BarcodeDetector' in window)||typeof window.jsQR==='function';
     throw new Error(support?'No se pudo leer el QR. Usa el PNG original descargado, sin recortarlo, o una foto de frente y con buena luz.':'El lector QR no pudo cargarse. Conéctate a internet, vuelve a abrir el programa y repite la prueba.');
   }
   const p=parsePatientQR(raw);msg.innerHTML='<span class="success">QR reconocido. Abriendo expediente…</span>';setTimeout(()=>patientRecord(p.id),150);
 }catch(e){msg.innerHTML='<span class="badge danger">'+esc(e.message||String(e))+'</span>'}
}
const downloadPatientQRV139Base=downloadPatientQR;
downloadPatientQR=function(id){
 const p=data.patients.find(x=>x.id===id);if(!p)return;const c=document.createElement('canvas');VATQR.draw(patientQRPayload(p),c,1200);
 const out=document.createElement('canvas'),pad=80;out.width=c.width+pad*2;out.height=c.height+pad*2;const x=out.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,out.width,out.height);x.imageSmoothingEnabled=false;x.drawImage(c,pad,pad);
 const a=document.createElement('a');a.href=out.toDataURL('image/png');a.download='QR_'+(p.curp||String(p.id))+'_VAT.png';a.click();
}


/* =============================================================
   v1.3.11 · Parser OCR por bloques, CURP estricta y fecha confiable
   ============================================================= */
const OCR_NOISE_V1311=new Set([
 'IDENTIFICACION','IDENTIFICACIÓN','DATOS','GENERALES','UNIDAD','MEDICA','MÉDICA','CONSULTORIO','HORARIO','DOMICILIO',
 'CALLE','NUMERO','NÚMERO','COLONIA','LOCALIDAD','DELEGACION','DELEGACIÓN','MUNICIPIO','ENTIDAD','FEDERATIVA',
 'LUGAR','FECHA','NACIMIENTO','CIUDAD','POBLACION','POBLACIÓN','EDAD','GRUPO','SANGUINEO','SANGUÍNEO','AGREGADO',
 'MEDICO','MÉDICO','SOCIAL','SEGURO','NOMBRE','CURP','REGISTRO','CARTILLA','SALUD','NACIONAL','FIRMA','SELLO',
 'UMF','IMSS','INSTITUTO','MEXICANO','CONSULTORIO','DOCUMENTO','AFILIACION','AFILIACIÓN'
]);
function cleanOCRLineV1311(line){return String(line||'').toUpperCase().replace(/[|]/g,'I').replace(/[“”]/g,'').replace(/\s+/g,' ').trim()}
function alphaWordsV1311(line){return (cleanOCRLineV1311(line).match(/[A-ZÁÉÍÓÚÜÑ]{2,}/g)||[]).filter(w=>!OCR_NOISE_V1311.has(w))}
function isLabelV1311(line){return /^(?:UNIDAD|CONSULTORIO|DATOS|CURP|DOMICILIO|FECHA|SEXO|EDAD|HORARIO|GRUPO|LUGAR|COLONIA|ENTIDAD)\b/.test(cleanOCRLineV1311(line))}
function extractNameBlockV1311(text){
 const lines=String(text||'').split(/\r?\n/).map(cleanOCRLineV1311).filter(Boolean);
 for(let i=0;i<lines.length;i++){
   const m=lines[i].match(/\bNOMBRE(?:S)?\s*[:\-]?\s*(.*)$/i);if(!m)continue;
   const same=alphaWordsV1311(m[1]||'');
   const following=[];
   for(let j=i+1;j<Math.min(lines.length,i+5);j++){
     if(isLabelV1311(lines[j]))break;
     const words=alphaWordsV1311(lines[j]);
     if(words.length&&words.length<=4&&!/\d/.test(lines[j]))following.push(words);
   }
   // Cartilla IMSS: "NOMBRE: APELLIDO PATERNO APELLIDO MATERNO" y debajo "NOMBRE(S)".
   if(same.length===2&&following.length){
     return{pat:same[0],mat:same[1],name:following[0].join(' '),source:'bloque IMSS de dos líneas'};
   }
   // Cuando Tesseract junta ambas líneas en la misma etiqueta, usamos la CURP como apoyo:
   // las primeras cuatro letras suelen corresponder a iniciales de apellidos y nombre.
   if(same.length>=3){
     return{name:same.slice(0,-2).join(' '),pat:same[same.length-2],mat:same[same.length-1],source:'línea NOMBRE convencional'};
   }
 }
 return null;
}
function repairCURPV1311(raw){
 let a=String(raw||'').toUpperCase().replace(/[^A-Z0-9]/g,'').split('');if(a.length!==18)return'';
 const toDigit={'O':'0','Q':'0','D':'0','I':'1','L':'1','T':'1','Z':'2','S':'5','G':'6','B':'8'};
 const toLetter={'0':'O','1':'I','2':'Z','5':'S','6':'G','8':'B'};
 [4,5,6,7,8,9,17].forEach(i=>a[i]=toDigit[a[i]]||a[i]);
 [0,1,2,3,10,11,12,13,14,15].forEach(i=>a[i]=toLetter[a[i]]||a[i]);
 return a.join('');
}
function curpPlausibleV1311(c){
 if(!/^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(c))return false;
 const yy=+c.slice(4,6),mm=+c.slice(6,8),dd=+c.slice(8,10);if(mm<1||mm>12||dd<1||dd>31)return false;
 const century=/\d/.test(c[16])?1900:2000;const d=new Date(century+yy,mm-1,dd);
 return d.getFullYear()===century+yy&&d.getMonth()===mm-1&&d.getDate()===dd;
}
function extractCURP(text){
 const lines=String(text||'').split(/\r?\n/).map(cleanOCRLineV1311).filter(Boolean), ranked=[];
 function add(raw,bonus){const c=repairCURPV1311(raw);if(curpPlausibleV1311(c))ranked.push({c,score:bonus});}
 for(let i=0;i<lines.length;i++){
   if(/\bCURP\b/.test(lines[i])){
     const after=lines[i].replace(/^.*?\bCURP\b\s*[:.\-]?\s*/,'');
     for(const t of (after.match(/[A-Z0-9]{16,22}/g)||[]))add(t,100);
     if(i+1<lines.length)for(const t of (lines[i+1].match(/[A-Z0-9]{16,22}/g)||[]))add(t,90);
   }
 }
 // Solo tokens aislados: nunca ventanas arbitrarias tomadas de todo el documento.
 for(const t of (String(text||'').toUpperCase().match(/\b[A-Z0-9][A-Z0-9 ._-]{16,24}[A-Z0-9]\b/g)||[]))add(t,40);
 ranked.sort((a,b)=>b.score-a.score);return ranked[0]?.c||'';
}
function birthFromCURPV1311(curp){
 if(!curpPlausibleV1311(curp))return'';const yy=+curp.slice(4,6),mm=curp.slice(6,8),dd=curp.slice(8,10),century=/\d/.test(curp[16])?1900:2000;
 return `${century+yy}-${mm}-${dd}`;
}
function extractPrintedBirthV1311(text){
 const lines=String(text||'').split(/\r?\n/).map(cleanOCRLineV1311).filter(Boolean);
 let zone='';for(let i=0;i<lines.length;i++)if(/LUGAR.*FECHA.*NACIMIENTO|FECHA.*NACIMIENTO/.test(lines[i]))zone=lines.slice(i,i+8).join(' ');
 const source=zone||lines.join(' '),patterns=[
  /\b(0?[1-9]|[12]\d|3[01])\D{1,8}(0?[1-9]|1[0-2])\D{1,8}((?:19|20)\d{2})\b/,
  /\b((?:19|20)\d{2})\D{1,8}(0?[1-9]|1[0-2])\D{1,8}(0?[1-9]|[12]\d|3[01])\b/
 ];
 for(let k=0;k<patterns.length;k++){const m=source.match(patterns[k]);if(!m)continue;let y,mo,d;if(k===0){d=m[1];mo=m[2];y=m[3]}else{y=m[1];mo=m[2];d=m[3]}
   d=String(d).padStart(2,'0');mo=String(mo).padStart(2,'0');const dt=new Date(`${y}-${mo}-${d}T00:00:00`);if(!Number.isNaN(dt.getTime()))return`${y}-${mo}-${d}`;
 }
 return'';
}
function probableName(text,curp){
 const block=extractNameBlockV1311(text);if(block)return block;
 return{pat:'',mat:'',name:'',source:'sin asignación automática: requiere revisión'};
}
function analyzeCaptureText(){
 const raw=ocrText?.value||smartCaptureState.rawText,curp=extractCURP(raw),n=probableName(raw,curp),birth=birthFromCURPV1311(curp)||extractPrintedBirthV1311(raw);
 const sex=curpPlausibleV1311(curp)?(curp[10]==='M'?'Femenino':curp[10]==='H'?'Masculino':''):'';
 smartCaptureState.parsed={curp,birth,sex,name:n.name,pat:n.pat,mat:n.mat,nameSource:n.source||''};renderCaptureFields();
 const status=document.getElementById('ocrStatus');if(status){const missing=[];if(!curp)missing.push('CURP');if(!n.name)missing.push('nombre');if(!birth)missing.push('fecha');status.innerHTML=missing.length?`<span class="badge danger">Lectura parcial. Falta confirmar: ${esc(missing.join(', '))}. No se llenaron datos dudosos.</span>`:'<span class="success">Datos detectados. Confírmalos contra el documento.</span>'}
}
function renderCaptureFields(){
 const p=smartCaptureState.parsed||{},score=[p.curp,p.birth,p.sex,p.name,p.pat,p.mat].filter(Boolean).length/6*100;
 captureFields.innerHTML=`<h3>Datos sugeridos</h3><div class="confidence"><span style="width:${Math.round(score)}%"></span></div><p class="muted">Completitud estimada: ${Math.round(score)}%. ${p.nameSource?'Método: '+esc(p.nameSource)+'. ':''}Los campos dudosos se dejan vacíos para evitar duplicar datos incorrectos.</p><div class="field"><label>CURP</label><input id="capCurp" maxlength="18" value="${esc(p.curp||'')}"></div><div class="field"><label>Nombre(s)</label><input id="capName" value="${esc(p.name||'')}"></div><div class="field"><label>Apellido paterno</label><input id="capPat" value="${esc(p.pat||'')}"></div><div class="field"><label>Apellido materno</label><input id="capMat" value="${esc(p.mat||'')}"></div><div class="field"><label>Fecha de nacimiento</label><input id="capBirth" type="date" value="${esc(p.birth||'')}"></div><div class="field"><label>Sexo</label><select id="capSex"><option value="">Seleccione</option><option ${p.sex==='Femenino'?'selected':''}>Femenino</option><option ${p.sex==='Masculino'?'selected':''}>Masculino</option></select></div><button class="btn primary" onclick="preparePatientFromCapture()">Revisar en registro de paciente</button>`;
}


/* Integración v1.4.0 */
const dashboardBeforeV140=dashboard;
dashboard=function(){
  dashboardBeforeV140();
  const pending=followUpRows().filter(r=>r.level!=='Al día').length;
  const grid=document.querySelector('#view .grid');
  if(grid)grid.insertAdjacentHTML('beforeend',`<div class="card stat"><span>Seguimientos pendientes</span><b>${pending}</b></div>`);
  const actions=document.querySelector('#view .section .row');
  if(actions)actions.insertAdjacentHTML('beforeend','<button class="btn primary" onclick="quick(\'followUp\')">Ver seguimiento</button>');
}


/* v1.4.1 · Lector inteligente de cartillas */
tabs.splice(tabs.findIndex(x=>x[0]==='reports'),0,['cardReader','Lector de cartillas']);
let cardReaderState={file:null,pdfDoc:null,page:1,rawText:'',rows:[],patientId:'',logs:[]};
const CARD_VACCINES=[
 {name:'BCG',aliases:['BCG']},
 {name:'Hepatitis B',aliases:['HEPATITIS B','HEP B','HEPATITISB']},
 {name:'Hexavalente',aliases:['HEXAVALENTE','HEXA VALENTE','DPTA IPV HIB HB','DPTA-IPV-HIB-HB']},
 {name:'Pentavalente',aliases:['PENTAVALENTE','PENTA VALENTE']},
 {name:'Rotavirus',aliases:['ROTAVIRUS','ROTA VIRUS']},
 {name:'Neumococo',aliases:['NEUMOCOCO','NEUMOCOCICA','NEUMOCOCICA CONJUGADA','PCV']},
 {name:'Influenza',aliases:['INFLUENZA','ANTIINFLUENZA']},
 {name:'SRP',aliases:['SRP','TRIPLE VIRAL','SARAMPION RUBEOLA PAROTIDITIS']},
 {name:'DPT',aliases:['DPT','D.P.T.','DIFTERIA TOSFERINA TETANOS']},
 {name:'Sabin',aliases:['SABIN','POLIO ORAL','OPV']},
 {name:'VPH',aliases:['VPH','PAPILOMA HUMANO','VIRUS DEL PAPILOMA']},
 {name:'Td',aliases:[' TOXOIDE TD ',' TD ','TETANOS DIFTERIA']},
 {name:'Tdpa',aliases:['TDPA','TDP A','TETANOS DIFTERIA TOSFERINA ACELULAR']},
 {name:'COVID-19',aliases:['COVID-19','COVID 19','SARS-COV-2']}
];
function cardLog(text){cardReaderState.logs.push(text);const el=document.getElementById('cardLogs');if(el)el.innerHTML=cardReaderState.logs.map(x=>`<div>• ${esc(x)}</div>`).join('')}
function cardReader(){
 cardReaderState={file:null,pdfDoc:null,page:1,rawText:'',rows:[],patientId:'',logs:[]};
 view.innerHTML=`<div class="card"><h2>📖 Lector inteligente de cartillas</h2><p class="muted">Carga fotografías o un PDF de la cartilla. El sistema buscará vacunas, fechas, dosis y lotes para preparar una importación revisable.</p><div class="two"><div><div class="field"><label>Paciente</label><select id="cardPatient" onchange="cardReaderState.patientId=this.value"><option value="">Seleccione</option>${data.patients.map(p=>`<option value="${p.id}">${esc(full(p))}</option>`).join('')}</select></div><div class="field"><label>Imagen o PDF de cartilla</label><input id="cardFile" type="file" accept="image/*,.pdf,application/pdf" multiple onchange="loadCardFile(this)"></div><div id="cardPdfControls" class="row hidden"><button class="btn secondary" onclick="changeCardPage(-1)">← Página</button><span id="cardPageLabel"></span><button class="btn secondary" onclick="changeCardPage(1)">Página →</button></div><div class="row"><button id="cardReadBtn" class="btn primary" onclick="runCardOCR()">Leer cartilla</button><button class="btn secondary" onclick="preprocessCardCanvas()">Mejorar imagen</button></div><p id="cardStatus" class="muted">Selecciona un archivo.</p><div class="confidence"><span id="cardProgress" style="width:0%"></span></div><canvas id="cardCanvas" width="900" height="520" style="max-width:100%;border:1px solid #d8e2de;border-radius:10px;margin-top:12px"></canvas></div><div><h3>Diagnóstico</h3><div id="cardLogs" class="notice" style="min-height:120px">Aún no se ha procesado ninguna cartilla.</div><h3 class="section">Texto reconocido</h3><textarea id="cardRawText" rows="12" placeholder="Aquí aparecerá el texto OCR" oninput="cardReaderState.rawText=this.value"></textarea><button class="btn secondary" onclick="analyzeCardText()">Volver a analizar texto</button></div></div></div><div id="cardResults" class="card section"><h3>Vacunas encontradas</h3><p class="muted">Todavía no hay resultados.</p></div>`;
 const c=document.getElementById('cardCanvas'),x=c.getContext('2d');x.fillStyle='#f7faf9';x.fillRect(0,0,c.width,c.height);x.fillStyle='#667085';x.font='22px Arial';x.textAlign='center';x.fillText('Vista previa de la cartilla',c.width/2,c.height/2);
}
async function loadCardFile(input){
 const f=input.files?.[0];if(!f)return;cardReaderState.file=f;cardReaderState.logs=[];cardLog('Archivo cargado: '+f.name);
 try{if(f.type==='application/pdf'||/\.pdf$/i.test(f.name)){const lib=await getPdfJs();const bytes=new Uint8Array(await f.arrayBuffer());cardReaderState.pdfDoc=await lib.getDocument({data:bytes}).promise;cardReaderState.page=1;cardPdfControls.classList.remove('hidden');await renderCardPdfPage();cardLog('PDF listo: '+cardReaderState.pdfDoc.numPages+' página(s)')}else{cardReaderState.pdfDoc=null;cardPdfControls.classList.add('hidden');const bmp=await createImageBitmap(f);drawCardBitmap(bmp);bmp.close();cardLog('Imagen lista para OCR')}cardStatus.textContent='Archivo preparado. Pulsa “Leer cartilla”.'}catch(e){cardStatus.textContent='No se pudo abrir el archivo.';cardLog('Error: '+(e.message||e))}
}
function drawCardBitmap(bmp){const c=cardCanvas,x=c.getContext('2d'),scale=Math.min(1800/bmp.width,1400/bmp.height,2);c.width=Math.max(1,Math.round(bmp.width*scale));c.height=Math.max(1,Math.round(bmp.height*scale));x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(bmp,0,0,c.width,c.height)}
async function renderCardPdfPage(){const d=cardReaderState.pdfDoc;if(!d)return;cardReaderState.page=Math.max(1,Math.min(d.numPages,cardReaderState.page));cardPageLabel.textContent=`Página ${cardReaderState.page} de ${d.numPages}`;const pg=await d.getPage(cardReaderState.page),vp=pg.getViewport({scale:2.2}),c=cardCanvas,x=c.getContext('2d');c.width=Math.round(vp.width);c.height=Math.round(vp.height);await pg.render({canvasContext:x,viewport:vp}).promise;cardLog('Página '+cardReaderState.page+' preparada')}
async function changeCardPage(delta){if(!cardReaderState.pdfDoc)return;cardReaderState.page+=delta;await renderCardPdfPage()}
function preprocessCardCanvas(){const c=cardCanvas,x=c.getContext('2d'),im=x.getImageData(0,0,c.width,c.height),d=im.data;for(let i=0;i<d.length;i+=4){const g=.299*d[i]+.587*d[i+1]+.114*d[i+2];const v=g>175?255:g<85?0:Math.max(0,Math.min(255,(g-128)*1.65+128));d[i]=d[i+1]=d[i+2]=v}x.putImageData(im,0,0);cardLog('Contraste y blanco/negro aplicados')}
async function runCardOCR(){
 if(!cardReaderState.file){cardStatus.textContent='Selecciona una imagen o PDF.';return}if(typeof Tesseract==='undefined'){cardStatus.textContent='No se cargó el motor OCR. Revisa la conexión a internet.';cardLog('Tesseract.js no disponible');return}
 cardReadBtn.disabled=true;cardProgress.style.width='2%';cardLog('Iniciando reconocimiento OCR');let w=null;
 try{w=await Tesseract.createWorker('spa',1,{workerPath:OCR_CDN.workerPath,corePath:OCR_CDN.corePath,langPath:OCR_CDN.langPath,logger:m=>{const pct=Math.round((m.progress||0)*100);cardProgress.style.width=Math.max(2,pct)+'%';cardStatus.textContent=(m.status||'Procesando')+' · '+pct+'%'}});const r=await w.recognize(cardCanvas);cardReaderState.rawText=r.data.text||'';cardRawText.value=cardReaderState.rawText;cardLog('OCR terminado. Confianza aproximada: '+Math.round(r.data.confidence||0)+'%');analyzeCardText();cardStatus.textContent='Lectura terminada. Revisa antes de importar.'}catch(e){cardStatus.textContent='OCR falló: '+(e.message||e);cardLog('Error OCR: '+(e.message||e))}finally{if(w)try{await w.terminate()}catch(e){}cardReadBtn.disabled=false}
}
function normalizeCardText(t){return String(t||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[|]/g,'I').replace(/\s+/g,' ').trim()}
function parseDateNear(text,start){const area=text.slice(Math.max(0,start-45),Math.min(text.length,start+120));const matches=[...area.matchAll(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/g)];for(const m of matches){let y=+m[3];if(y<100)y+=y>=40?1900:2000;const d=+m[1],mo=+m[2];if(y>=1990&&y<=new Date().getFullYear()&&mo>=1&&mo<=12&&d>=1&&d<=31)return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`}return''}
function parseLotNear(text,start){const area=text.slice(start,Math.min(text.length,start+140));let m=area.match(/(?:LOTE|LOT|L)[\s:#.-]*([A-Z0-9-]{3,18})/);return m?m[1]:''}
function parseDoseNear(text,start){const area=text.slice(Math.max(0,start-20),Math.min(text.length,start+90));if(/3A|TERCERA|3RA/.test(area))return'Tercera';if(/2A|SEGUNDA|2DA/.test(area))return'Segunda';if(/1A|PRIMERA|1RA/.test(area))return'Primera';if(/REFUERZO|REF\b/.test(area))return'Refuerzo';if(/UNICA|ÚNICA/.test(area))return'Única';return''}
function analyzeCardText(){
 const raw=cardRawText?.value||cardReaderState.rawText||'',text=normalizeCardText(raw);cardReaderState.rawText=raw;const found=[];
 CARD_VACCINES.forEach(v=>{v.aliases.forEach(a=>{let pos=0;const alias=normalizeCardText(a);while((pos=text.indexOf(alias,pos))>=0){const date=parseDateNear(text,pos),lot=parseLotNear(text,pos),dose=parseDoseNear(text,pos);const key=v.name+'|'+date+'|'+dose; if(!found.some(x=>x.key===key))found.push({key,vaccine:v.name,date,dose,lot,confidence:date?85:55,selected:true});pos+=alias.length}})});
 cardReaderState.rows=found.sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));renderCardResults();cardLog(found.length?`${found.length} posible(s) aplicación(es) encontrada(s)`:'No se localizaron vacunas conocidas. Puedes corregir el texto OCR y analizar de nuevo.')
}
function renderCardResults(){const box=cardResults,rows=cardReaderState.rows;if(!rows.length){box.innerHTML='<h3>Vacunas encontradas</h3><p class="muted">No se detectaron aplicaciones. Mejora la imagen o corrige el texto reconocido.</p>';return}box.innerHTML=`<h3>Vacunas encontradas</h3><div class="notice">Revisa cada fila contra la cartilla original. Las aplicaciones importadas como antecedente no descuentan inventario.</div><div class="tablewrap section"><table class="table"><tr><th>Importar</th><th>Vacuna</th><th>Dosis</th><th>Fecha</th><th>Lote</th><th>Confianza</th></tr>${rows.map((r,i)=>`<tr><td><input type="checkbox" ${r.selected?'checked':''} onchange="cardReaderState.rows[${i}].selected=this.checked"></td><td><input value="${esc(r.vaccine)}" onchange="cardReaderState.rows[${i}].vaccine=this.value"></td><td><select onchange="cardReaderState.rows[${i}].dose=this.value"><option value="">No identificada</option>${['Única','Primera','Segunda','Tercera','Refuerzo','Dosis adicional'].map(x=>`<option ${r.dose===x?'selected':''}>${x}</option>`).join('')}</select></td><td><input type="date" value="${r.date||''}" onchange="cardReaderState.rows[${i}].date=this.value"></td><td><input value="${esc(r.lot||'')}" onchange="cardReaderState.rows[${i}].lot=this.value"></td><td>${r.confidence}%</td></tr>`).join('')}</table></div><div class="row"><button class="btn primary" onclick="importCardRows()">Importar seleccionadas al expediente</button><button class="btn secondary" onclick="exportCardReviewCSV()">Exportar revisión CSV</button></div><p id="cardImportMsg"></p>`}
function importCardRows(){const p=data.patients.find(x=>x.id==cardPatient.value);if(!p){cardImportMsg.textContent='Selecciona el paciente antes de importar.';return}const rows=cardReaderState.rows.filter(x=>x.selected);if(!rows.length){cardImportMsg.textContent='Selecciona al menos una fila.';return}let added=0,skipped=0;rows.forEach((r,i)=>{if(!r.vaccine||!r.date){skipped++;return}const dup=data.vaccinations.some(x=>x.patientId===p.id&&normalizeCardText(x.vaccine)===normalizeCardText(r.vaccine)&&x.date===r.date&&(x.dose||'')===(r.dose||''));if(dup){skipped++;return}data.vaccinations.push({id:Date.now()+i,patientId:p.id,patient:full(p),vaccine:r.vaccine,dose:r.dose||'No identificada',lot:r.lot||'No legible',date:r.date,route:'No registrada',site:'No registrado',vaccinator:'Importado desde cartilla',nextDate:'',obs:'Antecedente importado mediante lector inteligente de cartilla. Verificado visualmente por el usuario.',source:'cartilla-ocr'});added++});save();cardImportMsg.innerHTML=`<span class="success">${added} aplicación(es) importada(s). ${skipped} omitida(s) por datos incompletos o duplicados.</span>`;cardLog('Importación completada: '+added+' agregadas, '+skipped+' omitidas')}
function exportCardReviewCSV(){const p=data.patients.find(x=>x.id==cardPatient.value);downloadCSV('revision_cartilla_'+isoToday()+'.csv',[['Paciente','Vacuna','Dosis','Fecha','Lote','Confianza'],...cardReaderState.rows.map(r=>[p?full(p):'',r.vaccine,r.dose,r.date,r.lot,r.confidence])])}


/* v1.4.2 · Lectura avanzada de fechas manuscritas en cartillas */
const CARD_MONTHS={ENE:1,ENERO:1,FEB:2,FEBRERO:2,MAR:3,MARZO:3,ABR:4,ABRIL:4,MAY:5,MAYO:5,JUN:6,JUNIO:6,JUL:7,JULIO:7,AGO:8,AGOSTO:8,SEP:9,SEPT:9,SEPTIEMBRE:9,OCT:10,OCTUBRE:10,NOV:11,NOVIEMBRE:11,DIC:12,DICIEMBRE:12};
function normalizeDateOCR(t){return String(t||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[|!]/g,'1').replace(/[Oo]/g,'0').replace(/[Ss](?=\d)/g,'5').replace(/[—–_]/g,'-').replace(/\s+/g,' ').trim()}
function validYMD(y,m,d){const now=new Date().getFullYear();if(y<1990||y>now||m<1||m>12||d<1||d>31)return'';const dt=new Date(y,m-1,d);if(dt.getFullYear()!=y||dt.getMonth()!=m-1||dt.getDate()!=d)return'';return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
function extractDatesAdvanced(text){const t=normalizeDateOCR(text),out=[];let m;
 const add=(date,index,raw,score=80)=>{if(date&&!out.some(x=>x.date===date&&Math.abs(x.index-index)<8))out.push({date,index,raw,score})};
 const numeric=/\b(\d{1,2})\s*[\/\.\-]\s*(\d{1,2})\s*[\/\.\-]\s*(\d{2,4})\b/g;
 while((m=numeric.exec(t))){let y=+m[3];if(y<100)y+=y>=40?1900:2000;add(validYMD(y,+m[2],+m[1]),m.index,m[0],92)}
 const alpha=/\b(\d{1,2})\s*[\/\.\- ]\s*(ENE(?:RO)?|FEB(?:RERO)?|MAR(?:ZO)?|ABR(?:IL)?|MAY(?:O)?|JUN(?:IO)?|JUL(?:IO)?|AGO(?:STO)?|SEP(?:T(?:IEMBRE)?)?|OCT(?:UBRE)?|NOV(?:IEMBRE)?|DIC(?:IEMBRE)?)\s*[\/\.\- ]\s*(\d{2,4})\b/g;
 while((m=alpha.exec(t))){let y=+m[3];if(y<100)y+=y>=40?1900:2000;add(validYMD(y,CARD_MONTHS[m[2]],+m[1]),m.index,m[0],95)}
 const compact=/\b(\d{2})(\d{2})(\d{2,4})\b/g;
 while((m=compact.exec(t))){let y=+m[3];if(y<100)y+=y>=40?1900:2000;const d=validYMD(y,+m[2],+m[1]);if(d)add(d,m.index,m[0],65)}
 return out.sort((a,b)=>a.index-b.index)
}
function canvasCrop(source,x,y,w,h,scale=2){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*scale));c.height=Math.max(1,Math.round(h*scale));const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.imageSmoothingEnabled=true;g.drawImage(source,x,y,w,h,0,0,c.width,c.height);const im=g.getImageData(0,0,c.width,c.height),d=im.data;for(let i=0;i<d.length;i+=4){let v=.299*d[i]+.587*d[i+1]+.114*d[i+2];v=v>205?255:v<75?0:Math.max(0,Math.min(255,(v-128)*1.9+128));d[i]=d[i+1]=d[i+2]=v}g.putImageData(im,0,0);return c}
async function recognizeCardRegion(worker,canvas,label,params={}){cardLog('Leyendo '+label+'…');try{if(worker.setParameters)await worker.setParameters(params);const r=await worker.recognize(canvas);cardLog(label+': '+Math.round(r.data.confidence||0)+'% de confianza');return r.data.text||''}catch(e){cardLog(label+' falló: '+(e.message||e));return''}}
async function runCardOCR(){
 if(!cardReaderState.file){cardStatus.textContent='Selecciona una imagen o PDF.';return}
 if(typeof Tesseract==='undefined'){cardStatus.textContent='No se cargó el motor OCR. Revisa la conexión a internet.';cardLog('Tesseract.js no disponible');return}
 cardReadBtn.disabled=true;cardProgress.style.width='2%';cardReaderState.logs=[];cardLog('Iniciando lectura avanzada en varias zonas');let w=null;
 try{
  w=await Tesseract.createWorker('spa',1,{workerPath:OCR_CDN.workerPath,corePath:OCR_CDN.corePath,langPath:OCR_CDN.langPath,logger:m=>{const pct=Math.round((m.progress||0)*100);cardProgress.style.width=Math.max(2,pct)+'%';cardStatus.textContent=(m.status||'Procesando')+' · '+pct+'%'}});
  const c=cardCanvas,W=c.width,H=c.height;
  const full=await recognizeCardRegion(w,c,'página completa',{tessedit_pageseg_mode:'11',preserve_interword_spaces:'1'});
  const left=canvasCrop(c,0,0,W*.52,H,2.2), right=canvasCrop(c,W*.46,0,W*.54,H,2.2);
  const datesLeft=await recognizeCardRegion(w,left,'fechas de página izquierda',{tessedit_pageseg_mode:'11',tessedit_char_whitelist:'0123456789/- .ABCDEFGHIJKLMNOPQRSTUVWXYZ'});
  const datesRight=await recognizeCardRegion(w,right,'fechas de página derecha',{tessedit_pageseg_mode:'11',tessedit_char_whitelist:'0123456789/- .ABCDEFGHIJKLMNOPQRSTUVWXYZ'});
  cardReaderState.rawText=[full,'\n--- FECHAS IZQUIERDA ---\n',datesLeft,'\n--- FECHAS DERECHA ---\n',datesRight].join('\n');
  cardRawText.value=cardReaderState.rawText;cardReaderState.zoneTexts={full,datesLeft,datesRight};
  cardLog('Lectura en tres pasadas terminada');analyzeCardText();cardStatus.textContent='Lectura terminada. Revisa las fechas detectadas antes de importar.';
 }catch(e){cardStatus.textContent='OCR falló: '+(e.message||e);cardLog('Error OCR: '+(e.message||e))}finally{if(w)try{await w.terminate()}catch(e){}cardReadBtn.disabled=false}
}
function findNearestDate(dates,pos,maxDistance=180){let best=null;for(const d of dates){const dist=Math.abs(d.index-pos);if(dist<=maxDistance&&(!best||dist<best.dist))best={...d,dist}}return best}
function analyzeCardText(){
 const raw=cardRawText?.value||cardReaderState.rawText||'',text=normalizeCardText(raw),dates=extractDatesAdvanced(raw),found=[];
 cardReaderState.rawText=raw;
 CARD_VACCINES.forEach(v=>{v.aliases.forEach(a=>{let pos=0,alias=normalizeCardText(a);while((pos=text.indexOf(alias,pos))>=0){const near=findNearestDate(dates,pos,240),lot=parseLotNear(text,pos),dose=parseDoseNear(text,pos);const date=near?.date||'';const key=v.name+'|'+date+'|'+dose;if(!found.some(x=>x.key===key))found.push({key,vaccine:v.name,date,dose,lot,confidence:date?(near.score||85):52,selected:true,rawDate:near?.raw||''});pos+=Math.max(1,alias.length)}})});
 // Rows for dates not yet associated, so the user can assign the vaccine manually instead of losing them.
 dates.forEach((d,i)=>{if(!found.some(r=>r.date===d.date)){found.push({key:'FECHA|'+d.date+'|'+i,vaccine:'',date:d.date,dose:'',lot:'',confidence:d.score-15,selected:false,rawDate:d.raw})}});
 cardReaderState.rows=found.sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));renderCardResults();
 cardLog(dates.length+' fecha(s) candidata(s) detectada(s)');
 cardLog(found.length?`${found.length} fila(s) preparadas para revisión`:'No se localizaron vacunas ni fechas. Prueba recortar la foto para que la cartilla ocupe casi toda la imagen.')
}
function renderCardResults(){const box=cardResults,rows=cardReaderState.rows;if(!rows.length){box.innerHTML='<h3>Vacunas y fechas encontradas</h3><p class="muted">No se detectaron aplicaciones. Acerca la cámara, evita sombras y procura que la cartilla ocupe toda la foto.</p>';return}box.innerHTML=`<h3>Vacunas y fechas encontradas</h3><div class="notice">La escritura manual puede confundir al OCR. Ahora se muestran también fechas sueltas para que puedas asignarlas a una vacuna sin volver a capturarlas.</div><div class="tablewrap section"><table class="table"><tr><th>Importar</th><th>Vacuna</th><th>Dosis</th><th>Fecha</th><th>Texto leído</th><th>Lote</th><th>Confianza</th></tr>${rows.map((r,i)=>`<tr><td><input type="checkbox" ${r.selected?'checked':''} onchange="cardReaderState.rows[${i}].selected=this.checked"></td><td><input list="cardVaccines" value="${esc(r.vaccine)}" placeholder="Asignar vacuna" onchange="cardReaderState.rows[${i}].vaccine=this.value"><datalist id="cardVaccines">${CARD_VACCINES.map(v=>`<option value="${esc(v.name)}">`).join('')}</datalist></td><td><select onchange="cardReaderState.rows[${i}].dose=this.value"><option value="">No identificada</option>${['Única','Primera','Segunda','Tercera','Cuarta','Refuerzo','Revacunación','Dosis adicional'].map(x=>`<option ${r.dose===x?'selected':''}>${x}</option>`).join('')}</select></td><td><input type="date" value="${r.date||''}" onchange="cardReaderState.rows[${i}].date=this.value"></td><td><small>${esc(r.rawDate||'—')}</small></td><td><input value="${esc(r.lot||'')}" onchange="cardReaderState.rows[${i}].lot=this.value"></td><td>${Math.max(0,r.confidence||0)}%</td></tr>`).join('')}</table></div><div class="row"><button class="btn primary" onclick="importCardRows()">Importar seleccionadas al expediente</button><button class="btn secondary" onclick="exportCardReviewCSV()">Exportar revisión CSV</button></div><p id="cardImportMsg"></p>`}



/* =============================================================
   v1.4.3 · Concentrado mensual, cierre operativo y exportación
   ============================================================= */
if(!tabs.some(t=>t[0]==='monthlySummary')){
  const reportIndex=tabs.findIndex(t=>t[0]==='reports');
  tabs.splice(reportIndex<0?tabs.length:reportIndex,0,['monthlySummary','Concentrado mensual']);
}
function vatMonthKey(value){return String(value||'').slice(0,7)}
function vatCurrentMonth(){return new Date().toISOString().slice(0,7)}
function vatMonthLabel(month){if(!/^\d{4}-\d{2}$/.test(month))return month;const [y,m]=month.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('es-MX',{month:'long',year:'numeric'})}
function vatMonthlyData(month,vaccinator=''){
  const applications=data.vaccinations.filter(x=>vatMonthKey(x.date)===month&&(!vaccinator||String(x.vaccinator||'')===vaccinator));
  const appointments=data.appointments.filter(x=>vatMonthKey(x.date)===month);
  const patients=data.patients.filter(x=>vatMonthKey(x.createdAt||'')===month);
  const byVaccine={};const byDay={};const byVaccinator={};
  applications.forEach(x=>{
    const vac=x.vaccine||'Sin especificar',dose=x.dose||'No especificada',key=vac+'|||'+dose;
    byVaccine[key]=(byVaccine[key]||0)+1;
    byDay[x.date]=(byDay[x.date]||0)+1;
    const who=x.vaccinator||'No registrado';byVaccinator[who]=(byVaccinator[who]||0)+1;
  });
  const statuses={};appointments.forEach(x=>statuses[x.status||'Programada']=(statuses[x.status||'Programada']||0)+1);
  return{applications,appointments,patients,byVaccine,byDay,byVaccinator,statuses};
}
function monthlySummary(){
  if(!data.monthClosures)data.monthClosures=[];
  const vaccinators=[...new Set(data.vaccinations.map(x=>x.vaccinator).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  view.innerHTML=`<div class="card"><div class="row"><div class="field" style="min-width:210px"><label>Mes del concentrado</label><input id="msMonth" type="month" value="${vatCurrentMonth()}" onchange="renderMonthlySummary()"></div><div class="field" style="min-width:250px"><label>Vacunador</label><select id="msVaccinator" onchange="renderMonthlySummary()"><option value="">Todos</option>${vaccinators.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></div></div><div class="row no-print"><button class="btn primary" onclick="window.print()">Imprimir / PDF</button><button class="btn secondary" onclick="exportMonthlySummaryCSV()">Exportar CSV</button><button class="btn secondary" onclick="downloadMonthlyPackage()">Respaldo del mes</button><button class="btn secondary" onclick="closeOperationalMonth()">Cerrar mes</button></div><div id="msOutput"></div></div><div class="card section"><h3>Cierres mensuales guardados</h3><div id="msClosures"></div></div>`;
  renderMonthlySummary();renderMonthClosures();
}
function renderMonthlySummary(){
  const month=document.getElementById('msMonth')?.value||vatCurrentMonth(),vaccinator=document.getElementById('msVaccinator')?.value||'',m=vatMonthlyData(month,vaccinator),out=document.getElementById('msOutput');if(!out)return;
  const totalDoses=m.applications.length,uniquePatients=new Set(m.applications.map(x=>x.patientId||x.patient)).size;
  const low=data.inventory.filter(x=>Number(x.qty)<=5).length,expired=data.inventory.filter(x=>x.expiry&&x.expiry<isoToday()).length;
  const vaccineRows=Object.entries(m.byVaccine).sort((a,b)=>a[0].localeCompare(b[0],'es')).map(([k,n])=>{const [v,d]=k.split('|||');return`<tr><td>${esc(v)}</td><td>${esc(d)}</td><td>${n}</td></tr>`}).join('');
  const dayRows=Object.entries(m.byDay).sort((a,b)=>a[0].localeCompare(b[0])).map(([d,n])=>`<tr><td>${formatDateMX(d)}</td><td>${n}</td></tr>`).join('');
  const staffRows=Object.entries(m.byVaccinator).sort((a,b)=>b[1]-a[1]).map(([w,n])=>`<tr><td>${esc(w)}</td><td>${n}</td></tr>`).join('');
  out.innerHTML=`<h2>Concentrado de ${esc(vatMonthLabel(month))}</h2>${vaccinator?`<p><b>Vacunador:</b> ${esc(vaccinator)}</p>`:''}<div class="grid"><div class="card stat"><span>Dosis registradas</span><b>${totalDoses}</b></div><div class="card stat"><span>Pacientes atendidos</span><b>${uniquePatients}</b></div><div class="card stat"><span>Citas del mes</span><b>${m.appointments.length}</b></div><div class="card stat"><span>Nuevos pacientes</span><b>${m.patients.length}</b></div></div><div class="two section"><div><h3>Aplicaciones por biológico y dosis</h3><div class="tablewrap"><table class="table"><tr><th>Biológico</th><th>Dosis</th><th>Total</th></tr>${vaccineRows||'<tr><td colspan="3">Sin aplicaciones en el periodo.</td></tr>'}<tr><th colspan="2">TOTAL</th><th>${totalDoses}</th></tr></table></div></div><div><h3>Actividad diaria</h3><div class="tablewrap"><table class="table"><tr><th>Fecha</th><th>Aplicaciones</th></tr>${dayRows||'<tr><td colspan="2">Sin actividad registrada.</td></tr>'}</table></div></div></div><div class="two section"><div><h3>Aplicaciones por vacunador</h3><table class="table"><tr><th>Responsable</th><th>Total</th></tr>${staffRows||'<tr><td colspan="2">Sin responsables registrados.</td></tr>'}</table></div><div><h3>Resumen operativo</h3><table class="table"><tr><td>Citas programadas</td><td>${m.statuses['Programada']||0}</td></tr><tr><td>Citas atendidas</td><td>${m.statuses['Atendida']||0}</td></tr><tr><td>No asistió</td><td>${m.statuses['No asistió']||0}</td></tr><tr><td>Lotes con existencia baja</td><td>${low}</td></tr><tr><td>Lotes caducados</td><td>${expired}</td></tr></table></div></div><div class="notice section">Este concentrado se genera con los registros guardados en el sistema. Revisa las aplicaciones importadas desde cartillas y los datos incompletos antes del cierre mensual.</div>`;
}
function exportMonthlySummaryCSV(){
  const month=msMonth.value,vaccinator=msVaccinator.value,m=vatMonthlyData(month,vaccinator),rows=[['CONCENTRADO MENSUAL',vatMonthLabel(month)],['Vacunador',vaccinator||'Todos'],[],['RESUMEN'],['Dosis registradas',m.applications.length],['Pacientes atendidos',new Set(m.applications.map(x=>x.patientId||x.patient)).size],['Citas del mes',m.appointments.length],[],['APLICACIONES'],['Fecha','Paciente','CURP','Biológico','Dosis','Lote','Vacunador','Origen']];
  m.applications.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach(x=>{const p=data.patients.find(p=>p.id===x.patientId);rows.push([x.date,x.patient,p?.curp||'',x.vaccine,x.dose||'',x.lot||'',x.vaccinator||'',x.source||'aplicación local'])});
  rows.push([],['CITAS'],['Fecha','Paciente','Motivo','Estado']);m.appointments.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach(x=>rows.push([x.date,x.patient,x.reason||'',x.status||'Programada']));
  downloadCSV('concentrado_'+month+(vaccinator?'_'+vaccinator.replace(/\W+/g,'_'):'')+'.csv',rows)
}
function downloadMonthlyPackage(){
  const month=msMonth.value,m=vatMonthlyData(month,''),pack={app:'Vacunas a Tiempo',version:'1.4.7',month,generatedAt:new Date().toISOString(),applications:m.applications,appointments:m.appointments,patients:data.patients.filter(p=>m.applications.some(x=>x.patientId===p.id)||m.appointments.some(x=>x.patientId===p.id))};
  const blob=new Blob([JSON.stringify(pack,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='respaldo_mes_'+month+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
}
function closeOperationalMonth(){
  const month=msMonth.value,m=vatMonthlyData(month,'');if(!confirm(`Cerrar ${vatMonthLabel(month)} con ${m.applications.length} aplicaciones registradas? El cierre es una fotografía del momento y no bloquea correcciones posteriores.`))return;
  if(!data.monthClosures)data.monthClosures=[];const snapshot={id:Date.now(),month,closedAt:new Date().toISOString(),applications:m.applications.length,patients:new Set(m.applications.map(x=>x.patientId||x.patient)).size,appointments:m.appointments.length,checksum:qrChecksum(JSON.stringify(m.applications.map(x=>[x.id,x.date,x.vaccine,x.patientId])))};
  data.monthClosures=data.monthClosures.filter(x=>x.month!==month);data.monthClosures.push(snapshot);save();renderMonthClosures();alert('Cierre mensual guardado.')
}
function renderMonthClosures(){const box=document.getElementById('msClosures');if(!box)return;const a=(data.monthClosures||[]).slice().sort((x,y)=>y.month.localeCompare(x.month));box.innerHTML=a.length?`<div class="tablewrap"><table class="table"><tr><th>Mes</th><th>Fecha de cierre</th><th>Aplicaciones</th><th>Pacientes</th><th>Citas</th><th>Control</th></tr>${a.map(x=>`<tr><td>${esc(vatMonthLabel(x.month))}</td><td>${new Date(x.closedAt).toLocaleString('es-MX')}</td><td>${x.applications}</td><td>${x.patients}</td><td>${x.appointments}</td><td><code>${esc(x.checksum)}</code></td></tr>`).join('')}</table></div>`:'<p class="muted">Aún no hay cierres mensuales guardados.</p>'}
const dashboardV143Base=dashboard;dashboard=function(){dashboardV143Base();const month=vatCurrentMonth(),n=data.vaccinations.filter(x=>vatMonthKey(x.date)===month).length,grid=document.querySelector('#view .grid');if(grid)grid.insertAdjacentHTML('beforeend',`<div class="card stat"><span>Aplicaciones del mes</span><b>${n}</b><button class="btn secondary" style="margin-top:8px" onclick="quick('monthlySummary')">Ver concentrado</button></div>`)};


/* =============================================================
   v1.4.6 · Menú lateral desplazable y navegación accesible
   ============================================================= */
if(!tabs.some(t=>t[0]==='nominalCensus')){
  const patientIndex=tabs.findIndex(t=>t[0]==='patients');
  tabs.splice(patientIndex<0?1:patientIndex+1,0,['nominalCensus','Censo nominal']);
}
function vatAgeParts(birth){
  if(!birth)return{years:null,months:null,days:null,label:'Sin fecha'};
  const b=new Date(birth+'T12:00:00'),n=new Date();if(isNaN(b)||b>n)return{years:null,months:null,days:null,label:'Fecha inválida'};
  let years=n.getFullYear()-b.getFullYear(),months=n.getMonth()-b.getMonth(),days=n.getDate()-b.getDate();
  if(days<0){months--;days+=new Date(n.getFullYear(),n.getMonth(),0).getDate()}if(months<0){years--;months+=12}
  const totalMonths=years*12+months;
  return{years,months:totalMonths,days,label:years<2?`${totalMonths} meses`:`${years} años`};
}
function vatAgeGroup(p){const a=vatAgeParts(p.birth);if(a.months===null)return'Sin fecha';if(a.months<12)return'Menor de 1 año';if(a.months<24)return'1 año';if(a.months<60)return'2 a 4 años';if(a.months<120)return'5 a 9 años';if(a.months<216)return'10 a 17 años';return'18 años o más'}
function vatPatientApps(p){return data.vaccinations.filter(x=>x.patientId===p.id||(!x.patientId&&x.patient===full(p))).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))}
function vatNextAppointment(p){return data.appointments.filter(x=>(x.patientId===p.id||x.patient===full(p))&&x.date>=isoToday()&&(x.status||'Programada')==='Programada').sort((a,b)=>a.date.localeCompare(b.date))[0]||null}
function vatCensusStatus(p){const apps=vatPatientApps(p),last=apps[0],next=vatNextAppointment(p),missing=[];if(!p.curp)missing.push('CURP');if(!p.birth)missing.push('fecha de nacimiento');if(!p.phone)missing.push('teléfono');if(!p.tutor)missing.push('tutor');if(missing.length)return{key:'incomplete',label:'Datos incompletos',detail:missing.join(', '),cls:'danger'};if(!apps.length)return{key:'noapps',label:'Sin aplicaciones',detail:'No hay antecedentes registrados',cls:'warn'};if(next)return{key:'scheduled',label:'Con cita',detail:formatDateMX(next.date),cls:''};const days=last?.date?Math.floor((new Date(isoToday())-new Date(last.date+'T12:00:00'))/86400000):9999;if(days>180)return{key:'review',label:'Revisar seguimiento',detail:`${days} días desde la última aplicación`,cls:'warn'};return{key:'active',label:'Registro activo',detail:last?`Última: ${formatDateMX(last.date)}`:'',cls:''}}
function vatCensusRows(){
  const q=(document.getElementById('cnSearch')?.value||'').trim().toLowerCase(),group=document.getElementById('cnAge')?.value||'',status=document.getElementById('cnStatus')?.value||'';
  return data.patients.map(p=>({p,age:vatAgeParts(p.birth),group:vatAgeGroup(p),apps:vatPatientApps(p),next:vatNextAppointment(p),status:vatCensusStatus(p)})).filter(r=>{
    const hay=[full(r.p),r.p.curp,r.p.tutor,r.p.phone].join(' ').toLowerCase();return(!q||hay.includes(q))&&(!group||r.group===group)&&(!status||r.status.key===status)
  }).sort((a,b)=>full(a.p).localeCompare(full(b.p),'es'));
}
function nominalCensus(){
  view.innerHTML=`<div class="card"><h3>Censo nominal de pacientes</h3><p class="muted">Consulta, depura y exporta el padrón registrado. Este módulo muestra calidad de datos y seguimiento; no sustituye la valoración del esquema por edad.</p><div class="toolbar no-print"><input id="cnSearch" placeholder="Buscar nombre, CURP, tutor o teléfono" oninput="renderNominalCensus()" style="min-width:300px;padding:10px;border:1px solid #cfd7d3;border-radius:10px"><select id="cnAge" onchange="renderNominalCensus()" style="padding:10px;border:1px solid #cfd7d3;border-radius:10px"><option value="">Todas las edades</option>${['Menor de 1 año','1 año','2 a 4 años','5 a 9 años','10 a 17 años','18 años o más','Sin fecha'].map(x=>`<option>${x}</option>`).join('')}</select><select id="cnStatus" onchange="renderNominalCensus()" style="padding:10px;border:1px solid #cfd7d3;border-radius:10px"><option value="">Todos los estados</option><option value="incomplete">Datos incompletos</option><option value="noapps">Sin aplicaciones</option><option value="scheduled">Con cita</option><option value="review">Revisar seguimiento</option><option value="active">Registro activo</option></select><button class="btn secondary" onclick="exportNominalCensusCSV()">Exportar CSV</button><button class="btn secondary" onclick="window.print()">Imprimir / PDF</button></div><div id="cnSummary"></div><div id="cnTable"></div></div>`;renderNominalCensus()
}
function renderNominalCensus(){
  const rows=vatCensusRows(),all=data.patients.map(p=>vatCensusStatus(p)),counts={incomplete:0,noapps:0,scheduled:0,review:0,active:0};all.forEach(x=>counts[x.key]=(counts[x.key]||0)+1);
  cnSummary.innerHTML=`<div class="grid section"><div class="card stat"><span>Pacientes mostrados</span><b>${rows.length}</b></div><div class="card stat"><span>Datos incompletos</span><b>${counts.incomplete}</b></div><div class="card stat"><span>Sin aplicaciones</span><b>${counts.noapps}</b></div><div class="card stat"><span>Revisar seguimiento</span><b>${counts.review}</b></div></div>`;
  cnTable.innerHTML=`<div class="tablewrap section"><table class="table"><tr><th>Paciente</th><th>CURP</th><th>Edad</th><th>Grupo</th><th>Aplicaciones</th><th>Última aplicación</th><th>Próxima cita</th><th>Estado</th><th class="no-print">Acciones</th></tr>${rows.map(r=>{const last=r.apps[0];return`<tr><td><b>${esc(full(r.p))}</b><br><small>${esc(r.p.tutor||'Tutor no registrado')}</small></td><td>${esc(r.p.curp||'—')}</td><td>${esc(r.age.label)}</td><td>${esc(r.group)}</td><td>${r.apps.length}</td><td>${last?formatDateMX(last.date):'—'}</td><td>${r.next?formatDateMX(r.next.date):'—'}</td><td><span class="badge ${r.status.cls}">${esc(r.status.label)}</span><br><small>${esc(r.status.detail)}</small></td><td class="no-print"><div class="row"><button class="btn secondary" onclick="patientRecord(${JSON.stringify(r.p.id)})">Expediente</button><button class="btn secondary" onclick="scheduleForPatient(${r.p.id})">Agendar</button>${r.p.phone?`<button class="btn secondary" onclick="openPatientWhatsApp(${r.p.id})">WhatsApp</button>`:''}</div></td></tr>`}).join('')||'<tr><td colspan="9">No hay pacientes que coincidan con los filtros.</td></tr>'}</table></div>`
}
function exportNominalCensusCSV(){const rows=vatCensusRows(),csv=[['Nombre','CURP','Fecha de nacimiento','Edad','Grupo de edad','Tutor','Teléfono','Aplicaciones','Última aplicación','Próxima cita','Estado','Detalle']];rows.forEach(r=>csv.push([full(r.p),r.p.curp||'',r.p.birth||'',r.age.label,r.group,r.p.tutor||'',r.p.phone||'',r.apps.length,r.apps[0]?.date||'',r.next?.date||'',r.status.label,r.status.detail]));downloadCSV('censo_nominal_'+isoToday()+'.csv',csv)}
const dashboardV144Base=dashboard;dashboard=function(){dashboardV144Base();const incomplete=data.patients.filter(p=>vatCensusStatus(p).key==='incomplete').length,grid=document.querySelector('#view .grid');if(grid)grid.insertAdjacentHTML('beforeend',`<div class="card stat"><span>Expedientes incompletos</span><b>${incomplete}</b><button class="btn secondary" style="margin-top:8px" onclick="quick('nominalCensus')">Abrir censo</button></div>`)};


/* =============================================================
   v1.4.7 · Centro de alertas y búsqueda universal
   ============================================================= */
if(!tabs.some(t=>t[0]==='alertCenter')){
  const reportIndex=tabs.findIndex(t=>t[0]==='reports');
  tabs.splice(reportIndex<0?tabs.length:reportIndex,0,['alertCenter','Centro de alertas']);
}
function vatNormalizeText(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function vatPatientByRef(x){return data.patients.find(p=>p.id===x.patientId)||data.patients.find(p=>full(p)===x.patient)||null}
function vatAlertData(){
  const today=isoToday(),plus90=new Date(today+'T12:00:00');plus90.setDate(plus90.getDate()+90);const limit=plus90.toISOString().slice(0,10);
  const incomplete=data.patients.filter(p=>vatCensusStatus(p).key==='incomplete');
  const noApps=data.patients.filter(p=>vatPatientApps(p).length===0);
  const overdue=data.appointments.filter(a=>a.date<today&&(a.status||'Programada')==='Programada').sort((a,b)=>a.date.localeCompare(b.date));
  const expired=data.inventory.filter(x=>x.expiry&&x.expiry<today).sort((a,b)=>a.expiry.localeCompare(b.expiry));
  const expiring=data.inventory.filter(x=>x.expiry&&x.expiry>=today&&x.expiry<=limit).sort((a,b)=>a.expiry.localeCompare(b.expiry));
  const low=data.inventory.filter(x=>Number(x.qty)<=5);
  const curpMap=new Map();data.patients.forEach(p=>{const c=(p.curp||'').trim().toUpperCase();if(c){if(!curpMap.has(c))curpMap.set(c,[]);curpMap.get(c).push(p)}});
  const duplicates=[...curpMap.entries()].filter(([,v])=>v.length>1);
  return{today,incomplete,noApps,overdue,expired,expiring,low,duplicates,total:incomplete.length+overdue.length+expired.length+low.length+duplicates.length};
}
function vatGoPatient(id){patientRecord(id)}
function vatGoAgenda(){quick('agenda')}
function vatGoInventory(){quick('inventory')}
function vatAlertSection(title,items,empty,renderer){return `<div class="card section"><h3>${title} <span class="badge">${items.length}</span></h3>${items.length?`<div class="alert-list">${items.slice(0,30).map(renderer).join('')}</div>`:`<p class="muted">${empty}</p>`}</div>`}
function alertCenter(){
  const a=vatAlertData();
  view.innerHTML=`<div class="grid"><div class="card stat ${a.total?'alert-card danger':'alert-card ok'}"><span>Alertas prioritarias</span><b>${a.total}</b></div><div class="card stat alert-card"><span>Citas vencidas</span><b>${a.overdue.length}</b></div><div class="card stat alert-card"><span>Inventario crítico</span><b>${new Set([...a.expired,...a.low].map(x=>x.id)).size}</b></div><div class="card stat alert-card"><span>Expedientes incompletos</span><b>${a.incomplete.length}</b></div></div>
  <div class="toolbar section"><button class="btn secondary" onclick="exportAlertsCSV()">Exportar alertas CSV</button><button class="btn secondary" onclick="window.print()">Imprimir / PDF</button><button class="btn primary" onclick="alertCenter()">Actualizar</button></div>
  ${vatAlertSection('Citas vencidas',a.overdue,'No hay citas vencidas.',x=>{const p=vatPatientByRef(x);return `<div class="alert-item"><div><strong>${esc(x.patient||p&&full(p)||'Paciente')}</strong><span class="muted mini">Cita: ${formatDateMX(x.date)} · ${esc(x.reason||'Vacunación')}</span></div><div class="row">${p?`<button class="btn secondary" onclick="vatGoPatient(${JSON.stringify(p.id)})">Expediente</button>`:''}<button class="btn primary" onclick="sendWhatsAppReminder(${x.id})">WhatsApp</button></div></div>`})}
  ${vatAlertSection('Lotes caducados',a.expired,'No hay lotes caducados.',x=>`<div class="alert-item"><div><strong>${esc(x.vaccine)} · ${esc(x.lot)}</strong><span class="muted mini">Caducó: ${formatDateMX(x.expiry)} · Existencia: ${x.qty}</span></div><button class="btn danger" onclick="vatGoInventory()">Revisar inventario</button></div>`)}
  ${vatAlertSection('Lotes próximos a caducar (90 días)',a.expiring,'No hay lotes próximos a caducar.',x=>`<div class="alert-item"><div><strong>${esc(x.vaccine)} · ${esc(x.lot)}</strong><span class="muted mini">Caducidad: ${formatDateMX(x.expiry)} · Existencia: ${x.qty}</span></div><button class="btn secondary" onclick="vatGoInventory()">Inventario</button></div>`)}
  ${vatAlertSection('Existencias bajas (5 o menos)',a.low,'No hay existencias bajas.',x=>`<div class="alert-item"><div><strong>${esc(x.vaccine)} · ${esc(x.lot)}</strong><span class="muted mini">Existencia actual: ${x.qty}</span></div><button class="btn secondary" onclick="vatGoInventory()">Ajustar</button></div>`)}
  ${vatAlertSection('Expedientes incompletos',a.incomplete,'No hay expedientes incompletos.',p=>{const st=vatCensusStatus(p);return `<div class="alert-item"><div><strong>${esc(full(p))}</strong><span class="muted mini">Falta: ${esc(st.detail)}</span></div><button class="btn secondary" onclick="vatGoPatient(${JSON.stringify(p.id)})">Completar expediente</button></div>`})}
  ${vatAlertSection('CURP duplicadas',a.duplicates,'No se detectaron CURP duplicadas.',x=>`<div class="alert-item"><div><strong>${esc(x[0])}</strong><span class="muted mini">${x[1].map(p=>esc(full(p))).join(' · ')}</span></div><div class="row">${x[1].map(p=>`<button class="btn secondary" onclick="vatGoPatient(${JSON.stringify(p.id)})">${esc(p.name||p.pat||'Ver')}</button>`).join('')}</div></div>`)}
  <div class="card section"><h3>Pacientes sin aplicaciones registradas <span class="badge">${a.noApps.length}</span></h3><p class="muted">Se muestran para revisión administrativa; puede tratarse de pacientes recién registrados.</p>${a.noApps.length?`<div class="tablewrap"><table class="table"><tr><th>Paciente</th><th>CURP</th><th>Teléfono</th><th>Acción</th></tr>${a.noApps.slice(0,50).map(p=>`<tr><td>${esc(full(p))}</td><td>${esc(p.curp||'—')}</td><td>${esc(p.phone||'—')}</td><td><button class="btn secondary" onclick="vatGoPatient(${JSON.stringify(p.id)})">Expediente</button></td></tr>`).join('')}</table></div>`:'<p class="muted">No hay registros.</p>'}</div>`;
}
function exportAlertsCSV(){const a=vatAlertData(),rows=[['Tipo','Paciente/Biológico','Detalle','Fecha']];a.overdue.forEach(x=>rows.push(['Cita vencida',x.patient||'',x.reason||'',x.date||'']));a.expired.forEach(x=>rows.push(['Lote caducado',x.vaccine||'',`Lote ${x.lot||''}; existencia ${x.qty}`,x.expiry||'']));a.expiring.forEach(x=>rows.push(['Próximo a caducar',x.vaccine||'',`Lote ${x.lot||''}; existencia ${x.qty}`,x.expiry||'']));a.low.forEach(x=>rows.push(['Inventario bajo',x.vaccine||'',`Lote ${x.lot||''}; existencia ${x.qty}`,x.expiry||'']));a.incomplete.forEach(p=>rows.push(['Expediente incompleto',full(p),vatCensusStatus(p).detail,p.birth||'']));a.duplicates.forEach(([c,ps])=>rows.push(['CURP duplicada',ps.map(full).join(' / '),c,'']));downloadCSV('centro_alertas_'+a.today+'.csv',rows)}
function vatUniversalResults(q){const n=vatNormalizeText(q);if(!n)return[];const r=[];data.patients.forEach(p=>{const hay=vatNormalizeText([full(p),p.curp,p.tutor,p.phone,p.folio].join(' '));if(hay.includes(n))r.push({type:'Paciente',title:full(p),detail:[p.curp,p.tutor,p.phone].filter(Boolean).join(' · '),action:`vatGoPatient(${JSON.stringify(p.id)})`})});data.inventory.forEach(x=>{const hay=vatNormalizeText([x.vaccine,x.lot,x.expiry].join(' '));if(hay.includes(n))r.push({type:'Inventario',title:`${x.vaccine} · ${x.lot}`,detail:`Existencia ${x.qty} · Caducidad ${formatDateMX(x.expiry)}`,action:'vatGoInventory()'})});data.appointments.forEach(x=>{const hay=vatNormalizeText([x.patient,x.reason,x.date,x.status].join(' '));if(hay.includes(n))r.push({type:'Cita',title:x.patient||'Paciente',detail:`${formatDateMX(x.date)} · ${x.reason||'Vacunación'} · ${x.status||'Programada'}`,action:'vatGoAgenda()'})});return r.slice(0,50)}
function vatRenderUniversalSearch(){const box=document.getElementById('vatSearchResults'),q=document.getElementById('vatGlobalSearch')?.value||'';if(!box)return;const rows=vatUniversalResults(q);box.innerHTML=!q.trim()?'<p class="muted">Escribe un nombre, CURP, teléfono, tutor, lote, biológico o fecha de cita.</p>':rows.length?rows.map(x=>`<div class="search-result"><div class="row" style="justify-content:space-between"><div><span class="badge">${esc(x.type)}</span><strong style="display:block;margin-top:6px">${esc(x.title)}</strong><span class="muted mini">${esc(x.detail)}</span></div><button class="btn secondary nowrap" onclick="${x.action}">Abrir</button></div></div>`).join(''):'<p class="muted">No se encontraron coincidencias.</p>'}
function universalSearch(){view.innerHTML=`<div class="card"><h3>Búsqueda universal</h3><div class="vat-searchbar"><input id="vatGlobalSearch" placeholder="Nombre, CURP, teléfono, tutor, lote, biológico..." oninput="vatRenderUniversalSearch()" autofocus><button class="btn primary" onclick="vatRenderUniversalSearch()">Buscar</button></div><div id="vatSearchResults" class="search-results"><p class="muted">Escribe un criterio para buscar en pacientes, inventario y agenda.</p></div></div>`;setTimeout(()=>document.getElementById('vatGlobalSearch')?.focus(),50)}
if(!tabs.some(t=>t[0]==='universalSearch'))tabs.splice(1,0,['universalSearch','Búsqueda universal']);
const dashboardV147Base=dashboard;dashboard=function(){dashboardV147Base();const a=vatAlertData(),grid=document.querySelector('#view .grid');if(grid)grid.insertAdjacentHTML('beforeend',`<div class="card stat"><span>Alertas prioritarias</span><b>${a.total}</b><button class="btn ${a.total?'danger':'secondary'}" style="margin-top:8px" onclick="quick('alertCenter')">Abrir alertas</button></div>`);const root=document.getElementById('view');if(root)root.insertAdjacentHTML('afterbegin',`<div class="vat-searchbar no-print"><input placeholder="Buscar paciente, CURP, teléfono, lote o cita" onkeydown="if(event.key==='Enter'){sessionStorage.setItem('vat_search_query',this.value);quick('universalSearch');setTimeout(()=>{const i=document.getElementById('vatGlobalSearch');if(i){i.value=sessionStorage.getItem('vat_search_query')||'';vatRenderUniversalSearch()}},50)}"><button class="btn secondary" onclick="quick('universalSearch')">Búsqueda universal</button></div>`)};


/* =============================================================
   v1.5.3 - Motor Clínico de Vacunación 2026
   Base operativa configurable; no sustituye valoración clínica.
   ============================================================= */
const VAT_ENGINE_VERSION='2026.4';
const VAT_ENGINE_RULES=[
 {id:'bcg_1',vaccine:'BCG',aliases:['bcg'],dose:'Única',dueMonths:0,minMonths:0,group:'Nacimiento',kind:'basic'},
 {id:'hb_1',vaccine:'Hepatitis B',aliases:['hepatitis b','anti hepatitis b','hb'],dose:'Única al nacimiento',dueMonths:0,minMonths:0,group:'Nacimiento',kind:'basic'},
 {id:'hex_1',vaccine:'Hexavalente',aliases:['hexavalente','hexavalente acelular','dp at vip hb hib','dpat vip hb hib'],dose:'1ª dosis',dueMonths:2,minMonths:1.5,group:'2 meses',kind:'basic'},
 {id:'rota_1',vaccine:'Rotavirus',aliases:['rotavirus','anti rotavirus','rv1'],dose:'1ª dosis',dueMonths:2,minMonths:1.5,maxAgeMonthsExclusive:8,maxAgeLabel:'7 meses 29 días',outsideAction:'No aplicar.',outsideReason:'La edad máxima permitida para recibir vacuna contra rotavirus es 7 meses 29 días.',group:'2 meses',kind:'basic'},
 {id:'neumo_1',vaccine:'Neumocócica conjugada',aliases:['neumococo','neumococica','neumocócica','pcv13','pcv20'],dose:'1ª dosis',dueMonths:2,minMonths:1.5,group:'2 meses',kind:'basic'},
 {id:'hex_2',vaccine:'Hexavalente',aliases:['hexavalente','hexavalente acelular','dp at vip hb hib','dpat vip hb hib'],dose:'2ª dosis',dueMonths:4,minMonths:3.5,group:'4 meses',kind:'basic'},
 {id:'rota_2',vaccine:'Rotavirus',aliases:['rotavirus','anti rotavirus','rv1'],dose:'2ª dosis',dueMonths:4,minMonths:3.5,maxAgeMonthsExclusive:8,maxAgeLabel:'7 meses 29 días',outsideAction:'No aplicar.',outsideReason:'La edad máxima permitida para recibir vacuna contra rotavirus es 7 meses 29 días.',group:'4 meses',kind:'basic'},
 {id:'neumo_2',vaccine:'Neumocócica conjugada',aliases:['neumococo','neumococica','neumocócica','pcv13','pcv20'],dose:'2ª dosis',dueMonths:4,minMonths:3.5,group:'4 meses',kind:'basic'},
 {id:'hex_3',vaccine:'Hexavalente',aliases:['hexavalente','hexavalente acelular','dp at vip hb hib','dpat vip hb hib'],dose:'3ª dosis',dueMonths:6,minMonths:5.5,group:'6 meses',kind:'basic'},
 {id:'flu_1',vaccine:'Influenza',aliases:['influenza','anti influenza'],dose:'1ª dosis del esquema primario',dueMonths:6,minMonths:6,group:'Desde 6 meses',kind:'seasonal'},
 {id:'covid_1',vaccine:'COVID-19',aliases:['covid','covid 19','sars cov 2'],dose:'1ª dosis del esquema primario',dueMonths:6,minMonths:6,group:'Desde 6 meses',kind:'seasonal'},
 {id:'flu_2',vaccine:'Influenza',aliases:['influenza','anti influenza'],dose:'2ª dosis (4 semanas después)',dueMonths:7,minMonths:6.9,group:'7 meses',kind:'seasonal'},
 {id:'covid_2',vaccine:'COVID-19',aliases:['covid','covid 19','sars cov 2'],dose:'2ª dosis (4 semanas después)',dueMonths:7,minMonths:6.9,group:'7 meses',kind:'seasonal'},
 {id:'neumo_3',vaccine:'Neumocócica conjugada',aliases:['neumococo','neumococica','neumocócica','pcv13','pcv20'],dose:'3ª dosis',dueMonths:12,minMonths:11,group:'12 meses',kind:'basic'},
 {id:'srp_1',vaccine:'SRP',aliases:['srp','triple viral'],dose:'1ª dosis',dueMonths:12,minMonths:11,group:'12 meses',kind:'basic'},
 {id:'hepa_1',vaccine:'Hepatitis A',aliases:['hepatitis a','anti hepatitis a'],dose:'Única',dueMonths:12,minMonths:12,group:'12 meses',kind:'basic'},
 {id:'vari_1',vaccine:'Varicela',aliases:['varicela','anti varicela'],dose:'Única',dueMonths:12,minMonths:12,group:'12 meses',kind:'special',note:'Estrategia especial para guarderías o centros de cuidado infantil.'},
 {id:'hex_r',vaccine:'Hexavalente',aliases:['hexavalente','hexavalente acelular','dp at vip hb hib','dpat vip hb hib'],dose:'Refuerzo',dueMonths:18,minMonths:17,group:'18 meses',kind:'basic'},
 {id:'srp_2',vaccine:'SRP',aliases:['srp','triple viral'],dose:'2ª dosis',dueMonths:18,minMonths:17,group:'18 meses',kind:'basic',bornFrom:'2020-07-01'},
 {id:'dpt_r',vaccine:'DPT',aliases:['dpt','triple bacteriana'],dose:'Refuerzo',dueMonths:48,minMonths:47,group:'4 años',kind:'basic'},
 {id:'srp_2_6',vaccine:'SRP',aliases:['srp','triple viral'],dose:'2ª dosis transitoria',dueMonths:72,minMonths:71,group:'6 años',kind:'transitional',bornBefore:'2020-07-01',note:'Estrategia transitoria durante 2026 para nacidos antes de julio de 2020.'}
];
function vatEngineNorm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
// Compatibilidad v1.6.4: alias requerido por la línea de tiempo y la cartilla inteligente.
function vatEngineNormalize(v){return vatEngineNorm(v)}
function vatEngineAge(birth,onDate=isoToday()){
 const b=new Date(birth+'T12:00:00'),d=new Date(onDate+'T12:00:00');if(!birth||isNaN(b)||d<b)return null;
 let years=d.getFullYear()-b.getFullYear(),months=d.getMonth()-b.getMonth(),days=d.getDate()-b.getDate();
 if(days<0){months--;const prev=new Date(d.getFullYear(),d.getMonth(),0);days+=prev.getDate()}
 if(months<0){years--;months+=12}
 const totalDays=Math.floor((d-b)/86400000),totalMonths=years*12+months+days/30.4375;
 return{years,months,days,totalDays,totalMonths,label:`${years?years+' año'+(years===1?'':'s')+' ':''}${months?months+' mes'+(months===1?'':'es')+' ':''}${days} día${days===1?'':'s'}`.trim()};
}
function vatRuleAppliesToBirth(rule,birth){if(rule.bornFrom&&birth<rule.bornFrom)return false;if(rule.bornBefore&&birth>=rule.bornBefore)return false;return true}
function vatEngineMatches(app,rule){const n=vatEngineNorm(app.vaccine);return rule.aliases.some(a=>n.includes(vatEngineNorm(a))||vatEngineNorm(a).includes(n))}
function vatEngineDoseNumber(app){const t=vatEngineNorm(app.dose);const m=t.match(/(^|\s)([1-9])(a|ra|da|dosis)?(\s|$)/);if(m)return Number(m[2]);if(/primera|1ra|1a/.test(t))return 1;if(/segunda|2da|2a/.test(t))return 2;if(/tercera|3ra|3a/.test(t))return 3;if(/refuerzo/.test(t))return 99;return null}
function vatEngineCompletion(rule,apps,rulesForVaccine){
 const matched=apps.filter(a=>vatEngineMatches(a,rule)&&a.date).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
 if(!matched.length)return{complete:false,application:null,matchMode:'none'};
 const explicit=matched.find(a=>{const dn=vatEngineDoseNumber(a);if(rule.dose.includes('1ª'))return dn===1;if(rule.dose.includes('2ª'))return dn===2;if(rule.dose.includes('3ª'))return dn===3;if(/refuerzo/i.test(rule.dose))return dn===99;if(/Única/i.test(rule.dose))return dn===null||dn===1;return false});
 if(explicit)return{complete:true,application:explicit,matchMode:'explicit'};
 const ordered=rulesForVaccine.filter(r=>r.vaccine===rule.vaccine).sort((a,b)=>a.dueMonths-b.dueMonths);
 const index=ordered.findIndex(r=>r.id===rule.id);
 return matched.length>index?{complete:true,application:matched[index]||matched[matched.length-1],matchMode:'sequence'}:{complete:false,application:null,matchMode:'none'};
}
function vatEngineCompleted(rule,apps,rulesForVaccine){return vatEngineCompletion(rule,apps,rulesForVaccine).complete}
function vatEngineAddMonths(dateText,months){
 const d=new Date(dateText+'T12:00:00');if(!dateText||isNaN(d))return null;
 const originalDay=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+months);const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(originalDay,last));return d;
}
function vatRuleOutsideAge(rule,birth,onDate){
 if(!rule.maxAgeMonthsExclusive)return false;
 const limit=vatEngineAddMonths(birth,rule.maxAgeMonthsExclusive),current=new Date(onDate+'T12:00:00');
 return !!limit&&!isNaN(current)&&current>=limit;
}
function vatEngineISODate(d){if(!d||isNaN(d))return'';return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function vatEngineDayDiff(fromText,toText){const a=new Date(fromText+'T12:00:00'),b=new Date(toText+'T12:00:00');if(isNaN(a)||isNaN(b))return null;return Math.round((b-a)/86400000)}
function vatEngineTiming(rule,birth,onDate){
 const target=vatEngineAddMonths(birth,rule.dueMonths),minimum=vatEngineAddMonths(birth,rule.minMonths??rule.dueMonths),maximum=rule.maxAgeMonthsExclusive?vatEngineAddMonths(birth,rule.maxAgeMonthsExclusive):null;
 const targetISO=vatEngineISODate(target),minimumISO=vatEngineISODate(minimum),maximumExclusiveISO=vatEngineISODate(maximum),daysToTarget=targetISO?vatEngineDayDiff(onDate,targetISO):null;
 let timingLabel='';
 if(daysToTarget===0)timingLabel='Fecha objetivo: hoy';
 else if(daysToTarget>0)timingLabel=`Faltan ${daysToTarget} día${daysToTarget===1?'':'s'}`;
 else if(daysToTarget<0)timingLabel=`${Math.abs(daysToTarget)} día${Math.abs(daysToTarget)===1?'':'s'} después de la fecha objetivo`;
 return{targetDate:targetISO,minimumDate:minimumISO,maximumExclusiveDate:maximumExclusiveISO,daysToTarget,timingLabel};
}
function vatEngineEvaluate(patient,onDate=isoToday()){
 const age=vatEngineAge(patient?.birth,onDate);if(!patient||!age)return{patient,age,items:[],counts:{complete:0,due:0,upcoming:0,future:0,special:0,outOfTime:0},level:'Sin datos',className:'future'};
 const apps=data.vaccinations.filter(v=>v.patientId===patient.id);
 const rules=VAT_ENGINE_RULES.filter(r=>vatRuleAppliesToBirth(r,patient.birth));
 const items=rules.map(rule=>{
  const completion=vatEngineCompletion(rule,apps,rules),complete=completion.complete,application=completion.application;
  const ageAtApplication=application?.date?vatEngineAge(patient.birth,application.date):null;
  let status='future',label='Más adelante',reason='',action='Programar según edad.';
  if(complete){status='complete';label='Registrada';action='Sin acción: dosis registrada.'}
  else if(vatRuleOutsideAge(rule,patient.birth,onDate)){
   status='out_of_time';label=`Fuera de tiempo · límite ${rule.maxAgeLabel||'de edad'}`;
   reason=rule.outsideReason||`Se rebasó la edad máxima permitida: ${rule.maxAgeLabel||'límite establecido'}.`;
   action=rule.outsideAction||'No aplicar.';
  }
  else if(age.totalMonths>=rule.dueMonths){status=rule.kind==='special'?'special':'due';label=rule.kind==='special'?'Revisar criterio especial':'Aplicar hoy / pendiente';action=rule.kind==='special'?'Confirmar criterio institucional.':'Revisar cartilla y aplicar si no existen contraindicaciones.'}
  else if(rule.dueMonths-age.totalMonths<=1){status='upcoming';label='Próxima';action='Programar próxima dosis.'}
  const timing=vatEngineTiming(rule,patient.birth,onDate);
  const daysToWindowClose=timing.maximumExclusiveDate?vatEngineDayDiff(onDate,timing.maximumExclusiveDate):null;
  return{...rule,...timing,status,label,reason,action,monthsToDue:rule.dueMonths-age.totalMonths,application,ageAtApplication,daysToWindowClose};
 });
 const counts={complete:items.filter(x=>x.status==='complete').length,due:items.filter(x=>x.status==='due').length,upcoming:items.filter(x=>x.status==='upcoming').length,future:items.filter(x=>x.status==='future').length,special:items.filter(x=>x.status==='special').length,outOfTime:items.filter(x=>x.status==='out_of_time').length};
 const applicable=items.filter(x=>x.status!=='future'||x.complete),progressTotal=items.filter(x=>x.status!=='future').length,progressPercent=progressTotal?Math.round((counts.complete/progressTotal)*100):0;
 const nextDose=items.filter(x=>['due','special','upcoming','future'].includes(x.status)).sort((a,b)=>(a.minimumDate||a.targetDate||'9999').localeCompare(b.minimumDate||b.targetDate||'9999'))[0]||null;
 const level=counts.due>=4?'Rezago importante':counts.due?'Pendiente':counts.upcoming?'Próxima dosis':'Al corriente';
 const className=counts.due>=4?'danger':counts.due||counts.upcoming?'warn':'';
 return{patient,age,items,counts,level,className,onDate,progressPercent,progressTotal,nextDose};
}
function vatEngineStatusBadge(item){const icon=item.status==='complete'?'✓':item.status==='due'?'!':item.status==='upcoming'?'⏳':item.status==='special'?'◇':item.status==='out_of_time'?'✕':'○';return `<span class="engine-status engine-${item.status}">${icon} ${esc(item.label)}</span>`}
function vaccineEngine(){
 view.innerHTML=`<div class="card"><div class="row" style="justify-content:space-between"><div><h2>🧠 Motor de Vacunación 2026</h2><p class="muted">Núcleo v${VAT_ENGINE_VERSION}: edad exacta, reglas por cohorte, dosis esperadas y semáforo.</p></div><span class="badge">Base 2026</span></div><div class="two"><div class="field"><label>Paciente</label><select id="enginePatient" onchange="vatRenderEngine()"><option value="">Seleccione</option>${data.patients.map(p=>`<option value="${p.id}">${esc(full(p))}</option>`).join('')}</select></div><div class="field"><label>Evaluar al día</label><input id="engineDate" type="date" value="${isoToday()}" onchange="vatRenderEngine()"></div></div><div class="notice"><b>Seguridad:</b> herramienta de apoyo. Antes de aplicar, confirma cartilla, antecedentes, contraindicaciones, disponibilidad, temporada y lineamientos institucionales vigentes.</div></div><div id="engineResult" class="section"><div class="card"><p class="muted">Selecciona un paciente para evaluar su esquema.</p></div></div><div class="card section"><details><summary><b>Ver reglas incluidas en el motor v1.6.2</b></summary><div class="tablewrap section"><table class="table"><tr><th>Edad objetivo</th><th>Biológico</th><th>Dosis</th><th>Edad máxima</th><th>Tipo</th></tr>${VAT_ENGINE_RULES.map(r=>`<tr><td>${esc(r.group)}</td><td>${esc(r.vaccine)}</td><td>${esc(r.dose)}</td><td>${esc(r.maxAgeLabel||'—')}</td><td>${esc(r.kind)}</td></tr>`).join('')}</table></div></details></div>`;
}
function vatRenderEngine(){
 const p=data.patients.find(x=>x.id==document.getElementById('enginePatient')?.value),date=document.getElementById('engineDate')?.value||isoToday(),box=document.getElementById('engineResult');if(!box)return;if(!p){box.innerHTML='<div class="card"><p class="muted">Selecciona un paciente.</p></div>';return}
 const e=vatEngineEvaluate(p,date),due=e.items.filter(x=>['due','special'].includes(x.status)),outside=e.items.filter(x=>x.status==='out_of_time'),next=e.items.filter(x=>x.status==='upcoming').sort((a,b)=>a.dueMonths-b.dueMonths),windowAlerts=e.items.filter(x=>x.daysToWindowClose>0&&x.daysToWindowClose<=30&&x.status!=='complete');
 const nextText=e.nextDose?`${e.nextDose.vaccine} · ${e.nextDose.dose}${e.nextDose.minimumDate?' desde '+formatDateMX(e.nextDose.minimumDate):''}`:'Sin siguiente dosis calculada';
 box.innerHTML=`<div class="card engine-summary ${e.className}"><div class="row" style="justify-content:space-between"><div><h3>${esc(full(p))}</h3><p><b>Edad exacta:</b> ${esc(e.age.label)} · <b>${e.age.totalDays} días</b> · <b>Estado:</b> ${esc(e.level)}</p></div><div class="row"><button class="btn secondary" onclick="vatExportEngine(${p.id},'${date}')">Exportar CSV</button><button class="btn primary" onclick="patientRecord(${JSON.stringify(p.id)})">Expediente</button></div></div><div class="engine-grid"><div class="engine-rule"><span class="muted">Avance evaluable</span><b style="font-size:28px;display:block">${e.progressPercent}%</b><div style="height:8px;background:#e5e7eb;border-radius:8px;overflow:hidden;margin-top:8px"><div style="height:100%;width:${Math.max(0,Math.min(100,e.progressPercent))}%;background:var(--g)"></div></div></div><div class="engine-rule"><span class="muted">Pendientes hoy</span><b style="font-size:28px;display:block">${e.counts.due}</b></div><div class="engine-rule"><span class="muted">Fuera de tiempo</span><b style="font-size:28px;display:block">${e.counts.outOfTime}</b></div></div><div class="notice section"><b>Siguiente dosis calculada:</b> ${esc(nextText)}</div>${windowAlerts.length?`<div class="notice section" style="border-left:4px solid var(--o)"><b>Ventana de oportunidad próxima a cerrar:</b><br>${windowAlerts.map(x=>`${esc(x.vaccine)} · ${esc(x.dose)}: ${x.daysToWindowClose} día(s)`).join('<br>')}</div>`:''}${outside.length?`<div class="notice section" style="border-left:4px solid var(--r)"><b>Fuera de tiempo:</b><br>${outside.map(x=>`<strong>${esc(x.vaccine)} · ${esc(x.dose)}</strong>: ${esc(x.reason)} <b>Acción:</b> ${esc(x.action)}`).join('<br>')}</div>`:''}${due.length?`<div class="notice section"><b>Revisión prioritaria:</b> ${due.filter(x=>x.status==='due').map(x=>`${esc(x.vaccine)} ${esc(x.dose)}`).join(' · ')||'Sin dosis básicas pendientes'}${due.some(x=>x.status==='special')?'<br><span class="mini">Hay reglas especiales que requieren confirmar criterio de aplicación.</span>':''}</div>`:''}${next.length?`<p class="section"><b>Próxima(s):</b> ${next.map(x=>`${esc(x.vaccine)} ${esc(x.dose)} (${esc(x.group)})`).join(' · ')}</p>`:''}</div><div class="card section"><h3>Evaluación por dosis</h3><div class="engine-timeline">${e.items.map(x=>`<div class="item"><b>${esc(x.group)}</b><div><strong>${esc(x.vaccine)} · ${esc(x.dose)}</strong>${x.application?`<div class="mini"><b>Aplicada:</b> ${esc(formatDateMX(x.application.date))}${x.ageAtApplication?` · <b>Edad al aplicar:</b> ${esc(x.ageAtApplication.label)}`:''}${x.application.lot?` · <b>Lote:</b> ${esc(x.application.lot)}`:''}</div>`:''}${x.targetDate?`<div class="mini"><b>Fecha objetivo:</b> ${esc(formatDateMX(x.targetDate))}${x.minimumDate&&x.minimumDate!==x.targetDate?` · <b>Desde:</b> ${esc(formatDateMX(x.minimumDate))}`:''}${x.maximumExclusiveDate?` · <b>Límite:</b> antes del ${esc(formatDateMX(x.maximumExclusiveDate))}`:''}</div>`:''}${x.daysToWindowClose>0&&x.daysToWindowClose<=30&&x.status!=='complete'?`<div class="mini"><b>Ventana:</b> quedan ${x.daysToWindowClose} día(s)</div>`:''}${x.timingLabel?`<div class="muted mini">${esc(x.timingLabel)}</div>`:''}${x.reason?`<div class="mini"><b>Motivo:</b> ${esc(x.reason)}</div>`:''}${x.action?`<div class="muted mini"><b>Acción:</b> ${esc(x.action)}</div>`:''}${x.note?`<div class="muted mini">${esc(x.note)}</div>`:''}</div>${vatEngineStatusBadge(x)}</div>`).join('')}</div></div>`;
}

function vatExportEngine(id,date){const p=data.patients.find(x=>x.id===id);if(!p)return;const e=vatEngineEvaluate(p,date),rows=[['Paciente','CURP','Edad evaluada','Fecha de evaluación'],[full(p),p.curp||'',e.age.label,date],[],['Grupo','Biológico','Dosis','Fecha aplicada','Edad al aplicar','Fecha mínima','Fecha objetivo','Límite exclusivo','Días respecto a objetivo','Estado','Motivo','Acción'],...e.items.map(x=>[x.group,x.vaccine,x.dose,x.application?.date||'',x.ageAtApplication?.label||'',x.minimumDate||'',x.targetDate||'',x.maximumExclusiveDate||'',x.daysToTarget??'',x.label,x.reason||'',x.action||''])];downloadCSV('motor_vacunacion_'+(p.curp||p.id)+'_'+date+'.csv',rows)}
if(!tabs.some(t=>t[0]==='vaccineEngine')){const i=tabs.findIndex(t=>t[0]==='vaccination');tabs.splice(i<0?2:i,0,['vaccineEngine','Motor de vacunación'])}
// Sustituye la sugerencia rudimentaria por la evaluación del motor.
suggestion=function(p){return vatEngineEvaluate(p).items.filter(x=>x.status==='due'&&x.kind!=='special').map(x=>x.vaccine+' '+x.dose)};
showSuggestion=function(){const p=data.patients.find(x=>x.id==document.getElementById('vPatient')?.value),box=document.getElementById('suggest');if(!box)return;if(!p){box.innerHTML='';return}const e=vatEngineEvaluate(p),due=e.items.filter(x=>x.status==='due');box.innerHTML=`<div class="notice"><b>Motor 2026 · ${esc(e.age.label)}</b><br>${due.length?due.map(x=>`<span class="badge danger">${esc(x.vaccine)} · ${esc(x.dose)}</span>`).join(' '):'<span class="badge">Sin pendientes básicos detectados</span>'}<br><small>Confirma siempre cartilla y lineamientos antes de aplicar.</small></div>`};
// Añade resumen del motor al expediente sin eliminar su contenido previo.
const vatPatientRecordV151Base=patientRecord;patientRecord=function(id){vatPatientRecordV151Base(id);const p=data.patients.find(x=>x.id===id);if(!p)return;const e=vatEngineEvaluate(p),root=document.getElementById('view')?.firstElementChild;if(root)root.insertAdjacentHTML('afterbegin',`<div class="notice" style="margin-bottom:16px"><b>🧠 Motor 2026:</b> ${esc(e.level)} · ${e.progressPercent}% de avance evaluable · ${e.counts.due} pendiente(s) · ${e.counts.outOfTime} fuera de tiempo · ${e.counts.upcoming} próxima(s) <button class="btn secondary" style="margin-left:8px" onclick="quick('vaccineEngine');setTimeout(()=>{const s=document.getElementById('enginePatient');if(s){s.value='${id}';vatRenderEngine()}},30)">Ver evaluación</button></div>`)};


/* =============================================================
   v1.5.5 · Motor de Calidad y Seguridad del Registro
   No modifica reglas clínicas. Revisa coherencia, trazabilidad y
   posibles errores de captura antes de que lleguen a reportes.
   ============================================================= */
const VAT_QUALITY_VERSION='1.6.2';
function vatQualityPatient(id){return data.patients.find(p=>String(p.id)===String(id))}
function vatQualityKey(v){return [String(v.patientId||''),String(v.vaccine||'').trim().toUpperCase(),String(v.dose||'').trim().toUpperCase(),String(v.date||'')].join('|')}
function vatQualityLot(v){return data.inventory.find(x=>String(x.lot||'').trim().toUpperCase()===String(v.lot||'').trim().toUpperCase()&&String(x.vaccine||'').trim().toUpperCase()===String(v.vaccine||'').trim().toUpperCase())}
function vatQualityScan(){
 const issues=[],today=isoToday(),patientIds=new Set(data.patients.map(p=>String(p.id))),seen=new Map();
 data.patients.forEach(p=>{
  if(!p.name||!p.birth)issues.push({severity:'high',type:'Paciente incompleto',patientId:p.id,date:'',detail:`${full(p)||'Paciente sin nombre'}: faltan nombre o fecha de nacimiento.`,action:'Abrir expediente y completar los datos obligatorios.'});
  if(p.birth&&p.birth>today)issues.push({severity:'critical',type:'Nacimiento futuro',patientId:p.id,date:p.birth,detail:`${full(p)} tiene una fecha de nacimiento posterior a hoy.`,action:'Corregir la fecha de nacimiento.'});
 });
 data.vaccinations.forEach((v,index)=>{
  const p=vatQualityPatient(v.patientId),key=vatQualityKey(v),lot=vatQualityLot(v);
  if(!patientIds.has(String(v.patientId)))issues.push({severity:'critical',type:'Aplicación sin paciente',patientId:v.patientId,date:v.date||'',detail:`${v.vaccine||'Vacuna'} ${v.dose||''} no está vinculada a un paciente existente.`,action:'Restaurar el paciente desde respaldo o corregir el vínculo.'});
  if(!v.date||!v.vaccine||!v.lot)issues.push({severity:'high',type:'Aplicación incompleta',patientId:v.patientId,date:v.date||'',detail:`Registro #${index+1}: faltan fecha, biológico o lote.`,action:'Revisar el expediente y completar el registro.'});
  if(v.date&&v.date>today)issues.push({severity:'critical',type:'Aplicación futura',patientId:v.patientId,date:v.date,detail:`${v.vaccine||'Vacuna'} aparece aplicada en una fecha futura.`,action:'Corregir la fecha de aplicación.'});
  if(p?.birth&&v.date&&v.date<p.birth)issues.push({severity:'critical',type:'Aplicación antes del nacimiento',patientId:v.patientId,date:v.date,detail:`${v.vaccine||'Vacuna'} ${v.dose||''} aparece antes de la fecha de nacimiento.`,action:'Corregir la fecha o el paciente asociado.'});
  if(seen.has(key))issues.push({severity:'high',type:'Posible duplicado',patientId:v.patientId,date:v.date||'',detail:`${v.vaccine||'Vacuna'} ${v.dose||''} está repetida para el mismo paciente y fecha.`,action:'Comparar ambos registros antes de corregir.'}); else seen.set(key,index);
  if(v.lot&&!lot)issues.push({severity:'medium',type:'Lote no localizado',patientId:v.patientId,date:v.date||'',detail:`El lote ${v.lot} de ${v.vaccine||'la vacuna'} no aparece en el inventario actual.`,action:'Confirmar si fue un antecedente externo o agregar el lote correcto.'});
  if(lot?.expiry&&v.date&&lot.expiry<v.date)issues.push({severity:'critical',type:'Lote caducado en la fecha registrada',patientId:v.patientId,date:v.date,detail:`El lote ${lot.lot} figura con caducidad ${formatDateMX(lot.expiry)} y aplicación ${formatDateMX(v.date)}.`,action:'Realizar revisión inmediata del registro y trazabilidad.'});
 });
 data.appointments.forEach(a=>{
  if(!patientIds.has(String(a.patientId)))issues.push({severity:'high',type:'Cita sin paciente',patientId:a.patientId,date:a.date||'',detail:`La cita de ${a.patient||'paciente desconocido'} no está vinculada a un paciente existente.`,action:'Corregir o cancelar la cita.'});
  if(!a.date||!a.reason)issues.push({severity:'medium',type:'Cita incompleta',patientId:a.patientId,date:a.date||'',detail:`La cita de ${a.patient||'paciente'} no tiene fecha o motivo completo.`,action:'Editar la cita.'});
 });
 data.inventory.forEach(x=>{
  if(Number(x.qty)<0)issues.push({severity:'critical',type:'Existencia negativa',patientId:'',date:x.expiry||'',detail:`${x.vaccine} · lote ${x.lot}: existencia ${x.qty}.`,action:'Revisar movimientos y realizar ajuste documentado.'});
  if(x.expiry&&x.expiry<today&&Number(x.qty)>0)issues.push({severity:'high',type:'Lote caducado con existencia',patientId:'',date:x.expiry,detail:`${x.vaccine} · lote ${x.lot}: ${x.qty} dosis aún registradas.`,action:'Separar del inventario utilizable y documentar la baja conforme al procedimiento local.'});
 });
 const rank={critical:0,high:1,medium:2,low:3};issues.sort((a,b)=>(rank[a.severity]-rank[b.severity])||String(a.date).localeCompare(String(b.date)));
 return issues;
}
function vatQualityLabel(s){return s==='critical'?'Crítica':s==='high'?'Alta':s==='medium'?'Media':'Baja'}
function vatQualityBadge(s){return `<span class="badge ${s==='critical'||s==='high'?'danger':s==='medium'?'warn':''}">${vatQualityLabel(s)}</span>`}
function qualityCenter(){
 const issues=vatQualityScan(),counts={critical:0,high:0,medium:0,low:0};issues.forEach(x=>counts[x.severity]++);
 view.innerHTML=`<div class="card"><div class="row" style="justify-content:space-between"><div><h2>🛡️ Calidad del registro</h2><p class="muted">Motor v${VAT_QUALITY_VERSION}. Detecta inconsistencias de captura y trazabilidad sin modificar datos automáticamente.</p></div><button class="btn secondary" onclick="vatExportQualityCSV()">Exportar revisión CSV</button></div><div class="notice"><b>Importante:</b> una alerta no confirma un error clínico. Debe compararse con cartilla, expediente, inventario y documentación original antes de corregir.</div></div>
 <div class="grid section"><div class="card stat"><span>Alertas críticas</span><b>${counts.critical}</b></div><div class="card stat"><span>Prioridad alta</span><b>${counts.high}</b></div><div class="card stat"><span>Prioridad media</span><b>${counts.medium}</b></div><div class="card stat"><span>Total a revisar</span><b>${issues.length}</b></div></div>
 <div class="card section"><div class="toolbar"><label>Filtrar prioridad <select id="qualityFilter" onchange="vatRenderQualityIssues()"><option value="">Todas</option><option value="critical">Crítica</option><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option></select></label><label>Buscar <input id="qualitySearch" placeholder="Paciente, lote o tipo" oninput="vatRenderQualityIssues()"></label></div><div id="qualityIssues"></div></div>`;
 vatRenderQualityIssues();
}
function vatRenderQualityIssues(){
 const sev=document.getElementById('qualityFilter')?.value||'',q=(document.getElementById('qualitySearch')?.value||'').trim().toLowerCase();
 const arr=vatQualityScan().filter(x=>(!sev||x.severity===sev)&&(!q||(x.type+' '+x.detail+' '+(vatQualityPatient(x.patientId)?full(vatQualityPatient(x.patientId)):'')).toLowerCase().includes(q))),box=document.getElementById('qualityIssues');if(!box)return;
 if(!arr.length){box.innerHTML='<div class="success">No se encontraron observaciones con el filtro seleccionado.</div>';return}
 box.innerHTML=`<div class="tablewrap"><table class="table"><tr><th>Prioridad</th><th>Tipo</th><th>Paciente / registro</th><th>Hallazgo</th><th>Acción sugerida</th><th>Revisar</th></tr>${arr.map(x=>{const p=vatQualityPatient(x.patientId);return `<tr><td>${vatQualityBadge(x.severity)}</td><td>${esc(x.type)}</td><td>${p?esc(full(p)):'—'}${x.date?`<br><small>${esc(formatDateMX(x.date))}</small>`:''}</td><td>${esc(x.detail)}</td><td>${esc(x.action)}</td><td>${p?`<button class="btn secondary" onclick="patientRecord(${JSON.stringify(p.id)})">Expediente</button>`:'<button class="btn secondary" onclick="quick(\'inventory\')">Inventario</button>'}</td></tr>`}).join('')}</table></div>`;
}
function vatExportQualityCSV(){const rows=[['Prioridad','Tipo','Paciente','Fecha','Hallazgo','Acción sugerida'],...vatQualityScan().map(x=>[vatQualityLabel(x.severity),x.type,vatQualityPatient(x.patientId)?full(vatQualityPatient(x.patientId)):'',x.date||'',x.detail,x.action])];downloadCSV('calidad_registro_'+isoToday()+'.csv',rows)}
if(!tabs.some(t=>t[0]==='qualityCenter')){const i=tabs.findIndex(t=>t[0]==='reports');tabs.splice(i<0?tabs.length:i,0,['qualityCenter','Calidad del registro'])}

/* =============================================================
   v1.6.0 · Expediente Inteligente y apoyo de recuperación
   Continúa sobre el motor clínico existente; no duplica reglas.
   ============================================================= */
const VAT_APP_VERSION='1.6.3';
function vatDaysText(n){n=Math.round(Number(n)||0);if(n===0)return 'hoy';return n>0?`en ${n} día(s)`:`hace ${Math.abs(n)} día(s)`}
function vatRecoveryPlan(patient,onDate=isoToday()){
 const e=vatEngineEvaluate(patient,onDate);
 const today=e.items.filter(x=>x.status==='due'&&x.kind!=='special');
 const review=e.items.filter(x=>x.status==='special');
 const wait=e.items.filter(x=>['upcoming','future'].includes(x.status)).sort((a,b)=>(a.minimumDate||a.targetDate||'9999').localeCompare(b.minimumDate||b.targetDate||'9999'));
 const excluded=e.items.filter(x=>x.status==='out_of_time');
 const window=e.items.filter(x=>x.status!=='complete'&&x.daysToWindowClose>0&&x.daysToWindowClose<=30);
 return{engine:e,today,review,wait,excluded,window};
}
function vatOpenVaccinationFor(id){quick('vaccination');setTimeout(()=>{const s=document.getElementById('vPatient');if(s){s.value=String(id);if(typeof showSuggestion==='function')showSuggestion()}},40)}
function vatScheduleSuggested(id,date,vaccine,dose){quick('agenda');setTimeout(()=>{const p=document.getElementById('aPatient'),d=document.getElementById('aDate'),r=document.getElementById('aReason');if(p)p.value=String(id);if(d)d.value=date||isoToday();if(r)r.value=`${vaccine||'Seguimiento de vacunación'}${dose?' · '+dose:''}`},40)}
function vatRecordStatusCard(title,value,detail,cls=''){
 return `<div class="smart-stat ${cls}"><span>${esc(title)}</span><b>${esc(String(value))}</b>${detail?`<small>${esc(detail)}</small>`:''}</div>`
}
function vatApplicationTimeline(patient,apps){
 if(!apps.length)return '<p class="muted">Sin vacunas registradas.</p>';
 const sorted=apps.slice().sort((a,b)=>a.date.localeCompare(b.date));
 const lastByVac={};
 return `<div class="smart-timeline">${sorted.map(x=>{
   const key=vatEngineNormalize(x.vaccine||'');
   const previous=lastByVac[key];
   const interval=previous?vatEngineDayDiff(previous.date,x.date):null;
   lastByVac[key]=x;
   const age=patient.birth&&x.date>=patient.birth?vatEngineAge(patient.birth,x.date):null;
   return `<div class="smart-time-item"><div class="smart-dot"></div><div><strong>${esc(x.vaccine||'Vacuna')} ${x.dose?`· ${esc(x.dose)}`:''}</strong><div class="mini">${esc(formatDateMX(x.date))}${age?` · Edad: ${esc(age.label)}`:''}${interval!==null?` · Intervalo desde dosis previa del mismo biológico: ${interval} día(s)`:''}</div><div class="muted mini">Lote: ${esc(x.lot||'No registrado')}${x.obs?` · ${esc(x.obs)}`:''}</div></div></div>`
 }).join('')}</div>`;
}
patientRecord=function(id){
 const p=data.patients.find(x=>x.id===id);if(!p)return;
 const apps=data.vaccinations.filter(x=>x.patientId===id);
 const cites=data.appointments.filter(x=>x.patientId===id).sort((a,b)=>b.date.localeCompare(a.date));
 const futureCites=cites.filter(x=>x.date>=isoToday()&&(x.status||'Programada')==='Programada').sort((a,b)=>a.date.localeCompare(b.date));
 const nextAppt=futureCites[0]||null;
 const plan=vatRecoveryPlan(p);
 const e=plan.engine,next=e.nextDose;
 const suggestedDate=next?.minimumDate||next?.targetDate||'';
 const apptDiff=nextAppt&&suggestedDate?vatEngineDayDiff(suggestedDate,nextAppt.date):null;
 const apptText=!nextAppt?'Sin cita futura':!suggestedDate?`${formatDateMX(nextAppt.date)} · ${nextAppt.reason||'Seguimiento'}`:apptDiff===0?`${formatDateMX(nextAppt.date)} · coincide con la fecha sugerida`:apptDiff>0?`${formatDateMX(nextAppt.date)} · ${apptDiff} día(s) después de la sugerida`:`${formatDateMX(nextAppt.date)} · ${Math.abs(apptDiff)} día(s) antes de la sugerida`;
 const statusClass=e.counts.due>=4?'danger':e.counts.due?'warn':'ok';
 view.innerHTML=`<div class="card smart-record">
 <div class="row no-print" style="justify-content:space-between"><div class="row"><button class="btn secondary" onclick="patients()">← Volver</button><button class="btn primary" onclick="editPatient(${id})">Editar datos</button><button class="btn primary" onclick="vatOpenVaccinationFor(${id})">Registrar vacuna</button><button class="btn secondary" onclick="scheduleForPatient(${id})">Agendar</button></div><div class="row"><button class="btn secondary" onclick="openPatientWhatsApp(${id})">WhatsApp</button><button class="btn secondary" onclick="printPatientRecord()">Imprimir</button></div></div>
 <div class="smart-head section"><div><span class="badge">Expediente inteligente v${VAT_APP_VERSION}</span><h2>${esc(full(p))}</h2><p class="muted">CURP: ${esc(p.curp||'No registrada')} · Nacimiento: ${formatDateMX(p.birth)} · Sexo: ${esc(p.sex||'No registrado')}</p></div><div class="smart-state ${statusClass}"><b>${esc(e.level)}</b><span>${e.progressPercent}% evaluable</span></div></div>
 <div class="smart-grid section">${vatRecordStatusCard('Edad exacta',e.age.label,`${e.age.totalDays} días`)}${vatRecordStatusCard('Aplicaciones',apps.length,'Registros en cartilla digital')}${vatRecordStatusCard('Pendientes hoy',e.counts.due,'Según reglas del motor',e.counts.due?'warn':'')}${vatRecordStatusCard('Fuera de tiempo',e.counts.outOfTime,'Requieren revisión',e.counts.outOfTime?'danger':'')}</div>
 <div class="progress-box section"><div class="row" style="justify-content:space-between"><b>Avance del esquema evaluable</b><strong>${e.progressPercent}%</strong></div><div class="progress-track"><span style="width:${Math.max(0,Math.min(100,e.progressPercent))}%"></span></div></div>
 <div class="two section"><div class="card inset"><h3>¿Qué hacer hoy?</h3>${plan.today.length?`<div class="action-list">${plan.today.map(x=>`<div class="action-row yes"><b>✓ ${esc(x.vaccine)} · ${esc(x.dose)}</b><span>${esc(x.reason||'Puede valorarse hoy.')}</span></div>`).join('')}</div>`:'<div class="success">No hay dosis básicas vencidas detectadas para hoy.</div>'}${plan.review.length?`<h4>Requiere criterio especial</h4>${plan.review.map(x=>`<div class="action-row review"><b>◇ ${esc(x.vaccine)} · ${esc(x.dose)}</b><span>${esc(x.reason||x.action||'Confirmar criterio clínico.')}</span></div>`).join('')}`:''}${plan.excluded.length?`<h4>No aplicar dentro del esquema regular</h4>${plan.excluded.map(x=>`<div class="action-row no"><b>✕ ${esc(x.vaccine)} · ${esc(x.dose)}</b><span>${esc(x.reason||'Fuera de ventana.')} ${esc(x.action||'')}</span></div>`).join('')}`:''}<div class="row section no-print"><button class="btn primary" onclick="vatOpenVaccinationFor(${id})">Ir a vacunación</button><button class="btn secondary" onclick="quick('vaccineEngine');setTimeout(()=>{const s=document.getElementById('enginePatient');if(s){s.value='${id}';vatRenderEngine()}},30)">Ver análisis completo</button></div></div>
 <div class="card inset"><h3>Siguiente paso</h3>${next?`<p><b>${esc(next.vaccine)} · ${esc(next.dose)}</b></p><p>Fecha sugerida: <b>${formatDateMX(suggestedDate)}</b> · ${vatDaysText(vatEngineDayDiff(isoToday(),suggestedDate))}</p><p class="muted">${esc(next.action||next.reason||'Seguimiento según esquema.')}</p><button class="btn primary no-print" onclick="vatScheduleSuggested(${id},'${suggestedDate}','${esc(next.vaccine)}','${esc(next.dose)}')">Agendar fecha sugerida</button>`:'<div class="success">Sin siguiente dosis pendiente calculada.</div>'}<hr><p><b>Cita registrada:</b><br>${esc(apptText)}</p>${plan.window.length?`<div class="notice"><b>Ventana próxima a cerrar</b><br>${plan.window.map(x=>`${esc(x.vaccine)} ${esc(x.dose)}: ${x.daysToWindowClose} día(s)`).join('<br>')}</div>`:''}</div></div>
 <div class="two section"><div class="card inset"><h3>Datos de contacto</h3><p><b>Tutor:</b> ${esc(p.guardian||'No registrado')}</p><p><b>Teléfono:</b> ${esc(p.phone||'No registrado')}</p></div><div class="card inset"><h3>Plan de recuperación</h3>${plan.wait.length?plan.wait.slice(0,6).map(x=>`<div class="recovery-line"><b>${esc(x.vaccine)} · ${esc(x.dose)}</b><span>${x.minimumDate?`Desde ${formatDateMX(x.minimumDate)}`:x.targetDate?`Objetivo ${formatDateMX(x.targetDate)}`:'Fecha por confirmar'}</span></div>`).join(''):'<p class="muted">Sin dosis futuras calculadas.</p>'}</div></div>
 <div class="card inset section"><h3>Línea de tiempo de aplicaciones</h3>${vatApplicationTimeline(p,apps)}</div>
 <div class="card inset section"><h3>Historial de citas</h3>${cites.length?`<div class="tablewrap"><table class="table"><tr><th>Fecha</th><th>Motivo</th><th>Estado</th></tr>${cites.map(x=>`<tr><td>${formatDateMX(x.date)}</td><td>${esc(x.reason||'')}</td><td>${appointmentStatusBadge(x.status)}</td></tr>`).join('')}</table></div>`:'<p class="muted">Sin citas.</p>'}</div>
 <div class="notice section"><b>Apoyo a la decisión:</b> confirma cartilla, antecedentes, contraindicaciones, disponibilidad y lineamientos vigentes antes de aplicar.</div>
 </div>`;
}



/* =============================================================
   v1.6.1 · Auditor clínico y dashboard operativo
   Amplía el motor de calidad existente sin modificar registros.
   ============================================================= */
function vatAuditScan(){
 const issues=vatQualityScan().map(x=>({...x,source:'Registro'})),today=isoToday();
 data.appointments.forEach(a=>{
  if(a.date&&a.date<today&&!['Atendida','Cancelada'].includes(a.status||'Programada')){
   issues.push({severity:'high',source:'Agenda',type:'Cita vencida',patientId:a.patientId,date:a.date,detail:`Cita vencida: ${a.reason||'Seguimiento de vacunación'}.`,action:'Contactar al paciente, reprogramar o registrar el resultado de la cita.'});
  }
 });
 data.patients.forEach(p=>{
  if(!p.birth||p.birth>today)return;
  try{
   const e=vatEngineEvaluate(p,today),due=e.items.filter(x=>x.status==='due'&&x.kind!=='special'),outside=e.items.filter(x=>x.status==='outOfTime');
   if(due.length)issues.push({severity:due.length>=3?'high':'medium',source:'Clínico',type:'Esquema pendiente',patientId:p.id,date:today,detail:`${due.length} dosis pendiente(s): ${due.slice(0,4).map(x=>x.vaccine+' '+x.dose).join(', ')}${due.length>4?'…':''}`,action:'Abrir el expediente y confirmar cartilla antes de aplicar o programar recuperación.'});
   if(outside.length)issues.push({severity:'high',source:'Clínico',type:'Ventana de oportunidad cerrada',patientId:p.id,date:today,detail:outside.slice(0,3).map(x=>`${x.vaccine} ${x.dose}: ${x.reason||'fuera de tiempo'}`).join(' · '),action:'Revisar antecedente y seguir el lineamiento vigente para esa edad.'});
  }catch(err){console.warn('Auditor clínico:',err)}
 });
 const rank={critical:0,high:1,medium:2,low:3};
 return issues.sort((a,b)=>(rank[a.severity]-rank[b.severity])||String(a.date||'').localeCompare(String(b.date||'')));
}
function vatAuditCounts(){const c={critical:0,high:0,medium:0,low:0,clinical:0,overdue:0};vatAuditScan().forEach(x=>{c[x.severity]=(c[x.severity]||0)+1;if(x.source==='Clínico')c.clinical++;if(x.type==='Cita vencida')c.overdue++});return c}
function qualityCenter(){
 const counts=vatAuditCounts(),issues=vatAuditScan();
 view.innerHTML=`<div class="card"><div class="row" style="justify-content:space-between"><div><h2>🩺 Auditor clínico</h2><p class="muted">Versión ${VAT_QUALITY_VERSION}. Revisa calidad del registro, agenda y alertas generadas por el motor clínico.</p></div><button class="btn secondary" onclick="vatExportAuditCSV()">Exportar auditoría CSV</button></div><div class="notice"><b>No corrige datos automáticamente.</b> Cada hallazgo debe compararse con cartilla, expediente y lineamientos vigentes.</div></div>
 <div class="grid section"><div class="card stat"><span>Críticas</span><b>${counts.critical}</b></div><div class="card stat"><span>Prioridad alta</span><b>${counts.high}</b></div><div class="card stat"><span>Alertas clínicas</span><b>${counts.clinical}</b></div><div class="card stat"><span>Total a revisar</span><b>${issues.length}</b></div></div>
 <div class="card section"><div class="toolbar"><label>Prioridad <select id="qualityFilter" onchange="vatRenderQualityIssues()"><option value="">Todas</option><option value="critical">Crítica</option><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option></select></label><label>Origen <select id="auditSource" onchange="vatRenderQualityIssues()"><option value="">Todos</option><option>Registro</option><option>Clínico</option><option>Agenda</option></select></label><label style="flex:1">Buscar <input id="qualitySearch" placeholder="Paciente, vacuna, lote o hallazgo" oninput="vatRenderQualityIssues()" style="width:100%"></label></div><div id="qualityIssues"></div></div>`;
 vatRenderQualityIssues();
}
function vatRenderQualityIssues(){
 const sev=document.getElementById('qualityFilter')?.value||'',source=document.getElementById('auditSource')?.value||'',q=(document.getElementById('qualitySearch')?.value||'').trim().toLowerCase(),box=document.getElementById('qualityIssues');if(!box)return;
 const arr=vatAuditScan().filter(x=>(!sev||x.severity===sev)&&(!source||x.source===source)&&(!q||(x.type+' '+x.detail+' '+x.source+' '+(vatQualityPatient(x.patientId)?full(vatQualityPatient(x.patientId)):'')).toLowerCase().includes(q)));
 if(!arr.length){box.innerHTML='<div class="success">No se encontraron hallazgos con estos filtros.</div>';return}
 box.innerHTML=`<div class="audit-list">${arr.map(x=>{const p=vatQualityPatient(x.patientId);return `<div class="audit-item ${esc(x.severity)} ${x.source==='Clínico'?'clinical':''}"><div class="row" style="justify-content:space-between"><div>${vatQualityBadge(x.severity)} <span class="badge">${esc(x.source||'Registro')}</span> <b>${esc(x.type)}</b></div><small>${x.date?esc(formatDateMX(x.date)):''}</small></div><p>${esc(x.detail)}</p><p class="muted"><b>Acción:</b> ${esc(x.action)}</p><div class="row">${p?`<button class="btn primary" onclick="patientRecord(${JSON.stringify(p.id)})">Abrir expediente</button>`:''}${x.source==='Agenda'?`<button class="btn secondary" onclick="quick('agenda')">Abrir agenda</button>`:''}${!p&&x.source==='Registro'?`<button class="btn secondary" onclick="quick('inventory')">Abrir inventario</button>`:''}</div></div>`}).join('')}</div>`;
}
function vatExportAuditCSV(){const rows=[['Prioridad','Origen','Tipo','Paciente','Fecha','Hallazgo','Acción sugerida'],...vatAuditScan().map(x=>[vatQualityLabel(x.severity),x.source||'Registro',x.type,vatQualityPatient(x.patientId)?full(vatQualityPatient(x.patientId)):'',x.date||'',x.detail,x.action])];downloadCSV('auditoria_clinica_'+isoToday()+'.csv',rows)}
function vatDashboardPatients(){
 let due=0,outside=0;data.patients.forEach(p=>{if(!p.birth)return;try{const e=vatEngineEvaluate(p);if(e.items.some(x=>x.status==='due'&&x.kind!=='special'))due++;if(e.items.some(x=>x.status==='outOfTime'))outside++}catch(e){}});return{due,outside};
}
function dashboard(){
 const today=isoToday(),todayV=data.vaccinations.filter(x=>x.date===today),todayA=data.appointments.filter(x=>x.date===today&&!['Cancelada'].includes(x.status)),next7=new Date(today+'T12:00:00');next7.setDate(next7.getDate()+7);const end7=next7.toISOString().slice(0,10),upcoming=data.appointments.filter(x=>x.date>=today&&x.date<=end7&&!['Atendida','Cancelada'].includes(x.status)),expired=data.inventory.filter(x=>x.expiry&&x.expiry<today&&Number(x.qty)>0),soon=data.inventory.filter(x=>x.expiry&&x.expiry>=today&&x.expiry<=end7&&Number(x.qty)>0),low=data.inventory.filter(x=>Number(x.qty)<=5),audit=vatAuditCounts(),clinical=vatDashboardPatients();
 const recent=vatAuditScan().slice(0,5);
 view.innerHTML=`<div class="vat-searchbar no-print"><input placeholder="Buscar paciente, CURP, teléfono, lote o cita" onkeydown="if(event.key==='Enter'){sessionStorage.setItem('vat_search_query',this.value);quick('universalSearch');setTimeout(()=>{const i=document.getElementById('vatGlobalSearch');if(i){i.value=sessionStorage.getItem('vat_search_query')||'';vatRenderUniversalSearch()}},50)}"><button class="btn secondary" onclick="quick('universalSearch')">Buscar</button></div>
 <div class="grid section"><div class="card stat clickable" onclick="quick('patients')"><span>Pacientes registrados</span><b>${data.patients.length}</b><span class="metric-note">Abrir padrón</span></div><div class="card stat clickable" onclick="quick('vaccination')"><span>Vacunas aplicadas hoy</span><b>${todayV.length}</b><span class="metric-note">Registrar aplicación</span></div><div class="card stat clickable" onclick="quick('agenda')"><span>Citas de hoy</span><b>${todayA.length}</b><span class="metric-note">${upcoming.length} en próximos 7 días</span></div><div class="card stat clickable" onclick="quick('qualityCenter')"><span>Alertas prioritarias</span><b>${audit.critical+audit.high}</b><span class="metric-note">${audit.clinical} clínicas</span></div></div>
 <div class="grid section"><div class="card stat clickable" onclick="quick('followUp')"><span>Pacientes con pendientes</span><b>${clinical.due}</b></div><div class="card stat clickable" onclick="quick('qualityCenter')"><span>Ventanas cerradas</span><b>${clinical.outside}</b></div><div class="card stat clickable" onclick="quick('inventory')"><span>Stock bajo</span><b>${low.length}</b></div><div class="card stat clickable" onclick="quick('inventory')"><span>Lotes caducados</span><b>${expired.length}</b><span class="metric-note">${soon.length} caducan en 7 días</span></div></div>
 <div class="two section"><div class="card"><h3>Acciones rápidas</h3><div class="row"><button class="btn primary" onclick="quick('patients')">Registrar paciente</button><button class="btn primary" onclick="quick('vaccination')">Aplicar vacuna</button><button class="btn secondary" onclick="quick('agenda')">Agendar cita</button><button class="btn secondary" onclick="quick('qualityCenter')">Ejecutar auditoría</button></div><h3 class="section">Citas próximas</h3><div class="dash-list">${upcoming.slice(0,6).map(a=>`<div class="dash-row"><div><b>${esc(a.patient||'Paciente')}</b><div class="muted mini">${esc(a.reason||'Seguimiento')}</div></div><span>${formatDateMX(a.date)}</span></div>`).join('')||'<p class="muted">Sin citas próximas.</p>'}</div></div>
 <div class="card"><div class="row" style="justify-content:space-between"><h3>Hallazgos prioritarios</h3><button class="btn secondary" onclick="quick('qualityCenter')">Ver todos</button></div><div class="dash-list">${recent.map(x=>{const p=vatQualityPatient(x.patientId);return `<div class="dash-row"><div><b>${esc(x.type)}</b><div class="muted mini">${p?esc(full(p))+' · ':''}${esc(x.detail)}</div></div>${p?`<button class="btn secondary" onclick="patientRecord(${JSON.stringify(p.id)})">Abrir</button>`:''}</div>`}).join('')||'<div class="success">Sin hallazgos prioritarios.</div>'}</div></div></div>
 <div class="notice section"><b>Apoyo a la decisión:</b> confirma cartilla, antecedentes, contraindicaciones, disponibilidad y lineamientos vigentes antes de aplicar.</div>`;
}
var vatAuditTab161=tabs.find(t=>t[0]==='qualityCenter');if(vatAuditTab161)vatAuditTab161[1]='Auditor clínico';


/* =============================================================
   v1.6.2 · Motor de decisión clínica explicado y semáforo
   Reutiliza vatEngineEvaluate; no duplica las reglas clínicas.
   ============================================================= */
const VAT_DECISION_VERSION='1.6.3';
function vatDecisionChecks(item){
 const checks=[];
 if(item.minimumDate)checks.push({label:`Fecha mínima ${formatDateMX(item.minimumDate)}`,state:item.status==='future'?'warn':'ok'});
 if(item.targetDate)checks.push({label:`Fecha objetivo ${formatDateMX(item.targetDate)}`,state:'ok'});
 if(item.maximumDate)checks.push({label:`Límite ${formatDateMX(item.maximumDate)}`,state:item.status==='outOfTime'?'stop':'ok'});
 if(item.intervalDays!=null)checks.push({label:`Intervalo real ${item.intervalDays} día(s)`,state:item.intervalValid===false?'stop':'ok'});
 if(item.matchedApplication)checks.push({label:'Dosis localizada en historial',state:'ok'});
 else checks.push({label:'Sin dosis coincidente registrada',state:item.status==='outOfTime'?'stop':'warn'});
 return checks;
}
function vatClinicalDecision(patient,onDate=isoToday()){
 const e=vatEngineEvaluate(patient,onDate),items=e.items||[];
 const apply=items.filter(x=>x.status==='due'&&x.kind!=='special');
 const review=items.filter(x=>x.status==='special');
 const wait=items.filter(x=>['upcoming','future'].includes(x.status)).sort((a,b)=>(a.minimumDate||a.targetDate||'9999').localeCompare(b.minimumDate||b.targetDate||'9999'));
 const stop=items.filter(x=>x.status==='outOfTime');
 let color='green',label='Esquema al día',reason='No se detectan dosis básicas vencidas al día evaluado.';
 if(stop.length){color='red';label='Atención inmediata';reason=`${stop.length} dosis fuera de ventana y ${apply.length} pendiente(s) para valorar.`}
 else if(apply.length>=3){color='red';label='Rezago importante';reason=`${apply.length} dosis pendientes para valorar hoy.`}
 else if(apply.length){color='orange';label='Rezago';reason=`${apply.length} dosis pendiente(s) para valorar hoy.`}
 else if(wait.some(x=>{const d=x.minimumDate||x.targetDate;return d&&vatEngineDayDiff(onDate,d)>=0&&vatEngineDayDiff(onDate,d)<=30})){color='yellow';label='Próxima vacuna';reason='Existe una dosis programable dentro de los próximos 30 días.'}
 return{engine:e,apply,review,wait,stop,semaphore:{color,label,reason}};
}
function vatDecisionItemHtml(x,kind){
 const checks=vatDecisionChecks(x).map(c=>`<span class="check-chip ${c.state}">${esc(c.label)}</span>`).join('');
 const text=x.reason||x.action||(kind==='apply'?'Cumple criterios calculados para valoración hoy.':kind==='wait'?'Aún no alcanza la fecha calculada.':kind==='stop'?'Fuera de la ventana configurada.':'Requiere criterio especial.');
 return `<li><b>${esc(x.vaccine)} · ${esc(x.dose)}</b><br><span class="muted">${esc(text)}</span><div class="checks">${checks}</div></li>`;
}
function vatDecisionCard(patient,onDate=isoToday()){
 const d=vatClinicalDecision(patient,onDate),next=d.wait[0];
 return `<div class="card clinical-decision section"><div class="decision-head"><div><h3 style="margin:0">🧠 Decisión clínica explicada</h3><p class="muted" style="margin:4px 0 0">Evaluación ${formatDateMX(onDate)} · Motor v${VAT_DECISION_VERSION}</p></div><span class="clinical-light ${d.semaphore.color}">● ${esc(d.semaphore.label)}</span></div><p>${esc(d.semaphore.reason)}</p><div class="decision-grid"><div class="decision-box"><h4>Aplicar o valorar hoy</h4>${d.apply.length?`<ul>${d.apply.map(x=>vatDecisionItemHtml(x,'apply')).join('')}</ul>`:'<p class="muted">Sin dosis básicas vencidas detectadas.</p>'}</div><div class="decision-box"><h4>Esperar / programar</h4>${d.wait.length?`<ul>${d.wait.slice(0,4).map(x=>vatDecisionItemHtml(x,'wait')).join('')}</ul>`:'<p class="muted">Sin dosis futuras calculadas.</p>'}${next?`<button class="btn secondary no-print" style="margin-top:10px" onclick="vatScheduleSuggested(${JSON.stringify(patient.id)},'${next.minimumDate||next.targetDate||onDate}','${esc(next.vaccine)}','${esc(next.dose)}')">Agendar siguiente fecha</button>`:''}</div><div class="decision-box"><h4>No aplicar en esquema regular</h4>${d.stop.length?`<ul>${d.stop.map(x=>vatDecisionItemHtml(x,'stop')).join('')}</ul>`:'<p class="muted">Sin ventanas cerradas detectadas.</p>'}</div><div class="decision-box"><h4>Criterio especial</h4>${d.review.length?`<ul>${d.review.map(x=>vatDecisionItemHtml(x,'review')).join('')}</ul>`:'<p class="muted">Sin reglas especiales activas.</p>'}</div></div><div class="notice section"><b>Seguridad:</b> la recomendación es apoyo a la decisión. Confirma cartilla, antecedentes, contraindicaciones, disponibilidad y lineamientos institucionales vigentes.</div></div>`;
}
const vatPatientRecordV162Base=patientRecord;
patientRecord=function(id){
 vatPatientRecordV162Base(id);
 const p=data.patients.find(x=>x.id===id),root=document.querySelector('#view .smart-record');
 if(!p||!root)return;
 const head=root.querySelector('.smart-head');
 if(head)head.insertAdjacentHTML('afterend',vatDecisionCard(p));
};
const vatShowSuggestionV162Base=showSuggestion;
showSuggestion=function(){
 const p=data.patients.find(x=>x.id==document.getElementById('vPatient')?.value),box=document.getElementById('suggest');
 if(!p||!box){if(typeof vatShowSuggestionV162Base==='function')vatShowSuggestionV162Base();return}
 const d=vatClinicalDecision(p);
 box.innerHTML=`<div class="notice"><b>Semáforo: ${esc(d.semaphore.label)}</b> · ${esc(d.engine.age.label)}<br>${d.apply.length?d.apply.map(x=>`<span class="badge danger">Aplicar/valorar: ${esc(x.vaccine)} · ${esc(x.dose)}</span>`).join(' '):'<span class="badge">Sin pendientes básicos detectados</span>'}${d.stop.length?'<br>'+d.stop.map(x=>`<span class="badge danger">No aplicar regular: ${esc(x.vaccine)} · ${esc(x.dose)}</span>`).join(' '):''}<br><small>Confirma cartilla y lineamientos antes de aplicar.</small></div>`;
};



/* =============================================================
   v1.6.3 · Cartilla Inteligente 0 a 9 años
   Interfaz familiar inspirada en la cartilla de uso cotidiano.
   El motor clínico existente continúa trabajando por debajo.
   ============================================================= */
const VAT_CARTILLA_VERSION='1.6.3';
function vatCardOpenDose(patientId,vaccine,dose){
 quick('vaccination');
 setTimeout(()=>{
   const p=document.getElementById('vPatient'),v=document.getElementById('vVaccine'),d=document.getElementById('vDose');
   if(p)p.value=String(patientId);
   if(v){const target=vatEngineNormalize(vaccine);const opt=[...v.options].find(o=>vatEngineNormalize(o.value)===target||vatEngineNormalize(o.textContent)===target);if(opt)v.value=opt.value}
   if(d){const want=vatEngineNormalize(dose);const opt=[...d.options].find(o=>vatEngineNormalize(o.value)===want||vatEngineNormalize(o.textContent)===want);if(opt)d.value=opt.value}
   if(typeof showSuggestion==='function')showSuggestion();
   document.getElementById('vDate')?.focus();
 },60);
}
function vatCardAgeBand(item,patient){
 const date=item.targetDate||item.minimumDate||'';
 if(date&&patient.birth){const days=vatEngineDayDiff(patient.birth,date);if(days<=31)return 'Nacimiento';if(days<105)return '2 meses';if(days<165)return '4 meses';if(days<270)return '6 meses';if(days<455)return '12 meses';if(days<650)return '18 meses';if(days<1460)return '2 a 3 años';if(days<2190)return '4 a 5 años';return '6 a 9 años'}
 const t=vatEngineNormalize((item.dose||'')+' '+(item.vaccine||''));
 if(/nacimiento|unica|única/.test(t))return 'Nacimiento';if(/primera|1/.test(t))return '2 meses';if(/segunda|2/.test(t))return '4 meses';if(/tercera|3/.test(t))return '6 meses';if(/refuerzo/.test(t))return '12 a 18 meses';return 'Otras edades';
}
function vatCardState(item){
 if(item.status==='complete')return {cls:'done',label:'Aplicada',icon:'✓'};
 if(item.status==='due')return {cls:'due',label:'Aplicar hoy',icon:'!'};
 if(item.status==='outOfTime')return {cls:'closed',label:'Fuera de oportunidad',icon:'×'};
 if(item.status==='special')return {cls:'special',label:'Revisar',icon:'◇'};
 return {cls:'upcoming',label:'Próxima',icon:'○'};
}
function vatCardDoseDetail(item){
 if(item.matchedApplication){const a=item.matchedApplication;return `${formatDateMX(a.date)}${a.lot?' · Lote '+esc(a.lot):''}`}
 const date=item.minimumDate||item.targetDate||'';return date?`Desde ${formatDateMX(date)}`:(item.reason||item.action||'Pendiente');
}
function vatIntelligentCard(patient){
 const d=vatClinicalDecision(patient),items=(d.engine.items||[]).filter(x=>x.kind!=='special'||x.status==='special');
 const order=['Nacimiento','2 meses','4 meses','6 meses','12 meses','18 meses','12 a 18 meses','2 a 3 años','4 a 5 años','6 a 9 años','Otras edades'];
 const groups={};items.forEach(x=>{const g=vatCardAgeBand(x,patient);(groups[g]||(groups[g]=[])).push(x)});
 const bands=order.filter(g=>groups[g]?.length);
 return `<div class="card vat-booklet section"><div class="booklet-cover"><div><span class="booklet-kicker">CARTILLA DIGITAL INTELIGENTE</span><h2>Vacunación de 0 a 9 años</h2><p>${esc(full(patient))} · ${esc(d.engine.age.label)}</p></div><span class="clinical-light ${d.semaphore.color}">● ${esc(d.semaphore.label)}</span></div>
 <div class="booklet-legend"><span><i class="done"></i> Aplicada</span><span><i class="due"></i> Aplicar/valorar hoy</span><span><i class="upcoming"></i> Próxima</span><span><i class="closed"></i> Fuera de oportunidad</span><span><i class="special"></i> Revisión especial</span></div>
 <div class="booklet-pages">${bands.map(g=>`<section class="age-band"><header>${esc(g)}</header><div class="dose-grid">${groups[g].map(x=>{const st=vatCardState(x);return `<button class="dose-card ${st.cls}" onclick="vatCardOpenDose(${JSON.stringify(patient.id)},${JSON.stringify(x.vaccine)},${JSON.stringify(x.dose)})" title="Abrir registro de vacuna"><span class="dose-icon">${st.icon}</span><strong>${esc(x.vaccine)}</strong><b>${esc(x.dose||'Dosis')}</b><small>${esc(vatCardDoseDetail(x))}</small><em>${st.label}</em></button>`}).join('')}</div></section>`).join('')}</div>
 <div class="notice"><b>Uso:</b> toca cualquier recuadro para abrir la captura con paciente, biológico y dosis preseleccionados. Confirma siempre cartilla física, antecedentes y lineamientos vigentes.</div></div>`;
}
const vatPatientRecordV163Base=patientRecord;
patientRecord=function(id){
 vatPatientRecordV163Base(id);
 const p=data.patients.find(x=>x.id===id),root=document.querySelector('#view .smart-record');if(!p||!root)return;
 const decision=root.querySelector('.clinical-decision');
 if(decision)decision.insertAdjacentHTML('beforebegin',vatIntelligentCard(p));else root.querySelector('.smart-head')?.insertAdjacentHTML('afterend',vatIntelligentCard(p));
 const old=[...root.querySelectorAll('h3')].find(h=>/Cartilla digital|Línea de tiempo/i.test(h.textContent));
 if(old){const section=old.closest('.card.inset,.section');if(section)section.classList.add('booklet-secondary-history')}
};
const vatVersionNodes=()=>document.querySelectorAll('.badge');



/* =============================================================
   v1.6.4 HOTFIX · Apertura universal de expedientes
   Acepta identificadores numéricos, texto, UUID y datos restaurados.
   ============================================================= */
function vatNormalizePatientId(value){
  if(value===null||value===undefined)return '';
  return String(value).trim();
}
function vatResolvePatient(value){
  const key=vatNormalizePatientId(value);
  return data.patients.find(p=>vatNormalizePatientId(p.id)===key)||null;
}
const vatPatientRecordBeforeHotfix=patientRecord;
patientRecord=function(id){
  const patient=vatResolvePatient(id);
  if(!patient){
    console.error('EXPEDIENTE: paciente no localizado',id);
    alert('No fue posible localizar el expediente del paciente. Actualiza la lista e inténtalo nuevamente.');
    return;
  }
  try{
    return vatPatientRecordBeforeHotfix(patient.id);
  }catch(error){
    console.error('EXPEDIENTE: error al abrir',error);
    alert('Ocurrió un error al abrir el expediente. El detalle quedó registrado en la consola.');
  }
};

window.addEventListener('hashchange',()=>{const id=location.hash.replace(/^#\/?/,'')||'dashboard';const i=tabs.findIndex(t=>t[0]===id);if(i>=0)show(id,document.querySelectorAll('.nav button')[i],true)});
