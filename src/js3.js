
// ================= team & handoffs (shared space) =================
const Team={ids:[],names:{},rx:[],tx:[],ok:false,
 async start(){
  if(Store.mode!=="claude")return;this.ok=true;const db=Store.db,me=Store.uid;
  try{const ref=db.collection("team").doc(me);const s=await ref.get();if(!s.exists)await ref.set({uid:me,since:TODAY})}catch(e){}
  db.collection("team").onSnapshot(snap=>{this.ids=snap.docs.map(d=>d.id);this.resolve().then(()=>render(true))},()=>{});
  db.collection("handoffs").where("to","==",me).onSnapshot(snap=>{this.rx=snap.docs.map(d=>({id:d.id,...d.data()}));this.resolve().then(()=>{this.onRx();render(true)})},()=>{});
  db.collection("handoffs").where("from","==",me).onSnapshot(snap=>{this.tx=snap.docs.map(d=>({id:d.id,...d.data()}));this.resolve().then(()=>{this.onTx();render(true)})},()=>{});
 },
 async resolve(){
  if(!Store.user)return;const ids=[...new Set([...this.ids,...this.rx.map(h=>h.from),...this.tx.map(h=>h.to)])].filter(Boolean);if(!ids.length)return;
  try{const ps=await Store.user.profiles(ids);ids.forEach(i=>{if(ps[i]&&ps[i].name)this.names[i]=ps[i].name})}catch(e){}
 },
 name(id){return (this.names[id]||"Teammate").split(" ")[0]},
 others(){return this.ids.filter(i=>i!==Store.uid)},
 pending(){return this.rx.filter(h=>h.status==="sent")},
 updates(){return this.tx.filter(h=>(h.status==="claimed"||h.status==="declined")&&!SEEN["tx:"+h.id])},
 badge(){return this.pending().length+this.updates().length},
 onRx(){this.pending().forEach(h=>{if(SEEN["rx:"+h.id])return;SEEN["rx:"+h.id]=1;popup(`${this.name(h.from)} sent you ${h.acc&&h.acc.company}`,"Claim it in the Slack Accounts channel, then click Claim in Team handoff.","week",`<button class="btn primary sm" data-view="handoff">${I.team}Open Team handoff</button>`);saveState()})},
 onTx(){this.tx.forEach(h=>{const a=ACC.find(x=>x.hoId===h.id);if(!a||a.hoStatus===h.status)return;a.hoStatus=h.status;
   if(h.status==="claimed"){a.claimedOn=(h.claimedAt||"").slice(0,10)||TODAY;popup(`${this.name(h.to)} claimed ${a.company}`,"It's out of your pipeline and in theirs now.","later")}
   if(h.status==="declined")popup(`${this.name(h.to)} passed on ${a.company}`,"Take it back or send it to someone else in Team handoff.","overdue",`<button class="btn sm" data-view="handoff">Open Team handoff</button>`);
   saveAcc(a)})},
 incomingBox(){const p=this.pending();if(!p.length)return "";const by=[...new Set(p.map(h=>this.name(h.from)))].join(", ");
  return `<div class="note" style="background:var(--week-bg)">${I.team}<div><b>${esc(by)} sent you ${p.length} ${p.length===1?"account":"accounts"}.</b> Claim in the Slack Accounts channel first, then click Claim. <button class="lnk" style="background:none;border:0;padding:0;font-weight:600;text-decoration:underline" data-view="handoff">Open Team handoff</button></div></div>`},
 updatesBox(){const u=this.updates();if(!u.length)return "";
  return `<div class="note" style="background:var(--later-bg)">${I.check}<div>${u.map(h=>`<b>${esc(this.name(h.to))} ${h.status==="claimed"?"claimed":"passed on"} ${esc(h.acc&&h.acc.company)}.</b>`).join(" ")} <button class="lnk" style="background:none;border:0;padding:0;font-weight:600;text-decoration:underline" data-view="handoff">See handoffs</button></div></div>`},
 snapshot(a){return {note:handNote(a),company:a.company,domain:a.domain||"",cat:a.cat||"",contact:a.contact||"",title:a.title||"",email:a.email||"",li:a.li||"",co:a.co||"",admin:a.admin||"",signal:a.signal||"",notes:a.notes||"",summary:handoffSummary(a),log:(a.log||[]).slice(-20),first:a.first||"",last:a.last||"",reply:a.reply||"",owned:a.owned||""}},
 async send(a,to){const ref=await Store.db.collection("handoffs").add({from:Store.uid,to,status:"sent",at:new Date().toISOString(),acc:this.snapshot(a)});a.assignedTo=to;a.hoId=ref.id;a.hoStatus="sent";a.handedOn=TODAY;saveAcc(a)},
 async claim(h){
  const s=h.acc||{};
  if(ACC.some(a=>live(a)&&s.domain&&a.domain===s.domain)){toast(`${s.company} is already in your pipeline`);}
  else{const a={id:uid(),company:s.company||"Account",domain:s.domain,cat:`ROE from ${this.name(h.from)}`,contact:s.contact,title:s.title,email:s.email,li:s.li,co:s.co,admin:s.admin,signal:s.signal,
   notes:[`Handed over by ${this.name(h.from)} on ${fmt(TODAY)}. ${s.summary||""}`,s.notes].filter(Boolean).join("\n"),prev:s.log||[],claimed:TODAY,owned:TODAY,first:"",last:"",stage:"Not contacted",channel:""};
   ACC.push(a);saveAcc(a);}
  await Store.db.collection("handoffs").doc(h.id).update({status:"claimed",claimedAt:new Date().toISOString()});
  buildTasks();render();toast(`${s.company} is in your pipeline. ROE-1 starts today.`);
 },
 async decline(h){await Store.db.collection("handoffs").doc(h.id).update({status:"declined",declinedAt:new Date().toISOString()});toast("Sent back")},
 async cancel(a){if(a.hoId&&a.hoStatus==="sent"){try{await Store.db.collection("handoffs").doc(a.hoId).update({status:"cancelled"})}catch(e){}}
  ["assignedTo","hoId","hoStatus","handedOn","claimedOn","handoff"].forEach(k=>delete a[k]);saveAcc(a)},
 settingsCard(){
  if(!this.ok)return `<section class="setcard"><h2>Team</h2><p>Team handoff works once you're signed in${window.MYDAY_WEB?"":" (open My Day inside Claude)"}. Each teammate signs in with their own Claude account.</p></section>`;
  const o=this.others();
  return `<section class="setcard"><h2>Team</h2><p>Everyone has a private pipeline. Only handoffs are shared: the account name, a short history, who sent it and who it went to.</p>
   <div class="chips2">${o.length?o.map(i=>`<span class="tchip"><i>${esc(this.name(i)[0])}</i>${esc(this.name(i))}</span>`).join(""):`<span class="small">No teammates have opened My Day yet.</span>`}</div>
   ${window.MYDAY_WEB?`<p><b>To add someone:</b> send them this page's link. They sign in with their ContactOut Google account and appear here.</p>`:`<p><b>To add someone:</b> open the Share menu on this page, add their email (the one they use for Claude) as <b>Editor</b>. Don't turn on "Anyone with the link": it stops everyone from saving. They appear here the first time they open My Day.</p>`}</section>`;
 }
};
function isCandidate(a){if(!live(a)||["Won","Lost"].includes(a.stage))return false;if(a.handoff)return true;return !a.positive&&diff(roe12(a),TODAY)<=+CFG.alert12}
function handoffSummary(a){
 const ch=[...new Set([a.channel,...(a.log||[]).map(l=>l.ch)].filter(Boolean))].join(", ")||"none";
 return `Owned since ${fmtY(a.owned||a.claimed)}. First touch ${a.first?fmtY(a.first):"never"}, last touch ${a.last?fmt(a.last):"never"}. Channels tried: ${ch}. ${a.positive?"Had a positive reply":"No positive reply"}, ROE-12 on ${fmt(roe12(a))}.`;
}
function noteRule(a){const r=roe(a);if(!a.handoff||!a.positive&&diff(roe12(a),TODAY)<=+CFG.alert12)return "ROE-12";return r.alert&&r.rule?r.rule:"ROE-12"}
function rxNote(h){const s=h.acc||{};return (s.note||`${s.co||(s.domain?"https://contactout.com/sales/companies/"+s.domain:"")} ROE-12`).replace("\n"," ")}
function handNote(a){return `${coUrl(a)} ${noteRule(a)}`}
let hoPick={};
function renderHandoff(){
 const cand=LIVE().filter(isCandidate),gone=ACC.filter(a=>a.assignedTo),rx=Team.pending(),o=Team.others();
 Team.updates().forEach(h=>SEEN["tx:"+h.id]=1);if(Team.ok)saveState();
 wbar.innerHTML=`<h1>Team handoff</h1><span class="small">Send accounts you can't keep to a teammate</span><span class="sp"></span>${saveBadge()}`;
 const sel=a=>o.length?`<div class="horow"><label for="ho-${a.id}">Send to</label><select id="ho-${a.id}" data-hopick="${a.id}"><option value="">Choose teammate</option>${o.map(i=>`<option value="${esc(i)}"${hoPick[a.id]===i?" selected":""}>${esc(Team.name(i))}</option>`).join("")}</select></div>`:`<p class="small" style="margin:0">${Team.ok?"No teammates yet: share My Day with them by email as Editor.":"Open My Day inside Claude to send accounts to teammates."}</p>`;
 main.innerHTML=`<div class="wbody">
  ${rx.length?`<section class="lane" style="${lv("week")}"><div class="lh"><span class="ic">${I.inbox}</span><div><h2>Sent to you</h2><p>Copy the note, post it in the Slack Accounts channel and tag the sender, then click Claim.</p></div><span class="n">${rx.length}</span></div>
   <div class="cards">${rx.map(h=>`<article class="hocard"><div class="dc-top"><span class="dc-list">From ${esc(Team.name(h.from))} · ${fmt((h.at||"").slice(0,10))}</span></div>
    <div class="dc-name">${esc(h.acc.company)} ${h.acc.domain?`<a class="tlink" href="${esc(h.acc.co||"https://contactout.com/sales/companies/"+h.acc.domain)}" target="_blank" rel="noopener">${esc(h.acc.domain)} ${I.ext}</a>`:""}</div>
    <p class="hosum">${esc(h.acc.summary||"")}</p>${h.acc.notes?`<p class="hosum">${esc(h.acc.notes)}</p>`:""}
    <div class="acts"><button class="btn sm" data-act="rxnote" data-h="${esc(h.id)}">${I.copy}Copy note for Accounts channel</button><button class="btn primary sm" data-act="hoclaim" data-h="${esc(h.id)}">${I.check}Claim</button><button class="btn ghost sm" data-act="hodecline" data-h="${esc(h.id)}">Pass</button></div></article>`).join("")}</div></section>`:""}
  <section class="lane" style="${lv("reply")}"><div class="lh"><span class="ic">${I.team}</span><div><h2>Ready to hand off</h2><p>No positive reply and ROE-12 within ${CFG.alert12} days, or flagged by you.</p></div><span class="n">${cand.length}</span></div>
  ${cand.length?`<div class="cards">${cand.map(a=>`<article class="hocard">
    <div class="dc-top"><span class="dc-list">${esc(a.cat||"")}</span><span class="wn roe">${a.handoff&&diff(roe12(a),TODAY)>+CFG.alert12?"Flagged by you":`ROE-12 ${diff(roe12(a),TODAY)<0?"passed":"in "+diff(roe12(a),TODAY)+" days"}`}</span></div>
    <div class="dc-name"><button class="lnk" data-open="${a.id}">${esc(a.company)}</button> <a class="tlink" href="${esc(coUrl(a))}" target="_blank" rel="noopener">${esc(a.domain||"")} ${I.ext}</a></div>
    <p class="hosum">${esc(handoffSummary(a))}</p>${sel(a)}
    <div class="acts">${o.length?`<button class="btn primary sm" data-act="hoassign" data-id="${a.id}">${I.check}Send</button>`:""}${a.handoff?`<button class="btn ghost sm" data-act="hounflag" data-id="${a.id}">Keep it</button>`:""}</div>
   </article>`).join("")}</div>`:`<div class="bempty">Nothing to hand off right now.</div>`}</section>
  <section class="lane" style="${lv("auto")}"><div class="lh"><span class="ic">${I.clip}</span><div><h2>Sent to teammates</h2><p>Out of your pipeline and alerts.</p></div><span class="n">${gone.length}</span></div>
  ${gone.length?`<div class="tablewrap"><table style="min-width:600px"><thead><tr><th>Account</th><th>Sent to</th><th>Status</th><th></th></tr></thead><tbody>${gone.map(a=>`<tr><td><b style="font-weight:600">${esc(a.company)}</b><small>${esc(a.domain||"")} · sent ${fmt(a.handedOn)}</small></td><td>${esc(Team.name(a.assignedTo))}</td><td>${a.hoStatus==="claimed"?`<span class="pill" style="color:var(--later-ink)">${I.check}Claimed ${fmt(a.claimedOn)}</span>`:a.hoStatus==="declined"?`<span class="pill warn">Passed</span>`:`<span class="pill">Waiting for claim</span>`}</td><td>${a.hoStatus!=="claimed"?`<button class="btn ghost sm" data-act="houndo" data-id="${a.id}">Take back</button>`:""}</td></tr>`).join("")}</tbody></table></div>`:`<p class="small" style="margin:0">Nothing sent yet.</p>`}</section>
  <p class="small">Handoffs are visible to everyone on the team (account name, short history, who sent it, who it went to). Pipelines stay private.</p>
 </div>`;
}

// ================= record drawer =================
let logFor=null,drawerId=null;
const CHS=[["Email",I.mail],["LinkedIn",I.li],["Text",I.text],["Call",I.phone]];
function logBtn(a){
 const item=(c,ic,dir)=>`<button class="ltitem" role="menuitem" data-log="${a.id}" data-ch="${c}" data-dir="${dir}"><span class="lti">${ic}</span>${c}</button>`;
 return `<div class="lt"><button class="ltb" data-lt="${a.id}" aria-haspopup="menu" aria-expanded="${logFor===a.id}">${I.plus}Log touch</button>${logFor===a.id?`<div class="ltm" role="menu"><small>I reached out by</small>${CHS.map(([c,ic])=>item(c,ic,"me")).join("")}<small>They reached out by</small>${CHS.map(([c,ic])=>item(c,ic,"them")).join("")}</div>`:""}</div>`;
}
function applyTouch(a,ch,dir,d,url,auto){
 a.log=a.log||[];a.log.push({d,ch,dir,...(auto?{auto:1}:{})});if(url)a.thread=url;
 if(dir==="me"){
  if(!a.last||d>=a.last){a.last=d;a.channel=ch}if(!a.first||d<a.first)a.first=d;
  if(a.stage==="Won"){if(!a.lastCheck||d>a.lastCheck)a.lastCheck=d}
  else if(a.stage==="My reply needed"&&(!a.reply||d>=a.reply))a.stage=a.pricing?"Pricing sent":"In conversation";
  else if(a.stage==="Not contacted")a.stage="Generic outreach sent";
  if(a.nextDate&&a.nextDate<=d){delete a.nextDate;delete a.nextStep;delete a.nextFrom}
 }else{
  if(!a.first||d<a.first)a.first=d;
  if(!a.reply||d>=a.reply){a.reply=d;a.channel=ch}
  if(!(a.last&&a.last>d)&&!["Won","Lost"].includes(a.stage))a.stage="My reply needed";
 }
}
function logTouch(a,ch,dir,who){
 const snap=JSON.stringify(a),dsnap=[...doneIds()];
 applyTouch(a,ch,dir,TODAY);
 if(who&&(who.first||who.last||who.li||who.phone||who.email)){
  a.log[a.log.length-1].who=who;a.contacts=a.contacts||[];
  const key=p=>(p.li||p.phone||p.email||`${p.first||""} ${p.last||""}`).toLowerCase().trim();
  let c=a.contacts.find(x=>key(x)===key(who)||(who.first&&x.first===who.first&&x.last===who.last));
  if(!c){c={id:uid("c")};a.contacts.push(c)}
  ["first","last","li","phone","email","title"].forEach(k=>{if(who[k])c[k]=who[k]});c.lastCh=ch;c.lastD=TODAY;
  if(!a.contact)a.contact=[who.first,who.last].filter(Boolean).join(" ");
  if(who.email&&!a.email)a.email=who.email;
 }
 if(dir==="me")markAccDone(a.id);else{DONE.ids=doneIds().filter(x=>x!==a.id);saveState()}
 last=()=>{const o=JSON.parse(snap);Object.keys(a).forEach(k=>delete a[k]);Object.assign(a,o);DONE.ids=dsnap;saveAcc(a);saveState();buildTasks()};
 saveAcc(a);logFor=null;buildTasks();rerender();
 const nm=who?[who.first,who.last].filter(Boolean).join(" "):"";
 toast(dir==="me"?`Logged: you → ${nm||a.company} by ${ch}. ROE clock reset.`:`Logged: ${nm||a.company} → you by ${ch}. It's in Reply now.`,true);
}
const pname=p=>[p.first,p.last].filter(Boolean).join(" ")||p.email||p.phone||(p.li||"").replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//,"").replace(/\/$/,"")||"Someone";
// who did you reach? (asked after picking a channel in Log touch)
function personFields(ch,pre){
 const v=pre||{};const fld=(n,l,t,ph)=>`<label class="field">${l}<input name="${n}" type="${t||"text"}" value="${esc(v[n]||"")}" placeholder="${ph||""}"></label>`;
 return `<div class="fgrid">${fld("first","First name")}${fld("last","Last name")}
  ${ch==="LinkedIn"?`<label class="field full">LinkedIn URL<input name="li" type="url" value="${esc(v.li||"")}" placeholder="https://www.linkedin.com/in/…"></label>`:""}
  ${ch==="Call"||ch==="Text"?`<label class="field full">Phone number<input name="phone" type="tel" value="${esc(v.phone||"")}" placeholder="+1 555 123 4567"></label>`:""}
  ${ch==="Email"?`<label class="field full">Email<input name="email" type="email" value="${esc(v.email||"")}"></label>`:""}
  <label class="field full">Title (optional)<input name="title" value="${esc(v.title||"")}" placeholder="Head of Talent"></label></div>`;
}
function readPerson(f){const fd=new FormData(f),g=k=>String(fd.get(k)||"").trim();const p={first:g("first"),last:g("last"),li:g("li"),phone:g("phone"),email:emailOf(g("email")),title:g("title")};Object.keys(p).forEach(k=>{if(!p[k])delete p[k]});return p}
let LOGF=null;
function openLogForm(a,ch,dir){
 LOGF={id:a.id,ch,dir};logFor=null;
 const known=(a.contacts||[]).slice().sort((x,y)=>(y.lastD||"")>(x.lastD||"")?1:-1);
 modal(`${dir==="me"?"You reached out":"They reached out"} by ${ch} · ${esc(a.company)}`,"Who was it?",`${known.length?`<div class="dsec"><h4>People you've logged before</h4><div class="pills">${known.map(c=>`<button class="stgb" data-pickc="${c.id}" type="button">${esc(pname(c))}${c.title?` · ${esc(c.title)}`:""}</button>`).join("")}</div></div>`:""}
  <form id="logform">${personFields(ch)}<button type="submit" hidden></button></form>
  <p class="small" style="margin:0">Optional. Saved on the account so you know who you reached out to.</p>`,
  `<button class="btn ghost" data-act="logskip">Skip, just log it</button><button class="btn primary" data-act="logsave">${I.check}Log touch</button>`);
}
function saveLogForm(skip){if(!LOGF)return;const a=byId(LOGF.id),f=document.getElementById("logform");const who=skip||!f?null:readPerson(f);layer.innerHTML="";logTouch(a,LOGF.ch,LOGF.dir,who);LOGF=null}
function rerender(){render();if(drawerId!=null)openAcc(drawerId)}
function openAcc(id){
 const a=byId(id);if(!a)return;drawerId=id;
 const p=plan(a),r=roe(a),sc=score(a);
 const tl=[];
 if(a.claimed)tl.push([a.claimed,"Claimed",a.cat||"","var(--faint)"]);
 const logged=a.log||[];
 if(a.first&&!logged.some(l=>l.d===a.first))tl.push([a.first,"First touch",a.channel==="lemlist"?"lemlist sequence started":`${a.channel||""}`,"var(--week)"]);
 if(a.positive)tl.push([a.positive,"Positive interaction","Counts for ROE-12","var(--later)"]);
 if(a.last&&a.last!==a.first&&!logged.some(l=>l.dir==="me"&&l.d===a.last))tl.push([a.last,"Last touch",a.channel||"","var(--week)"]);
 if(a.reply&&!logged.some(l=>l.dir==="them"&&l.d===a.reply))tl.push([a.reply,"They replied",a.channel||"","var(--reply)"]);
 logged.forEach(l=>tl.push([l.d,l.dir==="me"?`You reached out by ${l.ch}${l.who?" to "+pname(l.who):""}`:`${l.who?pname(l.who):"They"} reached out by ${l.ch}`,l.auto?"Picked up from Gmail":"Logged by you",l.dir==="me"?"var(--week)":"var(--reply)"]));
 (a.calls||[]).forEach(c=>tl.push([c.d,"Call notes",c.summary,"var(--later)"]));
 tl.sort((x,y)=>x[0]<y[0]?1:-1);
 const seen=new Set(),tl2=tl.filter(x=>{const k=x[0]+x[1]+x[2];if(seen.has(k))return false;seen.add(k);return true}).slice(0,40);
 const clockHtml=r.clocks.map(c=>{const left=diff(c.date,TODAY),pct=Math.max(0,Math.min(100,left/c.len*100));return `<div class="clock"><span>${c.rule}</span><b>${left<0?`Ran out ${fmt(c.date)}`:`${left} days left`}</b><div class="meter"><i style="width:${pct}%;background:${left<=alertDays(c.rule)?"var(--reply)":"var(--hl)"}"></i></div></div>`}).join("")+(r.inGrace?`<div class="clock"><span>Grace</span><b>Until ${fmt(GRACE())}</b><div class="meter"><i style="width:${Math.min(100,diff(GRACE(),TODAY)/91*100)}%;background:var(--week)"></i></div></div>`:"");
 const kv=(k,v)=>v?`<span>${k}</span><b style="font-weight:500">${v}</b>`:"";
 const lk=(u,t)=>`<a href="${esc(u)}" target="_blank" rel="noopener" style="color:var(--week-ink);font-weight:500;overflow-wrap:anywhere">${esc(t)}</a>`;
 layer.innerHTML=`<div class="scrim" data-close="1" style="padding:0"></div><aside class="drawer" role="dialog" aria-label="${esc(a.company)}">
  <div class="dtop"><div class="av">${esc((a.company||"?")[0])}</div><div><h3>${esc(a.company)}${coArrow(a)}</h3><p>${esc(a.domain||"")} · ${esc(a.cat||"")} · ${esc(a.stage)}</p></div>${a.assignedTo?"":logBtn(a)}<button class="x" data-close="1" aria-label="Close">${I.x}</button></div>
  <div class="dbody">
   ${a.flagged?`<div class="note" style="background:var(--reply-bg)">${I.flag}<div><b>Do not engage: ${esc(a.flagged.reason||"")}</b>${a.flagged.note?` · ${esc(a.flagged.note)}`:""} <span class="small">(flagged ${fmt(a.flagged.d)})</span></div></div>`:""}
   ${a.assignedTo?`<div class="note">${I.team}<div><b>Sent to ${esc(Team.name(a.assignedTo))}${a.hoStatus==="claimed"?`, claimed ${fmt(a.claimedOn)}`:", waiting for claim"}.</b></div></div>`:""}
   ${p.lane&&p.lane!=="auto"&&!a.assignedTo?`<div class="card" style="${lv(p.lane)}"><div class="band">${LANES.find(l=>l.k===p.lane).icon}<div><b>${esc(p.why)}</b><small>${esc(p.sub)} · <strong>${rel(p.due)}</strong></small></div></div></div>`:""}
   <div class="acts">${p.go&&!a.assignedTo?`<a class="btn primary" href="${esc(p.go.url)}" target="_blank" rel="noopener">${CH[p.go.kind]||""}${esc(p.go.label)}</a>`:""}${a.assignedTo?"":emailBtn(a)}<button class="btn" data-act="editacc" data-id="${a.id}">${I.edit}Edit</button><button class="btn" data-act="callnotes" data-id="${a.id}">${I.notes}Call notes</button>${!a.positive||a.positive<TODAY?`<button class="btn" data-act="positive" data-id="${a.id}" title="Counts for ROE-12">${I.check}Positive reply today</button>`:""}${!["Won","Lost"].includes(a.stage)&&!a.assignedTo?`<button class="btn" data-act="hoflag" data-id="${a.id}">${I.team}Hand off</button>`:""}<button class="btn" data-act="copycal">${I.copy}Copy Calendly link</button>${a.flagged?`<button class="btn" data-act="unflag" data-id="${a.id}">Unflag</button>`:`<button class="btn ghost" data-flag="${a.id}">${I.flag}Do not engage</button>`}<button class="btn ghost" data-act="rmacc" data-id="${a.id}">${I.trash}Remove</button></div>
   <div class="pills"><a class="colink" href="${esc(coUrl(a))}" target="_blank" rel="noopener">${I.ext}ContactOut company</a>${a.admin?`<a class="colink" href="${esc(a.admin)}" target="_blank" rel="noopener">${I.key}User admin: API key, credits, usage</a>`:""}${a.thread?`<a class="colink" href="${esc(a.thread)}" target="_blank" rel="noopener">${I.mail}Latest Gmail thread</a>`:""}${a.li?`<a class="colink" href="${esc(a.li)}" target="_blank" rel="noopener">${I.li}LinkedIn</a>`:""}</div>
   ${a.assignedTo?"":`<div class="dsec"><h4>Stage: ${esc(colOf(a))}</h4>${stageBtns(a)}</div>`}
   ${warns(a).length?`<div class="dsec"><h4>Warnings</h4><div class="dc-warn">${warns(a).map(([k,t])=>`<span class="wn ${k}">${esc(t)}</span>`).join("")}</div></div>`:""}
   ${sc?`<div class="dsec"><h4>Likely to close</h4><div class="pills"><span class="score ${sc.n>=60?"hi":sc.n>=35?"mid":""}">${sc.n}%</span><span class="small">${esc(sc.why.join(" · "))}</span></div></div>`:""}
   <div class="dsec"><h4>ROE clocks</h4><div class="clocks">${clockHtml||`<p class="small">Paid account: protected.</p>`}</div></div>
   ${a.nextStep?`<div class="dsec"><h4>Next step</h4><div class="callsum"><b>${esc(a.nextStep)}</b><small>${a.nextDate?rel(a.nextDate):""}</small></div></div>`:""}
   ${(a.contacts||[]).length?`<div class="dsec"><h4>People you've reached</h4><div class="plist">${a.contacts.slice().sort((x,y)=>(y.lastD||"")>(x.lastD||"")?1:-1).map(c=>`<div class="prow"><div><b>${esc(pname(c))}</b>${c.title?`<span class="small"> · ${esc(c.title)}</span>`:""}<small>Last: ${esc(c.lastCh||"")} ${fmt(c.lastD)}</small></div><span class="pills">${c.li?`<a class="colink" href="${esc(c.li)}" target="_blank" rel="noopener">${I.li}LinkedIn</a>`:""}${c.phone?`<a class="colink" href="tel:${esc(c.phone.replace(/[^+\d]/g,""))}">${I.phone}${esc(c.phone)}</a>`:""}${c.email?`<a class="colink" href="${esc(composeUrl(c.email))}" target="_blank" rel="noopener">${I.mail}${esc(c.email)}</a>`:""}</span></div>`).join("")}</div></div>`:""}
   <div class="dsec"><h4>Details</h4><div class="kv">${kv("Contact",esc(a.contact||"Not set")+(a.title?` · ${esc(a.title)}`:""))}${kv("Email",a.email?esc(a.email):"")}${kv("Deal",`${a.value?money(a.value):"No value yet"}${a.product?` · ${esc(a.product)}`:""} · ${a.inSS?"in Sales Sharks":"not in Sales Sharks yet"}`)}${kv("Channel",esc(a.channel||"None yet"))}${kv("ContactOut",lk(coUrl(a),coUrl(a).replace("https://","")))}${kv("Owned since",fmtY(a.owned||a.claimed))}${kv("Buying signal",esc(a.signal))}${a.mb?kv("Dashboard",[a.industry,a.size?`${a.size} employees`:"",a.location].filter(Boolean).map(esc).join(" · ")):""}${a.mb?kv("Usage",`${a.users||0} users (${a.activeUsers||0} active) · ${a.credits30||0} credits last 30 days · ${a.creditsAll||0} all time`):""}${a.dashAction?kv("Dashboard says",esc(a.dashAction)):""}${kv("Notes",esc(a.notes).replace(/\n/g,"<br>"))}</div></div>
   ${(a.calls||[]).length?`<div class="dsec"><h4>Call notes</h4>${a.calls.slice().reverse().map(c=>`<div class="callsum"><small>${fmtY(c.d)}</small><span>${esc(c.summary)}</span>${c.next?`<small>Next: ${esc(c.next)}</small>`:""}</div>`).join("")}</div>`:""}
   <div class="dsec"><h4>Activity</h4><div class="tl">${tl2.map(([d,t,s,c])=>`<div class="tli" style="--tc:${c}"><b style="font-weight:600">${esc(t)}</b> <span class="small">${fmt(d)}</span><small>${esc(s)}</small></div>`).join("")||`<p class="small">No activity yet.</p>`}</div></div>
   ${(a.prev||[]).length?`<div class="dsec"><h4>Before you owned it</h4><p class="small" style="margin:0">${a.prev.length} touches by the previous owner, last ${fmt(a.prev[a.prev.length-1].d)}.</p></div>`:""}
  </div></aside>`;
}

// ================= account form =================
const FORMF=[["company","Company","text",true],["domain","Domain","text"],["cat","List","text"],["stage","Stage","stage"],["contact","Contact name","text"],["title","Contact title","text"],["email","Contact email","email"],["li","LinkedIn URL","url"],["co","ContactOut link","url"],["admin","User admin link","url"],["channel","Channel","channel"],["claimed","Claimed on","date"],["first","First touch","date"],["last","Your last touch","date"],["reply","Their last reply","date"],["positive","Last positive interaction","date"],["promised","They'll update you by","date"],["value","Deal value ($)","number"],["product","Product","text"],["wonDate","Closed won on","date"],["renewal","Renews on","date"],["signal","Buying signal","text",false,true],["notes","Notes","textarea",false,true]];
let delArm=null;
function accForm(a,pre){
 const v=a||{claimed:TODAY,stage:"Not contacted",...(pre||{})};
 const lists=[...new Set(ACC.map(x=>x.cat).filter(Boolean))];
 const fld=([k,l,t,req,full])=>{const val=v[k]??"";
  if(t==="stage")return `<label class="field">${l}<select name="${k}">${STAGES.map(s=>`<option${s===val?" selected":""}>${s}</option>`).join("")}</select></label>`;
  if(t==="channel")return `<label class="field">${l}<select name="${k}"><option value="">None yet</option>${CHANNELS.map(s=>`<option${s===val?" selected":""}>${s}</option>`).join("")}</select></label>`;
  if(t==="textarea")return `<label class="field full">${l}<textarea name="${k}" rows="3">${esc(val)}</textarea></label>`;
  return `<label class="field${full?" full":""}">${l}${req?" *":""}<input name="${k}" type="${t}" value="${esc(val)}"${req?" required":""}${k==="cat"?` list="catlist"`:""}></label>`};
 delArm=null;
 modal(a?"Edit account":"New account",a?esc(a.company):"Add an account",`<form id="accform" data-id="${a?a.id:""}"><div class="fgrid">${FORMF.map(fld).join("")}<label class="chk2 full"><input type="checkbox" name="inSS" ${v.inSS?"checked":""}>Already in Sales Sharks</label><label class="chk2 full"><input type="checkbox" name="pricing" ${v.pricing?"checked":""}>Pricing has been discussed</label></div><datalist id="catlist">${lists.map(x=>`<option value="${esc(x)}">`).join("")}</datalist><button type="submit" hidden></button></form>
  <p class="small" style="margin:0">ROE-1 counts from the claimed date until the first touch. Gmail fills in email touches automatically.</p>`,
  `${a?`<button class="btn ghost" data-act="delacc" data-id="${a.id}">${I.trash}Delete</button><span style="flex:1"></span>`:""}<button class="btn ghost" data-close="1">Cancel</button><button class="btn primary" data-act="saveacc">${I.check}Save</button>`);
}
function saveAccForm(){
 const f=document.getElementById("accform");if(!f)return;if(!f.reportValidity())return;
 const fd=new FormData(f),id=f.dataset.id,a=id?byId(id):{id:uid(),log:[]};
 FORMF.forEach(([k,,t])=>{let x=String(fd.get(k)??"").trim();if(k==="domain")x=normDomain(x);if(t==="number")x=x?Number(x):"";if(x===""&&k!=="company")delete a[k];else a[k]=x});
 a.inSS=fd.get("inSS")==="on";a.pricing=fd.get("pricing")==="on";
 if(!a.domain&&a.email&&!FREE.has(normDomain(a.email)))a.domain=normDomain(a.email);
 if(!a.domain&&a.co)a.domain=normDomain(a.co);
 if(!a.claimed)a.claimed=TODAY;a.owned=a.owned&&id?a.owned:a.claimed;
 if(!a.first&&(a.last||a.reply))a.first=[a.last,a.reply].filter(Boolean).sort()[0];
 if(a.stage==="Won"&&!a.wonDate)a.wonDate=TODAY;
 if(!id)ACC.push(a);delete a.sample;
 saveAcc(a);buildTasks();layer.innerHTML="";render();openAcc(a.id);toast(id?"Saved":`${a.company} added`);
}

// ================= remove / merge a duplicate =================
function removeDialog(a){
 const words=a.company.toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(w=>w.length>2);
 const nz=t=>String(t||"").toLowerCase().replace(/[^a-z0-9]/g,""),na=nz(a.company),sa=nz((a.domain||"").split(".")[0]);
 const cand=LIVE().filter(x=>x.id!==a.id).map(x=>{const n=x.company.toLowerCase(),nx=nz(x.company),sx=nz((x.domain||"").split(".")[0]);let sc=0;words.forEach(w=>{if(n.includes(w))sc+=2});
  if(na.length>=4&&nx.length>=4&&(na.includes(nx)||nx.includes(na)))sc+=5;if(sa.length>=4&&sx.length>=4&&(sa.startsWith(sx)||sx.startsWith(sa)))sc+=3;return [x,sc]}).sort((p,q)=>q[1]-p[1]);
 const top=cand.filter(c=>c[1]>0).slice(0,6).map(c=>c[0]);
 delArm=null;
 modal("Remove account",esc(a.company),`<div class="dsec"><h4>Added by mistake as a duplicate?</h4><p class="small" style="margin:0 0 8px">Merge it into the right account. Its touches, people, replies and notes move over, then this one is deleted.</p>
  ${top.length?`<div class="plist">${top.map(x=>`<div class="prow"><div><b>${esc(x.company)}</b><small>${esc(x.domain||"")} · ${esc(x.stage)}</small></div><button class="btn sm" data-act="mergeacc" data-id="${a.id}" data-into="${x.id}">Merge into this one</button></div>`).join("")}</div>`:""}
  <label class="field" style="margin-top:8px">Or pick another account<input id="mergein" list="mergelist" placeholder="Start typing a company"></label><datalist id="mergelist">${LIVE().filter(x=>x.id!==a.id).map(x=>`<option value="${esc(x.company)}">`).join("")}</datalist>
  <div class="setrow" style="margin-top:6px"><button class="btn sm" data-act="mergepick" data-id="${a.id}">Merge into the account above</button></div></div>
  <div class="dsec"><h4>Or delete it completely</h4><p class="small" style="margin:0">Removes the account and everything logged on it.${a.mb?" It won't be pulled back in from Metabase.":""}</p></div>`,
  `<button class="btn ghost" data-close="1">Cancel</button><button class="btn" data-act="delacc" data-id="${a.id}">${I.trash}Delete</button>`);
}
function mergeInto(a,b){
 const mx=(x,y)=>[x,y].filter(Boolean).sort().pop(),mn=(x,y)=>[x,y].filter(Boolean).sort()[0];
 b.log=[...(b.log||[]),...(a.log||[])].sort((x,y)=>x.d<y.d?-1:1).slice(-80);
 b.contacts=[...(b.contacts||[]),...(a.contacts||[])];
 b.people={...(a.people||{}),...(b.people||{})};b.calls=[...(b.calls||[]),...(a.calls||[])];
 b.first=mn(b.first,a.first);b.last=mx(b.last,a.last);b.reply=mx(b.reply,a.reply);b.positive=mx(b.positive,a.positive);
 if(a.reply&&a.reply===b.reply&&(!b.last||a.reply>=b.last)&&!["Won","Lost"].includes(b.stage))b.stage="My reply needed";
 ["email","contact","title","li","thread","admin","value","product","signal"].forEach(k=>{if(!b[k]&&a[k])b[k]=a[k]});
 if(a.notes)b.notes=[b.notes,a.notes].filter(Boolean).join("\n");
 ["first","last","reply","positive"].forEach(k=>{if(!b[k])delete b[k]});
 saveAcc(b);deleteAcc(a,b.domain||"-");
}
function deleteAcc(a,merged){
 if(a.mb&&a.domain&&merged!==a.domain)DISMISS["acc:"+a.domain]=TODAY;
 DISMISS["del:"+a.id]=TODAY;saveState();
 ACC=ACC.filter(x=>x.id!==a.id);if(a.b){dirtyB.add(a.b);sched()}
}
const rmBtn=a=>`<button class="rmx" data-rm="${a.id}" title="Remove this account" aria-label="Remove ${esc(a.company)}">${I.trash}</button>`;
const flagBtn=a=>`<button class="rmx" data-flag="${a.id}" title="Flag: do not engage" aria-label="Flag ${esc(a.company)} as do not engage">${I.flag}</button>`;
const cardTools=a=>`<span class="cardtools">${flagBtn(a)}${rmBtn(a)}</span>`;
const FLAGR=["Suspicious use","Stalking or harassment","Spam or fake sign-up","Competitor","Other"];
function flagDialog(a){
 modal("Do not engage",esc(a.company),`<p class="small" style="margin:0">The account moves to <b>Do not engage</b>: out of Today, Pipeline, alerts, handoffs and campaign lists, but kept for reference. You can unflag it any time.</p>
  <form id="flagform"><div class="dsec"><h4>Reason</h4><div class="pills">${FLAGR.map((r,i)=>`<label class="chk2" style="margin-right:10px"><input type="radio" name="reason" value="${r}"${i===0?" checked":""}>${r}</label>`).join("")}</div></div>
  <label class="field">Note (optional)<textarea name="note" rows="2" placeholder="What happened"></textarea></label><button type="submit" hidden></button></form>`,
  `<button class="btn ghost" data-close="1">Cancel</button><button class="btn primary" data-act="flagsave" data-id="${a.id}">${I.flag}Flag it</button>`);
}
function saveFlag(a){const f=document.getElementById("flagform");const fd=f?new FormData(f):null;a.flagged={d:TODAY,reason:fd?String(fd.get("reason")||"Do not engage"):"Do not engage",note:fd?String(fd.get("note")||"").trim():""};saveAcc(a);layer.innerHTML="";drawerId=null;buildTasks();render();toast(`${a.company} flagged: do not engage`)}
// ================= quick log (top bar) =================
function quickLog(){
 modal("Log a touch","Who did you talk to?",`<form id="qlform"><div class="fgrid">
  <label class="field full">Company<input name="company" list="qllist" required placeholder="Start typing, or a new company name"><small>Pick an existing account or type a new one.</small></label>
  <datalist id="qllist">${LIVE().map(a=>`<option value="${esc(a.company)}">`).join("")}</datalist>
  <label class="field">Channel<select name="ch">${CHS.map(([c])=>`<option>${c}</option>`).join("")}</select></label>
  <label class="field">Who reached out<select name="dir"><option value="me">I reached out</option><option value="them">They reached out</option></select></label>
  <label class="field">Domain (new company)<input name="domain" placeholder="acme.com"></label>
  <label class="field">Contact (new company)<input name="contact"></label>
  <label class="field full">List (new company)<input name="cat" list="catlist2" value="Inbound"></label>
  <label class="field">Their first name<input name="first"></label><label class="field">Their last name<input name="last"></label>
  <label class="field full">LinkedIn URL, phone number or email<input name="reach" placeholder="Whatever you used to reach them"></label></div>
  <datalist id="catlist2">${[...new Set(ACC.map(x=>x.cat).filter(Boolean))].map(x=>`<option value="${esc(x)}">`).join("")}</datalist><button type="submit" hidden></button></form>`,
  `<button class="btn ghost" data-close="1">Cancel</button><button class="btn primary" data-act="saveql">${I.check}Log it</button>`);
}
function saveQuickLog(){
 const f=document.getElementById("qlform");if(!f||!f.reportValidity())return;const fd=new FormData(f);
 const name=String(fd.get("company")).trim();let a=LIVE().find(x=>x.company.toLowerCase()===name.toLowerCase());
 if(!a){a={id:uid(),company:name,domain:normDomain(fd.get("domain")),contact:String(fd.get("contact")||"").trim(),cat:String(fd.get("cat")||"").trim(),claimed:TODAY,owned:TODAY,stage:"Not contacted",log:[]};ACC.push(a)}
 const r=String(fd.get("reach")||"").trim(),who={first:String(fd.get("first")||"").trim(),last:String(fd.get("last")||"").trim()};
 if(/linkedin\.com/i.test(r))who.li=r;else if(emailOf(r))who.email=emailOf(r);else if(/^[+\d][\d\s().-]{5,}$/.test(r))who.phone=r;
 Object.keys(who).forEach(k=>{if(!who[k])delete who[k]});
 layer.innerHTML="";logTouch(a,fd.get("ch"),fd.get("dir"),who);
}

// ================= call notes (Gong-style) =================
let CALL={id:null,res:null,busy:false};
function callNotes(id){
 CALL={id,res:null,busy:false};const a=byId(id);
 modal("Call notes",esc(a.company),`<label class="field">Paste or type your notes from the call<textarea id="callraw" rows="8" placeholder="Who was on, what they need, objections, pricing, what you agreed to do next"></textarea></label><div id="callres"></div>
  ${Store.sample?"":`<p class="small" style="margin:0">Summaries need My Day open inside Claude. You can still save the notes.</p>`}`,
  `<button class="btn ghost" data-close="1">Cancel</button>${Store.sample?`<button class="btn" data-act="callsum">${I.spark}Summarize</button>`:""}<button class="btn primary" data-act="callsave">${I.check}Save to account</button>`);
}
async function callSummarize(){
 const raw=(document.getElementById("callraw")||{}).value||"";if(!raw.trim()){toast("Add your notes first");return}
 const box=document.getElementById("callres");box.innerHTML=`<p class="small">Summarizing…</p>`;CALL.busy=true;
 const a=byId(CALL.id);
 try{
  const out=await Store.sample.json(`You summarize sales call notes for a B2B sales rep at ContactOut (a contact data company). Today is ${TODAY}. The account is ${a.company}.
Return only JSON with these keys:
"summary": 2 to 3 plain sentences on what was discussed and where the deal stands,
"next_step": the rep's next action, verb first, at most 10 words, or "" if none,
"next_date": the date for that next step as YYYY-MM-DD, or "" if not stated (use a sensible date if they said "next week" etc.),
"pricing_discussed": true or false,
"positive": true if the prospect showed real interest,
"stage": one of "Meeting booked","Pricing sent","In conversation","Waiting on them","Won","Lost", or "" if unclear.

Notes:
${raw}`,{modelTier:"quick"});
  CALL.res=out||null;
  box.innerHTML=out?`<div class="callsum"><b>Summary</b><span>${esc(out.summary||"")}</span>${out.next_step?`<small>Next step: ${esc(out.next_step)}${out.next_date?` · ${fmtY(out.next_date)}`:""}</small>`:""}<small>${out.pricing_discussed?"Pricing discussed · ":""}${out.positive?"Positive interaction (resets ROE-12)":"No clear positive signal"}${out.stage?` · Stage: ${esc(out.stage)}`:""}</small></div>`:`<p class="small">No summary came back. You can still save the notes.</p>`;
 }catch(e){box.innerHTML=`<p class="small">${e&&e.code==="not_granted"?"Summaries are turned off for this page.":e&&e.code==="rate_limited"?"Too many requests right now. Try again in a minute.":"Couldn't summarize right now. You can still save the notes."}</p>`}
 CALL.busy=false;
}
function callSave(){
 const a=byId(CALL.id),raw=((document.getElementById("callraw")||{}).value||"").trim(),r=CALL.res;
 if(!raw&&!r){toast("Nothing to save");return}
 a.calls=a.calls||[];a.calls.push({d:TODAY,summary:(r&&r.summary)||raw.slice(0,400),next:(r&&r.next_step)||""});if(a.calls.length>20)a.calls=a.calls.slice(-20);
 applyTouch(a,"Call","me",TODAY);
 if(r){if(r.pricing_discussed)a.pricing=true;if(r.positive)a.positive=TODAY;if(r.next_step){a.nextStep=r.next_step;a.nextDate=/^\d{4}-\d{2}-\d{2}$/.test(r.next_date||"")?r.next_date:add(TODAY,2);a.nextFrom="call"}
  if(r.stage&&STAGES.includes(r.stage)){a.stage=r.stage;if(r.stage==="Won"&&!a.wonDate)a.wonDate=TODAY}}
 markAccDone(a.id);saveAcc(a);buildTasks();layer.innerHTML="";render();openAcc(a.id);toast("Call notes saved");
}

// ================= meeting brief =================
function openBrief(i){
 const e=EVENTS[i];if(!e)return;const a=e.acc?byId(e.acc):null,r=a?roe(a):null;
 const row=(k,v)=>v?`<span>${k}</span><b style="font-weight:500">${v}</b>`:"";
 const lk=(u,t)=>`<a href="${esc(u)}" target="_blank" rel="noopener" style="color:var(--week-ink)">${esc(t)}</a>`;
 modal(`Meeting brief · ${wd(e.d,{weekday:"long",day:"numeric",month:"long"})}, ${clock(e.s)} to ${clock(e.e)}`,esc(e.t),`
  <div class="dsec"><h4>Who's coming</h4><div class="kv">${row("Name",esc(e.who||"From the invite"))}${row("Email",esc(e.mail))}${row("Booked through",esc(e.via))}${e.phone?row("Phone",esc(e.phone)):""}${row("LinkedIn",lk(a&&a.li||`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent((e.who||"")+" "+(e.company||e.domain||""))}`,a&&a.li?"Open profile":"Search on LinkedIn"))}</div></div>
  ${e.qa.length?`<div class="dsec"><h4>What they wrote when booking</h4>${e.qa.map(([q,ans])=>`<div class="callsum"><small>${esc(q)}</small><span>${esc(ans)}</span></div>`).join("")}</div>`:""}
  <div class="dsec"><h4>Company</h4><div class="kv">${row("Domain",e.domain?lk(`https://contactout.com/sales/companies/${e.domain}`,`${e.domain} (ContactOut)`):"")}${a?row("Account",esc(a.company)):""}${a&&a.admin?row("User admin",lk(a.admin,"API key, credits, usage")):""}${a?row("Pipeline",`${esc(colOf(a))} · ${esc(a.stage)}`):""}${a?row("Deal",a.value?money(a.value):"No value yet"):""}${a?row("Buying signal",esc(a.signal)):""}</div>${a?"":`<p class="small" style="margin:8px 0 0">Not in My Day yet. <button class="lnk" style="background:none;border:0;padding:0;font-weight:600;text-decoration:underline" data-act="evacc" data-ev="${i}">Add it as an account</button></p>`}</div>
  ${a?`<div class="dsec"><h4>History</h4><div class="kv">${row("First touch",a.first?`${fmtY(a.first)} (${esc(a.channel||"")})`:"")}${row("Last contact",esc(lastLine(a).replace("Last contact: ","")))}${row("Notes",esc(a.notes))}${row("ROE",esc(r.label))}</div></div>`:""}
  <p class="small" style="margin:0">Built from the Google Calendar invite and your account record. After the call, use Call notes on the account.</p>`,
  `<a class="btn" href="${esc(e.link)}" target="_blank" rel="noopener">${I.cal}Open invite</a>${e.conf?`<a class="btn" href="${esc(e.conf)}" target="_blank" rel="noopener">Join call</a>`:""}${a?`<button class="btn" data-open="${a.id}">Full account</button>`:""}<button class="btn primary" data-close="1">Done</button>`);
}

// ================= modal, rituals, focus =================
function modal(top,title,body,foot){layer.innerHTML=`<div class="scrim" data-close="1"><div class="modal" role="dialog" aria-label="${esc(String(title).replace(/<[^>]+>/g,""))}" data-stop="1"><div class="mtop"><small>${top}</small><h3>${title}</h3></div><div class="mcont">${body}</div><div class="mfoot">${foot}</div></div></div>`;const f=layer.querySelector(".mcont input,.mcont textarea");if(f)setTimeout(()=>f.focus(),30)}
function weekStart(d){const x=D(d),w=(x.getDay()+6)%7;return add(d,-w)}
function ritual(m){
 const todayT=TASKS.filter(t=>t.date===TODAY);
 if(m==="shutdown"){
  const dn=todayT.filter(t=>t.done),open=todayT.filter(t=>!t.done),acc=doneIds().map(byId).filter(Boolean);
  modal("Daily shutdown","Wrap up your day",`<div class="dsec"><h4>Done today (${dn.length+acc.length})</h4>${[...dn.map(t=>t.title+(t.sub?` · ${t.sub}`:"")),...acc.map(a=>"Touch logged · "+a.company)].map(x=>`<div class="hl-item"><span>✓ ${esc(x)}</span></div>`).join("")||`<p class="small">Nothing marked done yet.</p>`}</div>
   <div class="dsec"><h4>Not finished (${open.length}) · will move to tomorrow</h4>${open.map(t=>`<label class="pick"><input type="checkbox" checked data-roll="${esc(t.key)}"><span>${esc(t.title)}${t.sub?` <em>· ${esc(t.sub)}</em>`:""}</span><span class="est">${mins(t.est)}</span></label>`).join("")||`<p class="small">All clear.</p>`}</div>
   <label class="field" for="win">Today's highlight<textarea id="win" rows="2" placeholder="One win from today"></textarea></label>`,`<button class="btn ghost" data-close="1">Cancel</button><button class="btn primary" data-act="sdone">${I.moon}Shut down for today</button>`);
 }
 if(m==="highlights")modal("Daily highlights","Your wins",HIGHLIGHTS.map(h=>`<div class="hl-item"><b>${wd(h.d,{weekday:"short",day:"numeric",month:"short"})}</b><span>${esc(h.t)}</span></div>`).join("")||`<p class="small">Add a highlight at Daily shutdown.</p>`,`<button class="btn primary" data-close="1">Close</button>`);
 if(m==="wplan")modal(`Weekly planning · week of ${fmt(weekStart(TODAY))}`,"This week's objectives",OBJ.map((o,i)=>`<div class="obj"><div><b>${esc(o.t)}</b><span>${o.n} of ${o.of}</span><span class="setrow" style="margin-left:auto"><button class="btn sm" data-act="objm" data-i="${i}" aria-label="Minus one">−</button><button class="btn sm" data-act="objp" data-i="${i}" aria-label="Plus one">+</button><button class="btn ghost sm" data-act="objd" data-i="${i}" aria-label="Remove">${I.x}</button></span></div><div class="meter"><i style="width:${Math.min(100,o.n/o.of*100)}%"></i></div></div>`).join("")+`<form class="addtask" id="objform">${I.plus}<input id="objin" placeholder="Add an objective, e.g. Book 3 meetings"><input id="objof" type="number" min="1" value="5" style="width:60px;flex:none" aria-label="Target"></form><p class="small" style="margin:0">Objectives show in the sidebar all week. Keep it to three.</p>`,`<button class="btn primary" data-close="1">Done</button>`);
 if(m==="wreview"){
  const to=TODAY,fr=add(TODAY,-6),inW=d=>d>=fr&&d<=to,L=[];ACC.forEach(a=>(a.log||[]).forEach(l=>{if(inW(l.d))L.push([a,l])}));
  const me=L.filter(([a,l])=>l.dir==="me"),chs=["Email","LinkedIn","Call","Text"].map(c=>[c,me.filter(([a,l])=>l.ch===c).length]),mx=Math.max(1,...chs.map(x=>x[1]));
  const won=ACC.filter(a=>a.wonDate&&inW(a.wonDate));
  modal(`Weekly review · ${fmt(fr)} to ${fmt(to)}`,"How the week went",`<div class="kpis">${[[me.length,"Touches"],[L.filter(([a,l])=>l.dir==="them").length,"Replies"],[ACC.filter(a=>(a.calls||[]).some(c=>inW(c.d))).length,"Calls logged"],[won.length,"Deals won"],[money(won.reduce((s,a)=>s+(+a.value||0),0))||"$0","Closed"]].map(([n,l])=>`<div class="kpi"><b>${n}</b><span>${l}</span></div>`).join("")}</div>
   <div class="dsec"><h4>Touches by channel</h4><div class="bars">${chs.map(([l,n])=>`<div class="barrow"><span>${l}</span><div class="meter"><i style="width:${n/mx*100}%"></i></div><b>${n}</b></div>`).join("")}</div></div>
   ${OBJ.length?`<div class="dsec"><h4>Objectives</h4>${OBJ.map(o=>`<div class="obj"><div><b>${esc(o.t)}</b><span>${o.n} of ${o.of}</span></div><div class="meter"><i style="width:${Math.min(100,o.n/o.of*100)}%"></i></div></div>`).join("")}</div>`:""}
   <p class="small" style="margin:0">Counts touches you logged and ones picked up from Gmail.</p>`,`<button class="btn primary" data-close="1">Finish review</button>`);}
 if(m==="focus")startFocus();
}
let ftimer=null,fleft=0,ftotal=0,fqueue=[];
const ORDER=["reply","overdue","today","week"];
function startFocus(fromKey){
 fqueue=TASKS.filter(t=>t.date===TODAY&&!t.done).sort((a,b)=>ORDER.indexOf(a.lane)-ORDER.indexOf(b.lane));
 if(fromKey){const i=fqueue.findIndex(t=>t.key===fromKey);if(i>0)fqueue.unshift(...fqueue.splice(i,1));}
 if(!fqueue.length){toast("Nothing left for today");return}
 focusShow();
}
function focusShow(){
 const t=fqueue[0];clearInterval(ftimer);ftimer=null;ftotal=fleft=t.est*60;
 const a=t.acc?byId(t.acc):null,p=a?plan(a):null;
 layer.innerHTML=`<div class="focusview" role="dialog" aria-label="Focus"><div class="fcard" style="${lv(t.lane||"today")}"><small>Focus · ${fqueue.length} ${fqueue.length===1?"task":"tasks"} left today</small><h2>${esc(t.title)}</h2>${t.sub?`<div class="small" style="font-size:15px">${esc(t.sub)}</div>`:""}
  <div class="timer" id="ftime">${mm(fleft)}</div><div class="ring"><i id="fbar" style="width:100%"></i></div>
  <div class="acts">${p&&p.go?`<a class="btn" href="${esc(p.go.url)}" target="_blank" rel="noopener">${CH[p.go.kind]||""}${esc(p.go.label)}</a>`:""}<button class="btn" data-act="fplay" id="fplay">${I.play}Start timer</button><button class="btn primary" data-act="fdone">${I.check}Done, next task</button></div>
  <button class="btn ghost" data-act="fexit">Exit focus</button></div></div>`;
}
const mm=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

// ================= toast & pop-ups =================
let tt=null,last=null;
function toast(m,undo){const t=document.getElementById("toast");document.getElementById("toast-msg").textContent=m;document.getElementById("toast-undo").hidden=!undo;t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,4500)}
document.getElementById("toast-undo").addEventListener("click",()=>{if(!last)return;last();last=null;render();document.getElementById("toast").hidden=true});
let actx=null;
function chime(){if(!CFG.sound)return;try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();if(actx.state==="suspended")actx.resume();const t=actx.currentTime;[784,1175].forEach((f,i)=>{const o=actx.createOscillator(),g=actx.createGain(),s=t+i*.16;o.type="sine";o.frequency.value=f;g.gain.setValueAtTime(0.0001,s);g.gain.exponentialRampToValueAtTime(.2,s+.02);g.gain.exponentialRampToValueAtTime(.0001,s+.6);o.connect(g);g.connect(actx.destination);o.start(s);o.stop(s+.65)})}catch(e){}}
document.addEventListener("pointerdown",()=>{try{if(!actx)actx=new (window.AudioContext||window.webkitAudioContext)();if(actx.state==="suspended")actx.resume()}catch(e){}});
function popup(title,body,lane,acts){
 if(!CFG.popups){toast(title);return}
 const box=document.getElementById("popups"),el=document.createElement("div");
 el.className="popup";el.setAttribute("role","status");el.style.cssText=lv(lane||"week");
 el.innerHTML=`<b>${esc(title)}</b>${body?`<span>${esc(body)}</span>`:""}<div class="acts">${acts||""}<button class="btn ghost sm" data-popx="1">Dismiss</button></div>`;
 box.prepend(el);while(box.children.length>4)box.lastChild.remove();chime();
}
document.getElementById("popups").addEventListener("click",e=>{const el=e.target.closest(".popup");if(!el)return;if(e.target.closest("[data-popx]")||e.target.closest("[data-view],[data-open],[data-act]"))setTimeout(()=>el.remove(),0)});
