/* ═══════════════════════════════════════════════════════
   CAMPUS CONNECT — UI Rendering Components
   All DOM building functions
   ═══════════════════════════════════════════════════════ */

/* ── RENDER INTRO ─────────────────────────────────────── */
function renderIntro() {
  const cw = document.getElementById('chatWindow');
  const div = document.createElement('div');
  div.className = 'intro-card';
  div.innerHTML = `
    <div class="intro-glow"></div>
    <div class="intro-icon">🎓</div>
    <h2>Welcome to <span>Campus Connect</span></h2>
    <p>Your intelligent AI college research companion. Find, analyze, and explore colleges worldwide — admissions, fees, courses, rankings, placements, and more.</p>
    <div class="feature-grid">
      <div class="feature-item"><span class="fi-icon">🔍</span> Smart College Search</div>
      <div class="feature-item"><span class="fi-icon">🕸️</span> Deep Website Analysis</div>
      <div class="feature-item"><span class="fi-icon">📊</span> Visual Data Charts</div>
      <div class="feature-item"><span class="fi-icon">🤖</span> AI-Powered Q&amp;A</div>
      <div class="feature-item"><span class="fi-icon">🎤</span> Voice Input</div>
      <div class="feature-item"><span class="fi-icon">🎙️</span> Voice Mode</div>
      <div class="feature-item"><span class="fi-icon">🌐</span> Multi-Language</div>
      <div class="feature-item"><span class="fi-icon">📄</span> PDF Export</div>
    </div>
    <div style="background:linear-gradient(135deg,rgba(124,58,237,0.12),rgba(59,130,246,0.08));border:1px solid rgba(124,58,237,0.25);border-radius:12px;padding:14px 16px;margin-bottom:18px;text-align:left;">
      <div style="font-size:12px;font-weight:600;color:#a78bfa;margin-bottom:8px;">🎙️ Try Voice Mode!</div>
      <p style="font-size:12px;color:var(--text2);margin:0;line-height:1.6;">Click the <strong style="color:#a78bfa;">purple "Voice Mode"</strong> button in the top bar for a full voice experience with AI speech!</p>
    </div>
    <button class="intro-cta" onclick="document.getElementById('userInput').focus()">
      🚀 Start — Type any college name
    </button>
  `;
  cw.appendChild(div);
  scrollBottom(false);
}

/* ── APPEND USER MESSAGE ──────────────────────────────── */
function appendUserMsg(text) {
  const cw = document.getElementById('chatWindow');
  const row = document.createElement('div');
  row.className = 'msg-row user';
  row.innerHTML = `
    <div class="msg-avatar user">👤</div>
    <div class="msg-body">
      <div class="msg-bubble user">${sanitizeText(text)}</div>
    </div>
  `;
  cw.appendChild(row);
  scrollBottom();
  logMessage('user', text);
}

/* ── SHOW TYPING INDICATOR ────────────────────────────── */
function showTyping(id = 'typing') {
  const cw = document.getElementById('chatWindow');
  const row = document.createElement('div');
  row.className = 'msg-row bot';
  row.id = id;
  row.innerHTML = `
    <div class="msg-avatar bot">🎓</div>
    <div class="msg-body">
      <div class="typing-bubble">
        <div class="t-dot"></div>
        <div class="t-dot"></div>
        <div class="t-dot"></div>
      </div>
    </div>
  `;
  cw.appendChild(row);
  scrollBottom();
  return row;
}

/* ── REMOVE ELEMENT ───────────────────────────────────── */
function removeEl(idOrEl) {
  const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
  if (el) el.remove();
}

