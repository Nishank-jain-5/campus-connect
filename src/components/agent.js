/* ═══════════════════════════════════════════════════════
   CAMPUS CONNECT — Advanced AI Agent  (v6 — Zero-Neglect Edition)
   ✅ Auto language detection (Hindi, Tamil, Hinglish, etc.)
   ✅ Tone-adaptive responses (casual ↔ formal ↔ technical)
   ✅ Off-topic question filtering via LLM intent classifier
   ✅ STRICT zero-neglect policy — never redirect to website
   ✅ gemini-2.5-flash-preview-04-17 (latest free model)
   ✅ Rate limit handling + smart retry with backoff
   ✅ Jina AI free web reader — multi-page deep crawl (primary)
   ✅ Browse AI API — deep scraping fallback (secondary)
   ✅ On-demand per-topic live fetch during Q&A
   ✅ Google Search grounding — always ON for Q&A answers
   ✅ Multi-layer answer synthesis — always gives real data
   ═══════════════════════════════════════════════════════ */

/* ── GLOBALS ────────────────────────────────────────── */
window.CC_PHASE              = 1;
window.CC_LANG               = 'auto';
window.CC_SELECTED_COLLEGE   = null;
window.CC_COLLEGE_DATA       = null;
window.CC_CONVERSATION       = [];
window.CC_CHAT_LOG           = [];
window.CC_FOUND_COLLEGES     = [];
window.CC_DETECTED_LANG      = 'English';
window.CC_CRAWL_RAW          = {};   // raw crawl pages cache
window.CC_TOPIC_CACHE        = {};   // per-topic deep-fetch cache

/* ── MODEL CONFIG ───────────────────────────────────── */
const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_BASE  = 'https://generativelanguage.googleapis.com/v1beta/models/';

/* ── API KEYS ─────────────────────────────────────────── */
/* Keys are NEVER hardcoded. They are stored only in the user's
   own browser localStorage — so no key leaks when hosted on GitHub/Netlify/Vercel. */
function getGeminiKey()   {
  return (window.CC_CONFIG && window.CC_CONFIG.GEMINI_KEY)
    ? window.CC_CONFIG.GEMINI_KEY
    : (localStorage.getItem('CC_GEMINI_KEY') || '');
}
function getBrowseAiKey() {
  return (window.CC_CONFIG && window.CC_CONFIG.BROWSE_AI_KEY)
    ? window.CC_CONFIG.BROWSE_AI_KEY
    : (localStorage.getItem('CC_BROWSE_AI_KEY') || '');
}

/* ── REQUEST QUEUE ──────────────────────────────────── */
const _queue = { pending: [], running: false };

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    _queue.pending.push({ fn, resolve, reject });
    _drainQueue();
  });
}

async function _drainQueue() {
  if (_queue.running || _queue.pending.length === 0) return;
  _queue.running = true;
  const { fn, resolve, reject } = _queue.pending.shift();
  try { resolve(await fn()); }
  catch (e) { reject(e); }
  finally { setTimeout(() => { _queue.running = false; _drainQueue(); }, 600); }
}

/* ══════════════════════════════════════════════════════
   LANGUAGE & TONE DETECTION
   ══════════════════════════════════════════════════════ */
const HINGLISH_WORDS = /\b(kya|hai|nahi|hain|kaise|kyun|aur|mera|meri|mere|yeh|woh|iska|uska|batao|bata|bhai|yaar|bol|karo|matlab|samajh|samjha|paisa|kitni|kitna|chahiye|mujhe|humko|hona|chahta|chahti|theek|sahi|sab|kuch|dekho|lena|lelo|abhi|kal|aaj|accha|badhiya|lagta|lagti|bohot|bahut|pata|pooch|seekh|padh|likh|exam|result|cutoff|admission|apply|kab|kaha|kaun|kitne|hoga|hogi|milega|milegi|batao|samjhao|suno|sunlo)\b/i;

function detectUserLanguage(text) {
  if (!text || text.length < 2) return 'English';
  if (/[\u0900-\u097F]/.test(text)) return 'Hindi';
  if (/[\u0A00-\u0A7F]/.test(text)) return 'Punjabi';
  if (/[\u0A80-\u0AFF]/.test(text)) return 'Gujarati';
  if (/[\u0B00-\u0B7F]/.test(text)) return 'Odia';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'Tamil';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'Telugu';
  if (/[\u0C80-\u0CFF]/.test(text)) return 'Kannada';
  if (/[\u0D00-\u0D7F]/.test(text)) return 'Malayalam';
  if (/[\u0980-\u09FF]/.test(text)) return 'Bengali';
  if (/[\u0600-\u06FF]/.test(text)) return 'Urdu';
  if (/[\u0590-\u05FF]/.test(text)) return 'Hebrew';
  if (/[\u0400-\u04FF]/.test(text)) return 'Russian';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'Chinese';
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'Japanese';
  if (/[\uAC00-\uD7AF]/.test(text)) return 'Korean';
  if (HINGLISH_WORDS.test(text)) return 'Hinglish';
  if (/\b(universidad|carrera|matr[ií]cula|cu[áa]nto|c[óo]mo|qu[eé]|d[óo]nde|admisi[óo]n)\b/i.test(text)) return 'Spanish';
  if (/\b(universit[eé]|cours|frais|comment|combien|o[ùu]|admission)\b/i.test(text)) return 'French';
  if (/\b(universit[äa]t|kurs|studium|wie|wann|geb[üu]hren|zulassung)\b/i.test(text)) return 'German';
  return 'English';
}

