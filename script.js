const DEFAULTS=[
  {tz:'Europe/Paris',name:'Central European Time',sub:'Paris, Berlin, Rome',tag:null},
  {tz:'Asia/Manila',name:'Philippines',sub:'Manila',tag:'PHT'},
  {tz:'Europe/London',name:'London',sub:'United Kingdom',tag:null}
];
function validTz(tz){try{new Intl.DateTimeFormat('en-GB',{timeZone:tz});return true;}catch(e){return false;}}
function mkZone(tz,fmt){
  fmt=fmt==='24'?'24':'12';
  const d=DEFAULTS.find(z=>z.tz===tz);if(d)return Object.assign({},d,{fmt:fmt});
  const seg=tz.split('/');
  return {tz:tz,name:seg[seg.length-1].replace(/_/g,' '),sub:seg.length>1?seg[0].replace(/_/g,' '):'',tag:null,fmt:fmt};
}
const START=['Asia/Manila','Europe/Paris'];
let ZONES=START.map(t=>mkZone(t));
try{
  const saved=JSON.parse(localStorage.getItem('tzp:zones')||'null');
  if(Array.isArray(saved)){const ok=saved.map(x=>typeof x==='string'?{tz:x}:x).filter(x=>x&&typeof x.tz==='string'&&validTz(x.tz));if(ok.length)ZONES=ok.map(x=>mkZone(x.tz,x.fmt));}
}catch(e){}
function saveZones(){try{localStorage.setItem('tzp:zones',JSON.stringify(ZONES.map(z=>({tz:z.tz,fmt:z.fmt}))));}catch(e){}}
const ALIAS={pht:'Asia/Manila',philippines:'Asia/Manila',cet:'Europe/Paris',cest:'Europe/Paris',gmt:'Europe/London',bst:'Europe/London',uk:'Europe/London',
  est:'America/New_York',edt:'America/New_York',cst:'America/Chicago',cdt:'America/Chicago',mst:'America/Denver',mdt:'America/Denver',
  pst:'America/Los_Angeles',pdt:'America/Los_Angeles',jst:'Asia/Tokyo',kst:'Asia/Seoul',ist:'Asia/Kolkata',sgt:'Asia/Singapore',
  hkt:'Asia/Hong_Kong',aest:'Australia/Sydney',aedt:'Australia/Sydney',nzst:'Pacific/Auckland',gst:'Asia/Dubai',utc:'UTC'};
