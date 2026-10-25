const $=id=>document.getElementById(id);
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
let D={start:null,tasks:[],scores:[],chats:[],lastCheckin:''},busy=false,saveT=null,tm=null,cur=null;
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const today=()=>new Date().toLocaleDateString('en-CA');
const dayNo=()=>{const n=new Date();return Math.floor((n.getTime()-n.getTimezoneOffset()*6e4)/864e5)};
const AREA={'Nafs par control':'Self-control','Kaam / Padhai':'Work / Study','Khud ki pehchan':'Self-identity','Sehat':'Health','Sukoon / Ibadat':'Peace / Worship','Waqt ka istemal':'Time use'};

/* ---------- storage: server + local copy ---------- */
function push(){return fetch('/api/data',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(D)}).catch(()=>{})}
function trimSize(){try{if(new TextEncoder().encode(JSON.stringify(D)).length<=600000)return;D.chats.sort((a,b)=>b.updated-a.updated);while(D.chats.length>1&&new TextEncoder().encode(JSON.stringify(D)).length>600000)D.chats.pop()}catch(e){}}
function save(){D.updated=Date.now();
  D.chats.forEach(c=>{if(c.msgs.length>800)c.msgs=c.msgs.slice(-800)});
  if(D.chats.length>200){D.chats.sort((a,b)=>b.updated-a.updated);D.chats=D.chats.slice(0,200)}
  trimSize();try{logDay()}catch(e){}try{localStorage.setItem('khudi',JSON.stringify(D))}catch(e){}clearTimeout(saveT);saveT=setTimeout(push,600)}
function migrate(){let ch=false;
  D.tasks=D.tasks||[];D.scores=D.scores||[];D.memory=D.memory||[];D.urges=D.urges||[];D.log=D.log||{};D.chats=D.chats||[];
  if(Array.isArray(D.hist)&&D.hist.length){D.chats.push({id:uid(),title:'Previous chat',created:D.hist.length?(D.updated||Date.now()):Date.now(),updated:D.updated||Date.now(),msgs:D.hist});ch=true}
  if('hist' in D){delete D.hist;ch=true}
  if('trig' in D){delete D.trig;ch=true}
  D.scores.forEach(s=>{if(AREA[s.area]){s.area=AREA[s.area];ch=true}if('emoji' in s){delete s.emoji;ch=true}});
  Object.values(D.log).forEach(x=>{if(Array.isArray(x.scores))x.scores=x.scores.map(t=>{const i=t.indexOf(':'),n=t.slice(0,i);if(AREA[n]){ch=true;return AREA[n]+t.slice(i)}return t})});
  D.chats.forEach(c=>{if(!Array.isArray(c.msgs))c.msgs=[]});
  if(ch)save()}
async function boot(){
  let r;try{r=await fetch('/api/data')}catch(e){setTimeout(boot,4000);return}
  if(r.status>=500){setTimeout(boot,4000);return}
  if(r.status===401){$('splash').classList.add('hide');$('login').classList.remove('hide');['app','nav'].forEach(i=>$(i).classList.add('hide'));return}
  const srv=await r.json();let loc={};try{loc=JSON.parse(localStorage.getItem('khudi')||'{}')}catch(e){}
  if((loc.updated||0)>(srv.updated||0)){D=Object.assign(D,loc);push()}else D=Object.assign(D,srv);
  migrate();
  $('splash').classList.add('hide');$('login').classList.add('hide');$('app').classList.remove('hide');$('nav').classList.remove('hide');
  cur=null;renderChat();drawHome();drawTasks();drawScore();
  if(D.lastCheckin!==today())openDaily();
}

/* ---------- setup ---------- */
document.title=CONFIG.appName;$('appName').textContent=CONFIG.appName;$('tagline').textContent=CONFIG.tagline;$('lname').textContent=CONFIG.appName;
CONFIG.urgeSteps.forEach(s=>$('steps').appendChild(el('li','',s)));
CONFIG.quick.forEach(c=>{const b=el('button','chip',c.label);b.onclick=()=>{show('chat');ask(c.q,c.title)};$('chips').appendChild(b)});
function boom(){const C=['#7c5cff','#ff6bb5','#ffc83d','#2fcf8f','#ff8a5c'];for(let i=0;i<26;i++){const e=el('span','conf'),z=6+Math.random()*8;e.style.left=Math.random()*95+'vw';e.style.animationDelay=Math.random()*.5+'s';e.style.width=e.style.height=z+'px';e.style.background=C[i%C.length];e.style.borderRadius=i%2?'50%':'2px';document.body.appendChild(e);setTimeout(()=>e.remove(),2500)}}