function detectUserTone(text) {
  const lower = text.toLowerCase();
  if (/\b(bhai|yaar|dude|bro|buddy|hey|sup|wassup|lol|haha|ya|yep|nope|thx|ty|plz|pls|wanna|gonna|gotta|ngl|tbh|imo|fyi|btw|samjha|batao|yaar|suno)\b/.test(lower)) return 'casual';
  if (/\b(research|publication|faculty|infrastructure|accreditation|naac|nba|nirf|methodology|curriculum|pedagogy|consortium|collaboration|endowment|grant|accredited|affiliated)\b/.test(lower)) return 'technical';
  if (/\?{2,}|don.?t know|confused|not sure|help me|guide me|what should|which one|suggest|recommend|samajh nahi|kya karun|kaise karun/.test(lower)) return 'needs-guidance';
  return 'normal';
}

/* ══════════════════════════════════════════════════════
   LAYER 1 — JINA AI FREE WEB READER (Primary Crawl)
   ══════════════════════════════════════════════════════ */
async function fetchWebPage(url, maxChars = 12000) {
  if (!url || url === '#') return '';
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { 'Accept': 'text/plain', 'X-No-Cache': 'true' },
      signal: AbortSignal.timeout(18000),
    });
    if (!res.ok) return '';
    const text = await res.text();
    return text.slice(0, maxChars);
  } catch { return ''; }
}

async function deepCrawlCollege(baseUrl, onProgress) {
  const results = {};

  function guessSubpages(base) {
    const b = base.replace(/\/$/, '');
    return [
      { key: 'admissions',  urls: [`${b}/admissions`, `${b}/admission`, `${b}/admissions/undergraduate`, `${b}/apply`, `${b}/admissions/ug`] },
      { key: 'courses',     urls: [`${b}/academics`, `${b}/courses`, `${b}/programs`, `${b}/departments`, `${b}/academic-programs`, `${b}/academics/programmes`] },
      { key: 'placements',  urls: [`${b}/placements`, `${b}/placement`, `${b}/careers`, `${b}/training-placement`, `${b}/campus-placements`, `${b}/tpo`] },
      { key: 'fees',        urls: [`${b}/fees`, `${b}/fee-structure`, `${b}/financials`, `${b}/tuition`, `${b}/scholarships`, `${b}/fee`, `${b}/admissions/fee-structure`] },
      { key: 'facilities',  urls: [`${b}/facilities`, `${b}/campus`, `${b}/infrastructure`, `${b}/campus-life`] },
      { key: 'research',    urls: [`${b}/research`, `${b}/research-centers`, `${b}/innovation`] },
      { key: 'about',       urls: [`${b}/about`, `${b}/about-us`, `${b}/overview`, `${b}/history`] },
    ];
  }

  if (onProgress) onProgress('Fetching official homepage...');
  results.home = await fetchWebPage(baseUrl, 10000);

  const subpageGuesses = guessSubpages(baseUrl);
  const subpageKeys = ['admissions', 'courses', 'placements', 'fees'];

  await Promise.allSettled(
    subpageKeys.map(async (key) => {
      if (onProgress) onProgress(`Crawling ${key} page...`);
      const urlList = subpageGuesses.find(s => s.key === key)?.urls || [];
      for (const url of urlList) {
        const content = await fetchWebPage(url, 8000);
        if (content && content.length > 300) { results[key] = content; break; }
      }
    })
  );

  await Promise.allSettled(
    ['facilities', 'about'].map(async (key) => {
      if (onProgress) onProgress(`Crawling ${key} page...`);
      const urlList = subpageGuesses.find(s => s.key === key)?.urls || [];
      for (const url of urlList) {
        const content = await fetchWebPage(url, 6000);
        if (content && content.length > 200) { results[key] = content; break; }
      }
    })
  );

  window.CC_CRAWL_RAW = results;
  return results;
}

/* ══════════════════════════════════════════════════════
   LAYER 2 — BROWSE AI API (Deep Scraping Fallback)
   Used when Jina fails or returns sparse data for a topic
   ══════════════════════════════════════════════════════ */
const BROWSE_AI_TOPIC_PATHS = {
  fees:        ['/fees', '/fee-structure', '/fee', '/admissions/fee-structure', '/financials'],
  courses:     ['/academics', '/courses', '/programs', '/departments'],
  placements:  ['/placements', '/placement', '/tpo', '/careers'],
  admissions:  ['/admissions', '/admission', '/apply'],
  hostel:      ['/hostel', '/accommodation', '/campus-life', '/facilities'],
  research:    ['/research', '/research-centers', '/innovation'],
  scholarships:['/scholarships', '/financials', '/fees'],
  faculty:     ['/faculty', '/people', '/academics/faculty'],
};

