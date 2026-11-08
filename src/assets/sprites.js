import { RAMPS } from './palette.js';
import { C, ellipse, hline, line, outline, px, rect, roundRect, shadowEllipse, shadowRect, vline } from './brush.js';
import { alphaAt, blank, setPixel } from './pixelBuffer.js';
import { COMPUTER_STATES, COMPUTER_TIERS } from './layout.js';
import { CELL } from './roomLayout.js';

const OAK = RAMPS.oak;
const TEAK = RAMPS.teak;
const STEEL = RAMPS.steel;
const BEIGE = RAMPS.beige;
const CREAM = RAMPS.cream;
const SKY = RAMPS.sky;
const NAVY = RAMPS.navy;
const GOLD = RAMPS.gold;
const RED = RAMPS.red;
const LEAF = RAMPS.leafy;
const TERRA = RAMPS.terra;
const WINE = RAMPS.wine;
const PINK = RAMPS.pink;
const CYAN = RAMPS.cyan;
const LIME = RAMPS.lime;
const VIOLET = RAMPS.violet;
const SKIN = RAMPS.skinR;

const frame = () => blank(CELL, CELL);
const RGB_CYCLE = [PINK[1], VIOLET[1], CYAN[1], LIME[1], GOLD[1]];

function glow(b, cx, cy, rx, ry, color, alpha) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1 && alphaAt(b, x, y) === 0) setPixel(b, x, y, color, alpha);
    }
  }
}

/* ---------------------------------------------------------------- computers */

const DESKS = {
  basic: { top: [OAK[3], OAK[2], OAK[1]], grain: OAK[3], front: [OAK[5], OAK[4], OAK[5]] },
  standard: { top: [TEAK[3], TEAK[2], TEAK[1]], grain: TEAK[3], front: [TEAK[5], TEAK[4], TEAK[5]] },
  gaming: { top: [STEEL[6], STEEL[5], STEEL[4]], grain: STEEL[6], front: [STEEL[7], STEEL[6], STEEL[7]], rgb: true },
  highend: { top: [STEEL[2], STEEL[1], STEEL[0]], grain: STEEL[2], front: [STEEL[4], STEEL[3], STEEL[4]] },
  premium: { top: [NAVY[4], NAVY[3], GOLD[2]], grain: NAVY[4], front: [GOLD[3], NAVY[4], NAVY[5]] },
  console: { top: [STEEL[5], STEEL[4], STEEL[3]], grain: STEEL[6], front: [STEEL[7], STEEL[5], STEEL[6]] }
};

/** Frames in COMPUTER_ROWS x COMPUTER_STATES order: seat-side views, then back views. */
export function paintComputerFrames() {
  return [
    ...COMPUTER_TIERS.flatMap((tier) => COMPUTER_STATES.map((state) => computer(tier, state))),
    ...COMPUTER_TIERS.flatMap((tier) => COMPUTER_STATES.map((state) => computerBack(tier, state)))
  ];
}

const BACK_GLOW = {
  basic: SKY[1],
  standard: SKY[2],
  gaming: VIOLET[1],
  highend: CYAN[1],
  premium: GOLD[1],
  console: VIOLET[1]
};

/** Desk seen from the monitor's back, for a guest sitting on the far side and facing the viewer. */
function computerBack(tier, state) {
  const b = frame();
  if (state === 'occupied') glow(b, 16, 4, 12, 4, BACK_GLOW[tier], 72);
  desk(b, DESKS[tier]);
  BACK_RIGS[tier](b, state);
  if (state === 'maintenance') hazardTape(b);
  if (state === 'broken') smoke(b);
  return outline(b);
}

function hazardTape(b) {
  for (let x = 5; x < 27; x += 1) {
    for (let y = 24; y < 26; y += 1) px(b, x, y, (x + y) % 4 < 2 ? GOLD[1] : C.ink);
  }
}

