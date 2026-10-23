
// ================= tasks =================
let TASKS=[];
function buildTasks(){
 TASKS=[];const dn=doneIds();
 LIVE().forEach(a=>{const p=plan(a);if(!p.lane||p.lane==="auto"||p.lane==="later")return;
  const key=`a:${a.id}:${p.due}`,m=TMETA[key]||{};
  TASKS.push({key,acc:a.id,title:p.why,sub:a.company,est:p.est,tag:p.tag,src:p.go?p.go.kind:"",date:m.date||(p.due<TODAY?TODAY:p.due),time:m.time||null,lane:p.lane,late:p.due<TODAY,subs:m.subs||[],done:!!m.done||dn.includes(a.id)});});
 EVENTS.forEach((e,i)=>{if(!e.ext||e.d<TODAY)return;const pre=Math.max(8,e.s-2),key=`e:${e.id}`,m=TMETA[key]||{},a=e.acc?byId(e.acc):null;
  TASKS.push({key,acc:a?a.id:null,kind:"prep",ev:i,title:`Prep for call with ${e.whoFirst||(a&&a.company)||"your guest"}`,sub:`${a?a.company:(e.company||e.t)} · call at ${clock(e.s)}`,est:20,tag:"meeting",src:"",date:m.date||e.d,time:m.time||clock(Math.round(pre*2)/2),lane:"week",subs:[],done:!!m.done});});
 PTASKS.forEach(t=>TASKS.push({...t,personal:true,lane:t.lane||"today",subs:t.subs||[]}));
}
function meta(t){if(t.personal)return PTASKS.find(x=>x.key===t.key);return TMETA[t.key]=TMETA[t.key]||{}}
function markAccDone(id){const dn=doneIds();if(!dn.includes(id))dn.push(id);saveState()}

// ================= shell =================
const main=document.getElementById("main"),wbar=document.getElementById("wbar"),layer=document.getElementById("layer");
let view="today",confirmFor=null,pending=null,openAuto=false,query="";
function nav(){
 const need=LIVE().filter(a=>!doneIds().includes(a.id)&&["reply","overdue","today"].includes(plan(a).lane)).length;
 const ho=Team.badge();
 const it=(v,ic,l,ct,hot)=>`<button class="sbtn" data-view="${v}" aria-current="${view===v}">${ic}${l}${ct?`<span class="ct${hot?" hot":""}">${ct}</span>`:""}</button>`;
 const rit=(m,ic,l)=>`<button class="sbtn" data-ritual="${m}">${ic}${l}</button>`;
 document.getElementById("nav").innerHTML=
  it("today",I.home,"Today",need,true)+it("planner",I.board,"Planner")+it("pipe",I.pipe,"Pipeline")+it("customers",I.dollar,"Paying customers",ACC.filter(a=>live(a)&&isCustomer(a)&&custSignals(a).some(x=>x[0]==="renew"||x[0]==="risk")).length||null,true)+it("handoff",I.team,"Team handoff",ho,ho>0)+it("find",I.search,"Find an account",LIVE().length)+(ACC.some(a=>a.flagged)?it("flagged",I.flag,"Do not engage",ACC.filter(a=>a.flagged).length):"")+it("mail",I.mail,"8:00 email")+it("settings",I.gear,"Settings")+
  `<div class="slabel">Day</div>`+rit("shutdown",I.moon,"Daily shutdown")+rit("highlights",I.spark,"Daily highlights")+rit("focus",I.focus,"Focus")+
  `<div class="slabel">Week</div>`+rit("wplan",I.target,"Weekly planning")+rit("wreview",I.book,"Weekly review");
 document.getElementById("goals").innerHTML=OBJ.length?`<h4>This week's objectives</h4>`+OBJ.map(o=>`<div class="goal"><div><span>${esc(o.t)}</span><b>${o.n}/${o.of}</b></div><div class="meter"><i style="width:${Math.min(100,o.n/o.of*100)}%"></i></div></div>`).join(""):"";
 const nm=(Store.me&&Store.me.name)||"My Day";
 document.getElementById("mename").textContent=nm;
 document.getElementById("meinit").textContent=nm.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();
}
function gmBadge(){
 if(!Store.mcp)return "";
 const t=GM.busy?"Checking Gmail…":GM.err?GM.err:SYNC.gmailAt?`Gmail checked ${new Date(SYNC.gmailAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}`:"Check Gmail";
 return `<button class="tool" data-act="gsync" id="gmst" title="Look for new emails and replies to your accounts">${I.sync}${esc(t)}</button>`;
}
function topTools(){return `${saveBadge()}${mbBadge()}${gmBadge()}<button class="tool" data-act="quicklog">${I.plus}Log touch</button><button class="tool" data-act="newacc">${I.plus}Add account</button>`}