async function browseAiScrapeUrl(url) {
  const apiKey = getBrowseAiKey();
  if (!apiKey) return null;

  try {
    // Browse AI v2 extract endpoint — extracts cleaned text from any URL
    const res = await fetch(`https://api.browse.ai/v2/robots/extract`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        tasks: [{ type: 'text', name: 'page_content' }]
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.result?.page_content
      || data?.capturedData?.page_content
      || data?.text
      || data?.content
      || '';
    return text.slice(0, 10000) || null;
  } catch {
    return null;
  }
}

async function browseAiDeepFetch(collegeUrl, topic, onProgress) {
  const cacheKey = `${collegeUrl}::${topic}`;
  if (window.CC_TOPIC_CACHE[cacheKey]) return window.CC_TOPIC_CACHE[cacheKey];

  const apiKey = getBrowseAiKey();
  if (!apiKey) return null;

  const base = collegeUrl.replace(/\/$/, '');
  const paths = BROWSE_AI_TOPIC_PATHS[topic] || [`/${topic}`];

  if (onProgress) onProgress(`Browse AI: deep-scraping ${topic}...`);

  for (const path of paths) {
    const url = base + path;
    const content = await browseAiScrapeUrl(url);
    if (content && content.length > 200) {
      window.CC_TOPIC_CACHE[cacheKey] = content;
      return content;
    }
  }
  return null;
}

async function enrichWithBrowseAi(crawlResults, collegeUrl, onProgress) {
  const topicsToCheck = ['fees', 'courses', 'placements', 'admissions'];
  const enriched = { ...crawlResults };
  const apiKey = getBrowseAiKey();

  if (!apiKey) return enriched; // skip if no key

  const sparse = topicsToCheck.filter(t => !crawlResults[t] || crawlResults[t].length < 500);
  if (sparse.length === 0) return enriched;

  if (onProgress) onProgress(`Browse AI enriching ${sparse.length} sparse sections...`);

  await Promise.allSettled(
    sparse.map(async (topic) => {
      const data = await browseAiDeepFetch(collegeUrl, topic, onProgress);
      if (data && data.length > 200) {
        enriched[`${topic}_browseai`] = data;
        if (onProgress) onProgress(`✅ Browse AI fetched: ${topic}`);
      }
    })
  );

  return enriched;
}

function buildWebContext(crawlResults, baseUrl) {
  const sections = [];
  const labels = {
    home:                'HOMEPAGE',
    admissions:          'ADMISSIONS PAGE (Jina)',
    courses:             'ACADEMICS/COURSES PAGE (Jina)',
    placements:          'PLACEMENTS/CAREERS PAGE (Jina)',
    fees:                'FEES/SCHOLARSHIPS PAGE (Jina)',
    facilities:          'FACILITIES/CAMPUS PAGE (Jina)',
    research:            'RESEARCH PAGE (Jina)',
    about:               'ABOUT PAGE (Jina)',
    admissions_browseai: 'ADMISSIONS (Browse AI Deep Scrape)',
    courses_browseai:    'COURSES (Browse AI Deep Scrape)',
    placements_browseai: 'PLACEMENTS (Browse AI Deep Scrape)',
    fees_browseai:       'FEES (Browse AI Deep Scrape)',
  };
  let totalChars = 0;
  for (const [key, content] of Object.entries(crawlResults)) {
    if (content && content.trim().length > 100) {
      sections.push(`\n\n━━━ ${labels[key] || key.toUpperCase()} (${baseUrl}) ━━━\n${content}`);
      totalChars += content.length;
    }
  }
  if (sections.length === 0) return '\n\n(Website not accessible — using Google Search grounding and AI knowledge.)';
  const pagesFound = Object.keys(crawlResults).filter(k => crawlResults[k]?.length > 100).length;
  return `\n\nWEBSITE DATA (${pagesFound} pages/sections crawled, ${totalChars.toLocaleString()} chars):\n${sections.join('')}\n\nEXTRACT ALL specific numbers, fees, cutoffs, packages from above.`;
}

/* ══════════════════════════════════════════════════════
   LAYER 3 — ON-DEMAND TOPIC DEEP DIVE (During Q&A)
   ══════════════════════════════════════════════════════ */
function detectTopic(userMessage) {
  const m = userMessage.toLowerCase();
  if (/fee|cost|tuition|expense|scholarship|financial aid|stipend|hostel fee|mess fee|kitna lagta|kitni fees/.test(m)) return 'fees';
  if (/course|program|branch|degree|btech|mtech|mba|mca|bsc|msc|ba|ma|phd|diploma|syllabus/.test(m)) return 'courses';
  if (/placement|job|recruit|salary|package|lpa|ctc|company|campus placement|hire/.test(m)) return 'placements';
  if (/admission|apply|eligib|cutoff|rank|jee|neet|cat|gate|entrance|application|deadline/.test(m)) return 'admissions';
  if (/hostel|accommodation|room|pg|mess|canteen|campus life/.test(m)) return 'hostel';
  if (/research|phd|publication|paper|patent|lab|center/.test(m)) return 'research';
  if (/faculty|professor|teacher|staff/.test(m)) return 'faculty';
  if (/scholarship|merit|means|financial/.test(m)) return 'scholarships';
  return null;
}

async function getTopicContext(userMessage) {
  const college = window.CC_SELECTED_COLLEGE;
  if (!college?.url) return '';

  const topic = detectTopic(userMessage);
  if (!topic) return '';

  // Check if we already have good data for this topic
  const existing = window.CC_CRAWL_RAW[topic]
    || window.CC_CRAWL_RAW[`${topic}_browseai`]
    || window.CC_CRAWL_RAW[`${topic}_live`]
    || window.CC_CRAWL_RAW[`${topic}_ondemand`];
  if (existing && existing.length > 400) return ''; // already have it

  // Try Browse AI first (if key exists)
  const browseAiKey = getBrowseAiKey();
  if (browseAiKey) {
    const content = await browseAiDeepFetch(college.url, topic);
    if (content && content.length > 200) {
      window.CC_CRAWL_RAW[`${topic}_ondemand`] = content;
      return `\n\n━━━ ON-DEMAND BROWSE AI: ${topic.toUpperCase()} ━━━\n${content}\n━━━ END ━━━\n`;
    }
  }

  // Fallback to Jina live fetch
  const base = college.url.replace(/\/$/, '');
  const paths = BROWSE_AI_TOPIC_PATHS[topic] || [];
  for (const path of paths) {
    const content = await fetchWebPage(base + path, 8000);
    if (content && content.length > 300) {
      window.CC_CRAWL_RAW[`${topic}_live`] = content;
      return `\n\n━━━ LIVE FETCHED: ${topic.toUpperCase()} PAGE ━━━\n${content}\n━━━ END ━━━\n`;
    }
  }
  return '';
}

/* ══════════════════════════════════════════════════════
   GEMINI API
   ══════════════════════════════════════════════════════ */
async function callGemini({ system, messages, useSearch = false, maxTokens = 2000 }) {
  return enqueue(() => _callGeminiRaw({ system, messages, useSearch, maxTokens }));
}

async function _callGeminiRaw({ system, messages, useSearch = false, maxTokens = 2000 }, retries = 2) {
  const apiKey = getGeminiKey();
  if (!apiKey) { showApiKeyPrompt(); throw new Error('No API key set.'); }

  const body = {
    contents: messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    })),
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.55 },
  };
  if (system) body.system_instruction = { parts: [{ text: system }] };
  if (useSearch) body.tools = [{ google_search: {} }];

  let res;
  try {
    res = await fetch(`${GEMINI_BASE}${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
  } catch { throw new Error('Network error — check your internet connection.'); }

  if (res.status === 429) {
    if (retries > 0) {
      const waitMs = retries === 2 ? 15000 : 35000;
      showRateLimitToast(waitMs / 1000);
      await sleep(waitMs);
      return _callGeminiRaw({ system, messages, useSearch, maxTokens }, retries - 1);
    }
    throw new Error('Rate limit reached. Free tier allows 15 req/min — please wait 1 minute and try again.');
  }

  if (!res.ok) {
    const err = await res.text();
    if ([401, 403].includes(res.status)) {
      localStorage.removeItem('CC_GEMINI_KEY');
      showApiKeyPrompt();
      throw new Error('Invalid API key. Please enter a valid Gemini key.');
    }
    throw new Error('Gemini error ' + res.status + ': ' + err.slice(0, 200));
  }

  const data = await res.json();
  return (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('\n').trim();
}

/* ── RATE LIMIT TOAST ────────────────────────────────── */
function showRateLimitToast(seconds) {
  let toast = document.getElementById('rlToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'rlToast';
    toast.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:99999;
      background:linear-gradient(135deg,#1e293b,#0f172a);
      border:1px solid rgba(251,191,36,0.5);border-radius:12px;
      padding:14px 20px;color:#fbbf24;font-family:Outfit,sans-serif;
      font-size:13px;box-shadow:0 8px 32px rgba(0,0,0,0.5);max-width:300px;`;
    document.body.appendChild(toast);
  }
  let t = Math.round(seconds);
  const tick = () => {
    toast.textContent = `⏳ Rate limit — auto-retrying in ${t}s…`;
    if (--t < 0) { toast.remove(); } else { setTimeout(tick, 1000); }
  };
  tick();
}

