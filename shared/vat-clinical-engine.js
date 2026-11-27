/* Shared clinical engine extracted from Vacunas a Tiempo Motor de Vacunación 2026.
   Family UI passes trusted vaccination records explicitly; no professional data is modified here. */
(function(global){
  'use strict';
  const VERSION='2026-1.6.2-shared';

  const RULES=[
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

  function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
  function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
  function age(birth,onDate=today()){
    const b=new Date(birth+'T12:00:00'),d=new Date(onDate+'T12:00:00');if(!birth||isNaN(b)||d<b)return null;
    let years=d.getFullYear()-b.getFullYear(),months=d.getMonth()-b.getMonth(),days=d.getDate()-b.getDate();
    if(days<0){months--;const prev=new Date(d.getFullYear(),d.getMonth(),0);days+=prev.getDate()}
    if(months<0){years--;months+=12}
    const totalDays=Math.floor((d-b)/86400000),totalMonths=years*12+months+days/30.4375;
    return{years,months,days,totalDays,totalMonths,label:(years?years+' año'+(years===1?'':'s')+' ':'')+(months?months+' mes'+(months===1?'':'es')+' ':'')+days+' día'+(days===1?'':'s')};
  }
  function applies(rule,birth){if(rule.bornFrom&&birth<rule.bornFrom)return false;if(rule.bornBefore&&birth>=rule.bornBefore)return false;return true}
  function matches(app,rule){const n=norm(app.vaccine);return !!n&&rule.aliases.some(a=>n.includes(norm(a))||norm(a).includes(n))}
  function doseNumber(app){const t=norm(app.dose),m=t.match(/(^|\s)([1-9])(a|ra|da|dosis)?(\s|$)/);if(m)return Number(m[2]);if(/primera|1ra|1a/.test(t))return 1;if(/segunda|2da|2a/.test(t))return 2;if(/tercera|3ra|3a/.test(t))return 3;if(/refuerzo/.test(t))return 99;return null}
  function completion(rule,apps,rules){
    const matched=apps.filter(a=>matches(a,rule)&&a.date).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
    if(!matched.length)return{complete:false,application:null,matchMode:'none'};
    const explicit=matched.find(a=>{const dn=doseNumber(a);if(rule.dose.includes('1ª'))return dn===1;if(rule.dose.includes('2ª'))return dn===2;if(rule.dose.includes('3ª'))return dn===3;if(/refuerzo/i.test(rule.dose))return dn===99;if(/Única/i.test(rule.dose))return dn===null||dn===1;return false});
    if(explicit)return{complete:true,application:explicit,matchMode:'explicit'};
    const ordered=rules.filter(r=>r.vaccine===rule.vaccine).sort((a,b)=>a.dueMonths-b.dueMonths);
    const index=ordered.findIndex(r=>r.id===rule.id);
    return matched.length>index?{complete:true,application:matched[index]||matched[matched.length-1],matchMode:'sequence'}:{complete:false,application:null,matchMode:'none'};
  }
  function addMonths(dateText,months){const d=new Date(dateText+'T12:00:00');if(!dateText||isNaN(d))return null;const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+months);const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,last));return d}
  function iso(d){if(!d||isNaN(d))return'';return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
  function dayDiff(a,b){const x=new Date(a+'T12:00:00'),y=new Date(b+'T12:00:00');if(isNaN(x)||isNaN(y))return null;return Math.round((y-x)/86400000)}
  function outside(rule,birth,onDate){if(!rule.maxAgeMonthsExclusive)return false;const limit=addMonths(birth,rule.maxAgeMonthsExclusive),current=new Date(onDate+'T12:00:00');return !!limit&&!isNaN(current)&&current>=limit}
  function timing(rule,birth,onDate){
    const target=addMonths(birth,rule.dueMonths),minimum=addMonths(birth,rule.minMonths??rule.dueMonths),maximum=rule.maxAgeMonthsExclusive?addMonths(birth,rule.maxAgeMonthsExclusive):null;
    const targetDate=iso(target),minimumDate=iso(minimum),maximumExclusiveDate=iso(maximum),daysToTarget=targetDate?dayDiff(onDate,targetDate):null;
    return{targetDate,minimumDate,maximumExclusiveDate,daysToTarget};
  }
  function dedupe(apps){
    const seen=new Set();return (apps||[]).filter(a=>{const k=[norm(a.vaccine),norm(a.dose),a.date||'',String(a.lot||'').toUpperCase()].join('|');if(seen.has(k))return false;seen.add(k);return true});
  }
  function evaluate({birth,vaccinations=[],onDate=today()}={}){
    const a=age(birth,onDate);if(!a)return{age:null,items:[],counts:{complete:0,due:0,upcoming:0,future:0,special:0,outOfTime:0},level:'Sin datos',nextDose:null,progressPercent:0};
    const apps=dedupe(vaccinations),rules=RULES.filter(r=>applies(r,birth));
    const items=rules.map(rule=>{
      const c=completion(rule,apps,rules),application=c.application;
      let status='future',label='Más adelante',action='Programar según edad.',reason='';
      if(c.complete){status='complete';label='Registrada';action='Sin acción: dosis registrada.'}
      else if(outside(rule,birth,onDate)){status='out_of_time';label='Fuera de tiempo · límite '+(rule.maxAgeLabel||'de edad');reason=rule.outsideReason||'';action=rule.outsideAction||'No aplicar.'}
      else if(a.totalMonths>=rule.dueMonths){status=rule.kind==='special'?'special':'due';label=rule.kind==='special'?'Revisar criterio especial':'Pendiente ahora';action=rule.kind==='special'?'Confirmar criterio institucional.':'Acude con tu cartilla a tu unidad de salud.'}
      else if(rule.dueMonths-a.totalMonths<=1){status='upcoming';label='Próxima';action='Prepárate para la próxima dosis.'}
      const t=timing(rule,birth,onDate);
      return{...rule,...t,status,label,reason,action,application,monthsToDue:rule.dueMonths-a.totalMonths};
    });
    const counts={complete:items.filter(x=>x.status==='complete').length,due:items.filter(x=>x.status==='due').length,upcoming:items.filter(x=>x.status==='upcoming').length,future:items.filter(x=>x.status==='future').length,special:items.filter(x=>x.status==='special').length,outOfTime:items.filter(x=>x.status==='out_of_time').length};
    const progressTotal=items.filter(x=>x.status!=='future').length,progressPercent=progressTotal?Math.round((counts.complete/progressTotal)*100):0;
    const nextDose=items.filter(x=>['due','special','upcoming','future'].includes(x.status)).sort((x,y)=>(x.minimumDate||x.targetDate||'9999').localeCompare(y.minimumDate||y.targetDate||'9999'))[0]||null;
    const level=counts.due>=4?'Requiere revisión':counts.due?'Hay vacunas pendientes':counts.upcoming?'Próxima vacuna cercana':'Al corriente';
    return{age:a,items,counts,level,nextDose,progressPercent,onDate,version:VERSION};
  }

  global.VATClinicalEngine={VERSION,RULES,evaluate,age,today};
})(window);
