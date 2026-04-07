
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
 },
// Level 11 — Double bounce path
{
  id: 11,
  candy: { x: 140, y: 240 },
  booha: { x: 400, y: 800, behavior: 'idle' },
  ropes: [
    { id:'r1', anchor:{ x:140, y:110 }, type:'normal' }
  ],
  objects: [
    { type:'bounce', x:220, y:600, width:100, height:20 },
    { type:'bounce', x:340, y:520, width:100, height:20 }
  ]
},

// Level 12 — Moving target + fan assist
{
  id: 12,
  candy: { x: 180, y: 240 },
  booha: {
    x: 300, y: 800,
    behavior:'horizontal',
    range:{ min:180, max:420 },
    speed:2.6
  },
  ropes: [
    { id:'r1', anchor:{ x:180, y:110 }, type:'normal' }
  ],
  objects: [
    { type:'fan', x:240, y:600, direction:'right' }
  ]
},

// Level 13 — Delayed swing timing
{
  id: 13,
  candy: { x: 270, y: 260 },
  booha: { x: 270, y: 800, behavior:'idle' },
  ropes: [
    { id:'r1', anchor:{ x:160, y:120 }, type:'delayed', delayMs:400 },
    { id:'r2', anchor:{ x:380, y:120 }, type:'normal' }
  ],
  objects: []
},

// Level 14 — Tight bounce angle
{
  id: 14,
  candy: { x: 200, y: 250 },
  booha: { x: 340, y: 800, behavior:'idle' },
  ropes: [
    { id:'r1', anchor:{ x:200, y:110 }, type:'normal' }
  ],
  objects: [
    { type:'bounce', x:300, y:600, width:80, height:20 }
  ]
},

// Level 15 — Moving + delayed combo
{
  id: 15,
  candy: { x: 260, y: 250 },
  booha: {
    x: 260, y: 800,
    behavior:'horizontal',
    range:{ min:150, max:390 },
    speed:2.8
  },
  ropes: [
    { id:'r1', anchor:{ x:260, y:110 }, type:'delayed', delayMs:420 }
  ],
  objects: []
},

// Level 16 — Fan chain
{
  id: 16,
  candy: { x: 120, y: 240 },
  booha: { x: 420, y: 800, behavior:'idle' },
  ropes: [
    { id:'r1', anchor:{ x:120, y:110 }, type:'normal' }
  ],
  objects: [
    { type:'fan', x:200, y:650, direction:'right' },
    { type:'fan', x:300, y:550, direction:'right' }
  ]
},

// Level 17 — Cross ropes (decision trap)
{
  id: 17,
  candy: { x: 270, y: 280 },
  booha: { x: 270, y: 800, behavior:'idle' },
  ropes: [
    { id:'r1', anchor:{ x:150, y:120 }, type:'normal' },
    { id:'r2', anchor:{ x:390, y:120 }, type:'delayed', delayMs:350 }
  ],
  objects: []
},

// Level 18 — Bounce + moving Booha timing
{
  id: 18,
  candy: { x: 180, y: 240 },
  booha: {
    x: 300, y: 800,
    behavior:'horizontal',
    range:{ min:160, max:420 },
    speed:3
  },
  ropes: [
    { id:'r1', anchor:{ x:180, y:110 }, type:'normal' }
  ],
  objects: [
    { type:'bounce', x:260, y:600, width:90, height:20 }
  ]
},

// Level 19 — Double delayed trap
{
  id: 19,
  candy: { x: 270, y: 260 },
  booha: { x: 270, y: 800, behavior:'idle' },
  ropes: [
    { id:'r1', anchor:{ x:160, y:120 }, type:'delayed', delayMs:400 },
    { id:'r2', anchor:{ x:380, y:120 }, type:'delayed', delayMs:450 }
  ],
  objects: []
},

// Level 20 — Multi-step routing
{
  id: 20,
  candy: { x: 150, y: 240 },
  booha: { x: 400, y: 800, behavior:'idle' },
  ropes: [
    { id:'r1', anchor:{ x:150, y:110 }, type:'normal' }
  ],
  objects: [
    { type:'bounce', x:240, y:600, width:100, height:20 },
    { type:'fan', x:300, y:500, direction:'right' }
  ]
},

{
  id: 21,
  candy:{ x:200,y:240 },
  booha:{ x:340,y:800,behavior:'horizontal',range:{min:180,max:420},speed:3 },
  ropes:[{ id:'r1',anchor:{x:200,y:110},type:'normal' }],
  objects:[{ type:'bounce',x:300,y:600,width:80,height:20 }]
},

