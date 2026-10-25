const $=id=>document.getElementById(id);
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
let D={start:null,trig:'',tasks:[],scores:[],hist:[],lastCheckin:''},busy=false,saveT=null,tm=null;
const today=()=>new Date().toLocaleDateString('en-CA');
const dayNo=()=>Math.floor(Date.now()/864e5);

/* ---------- storage: server + local copy ---------- */
function push(){return fetch('/api/data',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(D)}).catch(()=>{})}
function save(){D.updated=Date.now();try{localStorage.setItem('khudi',JSON.stringify(D))}catch(e){}clearTimeout(saveT);saveT=setTimeout(push,600)}
async function boot(){
  const r=await fetch('/api/data');
  if(r.status===401){$('login').classList.remove('hide');['app','nav'].forEach(i=>$(i).classList.add('hide'));return}
  const srv=await r.json();let loc={};try{loc=JSON.parse(localStorage.getItem('khudi')||'{}')}catch(e){}
  if((loc.updated||0)>(srv.updated||0)){D=Object.assign(D,loc);push()}else D=Object.assign(D,srv);
  D.tasks=D.tasks||[];D.scores=D.scores||[];D.hist=D.hist||[];
  $('login').classList.add('hide');$('app').classList.remove('hide');$('nav').classList.remove('hide');
  $('trig').value=D.trig||'';renderChat();drawHome();drawTasks();drawScore();
  if(D.lastCheckin!==today())openDaily();
}

/* ---------- setup ---------- */
document.title=CONFIG.appName;$('appName').textContent=CONFIG.appName;$('tagline').textContent=CONFIG.tagline;$('lname').textContent=CONFIG.appName;
CONFIG.urgeSteps.forEach(s=>$('steps').appendChild(el('li','',s)));
CONFIG.quick.forEach(c=>{const b=el('button','chip',c.label);b.onclick=()=>{show('chat');ask(c.q)};$('chips').appendChild(b)});
function boom(list){for(let i=0;i<22;i++){const e=el('span','conf',list[i%list.length]);e.style.left=Math.random()*95+'vw';e.style.animationDelay=Math.random()*.5+'s';e.style.fontSize=18+Math.random()*20+'px';document.body.appendChild(e);setTimeout(()=>e.remove(),2500)}}

/* ---------- login / tabs ---------- */
$('lbtn').onclick=async()=>{const r=await fetch('/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:$('pw').value})});if(r.ok){$('pw').value='';$('lerr').textContent='';boot()}else $('lerr').textContent=(await r.json()).error||'Error'};
$('pw').onkeydown=e=>{if(e.key==='Enter')$('lbtn').click()};
$('out').onclick=async()=>{await fetch('/logout',{method:'POST'});location.reload()};
const TABS=['home','chat','tasks','score'];
function show(t){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));TABS.forEach(x=>$('v-'+x).classList.toggle('hide',x!==t));window.scrollTo(0,0)}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>show(b.dataset.t));

/* ---------- AI helper ---------- */
function ctx(){const p=D.tasks.filter(t=>!t.done).map(t=>t.t).slice(0,10),s=D.scores.slice(-7).map(x=>`${x.area}:${x.score}/10`);
  return[D.start?`Clean streak: ${days()} din.`:'',p.length?`Pending kaam: ${p.join('; ')}.`:'',s.length?`Recent self-scores: ${s.join(', ')}.`:'',D.trig?`Triggers: ${D.trig}`:''].filter(Boolean).join(' ')}
