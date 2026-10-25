const $=id=>document.getElementById(id);
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
let D={start:null,ident:'',trig:'',journal:[],hist:[]},busy=false,saveT=null,tm=null;

/* ---------- storage: server + local copy (free hosts can wipe server files) ---------- */
function push(){return fetch('/api/data',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(D)}).catch(()=>{})}
function save(){D.updated=Date.now();try{localStorage.setItem('khudi',JSON.stringify(D))}catch(e){}clearTimeout(saveT);saveT=setTimeout(push,600)}
async function boot(){
  const r=await fetch('/api/data');
  if(r.status===401){$('login').classList.remove('hide');['app','nav'].forEach(i=>$(i).classList.add('hide'));return}
  const srv=await r.json();let loc={};try{loc=JSON.parse(localStorage.getItem('khudi')||'{}')}catch(e){}
  if((loc.updated||0)>(srv.updated||0)){D=Object.assign(D,loc);push()}else D=Object.assign(D,srv);
  $('login').classList.add('hide');$('app').classList.remove('hide');$('nav').classList.remove('hide');
  $('trig').value=D.trig;$('ident').value=D.ident;renderChat();drawHome();drawJ();
}

/* ---------- setup texts ---------- */
document.title=CONFIG.appName+' — Mera Coach';$('appName').textContent=CONFIG.appName;$('tagline').textContent=CONFIG.tagline;$('lname').textContent=CONFIG.appName;
$('q').textContent=CONFIG.reflections[new Date().getDate()%CONFIG.reflections.length];
CONFIG.urgeSteps.forEach(s=>$('steps').appendChild(el('li','',s)));
CONFIG.quick.forEach(c=>{const b=el('button','chip',c.label);b.onclick=()=>{show('coach');ask(c.q)};$('chips').appendChild(b)});

/* ---------- login / tabs ---------- */
$('lbtn').onclick=async()=>{const r=await fetch('/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:$('pw').value})});if(r.ok){$('pw').value='';$('lerr').textContent='';boot()}else $('lerr').textContent=(await r.json()).error||'Error'};
$('pw').onkeydown=e=>{if(e.key==='Enter')$('lbtn').click()};
$('out').onclick=async()=>{await fetch('/logout',{method:'POST'});location.reload()};
function show(t){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));['home','coach','khudi'].forEach(x=>$('v-'+x).classList.toggle('hide',x!==t));window.scrollTo(0,0)}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>show(b.dataset.t));

/* ---------- home / streak ---------- */
const days=()=>D.start?Math.max(0,Math.floor((Date.now()-D.start)/864e5)):0;
function drawHome(){
  const d=days(),M=CONFIG.milestones,prev=[0,...M].filter(m=>m<=d).pop(),nxt=M.find(m=>m>d);
  $('days').textContent=d;$('dayLbl').textContent=d===1?'din':'din';
  const p=!D.start?0:nxt?(d-prev)/(nxt-prev):1;$('arc').style.strokeDashoffset=339.3*(1-p);
  $('next').textContent=!D.start?'Aaj se shuru karo':nxt?`Agla milestone: ${nxt} din (${nxt-d} baqi)`:'Sab milestones mukammal! 🏆';
  $('quote').textContent='“'+CONFIG.quotes[Math.floor(Date.now()/864e5)%CONFIG.quotes.length]+'”';
  $('startS').classList.toggle('hide',!!D.start);$('reset').classList.toggle('hide',!D.start);
  $('badges').innerHTML='';M.forEach(m=>$('badges').appendChild(el('span','badge'+(d>=m?' on':''),m+'d')));
}
$('startS').onclick=()=>{D.start=Date.now();save();drawHome()};
$('reset').onclick=()=>{if(confirm('Naya aghaaz karna hai? Ye failure nahi, ek naya qadam hai.')){D.start=Date.now();save();drawHome();show('coach');ask('Mera streak toot gaya. Mujhe himmat do aur batao ab kya karun.')}};
$('trig').oninput=()=>{D.trig=$('trig').value;save()};