const BACK_RIGS = {
  basic(b, state) {
    rect(b, 8, 4, 16, 10, BEIGE[1]);
    hline(b, 8, 4, 16, BEIGE[0]);
    vline(b, 23, 5, 9, BEIGE[2]);
    rect(b, 11, 8, 10, 9, BEIGE[2]);
    hline(b, 11, 8, 10, BEIGE[1]);
    for (const y of [10, 12, 14]) hline(b, 12, y, 8, BEIGE[3]);
    rect(b, 13, 17, 6, 1, BEIGE[3]);
    rect(b, 2, 7, 5, 13, BEIGE[1]);
    hline(b, 2, 7, 5, BEIGE[0]);
    vline(b, 2, 8, 12, BEIGE[2]);
    hline(b, 3, 10, 3, BEIGE[3]);
    hline(b, 3, 12, 3, BEIGE[3]);
    led(b, 4, 16, state);
  },
  standard(b, state) {
    rect(b, 7, 4, 18, 11, STEEL[6]);
    hline(b, 7, 4, 18, STEEL[5]);
    rect(b, 12, 7, 8, 5, STEEL[7]);
    for (const [x, y] of [[13, 8], [18, 8], [13, 10], [18, 10]]) px(b, x, y, STEEL[4]);
    led(b, 23, 13, state);
    rect(b, 15, 15, 2, 3, STEEL[5]);
    rect(b, 12, 18, 8, 1, STEEL[6]);
    rect(b, 2, 8, 4, 12, STEEL[6]);
    vline(b, 5, 8, 12, STEEL[5]);
    px(b, 3, 10, SKY[2]);
    hline(b, 3, 13, 2, STEEL[7]);
  },
  gaming(b, state) {
    rect(b, 6, 3, 21, 12, STEEL[7]);
    hline(b, 6, 3, 21, STEEL[6]);
    for (let x = 7; x < 26; x += 1) px(b, x, 14, RGB_CYCLE[Math.floor(x / 3) % RGB_CYCLE.length]);
    rect(b, 14, 6, 5, 5, STEEL[6]);
    px(b, 16, 8, PINK[1]);
    led(b, 25, 12, state);
    rect(b, 15, 15, 2, 2, STEEL[6]);
    line(b, 11, 19, 15, 17, RED[3]);
    line(b, 20, 19, 16, 17, RED[3]);
    rect(b, 1, 5, 5, 15, STEEL[7]);
    rect(b, 2, 6, 3, 13, STEEL[6]);
    for (const [cy, color] of [[8, CYAN[1]], [12, PINK[1]], [16, VIOLET[1]]]) px(b, 3, cy, color);
  },
  highend(b, state) {
    for (const x of [2, 17]) {
      rect(b, x, 4, 13, 10, STEEL[6]);
      hline(b, x, 4, 13, STEEL[5]);
      rect(b, x + 4, 7, 5, 4, STEEL[7]);
    }
    led(b, 15, 6, state);
    rect(b, 15, 14, 2, 4, STEEL[3]);
    rect(b, 12, 18, 8, 1, STEEL[4]);
  },
  premium(b, state) {
    hline(b, 3, 3, 26, STEEL[7]);
    rect(b, 2, 4, 28, 10, STEEL[7]);
    hline(b, 3, 4, 26, STEEL[6]);
    hline(b, 3, 13, 26, GOLD[3]);
    rect(b, 14, 7, 4, 3, GOLD[2]);
    px(b, 15, 7, GOLD[1]);
    led(b, 27, 11, state);
    rect(b, 15, 14, 2, 4, GOLD[3]);
    rect(b, 11, 18, 10, 1, GOLD[2]);
  },
  console(b, state) {
    rect(b, 5, 2, 22, 13, STEEL[7]);
    hline(b, 5, 2, 22, STEEL[6]);
    rect(b, 10, 5, 12, 8, STEEL[6]);
    for (const y of [7, 9, 11]) hline(b, 12, y, 8, STEEL[7]);
    rect(b, 13, 15, 6, 2, STEEL[6]);
    rect(b, 11, 17, 10, 3, STEEL[7]);
    hline(b, 12, 18, 8, STEEL[5]);
    led(b, 19, 18, state);
  }
};

function computer(tier, state) {
  const b = frame();
  desk(b, DESKS[tier]);
  RIGS[tier](b, state);
  if (state === 'broken') smoke(b);
  return outline(b);
}

function desk(b, style) {
  const [far, mid, lip] = style.top;
  shadowRect(b, 1, 31, 30, 1);
  shadowRect(b, 4, 26, 24, 5);
  hline(b, 1, 17, 30, far);
  rect(b, 1, 18, 30, 4, mid);
  for (let i = 0; i < 6; i += 1) hline(b, 3 + ((i * 11) % 24), 18 + (i % 4), 3 + (i % 3), style.grain);
  hline(b, 1, 22, 30, lip);
  const [shade, face, foot] = style.front;
  hline(b, 1, 23, 30, shade);
  rect(b, 1, 24, 30, 2, face);
  for (const x of [1, 28]) {
    rect(b, x, 26, 3, 5, face);
    vline(b, x === 1 ? 3 : 28, 26, 5, shade);
    hline(b, x, 30, 3, foot);
  }
  if (style.rgb) {
    for (let x = 1; x < 31; x += 1) px(b, x, 24, RGB_CYCLE[Math.floor(x / 3) % RGB_CYCLE.length]);
  }
}

function led(b, x, y, state) {
  const color = state === 'broken' ? RED[1] : state === 'maintenance' ? GOLD[1] : LIME[1];
  px(b, x, y, color);
}

function screen(b, x, y, w, h, tier, state, side = 0) {
  if (state === 'broken') return brokenScreen(b, x, y, w, h);
  if (state === 'maintenance') return maintenanceScreen(b, x, y, w, h);
  if (state === 'occupied') return gameScreen(b, x, y, w, h, side ? 'chat' : GAME_BY_TIER[tier]);
  return desktop(b, x, y, w, h, tier);
}

const GAME_BY_TIER = {
  basic: 'field',
  standard: 'field',
  gaming: 'arena',
  highend: 'race',
  premium: 'arena',
  console: 'arena'
};

