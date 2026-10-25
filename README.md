# Saathi (Khudi) — personal AI coach, private & installable

Password-protected app. AI chat with full memory, daily history, streak, tasks. AI can control the app (add/finish tasks, remember facts, set triggers, start streak).

## Render env variables
- `APP_PASSWORD` (long), `SESSION_SECRET` (auto), `GEMINI_API_KEY` (free) **or** `ANTHROPIC_API_KEY`
- **Permanent history (recommended):** make a free Redis at upstash.com, copy *REST URL* and *REST Token* into `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Without it, Render's free disk wipes server data on restart (browser copy + Backup button still protect you).
- Optional: `MODEL`

## Update
Replace files in the repo, commit, Render redeploys. In-app: Score tab -> Download/Restore backup.
