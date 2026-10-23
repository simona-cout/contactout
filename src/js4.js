
// ================= import =================
const FIELDS=[["company","Company *",/^(company|account|company name|account name|organi[sz]ation)$/i,/company|account|organi/i],["domain","Domain or website",/^(domain|website|company domain|url)$/i,/domain|website|site/i],["co","ContactOut link",/contactout/i],["contact","Contact name",/^(contact|contact name|name|full name|person|prospect)$/i,/contact name|full name|person|prospect|first name/i],["title","Contact title",/title|position|role|job/i],["email","Contact email",/e-?mail/i],["li","LinkedIn URL",/linkedin/i],["cat","List",/^(list|category|source|type|segment)$/i,/list|categor|source|segment/i],["stage","Stage or status",/stage|status/i],["channel","Channel",/channel|medium/i],["claimed","Claimed date",/claim|added|assigned|created/i],["first","First touch date",/first/i],["last","Last touch date",/^last|last (touch|contact|outreach|activity|email)/i],["reply","Their last reply date",/repl/i],["value","Deal value",/value|amount|deal size|revenue/i],["product","Product",/product|plan|package/i],["notes","Notes",/note|comment|remark/i],["admin","Admin link",/admin/i]];
let IMP=null;
function parseCSV(text){
 const delim=(text.split("\n")[0].match(/\t/g)||[]).length>(text.split("\n")[0].match(/,/g)||[]).length?"\t":(text.split("\n")[0].match(/;/g)||[]).length>(text.split("\n")[0].match(/,/g)||[]).length?";":",";
 const rows=[];let row=[],cur="",q=false;
 for(let i=0;i<text.length;i++){const c=text[i];
  if(q){if(c==='"'){if(text[i+1]==='"'){cur+='"';i++}else q=false}else cur+=c}
  else if(c==='"')q=true;else if(c===delim){row.push(cur);cur=""}else if(c==="\n"||c==="\r"){if(c==="\r"&&text[i+1]==="\n")i++;row.push(cur);rows.push(row);row=[];cur=""}else cur+=c}
 if(cur||row.length){row.push(cur);rows.push(row)}
 return rows.filter(r=>r.some(x=>String(x).trim()));
}
function parseDate(v){
 if(v==null||v==="")return "";
 if(v instanceof Date&&!isNaN(v))return S(v);
 if(typeof v==="number"||/^\d{5}(\.\d+)?$/.test(String(v).trim())){const n=Number(v);if(n>20000&&n<80000){const d=new Date(Math.round((n-25569)*864e5));return S(new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),12))}}
 const s=String(v).trim();let m;
 if((m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)))return S(new Date(+m[1],+m[2]-1,+m[3],12));
 if((m=s.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})$/))){let y=+m[3];if(y<100)y+=2000;let d=+m[1],mo=+m[2];if(mo>12&&d<=12)[d,mo]=[mo,d];return S(new Date(y,mo-1,d,12))}
 const t=Date.parse(s);if(!isNaN(t)){const d=new Date(t);if(!/\d{4}/.test(s))d.setFullYear(new Date().getFullYear());return S(d)}
 return "";
}
function mapStage(v,a){
 const s=String(v||"").toLowerCase();
 const exact=STAGES.find(x=>x.toLowerCase()===s);if(exact)return exact;
 if(/closed won|won|paid|customer/.test(s))return "Won";if(/lost|not interested|closed lost|dead/.test(s))return "Lost";
 if(/reply needed|need.*reply|to reply/.test(s))return "My reply needed";if(/pric|proposal|quote|negotiat/.test(s))return "Pricing sent";
 if(/meeting|demo|call booked|scheduled/.test(s))return "Meeting booked";if(/waiting|pending|follow.?up later/.test(s))return "Waiting on them";
 if(/convers|engaged|talking|replied|interested/.test(s))return "In conversation";if(/nurtur/.test(s))return "Nurture";
 if(/sequence|lemlist|campaign|automated/.test(s))return "In sequence";if(/no (response|reply)|ghost/.test(s))return "No response";
 if(/sent|contacted|outreach|emailed|messaged/.test(s))return "Generic outreach sent";
 return a.first||a.last?"Generic outreach sent":"Not contacted";
}
function mapChannel(v){const s=String(v||"").toLowerCase();if(!s)return "";if(/linked/.test(s))return "LinkedIn";if(/lem|sequence|campaign/.test(s))return "lemlist";if(/call|phone/.test(s))return "Call";if(/text|sms|whats/.test(s))return "Text";return "Email"}
function importStart(){
 IMP={rows:null,headers:[],map:{},list:"",file:""};
 modal("Import accounts","Bring in your accounts",`<div class="dropzone"><b>Choose a CSV or Excel file</b><button class="btn primary" data-act="pickfile">${I.up}Choose file</button><span>or paste rows copied from Google Sheets (include the header row)</span><textarea id="pastein" placeholder="Paste your rows here"></textarea><button class="btn" data-act="readpaste">Use pasted rows</button></div>
 <p class="small" style="margin:0"><b>Only a company name is required.</b> Any other columns you have (website, contact, email, dates, status) are used if they're there; next you'll match them up. Duplicates (same domain as an account you already have) are skipped. Nothing is sent anywhere: rows go straight into your private pipeline.</p>`,`<button class="btn ghost" data-close="1">Cancel</button>`);
}
let XLSXp=null;
function loadXLSX(){if(window.XLSX)return Promise.resolve(window.XLSX);if(XLSXp)return XLSXp;XLSXp=new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";s.onload=()=>res(window.XLSX);s.onerror=()=>{XLSXp=null;rej(new Error("load"))};document.head.appendChild(s)});return XLSXp}
async function readFile(file){
 IMP.file=file.name.replace(/\.[^.]+$/,"");
 try{
  if(/\.xlsx?$/i.test(file.name)){const X=await loadXLSX();const wb=X.read(await file.arrayBuffer(),{type:"array",cellDates:true});const sh=wb.Sheets[wb.SheetNames[0]];importRows(X.utils.sheet_to_json(sh,{header:1,raw:true,defval:""}));}
  else importRows(parseCSV(await file.text()));
 }catch(e){toast("Couldn't read that file. Try saving it as CSV.")}
}
function importRows(rows){
 rows=(rows||[]).filter(r=>r&&r.some(x=>String(x??"").trim()));
 if(rows.length<2){toast("No rows found. Include the header row.");return}
 IMP.headers=rows[0].map(h=>String(h??"").trim());IMP.rows=rows.slice(1);IMP.map={};const used=new Set();
 [2,3].forEach(pass=>FIELDS.forEach(f=>{if(IMP.map[f[0]]!=null||!f[pass])return;const i=IMP.headers.findIndex((h,j)=>!used.has(j)&&h&&f[pass].test(h)&&!(f[0]==="domain"&&/linkedin|contactout/i.test(h))&&!(f[0]==="contact"&&/mail|title|linkedin/i.test(h)));if(i>=0){IMP.map[f[0]]=i;used.add(i)}}));
 if(IMP.map.company==null){const i=IMP.headers.findIndex((h,j)=>!used.has(j)&&/name/i.test(h));if(i>=0)IMP.map.company=i}
 IMP.list=IMP.file||"Imported";importMap();
}
function importBuild(){
 const g=(r,k)=>IMP.map[k]==null?"":r[IMP.map[k]];const out=[],have=new Set(ACC.map(a=>a.domain||a.company.toLowerCase()));let dup=0,skip=0;
 IMP.rows.forEach(r=>{const company=String(g(r,"company")??"").trim();if(!company){skip++;return}
  const a={id:uid(),company,domain:normDomain(g(r,"domain"))||normDomain(g(r,"co")),co:String(g(r,"co")||"").trim(),contact:String(g(r,"contact")||"").trim(),title:String(g(r,"title")||"").trim(),email:emailOf(g(r,"email")),li:String(g(r,"li")||"").trim(),cat:String(g(r,"cat")||"").trim()||IMP.list,
   claimed:parseDate(g(r,"claimed"))||TODAY,first:parseDate(g(r,"first")),last:parseDate(g(r,"last")),reply:parseDate(g(r,"reply")),value:Number(String(g(r,"value")||"").replace(/[^0-9.]/g,""))||"",product:String(g(r,"product")||"").trim(),notes:String(g(r,"notes")||"").trim(),admin:String(g(r,"admin")||"").trim(),channel:mapChannel(g(r,"channel")),log:[]};
  if(!a.domain&&a.email&&!FREE.has(normDomain(a.email)))a.domain=normDomain(a.email);
  if(!/^https?:/i.test(a.co))a.co="";if(!/^https?:/i.test(a.li))a.li="";if(!/^https?:/i.test(a.admin))a.admin="";
  a.owned=a.claimed;if(!a.first&&(a.last||a.reply))a.first=[a.last,a.reply].filter(Boolean).sort()[0];
  a.stage=mapStage(g(r,"stage"),a);if(a.stage==="Won")a.wonDate=a.last||a.claimed;
  if(a.stage==="My reply needed"&&!a.reply)a.reply=a.last||TODAY;
  Object.keys(a).forEach(k=>{if(a[k]===""&&k!=="company")delete a[k]});
  const key=a.domain||a.company.toLowerCase();if(have.has(key)){dup++;return}have.add(key);out.push(a)});
 return {out,dup,skip};
}
function importMap(){
 const opts=sel=>`<option value="">Not in file</option>`+IMP.headers.map((h,i)=>`<option value="${i}"${sel===i?" selected":""}>${esc(h||"Column "+(i+1))}</option>`).join("");
 const {out,dup,skip}=importBuild();
 const noClaim=IMP.map.claimed==null;
 modal("Import accounts",`Match your columns · ${IMP.rows.length} rows`,`<label class="field">List name for rows without one<input id="implist" value="${esc(IMP.list)}"></label>
  <table class="maptable"><tbody>${FIELDS.map(([k,l])=>`<tr><td>${l}</td><td><select data-imap="${k}">${opts(IMP.map[k])}</select></td></tr>`).join("")}</tbody></table>
  <div class="callsum"><b>${out.length} ${out.length===1?"account":"accounts"} ready to import</b><small>${dup?`${dup} already in My Day (skipped). `:""}${skip?`${skip} rows without a company name (skipped). `:""}${noClaim?"No claimed date column: today is used, so ROE-1 starts today for accounts without a first touch.":""}</small></div>`,
  `<button class="btn ghost" data-close="1">Cancel</button><button class="btn primary" data-act="doimport"${out.length?"":" disabled"}>${I.check}Import ${out.length}</button>`);
}
function doImport(){const {out}=importBuild();out.forEach(a=>{ACC.push(a);saveAcc(a)});layer.innerHTML="";buildTasks();view="today";render();toast(`${out.length} accounts imported`);IMP=null}

// ================= export / restore =================
async function saveFile(filename,data,type){
 if(Store.dl){try{await Store.dl.save({filename,data});return}catch(e){if(e&&e.code==="declined"||e&&e.code==="cancelled")return}}
 try{const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}catch(e){toast("Download isn't available here")}
}
function exportJSON(){saveFile(`my-day-backup-${TODAY}.json`,JSON.stringify({app:"My Day",version:1,exported:new Date().toISOString(),accounts:ACC,state:stateObj()},null,1),"application/json")}
function exportCSV(){
 const cols=["company","domain","cat","stage","channel","contact","title","email","li","co","admin","claimed","owned","first","last","reply","positive","value","product","inSS","wonDate","notes"];
 const q=v=>{const s=String(v??"");return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s};
 const rows=[[...cols,"roe_status","next_step","next_due"].join(",")].concat(ACC.map(a=>{const r=roe(a),p=plan(a);return [...cols.map(c=>q(a[c])),q(r.label),q(p.why||""),q(p.due||"")].join(",")}));
 saveFile(`my-day-accounts-${TODAY}.csv`,rows.join("\n"),"text/csv");
}
async function restoreFile(file){
 try{const j=JSON.parse(await file.text());if(!j||!Array.isArray(j.accounts))throw 0;
  let n=0;j.accounts.forEach(x=>{const i=ACC.findIndex(a=>a.id===x.id);delete x.b;if(i>=0){x.b=ACC[i].b;ACC[i]=x}else ACC.push(x);saveAcc(x);n++});
  if(j.state){const s=j.state;CFG={...DEF,...(s.cfg||{})};PTASKS=s.ptasks||PTASKS;OBJ=s.obj||OBJ;HIGHLIGHTS=s.hl||HIGHLIGHTS;saveState()}
  buildTasks();render();toast(`Restored ${n} accounts`)}catch(e){toast("That isn't a My Day backup file")}
}


// ================= people at an account (email picker) =================
const PEOPLE={};   // in-memory cache per account: {loading, list, err}
function nameOf(s){const m=String(s||"").match(/^"?([^"<]+?)"?\s*</);return m?m[1].trim():""}
function notePeople(a,m,d,idx){
 const add=(raw)=>{const e=emailOf(raw);if(!e||lookup(e,idx)!==a)return;a.people=a.people||{};const p=a.people[e]||{};if(!p.d||d>p.d)p.d=d;const n=nameOf(raw);if(n)p.n=n;a.people[e]=p;
  if(!a.email){a.email=e;if(n&&!a.contact)a.contact=n}};
 if(isMine(m))[...(m.toRecipients||[]),...(m.ccRecipients||[])].forEach(add);else add(m.sender);
 const keys=Object.keys(a.people||{});if(keys.length>25){keys.sort((x,y)=>(a.people[y].d||"")<(a.people[x].d||"")?-1:1).slice(25).forEach(k=>delete a.people[k])}
}
async function loadPeople(a){
 if(PEOPLE[a.id]&&(PEOPLE[a.id].loading||PEOPLE[a.id].list))return;
 PEOPLE[a.id]={loading:true};
 const touch={},users=[];let err="";
 const dom=(a.domain||"").toLowerCase(),free=!dom||FREE.has(dom),safe=/^[a-z0-9.-]+$/.test(dom);
 const jobs=[];
 if(Store.mcp){
  const q=free?(a.email?`from:${a.email} OR to:${a.email}`:""):`from:${dom} OR to:${dom}`;
  if(q)jobs.push(Store.mcp.callTool("Gmail","search_threads",{query:q,pageSize:25,view:"THREAD_VIEW_METADATA_ONLY"}).then(r=>{
   ((r.payload||{}).threads||[]).forEach(th=>(th.messages||[]).forEach(m=>{const d=S(new Date(m.date||+m.internalDate));if(d>TODAY)return;
    const raws=isMine(m)?[...(m.toRecipients||[]),...(m.ccRecipients||[])]:[m.sender];
    raws.forEach(raw=>{const e=emailOf(raw);if(!e)return;const ok=free?e===(a.email||"").toLowerCase():e.endsWith("@"+dom)||e.endsWith("."+dom);if(!ok)return;const t=touch[e]||{};if(!t.d||d>t.d)t.d=d;const n=nameOf(raw);if(n)t.n=n;touch[e]=t})}))}).catch(()=>{err="gmail"}));
  if(!free&&safe&&CFG.mbSync!==false)jobs.push(Store.mcp.callTool("Metabase","execute_sql",{database_id:4,sql:`SELECT name, email, last_revealed_at FROM users WHERE email_domain = '${dom}' ORDER BY last_revealed_at IS NULL, last_revealed_at DESC LIMIT 60`}).then(r=>{
   const data=(r.payload&&r.payload.data)||{},cols=(data.cols||[]).map(c=>c.name),i=n=>cols.indexOf(n);
   (data.rows||[]).forEach(row=>{const e=emailOf(row[i("email")]);if(e)users.push({e,n:String(row[i("name")]||"").trim(),act:row[i("last_revealed_at")]?S(new Date(row[i("last_revealed_at")])):""})})}).catch(()=>{err=err?"both":"metabase"}));
 }
 await Promise.all(jobs);
 (a.contacts||[]).forEach(c=>{if(!c.email)return;const t=touch[c.email]||{};if(!t.d||(c.lastD&&c.lastD>t.d))t.d=c.lastD;if(!t.n)t.n=pname(c);touch[c.email]=t});
 Object.entries(a.people||{}).forEach(([e,p])=>{const t=touch[e]||{};if(!t.d||(p.d&&p.d>t.d))t.d=p.d;if(!t.n&&p.n)t.n=p.n;touch[e]=t});
 const main=(a.email||"").toLowerCase(),list=[],seen=new Set();
 const inTouch=Object.entries(touch).sort((x,y)=>((y[0]===main)-(x[0]===main))||((y[1].d||"")>(x[1].d||"")?1:-1));
 inTouch.forEach(([e,t])=>{const u=users.find(x=>x.e===e);list.push({e,n:t.n||(u&&u.n)||(e===main?a.contact:"")||"",d:t.d,act:u&&u.act,kind:"touch",main:e===main});seen.add(e)});
 if(main&&!seen.has(main)){list.unshift({e:main,n:a.contact||"",kind:"main",main:true});seen.add(main)}
 users.forEach((u,ix)=>{const top=ix===0&&!!u.act;const ex=list.find(x=>x.e===u.e);if(ex){if(top)ex.best=true;if(!ex.act)ex.act=u.act;if(!ex.n)ex.n=u.n;return}list.push({e:u.e,n:u.n,act:u.act,kind:"user",best:top});seen.add(u.e)});
 PEOPLE[a.id]={list,err};
 if(emFor===a.id)rerender();
}
const composeUrl=e=>`https://mail.google.com/mail/?${CFG.gmail?"authuser="+encodeURIComponent(CFG.gmail)+"&":""}view=cm&fs=1&to=${encodeURIComponent(e)}`;
let emFor=null;
function emailBtn(a,cls){
 const st=PEOPLE[a.id],open=emFor===a.id;
 const ago=d=>{if(!d)return "";const n=diff(TODAY,d);return n<=0?"today":n===1?"yesterday":n<60?`${n} days ago`:fmtY(d)};
 const item=p=>`<div class="emi"><a class="emlink" href="${esc(composeUrl(p.e))}" target="_blank" rel="noopener" data-emgo="${a.id}"><b>${esc(p.n||p.e.split("@")[0])}${p.main?` <span class="emtag main">Main contact</span>`:""}${p.best?` <span class="emtag best">Most active user</span>`:""}</b><span>${esc(p.e)}</span><small>${p.kind==="touch"?`You've been in touch · last ${ago(p.d)}`:p.kind==="main"?(p.act?`Main contact · used ContactOut ${ago(p.act)}`:"Main contact on this account"):p.act?`Used ContactOut ${ago(p.act)}`:"ContactOut user, no recent use"}</small></a>
  <span class="emacts">${p.kind==="touch"?`<a href="${esc(gmailSearch(p.e))}" target="_blank" rel="noopener" title="Past emails">${I.inbox}</a>`:""}${p.main?"":`<button data-emmain="${a.id}" data-e="${esc(p.e)}" data-n="${esc(p.n||"")}" title="Make main contact">★</button>`}</span></div>`;
 let menu="";
 if(open){
  if(!st||st.loading)menu=`<p class="small" style="margin:6px 8px">Finding people at ${esc(a.company)}…</p>`;
  else{const t=st.list.filter(p=>p.kind!=="user"),u=st.list.filter(p=>p.kind==="user");
   const tm=t.filter(p=>p.kind==="touch"),mo=t.filter(p=>p.kind==="main");
   menu=(mo.length?`<small>Main contact</small>${mo.map(item).join("")}`:"")+(tm.length?`<small>People you've been in touch with</small>${tm.map(item).join("")}`:"")+(u.length?`<small>ContactOut users at ${esc(a.domain)}${u.length>=60?" (60 most recent)":""}</small>${u.slice(0,60).map(item).join("")}`:"")+
    (!st.list.length?`<p class="small" style="margin:6px 8px">No people found for ${esc(a.domain||a.company)}. Add a contact with Edit.</p>`:"")+(st.err?`<p class="small" style="margin:6px 8px">${st.err==="metabase"?"Couldn't reach Metabase for the user list.":st.err==="gmail"?"Couldn't check Gmail history.":"Couldn't reach Gmail or Metabase."}</p>`:"");}
 }
 return `<div class="lt em"><button class="btn${cls?" "+cls:""}" data-em="${a.id}" aria-haspopup="menu" aria-expanded="${open}">${I.mail}Email ${open?"▴":"▾"}</button>${open?`<div class="ltm emm" role="menu">${menu}</div>`:""}</div>`;
}

