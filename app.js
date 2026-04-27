// === $RICH / RICHPUBLICANS WEBSITE ===

// --- Entry Gate: click to enter, music starts at 18s and loops back to 18s ---
const richTrack = new Audio('assets/audio/rich.mp3');
richTrack.preload = 'auto';
richTrack.volume = 0.85;
richTrack.addEventListener('ended', () => {
  richTrack.currentTime = 18;
  richTrack.play().catch(() => {});
});

const HERO_FX_SELECTORS = '.hero-title, .hero-subtitle, .hero-char, .hero-buttons, .hero-ticker, .scroll-indicator, .gate-text, .gate-sub';

// Safety net: no matter what happens (interrupted tween, double-click,
// extension hijack, page restore), wipe any inline opacity/transform/etc.
// after a generous timeout so hero is guaranteed visible.
function forceHeroVisible() {
  if (window.gsap) gsap.set(HERO_FX_SELECTORS, { clearProps: 'all' });
  document.querySelectorAll(HERO_FX_SELECTORS).forEach(el => {
    el.style.opacity = '';
    el.style.transform = '';
    el.style.visibility = '';
  });
}

const gateOverlay = document.getElementById('gateOverlay');
let gateOpened = false; // dedup: prevent double/triple click re-running the timeline

gateOverlay && gateOverlay.addEventListener('click', () => {
  if (gateOpened) return;
  gateOpened = true;

  // Start the song at the 18s drop + spin up beat analyser
  try {
    setupBeatPulse();
    richTrack.currentTime = 18;
    richTrack.play().catch(() => {});
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  } catch (_) {}

  // No-GSAP fallback: if GSAP failed to load (CDN block, network error),
  // just dismiss the gate immediately so the user can still see the page.
  if (typeof gsap === 'undefined') {
    gateOverlay.style.display = 'none';
    const ca = document.getElementById('caBanner');
    const nav = document.querySelector('.navbar');
    if (ca) ca.classList.add('visible');
    if (nav) nav.classList.add('visible');
    forceHeroVisible();
    return;
  }

  // Safety net: if anything below breaks, force hero visible after 4s.
  const safetyTimer = setTimeout(forceHeroVisible, 4000);

  const tl = gsap.timeline({
    onComplete: () => { clearTimeout(safetyTimer); forceHeroVisible(); }
  });

  tl.to('.gate-text', { scale: 1.3, duration: 0.18, ease: 'power2.in' })
    .to('.gate-sub', { opacity: 0, duration: 0.12 }, 0)
    .to('.gate-text', { scale: 0.5, opacity: 0, duration: 0.4, ease: 'power3.in' })
    .to(gateOverlay, { opacity: 0, duration: 0.3, ease: 'power2.inOut' }, '-=0.2')
    .call(() => {
      try {
        gateOverlay.style.pointerEvents = 'none';
        gateOverlay.style.display = 'none';
        const ca = document.getElementById('caBanner');
        const nav = document.querySelector('.navbar');
        const cur = document.getElementById('cursor');
        if (ca) ca.classList.add('visible');
        if (nav) nav.classList.add('visible');
        const isMobile = window.matchMedia('(hover: none), (pointer: coarse)').matches;
        if (cur && !isMobile) cur.classList.add('active');
      } catch (_) {}
    })
    .from('.hero-title', { scale: 2, opacity: 0, duration: 0.8, ease: 'power3.out', clearProps: 'all' })
    .from('.hero-subtitle', { y: 20, opacity: 0, duration: 0.5, ease: 'power3.out', clearProps: 'all' }, '-=0.3')
    .from('.hero-char', {
      opacity: 0, scale: 0, stagger: 0.1, duration: 0.6, ease: 'back.out(1.7)',
      clearProps: 'opacity', // keep transform-origin etc, only opacity needs forced clear
      onComplete: () => {
        if (typeof window.spawnMoneyBurst === 'function') {
          const targets = [];
          document.querySelectorAll('.hc-left, .hc-right').forEach(el => {
            if (getComputedStyle(el).display === 'none') return;
            const r = el.getBoundingClientRect();
            if (r.width === 0) return;
            targets.push({ x: r.left + r.width * 0.5, y: r.top + r.height * 0.3, count: 55 });
          });
          window.spawnMoneyBurst(targets);
        }
        setTimeout(() => window.startMoneyRain && window.startMoneyRain(), 900);
      }
    }, '-=0.4')
    .from('.hero-buttons', { y: 20, opacity: 0, duration: 0.5, ease: 'power3.out', clearProps: 'all' }, '-=0.3')
    .from('.hero-ticker', { y: 15, opacity: 0, duration: 0.5, ease: 'power3.out', clearProps: 'all' }, '-=0.3')
    .from('.scroll-indicator', { opacity: 0, y: 10, duration: 0.4, clearProps: 'all' }, '-=0.2');
});

