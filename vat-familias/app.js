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
    el.innerHTML=`<div class="vaccine-row-top"><strong>${escapeHtml(v.name)}</strong><span class="status family">Familia</span></div><small>${escapeHtml(v.dose||'Dosis no especificada')} · ${escapeHtml(v.date||'')}</small><small>${v.lot?'Lote '+escapeHtml(v.lot)+' · ':''}${escapeHtml(v.institution||'')}</small>`;
    vl.appendChild(el);
  });
}

function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

qs('#btnStart').onclick=()=>show('account');
qs('#btnLinkExisting').onclick=()=>show('link');
qs('#btnAddMemberTop').onclick=qs('#btnAddMemberEmpty').onclick=()=>show('member');
qs('#btnLinkFromHome').onclick=()=>show('link');
qsa('.back').forEach(b=>b.onclick=()=>show(b.dataset.back));

qs('#accountForm').onsubmit=e=>{
  e.preventDefault();
  state.account={name:qs('#accountName').value.trim(),phone:qs('#accountPhone').value.trim(),email:qs('#accountEmail').value.trim()};
  save();show('home');toast('Cuenta familiar creada');
};

qs('#memberForm').onsubmit=e=>{
  e.preventDefault();
  const curp=qs('#memberCurp').value.trim().toUpperCase();
  if(curp && state.members.some(x=>x.curp===curp)){toast('Ya existe una cartilla con esa CURP');return}
  const m={id:id(),name:qs('#memberName').value.trim(),dob:qs('#memberDob').value,sex:qs('#memberSex').value,curp,relationship:qs('#memberRelationship').value,vaccines:[]};
  state.members.push(m);currentMemberId=m.id;save();e.target.reset();show('card');toast('Cartilla creada');
};

qs('#btnAddVaccine').onclick=()=>show('captureMode');
qs('#btnAssistedMode').onclick=()=>startAssisted();
qs('#btnQuickMode').onclick=()=>show('vaccine');
qs('#btnLinkMember').onclick=()=>show('link');

qs('#vaccineForm').onsubmit=e=>{
  e.preventDefault();
  const m=state.members.find(x=>x.id===currentMemberId);if(!m)return;
  m.vaccines=m.vaccines||[];
  m.vaccines.push({id:id(),name:qs('#vaccineName').value,dose:qs('#vaccineDose').value.trim(),date:qs('#vaccineDate').value,lot:qs('#vaccineLot').value.trim(),institution:qs('#vaccineInstitution').value.trim(),notes:qs('#vaccineNotes').value.trim(),status:'capturado_familia'});
  save();e.target.reset();show('card');toast('Vacuna guardada como antecedente familiar');
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

qs('#btnMockLink').onclick=()=>{
  const folio=qs('#linkFolio').value.trim();
  const token=qs('#linkToken').value.trim();
  if(!folio || !token){toast('Necesito folio y código de acceso');return}
  const m=state.members.find(x=>x.id===currentMemberId);
  if(!m){
    toast('Primero selecciona o agrega al integrante que quieres vincular');
    show('home');
    return;
  }
  m.link={
    status:'pendiente_conexion',
    folio,
    tokenHint:token.slice(-4),
    capturedAt:new Date().toISOString()
  };
  save();
  show('card');
  toast('Vínculo preparado. Se validará al conectar Supabase');
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

qs('#assistSave').onclick=()=>{
  const m=state.members.find(x=>x.id===currentMemberId);
  if(!m)return;
  m.vaccines=m.vaccines||[];
  m.vaccines.push({
    id:id(),
    name:assistedDraft.name||'No especificada',
    dose:assistedDraft.dose,
    date:assistedDraft.date,
    lot:assistedDraft.lot,
    institution:'',
    notes:assistedDraft.cartilla==='si'?'Capturado con cartilla a la mano':'Capturado de memoria',
    status:'capturado_familia',
    captureMode:'asistido'
  });
  save();
  show('card');
  toast('Antecedente guardado');
};