// ================= Gmail =================

// ================= Metabase (company dashboard) =================
const MB={busy:false,err:"",at:0};
const mbDate=x=>{if(!x)return "";const d=new Date(x);return isNaN(d)?"":S(d)};
const MB_WON=["closed","self-checkout","renewal"],MB_LOST=["deal_lost","not-interested"];
// Stage from the dashboard. Deal status stays with a company when it's transferred, so it only counts
// when you've been in touch since the account became yours; otherwise a paid company is an inherited customer.
function mbStage(a,{st,last,reply,meet,action,paid,amount,claimed}){
 const yours=!!last||!!reply||!!meet;
 if(MB_WON.includes(st)&&!!last){a.stage="Won";a.wonDate=paid&&paid>=claimed?paid:last;if(amount)a.value=amount;return}
 if(MB_WON.includes(st))a.paidBefore=1;
 if(MB_LOST.includes(st)&&!!last){a.stage="Lost";return}
 if(st==="negotiations"&&yours){a.stage="Pricing sent";a.pricing=true;return}
 if(/reply/i.test(action)&&reply){a.stage="My reply needed";return}
 if(meet&&meet>=(last||"")&&meet>=(reply||"")){a.stage="Meeting booked";return}
 if(reply){a.stage="In conversation";return}
 a.stage=last?"Generic outreach sent":"Not contacted";
}

