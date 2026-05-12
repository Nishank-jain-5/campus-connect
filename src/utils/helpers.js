/* ═══════════════════════════════════════════════════════
   CAMPUS CONNECT — Helper Utilities
   ═══════════════════════════════════════════════════════ */

/* ── PARSE JSON SAFELY ─────────────────────────────── */
function parseJSON(text) {
  if (!text) return null;
  try {
    const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(clean.slice(start, end + 1));
    }
  } catch (e) {
    console.warn('JSON parse failed:', e.message);
  }
  return null;
}

/* ── AUTO RESIZE TEXTAREA ──────────────────────────── */
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

/* ── SCROLL TO BOTTOM ──────────────────────────────── */
function scrollBottom(smooth = true) {
  const cw = document.getElementById('chatWindow');
  setTimeout(() => {
    cw.scrollTo({ top: cw.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, 60);
}

/* ── HANDLE ENTER KEY ──────────────────────────────── */
function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

/* ── USE HINT CHIP ─────────────────────────────────── */
function useHint(el) {
  const text = el.textContent.replace(/^[^\s]+\s/, ''); // strip emoji
  document.getElementById('userInput').value = text;
  document.getElementById('userInput').focus();
  autoResize(document.getElementById('userInput'));
}

/* ── TOGGLE SIDEBAR ────────────────────────────────── */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const isOpen = sidebar.classList.toggle('open');
  overlay.classList.toggle('show', isOpen);
  document.body.classList.toggle('sidebar-open', isOpen);
  if (isOpen) {
    overlay.onclick = () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
      document.body.classList.remove('sidebar-open');
      overlay.onclick = closeModal;
    };
  }
}

/* ── CLOSE MODAL ────────────────────────────────────── */
function closeModal() {
  document.getElementById('overlay').classList.remove('show');
  document.getElementById('chartModal')?.classList.remove('show');
  document.getElementById('sidebar')?.classList.remove('open');
  document.body.classList.remove('sidebar-open');
  document.getElementById('overlay').onclick = closeModal;
}

/* ── LANG NAME MAP ──────────────────────────────────── */
function getLangName(code) {
  const map = {
    en:'English', hi:'Hindi', es:'Spanish', fr:'French',
    de:'German', zh:'Chinese', ar:'Arabic', ja:'Japanese'
  };
  return map[code] || 'English';
}

function getLangCode(code) {
  const map = {
    hi:'hi-IN', es:'es-ES', fr:'fr-FR', de:'de-DE',
    zh:'zh-CN', ar:'ar-SA', ja:'ja-JP'
  };
  return map[code] || 'en-US';
}

/* ── SANITIZE HTML ──────────────────────────────────── */
function sanitizeText(str) {
  return (str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ── STRIP HTML ─────────────────────────────────────── */
function stripHTML(str) {
  return (str || '').replace(/<[^>]+>/g, '').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
}

/* ── QUICK SEARCH (global) ──────────────────────────── */
function quickSearch(name) {
  const inp = document.getElementById('userInput');
  inp.value = name;
  autoResize(inp);
  sendMessage();
  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');
}

/* ── CHANGE LANG ────────────────────────────────────── */
function changeLang() {
  const val = document.getElementById('langSelect').value;
  window.CC_LANG = val;
  /* 'en' = no override; any other value forces reply language */
  window.CC_LANG_OVERRIDE = (val !== 'en') ? val : null;

  // FIX 2: updateVoiceLang syncs ALL recognition and TTS instances
  if (typeof window.updateVoiceLang === 'function') {
    window.updateVoiceLang(val);
  } else {
    // Fallback: direct update
    if (window.CC_RECOGNITION) {
      const langMap = {
        en:'en-US', hi:'hi-IN', es:'es-ES', fr:'fr-FR', de:'de-DE',
        zh:'zh-CN', ar:'ar-SA', ja:'ja-JP', pt:'pt-BR', ko:'ko-KR',
        it:'it-IT', ta:'ta-IN', te:'te-IN', bn:'bn-IN', ml:'ml-IN', mr:'mr-IN'
      };
      window.CC_RECOGNITION.lang = langMap[val] || 'en-US';
    }
  }

  /* Visual feedback */
  const sel = document.getElementById('langSelect');
  if (sel) {
    sel.style.transition = 'box-shadow 0.3s';
    sel.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.5)';
    setTimeout(() => { sel.style.boxShadow = ''; }, 800);
  }
}