const FALLBACK=['Europe/Paris','Europe/London','Europe/Berlin','Europe/Madrid','Europe/Rome','Asia/Manila','Asia/Tokyo','Asia/Singapore','Asia/Dubai','Asia/Kolkata','Asia/Hong_Kong','Asia/Seoul','Australia/Sydney','Pacific/Auckland','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Toronto','America/Sao_Paulo','Africa/Cairo','Africa/Johannesburg','UTC'];
let ALL=[];
try{ALL=Intl.supportedValuesOf('timeZone').slice();}catch(e){}
if(!ALL.length)ALL=FALLBACK;
if(ALL.indexOf('UTC')<0)ALL.push('UTC');
function resolveTz(q){
  q=q.trim();if(!q)return null;
  const k=q.toLowerCase().replace(/\s+/g,'_');
  if(ALIAS[k])return ALIAS[k];
  let hit=ALL.find(t=>t.toLowerCase()===k);if(hit)return hit;
  hit=ALL.find(t=>t.split('/').pop().toLowerCase()===k);if(hit)return hit;
  hit=ALL.find(t=>t.toLowerCase().indexOf(k)>=0);if(hit)return hit;
  return validTz(q)?q:null;
}
const HOUR=3600000;
const fmtCache={};
function dtf(tz,opts){const k=tz+JSON.stringify(opts);return fmtCache[k]||(fmtCache[k]=new Intl.DateTimeFormat('en-GB',Object.assign({timeZone:tz},opts)));}
function parts(ms,tz){
  const o={};
  dtf(tz,{hourCycle:'h23',weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'short'})
    .formatToParts(new Date(ms)).forEach(p=>o[p.type]=p.value);
  o.h=parseInt(o.hour,10);o.m=o.minute;o.s=o.second;
  return o;
}
// Offset in minutes between a zone's clock time and UTC at a given moment
function offMin(ms,tz){
  const o={};
  dtf(tz,{hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric'})
    .formatToParts(new Date(ms)).forEach(p=>o[p.type]=p.value);
  return Math.round((Date.UTC(+o.year,+o.month-1,+o.day,+o.hour,+o.minute,+o.second)-Math.floor(ms/1000)*1000)/60000);
}
const p2=n=>String(n).padStart(2,'0');
// +7, -1, 0, +5:30 ... difference versus the top (reference) row
function fmtOff(min){
  if(min===0)return '0';
  const a=Math.abs(min),h=Math.floor(a/60),m=a%60;
  return (min>0?'+':'-')+h+(m?':'+p2(m):'');
}
const HOME_SVG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 12h3v8h5v-5h4v5h5v-8h3z"/></svg>';
function h12(h){return {n:h%12===0?12:h%12,ap:h<12?'am':'pm'};}

const $=id=>document.getElementById(id);
let selMs=null, anchor=floorHour(Date.now())-6*HOUR;
function floorHour(ms){return Math.floor(ms/HOUR)*HOUR;}

function timeStr(P,mode,secs){
  const s=secs?':'+P.s:'';
  if(mode==='12'){const t=h12(P.h);return t.n+':'+P.m+s+' '+t.ap.toUpperCase();}
  return p2(P.h)+':'+P.m+s;
}
function altStr(P,mode,secs){
  const s=secs?':'+P.s:'';
  if(mode==='12')return p2(P.h)+P.m+(secs?P.s:'')+' hrs';
  if(mode==='24')return h12(P.h).n+':'+P.m+s+' '+h12(P.h).ap.toUpperCase();
  return h12(P.h).n+':'+P.m+s+' '+h12(P.h).ap.toUpperCase();
}
function cellLabel(P,mode){
  if(mode==='12'){const t=h12(P.h);return ['<b>'+t.n+'</b>','<i>'+t.ap+'</i>'];}
  return ['<b>'+p2(P.h)+'</b>','<i>:00</i>'];
}
function segHtml(cur){
  return [['12','12h','12-hour (6:00 PM)'],['24','24h','24-hour (18:00)']]
    .map(a=>'<button data-f="'+a[0]+'" class="'+(a[0]===cur?'on':'')+'" title="'+a[2]+'">'+a[1]+'</button>').join('');
}
function cls(h){return (h<6||h>=22)?'night':(h>=9&&h<18)?'work':'edge';}

function render(){
  if(dragging)return;
  const mode='12', both=false, secs=false;
  const live=selMs===null, ref=live?Date.now():selMs;
  if(live){const a=floorHour(ref)-6*HOUR;if(a!==anchor)anchor=a;}
  const refCell=Math.floor((ref-anchor)/HOUR);
  const rows=$('rows');
  const homeOff=offMin(ref,ZONES[0].tz);
  let html='<table class="tz"><tbody>';
  ZONES.forEach((z,i)=>{
    const P=parts(ref,z.tz), abbr=z.tag||P.timeZoneName, zm=z.fmt||mode;
    const offTitle=i===0?'Reference time zone (top row)':'Hours ahead (+) or behind (-) '+ZONES[0].name;
    const offHtml=i===0?HOME_SVG:fmtOff(offMin(ref,z.tz)-homeOff);
    const dragBtn='<button class="drag" title="Drag to reorder (or focus and use the Up/Down arrow keys)" aria-label="Reorder '+z.name+'">\u22ee\u22ee</button>';
    const rmBtn=ZONES.length>1?'<button class="rm" data-i="'+i+'" title="Remove" aria-label="Remove '+z.name+'">\u00d7</button>':'';
    html+='<tr data-i="'+i+'"><th class="lab"><div class="lw"><div class="ctl"><div class="stack">'+rmBtn+dragBtn+'</div><div class="off" title="'+offTitle+'">'+offHtml+'</div></div><div class="info"><div><div class="name">'+z.name+'<span class="tag">'+abbr+'</span></div><div class="sub">'+z.sub+'</div><div class="seg" data-i="'+i+'">'+segHtml(zm)+'</div></div><div class="clock"><div class="t">'+timeStr(P,zm,secs)+'</div>'+(both?'<div class="alt">'+altStr(P,zm,secs)+'</div>':'')+'<div class="sub">'+P.weekday+', '+P.month+' '+P.day+'</div></div></div></div></th>';
    for(let c=0;c<24;c++){
      const ms=anchor+c*HOUR, Q=parts(ms,z.tz), L=cellLabel(Q,zm);
      const dayLbl=(Q.h===0||c===0)?Q.month+' '+Q.day:'';
      const sel=c===refCell?' sel'+(i===0?' t':'')+(i===ZONES.length-1?' b':''):'';
      html+='<td class="cell '+cls(Q.h)+sel+'" data-ms="'+ms+'" title="'+timeStr(Q,'24',false)+' '+abbr+'"><em>'+dayLbl+'</em>'+L[0]+L[1]+'</td>';
    }
    html+='</tr>';
  });
  rows.innerHTML=html+'</tbody></table>';
  $('hint').textContent=live
    ?'Live mode. Click any column to highlight the same moment across all zones. Drag the \u22ee\u22ee handle to reorder rows.'
    :'Showing a fixed moment. Press Back to live to return to the current time.';
}

let dragging=false;
$('rows').addEventListener('pointerdown',e=>{
  const h=e.target.closest('.drag');if(!h)return;
  e.preventDefault();
  const tbody=$('rows').querySelector('tbody'),row=h.closest('tr');
  dragging=true;row.classList.add('dragging');document.body.classList.add('dragging');
  const move=ev=>{
    const rs=Array.from(tbody.children);
    for(const r of rs){
      if(r===row)continue;
      const b=r.getBoundingClientRect();
      if(ev.clientY>b.top&&ev.clientY<b.bottom){
        tbody.insertBefore(row,ev.clientY<b.top+b.height/2?r:r.nextSibling);break;
      }
    }
  };
  const up=()=>{
    document.removeEventListener('pointermove',move);
    document.removeEventListener('pointerup',up);
    document.removeEventListener('pointercancel',up);
    const order=Array.from(tbody.children).map(r=>parseInt(r.dataset.i,10));
    ZONES=order.map(i=>ZONES[i]);
    dragging=false;document.body.classList.remove('dragging');saveZones();render();
  };
  document.addEventListener('pointermove',move);
  document.addEventListener('pointerup',up);
  document.addEventListener('pointercancel',up);
});
$('rows').addEventListener('keydown',e=>{
  const h=e.target.closest('.drag');if(!h)return;
  if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;
  e.preventDefault();
  const i=parseInt(h.closest('tr').dataset.i,10),j=i+(e.key==='ArrowUp'?-1:1);
  if(j<0||j>=ZONES.length)return;
  const z=ZONES.splice(i,1)[0];ZONES.splice(j,0,z);saveZones();render();
  const nh=$('rows').querySelector('tr[data-i="'+j+'"] .drag');if(nh)nh.focus();
});
$('tzlist').innerHTML=ALL.map(t=>'<option value="'+t+'">').join('');
function addZone(){
  const msg=$('msg'),tz=resolveTz($('tzin').value);
  if(!tz){msg.textContent='Time zone not found. Try a city such as Tokyo or New York, or a name like Asia/Tokyo.';return;}
  if(ZONES.some(z=>z.tz===tz)){msg.textContent='That time zone is already in the table.';return;}
  ZONES.push(mkZone(tz));saveZones();$('tzin').value='';msg.textContent='';render();
}
$('add').addEventListener('click',addZone);
$('tzin').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addZone();}});
$('rows').addEventListener('click',e=>{
  const g=e.target.closest('.seg button');
  if(g){ZONES[parseInt(g.parentNode.dataset.i,10)].fmt=g.dataset.f;saveZones();render();return;}
  const r=e.target.closest('.rm');
  if(r&&ZONES.length>1){ZONES.splice(parseInt(r.dataset.i,10),1);saveZones();render();}
});
$('rows').addEventListener('click',e=>{
  const c=e.target.closest('.cell');if(!c)return;
  selMs=parseInt(c.dataset.ms,10);render();
});
$('now').addEventListener('click',()=>{selMs=null;anchor=floorHour(Date.now())-6*HOUR;$('date').value='';render();});
$('date').addEventListener('change',e=>{
  if(!e.target.value)return;
  const [y,m,d]=e.target.value.split('-').map(Number);
  selMs=Date.UTC(y,m-1,d,12,0,0);anchor=floorHour(selMs)-6*HOUR;render();
});
render();
setInterval(()=>{if(selMs===null)render();},1000);
