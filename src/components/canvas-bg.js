/* ═══════════════════════════════════════════════════════
   CAMPUS CONNECT — Animated Canvas Background
   Creates a particle neural-net effect
   ═══════════════════════════════════════════════════════ */

(function () {
  const canvas = document.getElementById('bgCanvas');
  const ctx = canvas.getContext('2d');

  let W, H, particles = [], animId;

  const PARTICLE_COUNT = 70;
  const MAX_DIST = 130;
  const SPEED = 0.3;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * SPEED,
      vy: (Math.random() - 0.5) * SPEED,
      r: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.5 + 0.2,
    };
  }

  function init() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(createParticle());
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) {
          const alpha = (1 - dist / MAX_DIST) * 0.08;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(59,130,246,${alpha})`;
          ctx.lineWidth = 0.6;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw particles
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(59,130,246,${p.opacity})`;
      ctx.fill();

      // Move
      p.x += p.vx;
      p.y += p.vy;

      // Wrap
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H + 10) p.y = -10;
    });

    animId = requestAnimationFrame(draw);
  }

  // Slight highlight on mouse move
  let mx = W / 2, my = H / 2;
  window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  resize();
  init();
  draw();

  window.addEventListener('resize', () => {
    cancelAnimationFrame(animId);
    resize();
    init();
    draw();
  });
})();