function desktop(b, x, y, w, h, tier) {
  const bar = y + h - 1;
  if (tier === 'basic') {
    for (let r = 0; r < h - 1; r += 1) hline(b, x, y + r, w, r < h / 2 - 1 ? SKY[2] : SKY[1]);
    for (let c = 0; c < w; c += 1) {
      const hill = Math.round(h * 0.55 + Math.sin((c / w) * Math.PI * 1.3 + 0.4) * 1.5);
      for (let r = hill; r < h - 1; r += 1) px(b, x + c, y + r, r === hill ? LEAF[1] : LEAF[2]);
    }
    hline(b, x, bar, w, SKY[5]);
    hline(b, x, bar, 3, LIME[2]);
    px(b, x + 1, y + 1, CREAM[0]);
    px(b, x + 1, y + 3, CREAM[0]);
    return;
  }
  const look = {
    standard: [SKY[4], SKY[3], STEEL[6]],
    gaming: [VIOLET[4], VIOLET[3], STEEL[7]],
    highend: [NAVY[3], NAVY[2], STEEL[6]],
    premium: [WINE[5], WINE[4], STEEL[7]],
    console: [NAVY[4], NAVY[3], STEEL[6]]
  }[tier];
  for (let r = 0; r < h - 1; r += 1) hline(b, x, y + r, w, r < (h - 1) / 2 ? look[0] : look[1]);
  hline(b, x, bar, w, look[2]);
  px(b, x + 1, bar, CYAN[1]);
  for (let r = 1; r < h - 2; r += 3) px(b, x + 1, y + r, CREAM[1]);
  const cx = x + Math.floor(w / 2);
  const cy = y + Math.floor((h - 1) / 2);
  if (tier === 'gaming') {
    px(b, cx, cy - 2, CYAN[1]);
    hline(b, cx - 1, cy - 1, 3, CYAN[2]);
    hline(b, cx - 2, cy, 5, PINK[1]);
    hline(b, cx - 1, cy + 1, 3, PINK[2]);
  } else if (tier === 'premium') {
    px(b, cx, cy - 1, GOLD[0]);
    hline(b, cx - 1, cy, 3, GOLD[1]);
    px(b, cx, cy + 1, GOLD[2]);
  } else {
    rect(b, cx - 2, cy - 1, 5, 3, CREAM[1]);
    hline(b, cx - 2, cy - 1, 5, SKY[5]);
  }
}

function gameScreen(b, x, y, w, h, kind) {
  if (kind === 'chat') {
    rect(b, x, y, w, h, STEEL[6]);
    rect(b, x, y, 2, h, STEEL[7]);
    const colors = [CYAN[1], PINK[1], LIME[1], CREAM[1], GOLD[1]];
    for (let r = 1; r < h - 1; r += 2) {
      px(b, x + 3, y + r, colors[r % colors.length]);
      hline(b, x + 5, y + r, Math.max(2, (w - 7) - ((r * 3) % 5)), STEEL[3]);
    }
    return;
  }
  if (kind === 'race') {
    rect(b, x, y, w, h, LEAF[3]);
    hline(b, x, y, w, SKY[2]);
    hline(b, x, y + 1, w, SKY[1]);
    for (let r = 2; r < h; r += 1) {
      const half = Math.round(1 + ((r - 2) / (h - 2)) * (w / 2 - 1));
      const cx = x + Math.floor(w / 2);
      hline(b, cx - half, y + r, half * 2, STEEL[5]);
      if (r % 2 === 0) px(b, cx, y + r, CREAM[0]);
    }
    const carX = x + Math.floor(w / 2) - 2;
    rect(b, carX, y + h - 3, 4, 2, RED[2]);
    hline(b, carX + 1, y + h - 3, 2, RED[1]);
    return;
  }
  if (kind === 'arena') {
    rect(b, x, y, w, h, VIOLET[4]);
    for (let c = 1; c < w; c += 4) vline(b, x + c, y + Math.floor(h / 2), Math.ceil(h / 2), VIOLET[3]);
    hline(b, x, y + Math.floor(h / 2), w, VIOLET[3]);
    px(b, x + 2, y + h - 3, CYAN[1]);
    px(b, x + 2, y + h - 4, CYAN[2]);
    px(b, x + w - 3, y + 3, PINK[1]);
    px(b, x + w - 3, y + 4, PINK[2]);
    line(b, x + 3, y + h - 4, x + w - 5, y + 4, GOLD[0]);
    hline(b, x + 1, y + 1, 4, RED[1]);
    hline(b, x + w - 5, y + 1, 4, CYAN[2]);
    return;
  }
  for (let r = 0; r < h; r += 1) hline(b, x, y + r, w, r < h / 2 ? SKY[2] : r === Math.ceil(h / 2) ? LEAF[1] : LEAF[2]);
  ellipse(b, x + w - 4, y + Math.ceil(h / 2) - 1, 2.2, 2, LEAF[4]);
  px(b, x + w - 4, y + Math.ceil(h / 2) + 1, TEAK[3]);
  px(b, x + 4, y + h - 3, RED[2]);
  px(b, x + 4, y + h - 4, SKIN[1]);
  px(b, x + 7, y + h - 2, GOLD[1]);
  hline(b, x + 1, y + 1, 4, RED[2]);
  px(b, x + w - 2, y + 1, GOLD[1]);
}

function brokenScreen(b, x, y, w, h) {
  rect(b, x, y, w, h, STEEL[7]);
  const pts = [[x + w - 2, y], [x + w - 5, y + 3], [x + w - 4, y + 5], [x + Math.floor(w / 2), y + h - 3], [x + 2, y + h - 1]];
  for (let i = 0; i < pts.length - 1; i += 1) line(b, ...pts[i], ...pts[i + 1], STEEL[2]);
  line(b, x + w - 5, y + 3, x + 2, y + 2, STEEL[4]);
  px(b, x + w - 4, y + 4, CREAM[0]);
  const cx = x + 3;
  const cy = y + h - 4;
  px(b, cx, cy, RED[1]);
  px(b, cx + 1, cy + 1, RED[1]);
  px(b, cx + 2, cy, RED[1]);
  px(b, cx, cy + 2, RED[1]);
  px(b, cx + 2, cy + 2, RED[1]);
}

