const express=require('express'),crypto=require('crypto'),fs=require('fs'),path=require('path');
try{fs.readFileSync(path.join(__dirname,'.env'),'utf8').split('\n').forEach(l=>{const m=l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2]})}catch(e){}
const{APP_PASSWORD,SESSION_SECRET,ANTHROPIC_API_KEY,GEMINI_API_KEY,UPSTASH_REDIS_REST_URL:UP,UPSTASH_REDIS_REST_TOKEN:UT}=process.env;
const USE_GEMINI=!!GEMINI_API_KEY,MODEL=process.env.MODEL||(USE_GEMINI?'gemini-3.5-flash-lite':'claude-sonnet-5-5'),PORT=process.env.PORT||3000;
const DATA_FILE=path.join(process.env.DATA_DIR||__dirname,'data.json');
if(!APP_PASSWORD||!SESSION_SECRET||!(ANTHROPIC_API_KEY||GEMINI_API_KEY)){console.error('Set APP_PASSWORD, SESSION_SECRET and GEMINI_API_KEY or ANTHROPIC_API_KEY.');process.exit(1)}

const SYSTEM=`Tum "Saathi" ho: user ke personal AI best friend aur coach. Tumhare do asli maqsad hain: khudi (user ko khud ki pehchan samajhne mein madad) aur motivation. Baaki sawalon mein bhi madad karo, lekin baat naturally in dono ki taraf le aao. Roman Urdu/Hinglish mein baat karo (user ki zubaan match karo). Lehja dost jaisa, natural aur samajhdar, ChatGPT ki tarah poori baat-cheet. Emojis thore aur munasib; dukhi ya serious moment par bohat kam.
Tumhein user ki yaaddasht, streak, scores aur poori chat history milti hai: purani baatein yaad rakho aur use karo. Jo cheez lambay arsay ke liye kaam ki ho (naam, maqsad, wajah, routine, kamyabi, pasand-napasand) "remember" action se save karo.
Focus: khudi (khud ki pehchan), motivation, aur porn/masturbation ki aadat chhodna. Kabhi sharminda mat karo; relapse data hai, failure nahi. Urge ke waqt: urge surfing, jagah badlo, paani/wudu, exercise, trigger hatao, neend, kisi apne se baat. User ke urge ke ghanton/pattern ko dekh kar pehle se plan do. Self-rating par honest reaction, ek chhota qadam, ek sawal.
Jawab hamesha poora likho, adhoora mat chhodo. Aam jawab 150 lafz tak, detail maangay to lamba. Agar user na-umeed ho ya khud ko nuqsan ka khayal aaye to narmi se kisi apne ya professional se abhi baat karne ko kaho.
APP CONTROL: Tum user ki app chala sakte ho. Zaroorat ho to jawab ki bilkul aakhri line par likho: <<ACTIONS>>[{"do":"add_task","text":"..."},{"do":"done_task","text":"..."},{"do":"remove_task","text":"..."},{"do":"remember","text":"..."},{"do":"forget","text":"..."},{"do":"start_streak"},{"do":"suggest_reset"}] . Sirf wohi actions do jo user ne maange ya jo wakai zaroori hon. Streak reset sirf suggest_reset se (user khud confirm karega). Ye line user ko nahi dikhti, is ka zikr mat karo.`;
const TITLE_SYSTEM=`Write a very short title (max 5 words, in English, no quotes, no emoji, no punctuation at the end) that summarises the topic of the user's message. Reply with ONLY the title.`;
const TASK_SYSTEM=`Extract the user's to-dos from their message. Reply with ONLY a JSON array of short task strings (max 12), in the user's own language, no markdown, no explanation.`;
function parse(t){let a=[];const m=t.match(/<<ACTIONS>>\s*(\[[\s\S]*\])/);if(m){try{a=JSON.parse(m[1])}catch(e){}}return{text:t.replace(/<<ACTIONS>>[\s\S]*$/,'').trim(),actions:Array.isArray(a)?a.slice(0,8):[]}}

