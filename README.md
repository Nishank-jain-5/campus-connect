# 🎓 Campus Connect — AI College Research Agent

An advanced AI-powered college research assistant using Google Gemini (free).
Supports college search, deep analysis, image/PDF analysis, voice mode, and global AI chat.

---

## 🚀 Quick Start (Local)

1. **Get a free Gemini API key** → https://aistudio.google.com/app/apikey
2. Copy `config.js.template` → rename to `config.js`
3. Paste your key inside `config.js`:
   ```js
   window.CC_CONFIG = {
     GEMINI_KEY: 'AIzaSy...your-key-here...',
   };
   ```
4. Open `index.html` in your browser — done!

> **No key in config.js?** The app will show a popup asking for it on first load.
> Keys entered there are saved only in your own browser's localStorage — never sent anywhere.

---

## 🔑 API Key Security — How It Works

| Where key lives | Safe to push to Git? |
|---|---|
| `config.js` (local only, in `.gitignore`) | ✅ File never pushed |
| Browser localStorage (popup entry) | ✅ Never in any file |
| `config.js.template` (placeholder) | ✅ Has no real key |

**Rule:** Never paste a real key into `agent.js` or any file not in `.gitignore`.

---

## 🌐 Free Hosting Options

### Option 1 — GitHub Pages (Easiest, 100% Free)

1. Push this folder to a GitHub repository.
2. Go to **Settings → Pages → Source → Deploy from branch → main → / (root)**.
3. Your site is live at `https://yourusername.github.io/your-repo-name/`
4. Users will be prompted to enter their own Gemini key on first visit (saved in their browser).

> `config.js` is in `.gitignore` so it will never be pushed — your key stays private.

---

### Option 2 — Netlify (Free, Drag & Drop — Recommended)

1. Go to **https://app.netlify.com** → Log in (free account).
2. Drag and drop the entire project folder onto the Netlify dashboard.
3. Site goes live instantly at a `*.netlify.app` URL.
4. **Optional — set a default key via environment variable** (advanced):
   - Go to **Site Settings → Environment Variables → Add variable**
   - Name: `GEMINI_KEY`, Value: your key
   - Then you'd need a small build step to inject it — easier to just let users enter their own key.

---

### Option 3 — Vercel (Free)

1. Push to GitHub first.
2. Go to **https://vercel.com** → Import Git repository.
3. No build command needed — it serves static files directly.
4. Live at `*.vercel.app`.

---

### Option 4 — Cloudflare Pages (Free, Fast CDN)

1. Push to GitHub.
2. Go to **https://pages.cloudflare.com** → Connect to Git.
3. No build command, output directory: leave blank (root).
4. Live at `*.pages.dev`.

---

## ✨ Features

- 🔍 **College Search** — Find any college worldwide
- 🕷️ **Deep Web Crawl** — Fetches live data from official college websites
- 💬 **AI Chat** — Ask anything about fees, admissions, placements, courses
- 🌐 **Global AI Mode** — Ask any question (science, coding, history, etc.)
- 📎 **Image & PDF Analyzer** — Attach any image or PDF for AI analysis
- 🎙️ **Voice Mode** — Full voice input + spoken AI responses
- 🌍 **Multi-language** — Hindi, Tamil, Telugu, Bengali, and 15+ languages
- 📊 **Charts & Visualizations** — Auto-generated college data charts
- 📄 **PDF Export** — Export chat as PDF

---

## 📁 File Structure

```
campus-connect/
├── index.html              ← Main app
├── config.js.template      ← Copy to config.js and add your key
├── config.js               ← YOUR REAL KEY (in .gitignore, never pushed)
├── .gitignore              ← Protects config.js
├── README.md
└── src/
    ├── components/
    │   ├── agent.js        ← Gemini AI + college search logic
    │   ├── main.js         ← App controller
    │   ├── ui.js           ← UI rendering
    │   ├── charts.js       ← Chart.js visualizations
    │   └── canvas-bg.js    ← Animated background
    ├── utils/
    │   ├── image-upload.js ← Image & PDF analyzer (NEW)
    │   ├── speech.js       ← Voice mode + TTS
    │   ├── helpers.js      ← Utilities
    │   └── pdf-export.js   ← PDF export
    └── styles/
        └── main.css        ← All styles
```
