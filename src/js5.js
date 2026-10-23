
// ================= render & events =================
let loaded=false;
let lastUI=0,softT=null;
document.addEventListener("pointerdown",()=>lastUI=Date.now(),true);document.addEventListener("keydown",()=>lastUI=Date.now(),true);
function render(soft){
 if(!loaded)return;
 if(soft&&Date.now()-lastUI<2500){clearTimeout(softT);softT=setTimeout(()=>render(true),2600);nav();return}
 if(drawerId!=null&&!layer.querySelector(".drawer"))drawerId=null;
 nav();
 const ae=document.activeElement;
 if(soft&&ae&&main.contains(ae)&&/INPUT|TEXTAREA|SELECT/.test(ae.tagName))return;
 if(soft&&layer.querySelector(".modal,.focusview"))return renderView(true);
 renderView();
 if(soft&&drawerId!=null&&!layer.querySelector(".ltm"))openAcc(drawerId);
}
function renderView(){({today:renderToday,planner:renderPlanner,pipe:renderPipe,find:renderFind,handoff:renderHandoff,mail:renderMail,settings:renderSettings,customers:renderCustomers,flagged:renderFlagged})[view]()}
const T=key=>TASKS.find(x=>x.key===key);

document.addEventListener("click",e=>{
 if(e.target.closest("[data-coa]"))return;
 const flb=e.target.closest("[data-flag]");if(flb){const x=byId(flb.dataset.flag);if(x)flagDialog(x);return}
 const rmb=e.target.closest("[data-rm]");if(rmb){const x=byId(rmb.dataset.rm);if(x)removeDialog(x);return}
 const emg=e.target.closest("[data-emgo]");if(emg){pending=emg.dataset.emgo;emFor=null;setTimeout(rerender,0);return}
 const emm=e.target.closest("[data-emmain]");if(emm){const x=byId(emm.dataset.emmain);x.email=emm.dataset.e;if(emm.dataset.n)x.contact=emm.dataset.n;saveAcc(x);delete PEOPLE[x.id];loadPeople(x);rerender();toast(`${emm.dataset.n||emm.dataset.e} is now the main contact`);return}
 const em=e.target.closest("[data-em]");if(em){const id=em.dataset.em;emFor=emFor===id?null:id;logFor=null;if(emFor){const x=byId(id);if(x)loadPeople(x)}rerender();return}
 if(e.target.closest(".emm"))return;
 if(emFor!=null){emFor=null;rerender();}
 const lt=e.target.closest("[data-lt]");if(lt){const id=lt.dataset.lt;logFor=logFor===id?null:id;rerender();return}
 const lg=e.target.closest("[data-log]");if(lg){openLogForm(byId(lg.dataset.log),lg.dataset.ch,lg.dataset.dir);return}
 const pc=e.target.closest("[data-pickc]");if(pc&&LOGF){const c=(byId(LOGF.id).contacts||[]).find(x=>x.id===pc.dataset.pickc);const fm=document.getElementById("logform");if(c&&fm){fm.innerHTML=personFields(LOGF.ch,c)+'<button type="submit" hidden></button>'}return}
 if(logFor!=null&&!e.target.closest(".ltm")){logFor=null;rerender();}
 const nv=e.target.closest("[data-view]");if(nv){view=nv.dataset.view;layer.innerHTML="";drawerId=null;render();return}
 const ri=e.target.closest("[data-ritual]");if(ri){ritual(ri.dataset.ritual);return}
 const ssb=e.target.closest("[data-ss]");if(ssb){const x=byId(ssb.dataset.ss);x.inSS=!x.inSS;saveAcc(x);rerender();toast(x.inSS?`${x.company} marked as in Sales Sharks`:`${x.company} marked as not in Sales Sharks`);return}
 const sg=e.target.closest("[data-stg]");if(sg){setStage(byId(sg.dataset.id),sg.dataset.stg);return}
 const g=e.target.closest("[data-go]");if(g){pending=g.dataset.go;return}
 const op=e.target.closest("[data-open]");if(op){openAcc(op.dataset.open);return}
 if(e.target.matches("[data-close]")||e.target.closest("button[data-close]")){if(e.target.closest("[data-stop]")&&!e.target.closest("button[data-close]"))return;layer.innerHTML="";drawerId=null;clearInterval(ftimer);ftimer=null;return}
 const b=e.target.closest("[data-act]");if(!b)return;const id=b.dataset.id,a=id?byId(id):null,t=b.dataset.tid?T(b.dataset.tid):null;
 switch(b.dataset.act){
  case "yes":{const snap=[...doneIds()];markAccDone(id);applyTouch(a,pendingCh(a),"me",TODAY);saveAcc(a);confirmFor=null;last=()=>{DONE.ids=snap;saveState()};buildTasks();render();toast(`${a.company} logged. ROE clock reset.`,true);break;}
  case "no":confirmFor=null;render();break;
  case "toggleAuto":openAuto=!openAuto;render();break;
  case "fcold":fCold=!fCold;renderPipe();break;
  case "fmiss":fMissing=!fMissing;renderPipe();break;
  case "fwarn":fWarn=!fWarn;renderPipe();break;
  case "pm":pipeMode=b.dataset.m;renderPipe();break;
  case "custf":custF=b.dataset.k;renderCustomers();break;
  case "custcsv":custCSV(b.dataset.k);break;
  case "pf":pipeFilter=b.dataset.s&&pipeFilter!==b.dataset.s?b.dataset.s:null;renderPipe();break;
  case "tdone":{const m=meta(t);m.done=!t.done;if(m.done&&t.acc&&t.kind!=="prep")markAccDone(t.acc);saveState();buildTasks();render();if(m.done)toast(`Done: ${t.title}`);break;}
  case "tdel2":PTASKS=PTASKS.filter(x=>x.key!==t.key);saveState();buildTasks();renderPlanner();break;
  case "brief":openBrief(Number(b.dataset.ev));break;
  case "tfocus":if(t)startFocus(t.key);break;
  case "focusacc":{const tk=TASKS.find(x=>x.acc===id&&!x.done);if(tk)startFocus(tk.key);else toast("Nothing due for this account");break;}
  case "startfocus":startFocus();break;
  case "hoflag":a.handoff=true;saveAcc(a);layer.innerHTML="";drawerId=null;view="handoff";render();toast(`${a.company} added to Team handoff`);break;
  case "hounflag":delete a.handoff;saveAcc(a);renderHandoff();break;
  case "rxnote":{const h=Team.rx.find(x=>x.id===b.dataset.h);if(h)copy(rxNote(h),"Note copied: post it in the Accounts channel");break;}
  case "hoassign":{const to=hoPick[id];if(!to){toast("Choose a teammate first");break;}b.disabled=true;Team.send(a,to).then(()=>{buildTasks();render();toast(`${a.company} sent to ${Team.name(to)}. It leaves your pipeline once they claim it.`)}).catch(err=>{b.disabled=false;toast(err&&err.code==="invalid_argument"?"Couldn't send: you need Editor access to this page":"Couldn't send, try again")});break;}
  case "houndo":Team.cancel(a).then(()=>{buildTasks();render();toast(`${a.company} is back in your pipeline`)});break;
  case "hoclaim":{const h=Team.rx.find(x=>x.id===b.dataset.h);if(h){b.disabled=true;Team.claim(h).catch(()=>{b.disabled=false;toast("Couldn't claim, try again")})}break;}
  case "hodecline":{const h=Team.rx.find(x=>x.id===b.dataset.h);if(h)Team.decline(h).catch(()=>toast("Couldn't update, try again"));break;}
  case "copycal":copy(CFG.calendly,"Calendly link copied");break;
  case "positive":a.positive=TODAY;if(a.stage==="Not contacted")a.stage="In conversation";saveAcc(a);buildTasks();rerender();toast("Positive interaction logged. ROE-12 resets.");break;
  case "editacc":accForm(a);break;
  case "newacc":accForm(null);break;
  case "saveacc":saveAccForm();break;
  case "delacc":if(delArm!==id){delArm=id;b.innerHTML=`${I.trash}Click again to delete`;break;}deleteAcc(a);layer.innerHTML="";drawerId=null;buildTasks();render();toast(`${a.company} deleted`);break;
  case "rmacc":removeDialog(a);break;
  case "flagsave":saveFlag(a);break;
  case "unflag":delete a.flagged;saveAcc(a);buildTasks();rerender();toast(`${a.company} is back in your pipeline`);break;
  case "mergeacc":{const into=byId(b.dataset.into);mergeInto(a,into);layer.innerHTML="";drawerId=null;buildTasks();render();openAcc(into.id);toast(`${a.company} merged into ${into.company}`);break;}
  case "mergepick":{const v=(document.getElementById("mergein")||{}).value||"";const into=LIVE().find(x=>x.id!==id&&x.company.toLowerCase()===v.trim().toLowerCase());if(!into){toast("Pick an account from the list");break;}mergeInto(a,into);layer.innerHTML="";drawerId=null;buildTasks();render();openAcc(into.id);toast(`${a.company} merged into ${into.company}`);break;}
  case "quicklog":quickLog();break;
  case "logsave":saveLogForm(false);break;
  case "logskip":saveLogForm(true);break;
  case "saveql":saveQuickLog();break;
  case "callnotes":callNotes(id);break;
  case "callsum":callSummarize();break;
  case "callsave":callSave();break;
  case "evacc":{const ev=EVENTS[Number(b.dataset.ev)];accForm(null,{company:ev.company||ev.domain||ev.who,domain:ev.domain,contact:ev.who,email:ev.mail,cat:"Inbound",stage:"Meeting booked",channel:"Email",first:TODAY,last:TODAY,reply:TODAY,positive:TODAY});break;}
  case "inball":INB_ALL=!INB_ALL;render();break;
  case "addinb":{const x=INBOUNDS.find(z=>z.email===b.dataset.e);const dom=normDomain(x.email);accForm(null,{company:FREE.has(dom)?(x.name||x.email):dom.split(".")[0].replace(/^./,c=>c.toUpperCase()),domain:FREE.has(dom)?"":dom,contact:x.name,email:x.email,cat:"Inbound email",stage:"My reply needed",channel:"Email",first:x.d,reply:x.d});break;}
  case "dismissinb":DISMISS[b.dataset.e]=TODAY;saveState();render();break;
  case "import":importStart();break;
  case "pickfile":document.getElementById("filein").click();break;
  case "readpaste":{const v=document.getElementById("pastein").value;if(!v.trim()){toast("Paste some rows first");break;}IMP.file="Pasted";importRows(parseCSV(v));break;}
  case "doimport":IMP.list=(document.getElementById("implist")||{}).value||IMP.list;doImport();break;
  case "export":exportJSON();break;
  case "exportcsv":exportCSV();break;
  case "restore":document.getElementById("restorein").click();break;
  case "sample":sampleAccounts().forEach(x=>{ACC.push(x);saveAcc(x)});buildTasks();view="today";render();toast("Sample accounts added");break;
  case "clearsample":{const bs=new Set(ACC.filter(x=>x.sample).map(x=>x.b));ACC=ACC.filter(x=>!x.sample);bs.forEach(x=>dirtyB.add(x));sched();buildTasks();render();toast("Sample accounts removed");break;}
  case "gsync":gmailSync(true);break;
  case "mbsync":mbSync(true);break;
  case "testpop":{const was=CFG.popups;CFG.popups=true;popup("This is how alerts look","With a sound if it's turned on.","week");CFG.popups=was;break;}
  case "objp":case "objm":{const o=OBJ[+b.dataset.i];o.n=Math.max(0,o.n+(b.dataset.act==="objp"?1:-1));saveState();nav();ritual("wplan");break;}
  case "objd":OBJ.splice(+b.dataset.i,1);saveState();nav();ritual("wplan");break;
  case "sdone":{const w=document.getElementById("win").value.trim(),nx=planDays()[1];document.querySelectorAll("[data-roll]").forEach(c=>{if(c.checked){const x=T(c.dataset.roll);if(x){const m=meta(x);m.date=nx;m.time=null}}});if(w)HIGHLIGHTS.unshift({d:TODAY,t:w});saveState();buildTasks();layer.innerHTML="";render();toast(w?"Shut down. Highlight saved.":"Shut down. See you tomorrow.");break;}
  case "fplay":if(ftimer){clearInterval(ftimer);ftimer=null;b.innerHTML=I.play+"Resume";}else{b.innerHTML=I.pause+"Pause";ftimer=setInterval(()=>{fleft=Math.max(0,fleft-1);const el=document.getElementById("ftime");if(!el){clearInterval(ftimer);ftimer=null;return}el.textContent=mm(fleft);document.getElementById("fbar").style.width=(fleft/ftotal*100)+"%";if(!fleft){clearInterval(ftimer);ftimer=null;popup("Time's up",fqueue[0]?fqueue[0].title:"","today")}},1000);}break;
  case "fdone":{const x=fqueue.shift();const m=meta(x);m.done=true;if(x.acc&&x.kind!=="prep")markAccDone(x.acc);saveState();clearInterval(ftimer);ftimer=null;buildTasks();if(fqueue.length){fqueue=fqueue.map(q=>T(q.key)||q);focusShow();toast(`Done: ${x.title}`)}else{layer.innerHTML="";render();toast("All of today's tasks are done")}break;}
  case "fexit":clearInterval(ftimer);ftimer=null;layer.innerHTML="";render();break;
 }
});
function setStage(a,col){
 if(!a)return;const snap=JSON.stringify(a);
 if(col==="Engaged"){a.stage="In conversation";if(!a.positive)a.positive=TODAY}
 if(col==="Meeting"){a.stage="Meeting booked";if(!a.meetingDate)a.meetingDate=TODAY}
 if(col==="Negotiation"){a.stage="Pricing sent";a.pricing=true}
 if(col==="Closed won"){a.stage="Won";a.wonDate=TODAY}
 if(col==="Closed lost"){a.stage="Lost"}
 a.stageSince=TODAY;
 last=()=>{const o=JSON.parse(snap);Object.keys(a).forEach(k=>delete a[k]);Object.assign(a,o);saveAcc(a);buildTasks()};
 saveAcc(a);buildTasks();rerender();toast(`${a.company} moved to ${col}`,true);
}
function pendingCh(a){const p=plan(a);return p.go?(p.go.kind==="lemlist"?"lemlist":p.go.kind):"Email"}
function copy(text,ok){try{navigator.clipboard.writeText(text).then(()=>toast(ok),()=>toast(text))}catch(err){toast(text)}}
document.addEventListener("change",e=>{
 const el=e.target;
 if(el.dataset.hopick){hoPick[el.dataset.hopick]=el.value;return}
 if(el.dataset.imap){IMP.map[el.dataset.imap]=el.value===""?null:Number(el.value);IMP.list=(document.getElementById("implist")||{}).value||IMP.list;importMap();return}
 if(el.dataset.cfg){const k=el.dataset.cfg;let v=el.type==="checkbox"?el.checked:el.value;if(el.type==="number"){v=Math.max(1,Number(v)||DEF[k])}if(k==="myDomain")v=normDomain(v);CFG[k]=v;saveState();buildTasks();nav();if(k==="sync"&&v)gmailSync(false);toast("Saved");return}
 if(el.id==="filein"&&el.files[0]){readFile(el.files[0]);el.value="";return}
 if(el.id==="restorein"&&el.files[0]){restoreFile(el.files[0]);el.value="";return}
 const s=el.dataset.sub;if(s){const [k,i]=s.split("|");const t=T(k);if(t){const m=meta(t);m.subs=(m.subs||t.subs).map((x,j)=>j==+i?{...x,d:el.checked}:x);saveState()}}
});
document.addEventListener("input",e=>{if(e.target.id==="q"){query=e.target.value;renderFind()}if(e.target.id==="pq"){pq=e.target.value;renderPipe();const x=document.getElementById("pq");x.focus();x.setSelectionRange(x.value.length,x.value.length)}});
document.addEventListener("submit",e=>{e.preventDefault();const f=e.target;
 if(f.id==="accform"){saveAccForm();return}
 if(f.id==="qlform"){saveQuickLog();return}
 if(f.id==="logform"){saveLogForm(false);return}
 if(f.id==="flagform"){const btn=document.querySelector('[data-act="flagsave"]');if(btn)saveFlag(byId(btn.dataset.id));return}
 if(f.dataset.add){const inp=f.querySelector("input"),v=inp.value.trim();if(!v)return;PTASKS.push({key:uid("p"),acc:null,title:v,sub:"",est:15,tag:"admin",src:"",date:f.dataset.add,time:null,lane:"today",subs:[],done:false});saveState();buildTasks();renderPlanner();document.getElementById("add-"+f.dataset.add).focus();return}
 if(f.id==="objform"){const v=document.getElementById("objin").value.trim(),of=Math.max(1,+document.getElementById("objof").value||5);if(v){OBJ.push({t:v,n:0,of});saveState();nav();ritual("wplan")}}
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&(logFor!=null||emFor!=null)){logFor=null;emFor=null;rerender();return}if(e.key==="Escape"&&layer.innerHTML){layer.innerHTML="";drawerId=null;clearInterval(ftimer);ftimer=null}
 if(e.key==="Enter"&&e.target.classList&&e.target.classList.contains("dcard")){openAcc(e.target.dataset.open)}});
