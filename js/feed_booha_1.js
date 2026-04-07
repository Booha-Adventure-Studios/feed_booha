
// =====================================================
// Feed Booha — Engine (v1)
// =====================================================
// Simple starter build:
// - 1 candy with gravity
// - click rope to cut
// - Booha state changes
// - win / fail flow
// - bounce pad support
// - moving Booha support
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
  const levelText   = document.getElementById('levelText');
  const goalText    = document.getElementById('goalText');
  const stateText   = document.getElementById('stateText');
  const messageTitle = document.getElementById('messageTitle');
  const messageText  = document.getElementById('messageText');



  const W = canvas.width;
  const H = canvas.height;
  const FLOOR_Y = H - 40;
  const GRAVITY = 0.45;
  const AIR_DRAG = 0.999;
  const ROPE_CUT_RADIUS = 24;
  const BOOHA_W = 180;
  const BOOHA_H = 180;
  const CANDY_R = 28;
  const MOUTH_TRIGGER_DIST = 170;
  const SURPRISED_TRIGGER_DIST = 95;
  const FAIL_BUFFER = 36;

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
    pendingFailTimeout: null
  };

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
    const imageEntries = Object.entries(imageSources);
    for (const [key, src] of imageEntries) {
      try {
        images[key] = await loadImage(src);
      } catch (err) {
        console.warn('Image failed to load:', src, err);
      }
    }

    const audioEntries = Object.entries(audioSources);
    for (const [key, src] of audioEntries) {
      sounds[key] = loadAudio(src);
    }
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

  function stopAllTimers() {
    if (state.pendingSuccessTimeout) {
      clearTimeout(state.pendingSuccessTimeout);
      state.pendingSuccessTimeout = null;
    }
    if (state.pendingFailTimeout) {
      clearTimeout(state.pendingFailTimeout);
      state.pendingFailTimeout = null;
    }
  }

  function setHud(levelLabel, statusLabel) {
    levelText.textContent = String(levelLabel);
    goalText.textContent = 'Feed Booha';
    stateText.textContent = statusLabel;
  }

  function cloneLevel(level) {
    return JSON.parse(JSON.stringify(level));
  }

  function buildLevel(index) {
  stopAllTimers();

  const rawLevel = LEVELS[index] || LEVELS[0];
  if (!rawLevel) {
    console.error('No valid level data found.');
    return;
  }
  const level = cloneLevel(rawLevel);

  state.currentLevel = level;
  state.cutCount = 0;
  state.won = false;
  state.lost = false;
  state.running = true;
  state.boohaSprite = 'booWait';
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
  if (!LEVELS.length) {
    console.error('No levels found. Check feed_booha_levels_1.js');
    return;
  }

  state.started = true;
  startOverlay.classList.remove('overlay--show');
  startOverlay.setAttribute('aria-hidden', 'true');
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

  function showMessage(title, text, nextVisible = true) {
    messageTitle.textContent = title;
    messageText.textContent = text;
    nextBtn.style.display = nextVisible ? 'inline-flex' : 'none';
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

  function updateBooha(dt) {
    if (!state.booha) return;
    const b = state.booha;

    if (b.behavior === 'horizontal' && b.range) {
      b.x += b.speed * b.dir * dt * 0.06;
      if (b.x <= b.range.min) {
        b.x = b.range.min;
        b.dir = 1;
      } else if (b.x >= b.range.max) {
        b.x = b.range.max;
        b.dir = -1;
      }
    }
  }

  function averageAnchor() {
    const active = getActiveRopes();
    if (!active.length) return null;
    let sumX = 0;
    let sumY = 0;
    for (const r of active) {
      sumX += r.anchor.x;
      sumY += r.anchor.y;
    }
    return {
      x: sumX / active.length,
      y: sumY / active.length
    };
  }

  function updateAttachedCandy() {
    const active = getActiveRopes();
    if (!active.length) {
      state.candy.attached = false;
      return;
    }

    const center = averageAnchor();
    state.candy.x += (center.x - state.candy.x) * 0.18;
    state.candy.y += (center.y + 90 - state.candy.y) * 0.18;
    state.candy.vx *= 0.9;
    state.candy.vy *= 0.9;
  }

  function updateFreeCandy() {
    const c = state.candy;
    c.vy += GRAVITY;
    c.x += c.vx;
    c.y += c.vy;
    c.vx *= AIR_DRAG;
    c.vy *= AIR_DRAG;
  }

  function handleBouncePads() {
    if (state.bounceCooldown > 0) state.bounceCooldown -= 1;
    const c = state.candy;
    if (!c || c.attached) return;

    for (const obj of state.objects) {
      if (obj.type !== 'bounce') continue;

      const left = obj.x - obj.width / 2;
      const right = obj.x + obj.width / 2;
      const top = obj.y - obj.height / 2;

      const horizontallyInside = c.x + c.r > left && c.x - c.r < right;
      const hittingTop = c.y + c.r >= top && c.y + c.r <= top + 22;
      const movingDown = c.vy > 0;

      if (horizontallyInside && hittingTop && movingDown) {
        c.y = top - c.r;
        c.vy = -Math.max(10, c.vy * 0.95);
        c.vx *= 1.02;
        if (state.bounceCooldown <= 0) {
          playSfx('bounce1');
          state.bounceCooldown = 8;
        }
      }
    }
  }

  function boohaMouthPoint() {
    const b = state.booha;
    return {
      x: b.x,
      y: b.y - 12
    };
  }

  function updateBoohaMood() {
    if (state.won || state.lost) return;

    const c = state.candy;
    const mouth = boohaMouthPoint();
    const dx = c.x - mouth.x;
    const dy = c.y - mouth.y;
    const dist = Math.hypot(dx, dy);

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
    const c = state.candy;
    const mouth = boohaMouthPoint();
    const dx = c.x - mouth.x;
    const dy = c.y - mouth.y;
    const hit = Math.hypot(dx, dy) < 58;

    if (!hit) return;

    state.won = true;
    state.running = false;
    state.candy.alive = false;
    state.boohaSprite = 'booEat';
    setHud(state.levelIndex + 1, 'Yum!');

    playSfx('get1');
    state.pendingSuccessTimeout = setTimeout(() => playSfx('get2'), 180);
    state.effectTimers.push(state.pendingSuccessTimeout);
    state.pendingSuccessTimeout = setTimeout(() => playSfx('get3'), 360);
    state.effectTimers.push(state.pendingSuccessTimeout);

    const loopAudio = playSfx('get4', true);

    state.pendingSuccessTimeout = setTimeout(() => {
      state.boohaSprite = 'booWin';
      if (loopAudio) {
        setTimeout(() => {
          loopAudio.pause();
          loopAudio.currentTime = 0;
        }, 500);
      }
      showMessage('Nice!', 'Booha is happy.', true);
    }, 520);
  }

  function checkFail() {
    if (state.won || state.lost) return;
    const c = state.candy;
    if (c.y - c.r <= FLOOR_Y + FAIL_BUFFER) return;

    state.lost = true;
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
      c.y = FLOOR_Y - c.r;
      c.vx *= 0.95;
      c.vy = 0;
    }
  }

  function update(dt) {
    if (!state.started || !state.currentLevel) return;

    updateBooha(dt);

    if (state.running) {
      if (state.candy.attached) {
        updateAttachedCandy();
      } else {
        updateFreeCandy();
        handleBouncePads();
        checkSuccess();
        checkFail();
        clampCandyToFloor();
      }
      updateBoohaMood();
    }
  }

  function drawBackground() {
    if (images.bg) {
      ctx.drawImage(images.bg, 0, 0, W, H);
      return;
    }
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

  function drawObjects() {
    for (const obj of state.objects) {
      if (obj.type === 'bounce') {
        ctx.save();
        ctx.fillStyle = '#ff8fd1';
        ctx.fillRect(obj.x - obj.width / 2, obj.y - obj.height / 2, obj.width, obj.height);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.strokeRect(obj.x - obj.width / 2, obj.y - obj.height / 2, obj.width, obj.height);
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
    const b = state.booha;
    const img = images[state.boohaSprite] || images.booWait;
    const x = b.x - b.w / 2;
    const y = b.y - b.h / 2;

    if (img) {
      ctx.drawImage(img, x, y, b.w, b.h);
      return;
    }

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
    drawCandy();
    drawBooha();
  }

  function frame(ts) {
    const dt = state.lastTime ? ts - state.lastTime : 16.67;
    state.lastTime = ts;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function cutNearestRope(mx, my) {
    if (!state.currentLevel || state.won || state.lost) return;
    const active = getActiveRopes();
    if (!active.length) return;

    let best = null;
    let bestDist = Infinity;

    for (const rope of active) {
      const dist = distancePointToSegment(
        mx, my,
        rope.anchor.x, rope.anchor.y,
        state.candy.x, state.candy.y
      );
      if (dist < bestDist) {
        bestDist = dist;
        best = rope;
      }
    }

    if (best && bestDist <= ROPE_CUT_RADIUS) {
      best.cut = true;
      state.cutCount += 1;
      if (!getActiveRopes().length) {
        state.candy.attached = false;
      }
      setHud(state.levelIndex + 1, 'Cut!');
    }
  }

  function getCanvasPoint(evt) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;

    if (evt.touches && evt.touches[0]) {
      return {
        x: (evt.touches[0].clientX - rect.left) * sx,
        y: (evt.touches[0].clientY - rect.top) * sy
      };
    }

    return {
      x: (evt.clientX - rect.left) * sx,
      y: (evt.clientY - rect.top) * sy
    };
  }

  function distancePointToSegment(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    const t = lenSq ? Math.max(0, Math.min(1, dot / lenSq)) : 0;
    const sx = x1 + C * t;
    const sy = y1 + D * t;
    const dx = px - sx;
    const dy = py - sy;
    return Math.hypot(dx, dy);
  }

  function bindEvents() {
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', resetLevel);
    retryBtn.addEventListener('click', () => {
      hideMessage();
      resetLevel();
    });
    nextBtn.addEventListener('click', nextLevel);
    helpBtn.addEventListener('click', () => toggleHelp(true));
    closeHelpBtn.addEventListener('click', () => toggleHelp(false));

    canvas.addEventListener('click', (evt) => {
      if (!state.started) return;
      const p = getCanvasPoint(evt);
      cutNearestRope(p.x, p.y);
    });

    canvas.addEventListener('touchstart', (evt) => {
      if (!state.started) return;
      evt.preventDefault();
      const p = getCanvasPoint(evt);
      cutNearestRope(p.x, p.y);
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

