(function(){
"use strict";
const HOL=new Set(["2026-01-01","2026-01-02","2026-01-07","2026-03-08","2026-04-21","2026-05-01","2026-05-09","2026-07-03","2026-11-07","2026-12-25",
"2027-01-01","2027-01-02","2027-01-07","2027-03-08","2027-05-01","2027-05-09","2027-05-11","2027-07-03","2027-11-07","2027-12-25",
"2028-01-01","2028-01-02","2028-01-07","2028-03-08","2028-04-25","2028-05-01","2028-05-09","2028-07-03","2028-11-07","2028-12-25"]);
const D=s=>{const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d,12)};
const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const fmt=d=>String(d.getDate()).padStart(2,"0")+"."+String(d.getMonth()+1).padStart(2,"0")+"."+d.getFullYear();
const dm=d=>d.getFullYear()===new Date().getFullYear()?fmt(d).slice(0,5):fmt(d).slice(0,6)+String(d.getFullYear()).slice(2);
const WD=["вс","пн","вт","ср","чт","пт","сб"];
const MON=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const addD=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const addM=(d,n)=>{const x=new Date(d);x.setMonth(x.getMonth()+n);return x};
const isOff=d=>d.getDay()===0||d.getDay()===6||HOL.has(iso(d));
const prevWork=d=>{let x=new Date(d);while(isOff(x))x=addD(x,-1);return x};
const addWork=(d,n)=>{let x=new Date(d),k=0;while(k<n){x=addD(x,1);if(!isOff(x))k++}return x};
const now=new Date();const TODAY=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);
const diff=d=>Math.round((d-TODAY)/864e5);
const H={D,addD,addM,addWork,prevWork,fmt,TODAY};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const plural=(n,a,b,c)=>{n=Math.abs(n)%100;const m=n%10;if(n>10&&n<20)return c;if(m>1&&m<5)return b;if(m===1)return a;return c};
const days=n=>n+" "+plural(n,"день","дня","дней");

// ---------- state (тот же ключ, что и раньше — отметки сохраняются) ----------
const KEY="kv-sroki-v2";
const blank=()=>({inp:{akt:"",notary:"",ipreg:"",policy:"",family:""},done:Object.assign({},window.DEFAULT_DONE)});
let S=blank();
try{const r=localStorage.getItem(KEY);if(r){const p=JSON.parse(r);S.inp=Object.assign(S.inp,p.inp||{});S.done=Object.assign({},window.DEFAULT_DONE,p.done||{})}}catch(e){}
// перенос с другого устройства: #s=<base64>
if(location.hash.startsWith("#s=")){
  try{const p=JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(3)))));
    S.inp=Object.assign(S.inp,p.inp||{});S.done=Object.assign(S.done,p.done||{});
    setTimeout(()=>toast("Отметки перенесены на это устройство"),300);}catch(e){}
  history.replaceState(null,"",location.pathname+location.search);
}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
save();

// ---------- clauses ----------
const DOC={};window.DOCS.forEach(d=>DOC[d.id]=d);
const CL={};window.CLAUSES.forEach(([doc,n,txt])=>{CL[doc+":"+n]={doc,n,txt}});
const cid=k=>"c-"+k.replace(/[^a-zA-Zа-яА-Я0-9]+/g,"-");
const refLabel=k=>{const c=CL[k];if(!c)return k;const n=/^\d/.test(c.n)?"п. "+c.n:c.n;return DOC[c.doc].short+", "+n};