async function mbSync(manual){
 if(!Store.mcp||MB.busy)return;const id=String(CFG.mbSales||"").replace(/\D/g,"");if(!id){if(manual)toast("Add your Metabase sales ID in Settings");return}
 MB.busy=true;MB.err="";updMb();
 try{
  const rows=[];let cols=null;
  for(let off=0;off<10000;off+=500){
   const sql=`SELECT c.id, c.domain, c.name, c.deal_status, c.sales_assigned_date, c.last_transferred_date, c.amount_received, c.paid_date, c.expiration_date, c.linkedin, s.industry, s.size, s.location, s.user_count, s.active_users_count, s.credit_30, s.credit_all, s.last_contact_assigned_rep, s.last_reply, s.last_meeting, s.action FROM companies c LEFT JOIN company_statistics s ON s.domain = c.domain WHERE c.sales_id = ${id} ORDER BY c.id LIMIT 500 OFFSET ${off}`;
   const r=await Store.mcp.callTool("Metabase","execute_sql",{database_id:4,sql});
   const data=(r.payload&&r.payload.data)||{};cols=cols||(data.cols||[]).map(c=>c.name);const rs=data.rows||[];rows.push(...rs);if(rs.length<500)break;
  }
  const ix=n=>cols.indexOf(n),get=(r,n)=>{const i=ix(n);return i<0?null:r[i]};
  const byDom=new Map();ACC.forEach(a=>{if(a.domain)byDom.set(a.domain,a)});
  const seen=new Set(),added=[],updated=[];
  rows.forEach(r=>{
   const domain=normDomain(get(r,"domain"));if(!domain)return;seen.add(domain);if(DISMISS["acc:"+domain])return;
   const claimed=mbDate(get(r,"last_transferred_date"))||mbDate(get(r,"sales_assigned_date"))||TODAY;
   const mine=d=>d&&d>=claimed?d:"";   // ignore anything from before the account became yours
   const last=mine(mbDate(get(r,"last_contact_assigned_rep"))),reply=mine(mbDate(get(r,"last_reply"))),meet=mine(mbDate(get(r,"last_meeting")));
   const st=String(get(r,"deal_status")||"").toLowerCase(),action=String(get(r,"action")||"").trim();
   const info={mbId:get(r,"id"),industry:get(r,"industry")||"",size:get(r,"size")||"",location:get(r,"location")||"",users:+get(r,"user_count")||0,activeUsers:+get(r,"active_users_count")||0,credits30:+get(r,"credit_30")||0,creditsAll:+get(r,"credit_all")||0,dashAction:action,dealStatus:st,amount:+get(r,"amount_received")||0,paidDate:mbDate(get(r,"paid_date")),expires:mbDate(get(r,"expiration_date"))};
   let a=byDom.get(domain);
   if(!a){
    const li=String(get(r,"linkedin")||"").trim();
    a={id:uid(),company:String(get(r,"name")||"").trim()||domain,domain,cat:"Metabase",claimed,owned:claimed,log:[],mb:1,...info,li:li?(/^https?:/.test(li)?li:`https://www.linkedin.com/company/${li}`):""};
    if(last){a.first=last;a.last=last}
    if(reply){a.reply=reply;if(!a.first||reply<a.first)a.first=reply}
    if(meet){a.positive=meet;a.meetingDate=meet}
    mbStage(a,{st,last,reply,meet,action,paid:mbDate(get(r,"paid_date")),amount:+get(r,"amount_received")||0,claimed});
    Object.keys(a).forEach(k=>{if(a[k]==="")delete a[k]});
    ACC.push(a);saveAcc(a);added.push(a);return;
   }
   // existing account: refresh dashboard info, move dates forward only, never undo your own stage
   const before=JSON.stringify([a.last,a.reply,a.positive,a.stage]);
   Object.assign(a,info);a.mb=1;if(!a.claimed||a.claimed<claimed&&!a.first){a.claimed=claimed;a.owned=claimed}
   delete a.mbGone;
   if(last&&(!a.last||last>a.last))applyTouch(a,a.channel||"Email","me",last,null,true);
   if(reply&&(!a.reply||reply>a.reply))applyTouch(a,a.channel||"Email","them",reply,null,true);
   if(meet&&(!a.positive||meet>a.positive)){a.positive=meet;if(!a.meetingDate||meet>a.meetingDate)a.meetingDate=meet}
   const fix=(SYNC.mbV||1)<2&&!(a.log||[]).some(l=>!l.auto)&&!(a.calls||[]).length;   // one-time clean-up of stages copied from previous reps
   if(fix){["stage","wonDate","value","pricing","lastCheck","paidBefore"].forEach(k=>delete a[k]);mbStage(a,{st,last:a.last||"",reply:a.reply||"",meet:a.meetingDate||"",action,paid:mbDate(get(r,"paid_date")),amount:+get(r,"amount_received")||0,claimed:a.claimed||claimed})}
   else{const yours=!!last;
    if(MB_WON.includes(st)&&yours&&!["Won"].includes(a.stage)){a.stage="Won";a.wonDate=mbDate(get(r,"paid_date"))||last;if(!a.value&&+get(r,"amount_received"))a.value=+get(r,"amount_received")}
    if(MB_LOST.includes(st)&&yours&&!["Won","Lost"].includes(a.stage))a.stage="Lost";
    a.paidBefore=MB_WON.includes(st)&&!yours?1:undefined;if(!a.paidBefore)delete a.paidBefore;}
   if(JSON.stringify([a.last,a.reply,a.positive,a.stage])!==before)updated.push(a);
   saveAcc(a);
  });
  // accounts that came from Metabase but are no longer under your name
  const gone=ACC.filter(a=>a.mb&&live(a)&&a.domain&&!seen.has(a.domain)&&!a.mbGone);
  gone.forEach(a=>{a.mbGone=TODAY;a.archived=true;saveAcc(a)});
  MB.at=Date.now();SYNC.mbAt=MB.at;SYNC.mbV=2;saveState();buildTasks();render(true);
  if(added.length)popup(`${added.length} new ${added.length===1?"account":"accounts"} from Metabase`,added.slice(0,4).map(a=>a.company).join(", ")+(added.length>4?"…":""),"week",`<button class="btn sm" data-view="pipe">Open Pipeline</button>`);
  if(gone.length)popup(`${gone.length} ${gone.length===1?"account is":"accounts are"} no longer under your name`,gone.slice(0,4).map(a=>a.company).join(", ")+": moved out of your pipeline.","overdue");
  if(manual)toast(`Metabase: ${rows.length} accounts · ${added.length} new · ${updated.length} updated`);
 }catch(e){const c=e&&e.code;MB.err=c==="server_not_connected"?"Metabase not connected":c==="needs_reauth"?"Reconnect Metabase":c==="not_granted"?"Metabase is off for this page":"Metabase sync failed";if(manual)toast(MB.err)}
 MB.busy=false;updMb();
}
function updMb(){const el=document.getElementById("mbst");if(el)el.outerHTML=mbBadge()}
function mbBadge(){if(!Store.mcp)return "";const t=MB.busy?"Syncing Metabase…":MB.err?MB.err:SYNC.mbAt?`Metabase synced ${new Date(SYNC.mbAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}`:"Sync Metabase";return `<button class="tool" data-act="mbsync" id="mbst" title="Pull your accounts from the company dashboard">${I.sync}${esc(t)}</button>`}