function maintenanceScreen(b, x, y, w, h) {
  rect(b, x, y, w, h, NAVY[5]);
  for (let c = 0; c < w; c += 1) {
    for (let r = h - 2; r < h; r += 1) px(b, x + c, y + r, (c + r) % 4 < 2 ? GOLD[1] : C.ink);
  }
  const cx = x + Math.floor(w / 2);
  const cy = y + Math.floor((h - 2) / 2);
  line(b, cx - 2, cy + 2, cx + 1, cy - 1, STEEL[2]);
  px(b, cx + 1, cy - 2, STEEL[1]);
  px(b, cx + 2, cy - 1, STEEL[1]);
  px(b, cx + 2, cy - 2, NAVY[5]);
  px(b, cx - 2, cy + 2, STEEL[3]);
}

function smoke(b) {
  const puffs = [[23, 4, 2.2], [25, 2, 1.8], [22, 1, 1.4]];
  for (const [cx, cy, r] of puffs) {
    ellipse(b, cx, cy, r, r, STEEL[3]);
    px(b, Math.floor(cx - r / 2), Math.floor(cy - r / 2), STEEL[2]);
  }
}

function keyboard(b, x, y, w, body, key, edge) {
  rect(b, x, y, w, 2, body);
  for (let i = 1; i < w - 1; i += 2) px(b, x + i, y, key);
  hline(b, x, y + 2, w, edge);
}

const RIGS = {
  basic(b, state) {
    rect(b, 10, 3, 12, 2, BEIGE[0]);
    rect(b, 8, 5, 16, 12, BEIGE[1]);
    vline(b, 23, 5, 12, BEIGE[2]);
    hline(b, 8, 16, 16, BEIGE[2]);
    hline(b, 9, 5, 14, BEIGE[0]);
    rect(b, 12, 17, 8, 1, BEIGE[3]);
    roundRect(b, 10, 7, 12, 8, STEEL[6]);
    screen(b, 11, 8, 10, 6, 'basic', state);
    led(b, 21, 15, state);
    hline(b, 10, 15, 3, BEIGE[3]);
    rect(b, 25, 7, 5, 13, BEIGE[1]);
    hline(b, 25, 7, 5, BEIGE[0]);
    vline(b, 29, 8, 12, BEIGE[2]);
    hline(b, 26, 10, 3, BEIGE[3]);
    hline(b, 26, 12, 3, BEIGE[3]);
    px(b, 27, 16, state === 'broken' ? RED[1] : LIME[2]);
    keyboard(b, 8, 19, 12, BEIGE[1], BEIGE[3], BEIGE[2]);
    rect(b, 22, 19, 2, 2, BEIGE[0]);
    px(b, 23, 20, BEIGE[2]);
  },
  standard(b, state) {
    rect(b, 7, 4, 18, 12, STEEL[6]);
    hline(b, 7, 4, 18, STEEL[5]);
    screen(b, 8, 5, 16, 9, 'standard', state);
    led(b, 23, 14, state);
    px(b, 15, 14, STEEL[4]);
    rect(b, 15, 16, 2, 2, STEEL[5]);
    rect(b, 12, 18, 8, 1, STEEL[6]);
    rect(b, 26, 8, 4, 12, STEEL[6]);
    vline(b, 26, 8, 12, STEEL[5]);
    px(b, 28, 10, SKY[2]);
    hline(b, 27, 13, 2, STEEL[7]);
    keyboard(b, 8, 19, 12, STEEL[6], STEEL[4], STEEL[7]);
    rect(b, 22, 19, 2, 2, STEEL[6]);
  },
  gaming(b, state) {
    rect(b, 4, 3, 21, 13, STEEL[7]);
    screen(b, 5, 4, 19, 10, 'gaming', state);
    led(b, 23, 14, state);
    hline(b, 5, 14, 3, RED[2]);
    rect(b, 14, 16, 2, 2, STEEL[6]);
    line(b, 10, 19, 14, 17, RED[3]);
    line(b, 19, 19, 15, 17, RED[3]);
    rect(b, 26, 5, 5, 15, STEEL[7]);
    rect(b, 27, 6, 3, 13, STEEL[6]);
    for (const [cy, color] of [[8, CYAN[1]], [12, PINK[1]], [16, VIOLET[1]]]) {
      px(b, 28, cy, color);
      px(b, 27, cy, CYAN[3]);
      px(b, 29, cy, CYAN[3]);
      px(b, 28, cy - 1, CYAN[3]);
      px(b, 28, cy + 1, CYAN[3]);
    }
    rect(b, 6, 19, 14, 2, STEEL[7]);
    for (let i = 0; i < 12; i += 1) px(b, 7 + i, 19, RGB_CYCLE[i % RGB_CYCLE.length]);
    hline(b, 6, 21, 14, STEEL[6]);
    rect(b, 22, 19, 3, 2, STEEL[7]);
    px(b, 23, 19, CYAN[1]);
  },
  highend(b, state) {
    for (const [x, side] of [[2, 0], [17, 1]]) {
      rect(b, x, 4, 13, 11, STEEL[6]);
      hline(b, x, 4, 13, STEEL[5]);
      screen(b, x + 1, 5, 11, 8, 'highend', state, side);
    }
    vline(b, 2, 5, 9, STEEL[7]);
    vline(b, 29, 5, 9, STEEL[7]);
    led(b, 14, 13, state);
    rect(b, 15, 15, 2, 3, STEEL[3]);
    rect(b, 12, 18, 8, 1, STEEL[4]);
    keyboard(b, 9, 19, 12, STEEL[1], STEEL[3], STEEL[2]);
    rect(b, 23, 19, 2, 2, STEEL[1]);
    rect(b, 3, 18, 3, 3, CREAM[0]);
    px(b, 4, 18, TEAK[4]);
  },
  premium(b, state) {
    hline(b, 4, 3, 24, STEEL[7]);
    hline(b, 3, 4, 26, STEEL[7]);
    rect(b, 2, 5, 28, 9, STEEL[7]);
    hline(b, 3, 14, 26, STEEL[7]);
    screen(b, 4, 5, 24, 8, 'premium', state);
    hline(b, 3, 14, 26, GOLD[3]);
    led(b, 27, 13, state);
    rect(b, 15, 15, 2, 3, GOLD[3]);
    px(b, 15, 15, GOLD[1]);
    rect(b, 11, 18, 10, 1, GOLD[2]);
    hline(b, 11, 18, 3, GOLD[1]);
    keyboard(b, 9, 19, 12, STEEL[7], GOLD[2], STEEL[6]);
    rect(b, 23, 19, 2, 2, STEEL[7]);
    px(b, 23, 19, GOLD[1]);
    rect(b, 3, 18, 3, 3, CREAM[0]);
    px(b, 4, 18, TEAK[4]);
    hline(b, 3, 20, 3, GOLD[2]);
  },
  console(b, state) {
    rect(b, 5, 2, 22, 14, STEEL[7]);
    hline(b, 5, 2, 22, STEEL[5]);
    vline(b, 5, 2, 14, STEEL[6]);
    vline(b, 26, 2, 14, STEEL[6]);
    screen(b, 7, 4, 18, 10, 'console', state);
    led(b, 24, 14, state);
    rect(b, 13, 16, 6, 2, STEEL[6]);
    hline(b, 13, 16, 6, STEEL[4]);
    rect(b, 11, 18, 10, 3, STEEL[7]);
    hline(b, 12, 19, 8, STEEL[5]);
    px(b, 13, 19, state === 'broken' ? RED[1] : CYAN[1]);
    px(b, 18, 19, state === 'broken' ? RED[1] : LIME[1]);
    rect(b, 7, 19, 3, 2, STEEL[6]);
    rect(b, 22, 19, 3, 2, STEEL[6]);
    px(b, 8, 19, CYAN[2]);
    px(b, 23, 19, PINK[1]);
  }
};