const GM_FALLBACK=['gemini-3.5-flash-lite','gemini-3.1-flash-lite','gemini-3.8-flash','gemini-3.6-flash'];let autoModel=null;
const wait=ms=>new Promise(z=>setTimeout(z,ms));
async function discoverModels(){try{const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200',{headers:{'x-goog-api-key':GEMINI_API_KEY}});const j=await r.json();
  const v=n=>parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/)||[0,0])[1]),lite=n=>/lite/.test(n)?1:0;
  return(j.models||[]).filter(m=>/^models\/gemini-\d+(\.\d+)?-flash(-lite)?$/.test(m.name)&&(m.supportedGenerationMethods||[]).includes('generateContent')).map(m=>m.name.slice(7)).sort((a,b)=>v(b)-v(a)||lite(a)-lite(b)).slice(0,3)}catch(e){return[]}}
const app=express();app.set('trust proxy',1);app.use(express.json({limit:'1mb'}));
app.get('/health',(q,s)=>s.send('ok'));
const sign=s=>crypto.createHmac('sha256',SESSION_SECRET).update(s).digest('hex');
const eq=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y)};
const makeToken=()=>{const e=Date.now()+30*864e5;return e+'.'+sign(String(e))};
const valid=t=>{if(!t)return false;const[e,s]=t.split('.');return s&&Number(e)>Date.now()&&eq(s,sign(e))};
const cookie=r=>{const m=(r.headers.cookie||'').match(/(?:^|; )sess=([^;]+)/);return m&&m[1]};
const fails={};
app.post('/login',(req,res)=>{const ip=req.ip,f=fails[ip]||{n:0,t:0};
  if(f.n>=5&&Date.now()-f.t<15*60e3)return res.status(429).json({error:'Too many tries. Wait 15 minutes.'});
  if(typeof req.body.password==='string'&&eq(req.body.password,APP_PASSWORD)){fails[ip]={n:0,t:0};
    res.setHeader('Set-Cookie',`sess=${makeToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${30*86400}${req.secure?'; Secure':''}`);return res.json({ok:true})}
  fails[ip]={n:f.n+1,t:Date.now()};res.status(401).json({error:'Wrong password'})});
app.post('/logout',(q,res)=>{res.setHeader('Set-Cookie','sess=; Path=/; Max-Age=0');res.json({ok:true})});
const guard=(req,res,next)=>valid(cookie(req))?next():res.status(401).json({error:'auth'});

// ---- storage: Upstash Redis (permanent, free) if configured, else local file ----
const up=cmd=>fetch(UP,{method:'POST',headers:{Authorization:'Bearer '+UT,'content-type':'application/json'},body:JSON.stringify(cmd)}).then(r=>r.json());
async function load(){try{if(UP){const j=await up(['GET','khudi']);return j.result?JSON.parse(j.result):{}}return JSON.parse(fs.readFileSync(DATA_FILE,'utf8'))}catch(e){return{}}}
async function store(d){const s=JSON.stringify(d);if(UP){const j=await up(['SET','khudi',s]);if(j.error)throw new Error(j.error)}else fs.writeFileSync(DATA_FILE,s)}
app.get('/api/data',guard,async(q,res)=>res.json(await load()));
app.put('/api/data',guard,async(req,res)=>{const d=req.body;if(!d||typeof d!=='object'||Array.isArray(d))return res.status(400).json({error:'bad'});
  if(Array.isArray(d.hist))d.hist=d.hist.slice(-800);
  if(Array.isArray(d.chats))d.chats=d.chats.sort((a,b)=>(b.updated||0)-(a.updated||0)).slice(0,200);
  try{await store(d);res.json({ok:true})}catch(e){res.status(500).json({error:'save failed'})}});