let dragT=null;
document.addEventListener("dragstart",e=>{const t=e.target.closest&&e.target.closest(".task[data-tid]");if(t){dragT=t.dataset.tid;t.classList.add("dragging");e.dataTransfer.effectAllowed="move"}});
document.addEventListener("dragend",()=>{dragT=null;document.querySelectorAll(".over").forEach(x=>x.classList.remove("over"))});
document.addEventListener("dragover",e=>{if(dragT==null)return;const z=e.target.closest(".drop");if(z){e.preventDefault();document.querySelectorAll(".over").forEach(x=>x!==z&&x.classList.remove("over"));z.classList.add("over")}});
document.addEventListener("drop",e=>{if(dragT==null)return;const t=T(dragT),d=e.target.closest(".drop");e.preventDefault();
 if(t&&d){const m=meta(t);m.date=d.dataset.day;m.time=null;saveState();buildTasks();toast(`${t.title} moved to ${d.dataset.day===TODAY?"today":wd(d.dataset.day)}`)}
 dragT=null;renderPlanner()});
function back(){if(pending!==null&&document.visibilityState==="visible"){const a=byId(pending);pending=null;if(a&&view==="today"){confirmFor=a.id;renderToday()}}}
document.addEventListener("visibilitychange",back);window.addEventListener("focus",back);
(function(){const root=document.documentElement;const set=m=>{if(m==="dark")root.setAttribute("data-mode","dark");else root.removeAttribute("data-mode");try{localStorage.setItem("myday-mode",m)}catch(e){}};
 let m="light";try{m=localStorage.getItem("myday-mode")||"light"}catch(e){}set(m);
 document.getElementById("mode").addEventListener("click",()=>set(root.getAttribute("data-mode")==="dark"?"light":"dark"));})();