// ================= today =================
function card(a,p,f){
 const lane=LANES.find(l=>l.k===p.lane),r=p.r,when=p.due&&p.lane!=="auto"?rel(p.due):"";
 return `<article class="card${f?" focus":""}" style="${lv(p.lane)}">
  <div class="band">${lane.icon}<div><b>${f?`<span class="start">Start here</span>`:""}${esc(p.why)}</b><small>${esc(p.sub)}${when?` · <strong>${when}</strong>`:""}</small></div></div>
  <div class="cbody">
   <div class="who"><button data-open="${a.id}">${esc(a.company)}</button>${coArrow(a)}<span>${esc(a.cat||"")}</span>${logBtn(a)}</div>
   <div class="dc-last">${esc(lastLine(a))}</div>
   <div class="pills"><span class="pill ${r.kind==="ok"||r.kind==="paid"?"":r.kind}">${I.shield}${esc(r.label)}</span>${r.inGrace&&!r.cliff?`<span class="pill grace">Grace until ${fmt(GRACE())}</span>`:""}</div>
   <div class="pills"><a class="colink" href="${esc(coUrl(a))}" target="_blank" rel="noopener" title="Open in ContactOut dashboard">${I.ext}ContactOut</a>${a.admin?`<a class="colink" href="${esc(a.admin)}" target="_blank" rel="noopener" title="User admin: API key, credits, usage">${I.key}Admin</a>`:""}</div>
   ${confirmFor===a.id?confirmBox(a,p):""}
   ${p.lane!=="auto"&&confirmFor!==a.id?`<div class="acts">${p.go?`<a class="btn primary" data-go="${a.id}" href="${esc(p.go.url)}" target="_blank" rel="noopener">${CH[p.go.kind]||""}${esc(p.go.label)}</a>`:""}${emailBtn(a)}<button class="btn" data-act="focusacc" data-id="${a.id}">${I.focus}Focus</button>${cardTools(a)}</div>`:`<div class="acts cardacts">${cardTools(a)}</div>`}
  </div></article>`;
}
const coArrow=a=>`<a class="coarrow" href="${esc(coUrl(a))}" target="_blank" rel="noopener" data-coa="1" title="Open ${esc(a.company)} in ContactOut" aria-label="Open in ContactOut">${I.ext}</a>`;
const coUrl=a=>a.co||(a.domain?`https://contactout.com/sales/companies/${a.domain}`:"https://contactout.com/");
function confirmBox(a,p){
 const who=firstName(a)||a.company;
 return `<div class="confirm"><b>${p.go.kind==="lemlist"?`Did you move ${esc(a.company)} to nurture?`:`Did you message ${esc(who)}${p.go.kind==="LinkedIn"?" on LinkedIn":""}?`}</b>${p.go.kind==="Email"&&Store.mcp?`<small>Emails are also picked up from Gmail automatically.</small>`:""}
 <div class="acts"><button class="btn primary" data-act="yes" data-id="${a.id}">${I.check}Yes, sent</button><button class="btn" data-act="no" data-id="${a.id}">Not yet</button></div></div>`;
}
function meetStrip(){
 const ms=EVENTS.map((e,i)=>[e,i]).filter(([e])=>e.ext&&diff(e.d,TODAY)>=0&&diff(e.d,TODAY)<=1);
 if(!ms.length)return "";
 return `<div class="meets">${ms.map(([e,i])=>`<div class="meet"><div class="mt"><b>${e.d===TODAY?"Today":"Tomorrow"} ${clock(e.s)}</b><span>${esc(e.t)}</span><small>${e.via?`Booked via ${esc(e.via)} · `:""}prep at ${clock(Math.max(8,e.s-2))}</small></div><div class="acts"><button class="btn primary sm" data-act="brief" data-ev="${i}">${I.brief}Meeting brief</button><a class="btn sm" href="${esc(e.link)}" target="_blank" rel="noopener">${I.cal}Open invite</a></div></div>`).join("")}</div>`;
}
function roeAlertBox(){
 const xs=LIVE().map(a=>[a,roe(a)]).filter(([a,r])=>r.alert&&!r.cliff).sort((x,y)=>x[1].left-y[1].left);
 if(!xs.length)return "";
 const show=xs.slice(0,8);
 return `<div class="alertbox"><h3>${I.bell}${xs.length} ${xs.length===1?"account is":"accounts are"} close to an ROE deadline</h3>
  ${show.map(([a,r])=>`<div class="arow"><b>${r.rule}</b><button class="lnk" style="background:none;border:0;padding:0;font-weight:600;text-decoration:underline" data-open="${a.id}">${esc(a.company)}</button><span class="small">${r.left<0?`passed ${fmt(r.eff)}`:r.left===0?"today":`in ${r.left} ${r.left===1?"day":"days"} · ${fmt(r.eff)}`} · ${r.rule==="ROE-12"?"needs a positive reply":r.rule==="ROE-1"?"needs a first touch":"any touch resets it"}</span><span class="sp"></span>${r.rule==="ROE-12"?`<button class="btn sm" data-act="hoflag" data-id="${a.id}">${I.team}Hand off</button>`:""}${logBtn(a)}</div>`).join("")}
  ${xs.length>show.length?`<span class="small">And ${xs.length-show.length} more in Pipeline → Has warnings.</span>`:""}</div>`;
}
function findByEmail(e){e=String(e||"").toLowerCase();if(!e)return null;const d=e.split("@")[1]||"";return ACC.find(a=>(a.email||"").toLowerCase()===e||(!FREE.has(d)&&a.domain===d))||null}
let INB_ALL=false;
function inboundBox(){
 const xs=INBOUNDS.filter(x=>!DISMISS[x.email]&&!DISMISS["acc:"+(x.email.split("@")[1]||"")]&&!findByEmail(x.email));
 if(!xs.length)return "";
 return `<section class="lane" style="${lv("week")}"><div class="lh"><span class="ic">${I.inbox}</span><div><h2>New inbounds</h2><p>From your Inbounds label in Gmail, not in My Day yet.</p></div><span class="n">${xs.length}</span></div>
 <div class="inbx">${(INB_ALL?xs:xs.slice(0,8)).map(x=>`<div class="arow"><b>${esc(x.name||x.email)}</b><span class="small">${esc(x.email)}${x.subject?` · ${esc(x.subject)}`:""} · ${fmt(x.d)}</span><span class="sp"></span><a class="btn sm" href="${esc(x.url)}" target="_blank" rel="noopener">${I.mail}Open</a><button class="btn primary sm" data-act="addinb" data-e="${esc(x.email)}">${I.plus}Add account</button><button class="btn ghost sm" data-act="dismissinb" data-e="${esc(x.email)}">Dismiss</button></div>`).join("")}${xs.length>8?`<button class="btn ghost sm" data-act="inball">${INB_ALL?"Show fewer":`Show all ${xs.length}`}</button>`:""}</div></section>`;
}
function renderToday(){
 wbar.innerHTML=`<h1>Today</h1><span class="small">${wd(TODAY,{weekday:"long",day:"numeric",month:"long"})}</span><span class="sp"></span>${topTools()}<button class="tool dark" data-act="startfocus">${I.focus}Start focus</button>`;
 if(!ACC.length){main.innerHTML=`<div class="wbody"><div class="hero"><h2>Welcome to My Day</h2><p>Add your accounts and My Day tells you each morning who to reply to, who to follow up with, and which accounts are close to an ROE deadline. Your pipeline is private: only you can see it.</p>
  <div class="setrow">${Store.mcp?`<button class="btn primary" data-act="mbsync">${I.sync}Pull my accounts from Metabase</button>`:""}<button class="btn${Store.mcp?"":" primary"}" data-act="import">${I.up}Import from a spreadsheet</button><button class="btn" data-act="newacc">${I.plus}Add one account</button><button class="btn ghost" data-act="sample">Try it with sample accounts</button></div>
  <p class="small">Import takes a CSV or Excel file, or rows pasted straight from Google Sheets.</p></div>${Team.incomingBox()}</div>`;return}
 const g={reply:[],overdue:[],today:[],week:[],auto:[],later:[]},dn=doneIds();
 LIVE().forEach(a=>{if(dn.includes(a.id))return;const p=plan(a);if(p.lane)g[p.lane].push([a,p])});
 Object.values(g).forEach(x=>x.sort((m,n)=>(m[1].due||"9")<(n[1].due||"9")?-1:1));
 const need=g.reply.length+g.overdue.length+g.today.length,total=need+dn.length;
 const gr=GRACE(),inGrace=gr&&TODAY<gr,cliff=inGrace?LIVE().filter(a=>roe(a).cliff):[];
 let first=false;
 let h=`<div class="wbody"><div class="head"><div><h2 class="h-page"><em>${need}</em> ${need===1?"account needs":"accounts need"} you today</h2><p class="sub">Start with the outlined card. Colour shows urgency; grey means it can wait.</p></div>
  <div class="prog"><div><span>Done today</span><span>${dn.length} of ${total}</span></div><div class="meter"><i style="width:${total?dn.length/total*100:0}%"></i></div></div></div>
  ${ACC.some(a=>a.sample)?`<div class="note">${I.spark}<div><b>You're looking at sample accounts.</b> <button class="lnk" style="background:none;border:0;padding:0;font-weight:600;text-decoration:underline" data-act="clearsample">Remove them</button> when you're ready to import your own.</div></div>`:""}
  ${Team.incomingBox()}${Team.updatesBox()}
  ${inGrace?`<div class="note">${I.shield}<div><b>Grace period: ${diff(gr,TODAY)} days left.</b> Nothing can be taken through ROE until ${fmt(gr)}.${cliff.length?` On that day ${cliff.length} ${cliff.length===1?"account":"accounts"} would be claimable: ${cliff.slice(0,10).map(a=>`<button class="lnk" style="background:none;border:0;padding:0;font-weight:600;text-decoration:underline" data-open="${a.id}">${esc(a.company)}</button>`).join(", ")}${cliff.length>10?"…":""}.`:""}</div></div>`:""}
  ${roeAlertBox()}${meetStrip()}${inboundBox()}<div class="stats">${LANES.slice(0,5).map(l=>`<a class="stat" href="#lane-${l.k}" style="${lv(l.k)}"><span class="ic">${l.icon}</span>${l.title}<b>${g[l.k].length}</b></a>`).join("")}</div>`;
 LANES.forEach(l=>{const x=g[l.k];
  if(l.k==="auto"||l.k==="later"){const open=l.k==="auto"&&openAuto;
   h+=`<section class="lane" id="lane-${l.k}" style="${lv(l.k)}"><button class="lh" data-act="${l.k==="auto"?"toggleAuto":"noop"}"><span class="ic">${l.icon}</span><div><h2>${l.title}</h2><p>${l.sub}${l.k==="auto"?(open?" Click to hide.":" Click to show."):""}</p></div><span class="n">${x.length}</span></button>${open?`<div class="cards">${x.map(([a,p])=>card(a,p)).join("")}</div>`:""}</section>`;return;}
  if(!x.length)return;
  h+=`<section class="lane" id="lane-${l.k}" style="${lv(l.k)}"><div class="lh"><span class="ic">${l.icon}</span><div><h2>${l.title}</h2><p>${l.sub}</p></div><span class="n">${x.length}</span></div><div class="cards">${x.map(([a,p],i)=>{const f=!first&&i===0;if(f)first=true;return card(a,p,f)}).join("")}</div></section>`;});
 if(dn.length)h+=`<section class="lane" style="${lv("done")}"><div class="lh"><span class="ic">${I.check}</span><div><h2>Done today</h2><p>Logged, with the ROE clock reset.</p></div><span class="n">${dn.length}</span></div><div class="small">${dn.map(id=>byId(id)).filter(Boolean).map(a=>esc(a.company)).join(" · ")}</div></section>`;
 main.innerHTML=h+`</div>`;
}