/* ---------------------------------------------------------------- furniture */

const CHAIR_STYLES = {
  red: { ramp: RED, accent: STEEL[7] },
  white: { ramp: CREAM, accent: PINK[2] },
  navy: { ramp: NAVY, accent: GOLD[2] },
  gray: { ramp: STEEL, base: 3, accent: CYAN[2] }
};

/** Frames in FURNITURE_FRAMES order. */
export function paintFurnitureFrames() {
  return [
    chair(CHAIR_STYLES.red),
    plant(),
    snackRack(),
    chair(CHAIR_STYLES.white),
    chair(CHAIR_STYLES.navy),
    chair(CHAIR_STYLES.gray),
    floorLamp(),
    chairFront(CHAIR_STYLES.red),
    chairFront(CHAIR_STYLES.white),
    chairFront(CHAIR_STYLES.navy),
    chairFront(CHAIR_STYLES.gray)
  ];
}

/** Gaming chair seen from the front, for a guest facing the viewer; the guest is drawn over it. */
function chairFront({ ramp, accent, base = 1 }) {
  const b = frame();
  const [hi, main, side, deep] = [ramp[base - 1] ?? ramp[0], ramp[base], ramp[base + 1], ramp[base + 2]];
  shadowEllipse(b, 16, 30, 8, 1.8);
  hline(b, 9, 29, 14, STEEL[5]);
  for (const x of [9, 15, 21]) {
    px(b, x, 30, STEEL[7]);
    px(b, x + 1, 30, STEEL[7]);
  }
  rect(b, 15, 26, 2, 3, STEEL[4]);
  px(b, 15, 26, STEEL[3]);
  hline(b, 11, 8, 10, main);
  hline(b, 10, 9, 12, main);
  rect(b, 9, 10, 14, 11, main);
  rect(b, 9, 10, 2, 11, side);
  rect(b, 21, 10, 2, 11, deep);
  hline(b, 12, 8, 4, hi);
  vline(b, 13, 10, 10, accent);
  vline(b, 18, 10, 10, accent);
  rect(b, 7, 21, 18, 4, main);
  hline(b, 7, 21, 18, hi);
  hline(b, 7, 24, 18, deep);
  rect(b, 5, 17, 2, 7, side);
  rect(b, 25, 17, 2, 7, deep);
  hline(b, 5, 17, 2, main);
  hline(b, 25, 17, 2, main);
  return outline(b);
}

