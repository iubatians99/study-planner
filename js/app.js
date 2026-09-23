import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA0NiUGQ-YIWkARYfbHRacz9QdDVZ41wLM",
  authDomain: "planner-a3863-ce3fc.firebaseapp.com",
  projectId: "planner-a3863-ce3fc",
  storageBucket: "planner-a3863-ce3fc.firebasestorage.app",
  messagingSenderId: "259248084380",
  appId: "1:259248084380:web:5286b52f7dbb588793a459"
};

const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
const START=new Date(2026,8,20), TOTAL=90;
const DAY_MS=86400000;
let state={user:null, guest:false, progress:{}, selectedDay:null}, mode="login";

const $=id=>document.getElementById(id);
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateAt=i=>new Date(START.getTime()+i*DAY_MS);
const dayIndex=()=>{const t=new Date(); t.setHours(0,0,0,0); return Math.floor((t-START)/DAY_MS);};
const weekOf=i=>Math.floor(i/7)+1;
const toast=(m)=>{ $("toast").textContent=m; $("toast").classList.add("show"); setTimeout(()=>$("toast").classList.remove("show"),2200); };

function tasksFor(i){
  const d=dateAt(i), dow=d.getDay(), w=weekOf(i), tasks=[];
  // The supplied plan's recurring academic schedule.
  if([1,3,6].includes(dow)) { tasks.push(["Academic","AGR 373 — Entomology · 2 hours","Study with the class"]); tasks.push(["Academic","BOT 205 — Genetics & Plant Breeding · 2 hours","Study with the class"]); }
  if([0,2,4].includes(dow)) { tasks.push(["Academic","ECO 302 — Agricultural Economics · 2 hours","Study with the class"]); tasks.push(["Academic","AGR 301 — Seed Science & Technology · 2 hours","Study with the class"]); }
  if(dow===5) tasks.push(["Academic","ART 202 — Career Planning & Development-I","Plus review all tasks"]);
  // Daily BCS musts.
  tasks.push(["BCS","Learn new vocabulary","Daily must"]);
  tasks.push(["BCS","Read a Bangla newspaper","Daily must"]);
  tasks.push(["BCS","Read an English newspaper","Daily must"]);
  tasks.push(["BCS","Digest — English + Bangla · 1 hour","Daily must"]);
  if(dow===3) tasks.push(["BCS","BOOK study","Wednesday"]);
  if(dow===4) tasks.push(["BCS","Solve GK MCQ","Thursday night"]);
  if(dow===5) tasks.push(["BCS","Current affairs","Once a week"]);
  // Explicit BAU roadmap details only where the source supplied them.
  if(w===1 && i<7) tasks.push(["BAU","Fundamentals of Agronomy — 2 videos","BAU roadmap · Day "+(i+1)]);
  if(w===1 && i===6) tasks.push(["BAU","Revise Fundamentals of Agronomy","BAU roadmap · Day 7"]);
  if(w===2 && i<14) {
    const n=i-7; const vids=n<2?2:1;
    tasks.push(["BAU",`Agricultural Economics — ${vids} video${vids>1?"s":""} + concept clearing`,"BAU roadmap · Day "+(i+1)]);
  }
  if(i===13) tasks.push(["BAU","Revise Agricultural Economics","BAU roadmap · Day 14"]);
  // Scientific Officer semester targets: trackable as weekly focus, without inventing chapter breakdowns.
  if(dow===6) tasks.push(["Scientific Officer","Weekly target review — Agronomy 131–178 / Crop botany / Soil science / Agricultural chemistry / Plant pathology","Semester 7 target"]);
  if(dow===6) tasks.push(["Agri-Pedia","Review Agri-Pedia letters A–F","Semester 7 target"]);
  return tasks.map((x,k)=>({id:`d${i}-${k}`,area:x[0],title:x[1],detail:x[2]}));
}

function loadLocal(){ try{return JSON.parse(localStorage.getItem("semester7-progress")||"{}")}catch{return {}}}
async function loadProgress(){
  state.progress=loadLocal();
  if(!state.user) return;
  try{
    const snap=await getDoc(doc(db,"users",state.user.uid,"studyPlan","segment1"));
    if(snap.exists()) state.progress={...state.progress,...(snap.data().progress||{})};
    await saveProgress(false);
  }catch(e){ $("syncStatus").textContent="Offline"; console.warn(e); }
}
let saveTimer;
async function saveProgress(show=true){
  localStorage.setItem("semester7-progress",JSON.stringify(state.progress));
  if(state.user){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(async()=>{
      try{ await setDoc(doc(db,"users",state.user.uid,"studyPlan","segment1"),{progress:state.progress,updatedAt:new Date().toISOString()}); $("syncStatus").textContent="Synced"; }
      catch(e){ $("syncStatus").textContent="Offline"; }
    },180);
  }
  if(show) toast("Saved");
}
function isDone(id){return !!state.progress[id]}
function toggle(id){
  state.progress[id]=!state.progress[id];
  saveProgress();
  render();
  if(state.progress[id]) toast("✓ Task completed");
}