// ================= planner =================
function planDays(){const out=[];let d=TODAY;while(out.length<4){const w=D(d).getDay();if(w&&w!==6)out.push(d);d=add(d,1)}return out}
function freeMins(d){return Math.max(60,9*60-EVENTS.filter(e=>e.d===d).reduce((s,e)=>s+(e.e-e.s)*60,0))}
function gcalUrl(t){
 const a=t.acc?byId(t.acc):null;
 const st=t.time?hrs(t.time):(t.date===TODAY?Math.max(9,Math.ceil(nowH()*2)/2):9),en=st+t.est/60;
 const stamp=(d,h)=>d.replace(/-/g,"")+"T"+String(Math.floor(h)).padStart(2,"0")+String(Math.round((h%1)*60)).padStart(2,"0")+"00";
 const det=[a?`${a.company} (${a.cat||""})`:"",a?plan(a).sub:"",a?`ContactOut: ${coUrl(a)}`:"","Added from My Day"].filter(Boolean).join("\n");
 return `https://calendar.google.com/calendar/render?action=TEMPLATE${CFG.gmail?`&authuser=${encodeURIComponent(CFG.gmail)}`:""}&text=${encodeURIComponent(t.title)}&dates=${stamp(t.date,st)}/${stamp(t.date,en)}&ctz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone||"Europe/Warsaw")}&details=${encodeURIComponent(det)}`;
}
function taskEl(t){
 const lane=t.lane||"today",tc=TAGS[t.tag]||"#888",a=t.acc?byId(t.acc):null,ev=t.kind==="prep"?EVENTS[t.ev]:null;
 return `<div class="task${t.done?" isdone":""}" draggable="true" data-tid="${esc(t.key)}" style="${lv(lane)}">
  ${t.time?`<span class="tm">${t.time}</span>`:""}
  <div class="trow"><div class="tt">${esc(t.title)}${t.sub?`<small>${t.acc?`<span data-open="${t.acc}" style="cursor:pointer;text-decoration:underline;text-underline-offset:2px">${esc(t.sub)}</span>`:esc(t.sub)}${t.late?` · <b style="color:var(--overdue-ink)">late</b>`:""}</small>`:""}</div><span class="est" title="Estimated time to do this">${I.hour}${mins(t.est)}</span></div>
  ${ev?`<div class="acts"><button class="btn primary sm" data-act="brief" data-ev="${t.ev}">${I.brief}Meeting brief</button><a class="btn sm" href="${esc(ev.link)}" target="_blank" rel="noopener">${I.cal}Open invite</a></div>`:""}
  ${t.subs.length?`<div class="subs">${t.subs.map((s,i)=>`<label><input type="checkbox" data-sub="${esc(t.key)}|${i}" ${s.d?"checked":""}><span>${esc(s.t)}</span></label>`).join("")}</div>`:""}
  <div class="tfoot"><button class="chk" data-act="tdone" data-tid="${esc(t.key)}" aria-label="Mark done">${I.check}</button>${t.src?`<span class="src" title="${esc(t.src)}">${CH[t.src]||""}</span>`:""}<button class="focusbtn" data-act="tfocus" data-tid="${esc(t.key)}" title="Focus on this">${I.focus}</button><a class="focusbtn calbtn" href="${esc(gcalUrl(t))}" target="_blank" rel="noopener" title="Add to Google Calendar (choose event or task there)">${I.calp}</a>${a?`<a class="focusbtn" href="${esc(coUrl(a))}" target="_blank" rel="noopener" title="Open in ContactOut">${I.ext}</a>`:""}${t.personal?`<button class="focusbtn" data-act="tdel2" data-tid="${esc(t.key)}" title="Delete task">${I.trash}</button>`:""}<span class="tag" style="--tc:${tc}"><i>#</i> ${esc(t.tag)}</span></div></div>`;
}
function renderPlanner(){
 wbar.innerHTML=`<h1>Planner</h1><span class="small">Your tasks by day. The calendar icon opens a task in Google Calendar.</span><span class="sp"></span>${saveBadge()}<a class="tool" href="https://calendar.google.com/calendar/u/${CFG.gmail?"?authuser="+encodeURIComponent(CFG.gmail):"0/"}" target="_blank" rel="noopener">${I.cal}Open Google Calendar</a><button class="tool" data-ritual="shutdown">${I.moon}Shutdown</button>`;
 const cols=planDays().map(d=>{const ts=TASKS.filter(t=>t.date===d).sort((a,b)=>(a.done-b.done)||((a.time||"99")<(b.time||"99")?-1:1));const tot=ts.filter(t=>!t.done).reduce((s,t)=>s+t.est,0),free=freeMins(d);
  return `<div class="day"><div class="dayh"><b>${d===TODAY?"Today":wd(d)}</b><span>${wd(d,{weekday:"long",day:"numeric",month:"long"})}</span></div>
   <div class="load${tot>free?" over":""}" title="${mins(tot)} planned of ${mins(free)} free after meetings"><i style="width:${Math.min(100,tot/free*100)}%"></i></div>
   <form class="addtask" data-add="${d}">${I.plus}<input id="add-${d}" placeholder="Add task" aria-label="Add task for ${esc(wd(d))}"><span class="tot" title="Total estimated time for this day">${I.hour}${mins(tot)} total</span></form>
   <div class="drop" data-day="${d}">${ts.map(taskEl).join("")}</div></div>`}).join("");
 main.innerHTML=`<div class="planner"><div class="days">${cols}</div></div>`;
}