{
  id: 22,
  candy:{ x:140,y:240 },
  booha:{ x:420,y:800,behavior:'idle' },
  ropes:[{ id:'r1',anchor:{x:140,y:110},type:'normal' }],
  objects:[
    { type:'fan',x:200,y:650,direction:'right' },
    { type:'bounce',x:320,y:560,width:80,height:20 }
  ]
},

{
  id: 23,
  candy:{ x:270,y:260 },
  booha:{ x:270,y:800,behavior:'horizontal',range:{min:160,max:380},speed:3.2 },
  ropes:[
    { id:'r1',anchor:{x:160,y:120},type:'normal' },
    { id:'r2',anchor:{x:380,y:120},type:'delayed',delayMs:380 }
  ],
  objects:[]
},

{
  id: 24,
  candy:{ x:180,y:240 },
  booha:{ x:360,y:800,behavior:'idle' },
  ropes:[{ id:'r1',anchor:{x:180,y:110},type:'delayed',delayMs:420 }],
  objects:[
    { type:'bounce',x:260,y:600,width:70,height:20 }
  ]
},

{
  id: 25,
  candy:{ x:270,y:250 },
  booha:{ x:270,y:800,behavior:'horizontal',range:{min:140,max:400},speed:3.4 },
  ropes:[{ id:'r1',anchor:{x:270,y:110},type:'delayed',delayMs:350 }],
  objects:[
    { type:'fan',x:270,y:600,direction:'right' }
  ]
},

// Level 26 — Two-step redirect
{
  id: 26,
  candy: { x: 160, y: 240 },
  booha: { x: 400, y: 800, behavior: 'idle' },
  ropes: [
    { id:'r1', anchor:{ x:160, y:110 }, type:'normal' }
  ],
  objects: [
    { type:'bounce', x:240, y:620, width:85, height:20 },
    { type:'fan',    x:300, y:540, direction:'right' }
  ]
},

// Level 27 — Double rope timing
{
  id: 27,
  candy: { x: 270, y: 270 },
  booha: {
    x: 270, y: 800,
    behavior:'horizontal',
    range:{ min:160, max:390 },
    speed:3.1
  },
  ropes: [
    { id:'r1', anchor:{ x:160, y:120 }, type:'normal' },
    { id:'r2', anchor:{ x:380, y:120 }, type:'normal' }
  ],
  objects: []
},

// Level 28 — Delayed bounce catch
{
  id: 28,
  candy: { x: 210, y: 245 },
  booha: { x: 350, y: 800, behavior:'idle' },
  ropes: [
    { id:'r1', anchor:{ x:210, y:110 }, type:'delayed', delayMs:380 }
  ],
  objects: [
    { type:'bounce', x:290, y:610, width:75, height:20 }
  ]
},

// Level 29 — Fan ladder
{
  id: 29,
  candy: { x: 130, y: 235 },
  booha: { x: 410, y: 800, behavior:'idle' },
  ropes: [
    { id:'r1', anchor:{ x:130, y:110 }, type:'normal' }
  ],
  objects: [
    { type:'fan', x:190, y:680, direction:'right' },
    { type:'fan', x:270, y:570, direction:'right' }
  ]
},

// Level 30 — Tight moving target
{
  id: 30,
  candy: { x: 250, y: 250 },
  booha: {
    x: 270, y: 800,
    behavior:'horizontal',
    range:{ min:150, max:400 },
    speed:3.3
  },
  ropes: [
    { id:'r1', anchor:{ x:250, y:110 }, type:'delayed', delayMs:340 }
  ],
  objects: []
},

// Level 31 — Bounce into moving Booha
{
  id: 31,
  candy: { x: 170, y: 240 },
  booha: {
    x: 330, y: 800,
    behavior:'horizontal',
    range:{ min:180, max:420 },
    speed:3.2
  },
  ropes: [
    { id:'r1', anchor:{ x:170, y:110 }, type:'normal' }
  ],
  objects: [
    { type:'bounce', x:260, y:610, width:70, height:20 }
  ]
},

// Level 32 — Mixed rope judgment
{
  id: 32,
  candy: { x: 270, y: 275 },
  booha: { x: 270, y: 800, behavior:'idle' },
  ropes: [
    { id:'r1', anchor:{ x:155, y:120 }, type:'delayed', delayMs:360 },
    { id:'r2', anchor:{ x:385, y:120 }, type:'normal' }
  ],
  objects: []
},