const GM={busy:false,err:""};
function updGm(){const el=document.getElementById("gmst");if(el)el.outerHTML=gmBadge()}
function indexAccounts(){const dom=new Map(),em=new Map();ACC.forEach(a=>{if(a.archived||a.assignedTo)return;if(a.email)em.set(a.email.toLowerCase(),a);[a.domain,a.email&&normDomain(a.email)].forEach(d=>{if(d&&!FREE.has(d)&&!dom.has(d))dom.set(d,a)})});return {dom,em}}
function lookup(email,idx){if(!email)return null;if(idx.em.has(email))return idx.em.get(email);const d=email.split("@")[1]||"";if(FREE.has(d))return null;if(idx.dom.has(d))return idx.dom.get(d);const parts=d.split(".");for(let i=1;i<parts.length-1;i++){const p=parts.slice(i).join(".");if(idx.dom.has(p))return idx.dom.get(p)}return null}
function isMine(m){const from=emailOf(m.sender);return (m.labelIds||[]).includes("SENT")||(CFG.gmail&&from===CFG.gmail.toLowerCase())}
function msgAccounts(m,idx){const out=new Set();if(isMine(m)){[...(m.toRecipients||[]),...(m.ccRecipients||[])].forEach(x=>{const a=lookup(emailOf(x),idx);if(a)out.add(a)})}else{const a=lookup(emailOf(m.sender),idx);if(a)out.add(a)}return [...out]}
async function gmailSync(manual){
 if(!Store.mcp||GM.busy)return;GM.busy=true;GM.err="";updGm();
 const replies=[];let changed=0;
 try{
  const days=SYNC.gmailAt?Math.ceil((Date.now()-SYNC.gmailAt)/864e5)+1:30;
  const q=`newer_than:${Math.min(Math.max(days,1),45)}d`;
  const threads=[];let tok=null;
  for(let i=0;i<8;i++){const r=await Store.mcp.callTool("Gmail","search_threads",{query:q,pageSize:50,view:"THREAD_VIEW_METADATA_ONLY",...(tok?{pageToken:tok}:{})});const p=r.payload||{};(p.threads||[]).forEach(t=>threads.push(t));tok=p.nextPageToken;if(!tok)break}
  const idx=indexAccounts(),now=Date.now();
  for(const th of threads){
   let msgs=th.messages||[];
   if(!msgs.some(m=>msgAccounts(m,idx).length))continue;
   if((th.messageCount||0)>msgs.length){try{const r=await Store.mcp.callTool("Gmail","get_thread",{threadId:th.id,messageFormat:"METADATA_ONLY"});if(r.payload&&r.payload.messages)msgs=r.payload.messages}catch(e){}}
   msgs.slice().sort((x,y)=>(+x.internalDate||0)-(+y.internalDate||0)).forEach(m=>{
    const at=new Date(m.date||+m.internalDate);if(isNaN(at)||at.getTime()>now)return;   // skip scheduled sends
    if(isMine(m)&&!CFG.gmail){const f=emailOf(m.sender);if(f){CFG.gmail=f;CFG.myDomain=f.split("@")[1];saveState()}}
    msgAccounts(m,idx).forEach(a=>{a.gseen=a.gseen||[];if(a.gseen.includes(m.id))return;a.gseen.push(m.id);if(a.gseen.length>60)a.gseen=a.gseen.slice(-60);
     const dir=isMine(m)?"me":"them",d=S(at);const before=a.stage;applyTouch(a,"Email",dir,d,th.viewUrl,true);changed++;
     notePeople(a,m,d,idx);
     if(dir==="them"&&live(a)&&a.stage==="My reply needed"&&before!=="My reply needed"&&d>=add(TODAY,-1))replies.push(a);
     saveAcc(a)});
   });
  }
  try{const ign=ignored(),my=(CFG.myDomain||"contactout.io").toLowerCase(),seen=new Set(),out=[];
   const internal=e=>{const d=(e.split("@")[1]||"").toLowerCase();return !d||d===my||/(^|\.)contactout\.(io|net|com)$/.test(d)};
   const robot=e=>/no-?reply|notification|support@|hello@|calendar|mailer-daemon/i.test(e);
   let tok=null;
   for(let pg=0;pg<3;pg++){
    const r=await Store.mcp.callTool("Gmail","search_threads",{query:"label:Inbounds newer_than:30d",pageSize:50,view:"THREAD_VIEW_MINIMAL",...(tok?{pageToken:tok}:{})});const p=r.payload||{};
    (p.threads||[]).forEach(th=>{const m=(th.messages||[])[0];if(!m)return;
     if(/^(accepted|declined|tentative|tentatively accepted)\s*:/i.test(m.subject||""))return;   // calendar replies aren't new inbounds
     const from=emailOf(m.sender);let e="",nm="";
     if(from&&!internal(from)&&!robot(from)){e=from;nm=nameOf(m.sender)}
     else{   // you (or a teammate) wrote to them: use the outside person on the email
      const ext=[...(m.toRecipients||[]),...(m.ccRecipients||[])].find(x=>{const y=emailOf(x);return y&&!internal(y)&&!robot(y)});
      if(ext){e=emailOf(ext);nm=nameOf(ext)}}
     if(!e){const txt=`${m.subject||""} ${m.snippet||""}`;e=((txt.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig)||[]).map(x=>x.toLowerCase()).find(x=>!internal(x)&&!robot(x)))||""}
     if(!e)return;const d2=e.split("@")[1];if(ign.has(d2)||seen.has(e))return;seen.add(e);
     out.push({email:e,name:nm,subject:m.subject||"",d:S(new Date(m.date||Date.now())),url:th.viewUrl||gmailSearch(e)})});
    tok=p.nextPageToken;if(!tok)break}
   INBOUNDS=out;}catch(e){}
  SYNC.gmailAt=Date.now();saveState();
  if(replies.length)popup(replies.length===1?`${firstName(replies[0])||replies[0].company} replied`:`${replies.length} new replies`,replies.map(a=>a.company).slice(0,4).join(", ")+": they're in Reply now.","reply",`<button class="btn sm" data-view="today">Open Today</button>`);
  if(manual)toast(changed?`Gmail: ${changed} ${changed===1?"update":"updates"} to your accounts`:"Gmail: nothing new for your accounts");
 }catch(e){const c=e&&e.code;GM.err=c==="server_not_connected"?"Gmail not connected":c==="needs_reauth"?"Reconnect Gmail":c==="approval_required"||c==="consent_required"?"Allow Gmail to check":c==="not_granted"?"Gmail is off for this page":"Gmail check failed";
  if(manual)toast(c==="server_not_connected"?"Add Gmail in Claude: Settings → Connectors":GM.err)}
 GM.busy=false;buildTasks();render(true);updGm();
}

