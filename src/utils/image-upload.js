/* ═══════════════════════════════════════════════════════
   CAMPUS CONNECT — Image & PDF Analyzer (Main Chat)
   ✅ Works in ALL modes: College Mode, Phase 1, Global Mode
   ✅ Uses Gemini Vision API (free) for images
   ✅ Uses Gemini text API for PDF/text files
   ✅ Supports: JPG, PNG, GIF, WEBP, PDF, TXT, DOCX
   ═══════════════════════════════════════════════════════ */

/* ── Attached file state ── */
window._mainAttachedFile = null;

/* ── Trigger file picker ── */
window.triggerMainUpload = function () {
  const input = document.getElementById('mainFileInput');
  if (input) input.click();
};

/* ── File selected handler ── */
window.handleMainFileSelect = function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const isImage = file.type.startsWith('image/');
  const isPDF   = file.type === 'application/pdf';
  const isText  = file.type.startsWith('text/') || /\.(txt|md)$/i.test(file.name);
  const isDoc   = /\.(doc|docx)$/i.test(file.name);

  if (!isImage && !isPDF && !isText && !isDoc) {
    _showAttachError('Unsupported file type. Please use image, PDF, or text files.');
    event.target.value = '';
    return;
  }

  const sizeLimit = 20 * 1024 * 1024; // 20 MB
  if (file.size > sizeLimit) {
    _showAttachError('File is too large (max 20 MB). Please choose a smaller file.');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();

  if (isImage) {
    reader.onload = function (e) {
      const base64 = e.target.result.split(',')[1];
      window._mainAttachedFile = {
        type: 'image',
        base64,
        mimeType: file.type,
        name: file.name,
        size: file.size,
      };
      _showAttachPreview('🖼️', file.name, file.size, 'Image ready — ask a question or press Send for auto-analysis');
    };
    reader.readAsDataURL(file);
  } else if (isPDF) {
    reader.onload = function (e) {
      const base64 = e.target.result.split(',')[1];
      window._mainAttachedFile = {
        type: 'pdf',
        base64,
        mimeType: 'application/pdf',
        name: file.name,
        size: file.size,
      };
      _showAttachPreview('📄', file.name, file.size, 'PDF ready — ask a question or press Send to summarize');
    };
    reader.readAsDataURL(file);
  } else {
    // Text / DOC — read as text
    reader.onload = function (e) {
      const content = (e.target.result || '').substring(0, 15000);
      window._mainAttachedFile = {
        type: 'text',
        content,
        mimeType: file.type,
        name: file.name,
        size: file.size,
      };
      _showAttachPreview('📝', file.name, file.size, 'Document ready — ask a question or press Send to summarize');
    };
    reader.readAsText(file);
  }

  event.target.value = ''; // reset so same file can be re-selected
};

/* ── Show preview bar ── */
function _showAttachPreview(icon, name, size, hint) {
  const bar      = document.getElementById('attachPreviewBar');
  const iconEl   = document.getElementById('attachPreviewIcon');
  const nameEl   = document.getElementById('attachPreviewName');
  const tipEl    = document.querySelector('.input-tip');
  const uploadBtn = document.getElementById('mainUploadBtn');

  if (iconEl) iconEl.textContent = icon;
  if (nameEl) nameEl.textContent = `${name}  (${(size / 1024).toFixed(1)} KB)`;
  if (bar)    { bar.style.display = 'flex'; }
  if (tipEl)  tipEl.textContent = hint;
  if (uploadBtn) uploadBtn.classList.add('has-file');

  // Focus textarea
  const inp = document.getElementById('userInput');
  if (inp) inp.focus();
}

/* ── Show error ── */
function _showAttachError(msg) {
  if (typeof appendBotMsg === 'function') {
    appendBotMsg('<p>⚠️ ' + msg + '</p>');
  } else {
    alert(msg);
  }
}

/* ── Clear attachment ── */
window.clearMainAttachment = function () {
  window._mainAttachedFile = null;
  const bar = document.getElementById('attachPreviewBar');
  if (bar) bar.style.display = 'none';
  const tipEl = document.querySelector('.input-tip');
  if (tipEl) tipEl.textContent = '📎 Attach image/PDF · Shift+Enter for new line · Enter to send';
  const uploadBtn = document.getElementById('mainUploadBtn');
  if (uploadBtn) uploadBtn.classList.remove('has-file');
};

/* ══════════════════════════════════════════════════════
   CORE: Analyze file with Gemini
   Called from main sendMessage when _mainAttachedFile is set
   ══════════════════════════════════════════════════════ */
window.analyzeAttachedFile = async function (userMsg) {
  const attachment = window._mainAttachedFile;
  if (!attachment) return null;

  const apiKey = (typeof getGeminiKey === 'function') ? getGeminiKey() : (localStorage.getItem('CC_GEMINI_KEY') || '');
  if (!apiKey) {
    if (typeof showApiKeyPrompt === 'function') showApiKeyPrompt();
    throw new Error('No Gemini API key — please set your key first.');
  }

  const GEMINI_MODEL_VISION = 'gemini-2.5-flash-lite';
  const BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

  /* ── Context: what college/mode is active ── */
  let contextNote = '';
  if (window.CC_GLOBAL_MODE) {
    contextNote = 'You are Campus Connect AI in Global Mode. Analyze the file thoroughly.';
  } else if (window.CC_COLLEGE_DATA && window.CC_COLLEGE_DATA.collegeName) {
    contextNote = `You are Campus Connect AI. The user is researching ${window.CC_COLLEGE_DATA.collegeName}. Analyze the attached file and relate it to this college context if relevant.`;
  } else {
    contextNote = 'You are Campus Connect AI. Analyze the attached file thoroughly and provide useful insights.';
  }

  /* ── IMAGE or PDF ── */
  if (attachment.type === 'image' || attachment.type === 'pdf') {
    const prompt = userMsg ||
      (attachment.type === 'image'
        ? 'Please analyze this image in detail. Describe what you see, extract any text, identify objects, charts, or important information.'
        : 'Please summarize this PDF document. Extract key information, main points, and any important data.');

    const body = {
      contents: [{
        role: 'user',
        parts: [
          { inline_data: { mime_type: attachment.mimeType, data: attachment.base64 } },
          { text: prompt }
        ]
      }],
      system_instruction: { parts: [{ text: contextNote }] },
      generationConfig: { maxOutputTokens: 2000, temperature: 0.4 }
    };

    const res = await fetch(`${BASE}${GEMINI_MODEL_VISION}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini Vision error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    return (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('\n').trim();
  }

  /* ── TEXT / DOC ── */
  if (attachment.type === 'text') {
    const prompt = userMsg
      ? `${userMsg}\n\n--- File: ${attachment.name} ---\n${attachment.content}\n--- End ---`
      : `Please summarize this document and extract the key information:\n\n--- File: ${attachment.name} ---\n${attachment.content}\n--- End ---`;

    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      system_instruction: { parts: [{ text: contextNote }] },
      generationConfig: { maxOutputTokens: 2000, temperature: 0.4 }
    };

    const res = await fetch(`${BASE}${GEMINI_MODEL_VISION}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini text error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    return (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('\n').trim();
  }

  return null;
};
