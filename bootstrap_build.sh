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
OUT=Path('dist'); seen=set()
def fetch(u):
    req=Request(u,headers={'User-Agent':'VAT-Netlify-Bootstrap/2.3.4.24'})
    with urlopen(req,timeout=30) as r:return r.read()
def save(u):
    u,_=urldefrag(u); p=urlparse(u)
    if p.netloc!=urlparse(BASE).netloc:return None
    path=p.path or '/'
    if path.endswith('/'):path+='index.html'
    rel=path.lstrip('/') or 'index.html'
    if rel in seen:return OUT/rel
    seen.add(rel)
    try:data=fetch(u)
    except Exception as e:
        print('WARN',u,e,file=sys.stderr); return None
    d=OUT/rel; d.parent.mkdir(parents=True,exist_ok=True); d.write_bytes(data); return d
class P(HTMLParser):
    def __init__(self):super().__init__();self.urls=[]
    def handle_starttag(self,t,a):
        d=dict(a)
        for k in ('src','href'):
            if d.get(k):self.urls.append(d[k])
idx=save(BASE)
if not idx:raise SystemExit('No se pudo descargar producción')
p=P();p.feed(idx.read_text('utf-8',errors='ignore'))
for u in p.urls:save(urljoin(BASE,u))
for u in ('service-worker.js','manifest.webmanifest','version.json','Vacunas_a_Tiempo.html'):save(urljoin(BASE,u))
sw=OUT/'service-worker.js'
if sw.exists():
    t=sw.read_text('utf-8',errors='ignore')
    for q in re.findall(r'''["'](\.?\.?/[^"'?#]+|[^"'?#]+\.(?:js|css|html|json|webmanifest|png|jpg|jpeg|svg|ico|webp))["']''',t,re.I):
        save(urljoin(BASE,q))
for css in list(OUT.rglob('*.css')):
    t=css.read_text('utf-8',errors='ignore'); b=urljoin(BASE,css.relative_to(OUT).as_posix())
    for q in re.findall(r'url\(([^)]+)\)',t,re.I):
        q=q.strip(' \\"\'')
        if q and not q.startswith(('data:','#')):save(urljoin(b,q))
portal=OUT/'js/modules/module-28-vat-v19291-family-portal.js'
if not portal.exists():raise SystemExit('Falta módulo Portal Familiar')
s=portal.read_text('utf-8')
old="""  if(syncApi?.isSyncing?.()){
   const until=Date.now()+7000;while(syncApi.isSyncing?.()&&Date.now()<until)await new Promise(r=>setTimeout(r,140));
  }
  try{syncApi?.captureChanges?.();if(syncApi?.runSync)await syncApi.runSync({automatic:true,reason:'portal_patient_base'})}catch(_e){}
  const pull=async()=>{const {data:rows,error}=await c.rpc('sync_pull_records',{p_since:'1970-01-01T00:00:00.000Z'});if(error)throw error;return Array.isArray(rows)?rows:[]};
  let list=await pull();
"""
new="""  const curp=String(p?.curp||'').trim().toUpperCase();
  const ids=[p?._syncId,p?.id,p?.globalPatientId,p?.global_patient_id,p?.canonicalPatientId,p?.patientCanonicalId,curp?('curp-'+curp):'']
   .filter(v=>v!=null&&String(v).trim()!=='').map(String);
  const pullPatientRows=async()=>{
   if(!ids.length)return [];
   const {data:rows,error}=await c.from('sync_records')
    .select('record_id,entity,payload,version,updated_at,deleted,unit_id')
    .eq('entity','patients').eq('deleted',false).in('record_id',[...new Set(ids)]).limit(20);
   if(error)throw error;return Array.isArray(rows)?rows:[];
  };
  let list=await pullPatientRows();
"""
if old not in s:raise SystemExit('Base pública inesperada; parche detenido')
s=s.replace(old,new,1)
s=s.replace('list=await pull();remote=list.find(r=>samePatientRemote(r,p));','list=await pullPatientRows();remote=list.find(r=>samePatientRemote(r,p));',1)
a=s.index('async function publishLegacyFamilyAccesses(){'); b=s.index('async function openStaff',a)
s=s[:a]+"""async function publishLegacyFamilyAccesses(){
 return {ok:true,skipped:true,reason:'mass_publish_disabled'};
}
"""+s[b:]
a=s.find('let legacyPublishTimer=null;')
if a!=-1:
    b=s.index('function init(){',a)
    s=s[:a]+"// v2.3.4.24: publicación masiva desactivada.\n\n"+s[b:]
s=s.replace("if(familyRoute){ document.getElementById('app')?.classList.add('hidden'); document.getElementById('login')?.classList.add('hidden'); hashLogin(); } else { setTimeout(()=>publishLegacyFamilyAccesses(),0); }","if(familyRoute){ document.getElementById('app')?.classList.add('hidden'); document.getElementById('login')?.classList.add('hidden'); hashLogin(); } else { /* v2.3.4.24 */ }")
seg=s[s.index('async function directPublishPortalAccess'):s.index('async function publishPortalAccess')]
if "p_since:'1970-01-01T00:00:00.000Z'" in seg or 'scheduleLegacyPublish' in s:raise SystemExit('Parche incompleto')
portal.write_text(s,'utf-8')
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