/* ---------- login / tabs ---------- */
$('lbtn').onclick=async()=>{const r=await fetch('/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:$('pw').value})});if(r.ok){$('pw').value='';$('lerr').textContent='';boot()}else $('lerr').textContent=(await r.json()).error||'Error'};
$('pw').onkeydown=e=>{if(e.key==='Enter')$('lbtn').click()};
$('out').onclick=async()=>{await fetch('/logout',{method:'POST'});location.reload()};
const TABS=['home','chat','tasks','score'];
function show(t){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));TABS.forEach(x=>$('v-'+x).classList.toggle('hide',x!==t));window.scrollTo(0,0)}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>show(b.dataset.t));

/* ---------- AI helper ---------- */
function ctx(){const p=D.tasks.filter(t=>!t.done).map(t=>t.t).slice(0,15),s=D.scores.slice(-10).map(x=>`${x.d} ${x.area}:${x.score}/10`),ut=D.urges.filter(x=>Date.now()-x<7*864e5),hrs=ut.map(x=>new Date(x).getHours());
  return[`Now: ${new Date().toLocaleString('en-GB')}.`,D.start?`Clean streak: ${days()} days (started ${new Date(D.start).toLocaleDateString('en-CA')}).`:'Streak has not started yet.',`Urge/SOS button pressed ${ut.length} times this week${hrs.length?' (hours: '+hrs.join(',')+')':''}.`,D.memory.length?`Long-term memory: ${D.memory.join(' | ')}.`:'',p.length?`Pending tasks: ${p.join('; ')}.`:'',s.length?`Recent scores: ${s.join(', ')}.`:''].filter(Boolean).join('\n')}
function thread(c){const m=c.msgs.slice(-30);while(m[0]&&m[0].role!=='user')m.shift();return m}
async function api(messages,mode){
  const r=await fetch('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({messages,context:ctx(),mode})});
  if(r.status===401){location.reload();throw 0}
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||('Server error '+r.status));if(mode!=='tasks'&&mode!=='title')applyActions(j.actions);return j.text;
}

/* ---------- home / streak ---------- */
const days=()=>D.start?Math.max(0,Math.floor((Date.now()-D.start)/864e5)):0;
function drawHome(){
  const d=days(),M=CONFIG.milestones,prev=[0,...M].filter(m=>m<=d).pop(),nxt=M.find(m=>m>d),h=new Date().getHours();
  $('hi').textContent=h<5?'Up late tonight?':h<12?'Good morning':h<17?'Good afternoon':h<21?'Good evening':'Good night';
  $('days').textContent=d;const p=!D.start?0:nxt?(d-prev)/(nxt-prev):1;$('arc').style.strokeDashoffset=339.3*(1-p);
  $('next').textContent=!D.start?'Start today!':nxt?`Next milestone: ${nxt} days (${nxt-d} to go)`:'All milestones complete!';if(h>=22||h<4)$('next').textContent+='\nLate nights are risky: keep your phone away from your bed and talk to Saathi.';
  $('quote').textContent='\u201C'+CONFIG.quotes[dayNo()%CONFIG.quotes.length]+'\u201D';
  $('startS').classList.toggle('hide',!!D.start);$('reset').classList.toggle('hide',!D.start);
  $('badges').innerHTML='';M.forEach(m=>$('badges').appendChild(el('span','badge'+(d>=m?' on':''),m+'d')));
  const box=$('hTasks');box.innerHTML='';const pend=D.tasks.filter(t=>!t.done).slice(0,3);
  if(!pend.length)box.appendChild(el('p','note','No pending tasks. Add some in the Tasks tab or give them to AI!'));
  pend.forEach(t=>{const r=el('div','task');r.append(el('span','chk'),el('span','',t.t));box.appendChild(r)});
}
$('allT').onclick=()=>show('tasks');
$('startS').onclick=()=>{D.start=Date.now();save();drawHome();boom()};
$('reset').onclick=()=>{if(confirm('Start fresh? This is not a failure, it is a new beginning.')){D.start=Date.now();save();drawHome();startChat('Mera streak toot gaya 😔 Mujhe himmat do aur batao ab kya karun.','Fresh start')}};