// ================= Google Calendar =================
function parseEvent(ev){
 if(!ev||!ev.start||!ev.start.dateTime||ev.status==="cancelled")return null;
 const self=(ev.attendees||[]).find(x=>x.self);if(self&&self.responseStatus==="declined")return null;
 const st=new Date(ev.start.dateTime),en=new Date((ev.end&&ev.end.dateTime)||ev.start.dateTime);
 const my=(CFG.myDomain||"contactout.io").toLowerCase();
 const ext=(ev.attendees||[]).filter(x=>!x.self&&!x.resource&&x.email&&!x.email.toLowerCase().endsWith("@"+my)&&!/calendar\.google\.com$/.test(x.email));
 const desc=String(ev.description||"").replace(/<br\s*\/?>/gi,"\n").replace(/<[^>]+>/g,"").replace(/&amp;/g,"&");
 const via=/calendly/i.test(desc)?"Calendly":"";
 let domain=((desc.match(/Company Domain:\s*([^\s]+)/i)||[])[1]||"").toLowerCase();domain=normDomain(domain);
 const mail=ext[0]?ext[0].email.toLowerCase():"";if(!domain&&mail&&!FREE.has(mail.split("@")[1]))domain=mail.split("@")[1];
 const qa=[];desc.split("\n").forEach(l=>{const m=l.match(/^(.{6,160}?\?)[^:]*:\s*(.+)$/);if(m&&!/cancel|reschedul/i.test(m[1]))qa.push([m[1].trim(),m[2].trim()])});
 const phone=(desc.match(/Phone Number:\s*([+\d][\d\s()-]{5,})/i)||[])[1]||"";
 let who=(String(ev.summary||"").match(/^(.+?)\s+and\s+/i)||[])[1]||(ext[0]&&ext[0].displayName)||"";
 const idx=indexAccounts();const a=lookup(mail,idx)||(domain?idx.dom.get(domain):null);
 return {id:ev.id,d:S(st),s:st.getHours()+st.getMinutes()/60,e:en.getHours()+en.getMinutes()/60,t:ev.summary||"Meeting",link:ev.htmlLink||"",conf:ev.conferenceUrl||"",ext:ext.length>0,via,domain,mail,qa,phone,who,whoFirst:who.split(" ")[0],company:a?a.company:domain,acc:a?a.id:null};
}
const CAL={err:""};
async function calSync(){
 if(!Store.mcp)return;
 try{const r=await Store.mcp.callTool("Google Calendar","list_events",{startTime:TODAY+"T00:00:00",endTime:add(TODAY,6)+"T23:59:00",pageSize:150,orderBy:"startTime"});
  EVENTS=((r.payload||{}).events||[]).map(parseEvent).filter(Boolean);CAL.err="";
  // a booked call with someone from an account moves it to Meeting (never backwards from Negotiation or Won)
  const moved=[];
  EVENTS.forEach(e=>{if(!e.ext||!e.acc)return;const a=byId(e.acc);if(!a||!live(a))return;
   if(a.meetingDate!==e.d&&(!a.meetingDate||a.meetingDate<TODAY||e.d<a.meetingDate)){a.meetingDate=e.d;a.meetingFrom="calendar";saveAcc(a)}
   if(["Not contacted","Generic outreach sent","No response","Nurture","In sequence","My reply needed","In conversation","Waiting on them"].includes(a.stage)&&!a.pricing){a.prevStage=a.stage;a.stage="Meeting booked";saveAcc(a);moved.push(a)}});
  if(moved.length)popup(moved.length===1?`${moved[0].company} moved to Meeting`:`${moved.length} accounts moved to Meeting`,"Found a call with them in your calendar.","week");
  // remind 2 hours before external meetings
  buildTasks();render(true);
 }catch(e){CAL.err=e&&e.code||"error"}
}