// If user switches tab mid-animation and rAF gets throttled, when they return
// just snap timeline to end so nothing is left in a half-broken state.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && gateOpened) forceHeroVisible();
});

// If page is restored from bfcache (back/forward navigation) reset gate state.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) { gateOpened = false; forceHeroVisible(); }
});

// --- Custom Cursor ---
const cursor = document.getElementById('cursor');
let mouseX = 0, mouseY = 0, cursorX = 0, cursorY = 0;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

function updateCursor() {
  cursorX += (mouseX - cursorX) * 0.15;
  cursorY += (mouseY - cursorY) * 0.15;
  cursor.style.left = cursorX + 'px';
  cursor.style.top = cursorY + 'px';
  requestAnimationFrame(updateCursor);
}
updateCursor();

document.querySelectorAll('a, button, .about-card, .scenario, .gallery-item').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
});

// --- Hover trail: spawn $ symbols while hovering cards/images ---
let lastHoverEmit = 0;
document.querySelectorAll('.gallery-item, .about-card, .scenario, .hero-char').forEach(el => {
  el.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - lastHoverEmit < 110) return;
    lastHoverEmit = now;
    spawnDollar(e.clientX, e.clientY);
  });
});

// --- $ on Click (anywhere except gate) ---
let lastClickEmit = 0;
document.addEventListener('click', (e) => {
  if (e.target.closest('#gateOverlay')) return;
  const now = Date.now();
  if (now - lastClickEmit < 100) return;
  lastClickEmit = now;
  spawnDollar(e.clientX, e.clientY);
});

function spawnDollar(x, y) {
  const el = document.createElement('div');
  el.textContent = '$';
  const useGreen = Math.random() > 0.5;
  const color = useGreen ? '#2ECC71' : '#FF2A2A';
  const glow = useGreen ? 'rgba(46,204,113,0.55)' : 'rgba(255,42,42,0.55)';
  el.style.cssText = `
    position: fixed; left: ${x}px; top: ${y}px;
    font-family: 'Orbitron', 'Inter', sans-serif; font-weight: 900;
    font-size: ${24 + Math.random() * 36}px;
    color: ${color}; pointer-events: none; z-index: 99997;
    text-shadow: 0 0 10px ${glow};
    transform: translate(-50%, -50%);
  `;
  document.body.appendChild(el);

  gsap.to(el, {
    y: -(50 + Math.random() * 80),
    x: (Math.random() - 0.5) * 100,
    opacity: 0,
    scale: 1.5 + Math.random(),
    rotation: (Math.random() - 0.5) * 40,
    duration: 0.8 + Math.random() * 0.4,
    ease: 'power2.out',
    onComplete: () => el.remove()
  });
}

