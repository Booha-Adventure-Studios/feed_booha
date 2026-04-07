
// =====================================================
// Feed Booha — Engine (v2)
// =====================================================
// Fixes from v1:
//   [FIX 1] Start overlay fade-out with pointer-events transition
//   [FIX 2] Floor collision check was inverted — candy never failed
//   [FIX 3] effectTimers leak — old sfx fired on new level
//   [FIX 4] Booha mouth 1-frame lag on moving levels
//   [NEW]   Rope slash visual effect on cut
//   [NEW]   Swipe-to-cut gesture (touchmove segment intersection)
//   [NEW]   Star rating on win (based on cutCount)
//   [NEW]   dt-normalised lerp for 120Hz screens
//   [NEW]   Haptic feedback on mobile cut
//   [NEW]   topbar-actions flex gap (CSS note — also patch theme)
//   [NEW]   Bounce pad striped pattern fallback
// =====================================================

(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const startOverlay   = document.getElementById('startOverlay');
  const messageOverlay = document.getElementById('messageOverlay');
  const helpPanel      = document.getElementById('helpPanel');

  const startBtn     = document.getElementById('startBtn');
  const restartBtn   = document.getElementById('restartBtn');
  const retryBtn     = document.getElementById('retryBtn');
  const nextBtn      = document.getElementById('nextBtn');
  const helpBtn      = document.getElementById('helpBtn');
  const closeHelpBtn = document.getElementById('closeHelpBtn');
  const LEVELS = window.FEED_BOOHA_LEVELS || [];
  const levelText    = document.getElementById('levelText');
  const goalText     = document.getElementById('goalText');
  const stateText    = document.getElementById('stateText');
  const messageTitle = document.getElementById('messageTitle');
  const messageText  = document.getElementById('messageText');

  // Star rating elements (injected into message overlay — see buildStarUI)
  let starContainer = null;

  const W = canvas.width;
  const H = canvas.height;
  const FLOOR_Y = H - 40;
  const GRAVITY = 0.45;
  const AIR_DRAG = 0.999;
  const ROPE_CUT_RADIUS = 28;         // slightly generous for swipe
  const BOOHA_W = 180;
  const BOOHA_H = 180;
  const CANDY_R = 28;
  const MOUTH_TRIGGER_DIST = 170;
  const SURPRISED_TRIGGER_DIST = 95;
  const FAIL_BUFFER = 36;

  // [NEW] Swipe gesture state
  const swipe = {
    active: false,
    x0: 0, y0: 0,
    x1: 0, y1: 0
  };

  // [NEW] Slash effects pool
  const slashEffects = [];

  const images = {};
  const sounds = {};

  const imageSources = {
    bg: './assets/img/feed_booha-1.png',
    booEat: './assets/img/boo-eat.png',
    booMouthOpen: './assets/img/boo-mouth-open.png',
    booSad: './assets/img/boo-sad.png',
    booSurprised: './assets/img/boo-surprised.png',
    booWait: './assets/img/boo-wait.png',
    booWin: './assets/img/boo-win.png',
    candy: './assets/img/candy.png'
  };

  const audioSources = {
    get1: './assets/audio/get-1.mp3',
    get2: './assets/audio/get-2.mp3',
    get3: './assets/audio/get-3.mp3',
    get4: './assets/audio/get-4.mp3',
    miss1: './assets/audio/miss-1.mp3',
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
    bouncePattern: null  // [NEW] cached canvas pattern
  };

  // ─────────────────────────────────────────────────
  // Asset loading
  // ─────────────────────────────────────────────────
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function loadAudio(src) {
    const audio = new Audio(src);
    audio.preload = 'auto';
    return audio;
  }

  async function preloadAssets() {
    for (const [key, src] of Object.entries(imageSources)) {
      try { images[key] = await loadImage(src); }
      catch (err) { console.warn('Image failed:', src, err); }
    }
    for (const [key, src] of Object.entries(audioSources)) {
      sounds[key] = loadAudio(src);
    }
    buildBouncePattern();
  }

  // [NEW] Build striped canvas pattern for bounce pad fallback
  function buildBouncePattern() {
    const sz = 12;
    const pc = document.createElement('canvas');
    pc.width = sz;
    pc.height = sz;
    const px = pc.getContext('2d');
    px.fillStyle = '#ff8fd1';
    px.fillRect(0, 0, sz, sz);
    px.strokeStyle = 'rgba(255,255,255,0.45)';
    px.lineWidth = 2;
    px.beginPath();
    px.moveTo(0, sz);
    px.lineTo(sz, 0);
    px.stroke();
    state.bouncePattern = ctx.createPattern(pc, 'repeat');
  }

  function playSfx(key, loop = false) {
    const src = audioSources[key];
    if (!src) return null;
    const a = new Audio(src);
    a.loop = loop;
    a.volume = 1;
    a.play().catch(() => {});
    return a;
  }

  // ─────────────────────────────────────────────────
  // [FIX 3] Proper timer cleanup — clear ALL tracked timers
  // ─────────────────────────────────────────────────
  function stopAllTimers() {
    if (state.pendingSuccessTimeout) {
      clearTimeout(state.pendingSuccessTimeout);
      state.pendingSuccessTimeout = null;
    }
    if (state.pendingFailTimeout) {
      clearTimeout(state.pendingFailTimeout);
      state.pendingFailTimeout = null;
    }
    // Clear any overflow timers pushed into effectTimers
    for (const id of state.effectTimers) {
      clearTimeout(id);
    }
    state.effectTimers.length = 0;
  }

  // ─────────────────────────────────────────────────
  // HUD
  // ─────────────────────────────────────────────────
  function setHud(levelLabel, statusLabel) {
    levelText.textContent = String(levelLabel);
    goalText.textContent = 'Feed Booha';
    stateText.textContent = statusLabel;
  }

  function cloneLevel(level) {
    return JSON.parse(JSON.stringify(level));
  }

  // ─────────────────────────────────────────────────
  // [NEW] Star rating UI — injected into messageOverlay card
  // ─────────────────────────────────────────────────
  function buildStarUI() {
    if (starContainer) return;
    const card = messageOverlay.querySelector('.overlay-card');
    if (!card) return;
    starContainer = document.createElement('div');
    starContainer.id = 'starRating';
    starContainer.style.cssText = 'display:flex;justify-content:center;gap:6px;margin:8px 0 4px;font-size:28px;';
    // Insert after the <p> message text
    const p = card.querySelector('p');
    if (p) p.after(starContainer);
    else card.prepend(starContainer);
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
  // Level build / flow
  // ─────────────────────────────────────────────────
  function buildLevel(index) {
    stopAllTimers();
    slashEffects.length = 0;

    const rawLevel = LEVELS[index] || LEVELS[0];
    if (!rawLevel) { console.error('No level data.'); return; }
    const level = cloneLevel(rawLevel);

    state.currentLevel = level;
    state.cutCount     = 0;
    state.won          = false;
    state.lost         = false;
    state.running      = true;
    state.boohaSprite  = 'booWait';
    state.effectTimers.length = 0;
    state.bounceCooldown = 0;

    state.candy = {
      x: level.candy.x,
      y: level.candy.y,
      vx: 0,
      vy: 0,
      r: CANDY_R,
      attached: true,
      alive: true
    };

    state.ropes = (level.ropes || []).map((rope) => ({
      id: rope.id,
      anchor: { x: rope.anchor.x, y: rope.anchor.y },
      cut: false
    }));

    state.objects = (level.objects || []).map((obj) => ({ ...obj }));

    state.booha = {
      x: level.booha.x,
      y: level.booha.y,
      baseX: level.booha.x,
      baseY: level.booha.y,
      behavior: level.booha.behavior || 'idle',
      range: level.booha.range || null,
      speed: level.booha.speed || 0,
      dir: 1,
      w: BOOHA_W,
      h: BOOHA_H
    };

    setHud(index + 1, 'Ready');
  }

  function startGame() {
    if (!LEVELS.length) { console.error('No levels found.'); return; }
    state.started = true;
    // [FIX 1] Smooth fade-out: remove show class, then hide after transition
    startOverlay.classList.remove('overlay--show');
    startOverlay.setAttribute('aria-hidden', 'true');
    setTimeout(() => { startOverlay.style.display = 'none'; }, 280);
    buildLevel(state.levelIndex);
  }

  function resetLevel() {
    buildLevel(state.levelIndex);
  }

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
    helpPanel.hidden = !show;
  }

  function getActiveRopes() {
    return state.ropes.filter((r) => !r.cut);
  }

  // ─────────────────────────────────────────────────
  // Booha movement
  // ─────────────────────────────────────────────────
  function updateBooha(dt) {
    if (!state.booha) return;
    const b = state.booha;
    if (b.behavior === 'horizontal' && b.range) {
      b.x += b.speed * b.dir * dt * 0.06;
      if (b.x <= b.range.min)      { b.x = b.range.min; b.dir = 1;  }
      else if (b.x >= b.range.max) { b.x = b.range.max; b.dir = -1; }
    }
  }

  function averageAnchor() {
    const active = getActiveRopes();
    if (!active.length) return null;
    let sumX = 0, sumY = 0;
    for (const r of active) { sumX += r.anchor.x; sumY += r.anchor.y; }
    return { x: sumX / active.length, y: sumY / active.length };
  }

  // ─────────────────────────────────────────────────
  // Candy physics
  // ─────────────────────────────────────────────────

  // [FIX 4 / NEW] dt-normalised lerp — correct on 60Hz AND 120Hz
  function dtLerp(from, to, k, dt) {
    const alpha = 1 - Math.pow(1 - k, dt / 16.667);
    return from + (to - from) * alpha;
  }

  function updateAttachedCandy(dt) {
    const active = getActiveRopes();
    if (!active.length) { state.candy.attached = false; return; }

    const center = averageAnchor();
    const c = state.candy;
    c.x = dtLerp(c.x, center.x,      0.18, dt);
    c.y = dtLerp(c.y, center.y + 90, 0.18, dt);
    c.vx *= 0.9;
    c.vy *= 0.9;
  }

  function updateFreeCandy() {
    const c = state.candy;
    c.vy += GRAVITY;
    c.x  += c.vx;
    c.y  += c.vy;
    c.vx *= AIR_DRAG;
    c.vy *= AIR_DRAG;
  }

  function handleBouncePads() {
    if (state.bounceCooldown > 0) state.bounceCooldown -= 1;
    const c = state.candy;
    if (!c || c.attached) return;

    for (const obj of state.objects) {
      if (obj.type !== 'bounce') continue;
      const left  = obj.x - obj.width  / 2;
      const right = obj.x + obj.width  / 2;
      const top   = obj.y - obj.height / 2;

      const horizontallyInside = c.x + c.r > left && c.x - c.r < right;
      const hittingTop         = c.y + c.r >= top && c.y + c.r <= top + 22;
      const movingDown         = c.vy > 0;

      if (horizontallyInside && hittingTop && movingDown) {
        c.y  = top - c.r;
        c.vy = -Math.max(10, c.vy * 0.95);
        c.vx *= 1.02;
        if (state.bounceCooldown <= 0) {
          playSfx('bounce1');
          state.bounceCooldown = 8;
        }
      }
    }
  }

  // [FIX 4] Mouth point computed fresh each call — no lag on moving Booha
  function boohaMouthPoint() {
    return { x: state.booha.x, y: state.booha.y - 12 };
  }

  function updateBoohaMood() {
    if (state.won || state.lost) return;
    const c    = state.candy;
    const mouth = boohaMouthPoint();
    const dist  = Math.hypot(c.x - mouth.x, c.y - mouth.y);

    if (dist < SURPRISED_TRIGGER_DIST && !c.attached) {
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
    if (Math.hypot(c.x - mouth.x, c.y - mouth.y) >= 58) return;

    state.won          = true;
    state.running      = false;
    state.candy.alive  = false;
    state.boohaSprite  = 'booEat';
    setHud(state.levelIndex + 1, 'Yum!');

    playSfx('get1');
    const t1 = setTimeout(() => playSfx('get2'), 180);
    const t2 = setTimeout(() => playSfx('get3'), 360);
    state.effectTimers.push(t1, t2);

    const loopAudio = playSfx('get4', true);
    const cuts = state.cutCount;

    state.pendingSuccessTimeout = setTimeout(() => {
      state.boohaSprite = 'booWin';
      if (loopAudio) {
        setTimeout(() => { loopAudio.pause(); loopAudio.currentTime = 0; }, 500);
      }
      showMessage('Nice!', 'Booha is happy.', true, cuts);
    }, 520);
  }

  // ─────────────────────────────────────────────────
  // [FIX 2] Floor fail check — was inverted in v1
  // Old: if (c.y - c.r <= FLOOR_Y + FAIL_BUFFER) return;  ← always true in air
  // New: if (c.y + c.r < FLOOR_Y - FAIL_BUFFER) return;  ← correct early-exit
  // ─────────────────────────────────────────────────
  function checkFail() {
    if (state.won || state.lost) return;
    const c = state.candy;
    if (c.y + c.r < FLOOR_Y - FAIL_BUFFER) return;

    state.lost    = true;
    state.running = false;
    state.boohaSprite = 'booSad';
    setHud(state.levelIndex + 1, 'Miss');
    playSfx('miss1');

    state.pendingFailTimeout = setTimeout(() => {
      showMessage('Oops!', 'Booha missed the candy.', false);
      state.pendingFailTimeout = setTimeout(() => {
        hideMessage();
        resetLevel();
      }, 650);
    }, 260);
  }

  function clampCandyToFloor() {
    const c = state.candy;
    if (c.y + c.r > FLOOR_Y && !state.won) {
      c.y   = FLOOR_Y - c.r;
      c.vx *= 0.95;
      c.vy  = 0;
    }
  }

  // ─────────────────────────────────────────────────
  // [NEW] Rope cutting logic (shared by tap + swipe)
  // ─────────────────────────────────────────────────
  function tryCutRope(rope) {
    if (rope.cut) return false;
    rope.cut = true;
    state.cutCount += 1;

    // Spawn slash effect at midpoint of rope
    const c  = state.candy;
    const mx = (rope.anchor.x + c.x) / 2;
    const my = (rope.anchor.y + c.y) / 2;
    const angle = Math.atan2(c.y - rope.anchor.y, c.x - rope.anchor.x);
    slashEffects.push({ x: mx, y: my, angle, life: 1.0 });

    // [NEW] Haptic on mobile
    if (navigator.vibrate) navigator.vibrate(40);

    if (!getActiveRopes().length) {
      state.candy.attached = false;
    }
    setHud(state.levelIndex + 1, 'Cut!');
    return true;
  }

  // ─────────────────────────────────────────────────
  // [NEW] Tap-to-cut (kept from v1, now calls tryCutRope)
  // ─────────────────────────────────────────────────
  function cutNearestRope(mx, my) {
    if (!state.currentLevel || state.won || state.lost) return;
    const active = getActiveRopes();
    if (!active.length) return;

    let best = null, bestDist = Infinity;
    for (const rope of active) {
      const d = distancePointToSegment(mx, my, rope.anchor.x, rope.anchor.y, state.candy.x, state.candy.y);
      if (d < bestDist) { bestDist = d; best = rope; }
    }
    if (best && bestDist <= ROPE_CUT_RADIUS) tryCutRope(best);
  }

  // ─────────────────────────────────────────────────
  // [NEW] Swipe-to-cut — segment intersection test
  // ─────────────────────────────────────────────────
  function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
    const d1x = bx - ax, d1y = by - ay;
    const d2x = dx - cx, d2y = dy - cy;
    const cross = d1x * d2y - d1y * d2x;
    if (Math.abs(cross) < 1e-10) return false;
    const t = ((cx - ax) * d2y - (cy - ay) * d2x) / cross;
    const u = ((cx - ax) * d1y - (cy - ay) * d1x) / cross;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  function checkSwipeCuts() {
    if (!state.currentLevel || state.won || state.lost) return;
    if (!swipe.active) return;
    const active = getActiveRopes();
    for (const rope of active) {
      if (segmentsIntersect(
        swipe.x0, swipe.y0, swipe.x1, swipe.y1,
        rope.anchor.x, rope.anchor.y,
        state.candy.x, state.candy.y
      )) {
        tryCutRope(rope);
      }
    }
  }

  // ─────────────────────────────────────────────────
  // Update loop
  // ─────────────────────────────────────────────────
  function update(dt) {
    if (!state.started || !state.currentLevel) return;
    updateBooha(dt);

    if (state.running) {
      if (state.candy.attached) {
        updateAttachedCandy(dt);
      } else {
        updateFreeCandy();
        handleBouncePads();
        checkSuccess();
        checkFail();
        clampCandyToFloor();
      }
      updateBoohaMood();
    }

    // Decay slash effects
    for (let i = slashEffects.length - 1; i >= 0; i--) {
      slashEffects[i].life -= dt * 0.07;
      if (slashEffects[i].life <= 0) slashEffects.splice(i, 1);
    }
  }

  // ─────────────────────────────────────────────────
  // Draw
  // ─────────────────────────────────────────────────
  function drawBackground() {
    if (images.bg) { ctx.drawImage(images.bg, 0, 0, W, H); return; }
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);
  }

  function drawFloor() {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
  }

  function drawRopes() {
    const c = state.candy;
    for (const rope of state.ropes) {
      if (rope.cut) continue;
      ctx.save();
      ctx.strokeStyle = '#f7e7b6';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(rope.anchor.x, rope.anchor.y);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = '#fff6cf';
      ctx.beginPath();
      ctx.arc(rope.anchor.x, rope.anchor.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // [NEW] Slash visual effect
  function drawSlashEffects() {
    for (const s of slashEffects) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle + Math.PI / 4);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4 * s.life;
      ctx.lineCap = 'round';

      const len = 40 * s.life;
      ctx.beginPath();
      ctx.moveTo(-len, -len * 0.3);
      ctx.lineTo(len,  len * 0.3);
      ctx.stroke();

      ctx.strokeStyle = '#ffdd88';
      ctx.lineWidth = 2 * s.life;
      ctx.beginPath();
      ctx.moveTo(-len * 0.5, len * 0.5);
      ctx.lineTo(len * 0.5, -len * 0.5);
      ctx.stroke();
      ctx.restore();
    }
  }

  // [NEW] Striped bounce pad fallback
  function drawObjects() {
    for (const obj of state.objects) {
      if (obj.type === 'bounce') {
        const x = obj.x - obj.width  / 2;
        const y = obj.y - obj.height / 2;
        ctx.save();
        if (state.bouncePattern) {
          ctx.fillStyle = state.bouncePattern;
        } else {
          ctx.fillStyle = '#ff8fd1';
        }
        ctx.fillRect(x, y, obj.width, obj.height);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, obj.width, obj.height);

        // Spring arrows
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('▲', obj.x, obj.y);
        ctx.restore();
      }
    }
  }

  function drawCandy() {
    const c = state.candy;
    if (!c.alive) return;
    if (images.candy) {
      ctx.drawImage(images.candy, c.x - c.r, c.y - c.r, c.r * 2, c.r * 2);
      return;
    }
    ctx.save();
    ctx.fillStyle = '#ff5fa8';
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBooha() {
    const b   = state.booha;
    const img = images[state.boohaSprite] || images.booWait;
    const x   = b.x - b.w / 2;
    const y   = b.y - b.h / 2;
    if (img) { ctx.drawImage(img, x, y, b.w, b.h); return; }
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    drawBackground();
    drawFloor();
    if (!state.currentLevel) return;
    drawObjects();
    drawRopes();
    drawSlashEffects();
    drawCandy();
    drawBooha();
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
  // Input helpers
  // ─────────────────────────────────────────────────
  function getCanvasPoint(evt) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width  / rect.width;
    const sy = canvas.height / rect.height;
    const touch = evt.touches && evt.touches[0];
    return {
      x: ((touch ? touch.clientX : evt.clientX) - rect.left) * sx,
      y: ((touch ? touch.clientY : evt.clientY) - rect.top)  * sy
    };
  }

  function distancePointToSegment(px, py, x1, y1, x2, y2) {
    const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
    const dot   = A * C + B * D;
    const lenSq = C * C + D * D;
    const t     = lenSq ? Math.max(0, Math.min(1, dot / lenSq)) : 0;
    return Math.hypot(px - (x1 + C * t), py - (y1 + D * t));
  }

  // ─────────────────────────────────────────────────
  // Event binding
  // ─────────────────────────────────────────────────
  function bindEvents() {
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', resetLevel);
    retryBtn.addEventListener('click', () => { hideMessage(); resetLevel(); });
    nextBtn.addEventListener('click', nextLevel);
    helpBtn.addEventListener('click', () => toggleHelp(true));
    closeHelpBtn.addEventListener('click', () => toggleHelp(false));

    // Mouse — tap to cut
    canvas.addEventListener('click', (evt) => {
      if (!state.started) return;
      const p = getCanvasPoint(evt);
      cutNearestRope(p.x, p.y);
    });

    // [NEW] Touch — swipe to cut
    canvas.addEventListener('touchstart', (evt) => {
      if (!state.started) return;
      evt.preventDefault();
      const p = getCanvasPoint(evt);
      swipe.active = true;
      swipe.x0 = p.x; swipe.y0 = p.y;
      swipe.x1 = p.x; swipe.y1 = p.y;
    }, { passive: false });

    canvas.addEventListener('touchmove', (evt) => {
      if (!state.started || !swipe.active) return;
      evt.preventDefault();
      const p = getCanvasPoint(evt);
      swipe.x1 = p.x; swipe.y1 = p.y;
      checkSwipeCuts();
      swipe.x0 = p.x; swipe.y0 = p.y; // rolling segment
    }, { passive: false });

    canvas.addEventListener('touchend', (evt) => {
      evt.preventDefault();
      // Short tap fallback — if swipe was tiny, treat as tap
      const dx = swipe.x1 - swipe.x0;
      const dy = swipe.y1 - swipe.y0;
      if (Math.hypot(dx, dy) < 10) {
        cutNearestRope(swipe.x0, swipe.y0);
      }
      swipe.active = false;
    }, { passive: false });
  }

  // ─────────────────────────────────────────────────
  // Boot
  // ─────────────────────────────────────────────────
  async function boot() {
    setHud(1, 'Loading');
    bindEvents();
    await preloadAssets();
    setHud(1, 'Ready');
    requestAnimationFrame(frame);
  }

  boot();
})();