// Level 33 — Bounce, then fan, then timing
{
  id: 33,
  candy: { x: 150, y: 240 },
  booha: {
    x: 390, y: 800,
    behavior:'horizontal',
    range:{ min:220, max:420 },
    speed:3.4
  },
  ropes: [
    { id:'r1', anchor:{ x:150, y:110 }, type:'normal' }
  ],
  objects: [
    { type:'bounce', x:235, y:625, width:70, height:20 },
    { type:'fan',    x:305, y:540, direction:'right' }
  ]
},

// Level 34 — Double delayed trap
{
  id: 34,
  candy: { x: 270, y: 260 },
  booha: { x: 270, y: 800, behavior:'horizontal', range:{ min:160, max:390 }, speed:3.5 },
  ropes: [
    { id:'r1', anchor:{ x:160, y:120 }, type:'delayed', delayMs:320 },
    { id:'r2', anchor:{ x:380, y:120 }, type:'delayed', delayMs:430 }
  ],
  objects: []
},

// Level 35 — Tight bounce route
{
  id: 35,
  candy: { x: 190, y: 240 },
  booha: { x: 360, y: 800, behavior:'idle' },
  ropes: [
    { id:'r1', anchor:{ x:190, y:110 }, type:'normal' }
  ],
  objects: [
    { type:'bounce', x:280, y:610, width:70, height:20 }
  ]
},

// Level 36 — Bounce + fan to moving Booha
{
  id: 36,
  candy: { x:150, y:240 },
  booha: {
    x:420, y:800,
    behavior:'horizontal',
    range:{ min:200, max:420 },
    speed:3.6
  },
  ropes: [
    { id:'r1', anchor:{ x:150, y:110 }, type:'normal' }
  ],
  objects: [
    { type:'bounce', x:260, y:600, width:60, height:20 },
    { type:'fan',    x:320, y:520, direction:'right' }
  ]
},

// Level 37 — Double rope moving target
{
  id: 37,
  candy: { x:270, y:275 },
  booha: {
    x:270, y:800,
    behavior:'horizontal',
    range:{ min:150, max:390 },
    speed:3.6
  },
  ropes: [
    { id:'r1', anchor:{ x:155, y:120 }, type:'normal' },
    { id:'r2', anchor:{ x:385, y:120 }, type:'normal' }
  ],
  objects: []
},

// Level 38 — Double delayed trap
{
  id: 38,
  candy: { x:270, y:260 },
  booha: {
    x:270, y:800,
    behavior:'horizontal',
    range:{ min:140, max:400 },
    speed:3.8
  },
  ropes: [
    { id:'r1', anchor:{ x:160, y:120 }, type:'delayed', delayMs:300 },
    { id:'r2', anchor:{ x:380, y:120 }, type:'delayed', delayMs:420 }
  ],
  objects: []
},

// Level 39 — Two-step fan ladder with tight timing
{
  id: 39,
  candy: { x:130, y:235 },
  booha: { x:420, y:800, behavior:'idle' },
  ropes: [
    { id:'r1', anchor:{ x:130, y:110 }, type:'normal' }
  ],
  objects: [
    { type:'fan', x:210, y:660, direction:'right' },
    { type:'fan', x:300, y:540, direction:'right' }
  ]
},

// Level 40 — Double bounce staircase
{
  id: 40,
  candy: { x:180, y:240 },
  booha: {
    x:360, y:800,
    behavior:'horizontal',
    range:{ min:160, max:420 },
    speed:4
  },
  ropes: [
    { id:'r1', anchor:{ x:180, y:110 }, type:'normal' }
  ],
  objects: [
    { type:'bounce', x:260, y:600, width:60, height:20 },
    { type:'bounce', x:340, y:520, width:60, height:20 }
  ]
},

// Level 41 — Delayed drop into bounce
{
  id: 41,
  candy: { x:220, y:245 },
  booha: { x:350, y:800, behavior:'idle' },
  ropes: [
    { id:'r1', anchor:{ x:220, y:110 }, type:'delayed', delayMs:300 }
  ],
  objects: [
    { type:'bounce', x:300, y:610, width:60, height:20 }
  ]
},

