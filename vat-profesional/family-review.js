const SUPABASE_URL='https://kvnvgevogxivkwoswbqh.supabase.co';
const SUPABASE_KEY='sb_publishable_psg1CQIq1Y9tDJmd2qsfUA_DSY5COw2';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
let currentStatus='';
let items=[];

const qs=s=>document.querySelector(s);
const qsa=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(msg){const t=qs('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function fmtDate(v){if(!v)return 'No especificada';try{return new Date(v+'T12:00:00').toLocaleDateString('es-MX')}catch{return v}}
function statusMeta(s){
  if(s==='verificado')return ['verified','Verificado'];
  if(s==='requiere_aclaracion')return ['clarify','Requiere aclaración'];
  if(s==='rechazado')return ['rejected','Rechazado'];
  return ['family','Capturado por familia'];
}

async function loadQueue(){
  qs('#btnRefresh').disabled=true;
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(!session){
      qs('#authError').classList.remove('hidden');
      qs('#mainView').classList.add('hidden');
      return;
    }
    qs('#sessionLabel').textContent=session.user.email||'Sesión profesional activa';

    const {data,error}=await sb.rpc('family_professional_review_queue',{p_status:currentStatus||null});
    if(error)throw error;
    if(!data?.ok)throw new Error(data?.error||'No autorizado');
    items=data.items||[];
    render();
  }catch(err){
    toast(err.message||'No fue posible cargar la bandeja');
  }finally{
    qs('#btnRefresh').disabled=false;
  }
}

function render(){
  const q=qs('#queue');q.innerHTML='';
  qs('#countLabel').textContent=items.length+' '+(items.length===1?'registro':'registros');
  qs('#empty').classList.toggle('hidden',items.length>0);
  items.forEach(x=>{
    const [cls,label]=statusMeta(x.verification_status);
    const card=document.createElement('article');
    card.className='review-card';
    card.innerHTML=`
      <div class="head">
        <div>
          <h3>${esc(x.family_member_name)}</h3>
          <div class="muted">${x.curp?'CURP '+esc(x.curp):'Sin CURP'} · Capturado por ${esc(x.family_account_name||'familia')}</div>
        </div>
        <span class="status ${cls}">${label}</span>
      </div>
      <div class="meta">
        <div><span>Vacuna</span><strong>${esc(x.vaccine_code||'No especificada')}</strong></div>
        <div><span>Dosis</span><strong>${esc(x.dose_code||'No especificada')}</strong></div>
        <div><span>Fecha</span><strong>${fmtDate(x.application_date)}</strong></div>
        <div><span>Lote</span><strong>${esc(x.lot_number||'No registrado')}</strong></div>
      </div>
      <div class="meta">
        <div><span>Institución</span><strong>${esc(x.institution_name||'No especificada')}</strong></div>
        <div><span>Evidencias</span><strong>${(x.evidence||[]).length}</strong></div>
        <div><span>Registro profesional</span><strong>${x.patient_record_id?'Vinculado':'No vinculado'}</strong></div>
        <div><span>Observación familiar</span><strong>${esc(x.notes||'Sin notas')}</strong></div>
      </div>
      ${(x.evidence||[]).length?'<div class="evidence-actions"><button class="evidence-load" type="button" data-evidence-id="'+esc(x.entry_id)+'">📷 Ver evidencia ('+(x.evidence||[]).length+')</button></div><div class="evidence-gallery hidden" data-gallery="'+esc(x.entry_id)+'"></div>':''}
      <div class="notes">
        <textarea data-notes="${esc(x.entry_id)}" placeholder="Observaciones de la revisión (opcional)"></textarea>
      </div>
      <div class="actions">
        <button class="ok" data-action="verificado" data-id="${esc(x.entry_id)}">✓ Verificar</button>
        <button class="warn" data-action="requiere_aclaracion" data-id="${esc(x.entry_id)}">? Requiere aclaración</button>
        <button class="bad" data-action="rechazado" data-id="${esc(x.entry_id)}">✕ Rechazar</button>
      </div>
    `;
    q.appendChild(card);
  });
  qsa('[data-action]').forEach(b=>b.onclick=()=>review(b.dataset.id,b.dataset.action));
  qsa('[data-evidence-id]').forEach(b=>b.onclick=()=>loadEvidenceImages(b.dataset.evidenceId,b));
}

async function loadEvidenceImages(entryId,trigger){
  const x=items.find(item=>item.entry_id===entryId);
  const gallery=qs('[data-gallery="'+CSS.escape(entryId)+'"]');
  if(!x||!gallery)return;
  if(gallery.dataset.loaded==='1'){
    gallery.classList.toggle('hidden');
    trigger.textContent=gallery.classList.contains('hidden')?'📷 Ver evidencia ('+(x.evidence||[]).length+')':'Ocultar evidencia';
    return;
  }

  trigger.disabled=true;
  trigger.textContent='Cargando evidencia…';
  gallery.classList.remove('hidden');

  for(const ev of (x.evidence||[])){
    const wrap=document.createElement('button');
    wrap.className='evidence-thumb';wrap.type='button';wrap.textContent='Cargando foto…';
    gallery.appendChild(wrap);
    try{
      const {data,error}=await sb.storage.from(ev.bucket||'family-evidence').download(ev.path);
      if(error)throw error;
      const url=URL.createObjectURL(data);
      wrap.innerHTML='<img src="'+url+'" alt="Evidencia de cartilla"><span>Ver foto</span>';
      wrap.onclick=()=>openEvidence(url);
    }catch(err){
      wrap.textContent='No se pudo cargar la foto';
      wrap.disabled=true;
    }
  }

  gallery.dataset.loaded='1';
  trigger.disabled=false;
  trigger.textContent='Ocultar evidencia';
}

function openEvidence(url){
  const modal=qs('#evidenceModal');
  const img=qs('#evidenceModalImg');
  img.src=url;modal.classList.remove('hidden');
}

async function review(entryId,decision){
  const ta=qs('[data-notes="'+CSS.escape(entryId)+'"]');
  const notes=ta?.value.trim()||'';
  const labels={verificado:'verificar',requiere_aclaracion:'marcar para aclaración',rechazado:'rechazar'};
  if(!confirm('¿Confirmas '+labels[decision]+' este antecedente?'))return;

  qsa('[data-id="'+CSS.escape(entryId)+'"]').forEach(b=>b.disabled=true);
  try{
    const {data,error}=await sb.rpc('family_professional_review_entry',{
      p_entry_id:entryId,
      p_decision:decision,
      p_notes:notes||null
    });
    if(error)throw error;
    if(!data?.ok){
      if(data?.error==='application_date_required_for_verification'){
        throw new Error('Para verificarla como aplicación de VAT necesitamos la fecha de aplicación. Marca “Requiere aclaración” si la familia no la indicó.');
      }
      if(data?.error==='linked_patient_missing'){
        throw new Error('La cartilla está vinculada, pero falta enlazarla al paciente profesional antes de verificar.');
      }
      if(data?.error==='verified_record_requires_vat_edit'){
        throw new Error('Este antecedente ya creó una aplicación en VAT. Cualquier cambio debe hacerse desde el expediente profesional.');
      }
      throw new Error(data?.error||'No fue posible revisar');
    }
    if(decision==='verificado' && (data.vat_record_created || data.legacy_record_id)){
      toast('Verificada y agregada al expediente de Vacunas a Tiempo');
    }else{
      toast('Revisión guardada');
    }
    await loadQueue();
  }catch(err){
    toast(err.message||'No fue posible guardar la revisión');
    qsa('[data-id="'+CSS.escape(entryId)+'"]').forEach(b=>b.disabled=false);
  }
}

qsa('.filter').forEach(b=>b.onclick=()=>{
  qsa('.filter').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  currentStatus=b.dataset.status||'';
  loadQueue();
});
qs('#btnRefresh').onclick=loadQueue;
loadQueue();
qs('#closeEvidence').onclick=()=>{qs('#evidenceModal').classList.add('hidden');qs('#evidenceModalImg').removeAttribute('src')};
qs('#evidenceModal').addEventListener('click',e=>{if(e.target===qs('#evidenceModal'))qs('#closeEvidence').click()});