// --- ScrollTrigger Reveals ---
// Wrap in try so a CDN failure on the ScrollTrigger script doesn't kill the
// rest of app.js (and leave hero stuck in a partial state)
try {
  if (typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    document.querySelectorAll('.reveal-text').forEach(el => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        onEnter: () => el.classList.add('revealed'),
        once: true
      });
    });
    document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right').forEach(el => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 90%',
        onEnter: () => el.classList.add('revealed'),
        once: true
      });
    });
  } else {
    // Fallback: if ScrollTrigger isn't loaded, mark all reveal targets visible
    document.querySelectorAll('.reveal-text, .reveal-up, .reveal-left, .reveal-right').forEach(el => el.classList.add('revealed'));
  }
} catch (_) {
  document.querySelectorAll('.reveal-text, .reveal-up, .reveal-left, .reveal-right').forEach(el => el.classList.add('revealed'));
}

// --- Beat-driven hero pulse via Web Audio analyser ---
let audioCtx, analyser, freqData;
function setupBeatPulse() {
  if (audioCtx) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
    const src = audioCtx.createMediaElementSource(richTrack);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.65;
    src.connect(analyser);
    analyser.connect(audioCtx.destination);
    freqData = new Uint8Array(analyser.frequencyBinCount);
    runBeatLoop();
  } catch (_) {}
}
function runBeatLoop() {
  const left = document.querySelector('.hc-left');
  const right = document.querySelector('.hc-right');
  function tick() {
    if (analyser && freqData) {
      analyser.getByteFrequencyData(freqData);
      let bass = 0;
      for (let i = 0; i < 8; i++) bass += freqData[i];
      bass = (bass / 8) / 255; // 0..1
      const s = 1 + bass * 0.22;
      // Bass peak → drop grayscale (full color); quiet → fully grayscale
      const gs = Math.max(0, 1 - bass * 3);
      const filter = `grayscale(${gs}) drop-shadow(0 20px 40px rgba(0,0,0,0.6))`;
      if (left) {
        left.style.transform = `scale(${s})`;
        left.style.filter = filter;
      }
      if (right) {
        right.style.transform = `scale(${s})`;
        right.style.filter = filter;
      }
    }
    requestAnimationFrame(tick);
  }
  tick();
}

// --- Navbar hide/show on scroll ---
let lastScrollY = 0;
window.addEventListener('scroll', () => {
  const nav = document.querySelector('.navbar');
  if (window.scrollY > lastScrollY && window.scrollY > 100) {
    nav.style.transform = 'translateY(-100%)';
  } else {
    nav.style.transform = 'translateY(0)';
  }
  lastScrollY = window.scrollY;
});

// --- Copy CA (banner) ---
document.getElementById('caBannerCopy').addEventListener('click', (e) => {
  e.stopPropagation();
  const addr = document.getElementById('caBannerAddr').textContent;
  navigator.clipboard.writeText(addr).then(() => {
    const btn = document.getElementById('caBannerCopy');
    btn.textContent = 'STACKED!';
    setTimeout(() => btn.textContent = 'COPY', 1500);
  });
});

// --- Copy CA (tokenomics) ---
document.getElementById('caCopy').addEventListener('click', (e) => {
  e.stopPropagation();
  const addr = document.getElementById('caAddress').textContent;
  navigator.clipboard.writeText(addr).then(() => {
    const btn = document.getElementById('caCopy');
    btn.textContent = 'STACKED!';
    setTimeout(() => btn.textContent = 'COPY', 1500);
  });
});