/* ── BOT MESSAGE (plain text or HTML) ────────────────── */
function appendBotMsg(html, suggestions = [], plainText = '') {
  const cw = document.getElementById('chatWindow');
  const row = document.createElement('div');
  row.className = 'msg-row bot';

  // Generate unique ID for this message's play button
  const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

  const suggestHtml = suggestions.length ? `
    <div class="suggest-row">
      ${suggestions.map(s => `<button class="suggest-chip" onclick="useSuggestion('${s.replace(/'/g, "&#39;")}')">${s}</button>`).join('')}
    </div>
  ` : '';

  row.innerHTML = `
    <div class="msg-avatar bot">🎓</div>
    <div class="msg-body">
      <div class="msg-bubble bot">${html}</div>
      <div class="msg-listen-row">
        <button class="msg-listen-icon-btn" onclick="playMessageText('${msgId}')" title="Listen to this message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          </svg>
          🔊 Listen
        </button>
      </div>
      ${suggestHtml}
    </div>
  `;

  // Store plain text for playback
  if (plainText) {
    window[msgId + '_text'] = plainText;
  } else {
    // Extract text from HTML for playback
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    window[msgId + '_text'] = tempDiv.textContent || tempDiv.innerText || html.replace(/<[^>]+>/g, ' ');
  }

  cw.appendChild(row);
  scrollBottom();
  logMessage('bot', html);
  return row;
}

/* ── Play specific message text ── */
window.playMessageText = function(msgId) {
  const text = window[msgId + '_text'];
  if (text && typeof window.speakText === 'function') {
    window.speakText(text);
  }
};

/* ── BOT MARKDOWN RESPONSE ────────────────────────────── */
function appendBotMarkdown(text, suggestions = []) {
  const html = typeof marked !== 'undefined'
    ? marked.parse(text || '')
    : text.replace(/\n/g, '<br>');
  appendBotMsg(html, suggestions, text);
}

/* ── USE SUGGESTION ───────────────────────────────────── */
window.useSuggestion = function(text) {
  const inp = document.getElementById('userInput');
  inp.value = text;
  autoResize(inp);
  sendMessage();
};

/* ── SHOW COLLEGE RESULTS ─────────────────────────────── */
function renderCollegeResults(colleges, message) {
  const cw = document.getElementById('chatWindow');
  const row = document.createElement('div');
  row.className = 'msg-row bot';

  const cards = colleges.map((c, i) => `
    <div class="college-result-card" onclick="window.CC_selectCollege(${i})">
      <div class="crc-icon">🏛️</div>
      <div class="crc-info">
        <div class="crc-name">${sanitizeText(c.name)}</div>
        <div class="crc-meta">
          ${c.location ? `<span>📍 ${sanitizeText(c.location)}</span>` : ''}
          ${c.type ? `<span>🏫 ${sanitizeText(c.type)}</span>` : ''}
          ${c.established ? `<span>📅 Est. ${sanitizeText(c.established)}</span>` : ''}
          ${c.knownFor ? `<span>⭐ ${sanitizeText(c.knownFor)}</span>` : ''}
        </div>
        <div class="crc-url">${sanitizeText(c.url)}</div>
      </div>
      <span class="crc-arrow">›</span>
    </div>
  `).join('');

  row.innerHTML = `
    <div class="msg-avatar bot">🎓</div>
    <div class="msg-body">
      <div class="msg-bubble bot">
        <p>${sanitizeText(message || 'I found multiple colleges. Please select the one you mean:')}</p>
        <div class="college-results" style="margin-top:10px;">${cards}</div>
      </div>
    </div>
  `;
  cw.appendChild(row);
  scrollBottom();
  logMessage('bot', message + '\n' + colleges.map(c => c.name + ' — ' + c.url).join('\n'));
}

/* ── CRAWLING PROGRESS UI ─────────────────────────────── */
function renderCrawlingCard(college) {
  const cw = document.getElementById('chatWindow');
  const row = document.createElement('div');
  row.className = 'msg-row bot';
  row.id = 'crawlRow';

  row.innerHTML = `
    <div class="msg-avatar bot">🎓</div>
    <div class="msg-body">
      <div class="msg-bubble bot">
        <div class="crawl-card">
          <div class="crawl-title">🔍 Analyzing <strong>${sanitizeText(college.name)}</strong>...</div>
          <div class="crawl-steps" id="crawlSteps">
            <div class="crawl-step active" id="cstep-0">
              <div class="crawl-step-icon"><span class="spin">⚙</span></div>
              <span>Fetching official website data...</span>
            </div>
          </div>
          <div class="progress-track"><div class="progress-fill" id="crawlFill" style="width:5%"></div></div>
          <div style="margin-top:10px;font-size:11px;color:var(--text3);" id="crawlStatus">Initializing deep analysis...</div>
        </div>
      </div>
    </div>
  `;
  cw.appendChild(row);
  scrollBottom();
  return row;
}

/* ── UPDATE CRAWL PROGRESS ────────────────────────────── */
function updateCrawlProgress(step, total, label) {
  const pct = Math.round((step / total) * 100);
  const fill = document.getElementById('crawlFill');
  const status = document.getElementById('crawlStatus');
  const stepsContainer = document.getElementById('crawlSteps');

  if (fill) fill.style.width = pct + '%';
  if (status) status.textContent = label;

  if (stepsContainer) {
    // Mark previous as done
    const prev = stepsContainer.querySelector('.active');
    if (prev) {
      prev.classList.remove('active');
      prev.classList.add('done');
      prev.querySelector('.crawl-step-icon').innerHTML = '✓';
    }
    // Add new step
    const s = document.createElement('div');
    s.className = 'crawl-step active';
    s.id = 'cstep-' + step;
    s.innerHTML = `<div class="crawl-step-icon"><span class="spin">⚙</span></div><span>${sanitizeText(label)}</span>`;
    stepsContainer.appendChild(s);
    scrollBottom();
  }
}

/* ── RENDER COLLEGE PROFILE ───────────────────────────── */
function renderCollegeProfile(data, college) {
  const cw = document.getElementById('chatWindow');
  const row = document.createElement('div');
  row.className = 'msg-row bot';

  // Stats
  const stats = data.stats || {};
  const ranking = stats.ranking || {};
  const statsItems = [
    { val: stats.established || '—', lbl: 'Est.' },
    { val: stats.students || '—', lbl: 'Students' },
    { val: ranking.national || ranking.world || ranking.nirf || '—', lbl: 'Rank' },
    { val: stats.acceptanceRate || '—', lbl: 'Acceptance' },
    { val: stats.campusSize || '—', lbl: 'Campus Size' },
    { val: stats.faculty || '—', lbl: 'Faculty' },
  ].filter(s => s.val !== '—');

  const statsHTML = statsItems.length ? `
    <div class="stats-grid">
      ${statsItems.map(s => `
        <div class="stat-card">
          <span class="stat-val">${sanitizeText(String(s.val))}</span>
          <span class="stat-lbl">${s.lbl}</span>
        </div>
      `).join('')}
    </div>
  ` : '';

  // Fees section
  const fees = data.fees || {};
  const feesHTML = (fees.undergraduate || fees.postgraduate) ? `
    <div class="info-section">
      <div class="info-section-title">💰 FEE STRUCTURE</div>
      ${fees.undergraduate ? `<div class="info-row"><span class="info-key">Undergraduate</span><span class="info-val">${sanitizeText(fees.undergraduate)}</span></div>` : ''}
      ${fees.postgraduate ? `<div class="info-row"><span class="info-key">Postgraduate</span><span class="info-val">${sanitizeText(fees.postgraduate)}</span></div>` : ''}
      ${fees.phd ? `<div class="info-row"><span class="info-key">PhD</span><span class="info-val">${sanitizeText(fees.phd)}</span></div>` : ''}
      ${fees.hostel ? `<div class="info-row"><span class="info-key">Hostel</span><span class="info-val">${sanitizeText(fees.hostel)}</span></div>` : ''}
      ${fees.scholarships ? `<div class="info-row"><span class="info-key">Scholarships</span><span class="info-val" style="color:var(--green)">${sanitizeText(fees.scholarships)}</span></div>` : ''}
    </div>
  ` : '';

  // Placement section
  const placement = data.placement || {};
  const placementHTML = placement.rate ? `
    <div class="info-section">
      <div class="info-section-title">💼 PLACEMENT & CAREERS</div>
      ${placement.rate ? `<div class="info-row"><span class="info-key">Placement Rate</span><span class="info-val" style="color:var(--green)">${sanitizeText(placement.rate)}</span></div>` : ''}
      ${placement.avgPackage ? `<div class="info-row"><span class="info-key">Avg Package</span><span class="info-val">${sanitizeText(placement.avgPackage)}</span></div>` : ''}
      ${placement.highestPackage ? `<div class="info-row"><span class="info-key">Highest Package</span><span class="info-val">${sanitizeText(placement.highestPackage)}</span></div>` : ''}
      ${placement.topRecruiters?.length ? `<div class="info-row"><span class="info-key">Top Recruiters</span><span class="info-val">${sanitizeText(placement.topRecruiters.slice(0,5).join(', '))}</span></div>` : ''}
    </div>
  ` : '';

  // Courses
  const courses = data.courses || {};
  const allCourses = [
    ...(courses.undergraduate || []),
    ...(courses.postgraduate || []),
  ].slice(0, 16);
  const coursesHTML = allCourses.length ? `
    <div class="info-section">
      <div class="info-section-title">📚 KEY PROGRAMS</div>
      <div class="courses-grid">
        ${allCourses.map(c => `<span class="course-tag">${sanitizeText(c)}</span>`).join('')}
      </div>
    </div>
  ` : '';

  // Highlights
  const highlights = data.highlights || [];
  const highlightsHTML = highlights.length ? `
    <div class="highlights-list">
      ${highlights.map(h => `<div class="highlight-item"><div class="highlight-dot"></div><span>${sanitizeText(h)}</span></div>`).join('')}
    </div>
  ` : '';

  // Links
  const links = data.links || [];
  const linksHTML = links.length ? `
    <div class="link-list">
      ${links.map(l => `
        <a class="link-item" href="${sanitizeText(l.url)}" target="_blank" rel="noopener">
          <span class="link-icon">${l.icon || '🔗'}</span>
          <span class="link-label">${sanitizeText(l.label)}</span>
          <span class="link-arrow">↗</span>
        </a>
      `).join('')}
    </div>
  ` : '';

  // Affiliation
  const affHTML = data.affiliation ? `
    <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;">
      ${data.affiliation.split(',').map(a => `<span class="tag">${sanitizeText(a.trim())}</span>`).join('')}
    </div>
  ` : '';

  // Chart (unique ID)
  const chartId = 'feeChart_' + Date.now();

  row.innerHTML = `
    <div class="msg-avatar bot">🎓</div>
    <div class="msg-body" style="max-width:100%">
      <div class="msg-bubble bot">
        <div class="profile-header">
          <div class="profile-emblem">🏛️</div>
          <div>
            <div class="profile-name">${sanitizeText(data.collegeName || college.name)}</div>
            <div class="profile-tagline">${sanitizeText(data.tagline || '')}</div>
            ${data.location?.city ? `<div style="font-size:11px;color:var(--text3);margin-top:3px;">📍 ${sanitizeText(data.location.city + (data.location.country ? ', ' + data.location.country : ''))}</div>` : ''}
          </div>
        </div>

        <p style="font-size:13px;color:var(--text2);line-height:1.7;margin-bottom:12px;">${sanitizeText(data.overview || '')}</p>

        ${affHTML}
        ${statsHTML}
        ${feesHTML}

        <!-- Fee Chart -->
        ${(fees.undergraduate || fees.postgraduate) ? `
          <div class="chart-card" onclick="expandChart('${chartId}')">
            <div class="chart-card-title">
              <span>📊 Annual Fee Comparison</span>
              <span class="expand-hint">Click to expand</span>
            </div>
            <canvas id="${chartId}" height="160" style="max-height:160px;width:100%;display:block;"></canvas>
          </div>
        ` : ''}

        ${placementHTML}
        ${coursesHTML}

        ${highlights.length ? `
          <div class="info-section" style="margin-top:10px">
            <div class="info-section-title">⭐ KEY HIGHLIGHTS</div>
            ${highlightsHTML}
          </div>
        ` : ''}

        ${data.recentNews ? `
          <div class="info-section" style="margin-top:8px">
            <div class="info-section-title">📰 RECENT NEWS</div>
            <p style="font-size:13px;color:var(--text2);">${sanitizeText(data.recentNews)}</p>
          </div>
        ` : ''}

        ${linksHTML}

        <div class="success-box" style="margin-top:14px">
          ✅ <strong>Deep analysis complete!</strong> I crawled multiple pages from ${sanitizeText(data.collegeName || college.name)}'s website. Ask me anything — or search a new college anytime!
        </div>
      </div>

      <div class="suggest-row" style="flex-wrap:wrap;gap:8px;">
        <button class="suggest-chip" onclick="useSuggestion('What are the admission requirements?')">📝 Admission process</button>
        <button class="suggest-chip" onclick="useSuggestion('Tell me about scholarships and financial aid')">💰 Scholarships</button>
        <button class="suggest-chip" onclick="useSuggestion('What courses or programs are available?')">📚 Courses & programs</button>
        <button class="suggest-chip" onclick="useSuggestion('How is the placement and career support?')">💼 Placements</button>
        <button class="suggest-chip" onclick="useSuggestion('Tell me about campus life and facilities')">🏠 Campus life</button>
        <button class="suggest-chip" onclick="useSuggestion('What is the ranking and reputation of this college?')">🏆 Rankings</button>
        <button class="suggest-chip" style="background:linear-gradient(135deg,rgba(16,185,129,0.18),rgba(5,150,105,0.12));border-color:rgba(16,185,129,0.4);color:#34d399;" onclick="showNewCollegeSearch()">🔍 Search Another College</button>
      </div>
    </div>
  `;

  cw.appendChild(row);
  scrollBottom();
  logMessage('bot', `[College Profile: ${data.collegeName}] Overview: ${data.overview}`);

  // Render chart after DOM paint
  setTimeout(() => {
    const canvas = document.getElementById(chartId);
    if (canvas && fees) renderFeeChart(canvas, fees, chartId);
  }, 300);
}

/* ── SHOW NEW COLLEGE SEARCH ─────────────────────────── */
window.showNewCollegeSearch = function() {
  // Show a modal/overlay for new college search
  if (document.getElementById('newCollegeModal')) return;

  const modal = document.createElement('div');
  modal.id = 'newCollegeModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;font-family:Outfit,sans-serif;';
  modal.innerHTML = `
    <div style="background:linear-gradient(135deg,#0f172a,#1e293b);border:1px solid rgba(52,211,153,0.4);border-radius:20px;padding:32px 36px;max-width:460px;width:90%;box-shadow:0 25px 60px rgba(0,0,0,0.6);color:#e2e8f0;text-align:center;">
      <div style="font-size:2.5rem;margin-bottom:10px;">🔍</div>
      <h2 style="font-size:1.4rem;font-weight:700;color:#34d399;margin:0 0 8px;">Search Another College</h2>
      <p style="font-size:0.88rem;color:#94a3b8;margin:0 0 18px;">Enter the name of any college or university worldwide</p>
      <input id="newCollegeInput" type="text" placeholder="e.g. IIT Delhi, Harvard, Anna University..."
        style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.07);border:1px solid rgba(52,211,153,0.4);border-radius:10px;padding:12px 16px;color:#e2e8f0;font-size:0.95rem;font-family:Outfit,sans-serif;outline:none;margin-bottom:12px;"
        onkeydown="if(event.key==='Enter') doNewCollegeSearch()" />
      <div style="display:flex;gap:10px;">
        <button onclick="document.getElementById('newCollegeModal').remove()"
          style="flex:1;padding:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#94a3b8;font-size:0.9rem;cursor:pointer;font-family:Outfit,sans-serif;">
          Cancel
        </button>
        <button onclick="doNewCollegeSearch()"
          style="flex:2;padding:12px;background:linear-gradient(135deg,#059669,#047857);border:none;border-radius:10px;color:#fff;font-size:1rem;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;">
          Search 🚀
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('newCollegeInput')?.focus(), 100);

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
};

window.doNewCollegeSearch = function() {
  const query = (document.getElementById('newCollegeInput')?.value || '').trim();
  if (!query) { alert('Please enter a college name.'); return; }
  document.getElementById('newCollegeModal')?.remove();

  // Reset agent state
  window.CC_PHASE = 1;
  window.CC_SELECTED_COLLEGE = null;
  window.CC_COLLEGE_DATA = null;
  window.CC_CONVERSATION = [];
  window.CC_FOUND_COLLEGES = [];
  document.getElementById('collegeInfoPanel').style.display = 'none';

  // Put the query in the input and trigger search
  const inp = document.getElementById('userInput');
  if (inp) {
    inp.value = query;
    inp.disabled = false;
  }
  setPhase(1);
  sendMessage();
};
