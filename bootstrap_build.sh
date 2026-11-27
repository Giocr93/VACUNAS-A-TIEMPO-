#!/usr/bin/env bash
set -euo pipefail
rm -rf dist
mkdir -p dist

python3 - <<'PY'
from html.parser import HTMLParser
from urllib.parse import urljoin,urlparse,urldefrag
from urllib.request import Request,urlopen
from pathlib import Path
import re,sys

BASE='https://vacunasatiempo.netlify.app/'
OUT=Path('dist')
seen=set()

def fetch(u):
    req=Request(u,headers={'User-Agent':'VAT-Netlify-Bootstrap/2.3.4.24'})
    with urlopen(req,timeout=30) as r:
        return r.read()

def save(u):
    u,_=urldefrag(u)
    p=urlparse(u)
    if p.netloc!=urlparse(BASE).netloc:
        return None
    path=p.path or '/'
    if path.endswith('/'):
        path+='index.html'
    rel=path.lstrip('/') or 'index.html'
    if rel in seen:
        return OUT/rel
    seen.add(rel)
    try:
        data=fetch(u)
    except Exception as e:
        print('WARN',u,e,file=sys.stderr)
        return None
    d=OUT/rel
    d.parent.mkdir(parents=True,exist_ok=True)
    d.write_bytes(data)
    return d

class P(HTMLParser):
    def __init__(self):
        super().__init__(); self.urls=[]
    def handle_starttag(self,t,a):
        d=dict(a)
        for k in ('src','href'):
            if d.get(k):
                self.urls.append(d[k])

# Descargar versión pública actual
idx=save(BASE)
if not idx:
    raise SystemExit('No se pudo descargar producción')

p=P()
p.feed(idx.read_text('utf-8',errors='ignore'))
for u in p.urls:
    save(urljoin(BASE,u))

for u in ('service-worker.js','manifest.webmanifest','version.json','Vacunas_a_Tiempo.html'):
    save(urljoin(BASE,u))

# Expandir assets del service worker
sw=OUT/'service-worker.js'
if sw.exists():
    t=sw.read_text('utf-8',errors='ignore')
    for q in re.findall(r'''["'](\.?\.?/[^"'?#]+|[^"'?#]+\.(?:js|css|html|json|webmanifest|png|jpg|jpeg|svg|ico|webp))["']''',t,re.I):
        save(urljoin(BASE,q))

# Expandir recursos CSS
for css in list(OUT.rglob('*.css')):
    t=css.read_text('utf-8',errors='ignore')
    base_css=urljoin(BASE,css.relative_to(OUT).as_posix())
    for q in re.findall(r'url\(([^)]+)\)',t,re.I):
        q=q.strip(' \\"\'')
        if q and not q.startswith(('data:','#')):
            save(urljoin(base_css,q))

portal=OUT/'js/modules/module-28-vat-v19291-family-portal.js'
if not portal.exists():
    raise SystemExit('Falta módulo Portal Familiar')

s=portal.read_text('utf-8')

# Reemplazar COMPLETA la función peligrosa, sin depender de coincidencia exacta del código viejo
start=s.find('async function directPublishPortalAccess(p){')
end=s.find('async function publishPortalAccess(p){',start)
if start<0 or end<0:
    raise SystemExit('No se encontró directPublishPortalAccess')