/* ── DUAL API KEY MODAL ──────────────────────────────── */
function showApiKeyPrompt() {
  if (document.getElementById('apiKeyModal')) return;
  const hasBrowseAi = getBrowseAiKey();
  const modal = document.createElement('div');
  modal.id = 'apiKeyModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;font-family:Outfit,sans-serif;';
  modal.innerHTML = `
    <div style="background:linear-gradient(135deg,#0f172a,#1e293b);border:1px solid rgba(139,92,246,0.4);border-radius:20px;padding:36px 40px;max-width:520px;width:90%;box-shadow:0 25px 60px rgba(0,0,0,0.6);color:#e2e8f0;text-align:center;">
      <div style="font-size:3rem;margin-bottom:12px;">🔑</div>
      <h2 style="font-size:1.5rem;font-weight:700;color:#a78bfa;margin:0 0 8px;">Setup API Keys</h2>
      <p style="font-size:0.85rem;color:#94a3b8;margin:0 0 16px;line-height:1.6;">
        Powered by <strong style="color:#e2e8f0;">Gemini 2.5 Flash</strong> + <strong style="color:#e2e8f0;">Browse AI</strong><br>
        Get Gemini key at <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:#a78bfa;">aistudio.google.com</a>
      </p>
      <div style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.25);border-radius:10px;padding:14px 16px;margin-bottom:16px;font-size:0.82rem;color:#c4b5fd;text-align:left;line-height:2.1;">
        ✅ <strong>Zero-neglect AI</strong> — answers every question, never redirects<br>
        ✅ <strong>Browse AI deep scraping</strong> — penetrates pages Jina can't read<br>
        ✅ <strong>On-demand topic fetch</strong> — live data per question<br>
        ✅ <strong>Always-on Google Search</strong> — latest facts for every answer<br>
        ✅ <strong>Auto-detects language</strong> — Hindi, Hinglish, Tamil & more
      </div>

      <label style="display:block;text-align:left;font-size:0.8rem;color:#94a3b8;margin-bottom:4px;">
        Gemini API Key <span style="color:#f87171;">*required</span>
      </label>
      <input id="apiKeyInput" type="password" placeholder="AIza..." style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.07);border:1px solid rgba(139,92,246,0.4);border-radius:10px;padding:12px 16px;color:#e2e8f0;font-size:0.95rem;font-family:Outfit,sans-serif;outline:none;margin-bottom:12px;" />

      <label style="display:block;text-align:left;font-size:0.8rem;color:#94a3b8;margin-bottom:4px;">
        Browse AI Key <span style="color:#64748b;">(recommended — enables deep scraping)</span>
      </label>
      <input id="browseAiKeyInput" type="password" placeholder="Paste Browse AI API key..." style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.07);border:1px solid rgba(99,102,241,0.3);border-radius:10px;padding:12px 16px;color:#e2e8f0;font-size:0.95rem;font-family:Outfit,sans-serif;outline:none;margin-bottom:14px;" value="${hasBrowseAi ? '••••••••••••' : ''}" />

      <button onclick="saveApiKey()" style="width:100%;padding:13px;background:linear-gradient(135deg,#7c3aed,#5b21b6);border:none;border-radius:10px;color:#fff;font-size:1rem;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;">
        Save &amp; Start 🚀
      </button>
      <div style="margin-top:14px;border-top:1px solid rgba(255,255,255,.1);padding-top:14px;">
        <label style="display:block;font-size:12px;font-weight:600;color:#94a3b8;margin-bottom:6px;">
          ⚡ SerpAPI Key <span style="color:#64748b;font-weight:400;">(optional — speeds up answers)</span>
        </label>
        <input id="serpKeyInput" type="password" placeholder="Get free key: serpapi.com (100 searches/month)"
          style="width:100%;box-sizing:border-box;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);
          border-radius:10px;padding:11px 14px;color:#e2e8f0;font-size:0.9rem;font-family:Outfit,sans-serif;
          outline:none;margin-bottom:0px;" />
      </div>
      <p style="margin:12px 0 0;font-size:0.75rem;color:#475569;">Keys stored in your browser only. Never uploaded.</p>
    </div>`;
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('apiKeyInput')?.focus(), 100);
}