function renderToday(){
  let i=state.selectedDay==null ? Math.max(0,Math.min(TOTAL-1,dayIndex())) : Math.max(0,Math.min(TOTAL-1,state.selectedDay)), d=dateAt(i), tasks=tasksFor(i);
  $("dayNumber").textContent=i+1; $("todayDate").textContent=d.toLocaleDateString("en-BD",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const container=$("todayCards"); container.innerHTML="";
  tasks.forEach(t=>container.insertAdjacentHTML("beforeend",taskHTML(t,i)));
  $("todayEmpty").hidden=tasks.length>0;
}
function taskHTML(t,i){
  const done=isDone(t.id);
  return `<button class="task ${done?"done":""}" data-task="${esc(t.id)}"><span class="check">${done?"✓":""}</span><span><b>${esc(t.title)}</b><small>${esc(t.area)} · ${esc(t.detail)}</small></span></button>`;
}
function renderPlan(){
  const g=$("weekGrid"); g.innerHTML="";
  for(let w=1;w<=13;w++){
    const start=(w-1)*7,end=Math.min(TOTAL,w*7), arr=[];
    for(let i=start;i<end;i++){
      const tasks=tasksFor(i), done=tasks.filter(t=>isDone(t.id)).length;
      arr.push(`<button class="day-row" data-day="${i}"><span class="day-no">${i+1}</span><span><b>${dateAt(i).toLocaleDateString("en-BD",{weekday:"short",day:"numeric",month:"short"})}</b><small>${tasks.length} tasks · ${done}/${tasks.length||0} done</small></span><span class="mini-bar"><i style="width:${tasks.length?done/tasks.length*100:0}%"></i></span></button>`);
    }
    const weekTasks=Array.from({length:end-start},(_,x)=>tasksFor(start+x)).flat();
    const done=weekTasks.filter(t=>isDone(t.id)).length;
    g.insertAdjacentHTML("beforeend",`<article class="week"><header><div><span>WEEK ${w}</span><h3>Days ${start+1}–${end}</h3></div><strong>${done}/${weekTasks.length}</strong></header>${arr.join("")}</article>`);
  }
}
function renderMonitor(){
  const all=Array.from({length:TOTAL},(_,i)=>tasksFor(i)).flat(), done=all.filter(t=>isDone(t.id)).length;
  const pct=all.length?Math.round(done/all.length*100):0;
  $("doneCount").textContent=done; $("remainingCount").textContent=Math.max(0,all.length-done); $("overallPct").textContent=pct+"%"; $("barPct").textContent=pct+"%"; $("progressBar").style.width=pct+"%";
  let streak=0; for(let i=0;i<TOTAL;i++){const ts=tasksFor(i); if(ts.length&&ts.every(t=>isDone(t.id))) streak++; else break;} $("streakCount").textContent=streak;
  const areas={}; all.forEach(t=>{areas[t.area]??={d:0,n:0};areas[t.area].n++;if(isDone(t.id))areas[t.area].d++});
  $("areaStats").innerHTML=Object.entries(areas).map(([a,v])=>`<div class="area"><div><b>${esc(a)}</b><span>${v.d}/${v.n}</span></div><div class="bar thin"><i style="width:${v.n?v.d/v.n*100:0}%"></i></div></div>`).join("");
}
function render(){renderToday();renderPlan();renderMonitor();bindTaskEvents();}
function bindTaskEvents(){
  document.querySelectorAll("[data-task]").forEach(b=>b.onclick=()=>toggle(b.dataset.task));
  document.querySelectorAll("[data-day]").forEach(b=>b.onclick=()=>{state.selectedDay=+b.dataset.day;switchView("today");});
}
function switchView(v){
  document.querySelectorAll(".view").forEach(x=>x.hidden=x.id!==v+"View");
  document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===v));
  if(v==="today") renderToday();
}
function setupAuth(){
  $("loginTab").onclick=()=>{mode="login";$("loginTab").classList.add("active");$("signupTab").classList.remove("active");$("authBtn").textContent="Log in"};
  $("signupTab").onclick=()=>{mode="signup";$("signupTab").classList.add("active");$("loginTab").classList.remove("active");$("authBtn").textContent="Create account"};
  $("authBtn").onclick=async()=>{const e=$("email").value.trim(),p=$("password").value;if(!e||!p)return $("authMsg").textContent="Enter email and password.";try{mode==="login"?await signInWithEmailAndPassword(auth,e,p):await createUserWithEmailAndPassword(auth,e,p)}catch(err){$("authMsg").textContent=err.message}};
  $("resetBtn").onclick=async()=>{const e=$("email").value.trim();if(!e)return $("authMsg").textContent="Enter your email first.";try{await sendPasswordResetEmail(auth,e);$("authMsg").textContent="Reset link sent. Check your inbox."; }catch(err){$("authMsg").textContent=err.message}};
  $("guestBtn").onclick=()=>{state.guest=true;state.user=null;$("authGate").hidden=true;$("app").hidden=false;state.progress=loadLocal();render();};
}
function setupNav(){
  document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>switchView(b.dataset.view));
  $("jumpToday").onclick=()=>{state.selectedDay=null;switchView("today")};
  $("logoutBtn").onclick=()=>{state.guest?location.reload():signOut(auth)};
}
setupAuth();setupNav();
onAuthStateChanged(auth,async user=>{
  if(!user)return;
  state.user=user; state.guest=false; $("authGate").hidden=true; $("app").hidden=false; $("syncStatus").textContent="Loading…";
  await loadProgress(); render();
});