/** Gaming chair seen from behind, so a seated customer shows above the backrest. */
function chair({ ramp, accent, base = 1 }) {
  const b = frame();
  const [hi, main, side, deep] = [ramp[base - 1] ?? ramp[0], ramp[base], ramp[base + 1], ramp[base + 2]];
  shadowEllipse(b, 16, 30, 8, 1.8);
  hline(b, 9, 29, 14, STEEL[5]);
  for (const x of [9, 15, 21]) {
    px(b, x, 30, STEEL[7]);
    px(b, x + 1, 30, STEEL[7]);
  }
  rect(b, 15, 27, 2, 2, STEEL[4]);
  px(b, 15, 27, STEEL[3]);
  rect(b, 7, 24, 2, 3, side);
  rect(b, 23, 24, 2, 3, deep);
  hline(b, 7, 24, 2, main);
  hline(b, 11, 15, 10, main);
  hline(b, 10, 16, 12, main);
  rect(b, 9, 17, 14, 10, main);
  rect(b, 9, 17, 2, 10, side);
  rect(b, 21, 17, 2, 10, deep);
  vline(b, 10, 16, 1, side);
  vline(b, 21, 16, 1, deep);
  hline(b, 12, 15, 4, hi);
  px(b, 11, 16, hi);
  vline(b, 12, 18, 7, hi);
  vline(b, 13, 17, 9, accent);
  vline(b, 18, 17, 9, accent);
  hline(b, 9, 26, 14, deep);
  rect(b, 15, 20, 2, 2, accent);
  return outline(b);
}

function plant() {
  const b = frame();
  shadowEllipse(b, 16, 29.5, 6.5, 1.8);
  rect(b, 10, 19, 12, 2, TERRA[1]);
  hline(b, 10, 19, 12, TERRA[0]);
  vline(b, 21, 19, 2, TERRA[3]);
  for (let r = 0; r < 8; r += 1) {
    const inset = Math.floor(r / 3);
    const x0 = 11 + inset;
    const w = 10 - inset * 2;
    hline(b, x0, 21 + r, w, TERRA[2]);
    px(b, x0, 21 + r, TERRA[1]);
    px(b, x0 + w - 1, 21 + r, TERRA[3]);
    px(b, x0 + w - 2, 21 + r, TERRA[3]);
  }
  hline(b, 11, 21, 10, TERRA[3]);
  const leaves = [
    [16, 9, 3.5, 5, 2], [11, 13, 4.5, 3, 2], [21, 13, 4.5, 3, 3], [13, 7, 3, 3.5, 1],
    [19, 7, 3, 3.5, 2], [9, 17, 3.5, 2.5, 3], [23, 17, 3.5, 2.5, 4], [16, 15, 4, 3, 2]
  ];
  for (const [cx, cy, rx, ry, tone] of leaves) ellipse(b, cx, cy, rx, ry, LEAF[tone]);
  for (const [x, y] of [[15, 5], [12, 11], [19, 11], [13, 5], [18, 5], [8, 15], [10, 12], [16, 13]]) px(b, x, y, LEAF[1]);
  for (const [x, y] of [[15, 6], [12, 6], [9, 12], [20, 6]]) px(b, x, y, LEAF[0]);
  for (const [x, y] of [[16, 11], [16, 12], [16, 13], [12, 14], [20, 14]]) px(b, x, y, LEAF[4]);
  return outline(b);
}

function snackRack() {
  const b = frame();
  shadowRect(b, 7, 29, 19, 2);
  rect(b, 7, 6, 2, 24, STEEL[4]);
  rect(b, 23, 6, 2, 24, STEEL[5]);
  vline(b, 7, 6, 24, STEEL[3]);
  const bags = [RED[2], GOLD[1], LIME[2], PINK[2], SKY[3], GOLD[2]];
  for (let shelf = 0; shelf < 3; shelf += 1) {
    const y = 7 + shelf * 8;
    for (let i = 0; i < 3; i += 1) {
      const color = bags[(shelf * 3 + i) % bags.length];
      const x = 9 + i * 5;
      rect(b, x, y, 4, 6, color);
      hline(b, x, y, 4, CREAM[1]);
      px(b, x + 1, y + 3, CREAM[0]);
      px(b, x + 2, y + 3, CREAM[0]);
    }
    hline(b, 7, y + 6, 18, STEEL[2]);
    hline(b, 7, y + 7, 18, STEEL[4]);
  }
  rect(b, 9, 3, 14, 3, RED[2]);
  hline(b, 10, 4, 12, CREAM[0]);
  return outline(b);
}