// ---- AI chat ----
app.post('/api/chat',guard,async(req,res)=>{
  const{messages,context,mode}=req.body;
  if(!Array.isArray(messages)||!messages.length)return res.status(400).json({error:'bad request'});
  const tasks=mode==='tasks',title=mode==='title',plain=tasks||title;
  const sys=tasks?TASK_SYSTEM:title?TITLE_SYSTEM:SYSTEM+(context?'\n\nUSER KI YAADDASHT AUR DATA:\n'+String(context).slice(0,6000):'');
  const msgs=messages.slice(-30).map(m=>({role:m.role==='assistant'?'assistant':'user',content:String(m.content).slice(0,4000)}));
  const done=t=>res.json(plain?{text:t,actions:[]}:parse(t));
  try{
    if(USE_GEMINI){
      const cats=['HARM_CATEGORY_HARASSMENT','HARM_CATEGORY_HATE_SPEECH','HARM_CATEGORY_SEXUALLY_EXPLICIT','HARM_CATEGORY_DANGEROUS_CONTENT'];
      const body=JSON.stringify({systemInstruction:{parts:[{text:sys}]},contents:msgs.map(x=>({role:x.role==='assistant'?'model':'user',parts:[{text:x.content}]})),safetySettings:cats.map(c=>({category:c,threshold:'BLOCK_ONLY_HIGH'})),
        generationConfig:Object.assign({maxOutputTokens:8192,temperature:.9},tasks?{responseMimeType:'application/json'}:{})});
      const tried=new Set();let r,j,firstErr='',authFail=false;
      const attempt=async m=>{if(tried.has(m))return false;tried.add(m);
        for(let k=0;k<2;k++){
          r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':GEMINI_API_KEY},body});
          j=await r.json().catch(()=>({}));
          if(r.ok)return true;
          if(!firstErr)firstErr=j.error?.message||('AI error '+r.status);
          if(r.status===401||r.status===403){authFail=true;return false}
          if(![500,502,503,504].includes(r.status))return false;
          await wait(700);
        }return false};
      let ok=false;
      for(const m of [autoModel,MODEL,...GM_FALLBACK].filter(Boolean)){if(await attempt(m)){ok=true;if(m!==MODEL)autoModel=m;break}if(authFail)break}
      if(!ok&&!authFail){for(const m of await discoverModels()){if(await attempt(m)){ok=true;autoModel=m;break}if(authFail)break}}
      if(!ok)return res.status(502).json({error:firstErr||'AI error'});
      const c=j.candidates?.[0];let text=(c?.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join('');
      if(c?.finishReason==='MAX_TOKENS'&&!plain&&!text.includes('<<ACTIONS>>')){const k=text.search(/[.!?\u2026\n][^.!?\u2026\n]*$/);if(k>text.length*.5)text=text.slice(0,k+1)}
      return done(text||(plain?'':'Is baar jawab nahi ban saka ('+(j.promptFeedback?.blockReason||c?.finishReason||'khali')+'). Apni baat dusre alfaaz mein likh kar dobara bhejo 💚'));
    }
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:MODEL,max_tokens:3000,system:sys,messages:msgs})});
    const j=await r.json();
    if(!r.ok)return res.status(502).json({error:j.error?.message||'AI error'});
    done(j.content.map(c=>c.text||'').join('')||(plain?'':'Jawab khali aaya, dobara try karo 💚'));
  }catch(e){res.status(502).json({error:'AI unreachable'})}
});
// ---- AI chat: streaming (words appear as they are written). The old /api/chat above is untouched and used as fallback. ----
async function* sseData(body){const dec=new TextDecoder();let buf='';
  const grab=b=>b.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).join('');
  for await(const ch of body){buf+=dec.decode(ch,{stream:true});
    for(;;){const m=/\r?\n\r?\n/.exec(buf);if(!m)break;const blk=buf.slice(0,m.index);buf=buf.slice(m.index+m[0].length);const d=grab(blk);if(d)yield d}}
  const t=grab(buf);if(t)yield t}
const MARK='<<ACTIONS>>';
function makeEmitter(send){let all='',sent=0,hit=false;
  return{push(t){all+=t;if(hit)return;const k=all.indexOf(MARK);let safe;
      if(k>-1){hit=true;safe=k}else{safe=all.length;for(let n=Math.min(MARK.length-1,all.length);n>0;n--){if(MARK.startsWith(all.slice(-n))){safe=all.length-n;break}}}
      if(safe>sent){send(all.slice(sent,safe));sent=safe}},
    end(){if(!hit&&sent<all.length){send(all.slice(sent));sent=all.length}return all}}}