window.saveApiKey = function () {
  const key = (document.getElementById('apiKeyInput')?.value || '').trim();
  if (!key) { alert('Please paste your Gemini API key.'); return; }
  if (key.length < 10) { alert('Please enter a valid Gemini API key.'); return; }
  localStorage.setItem('CC_GEMINI_KEY', key);

  const browseKey = (document.getElementById('browseAiKeyInput')?.value || '').trim();
  if (browseKey && !browseKey.startsWith('•')) {
    localStorage.setItem('CC_BROWSE_AI_KEY', browseKey);
  }

  const serpKey = (document.getElementById('serpKeyInput')?.value || '').trim();
  if (serpKey && !serpKey.startsWith('•')) {
    localStorage.setItem('CC_SERP_KEY', serpKey);
  }
  document.getElementById('apiKeyModal')?.remove();
  if (typeof renderIntro === 'function') renderIntro();
  const hasBrowse = !!getBrowseAiKey();
  if (typeof addMsg === 'function') {
    addMsg('assistant', `✅ **Keys saved!** ${hasBrowse ? '🔍 Browse AI active — deep scraping ON!' : '💡 Add a Browse AI key anytime for even deeper data.'} Enter a college name to begin! 🎓`);
  }
};

window.changeApiKey = function () {
  localStorage.removeItem('CC_GEMINI_KEY');
  showApiKeyPrompt();
};

/* ══════════════════════════════════════════════════════
   PHASE 1 — SEARCH COLLEGE
   ══════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════
   SERP API — Fast parallel web search for speed boost
   Free tier: 100 searches/month at serpapi.com
   ══════════════════════════════════════════════════════ */
function getSerpKey() {
  return localStorage.getItem('CC_SERP_KEY') || '';
}

