
// =====================================================
// Feed Booha — Engine (v5)
// =====================================================
// FIXES v5:
//   • Booha horizontal patrol — guaranteed movement every frame
//   • get-1/2/3/4.mp3 chained on eat, get-4 loops until win overlay
//   • Particles live in DOM layer BEHIND canvas, not on game image
//   • No emoji in game UI / looks lame - maybe add pngs
//   • Star animations only in overlay card, not on canvas
//   • Fan force properly dt-scaled in ms / still bounces off screen
//   • Two-rope pendulum: strong asymmetric kick
// =====================================================

(() => {
  'use strict';

  const canvas         = document.getElementById('gameCanvas');
  const ctx            = canvas.getContext('2d');
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
  const stateText      = document.getElementById('stateText');
  const messageTitle   = document.getElementById('messageTitle');
  const messageText    = document.getElementById('messageText');
  const totalStarsEl   = document.getElementById('totalStars');
  const hudStarsEl     = document.getElementById('hudStars');

  let starContainer = null;

  const W       = canvas.width;   // 540
  const H       = canvas.height;  // 960
  const FLOOR_Y = H - 60;

  const GRAVITY            = 0.45;
  const AIR_DRAG           = 0.999;
  const ROPE_CUT_RADIUS    = 32;
  const BOOHA_W            = 160;
  const BOOHA_H            = 160;
  const CANDY_R            = 26;
  const MOUTH_TRIGGER_DIST = 160;
  const SURPRISED_TRIGGER  = 80;
  const FAIL_BUFFER        = 36;
  const TRAIL_LENGTH       = 8;
  const TRAIL_SPEED_THRESH = 6;
  const MAGNET_DIST        = 140;
  const MAGNET_FORCE       = 0.40;
  const LAST_CHANCE_DIST   = 90;

  const swipe        = { active: false, x0: 0, y0: 0, x1: 0, y1: 0 };
  const slashEffects = [];
  const images       = {};

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

  // ─────────────────────────────────────────────────
  // Audio
  // get-1 → get-2 → get-3 → get-4 loop on eat
  // All other sounds: synthesized
  // ─────────────────────────────────────────────────
  let audioCtx     = null;
  let eatLoopAudio = null;

  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playFile(src, loop = false, vol = 1) {
    const a = new Audio(src);
    a.loop   = loop;
    a.volume = vol;
    a.play().catch(() => {});
    return a;
  }

  function stopFile(a) {
    if (!a) return;
    try { a.pause(); a.currentTime = 0; } catch(e) {}
  }

  // Chain get-1 → +180ms get-2 → +180ms get-3 → +180ms get-4 (loop)
  function playEatChain() {
    stopEatLoop();
    const base = './assets/audio/';
    playFile(base + 'get-1.mp3');
    const t1 = setTimeout(() => playFile(base + 'get-2.mp3'), 180);
    const t2 = setTimeout(() => playFile(base + 'get-3.mp3'), 360);
    const t3 = setTimeout(() => {
      eatLoopAudio = playFile(base + 'get-4.mp3', true);
    }, 540);
    state.effectTimers.push(t1, t2, t3);
  }

  function stopEatLoop() {
    stopFile(eatLoopAudio);
    eatLoopAudio = null;
  }

  // Synth helper
  function playTone({ freq = 440, freq2 = null, type = 'sine', gain = 0.32, duration = 0.18,
                      attack = 0.01, decay = 0.08, sustain = 0.4, release = 0.10, delay = 0 } = {}) {
    try {
      const ac  = getAudioCtx();
      const osc = ac.createOscillator();
      const env = ac.createGain();
      osc.connect(env); env.connect(ac.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
      if (freq2) osc.frequency.linearRampToValueAtTime(freq2, ac.currentTime + delay + duration * 0.6);
      const t0 = ac.currentTime + delay;
      env.gain.setValueAtTime(0, t0);
      env.gain.linearRampToValueAtTime(gain, t0 + attack);
      env.gain.linearRampToValueAtTime(gain * sustain, t0 + attack + decay);
      env.gain.setValueAtTime(gain * sustain, t0 + duration - release);
      env.gain.linearRampToValueAtTime(0, t0 + duration);
      osc.start(t0); osc.stop(t0 + duration + 0.01);
    } catch(e) {}
  }

  function playSfxCut() {
    playTone({ freq: 900, freq2: 380, type: 'square', gain: 0.16, duration: 0.11, attack: 0.004, decay: 0.04, sustain: 0.18, release: 0.05 });
    playTone({ freq: 1200, type: 'sine', gain: 0.10, duration: 0.07, attack: 0.004, decay: 0.03, sustain: 0.1, release: 0.03, delay: 0.03 });
  }
  function playSfxBounce() {
    playTone({ freq: 190, freq2: 90, type: 'sine', gain: 0.48, duration: 0.18, attack: 0.004, decay: 0.08, sustain: 0.22, release: 0.07 });
    playTone({ freq: 320, type: 'triangle', gain: 0.12, duration: 0.10, attack: 0.004, decay: 0.04, sustain: 0.1, release: 0.04 });
  }
  function playSfxFall() {
    playTone({ freq: 680, freq2: 300, type: 'sine', gain: 0.20, duration: 0.32, attack: 0.01, decay: 0.10, sustain: 0.55, release: 0.12 });
  }
  function playSfxMiss() {
    playTone({ freq: 440, freq2: 210, type: 'sine', gain: 0.26, duration: 0.28, attack: 0.01, decay: 0.10, sustain: 0.38, release: 0.10 });
    playTone({ freq: 330, freq2: 155, type: 'triangle', gain: 0.14, duration: 0.22, attack: 0.02, decay: 0.08, sustain: 0.28, release: 0.10, delay: 0.14 });
  }
  function playSfxFan() {
    playTone({ freq: 200, freq2: 620, type: 'sawtooth', gain: 0.10, duration: 0.24, attack: 0.04, decay: 0.10, sustain: 0.28, release: 0.10 });
  }
  function playSfxWin() {
    [0, 0.13, 0.26, 0.40, 0.50].forEach((d, i) => {
      playTone({ freq: [523, 659, 784, 1047, 1319][i], type: 'triangle', gain: 0.22, duration: 0.20, attack: 0.01, decay: 0.06, sustain: 0.38, release: 0.09, delay: d });
    });
  }

  // ─────────────────────────────────────────────────
  // Stars
  // ─────────────────────────────────────────────────
  let totalStarsEarned = 0;
  function starsForCuts(n) { return n <= 1 ? 3 : n === 2 ? 2 : 1; }

  // ─────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────
  const state = {
    started: false, levelIndex: 0, running: false,
    won: false, lost: false, cutCount: 0,
    currentLevel: null, candy: null, ropes: [], objects: [],
    booha: null, boohaSprite: 'booWait',
    effectTimers: [], lastTime: 0,
    bounceCooldown: 0,
    pendingSuccessTimeout: null, pendingFailTimeout: null,
    bouncePattern: null,
    shakeFrames: 0, shakeAmt: 0,
    trail: [],
    lastChanceFired: false, boohaJumpOffset: 0, boohaJumpFrame: 0,
    cutTimers: {}, missDir: 0, fallSoundPlayed: false
  };

  // ─────────────────────────────────────────────────
  // Assets
  // ─────────────────────────────────────────────────
  function loadImage(src) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img); img.onerror = rej; img.src = src;
    });
  }

  async function preloadAssets() {
    for (const [k, src] of Object.entries(imageSources)) {
      try { images[k] = await loadImage(src); } catch(e) { console.warn('img fail:', src); }
    }
    buildBouncePattern();
  }

  function buildBouncePattern() {
    const sz = 12, pc = document.createElement('canvas');
    pc.width = pc.height = sz;
    const px = pc.getContext('2d');
    px.fillStyle = '#ff8fd1'; px.fillRect(0, 0, sz, sz);
    px.strokeStyle = 'rgba(255,255,255,0.45)'; px.lineWidth = 2;
    px.beginPath(); px.moveTo(0, sz); px.lineTo(sz, 0); px.stroke();
    state.bouncePattern = ctx.createPattern(pc, 'repeat');
  }

  // ─────────────────────────────────────────────────
  // Timers
  // ─────────────────────────────────────────────────
  function stopAllTimers() {
    stopEatLoop();
    if (state.pendingSuccessTimeout) { clearTimeout(state.pendingSuccessTimeout); state.pendingSuccessTimeout = null; }
    if (state.pendingFailTimeout)    { clearTimeout(state.pendingFailTimeout);    state.pendingFailTimeout    = null; }
    for (const id of state.effectTimers) clearTimeout(id);
    state.effectTimers = [];
    for (const id of Object.values(state.cutTimers)) clearTimeout(id);
    state.cutTimers = {};
  }

  function setHud(lvl, status) {
    if (levelText) levelText.textContent = String(lvl);
    if (stateText) stateText.textContent = status;
  }

  function cloneLevel(l) { return JSON.parse(JSON.stringify(l)); }

  // ─────────────────────────────────────────────────
  // Stars overlay
  // ─────────────────────────────────────────────────
  function buildStarUI() {
    if (starContainer) return;
    const card = messageOverlay.querySelector('.overlay-card');
    if (!card) return;
    starContainer = document.createElement('div');
    starContainer.id = 'starRating';
    const p = card.querySelector('p');
    if (p) p.after(starContainer); else card.prepend(starContainer);
  }

  function showStars(cutCount) {
    buildStarUI();
    if (!starContainer) return;
    const stars = starsForCuts(cutCount);
    starContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('span');
      s.textContent = i < stars ? '★' : '☆';
      s.className   = i < stars ? 'star star--earned' : 'star star--empty';
      if (i < stars) s.style.animationDelay = `${i * 0.13}s`;
      starContainer.appendChild(s);
    }
    totalStarsEarned += stars;
    if (totalStarsEl) totalStarsEl.textContent = totalStarsEarned;
    if (hudStarsEl) {
      hudStarsEl.classList.add('star-flash');
      setTimeout(() => hudStarsEl.classList.remove('star-flash'), 600);
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
    if (!rawLevel) { console.error('No levels.'); return; }
    const level = cloneLevel(rawLevel);

    state.currentLevel    = level;
    state.cutCount        = 0;
    state.won             = false;
    state.lost            = false;
    state.missDir         = 0;
    state.running         = true;
    state.boohaSprite     = 'booWait';
    state.effectTimers    = [];
    state.cutTimers       = {};
    state.bounceCooldown  = 0;
    state.shakeFrames     = 0;
    state.lastChanceFired = false;
    state.boohaJumpOffset = 0;
    state.boohaJumpFrame  = 0;
    state.fallSoundPlayed = false;

    // Kick toward center so pendulum has momentum immediately
    const ropeCount = (level.ropes || []).length;
    let kickVx;
    if (ropeCount >= 2) {
      const avgX   = level.ropes.reduce((s, r) => s + r.anchor.x, 0) / ropeCount;
      kickVx = (avgX >= W / 2 ? -1 : 1) * 6;
    } else {
      kickVx = (level.candy.x >= W / 2 ? -1 : 1) * 5.5;
    }

    state.candy = {
      x: level.candy.x, y: level.candy.y,
      vx: kickVx, vy: 0,
      r: CANDY_R, attached: true, alive: true
    };

    state.ropes = (level.ropes || []).map(r => ({
      id:      r.id,
      anchor:  { x: r.anchor.x, y: r.anchor.y },
      cut:     false,
      type:    r.type    || 'normal',
      delayMs: r.delayMs || 400,
      pending: false,
      length:  Math.hypot(level.candy.x - r.anchor.x, level.candy.y - r.anchor.y)
    }));

    state.objects = (level.objects || []).map(o => ({ ...o, activated: false, fanTimer: 0 }));

    // ── Booha ──
    const bh = level.booha;
    // Direction: start moving away from center of range
    let initDir = 1;
    if (bh.range) {
      const mid = (bh.range.min + bh.range.max) / 2;
      initDir   = bh.x <= mid ? 1 : -1;
    }
    state.booha = {
      x: bh.x, y: bh.y,
      baseX: bh.x, baseY: bh.y,
      behavior: bh.behavior || 'idle',
      range:    bh.range    || null,
      speed:    bh.speed    || 0,
      dir:      initDir,
      w: BOOHA_W, h: BOOHA_H
    };

    setHud(index + 1, 'Ready');
  }

  // ─────────────────────────────────────────────────
  // Flow
  // ─────────────────────────────────────────────────
  function startGame() {
    if (!LEVELS.length) return;
    state.started = true;
    startOverlay.classList.remove('overlay--show');
    startOverlay.setAttribute('aria-hidden', 'true');
    setTimeout(() => { startOverlay.style.display = 'none'; }, 300);
    buildLevel(state.levelIndex);
  }

  function resetLevel() { buildLevel(state.levelIndex); }
  function nextLevel()  { state.levelIndex = (state.levelIndex + 1) % LEVELS.length; hideMessage(); buildLevel(state.levelIndex); }

  function showMessage(title, text, nextVisible = true, cutCount = 0) {
    messageTitle.textContent = title;
    messageText.textContent  = text;
    const stars = starsForCuts(cutCount);
    nextBtn.style.display  = nextVisible ? 'inline-flex' : 'none';
    retryBtn.style.display = (!nextVisible || stars < 3) ? 'inline-flex' : 'none';
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

  function getActiveRopes() { return state.ropes.filter(r => !r.cut && !r.pending); }

  // ─────────────────────────────────────────────────
  // Booha movement — simple, reliable, frame-rate independent
  // ─────────────────────────────────────────────────
  function updateBooha(dt) {
    if (!state.booha) return;
    const b = state.booha;

    if (b.behavior === 'horizontal' && b.range && b.speed > 0) {
      // speed is design units "px at 60fps". Convert to actual px/frame via dt.
      b.x += b.speed * b.dir * (dt / 16.667);
      if (b.x >= b.range.max) { b.x = b.range.max; b.dir = -1; }
      else if (b.x <= b.range.min) { b.x = b.range.min; b.dir = 1; }
    }

    if (state.boohaJumpFrame > 0) {
      state.boohaJumpFrame--;
      const p = 1 - state.boohaJumpFrame / 16;
      state.boohaJumpOffset = -18 * Math.sin(p * Math.PI);
      if (state.boohaJumpFrame === 0) state.boohaJumpOffset = 0;
    }
  }

  // ─────────────────────────────────────────────────
  // Physics
  // ─────────────────────────────────────────────────
  function updateAttachedCandy(dt) {
    const active = getActiveRopes();
    if (!active.length) { state.candy.attached = false; return; }
    const c = state.candy;
    const steps = 3, subDt = dt / steps;
    for (let s = 0; s < steps; s++) {
      c.vy += GRAVITY * subDt / 16.667;
      c.x  += c.vx   * subDt / 16.667;
      c.y  += c.vy   * subDt / 16.667;
      for (const rope of active) {
        const dx = c.x - rope.anchor.x, dy = c.y - rope.anchor.y;
        const dist = Math.hypot(dx, dy);
        const len  = rope.length || 120;
        if (dist < 0.001 || dist <= len) continue;
        const over = (dist - len) / dist;
        c.x -= dx * over; c.y -= dy * over;
        const nx = dx/dist, ny = dy/dist;
        const vd = c.vx*nx + c.vy*ny;
        if (vd > 0) { c.vx -= vd*nx; c.vy -= vd*ny; }
      }
    }
    c.vx *= 0.999; c.vy *= 0.999;
  }

  function applyMagnet() {
    if (!state.booha || state.won || state.lost) return;
    const c = state.candy, m = boohaMouthPoint();
    const dx = m.x - c.x, dy = m.y - c.y, dist = Math.hypot(dx, dy);
    if (dist > MAGNET_DIST || dist < 1) return;
    const str = MAGNET_FORCE * (1 - dist / MAGNET_DIST);
    c.vx += (dx/dist) * str; c.vy += (dy/dist) * str;
  }

  function updateFreeCandy() {
    const c = state.candy;
    c.vy += GRAVITY; c.x += c.vx; c.y += c.vy;
    c.vx *= AIR_DRAG; c.vy *= AIR_DRAG;
  }

  function updateFans(dt) {
    const c = state.candy;
    if (!c || c.attached) return;
    for (const obj of state.objects) {
      if (obj.type !== 'fan' || obj.fanTimer <= 0) continue;
      obj.fanTimer -= dt;
      const f = 0.58 * (dt / 16.667);
      if (obj.direction === 'right') c.vx += f;
      else if (obj.direction === 'left')  c.vx -= f;
      else if (obj.direction === 'up')    c.vy -= f * 1.2;
    }
  }

  function activateFan(obj) {
    if (obj.fanTimer > 0) return;
    obj.fanTimer = 600;
    playSfxFan();
    if (navigator.vibrate) navigator.vibrate(30);
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
      const l = obj.x - obj.width/2, r = obj.x + obj.width/2;
      const top = obj.y - obj.height/2;
      if (c.x+c.r > l && c.x-c.r < r && c.y+c.r >= top && c.y+c.r <= top+22 && c.vy > 0) {
        c.y = top - c.r;
        c.vy = -Math.max(10, Math.abs(c.vy) * 0.95);
        c.vx *= 1.02;
        if (state.bounceCooldown <= 0) {
          playSfxBounce();
          state.shakeFrames = 7; state.shakeAmt = 3; state.bounceCooldown = 8;
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
    const c = state.candy, m = boohaMouthPoint();
    const dist = Math.hypot(c.x - m.x, c.y - m.y);
    if (dist < SURPRISED_TRIGGER && !c.attached) {
      state.boohaSprite = 'booSurprised'; setHud(state.levelIndex+1, 'Almost!');
    } else if (dist < MOUTH_TRIGGER_DIST && !c.attached) {
      state.boohaSprite = 'booMouthOpen'; setHud(state.levelIndex+1, 'Open wide');
    } else {
      state.boohaSprite = 'booWait';
      setHud(state.levelIndex+1, state.cutCount > 0 ? 'Falling' : 'Ready');
    }
  }

  function checkFallSound() {
    if (!state.fallSoundPlayed && !state.candy.attached) {
      state.fallSoundPlayed = true;
      playSfxFall();
    }
  }

  function checkSuccess() {
    if (state.won || state.lost) return;
    const c = state.candy, m = boohaMouthPoint();
    if (Math.hypot(c.x - m.x, c.y - m.y) >= 52) return;
    state.won = true; state.running = false; state.candy.alive = false;
    state.boohaSprite = 'booEat';
    setHud(state.levelIndex+1, 'Yum!');
    playEatChain();
    const cuts = state.cutCount;
    state.pendingSuccessTimeout = setTimeout(() => {
      stopEatLoop();
      state.boohaSprite = 'booWin';
      playSfxWin();
      const stars = starsForCuts(cuts);
      showMessage(stars===3 ? 'Perfect!' : stars===2 ? 'Tasty!' : 'Good job!', 'Booha is happy!', true, cuts);
    }, 1400);
  }

  function checkFail() {
    if (state.won || state.lost) return;
    const c = state.candy;
    if (c.y + c.r < FLOOR_Y - FAIL_BUFFER) return;
    state.lost = true; state.running = false;
    const m = boohaMouthPoint();
    state.missDir = c.x < m.x ? -1 : 1;
    state.boohaSprite = 'booSad';
    setHud(state.levelIndex+1, 'Miss');
    playSfxMiss();
    state.pendingFailTimeout = setTimeout(() => {
      showMessage('Oops!', 'Booha missed the candy.', false);
      state.pendingFailTimeout = setTimeout(() => { hideMessage(); resetLevel(); }, 1400);
    }, 300);
  }

  function clampCandyToFloor() {
    const c = state.candy;
    if (c.y + c.r > FLOOR_Y && !state.won) { c.y = FLOOR_Y - c.r; c.vx *= 0.95; c.vy = 0; }
  }

  // ─────────────────────────────────────────────────
  // Rope cutting
  // ─────────────────────────────────────────────────
  function spawnSlash(rope) {
    const c = state.candy;
    slashEffects.push({
      x: (rope.anchor.x + c.x) / 2, y: (rope.anchor.y + c.y) / 2,
      angle: Math.atan2(c.y - rope.anchor.y, c.x - rope.anchor.x),
      life: 1.0
    });
  }

  function tryCutRope(rope) {
    if (rope.cut || rope.pending) return false;
    if (rope.type === 'delayed') {
      rope.pending = true;
      setHud(state.levelIndex+1, 'Cutting...');
      const id = setTimeout(() => {
        rope.cut = true; rope.pending = false; state.cutCount++;
        spawnSlash(rope); playSfxCut();
        if (navigator.vibrate) navigator.vibrate(40);
        if (!getActiveRopes().length) state.candy.attached = false;
        setHud(state.levelIndex+1, 'Cut!');
      }, rope.delayMs);
      state.cutTimers[rope.id] = id;
      return true;
    }
    rope.cut = true; state.cutCount++;
    spawnSlash(rope); playSfxCut();
    if (navigator.vibrate) navigator.vibrate(40);
    if (!getActiveRopes().length) state.candy.attached = false;
    setHud(state.levelIndex+1, 'Cut!');
    return true;
  }

  function cutNearestRope(mx, my) {
    if (!state.currentLevel || state.won || state.lost) return;
    const active = state.ropes.filter(r => !r.cut && !r.pending);
    if (!active.length) return;
    let best = null, bestD = Infinity;
    for (const rope of active) {
      const d = distPtSeg(mx, my, rope.anchor.x, rope.anchor.y, state.candy.x, state.candy.y);
      if (d < bestD) { bestD = d; best = rope; }
    }
    if (best && bestD <= ROPE_CUT_RADIUS) tryCutRope(best);
  }

  function tapObjects(mx, my) {
    for (const obj of state.objects) {
      if (obj.type !== 'fan') continue;
      if (Math.hypot(mx - obj.x, my - obj.y) < 48) { activateFan(obj); return true; }
    }
    return false;
  }

  function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
    const d1x=bx-ax, d1y=by-ay, d2x=dx-cx, d2y=dy-cy;
    const cross = d1x*d2y - d1y*d2x;
    if (Math.abs(cross) < 1e-10) return false;
    const t = ((cx-ax)*d2y - (cy-ay)*d2x) / cross;
    const u = ((cx-ax)*d1y - (cy-ay)*d1x) / cross;
    return t>=0 && t<=1 && u>=0 && u<=1;
  }

  function checkSwipeCuts() {
    if (!state.currentLevel || state.won || state.lost) return;
    for (const rope of state.ropes.filter(r => !r.cut && !r.pending)) {
      if (segmentsIntersect(swipe.x0, swipe.y0, swipe.x1, swipe.y1,
        rope.anchor.x, rope.anchor.y, state.candy.x, state.candy.y)) tryCutRope(rope);
    }
  }

  function distPtSeg(px, py, x1, y1, x2, y2) {
    const A=px-x1, B=py-y1, C=x2-x1, D=y2-y1;
    const lenSq = C*C+D*D;
    const t = lenSq ? Math.max(0, Math.min(1, (A*C+B*D)/lenSq)) : 0;
    return Math.hypot(px-(x1+C*t), py-(y1+D*t));
  }

  // ─────────────────────────────────────────────────
  // Update
  // ─────────────────────────────────────────────────
  function update(dt) {
    if (!state.started || !state.currentLevel) return;
    updateBooha(dt);
    updateTrail();
    if (state.shakeFrames > 0) state.shakeFrames--;
    if (state.running) {
      if (state.candy.attached) {
        updateAttachedCandy(dt);
      } else {
        checkFallSound();
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
  // Draw — canvas only renders game elements
  // Bubbles/sparkles live in .particle-layer DOM div
  // ─────────────────────────────────────────────────
  function drawBackground() {
    if (images.bg) {
      const img = images.bg;
      const scale = Math.max(W / img.width, H / img.height);
      ctx.drawImage(img, (W - img.width*scale)/2, (H - img.height*scale)/2, img.width*scale, img.height*scale);
    }
  }

  function drawFloor() {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
  }

  function drawRopes() {
    const c = state.candy;
    for (const rope of state.ropes) {
      if (rope.cut) continue;
      const ax=rope.anchor.x, ay=rope.anchor.y, bx=c.x, by=c.y;
      const mx=(ax+bx)/2, my=(ay+by)/2;
      const straightD = Math.hypot(bx-ax, by-ay);
      const slack     = Math.max(0, (rope.length||straightD) - straightD);
      const sagY      = Math.min(slack*0.5 + straightD*0.08, 70);
      ctx.save();
      ctx.globalAlpha = rope.pending ? 0.45 : 1;
      ctx.lineCap = 'round';
      // Body
      ctx.beginPath(); ctx.moveTo(ax,ay); ctx.quadraticCurveTo(mx, my+sagY, bx,by);
      ctx.strokeStyle='#c8a84b'; ctx.lineWidth=7; ctx.stroke();
      // Highlight
      ctx.beginPath(); ctx.moveTo(ax,ay); ctx.quadraticCurveTo(mx, my+sagY, bx,by);
      ctx.strokeStyle='#f0d070'; ctx.lineWidth=3; ctx.stroke();
      // Braid
      ctx.setLineDash([6,10]); ctx.lineDashOffset=(state.lastTime*0.02)%16;
      ctx.beginPath(); ctx.moveTo(ax,ay); ctx.quadraticCurveTo(mx, my+sagY, bx,by);
      ctx.strokeStyle='rgba(255,245,200,0.35)'; ctx.lineWidth=2; ctx.stroke();
      ctx.setLineDash([]);
      // Anchor
      ctx.fillStyle='#fff6cf'; ctx.beginPath(); ctx.arc(ax,ay,7,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  function drawSlashEffects() {
    for (const s of slashEffects) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.translate(s.x, s.y); ctx.rotate(s.angle + Math.PI/4);
      const len = 40 * s.life;
      ctx.strokeStyle='#fff'; ctx.lineWidth=4*s.life; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-len,-len*0.3); ctx.lineTo(len,len*0.3); ctx.stroke();
      ctx.strokeStyle='#ffdd88'; ctx.lineWidth=2*s.life;
      ctx.beginPath(); ctx.moveTo(-len*0.5,len*0.5); ctx.lineTo(len*0.5,-len*0.5); ctx.stroke();
      ctx.restore();
    }
  }

  function drawObjects() {
    const t = state.lastTime * 0.001;
    for (const obj of state.objects) {
      if (obj.type === 'bounce') {
        const x=obj.x-obj.width/2, y=obj.y-obj.height/2;
        ctx.save();
        ctx.fillStyle = state.bouncePattern || '#ff8fd1';
        ctx.fillRect(x,y,obj.width,obj.height);
        ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.strokeRect(x,y,obj.width,obj.height);
        ctx.fillStyle='#fff'; ctx.font='bold 13px system-ui';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('▲', obj.x, obj.y);
        ctx.restore();
      }
      if (obj.type === 'fan') {
        const active = obj.fanTimer > 0;
        ctx.save(); ctx.translate(obj.x, obj.y); ctx.rotate(t*(active?8:1.5));
        ctx.fillStyle = active ? '#ffcc44' : '#aaa';
        ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill();
        for (let i=0;i<4;i++) {
          ctx.save(); ctx.rotate((Math.PI*2/4)*i);
          ctx.fillStyle = active ? 'rgba(255,200,50,0.85)' : 'rgba(180,180,180,0.7)';
          ctx.beginPath(); ctx.ellipse(0,-18,7,16,0,0,Math.PI*2); ctx.fill();
          ctx.restore();
        }
        ctx.restore();
        ctx.save(); ctx.fillStyle='#fff'; ctx.font='14px system-ui';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(obj.direction==='left'?'←':obj.direction==='up'?'↑':'→', obj.x, obj.y+28);
        if (!active) {
          ctx.strokeStyle='rgba(255,255,255,0.25)'; ctx.lineWidth=1.5; ctx.setLineDash([4,6]);
          ctx.beginPath(); ctx.arc(obj.x,obj.y,40,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.restore();
      }
    }
  }

  function drawTrail() {
    const c = state.candy;
    if (!c||!c.alive) return;
    for (let i=0;i<state.trail.length;i++) {
      const t=state.trail[i], ratio=1-i/state.trail.length;
      ctx.save(); ctx.globalAlpha=t.alpha*ratio*0.45; ctx.fillStyle='#ff88cc';
      ctx.beginPath(); ctx.arc(t.x,t.y,CANDY_R*ratio*0.8,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  function drawCandy() {
    const c = state.candy;
    if (!c.alive) return;
    if (images.candy) { ctx.drawImage(images.candy, c.x-c.r, c.y-c.r, c.r*2, c.r*2); return; }
    ctx.save(); ctx.fillStyle='#ff5fa8';
    ctx.beginPath(); ctx.arc(c.x,c.y,c.r,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawBooha() {
    const b=state.booha, img=images[state.boohaSprite]||images.booWait;
    const yOff=state.boohaJumpOffset;
    const dx=b.x-b.w/2+(state.lost&&state.missDir?state.missDir*8:0);
    const dy=b.y+yOff-b.h/2;
    if (img) { ctx.drawImage(img,dx,dy,b.w,b.h); return; }
    ctx.save(); ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(b.x,b.y+yOff,70,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function draw() {
    const sx = state.shakeFrames>0 ? (Math.random()-0.5)*state.shakeAmt*2 : 0;
    const sy = state.shakeFrames>0 ? (Math.random()-0.5)*state.shakeAmt*2 : 0;
    ctx.save(); ctx.translate(sx, sy);
    ctx.clearRect(-10,-10,W+20,H+20);
    drawBackground(); drawFloor();
    if (!state.currentLevel) { ctx.restore(); return; }
    drawObjects(); drawRopes(); drawSlashEffects(); drawTrail(); drawCandy(); drawBooha();
    ctx.restore();
  }

  // ─────────────────────────────────────────────────
  // DOM particle layer — sits BEHIND canvas in game-wrap
  // Bubbles float up on the purple/pink gradient only
  // ─────────────────────────────────────────────────
  function buildDomParticles() {
    const wrap = document.querySelector('.game-wrap');
    if (!wrap) return;
    const layer = document.createElement('div');
    layer.className = 'particle-layer';
    // insertBefore canvas so it renders behind it in z-order
    wrap.insertBefore(layer, canvas);
    for (let i = 0; i < 22; i++) {
      const el       = document.createElement('div');
      const isBubble = i < 13;
      el.className   = isBubble ? 'dom-bubble' : 'dom-sparkle';
      const size     = isBubble ? Math.random()*26+8 : Math.random()*4+1.5;
      const dur      = isBubble ? Math.random()*14+9 : Math.random()*3+1.8;
      el.style.cssText = [
        `left:${Math.random()*100}%`,
        `width:${size}px`,
        `height:${size}px`,
        `animation-duration:${dur}s`,
        `animation-delay:${(Math.random()*-dur).toFixed(1)}s`,
        `opacity:${(Math.random()*0.18+0.05).toFixed(2)}`
      ].join(';');
      layer.appendChild(el);
    }
  }

  // ─────────────────────────────────────────────────
  // Main loop
  // ─────────────────────────────────────────────────
  function frame(ts) {
    const dt = state.lastTime ? Math.min(ts - state.lastTime, 50) : 16.67;
    state.lastTime = ts;
    update(dt); draw();
    requestAnimationFrame(frame);
  }

  // ─────────────────────────────────────────────────
  // Input
  // ─────────────────────────────────────────────────
  function getCanvasPoint(evt) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width/rect.width, sy = canvas.height/rect.height;
    const touch = evt.touches&&evt.touches[0];
    return {
      x: ((touch?touch.clientX:evt.clientX) - rect.left) * sx,
      y: ((touch?touch.clientY:evt.clientY) - rect.top)  * sy
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
    canvas.addEventListener('click', evt => handleTap(getCanvasPoint(evt)));
    canvas.addEventListener('touchstart', evt => {
      if (!state.started) return;
      evt.preventDefault();
      const p = getCanvasPoint(evt);
      swipe.active=true; swipe.x0=p.x; swipe.y0=p.y; swipe.x1=p.x; swipe.y1=p.y;
    }, { passive: false });
    canvas.addEventListener('touchmove', evt => {
      if (!state.started||!swipe.active) return;
      evt.preventDefault();
      const p = getCanvasPoint(evt);
      swipe.x1=p.x; swipe.y1=p.y; checkSwipeCuts(); swipe.x0=p.x; swipe.y0=p.y;
    }, { passive: false });
    canvas.addEventListener('touchend', evt => {
      evt.preventDefault();
      if (Math.hypot(swipe.x1-swipe.x0, swipe.y1-swipe.y0) < 10) handleTap({x:swipe.x0,y:swipe.y0});
      swipe.active = false;
    }, { passive: false });
  }

  async function boot() {
    setHud(1, 'Loading');
    buildDomParticles();
    bindEvents();
    await preloadAssets();
    setHud(1, 'Ready');
    requestAnimationFrame(frame);
  }

  boot();
})();