/* ---------- SOS ---------- */
function closeSos(){clearInterval(tm);$('sos').classList.add('hide');document.body.style.overflow=''}
$('urge').onclick=()=>{$('sos').classList.remove('hide');document.body.style.overflow='hidden';let t=600;$('clock').textContent='10:00';clearInterval(tm);
  tm=setInterval(()=>{t--;$('clock').textContent=String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');if(t<=0){clearInterval(tm);$('clock').textContent='Shabash! 🎉'}},1000)};
$('sosOk').onclick=closeSos;
$('sosAI').onclick=()=>{closeSos();show('coach');ask('Abhi mujhe shiddat se urge aa rahi hai. Mujhe abhi sambhalo.')};

/* ---------- chat ---------- */
function bubble(c,t){const d=el('div','m '+c,t);$('msgs').appendChild(d);d.scrollIntoView({block:'end',behavior:'smooth'});return d}
function renderChat(){$('msgs').innerHTML='';if(!D.hist.length)bubble('a',CONFIG.greeting);D.hist.forEach(h=>bubble(h.role==='user'?'u':'a',h.content))}
const ctx=()=>[D.start?`Current clean streak: ${days()} days.`:'',D.ident?`Identity statement: ${D.ident}`:'',D.trig?`Triggers: ${D.trig}`:''].filter(Boolean).join(' ');
async function ask(text){
  if(busy)return;busy=true;$('send').disabled=true;
  D.hist.push({role:'user',content:text});if(D.hist.length===1)$('msgs').innerHTML='';bubble('u',text);
  const out=bubble('a','');out.innerHTML='<span class="dots"><span></span><span></span><span></span></span>';
  try{
    const msgs=D.hist.slice(-12);while(msgs[0]&&msgs[0].role!=='user')msgs.shift();
    const r=await fetch('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({messages:msgs,context:ctx()})});
    if(r.status===401){location.reload();return}
    const j=await r.json();if(!r.ok)throw 0;
    out.textContent=j.text;D.hist.push({role:'assistant',content:j.text});D.hist=D.hist.slice(-40);save();
  }catch(e){out.textContent='Kuch masla aa gaya (server so raha ho sakta hai). Thori der baad dobara koshish karo.';D.hist.pop()}
  busy=false;$('send').disabled=false;
}
function sendNow(){const t=$('inp').value.trim();if(t){$('inp').value='';$('inp').style.height='';ask(t)}}
$('send').onclick=sendNow;
$('inp').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!/Mobi|Android/i.test(navigator.userAgent)){e.preventDefault();sendNow()}};
$('inp').oninput=e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'};
$('clear').onclick=()=>{if(confirm('Poori chat delete karni hai?')){D.hist=[];save();renderChat()}};

/* ---------- khudi / journal ---------- */
$('ident').oninput=()=>{D.ident=$('ident').value;save()};
function drawJ(){const box=$('jl');box.innerHTML='';if(!D.journal.length){box.appendChild(el('p','note','Abhi koi note nahi.'));return}
  D.journal.map((e,i)=>[e,i]).reverse().slice(0,15).forEach(([e,i])=>{const r=el('div','entry'),l=el('div');l.appendChild(el('small','',e.d));l.appendChild(document.createTextNode(e.t));
    const x=el('button','','✕');x.onclick=()=>{if(confirm('Ye note delete karna hai?')){D.journal.splice(i,1);save();drawJ()}};r.append(l,x);box.appendChild(r)})}
$('saveJ').onclick=()=>{const t=$('ans').value.trim();if(!t)return;D.journal.push({d:new Date().toLocaleDateString(),t});save();$('ans').value='';drawJ()};
$('refl').onclick=()=>{const t=$('ans').value.trim();if(!t){$('ans').focus();return}show('coach');ask('Mera aaj ka muhasiba: '+t+'. Mujhe sachchi, narm feedback do.')};

if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
boot();