// Level 42 — Mixed ropes, fast moving Booha
{
  id: 42,
  candy: { x:270, y:270 },
  booha: {
    x:260, y:800,
    behavior:'horizontal',
    range:{ min:150, max:400 },
    speed:4
  },
  ropes: [
    { id:'r1', anchor:{ x:160, y:120 }, type:'normal' },
    { id:'r2', anchor:{ x:380, y:120 }, type:'delayed', delayMs:340 }
  ],
  objects: []
},

// Level 43 — Bounce then fan precision
{
  id: 43,
  candy: { x:150, y:240 },
  booha: { x:410, y:800, behavior:'idle' },
  ropes: [
    { id:'r1', anchor:{ x:150, y:110 }, type:'normal' }
  ],
  objects: [
    { type:'bounce', x:235, y:620, width:60, height:20 },
    { type:'fan',    x:305, y:540, direction:'right' }
  ]
},

// Level 44 — Delayed double-rope judgment
{
  id: 44,
  candy: { x:270, y:275 },
  booha: {
    x:270, y:800,
    behavior:'horizontal',
    range:{ min:170, max:380 },
    speed:4.1
  },
  ropes: [
    { id:'r1', anchor:{ x:160, y:120 }, type:'delayed', delayMs:280 },
    { id:'r2', anchor:{ x:380, y:120 }, type:'normal' }
  ],
  objects: []
},

// Level 45 — Double fan carry
{
  id: 45,
  candy: { x:140, y:240 },
  booha: {
    x:420, y:800,
    behavior:'horizontal',
    range:{ min:200, max:420 },
    speed:4.2
  },
  ropes: [
    { id:'r1', anchor:{ x:140, y:110 }, type:'delayed', delayMs:320 }
  ],
  objects: [
    { type:'fan', x:220, y:650, direction:'right' },
    { type:'fan', x:300, y:520, direction:'right' }
  ]
},

// Level 46 — Tiny bounce moving target
{
  id: 46,
  candy: { x:200, y:240 },
  booha: {
    x:350, y:800,
    behavior:'horizontal',
    range:{ min:180, max:420 },
    speed:4.2
  },
  ropes: [
    { id:'r1', anchor:{ x:200, y:110 }, type:'normal' }
  ],
  objects: [
    { type:'bounce', x:290, y:610, width:55, height:20 }
  ]
},

// Level 47 — Full combo with mixed rope timing
{
  id: 47,
  candy: { x:160, y:245 },
  booha: { x:400, y:800, behavior:'idle' },
  ropes: [
    { id:'r1', anchor:{ x:160, y:110 }, type:'normal' },
    { id:'r2', anchor:{ x:310, y:130 }, type:'delayed', delayMs:300 }
  ],
  objects: [
    { type:'bounce', x:250, y:620, width:55, height:20 },
    { type:'fan',    x:315, y:540, direction:'right' }
  ]
},

// Level 48 — Fast double rope
{
  id: 48,
  candy: { x:270, y:280 },
  booha: {
    x:270, y:800,
    behavior:'horizontal',
    range:{ min:150, max:400 },
    speed:4.3
  },
  ropes: [
    { id:'r1', anchor:{ x:155, y:120 }, type:'normal' },
    { id:'r2', anchor:{ x:385, y:120 }, type:'delayed', delayMs:260 }
  ],
  objects: []
},

// Level 49 — Narrow staircase route
{
  id: 49,
  candy: { x:150, y:235 },
  booha: { x:410, y:800, behavior:'horizontal', range:{ min:220, max:420 }, speed:4.3 },
  ropes: [
    { id:'r1', anchor:{ x:150, y:110 }, type:'normal' }
  ],
  objects: [
    { type:'bounce', x:235, y:640, width:55, height:20 },
    { type:'bounce', x:310, y:540, width:55, height:20 },
    { type:'fan',    x:360, y:470, direction:'right' }
  ]
},

// Level 50 — Final exam
{
  id: 50,
  candy: { x:270, y:260 },
  booha: {
    x:270, y:800,
    behavior:'horizontal',
    range:{ min:140, max:400 },
    speed:4.5
  },
  ropes: [
    { id:'r1', anchor:{ x:160, y:120 }, type:'normal' },
    { id:'r2', anchor:{ x:380, y:120 }, type:'delayed', delayMs:350 }
  ],
  objects: [
    { type:'bounce', x:240, y:600, width:60, height:20 },
    { type:'fan',    x:300, y:520, direction:'right' }
  ]
},

  
];

window.FEED_BOOHA_LEVELS = FEED_BOOHA_LEVELS;