async function serpSearch(query, num = 5) {
  const key = getSerpKey();
  if (!key) return null;
  try {
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=${num}&api_key=${key}&engine=google`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const snippets = (data.organic_results || []).slice(0, num)
      .map(r => `[${r.title}]: ${r.snippet || ''}`.trim())
      .filter(Boolean)
      .join('\n');
    return snippets || null;
  } catch { return null; }
}

/* Quick college Q&A context from SerpAPI */
async function serpCollegeContext(collegeName, question) {
  const query = `${collegeName} ${question} official 2024 2025`;
  return await serpSearch(query, 5);
}

async function agentSearch(query) {
  const system = `You are Campus Connect, an expert AI college research agent with live web search.
Identify real colleges/universities matching the query.

Return ONLY valid JSON — no markdown, no preamble:
{
  "colleges": [
    {
      "name": "Full Official Name",
      "url": "https://official-website.edu",
      "location": "City, State, Country",
      "type": "Public/Private/Deemed",
      "established": "Year",
      "affiliation": "Affiliated body",
      "knownFor": "One line specialty"
    }
  ],
  "message": "Short friendly intro"
}
Return 1-5 real colleges only. Never invent colleges.`;

  const resp = await callGemini({
    system,
    messages: [{ role: 'user', content: `Find college: "${query}"` }],
    useSearch: true,
    maxTokens: 800,
  });
  return parseJSON(resp);
}

/* ══════════════════════════════════════════════════════
   PHASE 3 — MULTI-LAYER CRAWL & ANALYSIS
   Layer 1: Jina AI (free multi-page)
   Layer 2: Browse AI enrichment for sparse sections
   Layer 3: Gemini + Google Search synthesis
   ══════════════════════════════════════════════════════ */
async function agentCrawl(college, onProgress) {
  const steps = [
    'Fetching official homepage...', 'Crawling admissions page...',
    'Crawling courses & academics...', 'Crawling placements & careers...',
    'Crawling fees & scholarships...', 'Browse AI: enriching sparse data...',
    'AI synthesis with Google Search...', 'Building complete profile...',
  ];

  let stepIdx = 0;
  if (onProgress) onProgress(0, steps.length, steps[0]);

  const interval = setInterval(() => {
    if (stepIdx < steps.length - 2) {
      stepIdx++;
      if (onProgress) onProgress(stepIdx, steps.length, steps[stepIdx]);
    } else clearInterval(interval);
  }, 2000);

  // Layer 1: Jina crawl
  let crawlResults = await deepCrawlCollege(college.url, (msg) => {
    if (onProgress) onProgress(stepIdx, steps.length, msg);
  });

  // Layer 2: Browse AI enrichment
  if (onProgress) onProgress(5, steps.length, 'Browse AI: checking sparse sections...');
  crawlResults = await enrichWithBrowseAi(crawlResults, college.url, (msg) => {
    if (onProgress) onProgress(5, steps.length, msg);
  });

  const webContext = buildWebContext(crawlResults, college.url);
  const pagesFound = Object.keys(crawlResults).filter(k => crawlResults[k]?.length > 100).length;
  const hasBrowseAi = Object.keys(crawlResults).some(k => k.endsWith('_browseai'));

  clearInterval(interval);
  if (onProgress) onProgress(steps.length - 1, steps.length, `AI analyzing ${pagesFound} sections...`);

  const system = `You are Campus Connect — a thorough college research AI.
You have crawled ${pagesFound} sections of this college website using Jina AI${hasBrowseAi ? ' + Browse AI deep scraping' : ''}.

━━━ ABSOLUTE RULE — ZERO REDIRECT POLICY ━━━
NEVER say "visit the website", "check official website", "refer to website", "this information is not available", or ANY variation.
You MUST give a direct answer for EVERY field. Use:
1. The crawled data below (primary)
2. Google Search grounding to fill ALL gaps
3. Your knowledge of similar institutions as last resort (label as "~estimated")

For fees: provide EVERY component separately (tuition, hostel, mess, exam fee, etc.)
For courses: list ALL programs found across all sources
For placements: give specific ₹/LPA figures and company names

Return ONLY valid JSON (no markdown fences):
{
  "collegeName": "Full Official Name",
  "tagline": "Motto or tagline",
  "overview": "4-5 sentences with specific facts, rankings, achievements",
  "location": { "address": "", "city": "", "state": "", "country": "", "pincode": "", "mapQuery": "" },
  "stats": {
    "established": "", "students": "", "faculty": "", "departments": "",
    "ranking": { "national": "", "world": "", "nirf": "", "source": "" },
    "acceptanceRate": "", "campusSize": "", "researchPapers": "", "patents": ""
  },
  "fees": {
    "undergraduate": "Exact per-semester or per-year fee in ₹",
    "postgraduate": "Exact PG fee in ₹",
    "phd": "PhD stipend / fee",
    "hostel": "Hostel fee per year",
    "mess": "Mess charges per year",
    "total": "Total cost of attendance per year",
    "feeBreakdown": "Itemized: Tuition: ₹X | Hostel: ₹Y | Mess: ₹Z | Other: ₹W",
    "scholarships": "Name + value of available scholarships",
    "financialAid": "SC/ST waivers, merit scholarships, etc."
  },
  "courses": { "undergraduate": [], "postgraduate": [], "doctoral": [], "diploma": [], "online": [] },
  "departments": [],
  "admissions": {
    "undergraduate": { "eligibility": "", "exam": "", "process": "step by step", "deadline": "", "documents": [], "cutoff": "JEE/NEET rank or percentile" },
    "postgraduate": { "eligibility": "", "exam": "", "process": "", "deadline": "", "cutoff": "" }
  },
  "facilities": { "academic": [], "sports": [], "residential": [], "healthcare": [], "transport": [], "digital": [] },
  "placement": { "rate": "", "avgPackage": "", "highestPackage": "", "topRecruiters": [], "sector": "", "year": "2023-24 or latest" },
  "research": { "centers": [], "collaborations": [], "funding": "" },
  "contact": { "phone": "", "email": "", "admissionsEmail": "", "website": "", "socialMedia": { "facebook": "", "twitter": "", "linkedin": "" } },
  "links": [
    { "label": "Official Website", "url": "", "icon": "🌐" },
    { "label": "Admissions Portal", "url": "", "icon": "📝" },
    { "label": "Course Catalog", "url": "", "icon": "📚" }
  ],
  "highlights": ["5-7 specific strengths with real numbers"],
  "recentNews": "Latest notable achievement with year",
  "alumniNotable": ["3-5 names with brief description"],
  "affiliation": "NAAC grade, NBA, UGC, AICTE etc.",
  "crawlSummary": "N pages via Jina + M via Browse AI. Fees: found/not found. Placements: found/not found.",
  "dataConfidence": "high/medium/low"
}${webContext}`;

  const resp = await callGemini({
    system,
    messages: [{ role: 'user', content: `Thoroughly analyze: ${college.name}\nURL: ${college.url}\nLocation: ${college.location || ''}\n\nExtract ALL data from crawled pages. Use Google Search for any gaps. Never say "visit website".` }],
    useSearch: true,
    maxTokens: 3500,
  });

  return parseJSON(resp);
}

/* ══════════════════════════════════════════════════════
   LLM INTENT CLASSIFIER
   ══════════════════════════════════════════════════════ */
async function classifyIntent(userMessage, currentCollegeName) {
  const system = `You are an intent classifier for a college research chatbot.
Classify the user's message into exactly one intent:
- "qa"          → asking about the current college (fees, courses, placements, admissions, ranking, etc.)
- "new_search"  → clearly wants to look up a DIFFERENT college (extract the college name as newQuery)
- "off_topic"   → completely unrelated to colleges/education
- "greeting"    → hello/hi/thanks/bye type messages
- "compare"     → wants to compare current college with another

Current college: "${currentCollegeName || 'none'}"
Respond ONLY with valid JSON:
{ "intent": "qa", "newQuery": null, "reason": "one line" }`;

  try {
    const resp = await callGemini({
      system,
      messages: [{ role: 'user', content: userMessage }],
      useSearch: false,
      maxTokens: 120,
    });
    return parseJSON(resp) || { intent: 'qa', newQuery: null };
  } catch {
    return { intent: 'qa', newQuery: null };
  }
}

window.CC_classifyIntent = async function(userMessage) {
  const currentCollegeName = window.CC_COLLEGE_DATA?.collegeName || window.CC_SELECTED_COLLEGE?.name || '';
  return classifyIntent(userMessage, currentCollegeName);
};

/* ══════════════════════════════════════════════════════
   PHASE 4 — ZERO-NEGLECT SMART Q&A AGENT
   ══════════════════════════════════════════════════════ */
async function agentAnswer(userMessage) {
  const college = window.CC_SELECTED_COLLEGE;
  const cData   = window.CC_COLLEGE_DATA;

  const detectedLang = detectUserLanguage(userMessage);
  const detectedTone = detectUserTone(userMessage);
  window.CC_DETECTED_LANG = detectedLang;

  /* ── Language instruction ── */
  /* Priority: dropdown override > auto-detect from typed text */
  const langOverrideMap = {
    hi: 'Hindi', es: 'Spanish', fr: 'French',
    de: 'German', zh: 'Chinese', ar: 'Arabic', ja: 'Japanese'
  };
  const forcedLang = window.CC_LANG_OVERRIDE ? langOverrideMap[window.CC_LANG_OVERRIDE] : null;
  const activeLang = forcedLang || detectedLang;

  let langInstruction;
  if (activeLang === 'English') {
    langInstruction = 'Respond in clear, fluent English.';
  } else if (activeLang === 'Hinglish') {
    langInstruction = `Reply warmly in Hinglish (Roman script) like a knowledgeable dost. Example: "Bhai, NIT Trichy ki B.Tech fees ₹1.4 lakh per semester hai aur placements mast hain — avg 12+ LPA!"`;
  } else {
    langInstruction = `Reply ENTIRELY in ${activeLang}. Only English for proper nouns (college name, exam names).`;
  }

  /* ── Tone instruction ── */
  const toneInstructions = {
    casual:           'User is casual. Be warm, conversational, simple — like explaining to a friend.',
    technical:        'User is research-oriented. Use precise stats, cite ranking sources, accreditation.',
    'needs-guidance': 'User seems confused. Be supportive, give clear numbered steps, end with recommendation.',
    normal:           'Warm, professional, helpful.',
  };
  const toneInstruction = toneInstructions[detectedTone] || toneInstructions.normal;

  /* ── On-demand topic fetch + SerpAPI parallel ── */
  const [onDemandCtx, serpCtx] = await Promise.all([
    getTopicContext(userMessage),
    getSerpKey() ? serpCollegeContext(collegeName, userMessage) : Promise.resolve(null)
  ]);
  const serpSection = serpCtx ? `\n\n━━━ SERP SEARCH RESULTS (fresh) ━━━\n${serpCtx}\n━━━ END ━━━` : '';

  /* ── Raw page snippet for extra context ── */
  const topic = detectTopic(userMessage);
  let rawSnippet = '';
  if (topic) {
    const raw = window.CC_CRAWL_RAW[topic]
      || window.CC_CRAWL_RAW[`${topic}_browseai`]
      || window.CC_CRAWL_RAW[`${topic}_live`]
      || window.CC_CRAWL_RAW[`${topic}_ondemand`];
    if (raw && raw.length > 100) {
      rawSnippet = `\n\n━━━ RAW PAGE DATA (${topic}) ━━━\n${raw.slice(0, 3000)}\n━━━ END ━━━`;
    }
  }

  const collegeName = cData?.collegeName || college?.name || 'this college';

  const system = `You are Campus Connect — an expert AI college counselor, specialist in ${collegeName}.

━━━ COLLEGE PROFILE ━━━
${JSON.stringify(cData || {}, null, 2)}
${rawSnippet}
${onDemandCtx}${serpSection}

━━━ ZERO-NEGLECT RULES (ABSOLUTE — NO EXCEPTIONS) ━━━

🚫 FORBIDDEN PHRASES — NEVER USE THESE:
× "visit the website"
× "check their official website"
× "refer to the official website"
× "I don't have complete details"
× "this specific information is not available"
× "for accurate/latest information, please visit"
× "I cannot provide a detailed breakdown"
× Any sentence that ends with directing the user to the website

✅ WHAT YOU MUST DO INSTEAD:
1. Check the college profile JSON above → extract the exact answer
2. Check raw page data above → pull specific numbers
3. Use on-demand fetched data above → newest source
4. Use your GOOGLE SEARCH GROUNDING → find current data
5. Use your knowledge of similar institutions → give best estimate, label as "(~approx, verify)"

For FEES especially:
- Always give ₹ amounts per semester AND per year
- Break down: Tuition + Hostel + Mess + Other = Total
- Mention all scholarships by name with amounts
- If exact data unavailable, give range from similar NITs/IITs

📌 STAY ON TOPIC:
Only answer questions about ${collegeName} or general college/education guidance.
For off-topic (movies, sports, coding, jokes): "I'm your ${collegeName} specialist! 🎓 Ask me about fees, courses, placements, or admissions!"

📌 LANGUAGE: ${langInstruction}
📌 TONE: ${toneInstruction}

📌 FORMAT:
- **Bold** all key numbers (fees ₹, packages ₹/LPA, cutoff ranks)
- Use tables for fee breakdowns, multi-field comparisons
- Numbered steps for processes
- End with 2 smart follow-up suggestions in the same language`;

  window.CC_CONVERSATION.push({ role: 'user', content: userMessage });
  const recentMsgs = window.CC_CONVERSATION.slice(-12);

  const resp = await callGemini({
    system,
    messages: recentMsgs,
    useSearch: true, // ALWAYS ON — ensures latest data every time
    maxTokens: 2000,
  });

  window.CC_CONVERSATION.push({ role: 'assistant', content: resp });
  return resp;
}

/* ── PHASE MANAGEMENT ────────────────────────────────── */
function setPhase(p) {
  window.CC_PHASE = p;
  document.querySelectorAll('.phase-item').forEach(el => {
    const ph = parseInt(el.dataset.phase);
    el.classList.remove('active', 'done');
    if (ph < p) el.classList.add('done');
    else if (ph === p) el.classList.add('active');
  });
  const inp = document.getElementById('userInput');
  const placeholders = {
    1: 'Enter any college or university name to search...',
    2: 'Click a college card to select it...',
    3: 'Crawling & deep-scraping... please wait',
    4: 'Ask anything — fees, placements, admissions, courses... 🎓',
  };
  inp.placeholder = placeholders[p] || '';
  inp.disabled = p === 3;
  const statusMap = {
    1: 'Ready — Enter a college name',
    2: 'Select a college from results',
    3: 'Deep crawling: Jina + Browse AI...',
    4: '🔍 Zero-Neglect Agent — real answers, always!',
  };
  document.getElementById('agentStatus').textContent = statusMap[p] || '';

  const newSearchBtn = document.getElementById('newSearchBtn');
  if (newSearchBtn) newSearchBtn.style.display = (p === 4) ? 'block' : 'none';
}

function updateSidebarCollege(college, data) {
  const panel = document.getElementById('collegeInfoPanel');
  panel.style.display = 'block';
  document.getElementById('badgeName').textContent = data?.collegeName || college.name;
  document.getElementById('badgeLocation').textContent = college.location || data?.location?.city || '';
  document.getElementById('badgeLink').href = college.url || '#';
}

function logMessage(role, text) {
  window.CC_CHAT_LOG.push({
    role, text,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });
}

/* ── RESET ───────────────────────────────────────────── */
function resetAgent() {
  if (!confirm('Start a new session? Conversation will be cleared.')) return;
  startNewCollegeSearch();
}

window.startNewCollegeSearch = function(clearAll = true) {
  window.CC_PHASE = 1;
  window.CC_SELECTED_COLLEGE = null;
  window.CC_COLLEGE_DATA = null;
  window.CC_CONVERSATION = [];
  window.CC_CHAT_LOG = [];
  window.CC_FOUND_COLLEGES = [];
  window.CC_DETECTED_LANG = 'English';
  window.CC_CRAWL_RAW = {};
  window.CC_TOPIC_CACHE = {};
  if (clearAll) document.getElementById('chatWindow').innerHTML = '';
  document.getElementById('collegeInfoPanel').style.display = 'none';
  setPhase(1);
  if (clearAll) renderIntro();
  const inp = document.getElementById('userInput');
  if (inp) { inp.value = ''; inp.disabled = false; inp.focus(); }
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

document.addEventListener('DOMContentLoaded', () => {
  if (!getGeminiKey()) setTimeout(showApiKeyPrompt, 800);
});