// ================= pipeline =================
let pipeMode="board",pq="",fCold=false,fMissing=false,fWarn=false,pipeFilter=null;
function pipeRows(){const q=pq.trim().toLowerCase();return LIVE().filter(a=>(!q||[a.company,a.domain,a.contact,a.cat].join(" ").toLowerCase().includes(q))&&(!fCold||warns(a).some(w=>w[0]==="stale"))&&(!fMissing||needsSS(a))&&(!fWarn||warns(a).length))}
function scorePill(a){const s=score(a);if(!s||colOf(a)==="Not started"||colOf(a)==="Outreach")return "";return `<span class="score ${s.n>=60?"hi":s.n>=35?"mid":""}" title="Likely to close: ${esc(s.why.join(", "))}">${s.n}% likely</span>`}
const STGB=[["Engaged","Engaged"],["Meeting","Meeting"],["Negotiation","Negotiation"],["Closed won","Won"],["Closed lost","Lost"]];
function stageBtns(a){const cur=colOf(a);return `<div class="stgrow" role="group" aria-label="Move ${esc(a.company)} to"><span>Move to</span>${STGB.filter(([c])=>c!==cur&&!(cur==="Customers"&&c==="Closed won")).map(([c,l])=>`<button class="stgb" data-stg="${c}" data-id="${a.id}">${l}</button>`).join("")}</div>`}
function dealCard(a){
 const p=plan(a),w=warns(a),h=health(a);
 return `<article class="dcard" data-open="${a.id}" tabindex="0">
  <div class="dc-top"><span class="dc-list">${esc(a.cat||"")}${a.paidBefore?` · <b style="color:var(--later-ink)">Paying customer</b>`:""}</span>${logBtn(a)}</div>
  <div class="dc-name">${esc(a.company)}${coArrow(a)}${a.product?` <span>· ${esc(a.product)}</span>`:""}</div>
  <div class="dc-val">${a.value?money(a.value):`<span class="small">No value yet</span>`} ${scorePill(a)}</div>
  ${p.lane&&p.lane!=="auto"?(p.go?`<a class="dc-next act" data-go="${a.id}" href="${esc(p.go.url)}" target="_blank" rel="noopener" style="${lv(p.lane)}" title="${esc(p.go.label)}"><i></i><span><b>${esc(p.why)}</b> · ${rel(p.due)}<small>${esc(p.sub)}</small></span><em>${CH[p.go.kind]||""}</em></a>`:`<div class="dc-next act" style="${lv(p.lane)}"><i></i><span><b>${esc(p.why)}</b> · ${rel(p.due)}<small>${esc(p.sub)}</small></span></div>`):p.lane==="auto"?`<div class="dc-next" style="${lv("auto")}"><i></i><span>${esc(p.sub)}</span></div>`:""}
  <div class="dc-last">${esc(lastLine(a))}</div>
  ${w.length?`<div class="dc-warn">${w.map(([k,t,hh])=>`<span class="wn ${k}" title="${esc(hh)}">${esc(t)}</span>`).join("")}</div>`:""}
  ${stageBtns(a)}
  <div class="acts cardacts">${emailBtn(a,"sm")}${cardTools(a)}</div>
  <div class="dc-foot"><span class="stg2" style="--pc:${SC[a.stage]||"#888"}">${esc(SHORT[a.stage]||a.stage)}</span>
   ${a.inSS?`<button class="ss on" data-ss="${a.id}" title="Click to undo">In Sales Sharks ✓</button>`:needsSS(a)?`<button class="ss" data-ss="${a.id}" title="This is a deal your manager can't see yet. Add it in Sales Sharks, then click here.">Not in Sales Sharks</button>`:`<span style="margin-left:auto"></span>`}
   <span class="hdot ${h}" title="${h==="ok"?"Healthy":h==="warn"?"Needs attention":"At risk"}"></span></div></article>`;
}
function renderPipe(){
 const rows=pipeRows(),all=LIVE();
 const nCold=all.filter(a=>warns(a).some(w=>w[0]==="stale")).length,nMiss=all.filter(needsSS).length,nWarn=all.filter(a=>warns(a).length).length;
 const open=rows.filter(a=>a.stage!=="Won"&&a.stage!=="Lost"),tot=open.reduce((s,a)=>s+(+a.value||0),0);
 wbar.innerHTML=`<h1>Pipeline</h1><span class="small">${open.length} open · ${money(tot)||"$0"}</span><span class="sp"></span>
  <label class="tsearch">${I.search}<input id="pq" placeholder="Search accounts" value="${esc(pq)}" aria-label="Search pipeline"></label>
  <button class="tool${fCold?" on":""}" data-act="fcold" title="No contact from either side for 14+ days">Stale <b>${nCold}</b></button>
  <button class="tool${fWarn?" on":""}" data-act="fwarn">Has warnings <b>${nWarn}</b></button>
  <button class="tool${fMissing?" on":""}" data-act="fmiss" title="Deals your manager can't see yet">Not in Sales Sharks <b>${nMiss}</b></button>
  <button class="tool" data-act="newacc">${I.plus}Add account</button>
  <span class="seg"><button data-act="pm" data-m="board" aria-pressed="${pipeMode==="board"}" title="Board">${I.board}</button><button data-act="pm" data-m="list" aria-pressed="${pipeMode==="list"}" title="List">${I.clip}</button></span>`;
 let h=`<div class="wbody">`;
 if(pipeMode==="board"){
  h+=`<div class="board">${COLS.map(c=>{const cs=rows.filter(a=>colOf(a)===c.k),sum=cs.reduce((s,a)=>s+(+a.value||0),0),cap=200;
   return `<section class="bcol"><header class="bch"><div><span class="bdot" style="background:${c.c}"></span><b>${c.k}</b><span class="bct">${cs.length}</span></div><span class="bsum">${money(sum)||"$0"} · ${c.k==="Customers"?`Check-ins every ${CFG.checkN} days, upsell`:c.d}</span></header>
    <div class="bcards">${cs.slice(0,cap).map(dealCard).join("")||`<div class="bempty">No accounts here</div>`}${cs.length>cap?`<div class="bempty">${cs.length-cap} more: use search or the list view</div>`:""}</div></section>`}).join("")}</div>
  <p class="small">Columns end with the same stages as Sales Sharks (Proposal sent, Negotiation, Closed won, Closed lost). Click a card to open the account.</p>`;
 }else{
  const by={};PIPE.forEach(([s])=>by[s]=[]);rows.forEach(a=>by[a.stage]&&by[a.stage].push(a));
  h+=`<div class="pipebar">${PIPE.map(([s,c],i)=>`<button class="chev${pipeFilter&&pipeFilter!==s?" dim":""}" style="--pc:${c};--pi:${ink(c)};z-index:${20-i}" data-act="pf" data-s="${esc(s)}"><b>${by[s].length}</b><span>${esc(SHORT[s]||s)}</span></button>`).join("")}</div>
  <div class="tablewrap"><table><thead><tr><th>Account</th><th>Value</th><th>Contact</th><th>ROE status</th><th>Warnings</th><th>Next step</th><th>Manager CRM</th></tr></thead><tbody>`;
  PIPE.forEach(([s,c])=>{if(pipeFilter&&pipeFilter!==s)return;const rs=by[s];if(!rs.length)return;
   h+=`<tr class="grp" style="--pc:${c};--pi:${ink(c)}"><td colspan="7"><span class="gpill">${esc(s)}</span><span class="gn">${rs.length}</span></td></tr>`;
   h+=rs.map(a=>{const p=plan(a),r=roe(a),w=warns(a);return `<tr class="row" style="--pc:${c}"><td><button class="lnk" data-open="${a.id}">${esc(a.company)}</button><small><a class="tlink" href="${esc(coUrl(a))}" target="_blank" rel="noopener">${esc(a.domain||"ContactOut")} ${I.ext}</a>${a.admin?` · <a class="tlink" href="${esc(a.admin)}" target="_blank" rel="noopener">admin ${I.key}</a>`:""}</small></td>
    <td>${money(a.value)||"–"} ${scorePill(a)}</td><td>${esc(a.contact||"–")}</td><td><span class="pill ${r.kind==="ok"||r.kind==="paid"?"":r.kind}">${I.shield}${esc(r.short)}</span></td>
    <td>${w.filter(x=>x[0]!=="roe").map(([k,t,hh])=>`<span class="wn ${k}" title="${esc(hh)}">${esc(t)}</span>`).join(" ")||"–"}</td>
    <td>${p.lane&&p.lane!=="auto"?`<b style="font-weight:600">${esc(p.why)}</b><small>${rel(p.due)}</small>`:p.lane==="auto"?`<small>${esc(p.sub)}</small>`:"–"}</td>
    <td>${a.inSS?`<button class="ss on" data-ss="${a.id}">In Sales Sharks ✓</button>`:needsSS(a)?`<button class="ss" data-ss="${a.id}">Not in Sales Sharks</button>`:"–"}</td></tr>`}).join("");});
  h+=`</tbody></table></div>`;
 }
 main.innerHTML=h+`</div>`;
}


