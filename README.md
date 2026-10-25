# Khudi — personal coach app (private, installable)

Password-protected web app with its own server. Works on phone like an app (home-screen icon, full screen).

## Free deploy on Render
1. Put this folder on GitHub (private repo). `.env` and `data.json` are git-ignored.
2. render.com -> New -> Blueprint (or Web Service) -> pick the repo. Plan: **Free**.
   - Build: `npm install`   Start: `npm start`
3. Environment variables: `APP_PASSWORD` (long password), `ANTHROPIC_API_KEY` (console.anthropic.com), `SESSION_SECRET` (random text; Blueprint generates it), optional `MODEL`.
4. Open `https://<name>.onrender.com`, log in.

### Free-tier facts
- Sleeps after 15 min idle; first open can take ~30-60 s. Normal.
- Server files are wiped on restart. This app keeps a copy of your streak/notes in your browser and restores the server from it, so your data survives. Use the same browser/phone as your main device. For true multi-device sync, use a paid disk or a free database.

## Install on your phone (shows on home screen)
- **Android (Chrome):** menu (⋮) -> "Install app" / "Add to Home screen".
- **iPhone (Safari):** Share -> "Add to Home Screen".
- **Laptop (Chrome/Edge):** install icon in the address bar.

## Run locally
`npm install`, copy `.env.example` to `.env`, fill it, `npm start`, open http://localhost:3000

## Changing things later (you do NOT start over)
| What you want to change | Edit this file |
|---|---|
| Colours, fonts, roundness, dark/light theme | `public/style.css` (top `:root` block) |
| App name, greeting, quotes, quick buttons, milestones, SOS steps, reflection questions | `public/config.js` |
| Layout / screens | `public/index.html` |
| Behaviour (streak, chat, journal) | `public/app.js` |
| Coach's personality & rules | `SYSTEM` text in `server.js` |
| Password / API key / model | Render -> Environment variables |

**How to update the live app:** edit the file -> commit & push to GitHub -> Render redeploys automatically in a minute or two. Your data stays safe. Or just tell Claude what you want changed and replace the file it gives you.