safe_direct = r'''async function directPublishPortalAccess(p){
 if(!p||!navigator.onLine||!window.VATCloud?.getClient)return false;
 try{
  const session=await waitForCloudSession(8000);if(!session)return false;
  const c=await window.VATCloud.getClient();

  // v2.3.4.24: consulta estrictamente dirigida al paciente actual.
  // Nunca descargar el padrón completo para publicar un portal.
  const curp=String(p?.curp||'').trim().toUpperCase();
  const ids=[p?._syncId,p?.id,p?.globalPatientId,p?.global_patient_id,p?.canonicalPatientId,p?.patientCanonicalId,curp?('curp-'+curp):'']
   .filter(v=>v!=null&&String(v).trim()!=='').map(String);

  const pullPatientRows=async()=>{
   if(!ids.length)return [];
   const {data:rows,error}=await c.from('sync_records')
    .select('record_id,entity,payload,version,updated_at,deleted,unit_id')
    .eq('entity','patients')
    .eq('deleted',false)
    .in('record_id',[...new Set(ids)])
    .limit(20);
   if(error)throw error;
   return Array.isArray(rows)?rows:[];
  };

  let list=await pullPatientRows();
  let remote=list.find(r=>samePatientRemote(r,p));

  if(!remote){
    const rid=String(p._syncId||p.id);
    const payload={...p};
    delete payload._syncState;delete payload._version;delete payload._updatedAt;
    const op={
      op_id:'portal-patient-'+Date.now(),
      entity:'patients',
      record_id:rid,
      base_version:0,
      payload,
      deleted:false,
      changed_at:new Date().toISOString(),
      device_id:localStorage.getItem('vat_cloud_device_id')||'portal-direct',
      origin:'portal_direct_publish'
    };
    const {data:push,error:pe}=await c.rpc('sync_push_records',{p_records:[op]});
    if(pe)throw pe;
    const rr=Array.isArray(push)?push[0]:null;

    if(rr?.ok){
      p._syncId=rid;
      p._version=Number(rr.new_version||1);
      p._updatedAt=rr.updated_at||new Date().toISOString();
      remote={record_id:rid,version:p._version,payload};
    }else{
      list=await pullPatientRows();
      remote=list.find(r=>samePatientRemote(r,p));
      if(!remote)return false;
    }
  }

  const rid=String(remote.record_id);
  const {data:pub,error:pubErr}=await c.rpc('family_portal_publish_access',{
    p_patient_record_id:rid,
    p_folio:String(p.portalPatientCode||''),
    p_token:String(p.portalAccessToken||''),
    p_code:String(p.portalAccessCode||''),
    p_active:p.portalAccessActive!==false,
    p_issued_at:p.portalAccessIssuedAt||new Date().toISOString()
  });
  if(pubErr)throw pubErr;
  if(!pub?.ok)return false;

  p.portalAccessPublishedAt=new Date().toISOString();
  window.save?.();
  return true;
 }catch(e){
  console.warn('Publicación estable Portal Familiar:',e);
  return false;
 }
}
'''

s=s[:start]+safe_direct+s[end:]

# Desactivar completamente la publicación masiva histórica
start=s.find('async function publishLegacyFamilyAccesses(){')
end=s.find('async function openStaff',start)
if start>=0 and end>start:
    s=s[:start]+"""async function publishLegacyFamilyAccesses(){
 // v2.3.4.24: desactivado deliberadamente para evitar egress masivo.
 return {ok:true,skipped:true,reason:'mass_publish_disabled'};
}
"""+s[end:]

# Eliminar cualquier scheduler antiguo de publicación masiva
start=s.find('let legacyPublishTimer=null;')
if start>=0:
    end=s.find('function init(){',start)
    if end>start:
        s=s[:start]+"// v2.3.4.24: sin publicación masiva al foco/reconexión/sync.\n\n"+s[end:]

# Quitar llamada automática al iniciar si aún existe
s=s.replace(
"if(familyRoute){ document.getElementById('app')?.classList.add('hidden'); document.getElementById('login')?.classList.add('hidden'); hashLogin(); } else { setTimeout(()=>publishLegacyFamilyAccesses(),0); }",
"if(familyRoute){ document.getElementById('app')?.classList.add('hidden'); document.getElementById('login')?.classList.add('hidden'); hashLogin(); } else { /* v2.3.4.24: sin publicación masiva */ }"
)

# Validaciones duras
segment=s[s.find('async function directPublishPortalAccess'):s.find('async function publishPortalAccess')]
if "p_since:'1970-01-01T00:00:00.000Z'" in segment:
    raise SystemExit('Persistió lectura completa dentro de Portal Familiar')
if 'scheduleLegacyPublish' in s:
    raise SystemExit('Persistió scheduler de publicación masiva')

portal.write_text(s,'utf-8')

# Cache/version
if sw.exists():
    t=sw.read_text('utf-8',errors='ignore')
    t=re.sub(r"const CACHE_NAME='[^']+';","const CACHE_NAME='vat-v2.3.4.24';",t,count=1)
    sw.write_text(t,'utf-8')

vp=OUT/'version.json'
if vp.exists():
    t=vp.read_text('utf-8',errors='ignore')
    vp.write_text(re.sub(r'2\.3\.4\.\d+','2.3.4.24',t),'utf-8')

print('OK recursos:',len(seen))
PY

test -f dist/index.html
test -f dist/js/modules/module-28-vat-v19291-family-portal.js

echo "VAT v2.3.4.24 lista"
