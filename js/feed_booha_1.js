
// =====================================================
// Feed Booha — Engine (v3)
// =====================================================
// Portrait mode (540×960)
// [NEW] Cover-fit background rendering
// [NEW] Animated star particle bg layer
// [NEW] Catenary rope with braided highlight
// [NEW] Booha horizontal patrol with edge ease
// [NEW] Magnet pull assist near mouth
// [NEW] Candy trail when fast
// [NEW] Screen shake on bounce
// [NEW] Booha last-chance jump
// [NEW] Fan object (tap for side push)
// [NEW] Delayed-cut rope type
// [NEW] Booha reacts toward miss direction
// =====================================================

(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx    = canvas.getContext('2d');

  const startOverlay   = document.getElementById('startOverlay');
  const messageOverlay = document.getElementById('messageOverlay');
  const helpPanel      = document.getElementById('helpPanel');
  const startBtn       = document.getElementById('startBtn');
  const restartBtn     = document.getElementById('restartBtn');
  const retryBtn       = document.getElementById('retryBtn');
  const nextBtn        = document.getElementById('nextBtn');
  const helpBtn        = document.getElementById('helpBtn');
  const closeHelpBtn   = document.getElementById('closeHelpBtn');
  const LEVELS         = window.FEED_BOOHA_LEVELS || [];
  const levelText      = document.getElementById('levelText');
  const goalText       = document.getElementById('goalText');
  const stateText      = document.getElementById('stateText');
  const messageTitle   = document.getElementById('messageTitle');
  const messageText    = document.getElementById('messageText');

  let starContainer = null;

  const W       = canvas.width;   // 540
  const H       = canvas.height;  // 960
  const FLOOR_Y = H - 60;

  const GRAVITY            = 0.45;
  const AIR_DRAG           = 0.999;
  const ROPE_CUT_RADIUS    = 28;
  const BOOHA_W            = 160;
  const BOOHA_H            = 160;
  const CANDY_R            = 26;
  const MOUTH_TRIGGER_DIST = 150;
  const SURPRISED_TRIGGER  = 80;
  const FAIL_BUFFER        = 36;
  const TRAIL_LENGTH       = 8;
  const TRAIL_SPEED_THRESH = 6;
  const MAGNET_DIST        = 130;
  const MAGNET_FORCE       = 0.38;
  const LAST_CHANCE_DIST   = 90;

  const swipe        = { active: false, x0: 0, y0: 0, x1: 0, y1: 0 };
  const slashEffects = [];

  const images = {};
  const sounds = {};

  const imageSources = {
    bg:           './assets/img/feed_booha-1.png',
    booEat:       './assets/img/boo-eat.png',
    booMouthOpen: './assets/img/boo-mouth-open.png',
    booSad:       './assets/img/boo-sad.png',
    booSurprised: './assets/img/boo-surprised.png',
    booWait:      './assets/img/boo-wait.png',
    booWin:       './assets/img/boo-win.png',
    candy:        './assets/img/candy.png'
  };

  const audioSources = {
    get1:    './assets/audio/get-1.mp3',
    get2:    './assets/audio/get-2.mp3',
    get3:    './assets/audio/get-3.mp3',
    get4:    './assets/audio/get-4.mp3',
    miss1:   './assets/audio/miss-1.mp3',
    miss2:   './assets/audio/miss-2.mp3',
    miss3:   './assets/audio/miss-3.mp3',
    bounce1: './assets/audio/bounce-1.mp3'
  };

  const state = {
    started: false,
    levelIndex: 0,
    running: false,
    won: false,
    lost: false,
    cutCount: 0,
    currentLevel: null,
    candy: null,
    ropes: [],
    objects: [],
    booha: null,
    boohaSprite: 'booWait',
    effectTimers: [],
    lastTime: 0,
    bounceCooldown: 0,
    pendingSuccessTimeout: null,
    pendingFailTimeout: null,
    bouncePattern: null,
    shakeFrames: 0,
    shakeAmt: 0,
    trail: [],
    lastChanceFired: false,
    boohaJumpOffset: 0,
    boohaJumpFrame: 0,
    cutTimers: {},
    bgStars: [],
    missDir: 0
  };

  // ─────────────────────────────────────────────────
  // Assets
  // ─────────────────────────────────────────────────
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function preloadAssets() {
    for (const [key, src] of Object.entries(imageSources)) {
      try { images[key] = await loadImage(src); }
      catch (e) { console.warn('Image failed:', src); }
    }
    for (const [key, src] of Object.entries(audioSources)) {
      const a = new Audio(src);
      a.preload = 'auto';
      sounds[key] = a;
    }
    buildBouncePattern();
    initBgStars();
  }

  function buildBouncePattern() {
    const sz = 12;
    const pc = document.createElement('canvas');
    pc.width = sz; pc.height = sz;
    const px = pc.getContext('2d');
    px.fillStyle = '#ff8fd1';
    px.fillRect(0, 0, sz, sz);
    px.strokeStyle = 'rgba(255,255,255,0.45)';
    px.lineWidth = 2;
    px.beginPath(); px.moveTo(0, sz); px.lineTo(sz, 0); px.stroke();
    state.bouncePattern = ctx.createPattern(pc, 'repeat');
  }

  // ─────────────────────────────────────────────────
  // Candy kingdom background — animated bubbles + sparkles
  // ─────────────────────────────────────────────────
  function initBgStars() {
    state.bgStars = [];
    // Bubbles
    for (let i = 0; i < 22; i++) {
      state.bgStars.push({
        kind:  'bubble',
        x:     Math.random() * W,
        y:     Math.random() * H,
        r:     Math.random() * 28 + 8,
        speed: Math.random() * 0.35 + 0.12,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.03 + 0.01,
        alpha: Math.random() * 0.13 + 0.05
      });
    }
    // Sparkle stars
    for (let i = 0; i < 40; i++) {
      state.bgStars.push({
        kind:  'sparkle',
        x:     Math.random() * W,
        y:     Math.random() * H,
        r:     Math.random() * 1.8 + 0.4,
        phase: Math.random() * Math.PI * 2,
        pulse: Math.random() * 0.5 + 0.3,
        alpha: 0
      });
    }
  }

  function updateBgStars(dt) {
    const t = state.lastTime * 0.001;
    for (const s of state.bgStars) {
      if (s.kind === 'bubble') {
        s.y -= s.speed * dt * 0.06;
        s.wobble += s.wobbleSpeed * dt * 0.06;
        s.x += Math.sin(s.wobble) * 0.4;
        if (s.y < -s.r * 2) {
          s.y = H + s.r;
          s.x = Math.random() * W;
        }
      } else {
        s.alpha = s.pulse * (0.5 + 0.5 * Math.sin(t * 1.4 + s.phase));
      }
    }
  }

  function drawBgStars() {
    for (const s of state.bgStars) {
      if (s.kind === 'bubble') {
        ctx.save();
        ctx.globalAlpha = s.alpha;
        // Bubble ring
        ctx.strokeStyle = '#ffccee';
        ctx.lineWidth   = 1.2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.stroke();
        // Shine dot
        ctx.globalAlpha = s.alpha * 0.7;
        ctx.fillStyle   = '#fff';
        ctx.beginPath();
        ctx.arc(s.x - s.r * 0.28, s.y - s.r * 0.3, s.r * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalAlpha = s.alpha * 0.65;
        ctx.fillStyle   = '#ffddff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function playSfx(key, loop = false) {
    const src = audioSources[key];
    if (!src) return null;
    const a = new Audio(src);
    a.loop   = loop;
    a.volume = 1;
    a.play().catch(() => {});
    return a;
  }

  // ─────────────────────────────────────────────────
  // Timers
  // ─────────────────────────────────────────────────
  function stopAllTimers() {
    if (state.pendingSuccessTimeout) { clearTimeout(state.pendingSuccessTimeout); state.pendingSuccessTimeout = null; }
    if (state.pendingFailTimeout)    { clearTimeout(state.pendingFailTimeout);    state.pendingFailTimeout    = null; }
    for (const id of state.effectTimers) clearTimeout(id);
    state.effectTimers.length = 0;
    for (const id of Object.values(state.cutTimers)) clearTimeout(id);
    state.cutTimers = {};
  }

  function setHud(lvl, status) {
    levelText.textContent = String(lvl);
    goalText.textContent  = 'Feed Booha';
    stateText.textContent = status;
  }

  function cloneLevel(l) { return JSON.parse(JSON.stringify(l)); }

  // ─────────────────────────────────────────────────
  // Stars UI
  // ─────────────────────────────────────────────────
  function buildStarUI() {
    if (starContainer) return;
    const card = messageOverlay.querySelector('.overlay-card');
    if (!card) return;
    starContainer = document.createElement('div');
    starContainer.id = 'starRating';
    starContainer.style.cssText = 'display:flex;justify-content:center;gap:6px;margin:8px 0 4px;font-size:28px;';
    const p = card.querySelector('p');
    if (p) p.after(starContainer); else card.prepend(starContainer);
  }

  function showStars(cutCount) {
    buildStarUI();
    if (!starContainer) return;
    const stars = cutCount <= 1 ? 3 : cutCount === 2 ? 2 : 1;
    starContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('span');
      s.textContent = i < stars ? '★' : '☆';
      s.style.color = i < stars ? '#ffcc00' : 'rgba(255,255,255,0.25)';
      starContainer.appendChild(s);
    }
  }

  // ─────────────────────────────────────────────────
  // Level build
  // ─────────────────────────────────────────────────
  function buildLevel(index) {
    stopAllTimers();
    slashEffects.length = 0;
    state.trail.length  = 0;

    const rawLevel = LEVELS[index] || LEVELS[0];
    if (!rawLevel) { console.error('No level data.'); return; }
    const level = cloneLevel(rawLevel);

    state.currentLevel    = level;
    state.cutCount        = 0;
    state.won             = false;
    state.lost            = false;
    state.missDir         = 0;
    state.running         = true;
    state.boohaSprite     = 'booWait';
    state.effectTimers.length = 0;
    state.cutTimers       = {};
    state.bounceCooldown  = 0;
    state.shakeFrames     = 0;
    state.lastChanceFired = false;
    state.boohaJumpOffset = 0;
    state.boohaJumpFrame  = 0;

    // Kick candy sideways toward center so pendulum swings immediately
    const kickDir = level.candy.x >= W / 2 ? -1 : 1;
    state.candy = {
      x: level.candy.x, y: level.candy.y,
      vx: kickDir * 4.5, vy: 0,
      r: CANDY_R, attached: true, alive: true
    };

    state.ropes = (level.ropes || []).map(r => {
      const dx  = level.candy.x - r.anchor.x;
      const dy  = level.candy.y - r.anchor.y;
      const len = Math.hypot(dx, dy);
      return {
        id:      r.id,
        anchor:  { x: r.anchor.x, y: r.anchor.y },
        cut:     false,
        type:    r.type    || 'normal',
        delayMs: r.delayMs || 400,
        pending: false,
        length:  len
      };
    });

    state.objects = (level.objects || []).map(o => ({
      ...o, activated: false, fanTimer: 0
    }));

    state.booha = {
      x:        level.booha.x,
      y:        level.booha.y,
      baseX:    level.booha.x,
      baseY:    level.booha.y,
      behavior: level.booha.behavior || 'idle',
      range:    level.booha.range    || null,
      speed:    level.booha.speed    || 0,
      dir: 1, w: BOOHA_W, h: BOOHA_H
    };

    setHud(index + 1, 'Ready');
  }

  // ─────────────────────────────────────────────────
  // Flow
  // ─────────────────────────────────────────────────
  function startGame() {
    if (!LEVELS.length) { console.error('No levels.'); return; }
    state.started = true;
    startOverlay.classList.remove('overlay--show');
    startOverlay.setAttribute('aria-hidden', 'true');
    setTimeout(() => { startOverlay.style.display = 'none'; }, 280);
    buildLevel(state.levelIndex);
  }

  function resetLevel() { buildLevel(state.levelIndex); }

  function nextLevel() {
    state.levelIndex = (state.levelIndex + 1) % LEVELS.length;
    hideMessage();
    buildLevel(state.levelIndex);
  }

  function showMessage(title, text, nextVisible = true, cutCount = 0) {
    messageTitle.textContent = title;
    messageText.textContent  = text;
    nextBtn.style.display    = nextVisible ? 'inline-flex' : 'none';
    if (nextVisible) showStars(cutCount);
    else if (starContainer) starContainer.innerHTML = '';
    messageOverlay.classList.add('overlay--show');
    messageOverlay.setAttribute('aria-hidden', 'false');
  }

  function hideMessage() {
    messageOverlay.classList.remove('overlay--show');
    messageOverlay.setAttribute('aria-hidden', 'true');
  }

  function toggleHelp(show) {
    helpPanel.classList.toggle('help-panel--show', show);
    helpPanel.setAttribute('aria-hidden', String(!show));
  }

  function getActiveRopes() {
    return state.ropes.filter(r => !r.cut && !r.pending);
  }

  // ─────────────────────────────────────────────────
  // Booha
  // ─────────────────────────────────────────────────
  function updateBooha(dt) {
    if (!state.booha) return;
    const b = state.booha;

    if (b.behavior === 'horizontal' && b.range) {
      const distToEdge = b.dir > 0 ? b.range.max - b.x : b.x - b.range.min;
      const edgeFactor = Math.min(1, distToEdge / 20);
      b.x += b.speed * b.dir * edgeFactor * dt * 0.06;
      if (b.x <= b.range.min)      { b.x = b.range.min; b.dir =  1; }
      else if (b.x >= b.range.max) { b.x = b.range.max; b.dir = -1; }
    }

    if (state.boohaJumpFrame > 0) {
      state.boohaJumpFrame--;
      const p = 1 - state.boohaJumpFrame / 16;
      state.boohaJumpOffset = -18 * Math.sin(p * Math.PI);
      if (state.boohaJumpFrame === 0) state.boohaJumpOffset = 0;
    }
  }

  function averageAnchor() {
    const active = getActiveRopes();
    if (!active.length) return null;
    let sx = 0, sy = 0;
    for (const r of active) { sx += r.anchor.x; sy += r.anchor.y; }
    return { x: sx / active.length, y: sy / active.length };
  }

  function dtLerp(from, to, k, dt) {
    return from + (to - from) * (1 - Math.pow(1 - k, dt / 16.667));
  }

  function updateAttachedCandy(dt) {
    const active = getActiveRopes();
    if (!active.length) { state.candy.attached = false; return; }

    const c     = state.candy;
    const steps = 3;
    const subDt = dt / steps;

    for (let s = 0; s < steps; s++) {
      // Gravity — no damping, let energy stay in the system
      c.vy += GRAVITY * subDt / 16.667;

      // Integrate
      c.x += c.vx * subDt / 16.667;
      c.y += c.vy * subDt / 16.667;

      // Rope length constraint — position correction only, no velocity strip
      for (const rope of active) {
        const dx   = c.x - rope.anchor.x;
        const dy   = c.y - rope.anchor.y;
        const dist = Math.hypot(dx, dy);
        const len  = rope.length || 120;
        if (dist < 0.001 || dist <= len) continue;
        // Push candy back to rope radius
        const over = (dist - len) / dist;
        c.x -= dx * over;
        c.y -= dy * over;
        // Reflect velocity so rope acts as a rigid constraint, not a brake
        const nx = dx / dist, ny = dy / dist;
        const vDotN = c.vx * nx + c.vy * ny;
        if (vDotN > 0) {
          c.vx -= vDotN * nx;
          c.vy -= vDotN * ny;
        }
      }
    }

    // Very light air resistance — just enough to stop infinite oscillation
    c.vx *= 0.999;
    c.vy *= 0.999;
  }

  function applyMagnet() {
    if (!state.booha || state.won || state.lost) return;
    const c     = state.candy;
    const mouth = boohaMouthPoint();
    const dx    = mouth.x - c.x;
    const dy    = mouth.y - c.y;
    const dist  = Math.hypot(dx, dy);
    if (dist > MAGNET_DIST || dist < 1) return;
    const strength = MAGNET_FORCE * (1 - dist / MAGNET_DIST);
    c.vx += (dx / dist) * strength;
    c.vy += (dy / dist) * strength;
  }

  function updateFans(dt) {
    const c = state.candy;
    if (!c || c.attached) return;
    for (const obj of state.objects) {
      if (obj.type !== 'fan' || obj.fanTimer <= 0) continue;
      obj.fanTimer -= dt;
      const force = 0.55;
      const dir   = obj.direction || 'right';
      if (dir === 'right') c.vx += force;
      if (dir === 'left')  c.vx -= force;
      if (dir === 'up')    c.vy -= force * 1.2;
    }
  }

  function activateFan(obj) {
    if (obj.fanTimer > 0) return;
    obj.fanTimer = 600;
    playSfx('bounce1');
    if (navigator.vibrate) navigator.vibrate(30);
  }

  function updateFreeCandy() {
    const c = state.candy;
    c.vy += GRAVITY;
    c.x  += c.vx;
    c.y  += c.vy;
    c.vx *= AIR_DRAG;
    c.vy *= AIR_DRAG;
  }

  function updateTrail() {
    const c = state.candy;
    if (!c || c.attached) { state.trail.length = 0; return; }
    if (Math.hypot(c.vx, c.vy) >= TRAIL_SPEED_THRESH) {
      state.trail.unshift({ x: c.x, y: c.y, alpha: 1 });
      if (state.trail.length > TRAIL_LENGTH) state.trail.length = TRAIL_LENGTH;
    }
    for (const t of state.trail) t.alpha -= 0.12;
    for (let i = state.trail.length - 1; i >= 0; i--) {
      if (state.trail[i].alpha <= 0) state.trail.splice(i, 1);
    }
  }

  function handleBouncePads() {
    if (state.bounceCooldown > 0) state.bounceCooldown--;
    const c = state.candy;
    if (!c || c.attached) return;
    for (const obj of state.objects) {
      if (obj.type !== 'bounce') continue;
      const left = obj.x - obj.width/2, right = obj.x + obj.width/2;
      const top  = obj.y - obj.height/2;
      if (c.x+c.r > left && c.x-c.r < right &&
          c.y+c.r >= top  && c.y+c.r <= top+22 && c.vy > 0) {
        c.y  = top - c.r;
        c.vy = -Math.max(10, c.vy * 0.95);
        c.vx *= 1.02;
        if (state.bounceCooldown <= 0) {
          playSfx('bounce1');
          state.shakeFrames = 7;
          state.shakeAmt    = 3;
          state.bounceCooldown = 8;
        }
      }
    }
  }

  function checkLastChance() {
    if (state.lastChanceFired || state.won || state.lost) return;
    const c = state.candy;
    if (!c || c.attached) return;
    if (c.y + c.r >= FLOOR_Y - LAST_CHANCE_DIST && c.vy > 0) {
      state.lastChanceFired = true;
      state.boohaJumpFrame  = 16;
    }
  }

  function boohaMouthPoint() {
    return { x: state.booha.x, y: state.booha.y + state.boohaJumpOffset - 12 };
  }

  function updateBoohaMood() {
    if (state.won || state.lost) return;
    const c    = state.candy;
    const mouth = boohaMouthPoint();
    const dist  = Math.hypot(c.x - mouth.x, c.y - mouth.y);
    if (dist < SURPRISED_TRIGGER && !c.attached) {
      state.boohaSprite = 'booSurprised';
      setHud(state.levelIndex + 1, 'Almost!');
    } else if (dist < MOUTH_TRIGGER_DIST && !c.attached) {
      state.boohaSprite = 'booMouthOpen';
      setHud(state.levelIndex + 1, 'Open wide');
    } else {
      state.boohaSprite = 'booWait';
      setHud(state.levelIndex + 1, state.cutCount > 0 ? 'Falling' : 'Ready');
    }
  }

  function checkSuccess() {
    if (state.won || state.lost) return;
    const c     = state.candy;
    const mouth = boohaMouthPoint();
    if (Math.hypot(c.x - mouth.x, c.y - mouth.y) >= 52) return;

    state.won = true; state.running = false; state.candy.alive = false;
    state.boohaSprite = 'booEat';
    setHud(state.levelIndex + 1, 'Yum!');
    playSfx('get1');
    const t1 = setTimeout(() => playSfx('get2'), 180);
    const t2 = setTimeout(() => playSfx('get3'), 360);
    state.effectTimers.push(t1, t2);
    const loopAudio = playSfx('get4', true);
    const cuts = state.cutCount;
    state.pendingSuccessTimeout = setTimeout(() => {
      state.boohaSprite = 'booWin';
      if (loopAudio) setTimeout(() => { loopAudio.pause(); loopAudio.currentTime = 0; }, 500);
      showMessage('Nice!', 'Booha is happy.', true, cuts);
    }, 520);
  }

  function checkFail() {
    if (state.won || state.lost) return;
    const c = state.candy;
    if (c.y + c.r < FLOOR_Y - FAIL_BUFFER) return;

    state.lost = true; state.running = false;
    const mouth = boohaMouthPoint();
    state.missDir     = c.x < mouth.x ? -1 : 1;
    state.boohaSprite = 'booSad';
    setHud(state.levelIndex + 1, 'Miss');
    const missSfx = ['miss1','miss2','miss3'];
    playSfx(missSfx[Math.floor(Math.random() * missSfx.length)]);

    state.pendingFailTimeout = setTimeout(() => {
      showMessage('Oops!', 'Booha missed the candy.', false);
      state.pendingFailTimeout = setTimeout(() => { hideMessage(); resetLevel(); }, 650);
    }, 260);
  }

  function clampCandyToFloor() {
    const c = state.candy;
    if (c.y + c.r > FLOOR_Y && !state.won) {
      c.y = FLOOR_Y - c.r; c.vx *= 0.95; c.vy = 0;
    }
  }

  // ─────────────────────────────────────────────────
  // Rope cutting
  // ─────────────────────────────────────────────────
  function spawnSlash(rope) {
    const c  = state.candy;
    const mx = (rope.anchor.x + c.x) / 2;
    const my = (rope.anchor.y + c.y) / 2;
    slashEffects.push({
      x: mx, y: my,
      angle: Math.atan2(c.y - rope.anchor.y, c.x - rope.anchor.x),
      life: 1.0
    });
  }

  function tryCutRope(rope) {
    if (rope.cut || rope.pending) return false;
    if (rope.type === 'delayed') {
      rope.pending = true;
      setHud(state.levelIndex + 1, 'Cutting...');
      const id = setTimeout(() => {
        rope.cut = true; rope.pending = false;
        state.cutCount++;
        spawnSlash(rope);
        if (navigator.vibrate) navigator.vibrate(40);
        if (!getActiveRopes().length) state.candy.attached = false;
        setHud(state.levelIndex + 1, 'Cut!');
      }, rope.delayMs);
      state.cutTimers[rope.id] = id;
      return true;
    }
    rope.cut = true;
    state.cutCount++;
    spawnSlash(rope);
    if (navigator.vibrate) navigator.vibrate(40);
    if (!getActiveRopes().length) state.candy.attached = false;
    setHud(state.levelIndex + 1, 'Cut!');
    return true;
  }

  function cutNearestRope(mx, my) {
    if (!state.currentLevel || state.won || state.lost) return;
    const active = state.ropes.filter(r => !r.cut && !r.pending);
    if (!active.length) return;
    let best = null, bestDist = Infinity;
    for (const rope of active) {
      const d = distPtSeg(mx, my, rope.anchor.x, rope.anchor.y, state.candy.x, state.candy.y);
      if (d < bestDist) { bestDist = d; best = rope; }
    }
    if (best && bestDist <= ROPE_CUT_RADIUS) tryCutRope(best);
  }

  function tapObjects(mx, my) {
    for (const obj of state.objects) {
      if (obj.type !== 'fan') continue;
      if (Math.hypot(mx - obj.x, my - obj.y) < 44) { activateFan(obj); return true; }
    }
    return false;
  }

  function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
    const d1x = bx-ax, d1y = by-ay, d2x = dx-cx, d2y = dy-cy;
    const cross = d1x*d2y - d1y*d2x;
    if (Math.abs(cross) < 1e-10) return false;
    const t = ((cx-ax)*d2y - (cy-ay)*d2x) / cross;
    const u = ((cx-ax)*d1y - (cy-ay)*d1x) / cross;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  function checkSwipeCuts() {
    if (!state.currentLevel || state.won || state.lost) return;
    for (const rope of state.ropes.filter(r => !r.cut && !r.pending)) {
      if (segmentsIntersect(
        swipe.x0, swipe.y0, swipe.x1, swipe.y1,
        rope.anchor.x, rope.anchor.y, state.candy.x, state.candy.y
      )) tryCutRope(rope);
    }
  }

  function distPtSeg(px, py, x1, y1, x2, y2) {
    const A = px-x1, B = py-y1, C = x2-x1, D = y2-y1;
    const lenSq = C*C + D*D;
    const t = lenSq ? Math.max(0, Math.min(1, (A*C+B*D)/lenSq)) : 0;
    return Math.hypot(px-(x1+C*t), py-(y1+D*t));
  }

  // ─────────────────────────────────────────────────
  // Update
  // ─────────────────────────────────────────────────
  function update(dt) {
    if (!state.started || !state.currentLevel) return;
    updateBgStars(dt);
    updateBooha(dt);
    updateTrail();
    if (state.shakeFrames > 0) state.shakeFrames--;

    if (state.running) {
      if (state.candy.attached) {
        updateAttachedCandy(dt);
      } else {
        applyMagnet();
        updateFreeCandy();
        updateFans(dt);
        handleBouncePads();
        checkLastChance();
        checkSuccess();
        checkFail();
        clampCandyToFloor();
      }
      updateBoohaMood();
    }

    for (let i = slashEffects.length-1; i >= 0; i--) {
      slashEffects[i].life -= dt * 0.07;
      if (slashEffects[i].life <= 0) slashEffects.splice(i, 1);
    }
  }

  // ─────────────────────────────────────────────────
  // Draw
  // ─────────────────────────────────────────────────
  function drawBackground() {
    // Layer 1 — candy kingdom gradient (always visible at edges / if no image)
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,    '#2d0050');
    grad.addColorStop(0.45, '#6b0080');
    grad.addColorStop(0.8,  '#c0306a');
    grad.addColorStop(1,    '#ff66aa');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Layer 2 — user background image (cover-fit, full opacity, on top of gradient)
    if (images.bg) {
      const img   = images.bg;
      const scale = Math.max(W / img.width, H / img.height);
      const dw    = img.width  * scale;
      const dh    = img.height * scale;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    }

    // Layer 3 — candy kingdom bubble/sparkle effects float over image
    drawBgStars();
  }

  function drawFloor() {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
  }

  function drawRopes() {
    const c = state.candy;
    for (const rope of state.ropes) {
      if (rope.cut) continue;
      const ax = rope.anchor.x, ay = rope.anchor.y;
      const bx = c.x, by = c.y;
      const mx = (ax+bx)/2, my = (ay+by)/2;

      // Sag based on rope's natural length vs current straight-line distance
      // More sag when candy swings inward (rope goes slack)
      const straightDist = Math.hypot(bx-ax, by-ay);
      const ropeLen      = rope.length || straightDist;
      const slack        = Math.max(0, ropeLen - straightDist);
      const sagY         = Math.min(slack * 0.5 + straightDist * 0.08, 70);

      const cpx = mx, cpy = my + sagY;
      const alpha = rope.pending ? 0.45 : 1;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Outer body
      ctx.beginPath();
      ctx.moveTo(ax, ay); ctx.quadraticCurveTo(cpx, cpy, bx, by);
      ctx.strokeStyle = '#c8a84b'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.stroke();

      // Inner highlight
      ctx.beginPath();
      ctx.moveTo(ax, ay); ctx.quadraticCurveTo(cpx, cpy, bx, by);
      ctx.strokeStyle = '#f0d070'; ctx.lineWidth = 3;
      ctx.stroke();

      // Braided twist
      ctx.setLineDash([6, 10]);
      ctx.lineDashOffset = (state.lastTime * 0.02) % 16;
      ctx.beginPath();
      ctx.moveTo(ax, ay); ctx.quadraticCurveTo(cpx, cpy, bx, by);
      ctx.strokeStyle = 'rgba(255,245,200,0.35)'; ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      // Anchor dot
      ctx.fillStyle = '#fff6cf';
      ctx.beginPath(); ctx.arc(ax, ay, 7, 0, Math.PI*2); ctx.fill();

      ctx.restore();
    }
  }

  function drawSlashEffects() {
    for (const s of slashEffects) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle + Math.PI / 4);
      const len = 40 * s.life;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4 * s.life; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-len, -len*0.3); ctx.lineTo(len, len*0.3); ctx.stroke();
      ctx.strokeStyle = '#ffdd88'; ctx.lineWidth = 2 * s.life;
      ctx.beginPath(); ctx.moveTo(-len*0.5, len*0.5); ctx.lineTo(len*0.5, -len*0.5); ctx.stroke();
      ctx.restore();
    }
  }

  function drawObjects() {
    const t = state.lastTime * 0.001;
    for (const obj of state.objects) {
      if (obj.type === 'bounce') {
        const x = obj.x - obj.width/2, y = obj.y - obj.height/2;
        ctx.save();
        ctx.fillStyle = state.bouncePattern || '#ff8fd1';
        ctx.fillRect(x, y, obj.width, obj.height);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
        ctx.strokeRect(x, y, obj.width, obj.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('▲', obj.x, obj.y);
        ctx.restore();
      }

      if (obj.type === 'fan') {
        const active = obj.fanTimer > 0;
        ctx.save();
        ctx.translate(obj.x, obj.y);
        ctx.rotate(t * (active ? 8 : 1.5));
        ctx.fillStyle = active ? '#ffcc44' : '#aaaaaa';
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 4; i++) {
          ctx.save(); ctx.rotate((Math.PI*2/4)*i);
          ctx.fillStyle = active ? 'rgba(255,200,50,0.85)' : 'rgba(180,180,180,0.7)';
          ctx.beginPath(); ctx.ellipse(0, -18, 7, 16, 0, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        }
        ctx.restore();

        // Direction arrow & tap ring
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.font = '14px system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const arrow = obj.direction === 'left' ? '←' : obj.direction === 'up' ? '↑' : '→';
        ctx.fillText(arrow, obj.x, obj.y + 28);
        if (!active) {
          ctx.strokeStyle = 'rgba(255,255,255,0.25)';
          ctx.lineWidth = 1.5; ctx.setLineDash([4,6]);
          ctx.beginPath(); ctx.arc(obj.x, obj.y, 38, 0, Math.PI*2); ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
      }
    }
  }

  function drawTrail() {
    const c = state.candy;
    if (!c || !c.alive) return;
    for (let i = 0; i < state.trail.length; i++) {
      const t     = state.trail[i];
      const ratio = 1 - i / state.trail.length;
      ctx.save();
      ctx.globalAlpha = t.alpha * ratio * 0.45;
      ctx.fillStyle   = '#ff88cc';
      ctx.beginPath();
      ctx.arc(t.x, t.y, CANDY_R * ratio * 0.8, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawCandy() {
    const c = state.candy;
    if (!c.alive) return;
    if (images.candy) {
      ctx.drawImage(images.candy, c.x-c.r, c.y-c.r, c.r*2, c.r*2);
      return;
    }
    ctx.save();
    ctx.fillStyle = '#ff5fa8';
    ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawBooha() {
    const b   = state.booha;
    const img = images[state.boohaSprite] || images.booWait;
    const yOff = state.boohaJumpOffset;
    const drawX = b.x - b.w/2 + (state.lost && state.missDir ? state.missDir * 8 : 0);
    const drawY = b.y + yOff - b.h/2;
    if (img) { ctx.drawImage(img, drawX, drawY, b.w, b.h); return; }
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(b.x, b.y + yOff, 70, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function draw() {
    const shakeX = state.shakeFrames > 0 ? (Math.random()-0.5) * state.shakeAmt * 2 : 0;
    const shakeY = state.shakeFrames > 0 ? (Math.random()-0.5) * state.shakeAmt * 2 : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    drawBackground();
    drawFloor();
    if (!state.currentLevel) { ctx.restore(); return; }
    drawObjects();
    drawRopes();
    drawSlashEffects();
    drawTrail();
    drawCandy();
    drawBooha();
    ctx.restore();
  }

  // ─────────────────────────────────────────────────
  // Main loop
  // ─────────────────────────────────────────────────
  function frame(ts) {
    const dt = state.lastTime ? ts - state.lastTime : 16.67;
    state.lastTime = ts;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  // ─────────────────────────────────────────────────
  // Input
  // ─────────────────────────────────────────────────
  function getCanvasPoint(evt) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
    const touch = evt.touches && evt.touches[0];
    return {
      x: ((touch ? touch.clientX : evt.clientX) - rect.left) * sx,
      y: ((touch ? touch.clientY : evt.clientY) - rect.top)  * sy
    };
  }

  function handleTap(p) {
    if (!state.started) return;
    if (!tapObjects(p.x, p.y)) cutNearestRope(p.x, p.y);
  }

  function bindEvents() {
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', resetLevel);
    retryBtn.addEventListener('click', () => { hideMessage(); resetLevel(); });
    nextBtn.addEventListener('click', nextLevel);
    helpBtn.addEventListener('click', () => toggleHelp(true));
    closeHelpBtn.addEventListener('click', () => toggleHelp(false));

    canvas.addEventListener('click', (evt) => { handleTap(getCanvasPoint(evt)); });

    canvas.addEventListener('touchstart', (evt) => {
      if (!state.started) return;
      evt.preventDefault();
      const p = getCanvasPoint(evt);
      swipe.active = true;
      swipe.x0 = p.x; swipe.y0 = p.y; swipe.x1 = p.x; swipe.y1 = p.y;
    }, { passive: false });

    canvas.addEventListener('touchmove', (evt) => {
      if (!state.started || !swipe.active) return;
      evt.preventDefault();
      const p = getCanvasPoint(evt);
      swipe.x1 = p.x; swipe.y1 = p.y;
      checkSwipeCuts();
      swipe.x0 = p.x; swipe.y0 = p.y;
    }, { passive: false });

    canvas.addEventListener('touchend', (evt) => {
      evt.preventDefault();
      if (Math.hypot(swipe.x1-swipe.x0, swipe.y1-swipe.y0) < 10) {
        handleTap({ x: swipe.x0, y: swipe.y0 });
      }
      swipe.active = false;
    }, { passive: false });
  }

  async function boot() {
    setHud(1, 'Loading');
    bindEvents();
    await preloadAssets();
    setHud(1, 'Ready');
    requestAnimationFrame(frame);
  }

  boot();
})();
