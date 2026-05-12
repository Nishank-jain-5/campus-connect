/* ═══════════════════════════════════════════════════════
   CAMPUS CONNECT — Charts Module
   Chart.js visualizations for college data
   ═══════════════════════════════════════════════════════ */

window.CC_CHARTS = {};

/* ── FEE BAR CHART ────────────────────────────────────── */
function renderFeeChart(canvas, fees, chartId) {
  if (!window.Chart) return;
  if (window.CC_CHARTS[chartId]) {
    try { window.CC_CHARTS[chartId].destroy(); } catch(e) {}
  }

  const labels = [];
  const values = [];
  const colors = [
    'rgba(59,130,246,0.8)',
    'rgba(124,58,237,0.8)',
    'rgba(6,182,212,0.8)',
    'rgba(16,185,129,0.8)',
  ];

  const extractNum = (str) => {
    if (!str || typeof str !== 'string') return 0;
    const nums = str.replace(/[,\s]/g, '').match(/\d+(?:\.\d+)?/g);
    if (!nums) return 0;
    return Math.max(...nums.map(Number));
  };

  const feeFields = [
    { key: 'undergraduate', label: 'Undergraduate' },
    { key: 'postgraduate', label: 'Postgraduate' },
    { key: 'phd', label: 'PhD' },
    { key: 'hostel', label: 'Hostel' },
  ];

  feeFields.forEach(f => {
    if (fees[f.key] && fees[f.key] !== 'Not publicly disclosed') {
      const v = extractNum(fees[f.key]);
      if (v > 0) {
        labels.push(f.label);
        values.push(v);
      }
    }
  });

  if (values.length === 0) return;

  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Annual Fee',
        data: values,
        backgroundColor: colors.slice(0, values.length),
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(16,24,40,0.95)',
          titleColor: '#e8eaf6',
          bodyColor: '#8899b4',
          borderColor: 'rgba(59,130,246,0.3)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: ctx => ' ₹ ' + ctx.parsed.y.toLocaleString('en-IN'),
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(100,180,255,0.05)', drawBorder: false },
          ticks: { color: '#4a5a73', font: { size: 11, family: 'Outfit' } },
        },
        y: {
          grid: { color: 'rgba(100,180,255,0.05)', drawBorder: false },
          ticks: {
            color: '#4a5a73',
            font: { size: 10, family: 'Outfit' },
            callback: v => '₹' + (v >= 100000 ? (v/100000).toFixed(1) + 'L' : (v >= 1000 ? (v/1000).toFixed(0) + 'K' : v)),
          },
        },
      },
    },
  });

  window.CC_CHARTS[chartId] = chart;
}

/* ── PLACEMENT DOUGHNUT ───────────────────────────────── */
function renderPlacementChart(canvas, placement, chartId) {
  if (!window.Chart || !placement) return;
  if (window.CC_CHARTS[chartId]) {
    try { window.CC_CHARTS[chartId].destroy(); } catch(e) {}
  }

  const rate = parseFloat((placement.rate || '0').replace(/[^0-9.]/g, '')) || 75;
  const remaining = 100 - Math.min(rate, 100);

  const chart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Placed', 'Others'],
      datasets: [{
        data: [rate, remaining],
        backgroundColor: ['rgba(16,185,129,0.85)', 'rgba(30,50,80,0.5)'],
        borderWidth: 0,
        hoverOffset: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(16,24,40,0.95)',
          titleColor: '#e8eaf6',
          bodyColor: '#8899b4',
          callbacks: {
            label: ctx => ' ' + ctx.parsed.toFixed(1) + '%',
          },
        },
      },
    },
  });

  window.CC_CHARTS[chartId] = chart;
}

/* ── EXPAND CHART TO MODAL ────────────────────────────── */
window.expandChart = function(chartId) {
  const originalChart = window.CC_CHARTS[chartId];
  if (!originalChart) return;

  const overlay = document.getElementById('overlay');
  const modal = document.getElementById('chartModal');
  const modalCanvas = document.getElementById('modalChart');

  // Destroy previous modal chart
  if (window.CC_CHARTS['modal']) {
    try { window.CC_CHARTS['modal'].destroy(); } catch(e) {}
  }

  overlay.classList.add('show');
  modal.classList.add('show');
  overlay.onclick = closeModal;

  // Clone chart config
  const config = JSON.parse(JSON.stringify(originalChart.config));
  if (config.options) {
    config.options.maintainAspectRatio = true;
    config.options.responsive = true;
    if (config.options.plugins) {
      config.options.plugins.legend = { display: true, labels: { color: '#8899b4', font: { family: 'Outfit' } } };
    }
  }

  setTimeout(() => {
    try {
      const c = new Chart(modalCanvas, config);
      window.CC_CHARTS['modal'] = c;
    } catch(e) {}
  }, 50);
};

/* ── RANKING RADAR ────────────────────────────────────── */
function renderRankingRadar(canvas, data, chartId) {
  if (!window.Chart) return;

  const scores = [
    data.academics || 80,
    data.research || 75,
    data.placements || 70,
    data.facilities || 65,
    data.diversity || 60,
    data.innovation || 72,
  ];

  const chart = new Chart(canvas, {
    type: 'radar',
    data: {
      labels: ['Academics', 'Research', 'Placements', 'Facilities', 'Diversity', 'Innovation'],
      datasets: [{
        label: data.name || 'College',
        data: scores,
        backgroundColor: 'rgba(59,130,246,0.15)',
        borderColor: 'rgba(59,130,246,0.8)',
        pointBackgroundColor: 'rgba(59,130,246,0.9)',
        borderWidth: 2,
        pointRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          grid: { color: 'rgba(100,180,255,0.08)' },
          pointLabels: { color: '#8899b4', font: { size: 11, family: 'Outfit' } },
          ticks: { display: false },
          angleLines: { color: 'rgba(100,180,255,0.08)' },
        },
      },
    },
  });

  window.CC_CHARTS[chartId] = chart;
}