/* ---------- SOS ---------- */
function closeSos(){clearInterval(tm);$('sos').classList.add('hide');document.body.style.overflow=''}
$('urge').onclick=()=>{D.urges.push(Date.now());save();$('sos').classList.remove('hide');document.body.style.overflow='hidden';let t=600;$('clock').textContent='10:00';clearInterval(tm);
  tm=setInterval(()=>{t--;$('clock').textContent=String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');if(t<=0){clearInterval(tm);$('clock').textContent='Well done!';boom()}},1000)};
$('sosOk').onclick=closeSos;
$('sosAI').onclick=()=>{closeSos();startChat('Abhi mujhe shiddat se urge aa rahi hai. Mujhe abhi sambhalo.','Urge support')};

/* ---------- chat (multiple chats, like ChatGPT) ---------- */
const curChat=()=>D.chats.find(c=>c.id===cur)||null;
const DOTS='<span class="dots"><span></span><span></span><span></span></span>';
function bubble(c,t,still){const d=el('div','m '+c,t);$('msgs').appendChild(d);if(!still)d.scrollIntoView({block:'end',behavior:'smooth'});return d}
function drawHead(){const c=curChat();$('chatTitle').textContent=c?c.title:'New chat';$('delChat').classList.toggle('hide',!c)}
function renderChat(scroll){const c=curChat();$('msgs').innerHTML='';
  if(!c||!c.msgs.length)bubble('a',CONFIG.greeting,true);else c.msgs.forEach(h=>bubble(h.role==='user'?'u':'a',h.content,true));
  drawHead();if(scroll&&$('msgs').lastElementChild)$('msgs').lastElementChild.scrollIntoView({block:'end'})}
function newChat(){cur=null;closeHist();show('chat');renderChat()}
function openChat(id){cur=id;closeHist();show('chat');renderChat(true)}
function delChat(id){D.chats=D.chats.filter(c=>c.id!==id);if(cur===id){cur=null;renderChat()}save()}
function startChat(text,title){newChat();ask(text,title)}
const mkTitle=t=>{t=t.replace(/\s+/g,' ').trim();return t.length>40?t.slice(0,40)+'...':t};
async function makeTitle(c,text){try{let t=await api([{role:'user',content:text}],'title');t=String(t||'').replace(/["'*#\n]/g,' ').replace(/\s+/g,' ').trim().replace(/\.$/,'').slice(0,50);
  if(t){c.title=t;save();if(cur===c.id)drawHead();if(!$('hpanel').classList.contains('hide'))drawHist()}}catch(e){}}
async function ask(text,title){
  if(busy)return;busy=true;$('send').disabled=true;
  let c=curChat();
  if(!c){c={id:uid(),title:title||mkTitle(text),created:Date.now(),updated:Date.now(),msgs:[]};D.chats.unshift(c);cur=c.id;$('msgs').innerHTML='';drawHead()}
  c.msgs.push({role:'user',content:text});c.updated=Date.now();save();
  bubble('u',text);const out=bubble('a','');out.innerHTML=DOTS;
  try{const t=await api(thread(c));c.msgs.push({role:'assistant',content:t});c.updated=Date.now();
    if(cur===c.id){if(out.isConnected)await type(out,t);else renderChat(true)}
    save();if(!title&&c.msgs.length===2)makeTitle(c,text)}
  catch(e){c.msgs.pop();
    if(!c.msgs.length){D.chats=D.chats.filter(x=>x!==c);if(cur===c.id){cur=null;drawHead()}}
    if(out.isConnected)out.textContent='Oops 🙈 something went wrong'+(e&&e.message?' ('+e.message+')':'')+'. Please try again in a moment 💚';
    if(!$('inp').value)$('inp').value=text;save()}
  busy=false;$('send').disabled=false;
}
function sendNow(){const t=$('inp').value.trim();if(t){$('inp').value='';$('inp').style.height='';ask(t)}}
$('send').onclick=sendNow;
$('inp').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!/Mobi|Android/i.test(navigator.userAgent)){e.preventDefault();sendNow()}};
$('inp').oninput=e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'};
$('newChat').onclick=newChat;
$('delChat').onclick=()=>{if(cur&&confirm('Delete this chat?'))delChat(cur)};

/* ---------- chat history panel ---------- */
function openHist(){drawHist();$('hpanel').classList.remove('hide');document.body.style.overflow='hidden'}
function closeHist(){$('hpanel').classList.add('hide');document.body.style.overflow=''}
function drawHist(){const box=$('hlist');box.innerHTML='';
  const L=[...D.chats].sort((a,b)=>b.updated-a.updated);
  if(!L.length){box.appendChild(el('p','note','No chats yet. Start a conversation and it will show up here.'));return}
  const s=new Date();s.setHours(0,0,0,0);const t0=s.getTime(),DAY=864e5;
  const G=[['Today',x=>x>=t0],['Yesterday',x=>x>=t0-DAY],['Previous 7 days',x=>x>=t0-7*DAY],['Previous 30 days',x=>x>=t0-30*DAY],['Older',()=>true]];
  const when=u=>u>=t0?new Date(u).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):new Date(u).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
  let last=-1;
  L.forEach(c=>{const gi=G.findIndex(g=>g[1](c.updated));if(gi!==last){box.appendChild(el('div','hgroup',G[gi][0]));last=gi}
    const r=el('div','hitem'+(c.id===cur?' on':'')),b=el('button','htxt');b.append(el('b','',c.title),el('span','',when(c.updated)+' \u00B7 '+c.msgs.length+' messages'));b.onclick=()=>openChat(c.id);
    const x=el('button','x','\u00D7');x.title='Delete chat';x.onclick=()=>{if(confirm('Delete this chat?')){delChat(c.id);drawHist()}};
    r.append(b,x);box.appendChild(r)})}
$('histBtn').onclick=openHist;$('hClose').onclick=closeHist;$('hNew').onclick=newChat;

/* ---------- tasks ---------- */
function drawTasks(){const box=$('tl');box.innerHTML='';if(!D.tasks.length)box.appendChild(el('p','note','No tasks yet. Add one above or give them to AI.'));
  D.tasks.forEach((t,i)=>{const r=el('div','task'+(t.done?' done':''));const c=el('button','chk'+(t.done?' on':''));c.setAttribute('aria-label','Toggle task');c.onclick=()=>{t.done=!t.done;if(t.done)boom();save();drawTasks();drawHome()};
    const x=el('button','x','\u00D7');x.setAttribute('aria-label','Delete task');x.onclick=()=>{D.tasks.splice(i,1);save();drawTasks();drawHome()};r.append(c,el('span','',t.t),x);box.appendChild(r)})}
function addTask(){const t=$('newT').value.trim();if(!t)return;D.tasks.push({t:t.slice(0,120),done:false});$('newT').value='';save();drawTasks();drawHome()}
$('addT').onclick=addTask;$('newT').onkeydown=e=>{if(e.key==='Enter')addTask()};
$('dump').onclick=async()=>{const t=$('dumpT').value.trim();if(!t)return;$('dump').disabled=true;$('dump').textContent='Saathi is thinking...';
  try{const txt=await api([{role:'user',content:t}],'tasks');const arr=JSON.parse(txt.replace(/```json|```/g,'').match(/\[[\s\S]*\]/)[0]);
    arr.slice(0,15).forEach(x=>D.tasks.push({t:String(x).slice(0,120),done:false}));save();$('dumpT').value='';drawTasks();drawHome();boom()}
  catch(e){alert('AI could not build the list. Please try again.')}
  $('dump').disabled=false;$('dump').textContent='Create tasks with AI'};
$('plan').onclick=()=>startChat('Mere pending kaam dekh kar aaj ka mazedaar aur practical plan banao.',"Today's plan");

/* ---------- daily question ---------- */
const areaToday=()=>CONFIG.areas[dayNo()%CONFIG.areas.length];
function openDaily(){const a=areaToday();$('dArea').textContent=a.name;$('dQ').textContent=a.q;$('dRange').value=7;$('dNum').textContent=7;$('dNote').value='';
  $('dStep1').classList.remove('hide');$('dStep2').classList.add('hide');$('daily').classList.remove('hide')}
$('dRange').oninput=e=>$('dNum').textContent=e.target.value;
$('dSkip').onclick=()=>$('daily').classList.add('hide');
$('dClose').onclick=()=>$('daily').classList.add('hide');
$('dSave').onclick=async()=>{const a=areaToday(),score=+$('dRange').value,note=$('dNote').value.trim();
  D.scores.push({d:today(),area:a.name,score});D.lastCheckin=today();save();drawScore();boom();
  $('dStep1').classList.add('hide');$('dStep2').classList.remove('hide');$('dReply').textContent='Saathi is thinking...';
  const shown=`Daily check-in: ${a.name} ${score}/10${note?'. '+note:''}`;
  const prompt=`Aaj maine "${a.name}" mein khud ko ${score}/10 diye.${note?' Note: '+note:''} Reaction do, ek chhota agla qadam batao aur ek sawal poocho.`;
  try{const t=await api([{role:'user',content:prompt}]);
    D.chats.unshift({id:uid(),title:'Daily check-in',created:Date.now(),updated:Date.now(),msgs:[{role:'user',content:shown},{role:'assistant',content:t}]});
    save();$('dReply').textContent=t}
  catch(e){$('dReply').textContent=`Your ${score}/10 is saved. Well done!`}};

/* ---------- scores ---------- */
function drawScore(){drawExtra();const box=$('sc');box.innerHTML='';const S=D.scores;
  if(!S.length){box.appendChild(el('p','note','No scores yet. The daily question will appear each day.'));return}
  const bars=el('div','bars');S.slice(-14).forEach(s=>{const b=el('div','bar');b.title=s.d+' \u00B7 '+s.area+' \u00B7 '+s.score;const f=el('i');f.style.height=s.score*10+'%';b.append(f,el('span','',s.d.slice(8)));bars.appendChild(b)});box.appendChild(bars);
  const g={};S.forEach(s=>{(g[s.area]=g[s.area]||[]).push(s.score)});
  Object.entries(g).forEach(([n,v])=>{const avg=v.reduce((a,b)=>a+b,0)/v.length,last=v[v.length-1];const r=el('div','arow');
    const t=el('div','t');t.appendChild(el('div','',`${n}: avg ${avg.toFixed(1)} \u00B7 last ${last}/10`));const tr=el('div','track'),i=el('i');i.style.width=avg*10+'%';tr.appendChild(i);t.appendChild(tr);r.appendChild(t);box.appendChild(r)})}

if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});