function thread(){const m=D.hist.slice(-12);while(m[0]&&m[0].role!=='user')m.shift();return m}
async function api(messages,mode){
  const r=await fetch('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({messages,context:ctx(),mode})});
  if(r.status===401){location.reload();throw 0}
  const j=await r.json();if(!r.ok)throw 0;return j.text;
}

/* ---------- home / streak ---------- */
const days=()=>D.start?Math.max(0,Math.floor((Date.now()-D.start)/864e5)):0;
function drawHome(){
  const d=days(),M=CONFIG.milestones,prev=[0,...M].filter(m=>m<=d).pop(),nxt=M.find(m=>m>d),h=new Date().getHours();
  $('hi').textContent=(h<5?'Raat gayi, jaag rahe ho? 🌙':h<12?'Subah bakhair! ☀️':h<17?'Dopahar mubarak! 🌤️':h<21?'Shaam bakhair! 🌇':'Shab bakhair! 🌙')+' 😊';
  $('days').textContent=d;const p=!D.start?0:nxt?(d-prev)/(nxt-prev):1;$('arc').style.strokeDashoffset=339.3*(1-p);
  $('next').textContent=!D.start?'Aaj se shuru karo! 💪':nxt?`Agla milestone: ${nxt} din (${nxt-d} baqi) 🎯`:'Sab milestones mukammal! 🏆';
  $('quote').textContent='“'+CONFIG.quotes[dayNo()%CONFIG.quotes.length]+'”';
  $('startS').classList.toggle('hide',!!D.start);$('reset').classList.toggle('hide',!D.start);
  $('badges').innerHTML='';M.forEach(m=>$('badges').appendChild(el('span','badge'+(d>=m?' on':''),(d>=m?'🏅 ':'')+m+'d')));
  const box=$('hTasks');box.innerHTML='';const pend=D.tasks.filter(t=>!t.done).slice(0,3);
  if(!pend.length)box.appendChild(el('p','note','Koi pending kaam nahi 🎉 ya Kaam tab mein AI ko do!'));
  pend.forEach(t=>box.appendChild(el('div','task','⬜ '+t.t)));
}
$('allT').onclick=()=>show('tasks');
$('startS').onclick=()=>{D.start=Date.now();save();drawHome();boom(['🔥','💪','🎉'])};
$('reset').onclick=()=>{if(confirm('Naya aghaaz karna hai? Ye failure nahi, naya qadam hai 🌱')){D.start=Date.now();save();drawHome();show('chat');ask('Mera streak toot gaya 😔 Mujhe himmat do aur batao ab kya karun.')}};
$('trig').oninput=()=>{D.trig=$('trig').value;save()};

/* ---------- SOS ---------- */
function closeSos(){clearInterval(tm);$('sos').classList.add('hide');document.body.style.overflow=''}
$('urge').onclick=()=>{$('sos').classList.remove('hide');document.body.style.overflow='hidden';let t=600;$('clock').textContent='10:00';clearInterval(tm);
  tm=setInterval(()=>{t--;$('clock').textContent=String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');if(t<=0){clearInterval(tm);$('clock').textContent='Shabash! 🎉';boom(['🎉','💪','🌟'])}},1000)};
$('sosOk').onclick=closeSos;
$('sosAI').onclick=()=>{closeSos();show('chat');ask('Abhi mujhe shiddat se urge aa rahi hai. Mujhe abhi sambhalo.')};

/* ---------- chat ---------- */
function bubble(c,t){const d=el('div','m '+c,t);$('msgs').appendChild(d);d.scrollIntoView({block:'end',behavior:'smooth'});return d}
function renderChat(){$('msgs').innerHTML='';if(!D.hist.length)bubble('a',CONFIG.greeting);D.hist.forEach(h=>bubble(h.role==='user'?'u':'a',h.content))}
async function ask(text){
  if(busy)return;busy=true;$('send').disabled=true;
  D.hist.push({role:'user',content:text});if(D.hist.length===1)$('msgs').innerHTML='';bubble('u',text);
  const out=bubble('a','');out.innerHTML='<span class="dots"><span></span><span></span><span></span></span>';
  try{const t=await api(thread());out.textContent=t;D.hist.push({role:'assistant',content:t});D.hist=D.hist.slice(-40);save()}
  catch(e){out.textContent='Oho 🙈 kuch masla aa gaya (server so raha ho sakta hai). Thori der baad dobara try karo 💚';D.hist.pop()}
  busy=false;$('send').disabled=false;
}
function sendNow(){const t=$('inp').value.trim();if(t){$('inp').value='';$('inp').style.height='';ask(t)}}
$('send').onclick=sendNow;
$('inp').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!/Mobi|Android/i.test(navigator.userAgent)){e.preventDefault();sendNow()}};
$('inp').oninput=e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'};
$('clear').onclick=()=>{if(confirm('Poori chat delete karni hai? 🧹')){D.hist=[];save();renderChat()}};

/* ---------- tasks ---------- */
function drawTasks(){const box=$('tl');box.innerHTML='';if(!D.tasks.length)box.appendChild(el('p','note','Abhi koi kaam nahi. Upar likho ya AI ko do ✨'));
  D.tasks.forEach((t,i)=>{const r=el('div','task'+(t.done?' done':''));const c=el('button','',t.done?'✅':'⬜');c.onclick=()=>{t.done=!t.done;if(t.done)boom(['✅','🎉','⭐']);save();drawTasks();drawHome()};
    const x=el('button','x','✕');x.onclick=()=>{D.tasks.splice(i,1);save();drawTasks();drawHome()};r.append(c,el('span','',t.t),x);box.appendChild(r)})}
function addTask(){const t=$('newT').value.trim();if(!t)return;D.tasks.push({t:t.slice(0,120),done:false});$('newT').value='';save();drawTasks();drawHome()}
$('addT').onclick=addTask;$('newT').onkeydown=e=>{if(e.key==='Enter')addTask()};
$('dump').onclick=async()=>{const t=$('dumpT').value.trim();if(!t)return;$('dump').disabled=true;$('dump').textContent='Saathi soch raha hai 🤔…';
  try{const txt=await api([{role:'user',content:t}],'tasks');const arr=JSON.parse(txt.replace(/```json|```/g,'').match(/\[[\s\S]*\]/)[0]);
    arr.slice(0,15).forEach(x=>D.tasks.push({t:String(x).slice(0,120),done:false}));save();$('dumpT').value='';drawTasks();drawHome();boom(['📝','✨','🎉'])}
  catch(e){alert('AI list nahi bana saka, dobara try karo 🙏')}
  $('dump').disabled=false;$('dump').textContent='✨ AI se kaam banao'};
$('plan').onclick=()=>{show('chat');ask('Mere pending kaam dekh kar aaj ka mazedaar aur practical plan banao.')};

/* ---------- daily question ---------- */
const areaToday=()=>CONFIG.areas[dayNo()%CONFIG.areas.length];
function openDaily(){const a=areaToday();$('dEmoji').textContent=a.emoji;$('dArea').textContent=a.name;$('dQ').textContent=a.q;$('dRange').value=7;$('dNum').textContent=7;$('dNote').value='';
  $('dStep1').classList.remove('hide');$('dStep2').classList.add('hide');$('daily').classList.remove('hide')}
$('dRange').oninput=e=>$('dNum').textContent=e.target.value;
$('dSkip').onclick=()=>$('daily').classList.add('hide');
$('dClose').onclick=()=>$('daily').classList.add('hide');
$('dSave').onclick=async()=>{const a=areaToday(),score=+$('dRange').value,note=$('dNote').value.trim();
  D.scores.push({d:today(),area:a.name,emoji:a.emoji,score});D.lastCheckin=today();save();drawScore();boom(['🎉','✨','⭐','😊']);
  $('dStep1').classList.add('hide');$('dStep2').classList.remove('hide');$('dReply').textContent='Saathi soch raha hai… 🤔';
  D.hist.push({role:'user',content:`Aaj maine "${a.name}" mein khud ko ${score}/10 diye.${note?' Note: '+note:''} Reaction do, ek chhota agla qadam batao aur ek sawal poocho.`});
  try{const t=await api(thread());D.hist.push({role:'assistant',content:t});save();$('dReply').textContent=t;renderChat()}
  catch(e){D.hist.pop();$('dReply').textContent=`Tumhara ${score}/10 save ho gaya 💚 Shabash! 🎉`}};

/* ---------- scores ---------- */
function drawScore(){const box=$('sc');box.innerHTML='';const S=D.scores;
  if(!S.length){box.appendChild(el('p','note','Abhi koi score nahi. Kal roz ka sawal aayega 😊'));return}
  const bars=el('div','bars');S.slice(-14).forEach(s=>{const b=el('div','bar');b.title=s.d+' · '+s.area+' · '+s.score;const f=el('i');f.style.height=s.score*10+'%';b.append(f,el('span','',s.emoji));bars.appendChild(b)});box.appendChild(bars);
  const g={};S.forEach(s=>{(g[s.area]=g[s.area]||{e:s.emoji,v:[]}).v.push(s.score)});
  Object.entries(g).forEach(([n,o])=>{const avg=o.v.reduce((a,b)=>a+b,0)/o.v.length,last=o.v[o.v.length-1];const r=el('div','arow');r.appendChild(el('span','',o.e));
    const t=el('div','t');t.appendChild(el('div','',`${n}: avg ${avg.toFixed(1)} · last ${last}/10`));const tr=el('div','track'),i=el('i');i.style.width=avg*10+'%';tr.appendChild(i);t.appendChild(tr);r.appendChild(t);box.appendChild(r)})}

if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
boot();
