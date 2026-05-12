/* ═══════════════════════════════════════════════════════
   CAMPUS CONNECT — PDF Export Module
   Full conversation export with college profile
   ═══════════════════════════════════════════════════════ */

window.exportPDF = async function () {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) { alert('PDF library not loaded. Please refresh and try again.'); return; }

  const log = window.CC_CHAT_LOG || [];
  if (log.length === 0) {
    alert('No conversation to export yet. Start chatting first!');
    return;
  }

  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const PW = doc.internal.pageSize.width;   // 595
  const PH = doc.internal.pageSize.height;  // 842
  const ML = 40, MR = 40, MT = 40;
  const contentW = PW - ML - MR;
  let y = MT;

  const addPage = () => { doc.addPage(); y = MT; };
  const checkPage = (needed = 40) => { if (y + needed > PH - 40) addPage(); };

  /* ── COVER PAGE ─────────────────────────────────── */
  // Background
  doc.setFillColor(6, 9, 18);
  doc.rect(0, 0, PW, PH, 'F');

  // Accent bar
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, PW, 6, 'F');

  // Logo area
  doc.setFillColor(15, 24, 40);
  doc.roundedRect(ML, 60, 60, 60, 10, 10, 'F');
  doc.setFontSize(32);
  doc.text('🎓', ML + 30, 100, { align: 'center' });

  // Title
  doc.setFontSize(32);
  doc.setTextColor(232, 234, 246);
  doc.setFont(undefined, 'bold');
  doc.text('Campus Connect', ML + 80, 88);

  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(136, 153, 180);
  doc.text('AI College Intelligence Agent — Conversation Report', ML + 80, 108);

  // Divider
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(ML, 135, PW - MR, 135);

  // College info box
  const college = window.CC_SELECTED_COLLEGE;
  const cData = window.CC_COLLEGE_DATA;

  if (college) {
    doc.setFillColor(16, 24, 40);
    doc.roundedRect(ML, 150, contentW, 120, 8, 8, 'F');
    doc.setDrawColor(30, 50, 80);
    doc.setLineWidth(0.5);
    doc.roundedRect(ML, 150, contentW, 120, 8, 8, 'S');

    doc.setFontSize(10);
    doc.setTextColor(59, 130, 246);
    doc.setFont(undefined, 'bold');
    doc.text('ANALYZED INSTITUTION', ML + 16, 172);

    doc.setFontSize(18);
    doc.setTextColor(232, 234, 246);
    doc.text(college.name || 'College', ML + 16, 196);

    doc.setFontSize(11);
    doc.setTextColor(136, 153, 180);
    doc.setFont(undefined, 'normal');
    if (college.location) doc.text('📍 ' + college.location, ML + 16, 214);
    if (college.url) {
      doc.setTextColor(59, 130, 246);
      doc.text('🔗 ' + college.url, ML + 16, 232);
    }
    if (cData && cData.tagline) {
      doc.setTextColor(136, 153, 180);
      doc.setFontSize(10);
      doc.text('"' + cData.tagline + '"', ML + 16, 252);
    }

    // Stats row
    if (cData && cData.stats) {
      const stats = [
        { label: 'ESTABLISHED', val: cData.stats.established || 'N/A' },
        { label: 'STUDENTS', val: cData.stats.students || 'N/A' },
        { label: 'RANKING', val: cData.stats.ranking || 'N/A' },
        { label: 'ACCEPTANCE', val: cData.stats.acceptanceRate || 'N/A' },
      ];
      const sw = contentW / stats.length;
      stats.forEach((s, i) => {
        const sx = ML + i * sw + sw / 2;
        doc.setFillColor(21, 32, 58);
        doc.roundedRect(ML + i * sw + 8, 280, sw - 16, 50, 6, 6, 'F');
        doc.setFontSize(14);
        doc.setTextColor(59, 130, 246);
        doc.setFont(undefined, 'bold');
        doc.text(String(s.val), sx, 305, { align: 'center' });
        doc.setFontSize(7);
        doc.setTextColor(74, 90, 115);
        doc.setFont(undefined, 'normal');
        doc.text(s.label, sx, 320, { align: 'center' });
      });
    }
  }

  // Date / meta
  doc.setFontSize(9);
  doc.setTextColor(74, 90, 115);
  doc.setFont(undefined, 'normal');
  doc.text('Generated: ' + new Date().toLocaleString(), ML, PH - 50);
  doc.text('Total messages: ' + log.length, ML, PH - 36);
  doc.text('Campus Connect — AI Intelligence Agent', PW - MR, PH - 36, { align: 'right' });

  /* ── CONVERSATION PAGES ──────────────────────────── */
  doc.addPage();
  y = MT;

  // Dark background for all content pages
  // (We'll use light for readability)
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.setFont(undefined, 'bold');
  doc.text('Conversation Transcript', ML, y);
  y += 6;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(2);
  doc.line(ML, y, ML + 160, y);
  y += 24;

  log.forEach((entry, idx) => {
    const isUser = entry.role === 'user';
    const text = stripHTML(entry.text || '');
    if (!text.trim()) return;

    const label = isUser ? '👤 You' : '🎓 Campus Connect';
    const lines = doc.splitTextToSize(text, contentW - 24);
    const boxH = lines.length * 14 + 28;

    checkPage(boxH + 16);

    // Box bg
    if (isUser) {
      doc.setFillColor(239, 244, 255);
      doc.setDrawColor(180, 200, 240);
    } else {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(200, 220, 240);
    }
    doc.setLineWidth(0.5);
    doc.roundedRect(ML, y, contentW, boxH, 6, 6, 'FD');

    // Accent bar
    if (!isUser) {
      doc.setFillColor(59, 130, 246);
      doc.roundedRect(ML, y, 3, boxH, 2, 2, 'F');
    }

    // Label
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(isUser ? 30 : 59, isUser ? 64 : 130, isUser ? 175 : 246);
    doc.text(label, ML + 12, y + 14);

    // Time
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(entry.time || '', PW - MR, y + 14, { align: 'right' });

    // Content
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(30, 41, 59);
    lines.forEach((line, li) => {
      doc.text(line, ML + 12, y + 26 + li * 14);
    });

    y += boxH + 10;
  });

  /* ── FOOTER ON LAST PAGE ─────────────────────────── */
  checkPage(60);
  doc.setDrawColor(200, 220, 240);
  doc.setLineWidth(0.5);
  doc.line(ML, y + 10, PW - MR, y + 10);
  y += 24;
  doc.setFontSize(10);
  doc.setTextColor(136, 153, 180);
  doc.setFont(undefined, 'italic');
  doc.text('This report was generated by Campus Connect AI. Information is sourced from AI research and official college websites.', ML, y, { maxWidth: contentW });
  y += 20;
  doc.setFont(undefined, 'normal');
  doc.setTextColor(59, 130, 246);
  doc.text('campus-connect.ai — Your AI College Intelligence Partner', ML, y);

  /* ── SAVE ────────────────────────────────────────── */
  const filename = 'CampusConnect_' + (college ? college.name.replace(/\s+/g, '_') : 'Report') + '_' + new Date().toISOString().split('T')[0] + '.pdf';
  doc.save(filename);
};