/* ---------- daily log, memory, AI control, backup ---------- */
function logDay(){const d=today();D.log=D.log||{};D.log[d]={streak:days(),tasksDone:D.tasks.filter(t=>t.done).length,urges:(D.urges||[]).filter(u=>new Date(u).toLocaleDateString('en-CA')===d).length,scores:D.scores.filter(s=>s.d===d).map(s=>`${s.area}: ${s.score}/10`),msgs:D.chats.reduce((n,c)=>n+c.msgs.length,0)}}
function applyActions(a){(a||[]).forEach(x=>{const k=x.do,s=String(x.text||'').slice(0,200).trim(),l=s.toLowerCase();
  if(k==='add_task'&&s)D.tasks.push({t:s,done:false});
  else if(k==='done_task'&&s){const t=D.tasks.find(t=>!t.done&&t.t.toLowerCase().includes(l));if(t)t.done=true}
  else if(k==='remove_task'&&s){const i=D.tasks.findIndex(t=>t.t.toLowerCase().includes(l));if(i>-1)D.tasks.splice(i,1)}
  else if(k==='remember'&&s&&!D.memory.includes(s))D.memory.push(s);
  else if(k==='forget'&&s)D.memory=D.memory.filter(m=>!m.toLowerCase().includes(l));
  else if(k==='start_streak'&&!D.start)D.start=Date.now();
  else if(k==='suggest_reset'&&confirm('Saathi suggests a fresh start. Reset your streak?'))D.start=Date.now()});
  D.memory=D.memory.slice(-60);save();drawHome();drawTasks();drawScore()}