// ---------- items ----------
function norm(e){ // основная дата для сортировки и календаря
  e.main=e.rec||e.dl||e.d||null;
  return e;
}
function status(e){
  if(S.done[e.id])return"done";
  if(e.dl&&diff(e.dl)<0)return"overdue";
  if(!e.dl&&e.d&&!e.rec&&diff(e.d)<0)return"overdue";
  if(e.rec&&diff(e.rec)<0)return"late";
  if(!e.main)return"nodate";
  const n=Math.min(...[e.rec,e.dl,e.d].filter(Boolean).map(x=>diff(x)).filter(x=>x>=0));
  if(n<=7)return"soon";
  return"upcoming";
}
const ST={overdue:"просрочено",late:"позже рекомендованного",soon:"скоро",done:"сделано",upcoming:"впереди",nodate:"без срока"};
function rel(d){const n=diff(d);if(n===0)return"сегодня";if(n>0)return"через "+days(n);return days(-n)+" назад"}
function gcal(title,d,det){
  const a=iso(d).replace(/-/g,""),b=iso(addD(d,1)).replace(/-/g,"");
  return"https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent(title)+"&dates="+a+"/"+b+"&details="+encodeURIComponent(det);
}
function whenHTML(e){
  const row=(cls,lab,d)=>`<div class="wrow ${cls}"><span class="wl">${lab}</span><span class="date">${dm(d)}</span><span class="wd">${WD[d.getDay()]}${isOff(d)?" · вых.":""}</span></div>`;
  let h="";
  if(e.d)h+=row("wd-d",e.done?"":"",e.d);
  if(e.rec&&!(e.d&&+e.d===+e.rec))h+=row("wd-rec","рекоменд.",e.rec);
  if(e.dl)h+=row("wd-dl","крайний",e.dl);
  return h||`<div class="wrow"><span class="wd">без срока</span></div>`;
}
function evHTML(e,showPhase){
  const refs=(e.refs||[]).map(k=>`<a class="ref" href="#${cid(k)}" data-ref="${k}">${esc(refLabel(k))}</a>`).join("");
  const cal=[];
  if(e.rec&&!S.done[e.id])cal.push(`<a class="gcal" href="${gcal("Рекомендуем: "+e.t,e.rec,e.note||"")}" target="_blank" rel="noopener">+ рекомендуемый в Google Календарь</a>`);
  if(e.dl&&!S.done[e.id])cal.push(`<a class="gcal" href="${gcal("Крайний срок: "+e.t,e.dl,[e.pen&&("Санкция: "+e.pen),e.note].filter(Boolean).join("\n"))}" target="_blank" rel="noopener">+ крайний в Google Календарь</a>`);
  const det=[e.pen&&`<p><span class="k">Санкция:</span> ${esc(e.pen)}</p>`,e.note&&`<p>${esc(e.note)}</p>`,cal.length&&`<p class="cals">${cal.join("")}</p>`].filter(Boolean).join("");
  const ph=showPhase?`<span class="pill p-ph">${esc(PH[e.ph].t)}</span>`:"";
  const rl=e.dl&&!S.done[e.id]&&diff(e.dl)>=0&&diff(e.dl)<=120?`<span class="pill p-left">до крайнего ${rel(e.dl).replace("через ","")}</span>`:"";
  return `<div class="card ev ${e.st}">
    <input type="checkbox" data-id="${e.id}" ${S.done[e.id]?"checked":""} aria-label="Сделано: ${esc(e.t)}">
    <div class="when">${whenHTML(e)}</div>
    <div class="body"><div class="t">${esc(e.t)}</div>
      <div class="meta">${e.st==="nodate"?"":`<span class="pill p-${e.st}">${ST[e.st]}</span>`}${rl}${e.crit?'<span class="pill p-crit">санкции банка</span>':""}${e.est?'<span class="pill p-est">дата ориентировочная</span>':""}${ph}</div>
      ${refs?`<div class="refs">${refs}</div>`:""}
      ${det?`<details><summary>Подробнее</summary><div class="det">${det}</div></details>`:""}
    </div></div>`;
}
let PH={},IT=[],PAY=[],VIEW="phases",FILTER="active",VM=null;
window.PHASES.forEach((p,i)=>{PH[p.id]=p;p.n=i+1});
function build(){
  IT=window.buildItems(S,H).map(norm);
  IT.forEach(e=>e.st=status(e));
  PAY=[];let p=new Date(TODAY.getFullYear(),TODAY.getMonth(),2,12);if(p<TODAY)p=addM(p,1);
  for(let i=0;i<36;i++){const d=addM(p,i);const e=norm({id:"pay"+iso(d),dl:d,ph:"p9",pay:1,t:"Платёж по кредиту (до 2-го числа)",pen:"0,03% в день",refs:["kd:1.3","kd:3.2.1"]});e.st=status(e);PAY.push(e)}
}
const byDate=(a,b)=>(a.main?a.main:new Date(9e15))-(b.main?b.main:new Date(9e15));
function renderPhases(){
  return window.PHASES.map(p=>{
    const its=IT.filter(e=>e.ph===p.id).sort(byDate);
    const dn=its.filter(e=>e.st==="done").length,tot=its.length,od=its.some(e=>e.st==="overdue"),all=dn===tot;
    return `<details class="phase card" id="ph-${p.id}" ${all?"":"open"}><summary><span class="pt"><span class="pn">${p.n}</span>${esc(p.t)}</span><span class="pc ${od?"p-overdue":all?"p-done":""}">${dn} / ${tot}</span>
      <span class="bar"><i style="width:${Math.round(dn/tot*100)}%"></i></span></summary><div class="list">${its.map(e=>evHTML(e,false)).join("")}</div></details>`;
  }).join("");
}
function renderTimeline(){
  let ev=IT.filter(e=>e.main).concat(PAY.filter(e=>diff(e.main)<=40));
  ev=ev.filter(e=>FILTER==="all"?true:FILTER==="done"?e.st==="done":e.st!=="done"&&diff(e.main)<400).sort(byDate);
  const g={overdue:[],late:[],soon:[],upcoming:[],done:[]};ev.forEach(e=>g[e.st]&&g[e.st].push(e));
  const T={overdue:"Просрочено",late:"Позже рекомендованного",soon:"Ближайшие 7 дней",upcoming:"Впереди",done:"Сделано"};
  let h="";Object.keys(T).forEach(k=>{if(g[k].length)h+=`<div class="groupt">${T[k]} · ${g[k].length}</div><div class="list">${g[k].map(e=>evHTML(e,true)).join("")}</div>`});
  return h||'<div class="card">Пусто. Переключите фильтр.</div>';
}
function renderMain(){
  document.getElementById("filters").style.display=VIEW==="timeline"?"inline-flex":"none";
  document.getElementById("list").innerHTML=VIEW==="phases"?renderPhases():renderTimeline();
  const all=IT.length,dn=IT.filter(e=>e.st==="done").length;
  const seg=window.PHASES.map(p=>{const its=IT.filter(e=>e.ph===p.id),d2=its.filter(e=>e.st==="done").length,od=its.some(e=>e.st==="overdue");
    return `<a href="#ph-${p.id}" class="${d2===its.length?"full":""} ${od?"bad":""}" title="${p.n}. ${esc(p.t)}: ${d2} из ${its.length}"><i style="width:${Math.round(d2/its.length*100)}%"></i></a>`}).join("");
  document.getElementById("total").innerHTML=`<div class="totline"><span>Сделано <b>${dn}</b> из ${all} пунктов</span><span class="hint">10 этапов, от договора до закрытия кредита</span></div><div class="prog">${seg}</div>`;
}
function renderHero(){
  const h=document.getElementById("hero");
  const main=IT.find(e=>e.id==="a6"), sign=IT.find(e=>e.id==="a4");
  let head,sub="";
  if(main&&main.st!=="done"&&main.dl){
    head=`До регистрации ипотеки <span class="n">${days(diff(main.dl))}</span>`;
    const r=sign&&sign.st!=="done"&&sign.rec;
    sub=`Крайний срок — <b>${fmt(main.dl)}</b>, ${WD[main.dl.getDay()]}.`+(r?` Рекомендуем подписать в БТИ до <b>${fmt(sign.rec)}</b> — это ${days(diff(sign.rec))} с запасом.`:"")+` После крайнего срока банк вправе потребовать досрочного погашения.`;
  } else {
    const c=IT.filter(e=>e.crit&&e.dl&&e.st!=="done"&&diff(e.dl)>=0).sort((a,b)=>a.dl-b.dl)[0];
    head=c?`${esc(c.t)}: <span class="n">${days(diff(c.dl))}</span>`:"Банковские сроки закрыты";
  }
  const next=IT.filter(e=>e.main&&e.st!=="done"&&diff(e.main)>=0).sort(byDate).slice(0,3);
  const nx=next.map(e=>`<div class="nx ${e.crit?"crit":""} ${e.st}"><span class="when">${e.rec?"рекоменд. ":e.dl?"крайний ":""}${dm(e.main)} · ${WD[e.main.getDay()]} · ${rel(e.main)}</span><span class="t">${esc(e.t)}</span></div>`).join("");
  const T0=D("2026-08-20"),T1=addD(D("2026-12-24"),18),span=T1-T0,pos=d=>Math.max(0,Math.min(100,(d-T0)/span*100));
  const short={c1:"Договор с УКС",c2:"Кредит",c3b:"Ввод дома",c6:"Право собств.",k0:"Приёмка",k2:"Акт",a4:"Ипотека в БТИ",a8:"Полис"};
  const ks=Object.keys(short).map(id=>IT.find(e=>e.id===id)).filter(e=>e&&e.main&&e.main>=T0&&e.main<=T1).sort(byDate);
  let t=`<div class="tl-axis"></div><div class="tl-past" style="width:${pos(TODAY)}%"></div>`;
  ["2026-09-01","2026-10-01","2026-11-01","2026-12-01","2027-01-01"].forEach(m=>{const d=D(m);if(d<=T1)t+=`<span class="tl-tick" style="left:${pos(d)}%">${MON[d.getMonth()].slice(0,3).toLowerCase()}</span>`});
  ks.forEach((e,i)=>{const x=pos(e.main),al=x<6?"l":x>94?"r":"";
    t+=`<i class="tl-n ${e.st==="done"?"done":""} ${e.crit?"crit":""} ${e.rec?"rec":""}" style="left:${x}%" title="${esc(e.t)}"></i><span class="tl-lab ${i%2?"dn":"up"} ${al}" style="left:${x}%"><b>${dm(e.main)}</b>${short[e.id]}</span>`});
  if(main&&main.dl&&main.dl<=T1)t+=`<span class="tl-flag" style="left:${pos(main.dl)}%"><span>${dm(main.dl)} крайний срок</span></span>`;
  t+=`<span class="tl-today" style="left:${pos(TODAY)}%"><span>сегодня</span></span>`;
  h.innerHTML=`<h1>${head}</h1><p class="sub">${sub}</p><div class="tl" aria-label="Путь от договора до ипотеки"><div class="tl-in">${t}</div></div><div class="next">${nx}</div>`;
  const tl=h.querySelector(".tl"),tin=h.querySelector(".tl-in");if(tl.scrollWidth>tl.clientWidth)tl.scrollLeft=tin.offsetWidth*pos(TODAY)/100-tl.clientWidth*0.55;
  const od=IT.filter(e=>e.st==="overdue"),a=document.getElementById("alert");
  if(od.length){a.style.display="block";a.innerHTML="<b>Просрочено: "+od.length+"</b> — "+od.map(e=>esc(e.t)+" ("+fmt(e.dl||e.d)+")").join("; ")+". Если уже сделано, отметьте пункт.";}else a.style.display="none";
}
function calEntries(){
  const out=[];
  IT.concat(PAY).forEach(e=>{
    if(e.d)out.push({d:e.d,e,kind:"d"});
    if(e.rec&&!(e.d&&+e.d===+e.rec))out.push({d:e.rec,e,kind:"rec"});
    if(e.dl)out.push({d:e.dl,e,kind:"dl"});
  });return out;
}
function renderCal(){
  if(!VM)VM=new Date(TODAY.getFullYear(),TODAY.getMonth(),1,12);
  document.getElementById("mlabel").textContent=MON[VM.getMonth()]+" "+VM.getFullYear();
  const by={};calEntries().forEach(x=>{(by[iso(x.d)]=by[iso(x.d)]||[]).push(x)});
  const start=addD(VM,-((VM.getDay()+6)%7));
  let h=["пн","вт","ср","чт","пт","сб","вс"].map(x=>`<div class="dow">${x}</div>`).join("");
  for(let i=0;i<42;i++){const d=addD(start,i),k=iso(d),es=by[k]||[];
    const cls=["day",d.getMonth()!==VM.getMonth()?"out":"",k===iso(TODAY)?"today":"",isOff(d)?"hol":""].join(" ");
    h+=`<button class="${cls}" data-day="${k}" aria-label="${fmt(d)}${es.length?", пунктов: "+es.length:""}"><span class="n">${d.getDate()}</span><span class="dots">${es.map(x=>`<i class="dot d-${x.e.st} k-${x.kind}"></i>`).join("")}</span></button>`;}
  document.getElementById("cal").innerHTML=h;
}
function showDay(k){
  const es=calEntries().filter(x=>iso(x.d)===k);const p=document.getElementById("daypanel");
  p.style.display="block";p.dataset.k=k;
  const seen=new Set();const list=es.filter(x=>!seen.has(x.e.id)&&seen.add(x.e.id)).map(x=>evHTML(x.e,true)).join("");
  p.innerHTML=`<div class="groupt">${fmt(D(k))}${isOff(D(k))?" · выходной":""}</div>`+(list?`<div class="list">${list}</div>`:'<div class="hint">Пунктов нет.</div>');
}
function renderClauses(){
  const used={};IT.concat(PAY.slice(0,1)).forEach(e=>(e.refs||[]).forEach(k=>{(used[k]=used[k]||[]).push(e.t)}));
  document.getElementById("clauses").innerHTML=window.DOCS.map(d=>{
    const cs=window.CLAUSES.filter(c=>c[0]===d.id);if(!cs.length)return"";
    return `<details class="doc" id="doc-${d.id}" ${d.id==="ds"||d.id==="kd"?"open":""}><summary>${esc(d.t)} <span class="hint">· ${cs.length}</span></summary>`+
      cs.map(([doc,n,txt])=>{const k=doc+":"+n,u=used[k]||[];const lab=/^\d/.test(n)?"п. "+n:n;
        return `<div class="clause" id="${cid(k)}"><div class="cn">${esc(lab)}</div><div class="ct">${esc(txt)}${u.length?`<div class="cu">Связано: ${u.slice(0,3).map(esc).join(" · ")}${u.length>3?" и ещё "+(u.length-3):""}</div>`:""}</div></div>`}).join("")+`</details>`;
  }).join("");
}
function openRef(hash){
  if(!hash||!hash.startsWith("#c-"))return;
  const el=document.getElementById(hash.slice(1));if(!el)return;
  const det=el.closest("details");if(det)det.open=true;
  el.classList.remove("flash");void el.offsetWidth;el.classList.add("flash");
  el.scrollIntoView({block:"center",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
}
function renderAll(){build();renderHero();renderMain();renderCal();renderClauses();const p=document.getElementById("daypanel");if(p.style.display==="block"&&p.dataset.k)showDay(p.dataset.k)}

function ics(){
  const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//kv-sroki//RU","CALSCALE:GREGORIAN","X-WR-CALNAME:Квартира — сроки"];
  const stamp=new Date().toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
  const f=s=>s.replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n");
  const ev=(uid,d,sum,desc,alarms)=>{L.push("BEGIN:VEVENT","UID:"+uid+"@kv-sroki","DTSTAMP:"+stamp,"DTSTART;VALUE=DATE:"+iso(d).replace(/-/g,""),"DTEND;VALUE=DATE:"+iso(addD(d,1)).replace(/-/g,""),"SUMMARY:"+f(sum),"DESCRIPTION:"+f(desc));
    alarms.forEach(a=>L.push("BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:"+f(sum),"TRIGGER:"+a,"END:VALARM"));L.push("END:VEVENT")};
  IT.filter(e=>e.st!=="done").forEach(e=>{
    const refs=(e.refs||[]).map(refLabel).join("; ");
    const desc=[refs&&("Основание: "+refs),e.pen&&("Санкция: "+e.pen),e.note].filter(Boolean).join("\n");
    if(e.rec&&diff(e.rec)>=0)ev(e.id+"-rec-"+iso(e.rec),e.rec,"Рекомендуем: "+e.t,desc,["-P1D"]);
    if(e.dl&&diff(e.dl)>=0)ev(e.id+"-dl-"+iso(e.dl),e.dl,(e.crit?"⚠ ":"")+"Крайний срок: "+e.t,desc,e.crit?["-P7D","-P1D"]:["-P1D"]);
    if(e.d&&!e.rec&&!e.dl&&diff(e.d)>=0)ev(e.id+"-"+iso(e.d),e.d,e.t,desc,["-P1D"]);
  });
  L.push("BEGIN:VEVENT","UID:monthly-pay@kv-sroki","DTSTAMP:"+stamp,"DTSTART;VALUE=DATE:20261202","DTEND;VALUE=DATE:20261203","RRULE:FREQ=MONTHLY;BYMONTHDAY=2;UNTIL=20460902",
    "SUMMARY:Платёж по кредиту (до 2-го числа)","BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:Платёж по кредиту","TRIGGER:-P3D","END:VALARM","END:VEVENT","END:VCALENDAR");
  return L.join("\r\n");
}
function toast(m){const t=document.getElementById("toast");t.textContent=m;t.classList.add("on");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("on"),2600)}

document.getElementById("today").textContent=fmt(TODAY)+" · "+WD[TODAY.getDay()];
const map={akt:"in-akt",notary:"in-notary",ipreg:"in-ipreg",policy:"in-policy",family:"in-family"};
const auto={akt:["k2"],ipreg:["a6","a4"],family:["r1"]};
Object.entries(map).forEach(([k,id])=>{const el=document.getElementById(id);el.value=S.inp[k]||"";
  el.addEventListener("change",()=>{S.inp[k]=el.value;(auto[k]||[]).forEach(x=>{if(el.value)S.done[x]=1});save();renderAll();toast("Сохранено")});});
document.addEventListener("change",ev=>{const c=ev.target.closest('input[type=checkbox][data-id]');if(!c)return;
  if(c.checked)S.done[c.dataset.id]=1;else delete S.done[c.dataset.id];save();renderAll();});
document.addEventListener("click",ev=>{const a=ev.target.closest("a.ref");if(!a)return;ev.preventDefault();history.replaceState(null,"","#"+a.getAttribute("href").slice(1));openRef(a.getAttribute("href"))});
window.addEventListener("hashchange",()=>openRef(location.hash));
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>{VIEW=b.dataset.view;
  document.querySelectorAll("[data-view]").forEach(x=>x.setAttribute("aria-pressed",x===b?"true":"false"));renderMain();}));
