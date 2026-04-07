
// =====================================================
// Feed Booha — Level Data (v1)
// =====================================================
// Pure data only. No logic.
// The engine reads this.

const FEED_BOOHA_LEVELS = [

  // -------------------------------------------------
  // Level 1 — Simple Drop
  // -------------------------------------------------
  {
    id: 1,
    candy: { x: 640, y: 200, type: 'normal' },
    booha: { x: 640, y: 600, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 640, y: 100 } }
    ],
    objects: []
  },

  // -------------------------------------------------
  // Level 2 — Offset Drop
  // -------------------------------------------------
  {
    id: 2,
    candy: { x: 500, y: 200, type: 'normal' },
    booha: { x: 700, y: 600, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 500, y: 100 } }
    ],
    objects: []
  },

  // -------------------------------------------------
  // Level 3 — Two Ropes (Timing)
  // -------------------------------------------------
  {
    id: 3,
    candy: { x: 640, y: 250, type: 'normal' },
    booha: { x: 640, y: 600, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 540, y: 150 } },
      { id: 'r2', anchor: { x: 740, y: 150 } }
    ],
    objects: []
  },

  // -------------------------------------------------
  // Level 4 — Bounce Pad
  // -------------------------------------------------
  {
    id: 4,
    candy: { x: 500, y: 200, type: 'normal' },
    booha: { x: 800, y: 600, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 500, y: 100 } }
    ],
    objects: [
      {
        type: 'bounce',
        x: 650,
        y: 500,
        width: 120,
        height: 20
      }
    ]
  },

  // -------------------------------------------------
  // Level 5 — Moving Booha
  // -------------------------------------------------
  {
    id: 5,
    candy: { x: 640, y: 200, type: 'normal' },
    booha: {
      x: 640,
      y: 600,
      behavior: 'horizontal',
      range: { min: 500, max: 780 },
      speed: 2
    },
    ropes: [
      { id: 'r1', anchor: { x: 640, y: 100 } }
    ],
    objects: []
  }

];

// Make global (simple for now)
window.FEED_BOOHA_LEVELS = FEED_BOOHA_LEVELS;
