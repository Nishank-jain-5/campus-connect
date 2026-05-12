/* ═══════════════════════════════════════════════════════
   CAMPUS CONNECT — Main Controller
   Orchestrates all phases and user interactions
   ═══════════════════════════════════════════════════════ */

/* ── INITIALIZATION ───────────────────────────────────── */
window.addEventListener('DOMContentLoaded', function() {
  renderIntro();
  setPhase(1);
  window.CC_LANG = 'en';
  setTimeout(function() {
    const inp = document.getElementById('userInput');
    if (inp) inp.focus();
  }, 400);

  document.getElementById('overlay').addEventListener('click', function() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
    closeModal();
  });
});

/* ══════════════════════════════════════════════════════
   MAIN SEND HANDLER
   ══════════════════════════════════════════════════════ */
window.sendMessage = async function() {
  const input = document.getElementById('userInput');
  const text = input.value.trim();
  const hasAttachment = !!window._mainAttachedFile;

  // Require either text OR an attachment
  if (!text && !hasAttachment) return;

  setSendBusy(true);
  input.value = '';
  autoResize(input);

  // Show user message with attachment info
  if (hasAttachment) {
    const att = window._mainAttachedFile;
    const icon = att.type === 'image' ? '🖼️' : att.type === 'pdf' ? '📄' : '📝';
    const label = text
      ? `${text}<br><span style="font-size:0.78rem;opacity:0.7;">${icon} ${att.name}</span>`
      : `${icon} <em>${att.name}</em>`;
    appendUserMsg(label);
  } else {
    appendUserMsg(text);
  }

  try {
    // ── File attachment path ──
    if (hasAttachment) {
      const typingEl = showTyping('typing');
      try {
        const resp = await window.analyzeAttachedFile(text || null);
        removeEl(typingEl);
        if (resp) {
          appendBotMarkdown(resp);
          if (window.CC_SPEAKING_ENABLED && resp) {
            const plain = resp.replace(/[*_#`]/g,'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim().substring(0,700);
            if (plain) setTimeout(function(){ window.speak(plain, window.CC_LANG||'en'); }, 1000);
          }
        } else {
          appendBotMsg('<p>⚠️ Could not analyze the file. Please try again.</p>');
        }
      } catch(err) {
        removeEl(typingEl);
        appendBotMsg('<p>⚠️ File analysis error: ' + sanitizeText(err.message || 'Please try again.') + '</p>');
      }
      window.clearMainAttachment();
      setSendBusy(false);
      return;
    }

    // ── Normal text path ──
    switch (window.CC_PHASE) {
      case 1: await handleSearch(text); break;
      case 2: await handleCollegeSelection(text); break;
      case 4: await handleChat(text); break;
      default: break;
    }
  } catch (err) {
    console.error('Send error:', err);
    removeEl('typing');
    removeEl('crawlRow');
    appendBotMsg('<p>⚠️ <strong>Something went wrong.</strong> ' + sanitizeText(err.message || 'Please try again.') + '</p>');
  }

  setSendBusy(false);
};

/* ── BUSY STATE ───────────────────────────────────────── */
function setSendBusy(busy) {
  const btn = document.getElementById('sendBtn');
  const inp = document.getElementById('userInput');
  btn.disabled = busy;
  inp.disabled = busy || window.CC_PHASE === 3;
}

/* ══════════════════════════════════════════════════════
   PHASE 1 — SEARCH
   ══════════════════════════════════════════════════════ */
async function handleSearch(query) {
  const t = showTyping('typing');
  const result = await agentSearch(query);
  removeEl(t);

  if (!result || !result.colleges || result.colleges.length === 0) {
    appendBotMsg('<p>🔍 I couldn\'t find a college named <strong>' + sanitizeText(query) + '</strong>.</p><p style="margin-top:8px;">Try using the full official name.</p>');
    return;
  }

  const colleges = result.colleges;
  window.CC_FOUND_COLLEGES = colleges;

  if (colleges.length === 1) {
    appendBotMsg('<p>✅ Found <strong>' + sanitizeText(colleges[0].name) + '</strong>! Let me analyze it...</p>');
    await startCrawl(colleges[0]);
  } else {
    renderCollegeResults(colleges, result.message);
    setPhase(2);
  }
}

/* ══════════════════════════════════════════════════════
   PHASE 2 — SELECT COLLEGE
   ══════════════════════════════════════════════════════ */
window.CC_selectCollege = async function(idx) {
  const college = window.CC_FOUND_COLLEGES[idx];
  if (!college) return;
  appendUserMsg('I want to know about: ' + college.name);
  setPhase(3);
  await startCrawl(college);
};

async function handleCollegeSelection(text) {
  const colleges = window.CC_FOUND_COLLEGES || [];
  const num = parseInt(text.trim(), 10);
  if (!isNaN(num) && colleges[num - 1]) {
    await startCrawl(colleges[num - 1]);
    return;
  }
  const match = colleges.find(function(c) {
    return c.name.toLowerCase().includes(text.toLowerCase()) || text.toLowerCase().includes(c.name.toLowerCase().split(' ')[0]);
  });
  if (match) {
    await startCrawl(match);
  } else {
    appendBotMsg('<p>Please click a college card or type the number (1, 2, etc.).</p>');
  }
}

/* ══════════════════════════════════════════════════════
   PHASE 3 — CRAWL & ANALYZE
   ══════════════════════════════════════════════════════ */
async function startCrawl(college) {
  window.CC_SELECTED_COLLEGE = college;
  setPhase(3);

  const crawlRow = renderCrawlingCard(college);
  scrollBottom();

  let progressInterval;
  let pct = 5;
  progressInterval = setInterval(function() {
    pct = Math.min(pct + Math.random() * 5, 90);
    const fill = document.getElementById('crawlFill');
    if (fill) fill.style.width = pct.toFixed(0) + '%';
    else clearInterval(progressInterval);
  }, 800);

  try {
    const data = await agentCrawl(college, function(step, total, label) {
      updateCrawlProgress(step, total, label);
    });

    clearInterval(progressInterval);
    const fill = document.getElementById('crawlFill');
    if (fill) { fill.style.width = '100%'; fill.style.background = 'var(--green)'; }
    const statusEl = document.getElementById('crawlStatus');
    if (statusEl) statusEl.textContent = '✅ Analysis complete!';
    await sleep(600);
    removeEl(crawlRow);

    if (data) {
      window.CC_COLLEGE_DATA = data;
      updateSidebarCollege(college, data);
      renderCollegeProfile(data, college);
    } else {
      window.CC_COLLEGE_DATA = { collegeName: college.name, url: college.url };
      updateSidebarCollege(college, null);
      appendBotMsg('<p>✅ I have info about <strong>' + sanitizeText(college.name) + '</strong>. Ask me anything!</p>');
    }
    setPhase(4);

  } catch (err) {
    clearInterval(progressInterval);
    removeEl(crawlRow);
    console.error('Crawl error:', err);
    window.CC_COLLEGE_DATA = { collegeName: college.name, url: college.url };
    updateSidebarCollege(college, null);
    appendBotMsg('<p>ℹ️ Limited data for <strong>' + sanitizeText(college.name) + '</strong>, but I can still help! Ask me anything.</p>');
    setPhase(4);
  }
}

/* ══════════════════════════════════════════════════════
   PHASE 4 — CHAT
   ══════════════════════════════════════════════════════ */
async function handleChat(userMessage) {
  // Quick check for new college search
  const quickNewSearch = /^(search|find|look up|tell me about|what about|ek aur|dusra|naya)\s+.{3,}/i.test(userMessage);
  if (quickNewSearch) {
    const newQuery = userMessage.replace(/^(search|find|look up|tell me about|what about|ek aur|dusra|naya)\s+/i, '').trim();
    if (newQuery.length > 2) {
      await _doNewCollegeSearch(newQuery);
      return;
    }
  }

  // Intent classification
  const typingEl = showTyping('typing');
  let intent = { intent: 'qa', newQuery: null };
  try {
    intent = await window.CC_classifyIntent(userMessage);
  } catch(e) {}

  if (intent.intent === 'new_search' && intent.newQuery) {
    removeEl(typingEl);
    await _doNewCollegeSearch(intent.newQuery);
    return;
  }

  if (intent.intent === 'greeting') {
    removeEl(typingEl);
    const collegeName = window.CC_COLLEGE_DATA?.collegeName || window.CC_SELECTED_COLLEGE?.name || 'this college';
    const detectedLang = window.CC_DETECTED_LANG || 'English';
    const greetings = {
      Hindi:    'नमस्ते! 👋 मैं ' + collegeName + ' के बारे में आपकी मदद कर सकता हूँ।',
      Hinglish: 'Hey! 👋 Main ' + collegeName + ' ke baare mein aapki help kar sakta hoon!',
      Tamil:    'வணக்கம்! 👋 நான் ' + collegeName + ' பற்றி உங்களுக்கு உதவலாம்!'
    };
    const greet = greetings[detectedLang] || 'Hey there! 👋 I\'m here to help with **' + collegeName + '**. Ask me about fees, admissions, placements, or courses!';
    appendBotMarkdown(greet);
    return;
  }

  // Answer the question
  const resp = await agentAnswer(userMessage);
  removeEl(typingEl);

  const suggestions = buildSmartSuggestions(userMessage, resp);
  appendBotMarkdown(resp, suggestions);

  // FIX 2: TTS always uses the current CC_LANG (from dropdown)
  if (window.CC_SPEAKING_ENABLED && resp) {
    const plainText = resp.replace(/[*_#`]/g, '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().substring(0, 700);
    if (plainText.trim()) {
      const langCode = window.CC_LANG || 'en'; // always from global dropdown
      setTimeout(function() { window.speak(plainText, langCode); }, 1000);
    }
  }
}

/* ── SMART SUGGESTIONS ────────────────────────────────── */
function buildSmartSuggestions(question, answer) {
  const q = question.toLowerCase();
  const allSuggestions = [
    { trigger: ['admission', 'apply'], q: 'What documents are required?' },
    { trigger: ['fee', 'cost'], q: 'Scholarships available?' },
    { trigger: ['course', 'program'], q: 'Career prospects?' },
    { trigger: ['placement', 'job'], q: 'Average salary package?' },
    { trigger: ['hostel', 'campus'], q: 'Hostel facilities?' },
    { trigger: ['rank', 'ranking'], q: 'Compare with similar colleges?' }
  ];

  return allSuggestions
    .filter(function(s) { return !s.trigger.some(function(t) { return q.includes(t); }); })
    .slice(0, 2)
    .map(function(s) { return s.q; });
}

async function _doNewCollegeSearch(newQuery) {
  appendBotMsg('<p>🔍 Searching for <strong>' + sanitizeText(newQuery) + '</strong>...</p>');
  await sleep(300);
  window.CC_PHASE = 1;
  window.CC_SELECTED_COLLEGE = null;
  window.CC_COLLEGE_DATA = null;
  window.CC_CONVERSATION = [];
  window.CC_FOUND_COLLEGES = [];
  document.getElementById('collegeInfoPanel').style.display = 'none';
  setPhase(1);
  await handleSearch(newQuery);
}

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

/* ══════════════════════════════════════════════════════
   GLOBAL AI MODE (Main Chat)
   Lets users ask any topic without college context
   ══════════════════════════════════════════════════════ */
window.CC_GLOBAL_MODE = false;

window.toggleGlobalMode = function() {
  // FIX 3: Clear chat window and conversation when switching modes
  const wasGlobal = window.CC_GLOBAL_MODE;
  window.CC_GLOBAL_MODE = !window.CC_GLOBAL_MODE;

  // Stop any ongoing speech
  if (typeof window.stopSpeaking === 'function') window.stopSpeaking();

  // Clear chat history for clean session
  const chatWin = document.getElementById('chatWindow');
  if (chatWin) chatWin.innerHTML = '';
  window.CC_CONVERSATION = [];

  const btn = document.getElementById('globalModeBtn');
  if (btn) {
    if (window.CC_GLOBAL_MODE) {
      btn.style.background = 'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(91,33,182,0.2))';
      btn.style.borderColor = 'rgba(124,58,237,0.6)';
      btn.style.color = '#a78bfa';
      btn.title = 'Global AI Mode ON — ask anything! Click to switch back';
      btn.querySelector('span').textContent = '🌐 Global Mode ON';
      appendBotMarkdown('🌐 **Global AI Mode activated! New session started.**\n\nYou can now ask me anything — science, technology, coding, history, math, general knowledge, and more. Previous chat cleared for a clean start.\n\n*Switch back to College Mode by clicking the button again.*');
    } else {
      btn.style.background = '';
      btn.style.borderColor = '';
      btn.style.color = '';
      btn.title = 'Click to enable Global AI Mode — ask anything like ChatGPT';
      btn.querySelector('span').textContent = '🌐 Global Mode';
      const collegeName = window.CC_COLLEGE_DATA?.collegeName || window.CC_SELECTED_COLLEGE?.name || 'the college';
      appendBotMarkdown('🏛️ **College Mode restored! New session started.**\n\nI\'m now focused on **' + collegeName + '** again. Previous chat cleared. Ask me anything about this college.');
    }
  }
};

// Override handleChat to support global mode
const _originalHandleChat = window._originalHandleChat || null;

/* Patch sendMessage to support global mode in phase 1 too */
const _origSendMessage = window.sendMessage;
window.sendMessage = async function() {
  const input = document.getElementById('userInput');
  const text = input ? input.value.trim() : '';
  const hasAttachment = !!window._mainAttachedFile;

  if (!text && !hasAttachment) return;

  // If global mode is ON and we're in phase 1 (no college selected), answer directly
  if (window.CC_GLOBAL_MODE && window.CC_PHASE === 1) {
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) sendBtn.disabled = true;
    input.value = '';
    if (typeof autoResize === 'function') autoResize(input);

    if (hasAttachment) {
      const att = window._mainAttachedFile;
      const icon = att.type === 'image' ? '🖼️' : att.type === 'pdf' ? '📄' : '📝';
      const label = text
        ? `${text}<br><span style="font-size:0.78rem;opacity:0.7;">${icon} ${att.name}</span>`
        : `${icon} <em>${att.name}</em>`;
      appendUserMsg(label);
    } else {
      appendUserMsg(text);
    }

    const typingEl = showTyping('typing');
    try {
      let resp;
      if (hasAttachment) {
        resp = await window.analyzeAttachedFile(text || null);
        window.clearMainAttachment();
      } else {
        resp = await window.sendGlobalAIQuery(text);
      }
      removeEl(typingEl);
      appendBotMarkdown(resp);
      if (window.CC_SPEAKING_ENABLED && resp) {
        const plain = resp.replace(/[*_#`]/g,'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim().substring(0,700);
        if (plain) setTimeout(function(){ window.speak(plain, window.CC_LANG||'en'); }, 1000);
      }
    } catch(err) {
      removeEl(typingEl);
      appendBotMsg('<p>⚠️ Error: ' + (err.message || 'Please try again.') + '</p>');
      window.clearMainAttachment();
    }
    if (sendBtn) sendBtn.disabled = false;
    return;
  }

  // Default behaviour
  return _origSendMessage.apply(this, arguments);
};
