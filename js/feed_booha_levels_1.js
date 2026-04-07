
// =====================================================
// Feed Booha — Level Data (v3)  Portrait 540×960
// =====================================================
// Canvas: 540 wide × 960 tall
// Booha sits near bottom ~y:800
// Candy starts upper third ~y:200–320
// New rope types: 'normal' | 'delayed'
// New object types: 'bounce' | 'fan'
// =====================================================

const FEED_BOOHA_LEVELS = [

  // Level 1 — Simple Drop  (teach the cut)
  {
    id: 1,
    candy: { x: 270, y: 220 },
    booha: { x: 270, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 270, y: 100 }, type: 'normal' }
    ],
    objects: []
  },

  // Level 2 — Offset drop  (aim matters)
  {
    id: 2,
    candy: { x: 200, y: 230 },
    booha: { x: 340, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 200, y: 100 }, type: 'normal' }
    ],
    objects: []
  },

  // Level 3 — Two ropes  (cut order matters)
  {
    id: 3,
    candy: { x: 270, y: 270 },
    booha: { x: 270, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 160, y: 130 }, type: 'normal' },
      { id: 'r2', anchor: { x: 380, y: 130 }, type: 'normal' }
    ],
    objects: []
  },

  // Level 4 — Bounce pad  (trajectory + platform)
  {
    id: 4,
    candy: { x: 180, y: 230 },
    booha: { x: 360, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 180, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'bounce', x: 310, y: 580, width: 120, height: 20 }
    ]
  },

  // Level 5 — Moving Booha  (timing)
  {
    id: 5,
    candy: { x: 270, y: 220 },
    booha: {
      x: 270, y: 800,
      behavior: 'horizontal',
      range: { min: 160, max: 380 },
      speed: 2
    },
    ropes: [
      { id: 'r1', anchor: { x: 270, y: 100 }, type: 'normal' }
    ],
    objects: []
  },

  // Level 6 — Delayed cut  (new mechanic intro)
  {
    id: 6,
    candy: { x: 270, y: 250 },
    booha: { x: 270, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 270, y: 100 }, type: 'delayed', delayMs: 450 }
    ],
    objects: []
  },

  // Level 7 — Fan redirect  (player control)
  {
    id: 7,
    candy: { x: 160, y: 230 },
    booha: { x: 380, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 160, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'fan', x: 200, y: 620, direction: 'right' }
    ]
  },

  // Level 8 — Two ropes + moving Booha  (judgment call)
  {
    id: 8,
    candy: { x: 270, y: 280 },
    booha: {
      x: 200, y: 800,
      behavior: 'horizontal',
      range: { min: 140, max: 400 },
      speed: 2.4
    },
    ropes: [
      { id: 'r1', anchor: { x: 160, y: 130 }, type: 'normal' },
      { id: 'r2', anchor: { x: 380, y: 130 }, type: 'normal' }
    ],
    objects: []
  },

  // Level 9 — Bounce + fan combo  (multi-step)
  {
    id: 9,
    candy: { x: 140, y: 230 },
    booha: { x: 400, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 140, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'bounce', x: 220, y: 560, width: 110, height: 20 },
      { type: 'fan',    x: 300, y: 480, direction: 'right' }
    ]
  },

  // Level 10 — Everything  (full challenge)
  {
    id: 10,
    candy: { x: 270, y: 260 },
    booha: {
      x: 270, y: 800,
      behavior: 'horizontal',
      range: { min: 150, max: 390 },
      speed: 2.6
    },
    ropes: [
      { id: 'r1', anchor: { x: 160, y: 120 }, type: 'normal' },
      { id: 'r2', anchor: { x: 380, y: 120 }, type: 'delayed', delayMs: 400 }
    ],
    objects: [
      { type: 'bounce', x: 270, y: 540, width: 100, height: 20 }
    ]
  }

];

window.FEED_BOOHA_LEVELS = FEED_BOOHA_LEVELS;
