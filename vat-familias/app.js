const SUPABASE_URL='https://kvnvgevogxivkwoswbqh.supabase.co';
const SUPABASE_KEY='sb_publishable_psg1CQIq1Y9tDJmd2qsfUA_DSY5COw2';
const sb=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});
let session=null;
let familyAccountId=null;
let backendReady=false;
const KEY='vat_familias_mvp_demo_v1';
let state=load();
let currentMemberId=null;
let assistedDraft={cartilla:null,name:'',date:'',dose:'',lot:'',institution:'',notes:''};
let assistedStep=1;

function defaultState(){return {account:null,members:[]}}
function load(){try{return JSON.parse(localStorage.getItem(KEY))||defaultState()}catch{return defaultState()}}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function id(){return crypto?.randomUUID?.()||('id-'+Date.now()+'-'+Math.random().toString(16).slice(2))}
function qs(x){return document.querySelector(x)}
function qsa(x){return [...document.querySelectorAll(x)]}
function toast(msg){const t=qs('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}

function show(name){
  qsa('.view').forEach(v=>v.classList.remove('active'));
  qs('#view'+name[0].toUpperCase()+name.slice(1)).classList.add('active');
  if(name==='home') renderHome();
  if(name==='card') renderCard();
  scrollTo({top:0,behavior:'smooth'});
}

function years(d){
  if(!d)return '';
  const a=new Date(d),b=new Date();let y=b.getFullYear()-a.getFullYear();
  const m=b.getMonth()-a.getMonth();if(m<0||(m===0&&b.getDate()<a.getDate()))y--;
  return y;
}

function renderHome(){
  qs('#helloTitle').textContent='Hola'+(state.account?.name?', '+state.account.name.split(' ')[0]:'');
  const list=qs('#membersList');list.innerHTML='';
  qs('#emptyMembers').classList.toggle('hidden',state.members.length>0);
  state.members.forEach(m=>{
    const el=document.createElement('article');el.className='member-card';
    el.innerHTML=`<div class="member-main"><div class="member-avatar">🧒</div><div><h3>${escapeHtml(m.name)}</h3><p>${m.dob?years(m.dob)+' años · ':''}${escapeHtml(m.relationship||'')}</p></div></div><button class="open-btn" type="button">Abrir</button>`;
    el.querySelector('button').onclick=()=>{currentMemberId=m.id;show('card')};
    list.appendChild(el);
  });
  qs('#btnReset').classList.toggle('hidden',!state.account);
}

function renderCard(){
  const m=state.members.find(x=>x.id===currentMemberId);
  if(!m){show('home');return}
  qs('#cardMemberName').textContent=m.name;
  const bits=[];if(m.dob)bits.push(years(m.dob)+' años');if(m.curp)bits.push(m.curp);
  qs('#cardMemberMeta').textContent=bits.join(' · ');
  const vl=qs('#vaccineList');vl.innerHTML='';
  const vaccines=[...(m.vaccines||[])].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  qs('#emptyVaccines').classList.toggle('hidden',vaccines.length>0);
  vaccines.forEach(v=>{
    const el=document.createElement('div');el.className='vaccine-row';
    const sm=vaccineStatusMeta(v);
    el.innerHTML=`<div class="vaccine-row-top"><strong>${escapeHtml(v.name)}</strong><span class="status ${sm.cls}">${escapeHtml(sm.label)}</span></div><small>${escapeHtml(v.dose||'Dosis no especificada')} · ${escapeHtml(v.date||'Fecha no especificada')}</small><small>${v.lot?'Lote '+escapeHtml(v.lot)+' · ':''}${escapeHtml(v.institution||'')}</small>`;
    vl.appendChild(el);
  });
}

function vaccineStatusMeta(v){
  if(v?.source==='profesional' || v?.linkedVaccinationId)return {cls:'professional',label:'Unidad de salud'};
  switch(v?.status){
    case 'verificado': return {cls:'verified',label:'Verificada'};
    case 'pendiente_verificacion': return {cls:'pending',label:'Pendiente'};
    case 'requiere_aclaracion': return {cls:'pending',label:'Requiere aclaración'};
    case 'rechazado': return {cls:'pending',label:'No verificada'};
    default: return {cls:'family',label:'Familia'};
  }
}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

qs('#btnStart').onclick=()=>show('account');
qs('#btnLinkExisting').onclick=()=>show('link');
qs('#btnAddMemberTop').onclick=qs('#btnAddMemberEmpty').onclick=()=>show('member');
qs('#btnLinkFromHome').onclick=()=>show('link');
qsa('.back').forEach(b=>b.onclick=()=>show(b.dataset.back));

qs('#accountForm').onsubmit=async e=>{
  e.preventDefault();
  const name=qs('#accountName').value.trim();
  const phone=qs('#accountPhone').value.trim();
  const email=qs('#accountEmail').value.trim();
  const password=qs('#accountPassword').value;
  try{
    const r=await registerFamilyAccount(name,phone,email,password);
    if(r.confirmed){
      state.account={name,phone,email};save();show('home');toast('Cuenta familiar creada');
    }else{
      toast('Revisa tu correo para confirmar la cuenta');
    }
  }catch(err){toast(err.message||'No fue posible crear la cuenta')}
};

qs('#btnExistingAccount').onclick=async()=>{
  const email=qs('#accountEmail').value.trim();
  const password=qs('#accountPassword').value;
  if(!email||!password){toast('Escribe correo y contraseña');return}
  try{
    await signInFamily(email,password);
    show('home');toast('Sesión iniciada');
  }catch(err){toast(err.message||'No fue posible iniciar sesión')}
};

qs('#memberForm').onsubmit=async e=>{
  e.preventDefault();
  const curp=qs('#memberCurp').value.trim().toUpperCase();
  if(curp && state.members.some(x=>x.curp===curp)){toast('Ya existe una cartilla con esa CURP');return}
  let m={id:id(),name:qs('#memberName').value.trim(),dob:qs('#memberDob').value,sex:qs('#memberSex').value,curp,relationship:qs('#memberRelationship').value,vaccines:[]};
  try{
    if(backendReady)m=await saveMemberToSupabase(m);
    state.members.push(m);currentMemberId=m.id;save();e.target.reset();show('card');
    toast(backendReady?'Cartilla guardada en la nube':'Cartilla creada en modo local');
  }catch(err){toast(err.message||'No se pudo guardar la cartilla')}
};

qs('#btnAddVaccine').onclick=()=>show('captureMode');
qs('#btnAssistedMode').onclick=()=>startAssisted();
qs('#btnQuickMode').onclick=()=>show('vaccine');
qs('#btnLinkMember').onclick=()=>show('link');

qs('#vaccineForm').onsubmit=async e=>{
  e.preventDefault();
  const m=state.members.find(x=>x.id===currentMemberId);if(!m)return;
  let v={
    id:id(),
    name:qs('#vaccineName').value,
    dose:qs('#vaccineDose').value.trim(),
    date:qs('#vaccineDate').value,
    lot:qs('#vaccineLot').value.trim(),
    institution:qs('#vaccineInstitution').value.trim(),
    notes:qs('#vaccineNotes').value.trim(),
    status:'capturado_familia',
    source:'familia',
    captureMode:'rapido'
  };
  try{
    if(backendReady)v=await saveVaccineToSupabase(m,v);
    m.vaccines=m.vaccines||[];
    m.vaccines.push(v);
    save();e.target.reset();show('card');
    toast(backendReady?'Vacuna guardada en tu cuenta':'Vacuna guardada en modo local');
  }catch(err){toast(err.message||'No se pudo guardar la vacuna')}
};

function parsePortalCredentials(raw){
  const out={folio:'',token:''};
  const s=String(raw||'').trim();
  if(!s)return out;

  try{
    const u=new URL(s,location.href);
    const qp=u.searchParams;
    out.folio=qp.get('folio')||qp.get('f')||qp.get('patient')||qp.get('code')||'';
    out.token=qp.get('token')||qp.get('t')||qp.get('access_token')||qp.get('accessCode')||qp.get('access_code')||'';
    if(out.folio||out.token)return out;
  }catch{}

  const pairs={};
  s.split(/[\n&;|]/).forEach(part=>{
    const m=part.match(/^\s*([^:=]+)\s*[:=]\s*(.+?)\s*$/);
    if(m)pairs[m[1].toLowerCase().trim()]=m[2].trim();
  });
  out.folio=pairs.folio||pairs.f||pairs.codigo_paciente||pairs.patient||'';
  out.token=pairs.token||pairs.t||pairs.codigo||pairs.access_code||pairs.accesscode||'';

  if(!out.folio||!out.token){
    const bits=s.split(/\s+/).filter(Boolean);
    if(bits.length===2){
      out.folio=out.folio||bits[0];
      out.token=out.token||bits[1];
    }
  }
  return out;
}

function showLinkPreview(folio,token){
  const box=qs('#linkPreview');
  if(!folio && !token){box.classList.add('hidden');box.innerHTML='';return}
  box.classList.remove('hidden');
  box.innerHTML=
    '<div class="summary-row"><span>Folio</span><strong>'+escapeHtml(folio||'No detectado')+'</strong></div>'+
    '<div class="summary-row"><span>Código</span><strong>'+(token?'••••••••':'No detectado')+'</strong></div>'+
    '<div class="summary-row"><span>Acción</span><strong>Vincular sin duplicar</strong></div>';
}

qs('#btnParseQr').onclick=()=>{
  const x=parsePortalCredentials(qs('#linkQrText').value);
  if(x.folio)qs('#linkFolio').value=x.folio;
  if(x.token)qs('#linkToken').value=x.token;
  if(!x.folio && !x.token){toast('No pude identificar folio y código en ese QR');return}
  showLinkPreview(qs('#linkFolio').value.trim(),qs('#linkToken').value.trim());
  toast('Datos del QR detectados');
};

qs('#linkFolio').addEventListener('input',()=>showLinkPreview(qs('#linkFolio').value.trim(),qs('#linkToken').value.trim()));
qs('#linkToken').addEventListener('input',()=>showLinkPreview(qs('#linkFolio').value.trim(),qs('#linkToken').value.trim()));

qs('#btnMockLink').onclick=async()=>{
  const folio=qs('#linkFolio').value.trim();
  const token=qs('#linkToken').value.trim();
  if(!folio || !token){toast('Necesito folio y código de acceso');return}
  const m=state.members.find(x=>x.id===currentMemberId);
  if(!m){toast('Primero selecciona al integrante');show('home');return}
  try{
    if(backendReady){
      await linkCurrentMemberReal(folio,token);
      show('card');toast('Cartilla vinculada con Vacunas a Tiempo');
    }else{
      m.link={status:'pendiente_conexion',folio,tokenHint:token.slice(-4),capturedAt:new Date().toISOString()};
      save();show('card');toast('Vínculo guardado localmente');
    }
  }catch(err){toast(err.message||'No fue posible vincular')}
};


qs('#btnReset').onclick=()=>{
  if(confirm('¿Borrar solo los datos de prueba de VAT Familias en este dispositivo?')){
    localStorage.removeItem(KEY);state=defaultState();currentMemberId=null;show('welcome');toast('Demo reiniciada')
  }
};

if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
if(state.account)show('home');else show('welcome');


function startAssisted(){
  assistedDraft={cartilla:null,name:'',date:'',dose:'',lot:'',institution:'',notes:''};
  assistedStep=1;
  qs('#assistDate').value='';
  qs('#assistLot').value='';
  renderAssistedStep();
  show('assisted');
}

function renderAssistedStep(){
  qsa('.wizard-step').forEach(x=>x.classList.remove('active'));
  qs('#wizardStep'+assistedStep).classList.add('active');
  qs('#wizardProgress').textContent=assistedStep+' de 6';
  const titles=['Vamos paso a paso','Cartilla','Vacuna','Fecha','Dosis','Lote','Confirmar'];
  qs('#wizardTitle').textContent=titles[assistedStep]||'Captura asistida';
  if(assistedStep===6) renderAssistSummary();
}

function nextAssist(step){
  assistedStep=step;
  renderAssistedStep();
}

qsa('[data-cartilla]').forEach(b=>b.onclick=()=>{
  assistedDraft.cartilla=b.dataset.cartilla;
  nextAssist(2);
});

qsa('[data-vaccine]').forEach(b=>b.onclick=()=>{
  assistedDraft.name=b.dataset.vaccine;
  nextAssist(3);
});

qs('#assistDateNext').onclick=()=>{
  const d=qs('#assistDate').value;
  if(!d){toast('Elige una fecha o toca “No sé la fecha exacta”');return}
  assistedDraft.date=d;
  nextAssist(4);
};
qs('#assistDateUnknown').onclick=()=>{
  assistedDraft.date='';
  nextAssist(4);
};

qsa('[data-dose]').forEach(b=>b.onclick=()=>{
  assistedDraft.dose=b.dataset.dose||'';
  nextAssist(5);
});

qs('#assistLotNext').onclick=()=>{
  assistedDraft.lot=qs('#assistLot').value.trim();
  nextAssist(6);
};
qs('#assistNoLot').onclick=()=>{
  assistedDraft.lot='';
  nextAssist(6);
};

function renderAssistSummary(){
  const m=state.members.find(x=>x.id===currentMemberId);
  const rows=[
    ['Paciente',m?.name||''],
    ['Vacuna',assistedDraft.name||'No especificada'],
    ['Fecha',assistedDraft.date||'No especificada'],
    ['Dosis',assistedDraft.dose||'No especificada'],
    ['Lote',assistedDraft.lot||'No registrado'],
    ['Origen','Capturado por la familia']
  ];
  qs('#assistSummary').innerHTML=rows.map(r=>'<div class="summary-row"><span>'+escapeHtml(r[0])+'</span><strong>'+escapeHtml(r[1])+'</strong></div>').join('');
}

qs('#assistEdit').onclick=()=>nextAssist(2);

qs('#assistSave').onclick=async()=>{
  const m=state.members.find(x=>x.id===currentMemberId);
  if(!m)return;
  let v={
    id:id(),
    name:assistedDraft.name||'No especificada',
    dose:assistedDraft.dose,
    date:assistedDraft.date,
    lot:assistedDraft.lot,
    institution:'',
    notes:assistedDraft.cartilla==='si'?'Capturado con cartilla a la mano':'Capturado de memoria',
    status:'capturado_familia',
    source:'familia',
    captureMode:'asistido'
  };
  try{
    if(backendReady)v=await saveVaccineToSupabase(m,v);
    m.vaccines=m.vaccines||[];
    m.vaccines.push(v);
    save();show('card');
    toast(backendReady?'Antecedente guardado en tu cuenta':'Antecedente guardado localmente');
  }catch(err){toast(err.message||'No se pudo guardar el antecedente')}
};


async function ensureFamilyAccount(profile){
  if(!sb || !session?.user)return null;
  const uid=session.user.id;
  const {data:existing,error:readErr}=await sb.from('family_accounts').select('*').eq('user_id',uid).maybeSingle();
  if(readErr)throw readErr;
  if(existing){familyAccountId=existing.id;return existing}

  const pending=profile||JSON.parse(localStorage.getItem('vat_family_pending_profile')||'null')||{};
  const payload={
    user_id:uid,
    display_name:pending.name||session.user.user_metadata?.display_name||session.user.email?.split('@')[0]||'Familia',
    phone:pending.phone||null,
    terms_accepted_at:new Date().toISOString()
  };
  const {data,error}=await sb.from('family_accounts').insert(payload).select('*').single();
  if(error)throw error;
  localStorage.removeItem('vat_family_pending_profile');
  familyAccountId=data.id;
  return data;
}

async function loadMembersFromSupabase(){
  if(!sb || !familyAccountId)return;
  const {data,error}=await sb.from('family_members')
    .select(`id,full_name,curp,birth_date,sex,relationship_to_account,link_status,linked_patient_id,
      family_vaccine_entries(
        id,vaccine_code,dose_code,application_date,lot_number,manufacturer,institution_name,notes,
        source,verification_status,linked_vaccination_id,verified_at,verification_notes,created_at
      )`)
    .eq('family_account_id',familyAccountId)
    .order('created_at',{ascending:true});
  if(error)throw error;
  state.members=(data||[]).map(x=>({
    id:x.id,name:x.full_name,curp:x.curp||'',dob:x.birth_date||'',sex:x.sex||'',
    relationship:x.relationship_to_account||'hijo',
    vaccines:(x.family_vaccine_entries||[]).map(v=>({
      id:v.id,
      name:v.vaccine_code,
      dose:v.dose_code||'',
      date:v.application_date||'',
      lot:v.lot_number||'',
      manufacturer:v.manufacturer||'',
      institution:v.institution_name||'',
      notes:v.notes||'',
      source:v.source||'familia',
      status:v.verification_status||'capturado_familia',
      linkedVaccinationId:v.linked_vaccination_id||null,
      verifiedAt:v.verified_at||null,
      verificationNotes:v.verification_notes||''
    })),
    linkStatus:x.link_status,
    linkedPatientId:x.linked_patient_id||null
  }));
  save();
}

async function syncAccountFromSupabase(){
  if(!sb)return false;
  const {data:{session:s}}=await sb.auth.getSession();
  session=s||null;
  if(!session)return false;

  const acct=await ensureFamilyAccount();
  state.account={
    name:acct.display_name||session.user.email?.split('@')[0]||'Familia',
    phone:acct.phone||'',
    email:session.user.email||''
  };
  await loadMembersFromSupabase();
  backendReady=true;
  save();
  return true;
}

async function registerFamilyAccount(name,phone,email,password){
  if(!sb)throw new Error('Supabase no disponible');
  localStorage.setItem('vat_family_pending_profile',JSON.stringify({name,phone,email}));
  const {data,error}=await sb.auth.signUp({
    email,
    password,
    options:{data:{display_name:name}}
  });
  if(error)throw error;
  if(data.session){
    session=data.session;
    const acct=await ensureFamilyAccount({name,phone,email});
    familyAccountId=acct.id;
    backendReady=true;
    return {confirmed:true};
  }
  return {confirmed:false};
}

async function signInFamily(email,password){
  if(!sb)throw new Error('Supabase no disponible');
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error)throw error;
  session=data.session;
  const acct=await ensureFamilyAccount();
  familyAccountId=acct.id;
  state.account={name:acct.display_name||email.split('@')[0],phone:acct.phone||'',email};
  await loadMembersFromSupabase();
  backendReady=true;save();
}

async function saveMemberToSupabase(m){
  if(!backendReady || !sb || !familyAccountId)return m;
  const payload={
    family_account_id:familyAccountId,
    full_name:m.name,
    curp:m.curp||null,
    birth_date:m.dob||null,
    sex:m.sex||null,
    relationship_to_account:m.relationship||'hijo',
    guardian_name:state.account?.name||null
  };
  const {data,error}=await sb.from('family_members').insert(payload).select('*').single();
  if(error)throw error;
  return {
    ...m,id:data.id,linkStatus:data.link_status,linkedPatientId:data.linked_patient_id||null
  };
}

async function saveVaccineToSupabase(member,v){
  if(!backendReady || !sb || !session?.user)return v;
  const payload={
    family_member_id:member.id,
    vaccine_code:v.name||'No especificada',
    dose_code:v.dose||null,
    application_date:v.date||null,
    lot_number:v.lot||null,
    manufacturer:v.manufacturer||null,
    institution_name:v.institution||null,
    notes:v.notes||null,
    source:'familia',
    verification_status:'capturado_familia',
    created_by:session.user.id
  };
  const {data,error}=await sb.from('family_vaccine_entries')
    .insert(payload)
    .select('id,vaccine_code,dose_code,application_date,lot_number,manufacturer,institution_name,notes,source,verification_status,linked_vaccination_id,verified_at,verification_notes')
    .single();
  if(error)throw error;
  return {
    ...v,
    id:data.id,
    name:data.vaccine_code,
    dose:data.dose_code||'',
    date:data.application_date||'',
    lot:data.lot_number||'',
    manufacturer:data.manufacturer||'',
    institution:data.institution_name||'',
    notes:data.notes||'',
    source:data.source||'familia',
    status:data.verification_status||'capturado_familia',
    linkedVaccinationId:data.linked_vaccination_id||null,
    verifiedAt:data.verified_at||null,
    verificationNotes:data.verification_notes||''
  };
}

async function linkCurrentMemberReal(folio,token){
  if(!backendReady || !sb || !session)throw new Error('Inicia sesión para vincular');
  const m=state.members.find(x=>x.id===currentMemberId);
  if(!m)throw new Error('Selecciona primero a un integrante');
  const {data,error}=await sb.rpc('family_app_link_from_portal',{
    p_family_member_id:m.id,
    p_folio:folio,
    p_token:token
  });
  if(error)throw error;
  if(!data?.ok)throw new Error(data?.error||'No fue posible vincular');
  m.linkStatus='vinculado';
  m.link={status:'vinculado',folio,patientRecordId:data.patient_record_id,unitId:data.unit_id};
  save();
  return data;
}

async function logoutFamily(){
  if(sb)await sb.auth.signOut();
  session=null;familyAccountId=null;backendReady=false;
  state=defaultState();currentMemberId=null;save();show('welcome');
}

(async function bootBackend(){
  try{
    const ok=await syncAccountFromSupabase();
    if(ok)show('home');
  }catch(e){
    console.warn('VAT Familias backend',e);
    toast('No se pudo conectar con la nube; seguimos en modo local');
  }
})();

qs('#btnLogout').onclick=()=>logoutFamily();