// ================= alerts loop =================
function tick(){
 const t=S(new Date());
 if(t!==TODAY){TODAY=t;doneIds();PTASKS.forEach(p=>{if(!p.done&&p.date<TODAY)p.date=TODAY});saveState();buildTasks();render(true)}
 const h=nowH(),fire=[];
 TASKS.forEach(x=>{if(x.date===TODAY&&x.time&&!x.done&&hrs(x.time)<=h&&hrs(x.time)>h-1&&!NOTI["t:"+x.key]){NOTI["t:"+x.key]=TODAY;fire.push(x)}});
 fire.slice(0,3).forEach(x=>popup(x.kind==="prep"?"Meeting prep time":"Time for this task",`${x.title}${x.sub?" · "+x.sub:""}`,x.lane||"today",`<button class="btn sm" data-act="tfocus" data-tid="${esc(x.key)}">${I.focus}Focus on it</button>`));
 const roeNew=LIVE().filter(a=>{const r=roe(a);if(!r.alert||r.cliff)return false;const k=`r:${a.id}:${r.rule}`;if(NOTI[k]===TODAY)return false;NOTI[k]=TODAY;return true});
 if(roeNew.length)popup(roeNew.length===1?`ROE alert: ${roeNew[0].company}`:`${roeNew.length} ROE alerts`,roeNew.slice(0,4).map(a=>`${a.company} (${roe(a).short})`).join(", "),"reply",`<button class="btn sm" data-view="today">See them</button>`);
 if(fire.length||roeNew.length){Object.keys(NOTI).forEach(k=>{if(NOTI[k]<add(TODAY,-3))delete NOTI[k]});saveState()}
}

