const KEY='vat_familias_mvp_demo_v1';
let state=load();
let currentMemberId=null;

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

qs('#btnAddVaccine').onclick=()=>show('vaccine');
qs('#btnLinkMember').onclick=()=>show('link');

qs('#vaccineForm').onsubmit=e=>{
  e.preventDefault();
  const m=state.members.find(x=>x.id===currentMemberId);if(!m)return;
  m.vaccines=m.vaccines||[];
  m.vaccines.push({id:id(),name:qs('#vaccineName').value,dose:qs('#vaccineDose').value.trim(),date:qs('#vaccineDate').value,lot:qs('#vaccineLot').value.trim(),institution:qs('#vaccineInstitution').value.trim(),notes:qs('#vaccineNotes').value.trim(),status:'capturado_familia'});
  save();e.target.reset();show('card');toast('Vacuna guardada como antecedente familiar');
};

qs('#btnMockLink').onclick=()=>toast('El lector QR real se conecta en la siguiente fase');

qs('#btnReset').onclick=()=>{
  if(confirm('¿Borrar solo los datos de prueba de VAT Familias en este dispositivo?')){
    localStorage.removeItem(KEY);state=defaultState();currentMemberId=null;show('welcome');toast('Demo reiniciada')
  }
};

if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
if(state.account)show('home');else show('welcome');
