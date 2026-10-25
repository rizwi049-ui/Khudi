const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// optional .env loader (no extra dependency)
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n').forEach(l => {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  });
} catch (e) {}

const { APP_PASSWORD, SESSION_SECRET, ANTHROPIC_API_KEY } = process.env;
const MODEL = process.env.MODEL || 'claude-sonnet-5-5';
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(process.env.DATA_DIR || __dirname, 'data.json');
if (!APP_PASSWORD || !SESSION_SECRET || !ANTHROPIC_API_KEY) {
  console.error('Set APP_PASSWORD, SESSION_SECRET and ANTHROPIC_API_KEY first.');
  process.exit(1);
}

const SYSTEM = `You are a warm, wise personal coach for one person, speaking in simple Roman Urdu/Hinglish (match the user's language). Help with khudi (self-respect, self-awareness, purpose, inspired by Iqbal's idea of khudi), identity, motivation, and quitting the porn/masturbation habit. Be kind, never shaming; treat relapse as data, not failure. Give practical steps (urge surfing, environment design, replacing habits, sleep, exercise, prayer/meditation if they wish, accountability). Keep replies short (under 120 words) and end with one small action or one question. If the person seems depressed, hopeless or unsafe, gently urge talking to a trusted person or a professional.`;

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));

// ---- auth: signed cookie, 30 days ----
const sign = s => crypto.createHmac('sha256', SESSION_SECRET).update(s).digest('hex');
const eq = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
function makeToken() { const exp = Date.now() + 30 * 864e5; return exp + '.' + sign(String(exp)); }
function valid(tok) { if (!tok) return false; const [exp, sig] = tok.split('.'); return sig && Number(exp) > Date.now() && eq(sig, sign(exp)); }
function cookie(req) { const m = (req.headers.cookie || '').match(/(?:^|; )sess=([^;]+)/); return m && m[1]; }
const fails = {};
app.post('/login', (req, res) => {
  const ip = req.ip, f = fails[ip] || { n: 0, t: 0 };
  if (f.n >= 5 && Date.now() - f.t < 15 * 60e3) return res.status(429).json({ error: 'Too many tries. Wait 15 minutes.' });
  if (typeof req.body.password === 'string' && eq(req.body.password, APP_PASSWORD)) {
    fails[ip] = { n: 0, t: 0 };
    res.setHeader('Set-Cookie', `sess=${makeToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${30 * 86400}${req.secure ? '; Secure' : ''}`);
    return res.json({ ok: true });
  }
  fails[ip] = { n: f.n + 1, t: Date.now() };
  res.status(401).json({ error: 'Wrong password' });
});
app.post('/logout', (req, res) => { res.setHeader('Set-Cookie', 'sess=; Path=/; Max-Age=0'); res.json({ ok: true }); });
const guard = (req, res, next) => valid(cookie(req)) ? next() : res.status(401).json({ error: 'auth' });

// ---- data (single user, JSON file) ----
const read = () => { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { return {}; } };
app.get('/api/data', guard, (req, res) => res.json(read()));
app.put('/api/data', guard, (req, res) => { fs.writeFileSync(DATA_FILE, JSON.stringify(req.body)); res.json({ ok: true }); });

// ---- AI chat ----
app.post('/api/chat', guard, async (req, res) => {
  const { messages, context } = req.body;
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'bad request' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL, max_tokens: 600,
        system: SYSTEM + (context ? '\n\nContext about the user: ' + String(context).slice(0, 2000) : ''),
        messages: messages.slice(-12).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 4000) }))
      })
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: j.error?.message || 'AI error' });
    res.json({ text: j.content.map(c => c.text || '').join('') });
  } catch (e) { res.status(502).json({ error: 'AI unreachable' }); }
});

app.use(express.static(path.join(__dirname, 'public')));
app.listen(PORT, () => console.log('Khudi app running on port ' + PORT));