// ================= sample data =================
function sampleAccounts(){return [
 {company:"Cinnatek Corporation",cat:"Uncat accounts",domain:"cinnatek.com",pricing:true,product:"API",contact:"Larry O'Brien",title:"Founder",claimed:add(TODAY,-24),first:add(TODAY,-24),last:add(TODAY,-24),reply:add(TODAY,-1),positive:add(TODAY,-1),stage:"My reply needed",channel:"Email",signal:"API lead with existing API interest.",notes:"Asked about API pricing for 180k profiles a year."},
 {company:"hotelkit",cat:"Inbound email",domain:"hotelkit.net",product:"API",value:1000,inSS:true,contact:"Alexandra Becker",title:"Head of Sales",claimed:add(TODAY,-22),first:add(TODAY,-22),last:add(TODAY,-9),positive:add(TODAY,-15),stage:"Pricing sent",channel:"Email",notes:"Sent pricing, waiting on reply."},
 {company:"Teladoc",cat:"Uncat accounts",domain:"teladochealth.com",claimed:add(TODAY,-24),first:add(TODAY,-23),last:add(TODAY,-5),stage:"No response",channel:"lemlist",seqEnded:true,notes:"4-step lemlist sequence finished with no reply."},
 {company:"Advent Health",cat:"Uncat accounts",domain:"joinadventhealth.com",claimed:add(TODAY,-21),first:add(TODAY,-16),last:add(TODAY,-9),stage:"In sequence",channel:"lemlist",liStep:"Step 3 of 5"},
 {company:"AGI Denim",cat:"Inbound email",domain:"agidenim.com",contact:"Basit Ali",title:"Supply Chain Lead",claimed:add(TODAY,-24),first:add(TODAY,-24),last:add(TODAY,-8),stage:"Generic outreach sent",channel:"Email"},
 {company:"Scylar Technologies",cat:"Uncat accounts",domain:"scaylar.com",claimed:add(TODAY,-23),first:add(TODAY,-23),last:add(TODAY,-13),reply:add(TODAY,-13),positive:add(TODAY,-13),promised:add(TODAY,-1),stage:"Waiting on them",channel:"LinkedIn",notes:"Said they'd get back to me."},
 {company:"Accolade Inc.",cat:"Uncat accounts",domain:"accd.co",product:"Seats",claimed:add(TODAY,-30),first:add(TODAY,-30),last:add(TODAY,-29),positive:add(TODAY,-29),stage:"In conversation",channel:"Email",notes:"Good intro call, no next step set."},
 {company:"Executive Hurdles",cat:"ROE",domain:"executivehurdles.com",claimed:add(TODAY,-340),first:add(TODAY,-330),last:add(TODAY,-14),stage:"In sequence",channel:"lemlist",seq:"Step 2 of 4"},
 {company:"Weaviate",cat:"ROE",domain:"weaviate.io",claimed:add(TODAY,-27),stage:"Not contacted",notes:"Claimed in the Accounts channel."},
 {company:"alethra",cat:"API",domain:"myalethra.com",product:"Personal emails",value:3000,claimed:add(TODAY,-23),first:add(TODAY,-20),last:add(TODAY,-16),positive:add(TODAY,-16),stage:"Won",wonDate:add(TODAY,-16),channel:"Email",notes:"20k personal email credits, $3,000."}
].map((a,i)=>({...a,id:"s"+(i+1)+uid(""),owned:a.claimed,sample:true,log:[]}))}