// --- Money Canvas: ambient rain + burst-from-character ---
(function initMoneyCanvas() {
  const canvas = document.getElementById('moneyCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  const particleSprites = [
    { img: new Image(), aspect: 1, ready: false },
    { img: new Image(), aspect: 1, ready: false },
  ];
  particleSprites[0].img.src = 'assets/images/gpt.png';
  particleSprites[1].img.src = 'assets/images/grok.png';
  particleSprites.forEach((sprite) => {
    sprite.img.onload = () => {
      sprite.ready = true;
      if (sprite.img.naturalWidth && sprite.img.naturalHeight) {
        sprite.aspect = sprite.img.naturalWidth / sprite.img.naturalHeight;
      }
    };
  });
  const particles = [];
  const AMBIENT_COUNT = 30;
  const GRAVITY = 0.06;
  const DRAG = 0.992;

  function makeAmbient(fromTop) {
    const spriteIndex = Math.random() < 0.5 ? 0 : 1;
    return {
      x: Math.random() * width,
      y: fromTop ? -(80 + Math.random() * 120) : Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: 0.4 + Math.random() * 0.9,
      size: 60 + Math.random() * 80,
      opacity: 0.22 + Math.random() * 0.4,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.04,
      burst: false,
      spriteIndex,
    };
  }

  function burstAt(x, y, count) {
    for (let i = 0; i < count; i++) {
      // Bias upward but spray wide (so it looks like exploding from body)
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const speed = 8 + Math.random() * 14;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 70 + Math.random() * 90,
        opacity: 0.85 + Math.random() * 0.15,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.18,
        burst: true,
        spriteIndex: Math.random() < 0.5 ? 0 : 1,
      });
    }
  }

  let ambientStarted = false;
  function startAmbient() {
    if (ambientStarted) return;
    ambientStarted = true;
    // Trickle in: spawn one ambient particle every 80ms until we hit AMBIENT_COUNT
    let added = 0;
    const id = setInterval(() => {
      if (added >= AMBIENT_COUNT) { clearInterval(id); return; }
      particles.push(makeAmbient(true)); // from top so they fall in naturally
      added++;
    }, 80);
  }

  function init() {
    resize();
    // start empty — characters appear → burst → then ambient kicks in
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const sprite = particleSprites[p.spriteIndex] || particleSprites[0];
      if (!sprite.ready) continue;
        p.vy += GRAVITY;
        p.vx *= DRAG;
        p.spin *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;

        const w = p.size;
        const h = w / sprite.aspect;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.drawImage(sprite.img, -w / 2, -h / 2, w, h);
        ctx.restore();

        if (p.y > height + 100 || p.x < -200 || p.x > width + 200) {
          if (p.burst) particles.splice(i, 1);
          else particles[i] = makeAmbient(true);
        }
    }
    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', resize);
  init();
  animate();

  // Expose hooks
  window.spawnMoneyBurst = function (targets, perTarget = 50) {
    targets.forEach(t => burstAt(t.x, t.y, t.count || perTarget));
  };
  window.startMoneyRain = startAmbient;
})();

// --- Scroll-triggered $ burst ---
let lastScrollEmit = 0;
let scrollEmitTimeout;
window.addEventListener('scroll', () => {
  const now = Date.now();
  if (now - lastScrollEmit < 2000) return;
  lastScrollEmit = now;

  clearTimeout(scrollEmitTimeout);
  scrollEmitTimeout = setTimeout(() => {
    if (Math.random() > 0.7) {
      const x = Math.random() * window.innerWidth * 0.6 + window.innerWidth * 0.2;
      const y = Math.random() * window.innerHeight * 0.6 + window.innerHeight * 0.2;
      spawnDollar(x, y);
    }
  }, 100);
});

// --- Gallery item click = burst of $ ---
document.querySelectorAll('.gallery-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.stopPropagation();
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        spawnDollar(
          e.clientX + (Math.random() - 0.5) * 200,
          e.clientY + (Math.random() - 0.5) * 200
        );
      }, i * 80);
    }
  });
});

// --- Konami: type "rich" for mega money rain ---
let keyBuffer = '';
document.addEventListener('keydown', (e) => {
  keyBuffer += e.key.toLowerCase();
  if (keyBuffer.length > 10) keyBuffer = keyBuffer.slice(-10);
  if (keyBuffer.includes('rich')) {
    keyBuffer = '';
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        spawnDollar(
          Math.random() * window.innerWidth,
          Math.random() * window.innerHeight
        );
      }, i * 50);
    }
  }
});