function floorLamp() {
  const b = frame();
  glow(b, 16, 13, 11, 7, GOLD[0], 56);
  shadowEllipse(b, 16, 29.5, 5.5, 1.6);
  ellipse(b, 16, 28, 4.5, 1.8, STEEL[5]);
  hline(b, 13, 27, 5, STEEL[3]);
  rect(b, 15, 10, 2, 17, STEEL[4]);
  vline(b, 16, 10, 17, STEEL[5]);
  for (let r = 0; r < 8; r += 1) {
    const half = 4 + Math.floor(r / 2);
    hline(b, 16 - half, 3 + r, half * 2, r === 0 ? CREAM[0] : CREAM[1]);
    px(b, 16 + half - 1, 3 + r, CREAM[2]);
    px(b, 16 + half - 2, 3 + r, CREAM[2]);
    px(b, 16 - half, 3 + r, CREAM[0]);
  }
  hline(b, 9, 11, 14, GOLD[1]);
  hline(b, 12, 12, 8, GOLD[0]);
  return outline(b);
}

/* ---------------------------------------------------------------- effects & items */

/** Frames in EFFECT_FRAMES order. */
export function paintEffectFrames() {
  return [alertIcon(), coinIcon(), mealIcon(), lockIcon()];
}

function alertIcon() {
  const b = frame();
  for (let r = 0; r < 15; r += 1) {
    const half = 1 + Math.floor(r * 0.62);
    hline(b, 16 - half, 8 + r, half * 2, r < 2 ? RED[1] : RED[2]);
    px(b, 16 + half - 1, 8 + r, RED[3]);
  }
  hline(b, 7, 22, 18, RED[3]);
  rect(b, 15, 12, 2, 6, CREAM[0]);
  rect(b, 15, 19, 2, 2, CREAM[0]);
  return outline(b);
}

function coinIcon() {
  const b = frame();
  ellipse(b, 16, 16, 8, 8, GOLD[3]);
  ellipse(b, 15.5, 15.5, 7.5, 7.5, GOLD[2]);
  ellipse(b, 16, 16, 5.5, 5.5, GOLD[1]);
  ellipse(b, 16.5, 16.5, 4.5, 4.5, GOLD[2]);
  rect(b, 15, 12, 2, 8, GOLD[4]);
  hline(b, 14, 13, 4, GOLD[4]);
  hline(b, 14, 18, 4, GOLD[4]);
  px(b, 11, 11, GOLD[0]);
  px(b, 12, 10, GOLD[0]);
  px(b, 10, 13, GOLD[0]);
  return outline(b);
}

function mealIcon() {
  const b = frame();
  line(b, 19, 6, 23, 15, TEAK[2]);
  line(b, 21, 5, 24, 14, TEAK[1]);
  ellipse(b, 16, 16, 8.5, 3, GOLD[1]);
  for (let x = 9; x < 24; x += 2) px(b, x, 16, GOLD[2]);
  px(b, 12, 15, LEAF[2]);
  px(b, 19, 15, LEAF[2]);
  px(b, 16, 15, RED[2]);
  for (let r = 0; r < 7; r += 1) {
    const half = 9 - Math.floor(r * 0.8);
    hline(b, 16 - half, 17 + r, half * 2, r === 2 || r === 3 ? RED[2] : CREAM[1]);
    px(b, 16 + half - 1, 17 + r, r === 2 || r === 3 ? RED[3] : CREAM[3]);
  }
  hline(b, 7, 17, 18, CREAM[0]);
  return outline(b);
}

function lockIcon() {
  const b = frame();
  hline(b, 14, 4, 4, STEEL[2]);
  hline(b, 12, 5, 8, STEEL[3]);
  hline(b, 13, 5, 3, STEEL[2]);
  hline(b, 11, 6, 3, STEEL[3]);
  hline(b, 18, 6, 3, STEEL[4]);
  rect(b, 11, 7, 2, 7, STEEL[3]);
  vline(b, 11, 7, 7, STEEL[2]);
  rect(b, 19, 7, 2, 7, STEEL[4]);
  vline(b, 20, 7, 7, STEEL[5]);
  roundRect(b, 9, 13, 14, 12, GOLD[2]);
  hline(b, 10, 13, 12, GOLD[1]);
  vline(b, 9, 14, 10, GOLD[1]);
  vline(b, 22, 14, 10, GOLD[3]);
  hline(b, 10, 24, 12, GOLD[3]);
  px(b, 10, 14, GOLD[0]);
  rect(b, 15, 17, 2, 2, C.ink);
  rect(b, 15, 19, 2, 3, C.ink);
  return outline(b);
}

/** Frames in ITEM_FRAMES order. */
export function paintItemFrames() {
  return [drinkItem(), noodleItem(), medicineItem(), snackItem()];
}

function drinkItem() {
  const b = frame();
  shadowEllipse(b, 16, 27, 5, 1.4);
  rect(b, 12, 7, 8, 2, STEEL[2]);
  hline(b, 12, 7, 8, STEEL[1]);
  rect(b, 12, 9, 8, 16, SKY[4]);
  vline(b, 13, 9, 16, SKY[3]);
  vline(b, 19, 9, 16, SKY[5]);
  rect(b, 12, 13, 8, 5, CREAM[0]);
  hline(b, 13, 15, 6, RED[2]);
  rect(b, 12, 25, 8, 1, STEEL[3]);
  px(b, 15, 6, STEEL[3]);
  return outline(b);
}