document.querySelectorAll("[data-f]").forEach(b=>b.addEventListener("click",()=>{FILTER=b.dataset.f;
  document.querySelectorAll("[data-f]").forEach(x=>x.setAttribute("aria-pressed",x===b?"true":"false"));renderMain();}));
document.getElementById("prev").addEventListener("click",()=>{VM=addM(VM,-1);renderCal()});
document.getElementById("next").addEventListener("click",()=>{VM=addM(VM,1);renderCal()});
document.getElementById("cal").addEventListener("click",ev=>{const b=ev.target.closest("[data-day]");if(b)showDay(b.dataset.day)});
document.getElementById("ics").addEventListener("click",()=>{
  try{const blob=new Blob([ics()],{type:"text/calendar;charset=utf-8"});const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);a.download="kvartira-sroki.ics";document.body.appendChild(a);a.click();a.remove();toast("Файл .ics скачан — откройте его, чтобы добавить сроки в календарь");}
  catch(e){toast("Скачивание недоступно")}});
document.getElementById("share").addEventListener("click",async()=>{
  const code=btoa(unescape(encodeURIComponent(JSON.stringify(S))));
  const url=location.origin+location.pathname+"#s="+code;
  try{await navigator.clipboard.writeText(url);toast("Ссылка скопирована — откройте её на другом устройстве")}
  catch(e){prompt?0:0;document.getElementById("shareout").value=url;document.getElementById("shareout").hidden=false;toast("Скопируйте ссылку из поля")}});
document.getElementById("reset").addEventListener("click",()=>{const b=document.getElementById("reset");
  if(b.dataset.c!=="1"){b.dataset.c="1";b.textContent="Точно сбросить отметки и даты?";setTimeout(()=>{b.dataset.c="";b.textContent="Сбросить отметки"},4000);return}
  S=blank();save();Object.values(map).forEach(id=>document.getElementById(id).value="");
  b.dataset.c="";b.textContent="Сбросить отметки";renderAll();toast("Сброшено")});
renderAll();
if(location.hash.startsWith("#c-"))setTimeout(()=>openRef(location.hash),100);
})();