app.post('/api/chat-stream',guard,async(req,res)=>{
  const{messages,context}=req.body||{};
  if(!Array.isArray(messages)||!messages.length)return res.status(400).json({error:'bad request'});
  const sys=SYSTEM+(context?'\n\nUSER KI YAADDASHT AUR DATA:\n'+String(context).slice(0,6000):'');
  const msgs=messages.slice(-30).map(m=>({role:m.role==='assistant'?'assistant':'user',content:String(m.content).slice(0,4000)}));
  let started=false,gone=false;res.on('close',()=>{gone=true});
  const send=o=>{if(!gone)res.write('data: '+JSON.stringify(o)+'\n\n')};
  const begin=()=>{if(started)return;started=true;res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.flushHeaders()};
  try{
    let upstream=null;
    if(USE_GEMINI){
      const cats=['HARM_CATEGORY_HARASSMENT','HARM_CATEGORY_HATE_SPEECH','HARM_CATEGORY_SEXUALLY_EXPLICIT','HARM_CATEGORY_DANGEROUS_CONTENT'];
      const body=JSON.stringify({systemInstruction:{parts:[{text:sys}]},contents:msgs.map(x=>({role:x.role==='assistant'?'model':'user',parts:[{text:x.content}]})),safetySettings:cats.map(c=>({category:c,threshold:'BLOCK_ONLY_HIGH'})),generationConfig:{maxOutputTokens:8192,temperature:.9}});
      const tried=new Set();let firstErr='',authFail=false;
      const attempt=async m=>{if(tried.has(m))return false;tried.add(m);
        for(let k=0;k<2;k++){
          const x=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:streamGenerateContent?alt=sse`,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':GEMINI_API_KEY},body});
          if(x.ok){upstream=x;return true}
          const j=await x.json().catch(()=>({}));
          if(!firstErr)firstErr=j.error?.message||('AI error '+x.status);
          if(x.status===401||x.status===403){authFail=true;return false}
          if(![500,502,503,504].includes(x.status))return false;
          await wait(700)
        }return false};
      let ok=false;
      for(const m of [autoModel,MODEL,...GM_FALLBACK].filter(Boolean)){if(await attempt(m)){ok=true;if(m!==MODEL)autoModel=m;break}if(authFail)break}
      if(!ok&&!authFail){for(const m of await discoverModels()){if(await attempt(m)){ok=true;autoModel=m;break}if(authFail)break}}
      if(!ok)return res.status(502).json({error:firstErr||'AI error'});
    }else{
      const x=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:MODEL,max_tokens:3000,system:sys,messages:msgs,stream:true})});
      if(!x.ok){const j=await x.json().catch(()=>({}));return res.status(502).json({error:j.error?.message||'AI error'})}
      upstream=x;
    }
    begin();
    const em=makeEmitter(t=>send({t}));let reason='';
    for await(const d of sseData(upstream.body)){if(gone)break;let j;try{j=JSON.parse(d)}catch(e){continue}
      if(USE_GEMINI){const c=j.candidates?.[0];
        if(c){const t=(c.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join('');if(t)em.push(t);if(c.finishReason)reason=c.finishReason}
        else if(j.promptFeedback?.blockReason)reason=j.promptFeedback.blockReason}
      else{if(j.type==='content_block_delta'&&j.delta?.type==='text_delta')em.push(j.delta.text||'');else if(j.type==='error')reason=j.error?.message||'error'}}
    const p=parse(em.end());
    send({done:true,text:p.text||('Is baar jawab nahi ban saka ('+(reason||'khali')+'). Apni baat dusre alfaaz mein likh kar dobara bhejo 💚'),actions:p.actions});
    res.end();
  }catch(e){
    if(!started)return res.status(502).json({error:'AI unreachable'});
    send({error:'stream broke'});res.end()}
});
app.use(express.static(path.join(__dirname,'public')));
app.listen(PORT,()=>console.log('Saathi running on port '+PORT+(UP?' (Upstash storage)':' (file storage)')));