// ================= start =================
const clone=x=>JSON.parse(JSON.stringify(x));
async function init(){
 try{await Store.init()}catch(e){}
 let data={buckets:{},state:null};
 try{data=await Store.load()}catch(e){main.innerHTML=`<div class="wbody"><div class="hero"><h2>Couldn't load your accounts</h2><p>${e&&e.code==="unavailable"?"Claude's storage is briefly unavailable. Reload in a moment.":"Reload the page. If it keeps happening, check you were invited to this page as Editor."}</p></div></div>`;return}
 Object.entries(data.buckets||{}).forEach(([b,list])=>(list||[]).forEach(x=>{const a=clone(x);a.b=b;ACC.push(a)}));
 const st=data.state?clone(data.state):{};
 CFG={...DEF,...(st.cfg||{})};PTASKS=st.ptasks||[];TMETA=st.tmeta||{};OBJ=st.obj||[];HIGHLIGHTS=st.hl||[];DONE=st.done||{d:TODAY,ids:[]};SYNC=st.sync||{};NOTI=st.noti||{};SEEN=st.seen||{};DISMISS=st.dismiss||{};
 PTASKS.forEach(p=>{if(!p.done&&p.date<TODAY)p.date=TODAY});PTASKS=PTASKS.filter(p=>!(p.done&&p.date<add(TODAY,-14)));
 Object.keys(TMETA).forEach(k=>{const d=(k.match(/\d{4}-\d{2}-\d{2}/)||[])[0];if(d&&d<add(TODAY,-14))delete TMETA[k]});
 loaded=true;buildTasks();render();
 purgeDeleted();watchMine();
 Team.start();
 if(Store.mcp){calSync();(CFG.mbSync?mbSync(false):Promise.resolve()).then(()=>{if(CFG.sync)gmailSync(false)})}
 setInterval(()=>{if(CFG.mbSync)mbSync(false)},60*60000);
 setInterval(tick,60000);setTimeout(tick,4000);
 setInterval(()=>{if(CFG.sync)gmailSync(false)},15*60000);
 setInterval(calSync,30*60000);
}
init();
})();
</script>