function noodleItem() {
  const b = frame();
  shadowEllipse(b, 16, 27, 6, 1.4);
  for (let r = 0; r < 16; r += 1) {
    const half = 7 - Math.floor(r / 6);
    hline(b, 16 - half, 9 + r, half * 2, r > 4 && r < 9 ? RED[2] : CREAM[1]);
    px(b, 16 - half, 9 + r, CREAM[0]);
    px(b, 16 + half - 1, 9 + r, r > 4 && r < 9 ? RED[3] : CREAM[3]);
  }
  hline(b, 8, 8, 16, GOLD[1]);
  hline(b, 9, 7, 14, GOLD[0]);
  hline(b, 12, 11, 8, GOLD[2]);
  px(b, 14, 16, CREAM[0]);
  px(b, 17, 16, CREAM[0]);
  return outline(b);
}

function medicineItem() {
  const b = frame();
  shadowRect(b, 9, 25, 16, 2);
  rect(b, 8, 10, 16, 15, CREAM[0]);
  rect(b, 8, 10, 16, 4, RED[2]);
  hline(b, 8, 10, 16, RED[1]);
  vline(b, 23, 14, 11, CREAM[2]);
  hline(b, 8, 24, 16, CREAM[2]);
  rect(b, 15, 16, 2, 6, RED[2]);
  rect(b, 13, 18, 6, 2, RED[2]);
  return outline(b);
}

function snackItem() {
  const b = frame();
  shadowEllipse(b, 16, 27, 7, 1.4);
  for (let x = 9; x < 23; x += 1) px(b, x, 7, x % 2 ? RED[1] : RED[3]);
  rect(b, 9, 8, 14, 17, RED[2]);
  vline(b, 10, 9, 15, RED[1]);
  vline(b, 22, 8, 17, RED[3]);
  ellipse(b, 16, 16, 4.5, 3.5, GOLD[1]);
  hline(b, 13, 16, 6, GOLD[3]);
  for (let x = 9; x < 23; x += 1) px(b, x, 25, x % 2 ? RED[3] : RED[2]);
  return outline(b);
}

/* ---------------------------------------------------------------- portraits */

const PORTRAITS = {
  player: { hair: RAMPS.hairK, shirt: RAMPS.shirtB, style: 'short' },
  wife: { hair: RAMPS.hairN, shirt: RAMPS.shirtR, style: 'long' },
  child: { hair: RAMPS.hairN, shirt: RAMPS.shirtG, style: 'kid' }
};

/** Frames in PORTRAIT_IDS order: head-and-shoulders busts for the family panel. */
export function paintPortraitFrames() {
  return ['player', 'wife', 'child'].map((id) => portrait(PORTRAITS[id]));
}

function portrait({ hair, shirt, style }) {
  const b = frame();
  const kid = style === 'kid';
  const top = kid ? 7 : 4;
  if (style === 'long') {
    rect(b, 6, 12, 20, 16, hair[2]);
    rect(b, 7, 12, 18, 15, hair[1]);
  }
  for (let r = 0; r < 7; r += 1) {
    const inset = Math.max(0, 3 - r);
    hline(b, 4 + inset, 25 + r, 24 - inset * 2, shirt[1]);
  }
  hline(b, 7, 25, 18, shirt[0]);
  vline(b, 26, 27, 5, shirt[2]);
  vline(b, 27, 28, 4, shirt[2]);
  rect(b, 13, 22, 6, 4, SKIN[2]);
  hline(b, 13, 25, 6, SKIN[3]);
  const w = kid ? 14 : 16;
  const x0 = 16 - w / 2;
  const h = kid ? 15 : 17;
  for (let r = 0; r < h; r += 1) {
    const inset = r < 2 ? 2 - r : r > h - 4 ? r - (h - 4) : 0;
    hline(b, x0 + inset, top + r, w - inset * 2, hair[1]);
  }
  for (let r = 5; r < h; r += 1) {
    const inset = r > h - 4 ? r - (h - 4) + 1 : 1;
    hline(b, x0 + inset, top + r, w - inset * 2, SKIN[1]);
  }
  vline(b, x0 + w - 2, top + 7, h - 9, SKIN[2]);
  hline(b, x0 + 2, top + 6, w - 4, SKIN[2]);
  hline(b, x0 + 1, top + 5, w - 2, hair[1]);
  for (let x = x0 + 1; x < x0 + w - 1; x += 3) px(b, x, top + 6, hair[1]);
  hline(b, x0 + 3, top + 1, 5, hair[0]);
  hline(b, x0 + 2, top + 2, 3, hair[0]);
  if (kid) {
    px(b, 17, top - 1, hair[1]);
    px(b, 18, top - 2, hair[1]);
  }
  if (style === 'long') {
    vline(b, x0, top + 4, h - 2, hair[1]);
    vline(b, x0 + w - 1, top + 4, h - 2, hair[2]);
  }
  const ey = top + 9;
  for (const ex of [x0 + 3, x0 + w - 5]) {
    rect(b, ex, ey, 2, 2, C.ink);
    px(b, ex, ey, CREAM[0]);
    hline(b, ex - (ex < 16 ? 1 : 0), ey - 2, 3, hair[2]);
  }
  px(b, 16, ey + 3, SKIN[2]);
  hline(b, 15, ey + 5, 3, style === 'long' ? RED[3] : SKIN[3]);
  px(b, x0 + 2, ey + 3, PINK[1]);
  px(b, x0 + w - 3, ey + 3, PINK[1]);
  px(b, x0, ey + 1, SKIN[1]);
  px(b, x0 + w - 1, ey + 1, SKIN[2]);
  return outline(b);
}
