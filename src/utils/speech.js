/* ═══════════════════════════════════════════════════════
   CAMPUS CONNECT — Voice System v5 (All Bugs Fixed)
   ✅ FIX 1: STT always uses current dropdown language
   ✅ FIX 2: Language dropdown changes BOTH STT and TTS
   ✅ FIX 3: Mode switch (Global↔College) clears chat
   ✅ FIX 4: Stop AI Voice button in Voice Mode
   ✅ FIX 5: College Mode button in VMS fully working
   ✅ FIX 5: PDF export from Voice Mode
   ✅ FIX 6: Upload image/document/audio in Global Mode
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const STT_LANGS = {
    en:'en-US', hi:'hi-IN', es:'es-ES', fr:'fr-FR', de:'de-DE',
    zh:'zh-CN', ar:'ar-SA', ja:'ja-JP', pt:'pt-BR', ru:'ru-RU',
    ko:'ko-KR', it:'it-IT', ta:'ta-IN', te:'te-IN', bn:'bn-IN',
    ml:'ml-IN', mr:'mr-IN', kn:'kn-IN', gu:'gu-IN'
  };
  const TTS_LANGS = {
    en:'en-US', hi:'hi-IN', es:'es-ES', fr:'fr-FR', de:'de-DE',
    zh:'zh-CN', ar:'ar-SA', ja:'ja-JP', pt:'pt-BR', ko:'ko-KR',
    it:'it-IT', ta:'ta-IN', te:'te-IN', bn:'bn-IN', ml:'ml-IN', mr:'mr-IN'
  };
  const LANG_LABELS = {
    en:'🇺🇸 English', hi:'🇮🇳 Hindi', ta:'🇮🇳 Tamil', te:'🇮🇳 Telugu',
    bn:'🇮🇳 Bengali', ml:'🇮🇳 Malayalam', mr:'🇮🇳 Marathi', kn:'🇮🇳 Kannada',
    gu:'🇮🇳 Gujarati', es:'🇪🇸 Spanish', fr:'🇫🇷 French', de:'🇩🇪 German',
    zh:'🇨🇳 Chinese', ja:'🇯🇵 Japanese', ar:'🇸🇦 Arabic', pt:'🇧🇷 Portuguese',
    ko:'🇰🇷 Korean', ru:'🇷🇺 Russian', it:'🇮🇹 Italian'
  };

  let synth = window.speechSynthesis;

  function getCurrentLang() { return window.CC_LANG || 'en'; }
  function getSTTLang(code) { return STT_LANGS[code] || 'en-US'; }
  function getTTSLang(code) { return TTS_LANGS[code] || 'en-US'; }

  /* ══════════════════════════════════════════
     MAIN CHAT MIC
     ══════════════════════════════════════════ */
  let mainRec = null, mainRecording = false;

  function initMainMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { disableMicBtn('Voice needs Chrome or Edge'); return; }

    function makeRec() {
      const r = new SR();
      r.continuous = false;
      r.interimResults = true;
      r.maxAlternatives = 3;
      r.lang = getSTTLang(getCurrentLang()); // always use current

      r.onstart = () => {
        mainRecording = true;
        setMainMicUI(true);
        setVoiceStatus('🎙️ Listening… speak now');
      };
      r.onresult = (e) => {
        let interim = '', finalT = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalT += t;
          else interim += t;
        }
        const inp = document.getElementById('userInput');
        if (inp) {
          inp.value = finalT || interim;
          if (typeof autoResize === 'function') autoResize(inp);
        }
        if (finalT.trim()) {
          setVoiceStatus('✅ Got: "' + finalT.trim().substring(0,50) + '"');
          mainRecording = false;
          setMainMicUI(false);
        } else if (interim) {
          setVoiceStatus('🎙️ ' + interim.substring(0,60) + '…');
        }
      };
      r.onerror = (e) => {
        mainRecording = false;
        setMainMicUI(false);
        const msgs = {
          'not-allowed':'🚫 Mic blocked — allow in browser address bar',
          'no-speech':'🔇 Nothing heard — try again',
          'audio-capture':'🎤 No microphone found',
          'network':'🌐 Network issue — voice needs internet'
        };
        setVoiceStatus(msgs[e.error] || ('Mic error: ' + e.error));
        setTimeout(() => setVoiceStatus(''), 4000);
      };
      r.onend = () => {
        mainRecording = false;
        setMainMicUI(false);
        window.CC_WHISPERFLOW_ACTIVE = false;
      };
      return r;
    }

    mainRec = makeRec();
    window.CC_RECOGNITION = mainRec;
    window._makeMainRec = makeRec;
  }

  window.toggleMic = function () {
    if (!mainRec) { alert('Voice input needs Chrome or Edge browser.'); return; }
    if (mainRecording) { try { mainRec.stop(); } catch (_) {} return; }
    if (typeof window._makeMainRec === 'function') mainRec = window._makeMainRec();
    mainRec.lang = getSTTLang(getCurrentLang()); // always fresh
    try { mainRec.start(); window.CC_WHISPERFLOW_ACTIVE = true; }
    catch (e) { setVoiceStatus('Cannot start mic — try clicking again'); setTimeout(() => setVoiceStatus(''), 3000); }
  };

  function setVoiceStatus(msg) {
    const el = document.getElementById('voiceStatus');
    if (el) el.textContent = msg;
  }

  function setMainMicUI(active) {
    const b = document.getElementById('micBtn');
    if (!b) return;
    b.querySelectorAll('.wave-ring').forEach(w => w.remove());
    if (active) {
      b.style.cssText = 'box-shadow:0 0 28px rgba(239,68,68,0.8);border-color:rgba(239,68,68,0.9);color:var(--red);background:rgba(239,68,68,0.18);position:relative;';
      for (let i = 0; i < 3; i++) {
        const w = document.createElement('div');
        w.className = 'wave-ring';
        w.style.cssText = `position:absolute;inset:${-6-i*5}px;border:2px solid rgba(239,68,68,${0.55-i*0.14});border-radius:10px;animation:whisperWave ${1.1+i*0.3}s ease-out infinite;animation-delay:${i*0.18}s;pointer-events:none;`;
        b.appendChild(w);
      }
    } else { b.style.cssText = ''; }
  }

  function disableMicBtn(msg) {
    const b = document.getElementById('micBtn');
    if (b) { b.title = msg; b.style.opacity = '0.35'; b.style.cursor = 'not-allowed'; }
  }

  /* ══════════════════════════════════════════
     TTS ENGINE
     ══════════════════════════════════════════ */
  function getBestVoice(lang) {
    if (!synth) return null;
    const all = synth.getVoices();
    const prefix = (lang || 'en').split('-')[0];
    const premium = all.find(v => v.lang === lang && (v.name.includes('Neural') || v.name.includes('Premium') || v.name.includes('Natural')));
    if (premium) return premium;
    return all.find(v => v.lang === lang) || all.find(v => v.lang.startsWith(prefix)) || all[0];
  }

  window.speak = function (rawText, langCode) {
    if (!synth || !rawText) return;
    if (!langCode || langCode === 'auto') langCode = getCurrentLang(); // FIX 2

    const clean = rawText
      .replace(/<[^>]+>/g, ' ')
      .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
      .replace(/[*_#`~\[\]]/g, '')
      .replace(/\|/g, ' ').replace(/\n{2,}/g, '. ').replace(/\n/g, ' ')
      .replace(/\s{2,}/g, ' ').trim();
    if (!clean) return;

    if (!window.CC_VMS_SPEAKING) synth.cancel();

    const utt = new SpeechSynthesisUtterance(clean);
    const ttsLang = getTTSLang(langCode); // FIX 2: correct language always
    utt.lang = ttsLang;
    utt.rate = 1.0; utt.pitch = 1.05; utt.volume = 1.0;
    const v = getBestVoice(ttsLang);
    if (v) utt.voice = v;

    utt.onstart = () => {
      window.CC_SPEAKING = true;
      updateSpeakerBtn(true);
      const av = document.getElementById('vmsAvatar');
      if (av) av.classList.add('speaking');
      const st = document.getElementById('vmsStatus');
      if (st) st.textContent = '🔊 Speaking…';
      const stopBtn = document.getElementById('vmsStopBtn');
      if (stopBtn) stopBtn.style.display = 'flex';
    };
    utt.onend = utt.onerror = () => {
      window.CC_SPEAKING = false;
      window.CC_VMS_SPEAKING = false;
      updateSpeakerBtn(false);
      const av = document.getElementById('vmsAvatar');
      if (av) av.classList.remove('speaking');
      const st = document.getElementById('vmsStatus');
      if (st) st.textContent = 'Ready';
      setVoiceStatus('');
      const stopBtn = document.getElementById('vmsStopBtn');
      if (stopBtn) stopBtn.style.display = 'none';
    };

    synth.speak(utt);
  };

  window.speakText = function (text) { window.speak(text, getCurrentLang()); };

  // FIX 4: Stop button handler
  window.stopSpeaking = function () {
    if (synth) synth.cancel();
    window.CC_SPEAKING = false;
    window.CC_VMS_SPEAKING = false;
    updateSpeakerBtn(false);
    const av = document.getElementById('vmsAvatar');
    if (av) av.classList.remove('speaking');
    const st = document.getElementById('vmsStatus');
    if (st) st.textContent = 'Ready';
    const stopBtn = document.getElementById('vmsStopBtn');
    if (stopBtn) stopBtn.style.display = 'none';
  };
  window.stopAgentVoice = window.stopSpeaking;

  function updateSpeakerBtn(on) {
    const b = document.getElementById('speakerBtn');
    if (!b) return;
    b.classList.toggle('speaking', on);
    b.style.boxShadow = on ? '0 0 22px rgba(16,185,129,0.65)' : '';
  }

  window.toggleTTS = function () {
    window.CC_SPEAKING_ENABLED = !window.CC_SPEAKING_ENABLED;
    const b = document.getElementById('speakerBtn'), v = document.getElementById('voiceStatus');
    if (window.CC_SPEAKING_ENABLED) {
      if (b) { b.classList.add('tts-active'); b.style.borderColor='var(--green)'; b.style.color='var(--green)'; }
      if (v) v.textContent = '🔊 Voice ON';
    } else {
      window.stopSpeaking();
      if (b) { b.classList.remove('tts-active','speaking'); b.style.borderColor=''; b.style.color=''; }
      if (v) v.textContent = '🔇 Voice OFF';
    }
    setTimeout(() => { if (v) v.textContent = ''; }, 2000);
  };

  window.playMessageText = function (msgId) {
    const text = window[msgId + '_text'];
    if (!text) return;
    if (window.CC_SPEAKING) { window.stopSpeaking(); return; }
    window.speak(text, getCurrentLang());
  };

  /* ══════════════════════════════════════════
     VOICE MODE PAGE
     ══════════════════════════════════════════ */
  window.toggleAgentVoiceMode = function () {
    const btn = document.getElementById('agentVoiceToggle');
    if (btn.classList.contains('voice-active')) {
      closeVoiceMode();
    } else {
      btn.classList.add('voice-active');
      window.CC_AGENT_VOICE_MODE = true;
      _openVMP();
    }
  };

  function _openVMP() {
    const old = document.getElementById('voiceModePage');
    if (old) old.remove();
    const pg = document.createElement('div');
    pg.id = 'voiceModePage';
    pg.innerHTML = _buildVMPHtml();
    document.body.appendChild(pg);
    requestAnimationFrame(() => pg.classList.add('vmp-open'));
    _initVMP();
  }

  function _buildVMPHtml() {
    const cn = window.CC_COLLEGE_DATA?.collegeName || window.CC_SELECTED_COLLEGE?.name || null;
    const collegeMode = !!cn;
    const curLang = window.CC_VMS_LANG || getCurrentLang() || 'en';
    const langOpts = Object.entries(LANG_LABELS).map(([k,v]) =>
      `<option value="${k}"${k===curLang?' selected':''}>${v}</option>`
    ).join('');

    return `
<div class="vmp-header">
  <div class="vmp-logo">
    <span class="vmp-logo-icon">🎓</span>
    <div>
      <div class="vmp-logo-title">Campus Connect AI</div>
      <div class="vmp-mode-lbl" id="vmpModeLbl">${collegeMode ? (cn + ' — College Mode') : 'Global AI Mode'}</div>
    </div>
  </div>
  <div class="vmp-header-right">
    <div class="vmp-mode-toggle">
      <button class="vmp-mode-btn ${collegeMode?'active':''}" id="btnCollegeMode"
        onclick="setVmpMode('college')" ${!cn?'disabled':''}
        title="${!cn?'Search a college first':'College Mode'}">
        🏛️ College
      </button>
      <button class="vmp-mode-btn ${!collegeMode?'active':''}" id="btnGlobalMode"
        onclick="setVmpMode('global')" title="Global AI Mode">
        🌐 Global
      </button>
    </div>
    <div class="vmp-lang-wrap">
      <span class="vmp-lang-icon">🗣️</span>
      <select id="vmpLangSel" class="vmp-lang-sel" onchange="setVmpLang(this.value)">${langOpts}</select>
    </div>
    <button class="vmp-action-btn vmp-upload-btn" id="vmpUploadBtn" onclick="triggerVmpUpload()"
      title="Upload image, audio, or document for AI analysis" style="${!collegeMode?'':'display:none;'}">
      📎 Upload
    </button>
    <button class="vmp-action-btn vmp-pdf-btn" onclick="exportVoiceModePDF()" title="Export conversation as PDF">
      📄 PDF
    </button>
    <button class="vmp-action-btn vmp-stop-voice-btn" id="vmsStopBtn" onclick="stopSpeaking()"
      title="Stop AI voice" style="display:none;">
      ⏹ Stop AI
    </button>
    <button class="vmp-exit-btn" onclick="closeVoiceMode()">✕ Exit</button>
  </div>
</div>

<input type="file" id="vmpFileInput" accept="image/*,audio/*,.pdf,.txt,.doc,.docx"
  style="display:none;" onchange="handleVmpFileUpload(event)">

<div class="vmp-body">
  <div class="vmp-avatar-col">
    <div class="vmp-avatar-wrap">
      <div class="vmp-ring r3"></div>
      <div class="vmp-ring r2"></div>
      <div class="vmp-ring r1"></div>
      <div class="vmp-avatar" id="vmsAvatar">🎓</div>
    </div>
    <div class="vmp-ai-label">Campus Connect AI</div>
    <div class="vmp-status-lbl" id="vmsStatus">Initializing…</div>
    <div class="vmp-mic-wrap">
      <button class="vmp-mic-btn" id="vmsMicBtn" onclick="vmsToggleMic()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
        <span class="vmp-mic-label" id="vmsMicLbl">Tap to Speak</span>
      </button>
      <div class="vmp-mic-hint" id="vmpMicHint">Tap mic then speak clearly</div>
    </div>
  </div>

  <div class="vmp-chat-col">
    <div class="vmp-chat-scroll" id="vmpConversation"></div>

    <div id="vmpUploadPreview" style="display:none;padding:8px 16px;background:rgba(124,58,237,0.12);border-top:1px solid rgba(124,58,237,0.3);flex-shrink:0;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:0.82rem;color:#a78bfa;font-weight:600;" id="vmpUploadInfo">📎 File attached</span>
        <button onclick="clearVmpUpload()" style="font-size:0.75rem;color:#ef4444;background:none;border:none;cursor:pointer;padding:2px 6px;">✕ Remove</button>
      </div>
    </div>

    <div class="vmp-text-row">
      <input type="text" id="vmpTextInput" class="vmp-text-inp"
        placeholder="Or type your question here and press Enter…"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();vmsSendText();}">
      <button class="vmp-send-btn" onclick="vmsSendText()" title="Send">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </div>
    <div class="vmp-status-bar" id="vmpStatusBar">Ready to answer your questions</div>
  </div>
</div>`;
  }

  /* ── VMS state ── */
  let vmsRec = null, vmsRecording = false, vmpMode = 'college';
  let vmsSilenceTimer = null;
  let vmpConversationLog = [];
  let vmpAttachedFile = null;

  function _initVMP() {
    const cn = window.CC_COLLEGE_DATA?.collegeName || window.CC_SELECTED_COLLEGE?.name || null;
    vmpMode = cn ? 'college' : 'global';
    window.CC_VMS_LANG = getCurrentLang();

    const sel = document.getElementById('vmpLangSel');
    if (sel) sel.value = window.CC_VMS_LANG;

    // FIX 5: College button enabled only if college loaded
    const bc = document.getElementById('btnCollegeMode');
    const bg = document.getElementById('btnGlobalMode');
    if (bc) {
      bc.classList.toggle('active', vmpMode === 'college');
      bc.disabled = !cn;
      bc.style.opacity = cn ? '' : '0.38';
      bc.style.cursor = cn ? '' : 'not-allowed';
    }
    if (bg) bg.classList.toggle('active', vmpMode === 'global');

    // Upload visible only in global mode
    const uploadBtn = document.getElementById('vmpUploadBtn');
    if (uploadBtn) uploadBtn.style.display = vmpMode === 'global' ? 'flex' : 'none';

    _initVMSMic();
    vmpConversationLog = [];
    vmpAttachedFile = null;

    setTimeout(() => {
      const intro = _introMsg(cn, vmpMode);
      _addMsg('ai', intro, intro);
      _speakVMS(intro);
    }, 600);
  }

  function _introMsg(cn, mode) {
    if (mode === 'college' && cn) {
      return `Hello! I'm Campus Connect AI, your expert for ${cn}. Ask me anything about fees, admissions, courses, placements, hostel, or rankings. I'll speak every answer in your chosen language. You can also type below.`;
    }
    return `Hello! I'm Campus Connect AI in Global Mode. I can answer anything — science, coding, history, math, and more. You can also upload images, audio files, or documents using the Upload button for AI analysis. What would you like to know?`;
  }

  /* ── VMS Mic ── */
  function _initVMSMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      const mb = document.getElementById('vmsMicBtn');
      if (mb) { mb.style.opacity = '0.35'; mb.style.cursor = 'not-allowed'; mb.title = 'Voice needs Chrome or Edge'; }
      _setVMSStatus('Use Chrome/Edge for voice input');
      return;
    }

    function makeVmsRec() {
      const r = new SR();
      r.continuous = false;
      r.interimResults = true;
      r.maxAlternatives = 3;
      r.lang = getSTTLang(window.CC_VMS_LANG || getCurrentLang()); // FIX 1

      r.onstart = () => {
        vmsRecording = true;
        _updateVMSMicBtn(true);
        _setVMSStatus('🎙️ Listening… speak clearly');
        _setStatusBar('🎙️ Listening…');
        clearTimeout(vmsSilenceTimer);
      };
      r.onresult = (e) => {
        let interim = '', final_ = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) final_ += t;
          else interim += t;
        }
        const inp = document.getElementById('vmpTextInput');
        if (inp) inp.value = final_ || interim;
        if (final_.trim()) {
          _setVMSStatus('✅ Got it — processing…');
          _setStatusBar('Processing your question…');
          clearTimeout(vmsSilenceTimer);
          vmsSilenceTimer = setTimeout(() => vmsSendText(), 400);
        } else if (interim) {
          _setVMSStatus('🎙️ ' + interim.substring(0, 70) + '…');
          clearTimeout(vmsSilenceTimer);
          vmsSilenceTimer = setTimeout(() => {
            if (vmsRecording) try { r.stop(); } catch (_) {}
          }, 2200);
        }
      };
      r.onerror = (e) => {
        vmsRecording = false;
        _updateVMSMicBtn(false);
        clearTimeout(vmsSilenceTimer);
        const msgs = {
          'not-allowed':'🚫 Mic blocked — allow in browser address bar',
          'no-speech':'🔇 Nothing heard — try again',
          'audio-capture':'🎤 No microphone found',
          'network':'🌐 Network error','aborted':'Mic stopped'
        };
        _setVMSStatus(msgs[e.error] || 'Mic error: ' + e.error);
        setTimeout(() => { _setVMSStatus('Ready'); _setStatusBar('Ready'); }, 4000);
      };
      r.onend = () => {
        vmsRecording = false;
        _updateVMSMicBtn(false);
        const txt = document.getElementById('vmpTextInput')?.value.trim();
        if (!txt) { _setVMSStatus('Ready'); _setStatusBar('Tap mic to speak or type below'); }
      };
      return r;
    }

    vmsRec = makeVmsRec();
    window._makeVmsRec = makeVmsRec;
  }

  window.vmsToggleMic = function () {
    if (!vmsRec) { alert('Voice input needs Chrome or Edge.'); return; }
    if (vmsRecording) { clearTimeout(vmsSilenceTimer); try { vmsRec.stop(); } catch (_) {} return; }
    if (window._makeVmsRec) vmsRec = window._makeVmsRec();
    vmsRec.lang = getSTTLang(window.CC_VMS_LANG || getCurrentLang()); // FIX 1
    const inp = document.getElementById('vmpTextInput');
    if (inp) inp.value = '';
    try { vmsRec.start(); }
    catch (e) { _setVMSStatus('Cannot start mic — try again'); setTimeout(() => _setVMSStatus('Ready'), 3000); }
  };

  /* ── FIX 3: Mode switch CLEARS chat and starts fresh ── */
  window.setVmpMode = function (mode) {
    if (mode === vmpMode) return;

    const cn = window.CC_COLLEGE_DATA?.collegeName || window.CC_SELECTED_COLLEGE?.name;

    if (mode === 'college' && !cn) {
      _setVMSStatus('⚠️ Search a college in main chat first!');
      _setStatusBar('Open main chat, search a college, then come back to College Mode');
      setTimeout(() => { _setVMSStatus('Ready'); }, 3500);
      return;
    }

    // FIX 3: Clear the conversation log and UI
    const conv = document.getElementById('vmpConversation');
    if (conv) conv.innerHTML = '';
    vmpConversationLog = [];
    window.stopSpeaking();

    vmpMode = mode;
    document.getElementById('btnCollegeMode')?.classList.toggle('active', mode === 'college');
    document.getElementById('btnGlobalMode')?.classList.toggle('active', mode === 'global');

    const lbl = document.getElementById('vmpModeLbl');
    if (lbl) lbl.textContent = (mode === 'college' && cn) ? (cn + ' — College Mode') : 'Global AI Mode';

    // Upload only in global mode
    const uploadBtn = document.getElementById('vmpUploadBtn');
    if (uploadBtn) uploadBtn.style.display = mode === 'global' ? 'flex' : 'none';

    const msg = (mode === 'college' && cn)
      ? `Switched to College Mode! New session started. I'm now focused on ${cn}. Ask anything — fees, courses, placements, admissions!`
      : `Switched to Global AI Mode! New session started. Ask anything or upload a file/image/audio for analysis!`;

    setTimeout(() => { _addMsg('ai', msg, msg); _speakVMS(msg); }, 150);
  };

  /* ── FIX 2: Language sync — updates BOTH STT and TTS everywhere ── */
  window.setVmpLang = function (lang) {
    window.CC_VMS_LANG = lang;
    window.CC_LANG = lang;
    window.CC_LANG_OVERRIDE = (lang !== 'en') ? lang : null;

    // Sync all recognition instances
    if (mainRec) mainRec.lang = getSTTLang(lang);
    if (window.CC_RECOGNITION) window.CC_RECOGNITION.lang = getSTTLang(lang);
    if (vmsRec) vmsRec.lang = getSTTLang(lang);

    // Sync main dropdown
    const mainSel = document.getElementById('langSelect');
    if (mainSel) mainSel.value = lang;

    _setVMSStatus('Language: ' + (LANG_LABELS[lang] || lang));
    setTimeout(() => _setVMSStatus('Ready'), 2000);
  };

  /* ── FIX 6: File upload for Global Mode ── */
  window.triggerVmpUpload = function () {
    if (vmpMode !== 'global') {
      _setStatusBar('📎 File upload is available in Global Mode only');
      setTimeout(() => _setStatusBar('Ready'), 2500);
      return;
    }
    document.getElementById('vmpFileInput')?.click();
  };

  window.handleVmpFileUpload = async function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isAudio = file.type.startsWith('audio/');

    vmpAttachedFile = null;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target.result;
      if (isImage || isAudio) {
        const base64 = result.split(',')[1];
        vmpAttachedFile = { type: isImage ? 'image' : 'audio', base64, mimeType: file.type, name: file.name };
      } else {
        vmpAttachedFile = { type: 'text', content: result.substring(0, 10000), name: file.name };
      }

      const preview = document.getElementById('vmpUploadPreview');
      const info = document.getElementById('vmpUploadInfo');
      if (preview) preview.style.display = 'block';
      if (info) info.textContent = `📎 ${file.name} (${(file.size/1024).toFixed(1)} KB) — ${isImage?'🖼️ Image':isAudio?'🎵 Audio':'📄 Document'}`;

      const hint = isImage ? 'Ask a question about the image or press Send for auto-summary'
                 : isAudio ? 'Press Send to transcribe & analyze this audio'
                 : 'Ask about the document or press Send for summary';
      _setStatusBar('📎 ' + hint);
      _setVMSStatus(isImage ? 'Image ready' : isAudio ? 'Audio ready' : 'File ready');
    };

    if (isImage || isAudio) reader.readAsDataURL(file);
    else reader.readAsText(file);

    event.target.value = ''; // reset so same file can be re-selected
  };

  window.clearVmpUpload = function () {
    vmpAttachedFile = null;
    const preview = document.getElementById('vmpUploadPreview');
    if (preview) preview.style.display = 'none';
    _setStatusBar('Ready to answer your questions');
    _setVMSStatus('Ready');
  };

  /* ── VMS Send ── */
  window.vmsSendText = async function () {
    const inp = document.getElementById('vmpTextInput');
    const text = (inp ? inp.value : '').trim();
    const hasAttachment = !!vmpAttachedFile;
    if (!text && !hasAttachment) return;

    if (inp) inp.value = '';
    clearTimeout(vmsSilenceTimer);
    if (vmsRecording) { try { if (vmsRec) vmsRec.stop(); } catch (_) {} }

    const displayText = text || `📎 Analyze: ${vmpAttachedFile?.name}`;
    _addMsg('user', _esc(displayText), displayText);
    _setStatusBar('⏳ Thinking…');
    _setVMSStatus('Thinking…');

    const conv = document.getElementById('vmpConversation');
    const typDiv = document.createElement('div');
    typDiv.className = 'vmp-msg ai'; typDiv.id = 'vmpTyping';
    typDiv.innerHTML = `<div class="vmp-av ai-av">🎓</div><div class="vmp-bubble-wrap"><div class="vmp-bubble ai-bubble vmp-typing"><span class="t-dot"></span><span class="t-dot"></span><span class="t-dot"></span></div></div>`;
    if (conv) { conv.appendChild(typDiv); conv.scrollTop = conv.scrollHeight; }

    try {
      let raw;
      const attachment = vmpAttachedFile;
      if (hasAttachment) clearVmpUpload();

      if (vmpMode === 'global') {
        raw = await _globalQueryVMS(text || 'Please analyze this file and give a detailed summary.', attachment);
      } else {
        // FIX 5: college mode properly uses VMS lang
        const prevLang = window.CC_LANG;
        const prevOverride = window.CC_LANG_OVERRIDE;
        window.CC_LANG = window.CC_VMS_LANG || getCurrentLang();
        window.CC_LANG_OVERRIDE = window.CC_VMS_LANG;
        try { raw = await agentAnswer(text); }
        finally { window.CC_LANG = prevLang; window.CC_LANG_OVERRIDE = prevOverride; }
      }

      document.getElementById('vmpTyping')?.remove();
      const html = (typeof marked !== 'undefined') ? marked.parse(raw || '') : _nl2br(raw || '');
      const plain = _toPlain(raw || '');
      _addMsg('ai', html, plain);
      _setStatusBar('✅ Done');
      _setVMSStatus('Ready');
      window.CC_VMS_SPEAKING = true;
      setTimeout(() => _speakVMS(plain.substring(0, 1000)), 200);

    } catch (err) {
      console.error('[VMS error]', err);
      document.getElementById('vmpTyping')?.remove();
      const errMsg = 'Sorry, there was a problem. Please try again.';
      _addMsg('ai', errMsg, errMsg);
      _speakVMS(errMsg);
      _setStatusBar('Error — please try again');
      _setVMSStatus('Ready');
    }
  };

  /* ── Global AI query with optional file ── */
  async function _globalQueryVMS(userMsg, attachment) {
    const lang = window.CC_VMS_LANG || getCurrentLang();
    const langInstruction = lang === 'en'
      ? 'Respond in clear English.'
      : `Reply ENTIRELY in the language for code "${lang}". For hi=Hindi, ta=Tamil, te=Telugu, bn=Bengali, ml=Malayalam, mr=Marathi, gu=Gujarati, kn=Kannada, es=Spanish, fr=French, de=German, zh=Chinese, ja=Japanese, ar=Arabic, pt=Portuguese, ko=Korean, ru=Russian, it=Italian. Use that language completely.`;

    if (attachment) {
      if (attachment.type === 'image' || attachment.type === 'audio') {
        return await _callGeminiMultiModal(userMsg, attachment, langInstruction);
      }
      // Text attachment
      const extraContent = `\n\n--- File: ${attachment.name} ---\n${attachment.content}\n--- End ---`;
      return await callGemini({
        system: `You are Campus Connect AI. Answer anything. ${langInstruction} If a document is attached, analyze it thoroughly.`,
        messages: [{ role: 'user', content: userMsg + extraContent }],
        useSearch: false, maxTokens: 1500
      });
    }

    return await callGemini({
      system: `You are Campus Connect AI — a knowledgeable helpful assistant. Answer ANY question accurately. ${langInstruction} Use markdown formatting. Be concise but complete.`,
      messages: [{ role: 'user', content: userMsg }],
      useSearch: true, maxTokens: 1200
    });
  }

  async function _callGeminiMultiModal(userMsg, attachment, langInstruction) {
    const apiKey = (typeof getGeminiKey === 'function') ? getGeminiKey() : (localStorage.getItem('CC_GEMINI_KEY') || '');
    if (!apiKey) throw new Error('No API key — please set your Gemini API key first.');

    const promptText = userMsg || (attachment.type === 'image'
      ? 'Please analyze this image in detail. Describe what you see, identify text, objects, and any important information.'
      : 'Please transcribe and summarize this audio file.');

    const body = {
      contents: [{ role: 'user', parts: [
        { inline_data: { mime_type: attachment.mimeType, data: attachment.base64 } },
        { text: promptText }
      ]}],
      system_instruction: { parts: [{ text: `You are Campus Connect AI. Analyze thoroughly. ${langInstruction}` }] },
      generationConfig: { maxOutputTokens: 1500, temperature: 0.5 }
    };

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(90000)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error('Gemini multimodal error ' + res.status + ': ' + err.slice(0,200));
    }
    const data = await res.json();
    return (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('\n').trim();
  }

  window.sendGlobalAIQuery = _globalQueryVMS;

  /* ── FIX 5: Export Voice Mode PDF ── */
  window.exportVoiceModePDF = function () {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) { alert('PDF library not loaded. Please refresh.'); return; }
    if (!vmpConversationLog || vmpConversationLog.length === 0) {
      alert('No conversation to export yet. Have a conversation first!'); return;
    }

    const doc = new jsPDF({ unit:'pt', format:'a4', orientation:'portrait' });
    const PW = doc.internal.pageSize.width, PH = doc.internal.pageSize.height;
    const ML = 40, MR = 40, contentW = PW - ML - MR;
    let y = 40;

    const addPage = () => { doc.addPage(); y = 40; };
    const chk = (n=40) => { if (y+n > PH-40) addPage(); };

    // Header
    doc.setFillColor(6,9,18);
    doc.rect(0,0,PW,PH,'F');
    doc.setFillColor(124,58,237);
    doc.rect(0,0,PW,5,'F');
    doc.setFontSize(24); doc.setTextColor(232,234,246); doc.setFont(undefined,'bold');
    doc.text('🎓 Campus Connect AI — Voice Mode', ML, 55);
    doc.setFontSize(10); doc.setFont(undefined,'normal'); doc.setTextColor(148,163,184);
    doc.text((vmpMode==='college'?'College: '+(window.CC_COLLEGE_DATA?.collegeName||'N/A'):'Global AI Mode') + '  ·  ' + new Date().toLocaleString(), ML, 72);
    doc.setDrawColor(124,58,237); doc.setLineWidth(0.5); doc.line(ML,82,PW-MR,82);
    y = 100;

    vmpConversationLog.forEach(entry => {
      const isUser = entry.role === 'user';
      const txt = (entry.plain || entry.text || '').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
      if (!txt) return;
      const label = isUser ? '👤 You' : '🎓 AI';
      const lines = doc.splitTextToSize(txt, contentW-20);
      const bh = lines.length*13+24;
      chk(bh+12);
      doc.setFillColor(isUser?20:15, isUser?30:20, isUser?55:40);
      doc.setDrawColor(isUser?59:124, isUser?130:58, isUser?246:237);
      doc.setLineWidth(0.4);
      doc.roundedRect(ML,y,contentW,bh,5,5,'FD');
      if (!isUser) { doc.setFillColor(124,58,237); doc.roundedRect(ML,y,3,bh,2,2,'F'); }
      doc.setFontSize(8); doc.setFont(undefined,'bold');
      doc.setTextColor(isUser?96:167,isUser?165:139,250);
      doc.text(label, ML+10, y+13);
      doc.setFontSize(9.5); doc.setFont(undefined,'normal'); doc.setTextColor(200,210,230);
      lines.forEach((l,i) => doc.text(l, ML+10, y+22+i*13));
      y += bh+8;
    });

    const cn = window.CC_COLLEGE_DATA?.collegeName || 'Chat';
    doc.save(`VoiceMode_${cn.replace(/\s+/g,'_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  /* ── Add message ── */
  function _addMsg(role, html, plain) {
    const conv = document.getElementById('vmpConversation');
    if (!conv) return;
    const id = 'v'+Date.now()+Math.random().toString(36).slice(2,7);
    window[id+'_text'] = plain||_toPlain(html);
    vmpConversationLog.push({ role, plain: plain||_toPlain(html) });

    const div = document.createElement('div');
    div.className = 'vmp-msg '+(role==='ai'?'ai':'user');

    if (role === 'ai') {
      div.innerHTML = `
        <div class="vmp-av ai-av">🎓</div>
        <div class="vmp-bubble-wrap">
          <div class="vmp-bubble ai-bubble">${html}</div>
          <div style="display:flex;gap:6px;margin-top:5px;flex-wrap:wrap;">
            <button class="vmp-listen-btn" onclick="vmpPlay('${id}')" title="Listen">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:13px;height:13px;">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              </svg>Listen again
            </button>
            <button class="vmp-stop-inline-btn" onclick="stopSpeaking()" title="Stop voice">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:13px;height:13px;">
                <rect x="5" y="5" width="14" height="14" rx="1"/>
              </svg>Stop
            </button>
          </div>
        </div>`;
    } else {
      div.innerHTML = `
        <div class="vmp-bubble-wrap user-wrap">
          <div class="vmp-bubble user-bubble">${html}</div>
        </div>
        <div class="vmp-av user-av">👤</div>`;
    }

    conv.appendChild(div);
    conv.scrollTop = conv.scrollHeight;
  }

  window.vmpPlay = function (id) {
    const t = window[id+'_text'];
    if (t) { window.CC_VMS_SPEAKING = true; _speakVMS(t.substring(0,1000)); }
  };

  function _speakVMS(text) { window.speak(text, window.CC_VMS_LANG || getCurrentLang()); }
  function _setVMSStatus(m) { const e=document.getElementById('vmsStatus'); if(e) e.textContent=m; }
  function _setStatusBar(m) { const e=document.getElementById('vmpStatusBar'); if(e) e.textContent=m; }
  function _updateVMSMicBtn(on) {
    const b=document.getElementById('vmsMicBtn'), l=document.getElementById('vmsMicLbl');
    if(!b) return;
    b.classList.toggle('recording',on);
    if(l) l.textContent = on?'Tap to Stop':'Tap to Speak';
  }
  function _esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _toPlain(s){ return s.replace(/<[^>]+>/g,' ').replace(/[*_#`~\[\]]/g,'').replace(/\s{2,}/g,' ').trim(); }
  function _nl2br(s){ return s.replace(/\n/g,'<br>'); }

  window.closeVoiceMode = function () {
    if (synth) synth.cancel();
    window.CC_SPEAKING = false; window.CC_VMS_SPEAKING = false;
    clearTimeout(vmsSilenceTimer);
    if (vmsRec && vmsRecording) { try { vmsRec.stop(); } catch (_) {} }
    vmsRec = null; vmsRecording = false;
    const pg = document.getElementById('voiceModePage');
    if (pg) { pg.classList.remove('vmp-open'); setTimeout(() => pg?.remove(), 380); }
    document.getElementById('agentVoiceToggle')?.classList.remove('voice-active');
    window.CC_AGENT_VOICE_MODE = false;
  };

  /* ── Init ── */
  function init() {
    initMainMic();
    window.CC_SPEAKING_ENABLED = true;
    window.CC_AGENT_VOICE_MODE = false;
    window.CC_VMS_LANG = 'en';
    window.CC_VMS_SPEAKING = false;

    const sb = document.getElementById('speakerBtn');
    if (sb) { sb.classList.add('tts-active'); sb.style.borderColor='var(--green)'; sb.style.color='var(--green)'; }

    if (synth) {
      if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = () => synth.getVoices();
      setTimeout(() => synth.getVoices(), 150);
    }
  }

  // FIX 2: updateVoiceLang syncs all instances
  window.updateVoiceLang = function (lang) {
    window.CC_LANG = lang;
    if (mainRec) mainRec.lang = getSTTLang(lang);
    if (window.CC_RECOGNITION) window.CC_RECOGNITION.lang = getSTTLang(lang);
    if (window.CC_AGENT_VOICE_MODE) {
      window.CC_VMS_LANG = lang;
      if (vmsRec) vmsRec.lang = getSTTLang(lang);
      const sel = document.getElementById('vmpLangSel');
      if (sel) sel.value = lang;
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