async function type(e,t){const st=Math.max(4,Math.ceil(t.length/140));for(let i=0;i<t.length;){i=Math.min(t.length,i+st);e.textContent=t.slice(0,i);e.scrollIntoView({block:'end'});await new Promise(r=>setTimeout(r,16))}}
function drawExtra(){const h=$('hist');if(!h)return;h.innerHTML='';
  Object.keys(D.log||{}).sort().reverse().slice(0,30).forEach(k=>{const x=D.log[k];h.appendChild(el('div','arow',`${k} \u00B7 streak ${x.streak}d \u00B7 tasks done ${x.tasksDone} \u00B7 urges ${x.urges}${x.scores.length?' \u00B7 '+x.scores.join(', '):''}`))});
  const m=$('mem');m.innerHTML='';if(!D.memory.length)m.appendChild(el('p','note','Nothing remembered yet. Just chat and Saathi will take notes.'));
  D.memory.forEach((t,i)=>{const r=el('div','task'),x=el('button','x','\u00D7');x.onclick=()=>{D.memory.splice(i,1);save();drawExtra()};r.append(el('span','',t),x);m.appendChild(r)})}
$('exp').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(D,null,1)],{type:'application/json'}));a.download='saathi-backup-'+today()+'.json';a.click()};
$('imp').onchange=async e=>{try{const j=JSON.parse(await e.target.files[0].text());if(confirm('Restore this backup? Current data will be replaced.')){D=Object.assign(D,j);D.updated=Date.now();save();setTimeout(()=>location.reload(),900)}}catch(x){alert('That file is not a valid backup.')}};
boot();
