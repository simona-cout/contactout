<script>
(function(){
"use strict";
// ================= dates =================
const S=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
let TODAY=S(new Date());
const nowH=()=>{const d=new Date();return d.getHours()+d.getMinutes()/60};
const D=s=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d,12)};
const add=(s,n)=>{const d=D(s);d.setDate(d.getDate()+n);return S(d)};
const diff=(a,b)=>Math.round((D(a)-D(b))/864e5);
const fmt=s=>s?D(s).toLocaleDateString("en-GB",{day:"numeric",month:"short"}):"";
const fmtY=s=>s?D(s).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"";
const wd=(s,o)=>D(s).toLocaleDateString("en-GB",o||{weekday:"long"});
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const mins=m=>m>=60?`${Math.floor(m/60)} h${m%60?` ${m%60} min`:""}`:`${m} min`;
const clock=x=>`${Math.floor(x)}:${String(Math.round((x%1)*60)).padStart(2,"0")}`;
const hrs=t=>{const [h,m]=t.split(":").map(Number);return h+(m||0)/60};
const rel=d=>{const n=diff(d,TODAY);if(n<0)return `${-n} ${n===-1?"day":"days"} late`;if(n===0)return "Due today";if(n===1)return "Due tomorrow";return `Due ${D(d).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}`};
const lv=k=>`--c:var(--${k});--c-bg:var(--${k}-bg);--c-on:var(--${k}-on);--c-ink:var(--${k}-ink)`;
const uid=p=>(p||"a")+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const money=v=>v?`$${Number(v).toLocaleString("en-US")}`:"";
const normDomain=s=>{s=String(s||"").trim().toLowerCase();if(!s)return "";const m=s.match(/contactout\.com\/sales\/companies\/([^/?#\s]+)/);if(m)return m[1];if(s.includes("@"))s=s.split("@").pop();return s.replace(/^https?:\/\//,"").replace(/^www\./,"").split(/[\/?#\s]/)[0]};
const emailOf=s=>{const m=String(s||"").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);return m?m[0].toLowerCase():""};

// ================= settings =================
const ROE={roe1:30,roe3:90,roe12:365};
const DEF={grace:"2026-12-14",calendly:"https://calendly.com/simona-contactout/30min",gmail:"",myDomain:"contactout.io",ignore:"herclan.com, deertees.com",reply:1,pricing:3,generic:7,nurture:60,talk:30,check1:14,checkN:29,alert1:5,alert3:5,alert12:30,sound:true,popups:true,sync:true,mbSales:"8113163",mbSync:true};
let CFG={...DEF};
const GRACE=()=>CFG.grace||"";
const gmailBase=()=>`https://mail.google.com/mail/u/${CFG.gmail?"?authuser="+encodeURIComponent(CFG.gmail):"0/"}`;
const gmailSearch=q=>`${gmailBase()}#search/${encodeURIComponent(q)}`;
const FREE=new Set(["gmail.com","googlemail.com","yahoo.com","hotmail.com","outlook.com","live.com","icloud.com","me.com","aol.com","proton.me","protonmail.com","gmx.com","mail.com","yandex.com"]);
const ignored=()=>new Set(String(CFG.ignore||"").split(/[,\s]+/).map(normDomain).filter(Boolean));

// ================= icons =================
const sv=(p,w)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w||2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const I={
 reply:sv('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v5"/>',2.2),alarm:sv('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M5 3 2 6M19 3l3 3"/>',2.2),
 sun:sv('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',2.2),
 cal:sv('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),bot:sv('<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>',2.2),
 leaf:sv('<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="M5 19 13 11"/>',2.2),check:sv('<path d="m5 12 5 5 9-10"/>',3),shield:sv('<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/>'),
 inbox:sv('<path d="M4 13h4l2 3h4l2-3h4"/><path d="M5 5h14l1 8v6H4v-6z"/>'),mail:sv('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
 li:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7.5 10h2v6.5h-2zM8.5 7.2a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2zM11.3 10h1.9v.9c.3-.5 1-1.1 2.1-1.1 2 0 2.4 1.3 2.4 3v3.7h-2v-3.3c0-.8 0-1.8-1.1-1.8s-1.3.9-1.3 1.8v3.3h-2z"/></svg>',
 lem:sv('<path d="M4 6h16M4 12h10M4 18h6"/><path d="m16 15 3 3-3 3"/>',2.2),home:sv('<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>'),board:sv('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>'),
 pipe:sv('<path d="M2 6h6l3 6-3 6H2l3-6zM11 6h6l3 6-3 6h-6l3-6z"/>'),search:sv('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),clip:sv('<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6"/>'),
 moon:sv('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),spark:sv('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
 target:sv('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),book:sv('<path d="M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M4 16a4 4 0 0 1 4-4h10"/>'),
 focus:sv('<circle cx="12" cy="12" r="3"/><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/>'),
 plus:sv('<path d="M12 5v14M5 12h14"/>'),x:sv('<path d="M6 6l12 12M18 6 6 18"/>'),copy:sv('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
 play:sv('<path d="M7 5v14l11-7z"/>'),pause:sv('<path d="M8 5v14M16 5v14"/>',2.6),phone:sv('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'),
 text:sv('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.2-4.4A8 8 0 1 1 21 12z"/><path d="M8 10h8M8 14h5"/>'),team:sv('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 5.5 5"/>'),
 hour:sv('<path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9"/>'),calp:sv('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>'),
 brief:sv('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'),ext:sv('<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
 key:sv('<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>'),gear:sv('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
 edit:sv('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m14 6 4 4"/>'),sync:sv('<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M4 3v5h5M20 21v-5h-5"/>'),
 up:sv('<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>'),down:sv('<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>'),bell:sv('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>'),
 dollar:sv('<path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'),
 flag:sv('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
 notes:sv('<path d="M5 4h14v16H5z"/><path d="M9 8h6M9 12h6M9 16h3"/>'),trash:sv('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>')
};
const CH={Email:I.mail,LinkedIn:I.li,lemlist:I.lem,Call:I.phone,Text:I.text};

// ================= data =================
let ACC=[];          // my accounts (private)
let PTASKS=[];       // my personal tasks
let TMETA={};        // overrides for generated tasks: {key:{date,time,done,subs}}
let OBJ=[], HIGHLIGHTS=[], DONE={d:TODAY,ids:[]}, SYNC={}, NOTI={}, SEEN={}, DISMISS={};
let EVENTS=[];       // from Google Calendar
let INBOUNDS=[];     // suggestions from the Inbounds label
const doneIds=()=>DONE.d===TODAY?DONE.ids:(DONE={d:TODAY,ids:[]}).ids;
const byId=id=>ACC.find(a=>a.id===id);
const live=a=>!a.assignedTo&&!a.archived&&!a.flagged;
const LIVE=()=>ACC.filter(live);

const STAGES=["Not contacted","In sequence","Generic outreach sent","No response","Nurture","My reply needed","In conversation","Waiting on them","Meeting booked","Pricing sent","Won","Lost"];
const PIPE=[["Not contacted","#7B8794"],["In sequence","#5C6BC0"],["Generic outreach sent","#0F9D9A"],["No response","#9C5BB5"],["Nurture","#7E57C2"],["My reply needed","#E5484D"],["In conversation","#2E9D57"],["Waiting on them","#2F6FDB"],["Meeting booked","#3949AB"],["Pricing sent","#F08C00"],["Won","#1B7A3D"],["Lost","#9CA3AF"]];
const SC=Object.fromEntries(PIPE);
const SHORT={"Generic outreach sent":"Outreach sent","My reply needed":"Reply needed","Waiting on them":"Waiting","In conversation":"Talking","Meeting booked":"Meeting","Not contacted":"Not started"};
const CHANNELS=["Email","LinkedIn","lemlist","Call","Text"];

// ---- persistence (Claude storage now; swap this block for a hosted database later) ----
const Store={mode:"local",db:null,user:null,mcp:null,sample:null,dl:null,uid:null,me:null,canWrite:true,
 async init(){
  if(window.MYDAY_BOOT){try{await window.MYDAY_BOOT}catch(e){}}
  if(!(window.claude&&window.claude.use))return;
  const get=n=>window.claude.use(n).catch(()=>null);
  const [db,user,mcp,sample,dl]=await Promise.all(["db","user","mcp","sample","downloads"].map(get));
  Object.assign(this,{db,user,mcp,sample,dl});
  if(user){try{this.me=await user.me();this.uid=this.me.id}catch(e){}}
  if(db&&this.uid)this.mode="claude";
 },
 mine(){return this.db.collection("data/users/"+this.uid)},
 async load(){
  if(this.mode==="claude"){const snap=await this.mine().get();const out={buckets:{},state:null};snap.docs.forEach(d=>{const v=d.data();if(d.id==="state")out.state=v;else if(/^b\d+$/.test(d.id))out.buckets[d.id]=v.accounts||[]});return out}
  try{const raw=localStorage.getItem("myday-data");if(raw)return JSON.parse(raw)}catch(e){}
  return {buckets:{},state:null};
 },
 async writeBucket(b,accs){if(this.mode==="claude"){const ref=this.mine().doc(b);if(accs.length)await ref.set({accounts:accs});else await ref.delete()}},
 async writeState(st){if(this.mode==="claude")await this.mine().doc("state").set(st)},
 writeLocal(all){try{localStorage.setItem("myday-data",JSON.stringify(all))}catch(e){}}
};
const BSIZE=40;
function pickBucket(){const ct={};ACC.forEach(a=>{if(a.b)ct[a.b]=(ct[a.b]||0)+1});for(let i=1;i<1000;i++){const k="b"+i;if((ct[k]||0)<BSIZE)return k}return "b999"}
let dirtyB=new Set(),dirtyS=false,flushT=null,syncState="idle";
function saveAcc(a){if(!a.b)a.b=pickBucket();if(a.log&&a.log.length>80)a.log=a.log.slice(-80);dirtyB.add(a.b);sched()}
function saveState(){dirtyS=true;sched()}
function sched(){clearTimeout(flushT);flushT=setTimeout(flush,600);setSave("busy")}
function stateObj(){return {v:1,cfg:CFG,ptasks:PTASKS,tmeta:TMETA,obj:OBJ,hl:HIGHLIGHTS.slice(0,200),done:DONE,sync:SYNC,noti:NOTI,seen:SEEN,dismiss:DISMISS}}
const FLYING=new Set();
async function flush(){
 const bs=[...dirtyB],s=dirtyS;dirtyB.clear();dirtyS=false;bs.forEach(b=>FLYING.add(b));
 try{
  if(Store.mode==="claude"){for(const b of bs)await Store.writeBucket(b,ACC.filter(a=>a.b===b));if(s)await Store.writeState(stateObj())}
  else{const buckets={};ACC.forEach(a=>{(buckets[a.b]=buckets[a.b]||[]).push(a)});Store.writeLocal({buckets,state:stateObj()})}
  setSave("ok");
 }catch(e){bs.forEach(b=>dirtyB.add(b));if(s)dirtyS=true;setSave("err",e&&e.code);
  if(e&&e.code==="unavailable"){clearTimeout(flushT);flushT=setTimeout(flush,3000+Math.random()*2000)}}
 setTimeout(()=>bs.forEach(b=>FLYING.delete(b)),1500);
}
// keep every open copy of My Day (tabs, sidebar) in step, so a deleted account can't be saved back
const isDeleted=a=>!!DISMISS["del:"+a.id];
function purgeDeleted(){const gone=ACC.filter(isDeleted);if(!gone.length)return false;gone.forEach(a=>{if(a.b)dirtyB.add(a.b)});ACC=ACC.filter(a=>!isDeleted(a));sched();return true}
function watchMine(){
 if(Store.mode!=="claude")return;
 Store.mine().onSnapshot(snap=>{
  let changed=false;const remoteB=new Set();
  snap.docs.forEach(d=>{const id=d.id,v=JSON.parse(JSON.stringify(d.data()||{}));
   if(id==="state"){Object.entries(v.dismiss||{}).forEach(([k,x])=>{if(!DISMISS[k]){DISMISS[k]=x;changed=true}});return}
   if(!/^b\d+$/.test(id))return;remoteB.add(id);if(dirtyB.has(id)||FLYING.has(id))return;
   const raw=v.accounts||[],remote=raw.filter(a=>!isDeleted(a));remote.forEach(a=>a.b=id);
   if(remote.length!==raw.length){ACC=ACC.filter(a=>a.b!==id).concat(remote);dirtyB.add(id);sched();changed=true;return}
   const local=ACC.filter(a=>a.b===id);
   const stable=o=>JSON.stringify(o,(k,v)=>v&&typeof v==="object"&&!Array.isArray(v)?Object.keys(v).sort().reduce((r,x)=>(r[x]=v[x],r),{}):v);
   const byIdSort=l=>l.slice().sort((x,y)=>x.id<y.id?-1:1);
   if(stable(byIdSort(local))===stable(byIdSort(remote)))return;
   ACC=ACC.filter(a=>a.b!==id).concat(remote);changed=true});
  [...new Set(ACC.map(a=>a.b))].forEach(b=>{if(b&&!remoteB.has(b)&&!dirtyB.has(b)&&!FLYING.has(b)&&snap.docs.length){ACC=ACC.filter(a=>a.b!==b);changed=true}});
  if(purgeDeleted())changed=true;
  if(changed){buildTasks();render(true)}
 },()=>{});
}
let saveMsg="";
function setSave(k,code){syncState=k;saveMsg=k==="err"?(code==="quota_exceeded"?"Storage is full: export a backup and remove old accounts":code==="invalid_argument"?"Couldn't save: check you were invited as Editor":"Couldn't save, retrying"):"";const el=document.getElementById("savest");if(el)el.outerHTML=saveBadge()}
function saveBadge(){const t=syncState==="busy"?"Saving…":syncState==="err"?saveMsg:Store.mode==="claude"?"Saved":"Saved in this browser only";return `<span class="syncst ${syncState==="err"?"err":syncState==="busy"?"busy":""}" id="savest" title="${Store.mode==="claude"?"Your pipeline is private: only you can see it":window.MYDAY_WEB?"Sign in to keep data in your account":"Open inside Claude to keep data in your account"}"><i></i>${esc(t)}</span>`}

// ================= ROE =================
const alertDays=rule=>rule==="ROE-1"?+CFG.alert1:rule==="ROE-3"?+CFG.alert3:+CFG.alert12;
function roe(a){
 if(a.stage==="Won")return {kind:"paid",label:"Paid account · yours",short:"Paid",clocks:[],rule:"",alert:false};
 if(a.paidBefore)return {kind:"paid",label:"Paying customer (from before you) · protected",short:"Paying customer",clocks:[],rule:"",alert:false};
 const clocks=[],owned=a.owned||a.claimed||TODAY;
 if(!a.first)clocks.push({rule:"ROE-1",date:add(a.claimed||owned,ROE.roe1),len:ROE.roe1,why:"first contact"});
 else clocks.push({rule:"ROE-3",date:add([a.last,a.reply,a.first].filter(Boolean).sort().pop(),ROE.roe3),len:ROE.roe3,why:"any touch"});
 const base=a.positive&&a.positive>owned?a.positive:owned;
 clocks.push({rule:"ROE-12",date:add(base,ROE.roe12),len:ROE.roe12,why:"positive reply"});
 const g=GRACE(),inGrace=g&&TODAY<g;
 const scored=clocks.map(c=>{const eff=inGrace&&c.date<g?g:c.date;return {...c,eff,left:diff(eff,TODAY),cliff:inGrace&&c.date<g}});
 scored.sort((x,y)=>(x.left-alertDays(x.rule))-(y.left-alertDays(y.rule)));
 const n=scored[0],ad=alertDays(n.rule);
 const kind=n.left<0||n.left<=2?"bad":n.left<=ad?"warn":"ok";
 const alert=kind!=="ok";
 let label,short;
 if(n.cliff){label=`Claimable ${fmt(g)} · ${n.rule} ran out ${fmt(n.date)}`;short=`Claimable ${fmt(g)} · ${n.rule}`}
 else if(n.left<0){label=`${n.rule} passed ${fmt(n.eff)} · claimable now`;short=`${n.rule} passed`}
 else if(alert){label=`${n.rule} in ${n.left} ${n.left===1?"day":"days"} · ${fmt(n.eff)}`;short=`${n.rule} in ${n.left}d`}
 else{label=`Protected until ${fmt(n.eff)} · ${n.rule}`;short=label}
 return {rule:n.rule,date:n.date,eff:n.eff,left:n.left,kind,label,short,cliff:n.cliff,inGrace,needs:n.why,clocks:scored,alert};
}
function roe12(a){const owned=a.owned||a.claimed||TODAY;const base=a.positive&&a.positive>owned?a.positive:owned;return add(base,ROE.roe12)}
function firstName(a){return a.contact?a.contact.split(" ")[0]:""}
function lastLine(a){
 const ch=a.channel==="lemlist"?"lemlist":a.channel==="LinkedIn"?"LinkedIn":a.channel?a.channel.toLowerCase():"email";
 if(!a.last&&!a.reply)return "No contact yet";
 if(a.reply&&(!a.last||a.reply>=a.last))return `Last contact: ${firstName(a)||a.company} → you · ${fmt(a.reply)} (${ch})`;
 return `Last contact: you → ${firstName(a)||a.company} · ${fmt(a.last)} (${ch})`;
}
function idleDays(a){const l=[a.last,a.reply].filter(Boolean).sort().pop();return l?diff(TODAY,l):null}
const mailGo=(a,label)=>({kind:"Email",label,url:a.thread||gmailSearch(a.email||a.domain||a.company)});


// ================= paying customers =================
const isCustomer=a=>a.stage==="Won"||!!a.paidBefore;
const renewalOf=a=>a.renewal||(a.expires&&a.expires>=add(TODAY,-60)?a.expires:"");
function custSignals(a){
 const s=[],ren=renewalOf(a),c30=+a.credits30||0,act=+a.activeUsers||0,users=+a.users||0;
 if(ren){const d=diff(ren,TODAY);if(d<0)s.push(["risk",`Renewal date passed ${fmt(ren)}`]);else if(d<=45)s.push(["renew",`Renews in ${d} ${d===1?"day":"days"} · ${fmt(ren)}`])}
 if(a.mb&&act===0&&c30===0)s.push(["risk","Not using it: no active users, no credits in 30 days"]);
 if(c30>=300||act>=3)s.push(["upsell",`Heavy use: ${c30.toLocaleString("en-US")} credits in 30 days, ${act} active ${act===1?"user":"users"}`]);
 if(users>=10&&act<users)s.push(["team",`${users} people at the company use ContactOut, ${act} active`]);
 if(!a.last||a.last<(a.claimed||""))s.push(["quiet","You haven't contacted them yet"]);
 return s;
}
function custNext(a){
 const k=custSignals(a).map(x=>x[0]);
 if(k.includes("renew"))return "Confirm the renewal and offer an annual or bigger plan";
 if(k.includes("risk"))return "Check in before they churn: offer help getting value from it";
 if(k.includes("upsell"))return "Pitch more credits, the API or a team plan";
 if(k.includes("team"))return "Offer a team plan to bring the other users under one account";
 return "Say hello, ask how it's going and what they use it for";
}

// ================= next step for an account =================
function plan(a){
 const r=roe(a);
 if(a.stage==="Lost")return {lane:null,r};
 if(isCustomer(a)){const ren=renewalOf(a);if(ren&&diff(ren,TODAY)<=30&&!(a.last&&a.last>=add(ren,-30))){const due=add(ren,-30)<TODAY?TODAY:add(ren,-30),d=diff(due,TODAY);
  return {lane:d<0?"overdue":d===0?"today":d<=7?"week":"later",due,why:`Talk to ${firstName(a)||a.company} about renewal`,sub:`Renews ${fmt(ren)}: confirm they're staying, offer annual or an upgrade`,go:mailGo(a,"Write in Gmail"),r,est:15,tag:"customer"}}}
 if(a.stage==="Won"){
  const won=a.wonDate||a.last||TODAY,firstCk=!a.lastCheck||a.lastCheck<won,due=firstCk?add(won,+CFG.check1):add(a.lastCheck,+CFG.checkN),who=firstName(a)||a.company,d=diff(due,TODAY);
  return {lane:d<0?"overdue":d===0?"today":d<=7?"week":"later",due,why:`Check in with ${who} at ${a.company}`,sub:firstCk?`Customer since ${fmt(won)}: ${CFG.check1}-day check-in on how the setup is going`:`Customer check-in: ${CFG.checkN} days since your last one`,go:mailGo(a,"Write in Gmail"),r,est:15,tag:"customer"};
 }
 const who=firstName(a),name=who||a.company;
 let due=null,why="",sub="",go=null,lane,est=10,tag="follow-up";
 const go_li={kind:"LinkedIn",label:"Open on LinkedIn",url:a.li||`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(a.company)}`};
 const go_lem={kind:"lemlist",label:"Open lemlist",url:"https://app.lemlist.com/"};
 const ago=d=>{const n=diff(TODAY,d);return n===0?"today":n===1?"yesterday":`${n} days ago`};
 const lastT=a.last||a.first||a.claimed||TODAY;
 if(a.nextDate&&a.nextStep&&a.stage!=="My reply needed"){due=a.nextDate;why=a.nextStep;sub=`Next step you set${a.nextFrom?" after the "+a.nextFrom:""}`;go=a.channel==="LinkedIn"?go_li:mailGo(a,"Open in Gmail");est=15;}
 else switch(a.stage){
  case "My reply needed": due=add(a.reply||TODAY,+CFG.reply); why=`Reply to ${name}`; sub=`${name} ${a.channel==="LinkedIn"?"messaged you on LinkedIn":a.channel==="Text"?"texted you":a.channel==="Call"?"called you":"emailed you"} ${ago(a.reply||TODAY)} and is waiting for your answer`; go=a.channel==="LinkedIn"?{...go_li,label:"Reply on LinkedIn"}:a.channel==="Text"||a.channel==="Call"?null:mailGo(a,"Reply in Gmail"); lane="reply"; est=20; tag="reply"; break;
  case "Pricing sent":{const ps=[lastT,a.stageSince].filter(Boolean).sort().pop(); due=add(ps,+CFG.pricing); why=`Follow up with ${name} on pricing`; sub=ps===TODAY?`Pricing discussed today: follow up in ${CFG.pricing} days if they go quiet`:`Pricing since ${fmt(ps)}, no reply for ${diff(TODAY,ps)} days`;} go=mailGo(a,"Open thread in Gmail"); break;
  case "Generic outreach sent": case "No response":
   if(a.seqEnded){due=TODAY; why=`Move ${a.company} to nurture`; sub=`Your lemlist sequence ended ${ago(lastT)}, they never replied`; go=go_lem; est=5; tag="nurture";}
   else if(a.stage==="No response"){due=add(lastT,+CFG.nurture); why=`Nurture touch for ${name}`; sub=`No reply so far: one touch every ${CFG.nurture} days keeps the account`; go=a.channel==="LinkedIn"?go_li:mailGo(a,"Write in Gmail"); tag="nurture";}
   else{due=add(lastT,+CFG.generic); why=`Follow up with ${name}`; sub=`You reached out ${ago(lastT)}, no reply yet (weekly follow-up)`; go=a.channel==="LinkedIn"?go_li:mailGo(a,"Open thread in Gmail");} break;
  case "Waiting on them": due=add(a.promised||add(lastT,7),1); why=`Check in with ${name}`; sub=a.promised?`They said they'd update you by ${fmt(a.promised)}`:`Waiting on them since ${fmt(lastT)}`; go=a.channel==="LinkedIn"?{...go_li,label:"Open LinkedIn chat"}:mailGo(a,"Open in Gmail"); tag=a.channel==="LinkedIn"?"linkedin":"follow-up"; break;
  case "Meeting booked":
   if(a.meetingDate&&a.meetingDate>=TODAY){due=a.meetingDate;why=`Meeting with ${name}`;sub=`Booked for ${fmt(a.meetingDate)}${a.meetingFrom?" (from your calendar)":""}: open the meeting brief beforehand`;go=mailGo(a,"Open in Gmail");tag="meeting";break;}
   if(a.meetingDate&&!(a.calls||[]).some(c=>c.d>=a.meetingDate)){due=add(a.meetingDate,1);why=`Add call notes for ${a.company}`;sub=`You met on ${fmt(a.meetingDate)}: notes set the next step and stage`;go=null;tag="meeting";est=5;break;}
  case "In conversation": due=add(lastT,+CFG.talk); why=`Reach out to ${name}`; sub=`No contact either way for ${diff(TODAY,lastT)} days, keep it from going cold`; go=mailGo(a,"Write in Gmail"); tag="nurture"; break;
  case "Nurture":
   if(a.seq){lane="auto";why="On autopilot";sub=a.seq;}
   else{due=add(lastT,+CFG.nurture); why=`Nurture touch for ${name}`; sub=`Every ${CFG.nurture} days: a short, useful note keeps the account warm`; go=a.channel==="LinkedIn"?go_li:mailGo(a,"Write in Gmail"); tag="nurture";} break;
  case "In sequence":
   if(a.liStep){due=TODAY; why=`Send LinkedIn message to ${a.company}`; sub=`Manual step in your lemlist sequence (${a.liStep.toLowerCase()})`; go=go_li; tag="linkedin";}
   else {lane="auto"; why="On autopilot"; sub=a.seq||"Running in lemlist";} break;
  case "Not contacted": lane=null; break;
 }
 // ROE alerts take over when nothing more urgent is planned
 if(r.alert&&!(lane==="reply")&&!(due&&diff(due,TODAY)<=0)){
  const left=r.cliff?diff(GRACE(),TODAY):r.left,when=left<0?`passed ${fmt(r.eff)}`:left===0?"today":`in ${left} ${left===1?"day":"days"} (${fmt(r.eff)})`;
  if(r.rule==="ROE-1"){why=`Make first contact with ${a.company}`;sub=`ROE-1 ${when}: any first touch keeps it`;go=a.li?go_li:mailGo(a,"Write in Gmail");}
  else if(r.rule==="ROE-3"){why=`Touch ${name} to keep ${a.company}`;sub=`ROE-3 ${when}: any touch resets the 90 days`;go=a.channel==="LinkedIn"?go_li:mailGo(a,"Write in Gmail");}
  else {why=`Get a positive reply from ${a.company} or hand it off`;sub=`ROE-12 ${when}: needs a positive interaction`;go={...go_li,label:"Find a new contact"};est=30;}
  due=TODAY;lane=null;tag="ROE";
 }
 if(!lane&&due){const d=diff(due,TODAY);lane=d<0?"overdue":d===0?"today":d<=7?"week":"later";}
 return {lane,due,why,sub,go,r,est,tag};
}
const LANES=[
 {k:"reply",title:"Reply now",sub:"They wrote to you. Reply today.",icon:I.reply},
 {k:"overdue",title:"Overdue",sub:"Should already have gone out.",icon:I.alarm},
 {k:"today",title:"Today",sub:"Due today.",icon:I.sun},
 {k:"week",title:"This week",sub:"Next 7 days.",icon:I.cal},
 {k:"auto",title:"On autopilot",sub:"Running in lemlist. Sends count for ROE.",icon:I.bot},
 {k:"later",title:"Later",sub:"On track.",icon:I.leaf}
];
const TAGS={customer:"#1B7A3D",meeting:"#3949AB",reply:"#D93036","follow-up":"#E5590F",linkedin:"#2F5FD0",nurture:"#7E57C2",ROE:"#0F9D9A",prep:"#2E8A57",admin:"#6B7684"};

// ================= pipeline helpers =================
const COLS=[
 {k:"Not started",c:"#7B8794",d:"Claimed, no contact yet"},{k:"Outreach",c:"#5C6BC0",d:"You reached out, no reply yet"},
 {k:"Engaged",c:"#2E9D57",d:"Back and forth at least once"},{k:"Meeting",c:"#3949AB",d:"Call or demo booked"},
 {k:"Negotiation",c:"#E5590F",d:"Pricing has been discussed"},{k:"Closed won",c:"#1B7A3D",d:"Paid, first 14 days"},
 {k:"Customers",c:"#0F766E",d:`Check-ins every ${DEF.checkN} days, upsell`},{k:"Closed lost",c:"#9CA3AF",d:"Said no"}];
function colOf(a){
 if(a.stage==="Won")return a.wonDate&&diff(TODAY,a.wonDate)>=+CFG.check1?"Customers":"Closed won"; if(a.stage==="Lost")return "Closed lost";
 if(a.stage==="Not contacted")return "Not started"; if(a.stage==="Meeting booked")return "Meeting";
 if(a.pricing||a.stage==="Pricing sent")return "Negotiation";
 if(a.reply||a.positive||["My reply needed","In conversation","Waiting on them"].includes(a.stage))return "Engaged";
 return "Outreach";
}
const ink=c=>{const n=parseInt(c.slice(1),16);return ((n>>16)*299+(n>>8&255)*587+(n&255)*114)/1000>150?"#1A1A1A":"#FFFFFF"};
const DEALST=["Meeting booked","Pricing sent","Won","In conversation","My reply needed"];
const needsSS=a=>DEALST.includes(a.stage)&&!a.inSS;
function warns(a){
 const w=[],idle=idleDays(a),r=roe(a);
 if(!["Won","Lost","Not contacted","In sequence","Nurture","No response"].includes(a.stage)&&idle!=null&&idle>=14)w.push(["stale",`Stale ${idle} days`,`No contact from you or them for ${idle} days`]);
 if(a.first&&!a.reply&&!a.positive&&diff(TODAY,a.first)>=14&&!["Won","Lost","In sequence","Nurture","No response"].includes(a.stage))w.push(["ghost","They haven't replied",`You first reached out ${fmt(a.first)}; no reply since`]);
 if(r.alert)w.push(["roe",r.short,r.label]);
 return w;
}
function health(a){const w=warns(a),i=idleDays(a);if(roe(a).kind==="bad"||(w.some(x=>x[0]==="stale")&&i>=30))return "bad";return w.length?"warn":"ok"}
// likely-to-close score (simple, explainable)
function score(a){
 if(a.stage==="Won")return null;if(a.stage==="Lost"||a.stage==="Not contacted")return null;
 let s=8;const why=[];
 if(a.reply){s+=15;why.push("they replied")}
 if(a.positive){s+=20;why.push("positive interaction")}
 if(a.stage==="Meeting booked"||(a.calls||[]).length){s+=20;why.push("meeting held or booked")}
 if(a.pricing||a.stage==="Pricing sent"){s+=15;why.push("pricing discussed")}
 if(a.value){s+=5;why.push("deal value set")}
 const i=idleDays(a);if(i!=null&&i<=7){s+=10;why.push("active this week")}else if(i!=null&&i>30){s-=15;why.push(`quiet ${i} days`)}
 if(warns(a).some(w=>w[0]==="ghost")){s-=8;why.push("no reply yet")}
 if(roe(a).kind==="bad"){s-=10;why.push("ROE at risk")}
 return {n:Math.max(1,Math.min(95,s)),why};
}