// ================= paying customers =================
let custF="all";
const CUSTF=[["all","All"],["renew","Renewal soon"],["upsell","Upsell signal"],["team","Team plan"],["risk","At risk"],["quiet","Not contacted by you"]];
const SIGC={renew:"today",risk:"reply",upsell:"later",team:"week",quiet:"auto"};
function renderCustomers(){
 const all=ACC.filter(a=>live(a)&&isCustomer(a));
 const rank=a=>{const k=custSignals(a).map(x=>x[0]);return k.includes("renew")?0:k.includes("risk")?1:k.includes("upsell")?2:k.includes("team")?3:4};
 const rows=all.filter(a=>custF==="all"||custSignals(a).some(x=>x[0]===custF)).sort((x,y)=>rank(x)-rank(y)||(+(y.amount||y.value)||0)-(+(x.amount||x.value)||0));
 const tot=all.reduce((s,a)=>s+(+(a.amount||a.value)||0),0),cnt=k=>all.filter(a=>custSignals(a).some(x=>x[0]===k)).length;
 wbar.innerHTML=`<h1>Paying customers</h1><span class="small">${all.length} accounts · ${money(tot)||"$0"} paid so far</span><span class="sp"></span>${CUSTF.map(([k,l])=>`<button class="tool${custF===k?" on":""}" data-act="custf" data-k="${k}">${l}${k==="all"?"":` <b>${cnt(k)}</b>`}</button>`).join("")}`;
 const card=a=>{const sg=custSignals(a),ren=renewalOf(a),amt=+(a.amount||a.value)||0;
  return `<article class="dcard${a.stage==="Won"?" myclient":""}" data-open="${a.id}" tabindex="0">
   <div class="dc-top"><span class="dc-list">${a.stage==="Won"?`<span class="clientbadge">${I.check}Your client</span>`:"Paying before you"}${a.dealStatus?` · ${esc(a.dealStatus)}`:""}</span>${logBtn(a)}</div>
   <div class="dc-name">${esc(a.company)}${coArrow(a)} <span>· ${esc(a.domain||"")}</span></div>
   <div class="dc-val">${amt?money(amt):`<span class="small">Amount unknown</span>`} <span class="small">${a.paidDate?`· paid ${fmtY(a.paidDate)}`:a.wonDate&&a.stage==="Won"?`· closed ${fmtY(a.wonDate)}`:""}</span></div>
   <div class="small">${ren?`Renews ${fmtY(ren)}`:`<button class="lnk" style="background:none;border:0;padding:0;text-decoration:underline;color:var(--week-ink);font-weight:600" data-act="editacc" data-id="${a.id}">Set renewal date</button>`}${a.mb?` · ${a.users||0} users, ${a.activeUsers||0} active · ${(+a.credits30||0).toLocaleString("en-US")} credits in 30 days`:""}</div>
   ${sg.length?`<div class="dc-warn">${sg.map(([k,t])=>`<span class="wn" style="background:var(--${SIGC[k]}-bg);color:var(--${SIGC[k]}-ink);box-shadow:none">${esc(t)}</span>`).join("")}</div>`:""}
   <div class="dc-next act" style="${lv(sg[0]?SIGC[sg[0][0]]:"later")}"><i></i><span><b>${esc(custNext(a))}</b><small>${esc(lastLine(a))}${a.email?` · main contact ${esc(a.contact||a.email)}`:""}</small></span></div>
   <div class="acts cardacts">${emailBtn(a,"primary sm")}${cardTools(a)}</div>
   <div class="pills"><a class="colink" href="${esc(coUrl(a))}" target="_blank" rel="noopener">${I.ext}ContactOut</a>${a.admin?`<a class="colink" href="${esc(a.admin)}" target="_blank" rel="noopener">${I.key}Admin: credits, usage</a>`:""}</div>
  </article>`};
 const mineC=rows.filter(a=>a.stage==="Won"),inh=rows.filter(a=>a.stage!=="Won"),fresh=inh.filter(a=>!a.last||a.last<(a.claimed||"")),worked=inh.filter(a=>!fresh.includes(a));
 const sec=(k,title,sub,list,extra)=>`<section class="lane" style="${lv(k)}"><div class="lh"><span class="ic">${k==="later"?I.check:k==="week"?I.target:I.inbox}</span><div><h2>${title}</h2><p>${sub}</p></div>${extra||""}<span class="n">${list.length}</span></div>${list.length?`<div class="cgrid">${list.map(card).join("")}</div>`:`<p class="small" style="margin:0">None right now.</p>`}</section>`;
 main.innerHTML=`<div class="wbody">${all.length?`<p class="sub" style="margin:0">Companies paying for ContactOut under your name. Flags come from their usage in the company dashboard. Renewals show up in Today 30 days before the date.</p>
  ${sec("later","Your clients","Deals you closed yourself.",mineC)}
  <section class="lane" style="${lv("week")}"><div class="lh"><span class="ic">${I.target}</span><div><h2>Ready for a campaign</h2><p>Paying before you got them, and you haven't reached out yet. Split by how much they used ContactOut in the last 30 days.</p></div><span class="n">${fresh.length}</span></div>
   ${CAMP.map(([k,t,sub])=>{const l=fresh.filter(a=>usageGroup(a)===k);return `<div class="subbox" style="${lv({heavy:"later",none:"reply",some:"week"}[k])}"><div class="subhead"><div><h3><span class="subdot"></span>${t} <span class="subct">${l.length}</span></h3><p>${sub}</p></div>${l.length?`<button class="btn sm" data-act="custcsv" data-k="${k}">${I.down}Download list (CSV)</button>`:""}</div>${l.length?`<div class="cgrid">${l.map(card).join("")}</div>`:`<p class="small" style="margin:0">None right now.</p>`}</div>`}).join("")}</section>
  ${sec("auto","Already in touch","Paying before you got them; you've reached out since.",worked)}`:`<div class="hero"><h2>No paying customers yet</h2><p>Paying accounts under your name appear here after the Metabase sync, and so do deals you close.</p></div>`}</div>`;
}

const CAMP=[["heavy","Heavy usage: upsell","300+ credits or 3+ active users in the last 30 days. Pitch more credits, the API or a team plan."],["none","No usage in 30 days: re-engage","No credits used in the last 30 days. Check in, offer help, save the renewal."],["some","Some usage: nurture","Light use. A friendly check-in and tips to get more out of it."]];
function usageGroup(a){const c=+a.credits30||0,act=+a.activeUsers||0;if(c>=300||act>=3)return "heavy";if(c===0)return "none";return "some"}
function custCSV(k){
 const list=ACC.filter(a=>live(a)&&a.paidBefore&&a.stage!=="Won"&&(!a.last||a.last<(a.claimed||""))&&(!k||usageGroup(a)===k));
 const q=v=>{const x=String(v??"");return /[",\n]/.test(x)?`"${x.replace(/"/g,'""')}"`:x};
 const head=["company","domain","contactout_url","paid","users","active_users","credits_30d","angle","signals"];
 const rows=list.map(a=>{const k=custSignals(a).map(x=>x[0]);return [a.company,a.domain,coUrl(a),+(a.amount||a.value)||"",a.users||0,a.activeUsers||0,a.credits30||0,usageGroup(a)==="heavy"?"upsell":usageGroup(a)==="none"?"re-engage":"nurture",custSignals(a).map(x=>x[1]).join("; ")].map(q).join(",")});
 saveFile(`paying-customers-${k||"all"}-${TODAY}.csv`,[head.join(","),...rows].join("\n"),"text/csv");
}
// ================= do not engage =================
function renderFlagged(){
 const rows=ACC.filter(a=>a.flagged).sort((x,y)=>(y.flagged.d||"")>(x.flagged.d||"")?1:-1);
 wbar.innerHTML=`<h1>Do not engage</h1><span class="small">${rows.length} flagged · hidden from Today, Pipeline, alerts and campaign lists</span><span class="sp"></span>${saveBadge()}`;
 main.innerHTML=`<div class="wbody"><p class="sub" style="margin:0">Accounts you've decided not to work with. They stay here for reference, and their emails won't show up as new inbounds.</p>
 ${rows.length?`<div class="tablewrap"><table style="min-width:640px"><thead><tr><th>Account</th><th>Reason</th><th>Flagged</th><th></th></tr></thead><tbody>${rows.map(a=>`<tr><td><button class="lnk" data-open="${a.id}">${esc(a.company)}</button><small>${esc(a.domain||"")}${a.email?` · ${esc(a.email)}`:""}</small></td><td><span class="flagpill">${I.flag}${esc(a.flagged.reason||"Do not engage")}</span>${a.flagged.note?`<small>${esc(a.flagged.note)}</small>`:""}</td><td>${fmtY(a.flagged.d)}</td><td><button class="btn ghost sm" data-act="unflag" data-id="${a.id}">Unflag</button></td></tr>`).join("")}</tbody></table></div>`:`<div class="bempty">Nothing flagged.</div>`}</div>`;
}
// ================= find =================
function renderFind(){
 wbar.innerHTML=`<h1>Find an account</h1><span class="small">All your accounts</span><span class="sp"></span><button class="tool" data-act="import">${I.up}Import</button><button class="tool" data-act="newacc">${I.plus}Add account</button>`;
 const q=query.trim().toLowerCase();
 const rows=ACC.filter(a=>!a.archived&&(!q||[a.company,a.domain,a.contact,a.email,a.cat,a.co].join(" ").toLowerCase().includes(q)));
 main.innerHTML=`<div class="wbody"><label class="search">${I.search}<input id="q" type="search" placeholder="Company, domain, contact or ContactOut link" value="${esc(query)}" aria-label="Search accounts"></label>
 <div class="tablewrap"><table><thead><tr><th>Company</th><th>List</th><th>ROE status</th><th>Stage</th><th>Channel</th><th>First touch</th><th>Last touch</th></tr></thead><tbody>
 ${rows.slice(0,300).map(a=>{const r=roe(a);return `<tr><td><button class="lnk" data-open="${a.id}">${esc(a.company)}</button><small><a class="tlink" href="${esc(coUrl(a))}" target="_blank" rel="noopener">${esc(a.domain||"ContactOut")} ${I.ext}</a>${a.admin?` · <a class="tlink" href="${esc(a.admin)}" target="_blank" rel="noopener">admin ${I.key}</a>`:""}</small></td><td>${esc(a.cat||"")}</td><td>${a.flagged?`<span class="flagpill">${I.flag}Do not engage</span>`:a.assignedTo?`<span class="pill">Handed to ${esc(Team.name(a.assignedTo))}${a.hoStatus==="claimed"?" ✓":""}</span>`:`<span class="pill ${r.kind==="ok"||r.kind==="paid"?"":r.kind}">${I.shield}${esc(r.short)}</span>`}</td><td>${esc(a.stage)}</td><td>${esc(a.channel||"None yet")}</td><td>${fmt(a.first)||"–"}</td><td>${fmt(a.last)||"–"}</td></tr>`}).join("")||`<tr><td colspan="7">${ACC.length?`No account matches "${esc(query)}". Try the domain.`:"No accounts yet. Use Import or Add account."}</td></tr>`}
 </tbody></table></div><p class="small">${rows.length>300?`Showing 300 of ${rows.length}. Search to narrow down. `:""}Click a company to open its record.</p></div>`;
 const qi=document.getElementById("q");qi.focus();qi.setSelectionRange(qi.value.length,qi.value.length);
}

// ================= 8:00 email preview =================
function touchesOn(d){const out=[];ACC.forEach(a=>(a.log||[]).forEach(l=>{if(l.d===d)out.push([a,l])}));return out}
function renderMail(){
 wbar.innerHTML=`<h1>8:00 email</h1><span class="small">Preview of your weekday morning email</span>`;
 const g={reply:[],overdue:[],today:[],week:[]};LIVE().forEach(a=>{const p=plan(a);if(g[p.lane])g[p.lane].push([a,p])});
 const risk=LIVE().map(a=>[a,roe(a)]).filter(([a,r])=>r.alert);
 let y=add(TODAY,-1);while([0,6].includes(D(y).getDay()))y=add(y,-1);
 const yt=touchesOn(y),cnt=f=>yt.filter(f).length;
 const line=(k,l)=>g[k].slice(0,15).map(([a,p])=>`<div class="ml" style="${lv(k)}"><i>${l}</i><span><b>${esc(a.company)}</b> · ${esc(p.why)}</span><small>${rel(p.due)}</small></div>`).join("");
 main.innerHTML=`<div class="wbody"><div class="note">${I.mail}<div><b>This email starts once the app is hosted.</b> A web address can send it to you at 8:00 each weekday; inside Claude the app only runs while it's open. The content below is live.</div></div><article class="mail"><div class="mh"><div><b>From:</b> My Day</div><div><b>To:</b> ${esc(CFG.gmail||"you")}</div><div class="subj">Today: ${g.reply.length+g.overdue.length+g.today.length} accounts need you · ${risk.length} ROE alerts</div></div>
 <div class="mb"><section><h4>${wd(y,{weekday:"long",day:"numeric",month:"short"})}</h4><div class="kpis">${[[cnt(([a,l])=>l.dir==="me"),"Touches"],[cnt(([a,l])=>l.dir==="me"&&l.ch==="Email"),"Emails"],[cnt(([a,l])=>l.dir==="me"&&l.ch==="LinkedIn"),"LinkedIn"],[cnt(([a,l])=>l.dir==="me"&&(l.ch==="Call"||l.ch==="Text")),"Calls & texts"],[cnt(([a,l])=>l.dir==="them"),"Replies in"],[ACC.filter(a=>a.claimed===y).length,"New accounts"]].map(([n,l])=>`<div class="kpi"><b>${n}</b><span>${l}</span></div>`).join("")}</div></section>
 <section><h4>Meetings today</h4>${EVENTS.filter(e=>e.ext&&e.d===TODAY).map(e=>`<div class="ml" style="${lv("week")}"><i>${clock(e.s)}</i><span><b>${esc(e.t)}</b> · prep at ${clock(Math.max(8,e.s-2))}</span></div>`).join("")||"<p class=\"small\">No external meetings.</p>"}</section>
 <section><h4>Today</h4>${line("reply","Reply now")}${line("overdue","Overdue")}${line("today","Today")}${line("week","This week")||""}</section>
 <section><h4>ROE alerts</h4>${risk.slice(0,20).map(([a,r])=>`<div class="ml" style="${lv("reply")}"><i>${r.rule}</i><span><b>${esc(a.company)}</b> · ${esc(r.label)}</span></div>`).join("")||"<p class=\"small\">None.</p>"}</section>
 ${HIGHLIGHTS[0]?`<section><h4>Latest highlight</h4><p style="margin:0">${esc(HIGHLIGHTS[0].t)}</p></section>`:""}</div></article></div>`;
}

// ================= settings =================
function renderSettings(){
 wbar.innerHTML=`<h1>Settings</h1><span class="small">Rules, alerts, data and team</span><span class="sp"></span>${saveBadge()}`;
 const f=(k,l,type,hint,extra)=>`<label class="field">${l}<input data-cfg="${k}" type="${type||"text"}" value="${esc(CFG[k])}" ${extra||""}>${hint?`<small>${hint}</small>`:""}</label>`;
 const c=(k,l)=>`<label class="chk2"><input type="checkbox" data-cfg="${k}" ${CFG[k]?"checked":""}>${l}</label>`;
 main.innerHTML=`<div class="wbody"><div class="setgrid">
 <section class="setcard"><h2>ROE and grace period</h2><p>ROE-1: 30 days to first contact. ROE-3: 90 days between touches. ROE-12: a positive interaction every 365 days.</p>
  ${f("grace","Grace period ends","date","Until this date your accounts can't be taken. Leave empty if you have none.")}
  <div class="fgrid">${f("alert1","Warn before ROE-1 (days)","number","","min=1 max=29")}${f("alert3","Warn before ROE-3 (days)","number","","min=1 max=60")}${f("alert12","Warn before ROE-12 (days)","number","","min=1 max=120")}</div></section>
 <section class="setcard"><h2>Follow-up rhythm</h2><p>How many days after the last touch each follow-up is due.</p>
  <div class="fgrid">${f("reply","Reply to them","number")}${f("pricing","After sending pricing","number")}${f("generic","After template outreach","number")}${f("nurture","Nurture touch (no reply)","number")}${f("talk","Keep a conversation warm","number")}${f("check1","First customer check-in","number")}${f("checkN","Customer check-ins after that","number","Keep under 30 so no one can claim it")}</div></section>
 <section class="setcard"><h2>Alerts</h2><p>Pop-ups show while My Day is open. Keep it pinned in a browser tab.</p>
  ${c("popups","Show pop-ups for due tasks, ROE alerts, replies and handoffs")}${c("sound","Play a sound with pop-ups")}
  <div class="setrow"><button class="btn sm" data-act="testpop">${I.bell}Test pop-up and sound</button></div></section>
 <section class="setcard"><h2>Gmail and calendar</h2><p>${Store.mcp?"My Day reads your Gmail and Google Calendar to log touches, spot replies and build meeting briefs. It never drafts or sends email.":"Gmail and Calendar work when you open My Day inside Claude with those connectors added."}</p>
  ${f("gmail","Your work email","email","Used for Gmail and Calendar links. Filled in automatically after the first Gmail check.")}
  ${f("myDomain","Your company domain","text","Emails from this domain are treated as yours or your team's.")}
  ${f("ignore","Ignore these domains","text","Comma separated. Sign-ups from these never show up.")}
  ${f("calendly","Your Calendly link","url")}
  ${c("sync","Check Gmail automatically every 15 minutes")}
  ${Store.mcp?`<div class="setrow"><button class="btn sm" data-act="gsync">${I.sync}Check Gmail now</button><span class="small">${SYNC.gmailAt?"Last checked "+new Date(SYNC.gmailAt).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"Not checked yet"}</span></div>`:""}</section>
 <section class="setcard"><h2>Metabase</h2><p>${Store.mcp?"My Day pulls the accounts under your name from the company dashboard when you open it and every hour. Only your own contacts count, and nothing from before an account became yours.":"Metabase works when you open My Day inside Claude with the Metabase connector added."}</p>
  ${f("mbSales","Your Metabase sales ID","text","The sales_id on your accounts in Metabase.")}
  ${c("mbSync","Pull my accounts from Metabase automatically")}
  ${Store.mcp?`<div class="setrow"><button class="btn sm" data-act="mbsync">${I.sync}Sync now</button><span class="small">${SYNC.mbAt?"Last synced "+new Date(SYNC.mbAt).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"Not synced yet"}</span></div>`:""}</section>
 <section class="setcard"><h2>Your data</h2><p>${ACC.length} accounts. ${Store.mode==="claude"?"Stored privately in your Claude account: teammates can't see it.":"Stored in this browser only. Open My Day inside Claude to keep it in your account."}</p>
  <div class="setrow"><button class="btn sm" data-act="import">${I.up}Import accounts</button><button class="btn sm" data-act="export">${I.down}Download backup (JSON)</button><button class="btn sm" data-act="exportcsv">${I.down}Download accounts (CSV)</button></div>
  <div class="setrow"><button class="btn sm" data-act="restore">${I.up}Restore from backup</button>${ACC.some(a=>a.sample)?`<button class="btn sm" data-act="clearsample">Remove sample accounts</button>`:`<button class="btn ghost sm" data-act="sample">Add sample accounts</button>`}</div>
  <p class="small">The backup file is also how your data moves to the hosted version later.</p></section>
 ${Team.settingsCard()}
 </div></div>`;
}
