import { RAMPS } from './palette.js';
import { C, hline, outline, px, rect, shadowEllipse, vline } from './brush.js';
import { blank, mirror } from './pixelBuffer.js';
import { CELL } from './roomLayout.js';

const SKIN = RAMPS.skinR;
const SHOE = RAMPS.shoe;
const HAIR = { hairBlack: RAMPS.hairK, hairBrown: RAMPS.hairN, hairBlond: RAMPS.hairY, hairPink: RAMPS.hairP };
const SHIRT = {
  shirtBlue: RAMPS.shirtB,
  shirtGreen: RAMPS.shirtG,
  shirtRed: RAMPS.shirtR,
  shirtPurple: RAMPS.shirtP,
  shirtGold: RAMPS.shirtY,
  shirtGray: RAMPS.shirtA
};
const PANTS = { pantsNavy: RAMPS.pantsN, pantsBrown: RAMPS.pantsW };

/** Head silhouette rows as [left, right] offsets from the head's left column, 13 rows tall. */
const HEAD_FRONT = [[2, 11], [1, 12], [0, 13], [0, 13], [0, 13], [0, 13], [0, 13], [0, 13], [0, 13], [0, 13], [0, 13], [1, 12], [2, 11]];
const HEAD_SIDE = [[2, 10], [1, 11], [0, 12], [0, 12], [0, 12], [0, 12], [0, 12], [0, 12], [0, 12], [0, 12], [0, 12], [1, 11], [2, 9]];

/**
 * All character frames for one variant, in CHAR_COLUMNS order. Right-facing
 * frames mirror the left profile. The sitting frame is the upper body seen
 * from behind; the chair is drawn over it.
 */
export function paintCharacterFrames(variant) {
  const look = {
    id: variant.id,
    kind: variant.kind ?? variant.id,
    style: variant.style ?? 'short',
    hair: HAIR[variant.hair] ?? RAMPS.hairK,
    shirt: SHIRT[variant.shirt] ?? RAMPS.shirtA,
    pants: PANTS[variant.pants] ?? RAMPS.pantsN
  };
  const leftIdle = character(look, 'side', 0);
  const leftWalk = character(look, 'side', 1);
  return [
    character(look, 'front', 0),
    character(look, 'front', 1),
    leftIdle,
    leftWalk,
    mirror(leftIdle),
    mirror(leftWalk),
    character(look, 'back', 0),
    character(look, 'back', 1),
    seated(look)
  ];
}

function character(look, view, step) {
  const b = blank(CELL, CELL);
  shadowEllipse(b, 16, 30, 6.5, 1.8);
  const bob = step ? -1 : 0;
  if (view === 'side') {
    sideLegs(b, look, step, bob);
    sideBody(b, look, step, bob);
    sideHead(b, look, 3 + bob);
  } else {
    frontLegs(b, look, step, bob);
    frontBody(b, look, view === 'back', step, bob);
    frontHead(b, look, view === 'back', 3 + bob);
  }
  return outline(b);
}

function seated(look) {
  const b = blank(CELL, CELL);
  const { shirt } = look;
  rect(b, 10, 14, 12, 2, shirt[1]);
  rect(b, 9, 16, 14, 9, shirt[1]);
  vline(b, 9, 16, 9, shirt[2]);
  vline(b, 22, 16, 9, shirt[2]);
  hline(b, 13, 14, 6, shirt[2]);
  px(b, 11, 15, shirt[0]);
  px(b, 12, 15, shirt[0]);
  vline(b, 15, 17, 7, shirt[2]);
  rect(b, 7, 16, 2, 5, shirt[2]);
  rect(b, 23, 16, 2, 5, shirt[2]);
  px(b, 7, 16, shirt[1]);
  px(b, 24, 16, shirt[1]);
  accessoryBody(b, look, 'seated', 0);
  frontHead(b, look, true, 1);
  return outline(b);
}

function frontLegs(b, { pants }, step, bob) {
  const lx = step ? 11 : 12;
  const rx = step ? 18 : 17;
  rect(b, 11, 23 + bob, 10, 2, pants[1]);
  for (const x of [lx, rx]) {
    rect(b, x, 24 + bob, 3, 4 - bob, pants[1]);
    vline(b, x + 2, 24 + bob, 4 - bob, pants[2]);
  }
  for (const x of [lx, rx]) {
    rect(b, x, 28, 3, 2, SHOE[1]);
    px(b, x, 28, SHOE[0]);
    hline(b, x, 29, 3, SHOE[2]);
  }
}

function frontBody(b, look, back, step, bob) {
  const { shirt } = look;
  const ty = 16 + bob;
  hline(b, 11, ty, 10, shirt[1]);
  rect(b, 10, ty + 1, 12, 7, shirt[1]);
  vline(b, 10, ty + 1, 7, shirt[2]);
  vline(b, 21, ty + 1, 7, shirt[2]);
  hline(b, 11, ty + 7, 10, shirt[2]);
  px(b, 11, ty + 1, shirt[0]);
  px(b, 12, ty + 1, shirt[0]);
  px(b, 11, ty + 2, shirt[0]);
  if (!back) {
    hline(b, 14, ty, 4, shirt[2]);
    px(b, 15, ty, SKIN[1]);
    px(b, 16, ty, SKIN[2]);
  } else {
    vline(b, 15, ty + 2, 4, shirt[2]);
  }
  const swing = step ? 1 : 0;
  arm(b, 8, ty + 1 - swing, shirt, SKIN[1]);
  arm(b, 22, ty + 1 + swing, shirt, SKIN[2]);
  accessoryBody(b, look, back ? 'back' : 'front', bob);
}

function arm(b, x, y, shirt, skin) {
  rect(b, x, y, 2, 3, shirt[1]);
  px(b, x + 1, y, shirt[2]);
  rect(b, x, y + 3, 2, 2, skin);
  hline(b, x, y + 5, 2, SKIN[2]);
}

function frontHead(b, look, back, hy) {
  const { hair } = look;
  const x0 = 9;
  HEAD_FRONT.forEach(([l, r], row) => hline(b, x0 + l, hy + row, r - l + 1, hair[1]));
  if (back) {
    hline(b, 12, hy + 1, 4, hair[0]);
    hline(b, 11, hy + 2, 3, hair[0]);
    for (let row = 9; row < 13; row += 1) {
      const [l, r] = HEAD_FRONT[row];
      hline(b, x0 + l, hy + row, r - l + 1, hair[2]);
    }
    vline(b, 22, hy + 3, 8, hair[2]);
    px(b, 9, hy + 8, SKIN[1]);
    px(b, 22, hy + 8, SKIN[2]);
    px(b, 15, hy + 12, SKIN[2]);
    px(b, 16, hy + 12, SKIN[2]);
    styleHair(b, look, 'back', hy);
    accessoryHead(b, look, 'back', hy);
    return;
  }
  for (let row = 5; row < 13; row += 1) {
    const [l, r] = HEAD_FRONT[row];
    hline(b, x0 + Math.max(l, 1), hy + row, Math.min(r, 12) - Math.max(l, 1) + 1, SKIN[1]);
  }
  vline(b, 21, hy + 6, 6, SKIN[2]);
  hline(b, 11, hy + 12, 10, SKIN[2]);
  hline(b, 10, hy + 6, 12, SKIN[2]);
  hline(b, 10, hy + 5, 12, hair[1]);
  for (const x of [10, 11, 13, 14, 17, 20, 21]) px(b, x, hy + 6, hair[1]);
  for (const x of [10, 21]) {
    vline(b, x, hy + 6, 2, hair[1]);
  }
  vline(b, 9, hy + 2, 6, hair[2]);
  vline(b, 22, hy + 2, 6, hair[2]);
  hline(b, 12, hy + 1, 4, hair[0]);
  hline(b, 11, hy + 2, 3, hair[0]);
  px(b, 9, hy + 8, SKIN[1]);
  px(b, 9, hy + 9, SKIN[2]);
  px(b, 22, hy + 8, SKIN[2]);
  px(b, 22, hy + 9, SKIN[3]);
  vline(b, 12, hy + 8, 2, C.ink);
  vline(b, 19, hy + 8, 2, C.ink);
  px(b, 11, hy + 10, SKIN[0]);
  px(b, 15, hy + 11, SKIN[3]);
  px(b, 16, hy + 11, SKIN[3]);
  styleHair(b, look, 'front', hy);
  accessoryHead(b, look, 'front', hy);
}

function sideLegs(b, { pants }, step, bob) {
  rect(b, 13, 23 + bob, 6, 2, pants[1]);
  if (!step) {
    rect(b, 14, 24 + bob, 4, 4 - bob, pants[1]);
    vline(b, 17, 24 + bob, 4 - bob, pants[2]);
    rect(b, 12, 28, 6, 2, SHOE[1]);
    hline(b, 12, 28, 2, SHOE[0]);
    hline(b, 12, 29, 6, SHOE[2]);
    return;
  }
  rect(b, 17, 24 + bob, 3, 3, pants[2]);
  rect(b, 18, 27, 3, 1, pants[2]);
  rect(b, 18, 28, 4, 1, SHOE[2]);
  px(b, 21, 27, SHOE[1]);
  rect(b, 12, 24 + bob, 3, 2, pants[1]);
  rect(b, 11, 26, 3, 2, pants[1]);
  vline(b, 13, 26, 2, pants[2]);
  rect(b, 9, 28, 5, 2, SHOE[1]);
  px(b, 9, 28, SHOE[0]);
  hline(b, 9, 29, 5, SHOE[2]);
}

function sideBody(b, look, step, bob) {
  const { shirt } = look;
  const ty = 16 + bob;
  hline(b, 13, ty, 6, shirt[1]);
  rect(b, 12, ty + 1, 8, 7, shirt[1]);
  vline(b, 19, ty + 1, 7, shirt[2]);
  hline(b, 12, ty + 7, 8, shirt[2]);
  px(b, 13, ty + 1, shirt[0]);
  px(b, 13, ty + 2, shirt[0]);
  accessoryBody(b, look, 'side', bob);
  if (step) {
    rect(b, 13, ty + 1, 3, 3, shirt[1]);
    vline(b, 15, ty + 1, 3, shirt[2]);
    rect(b, 11, ty + 3, 3, 2, shirt[1]);
    rect(b, 10, ty + 4, 2, 2, SKIN[1]);
    px(b, 10, ty + 5, SKIN[2]);
  } else {
    rect(b, 14, ty + 1, 3, 3, shirt[1]);
    vline(b, 16, ty + 1, 3, shirt[2]);
    vline(b, 13, ty + 1, 3, shirt[2]);
    rect(b, 14, ty + 4, 2, 2, SKIN[1]);
    hline(b, 14, ty + 6, 2, SKIN[2]);
  }
}

function sideHead(b, look, hy) {
  const { hair } = look;
  const x0 = 9;
  HEAD_SIDE.forEach(([l, r], row) => hline(b, x0 + l, hy + row, r - l + 1, hair[1]));
  for (let row = 5; row < 13; row += 1) {
    const [l] = HEAD_SIDE[row];
    const right = row < 11 ? 15 : 14;
    hline(b, x0 + l, hy + row, right - (x0 + l) + 1, SKIN[1]);
  }
  hline(b, 9, hy + 5, 6, hair[1]);
  for (const x of [9, 10, 12, 13]) px(b, x, hy + 6, hair[1]);
  hline(b, 11, hy + 12, 4, SKIN[2]);
  px(b, 8, hy + 9, SKIN[1]);
  px(b, 8, hy + 10, SKIN[2]);
  vline(b, 11, hy + 8, 2, C.ink);
  px(b, 10, hy + 11, SKIN[3]);
  for (let row = 2; row < 11; row += 1) px(b, 21, hy + row, hair[2]);
  hline(b, 16, hy + 11, 4, hair[2]);
  px(b, 16, hy + 8, SKIN[1]);
  px(b, 17, hy + 8, SKIN[2]);
  px(b, 16, hy + 9, SKIN[2]);
  px(b, 17, hy + 9, SKIN[2]);
  hline(b, 13, hy + 1, 4, hair[0]);
  hline(b, 12, hy + 2, 3, hair[0]);
  styleHair(b, look, 'side', hy);
  accessoryHead(b, look, 'side', hy);
}

/** Extra hair volume / cuts so looks read apart at 32px. */
function styleHair(b, look, view, hy) {
  const { hair, style } = look;
  if (style === 'bob') {
    if (view === 'front' || view === 'back') {
      for (const x of [9, 22]) {
        vline(b, x, hy + 8, 5, hair[1]);
        px(b, x, hy + 12, hair[2]);
      }
      hline(b, 10, hy + 13, 12, hair[2]);
    } else {
      vline(b, 21, hy + 8, 5, hair[2]);
      px(b, 21, hy + 13, hair[2]);
      hline(b, 16, hy + 13, 5, hair[2]);
    }
  } else if (style === 'ponytail') {
    if (view === 'front') {
      rect(b, 21, hy + 4, 2, 5, hair[1]);
      px(b, 22, hy + 9, hair[2]);
      px(b, 23, hy + 10, hair[2]);
    } else if (view === 'side') {
      rect(b, 20, hy + 3, 3, 2, hair[1]);
      vline(b, 22, hy + 5, 6, hair[2]);
      px(b, 21, hy + 11, hair[2]);
    } else {
      rect(b, 14, hy + 12, 4, 3, hair[1]);
      hline(b, 15, hy + 15, 2, hair[2]);
    }
  } else if (style === 'fringe') {
    if (view === 'front') {
      hline(b, 11, hy + 5, 10, hair[1]);
      hline(b, 12, hy + 6, 8, hair[2]);
      for (const x of [12, 14, 16, 18]) px(b, x, hy + 7, hair[1]);
    } else if (view === 'side') {
      hline(b, 9, hy + 5, 7, hair[1]);
      hline(b, 10, hy + 6, 5, hair[2]);
    }
  } else if (style === 'messy' || style === 'spikes') {
    const tips = view === 'side' ? [10, 13, 16, 19] : [10, 12, 15, 18, 20];
    for (const x of tips) {
      px(b, x, hy - 1, hair[1]);
      px(b, x + (style === 'spikes' ? 0 : 1), hy - 2, hair[0]);
    }
  } else if (style === 'undercut') {
    if (view === 'front') {
      hline(b, 10, hy + 5, 12, hair[0]);
      for (const x of [10, 21]) vline(b, x, hy + 6, 3, SKIN[1]);
      hline(b, 12, hy + 1, 8, hair[0]);
    } else if (view === 'side') {
      hline(b, 9, hy + 5, 7, hair[0]);
      vline(b, 9, hy + 6, 3, SKIN[1]);
    }
  } else if (style === 'bun') {
    if (view === 'front') {
      rect(b, 13, hy - 2, 6, 3, hair[1]);
      hline(b, 14, hy - 2, 4, hair[0]);
      px(b, 15, hy - 3, hair[0]);
      px(b, 16, hy - 3, hair[0]);
    } else if (view === 'side') {
      rect(b, 14, hy - 2, 5, 3, hair[1]);
      hline(b, 15, hy - 2, 3, hair[0]);
      px(b, 16, hy - 3, hair[0]);
    } else {
      rect(b, 13, hy - 2, 6, 3, hair[1]);
      hline(b, 14, hy - 2, 4, hair[0]);
    }
  } else if (style === 'side') {
    if (view === 'front') {
      hline(b, 10, hy + 5, 6, hair[1]);
      for (const x of [10, 11, 12]) px(b, x, hy + 6, hair[1]);
      px(b, 20, hy + 6, SKIN[1]);
      px(b, 21, hy + 6, SKIN[1]);
    } else if (view === 'side') {
      hline(b, 9, hy + 5, 5, hair[1]);
      px(b, 9, hy + 6, hair[1]);
    }
  } else if (style === 'slick') {
    if (view === 'front') {
      hline(b, 12, hy + 1, 8, hair[0]);
      hline(b, 11, hy + 2, 10, hair[0]);
      px(b, 15, hy, hair[0]);
    } else if (view === 'side') {
      hline(b, 12, hy + 1, 6, hair[0]);
      px(b, 14, hy, hair[0]);
    }
  }
}

/** Per-archetype props that sit on the head. */
function accessoryHead(b, look, view, hy) {
  const { kind, hair, style } = look;
  if (kind === 'gamer') {
    const band = RAMPS.steel;
    if (view === 'side') {
      hline(b, 13, hy - 1, 6, band[6]);
      vline(b, 15, hy, 1, band[6]);
      rect(b, 15, hy + 7, 3, 4, band[6]);
      px(b, 16, hy + 8, RAMPS.cyan[1]);
      return;
    }
    hline(b, 11, hy - 1, 10, band[6]);
    px(b, 10, hy, band[6]);
    px(b, 21, hy, band[6]);
    rect(b, 8, hy + 7, 2, 4, band[6]);
    rect(b, 22, hy + 7, 2, 4, band[6]);
    px(b, 8, hy + 8, RAMPS.cyan[1]);
    px(b, 23, hy + 8, RAMPS.cyan[1]);
  } else if (kind === 'guard' || look.id === 'regular') {
    const cap = kind === 'guard' ? RAMPS.navy : RAMPS.red;
    const capRows = 5;
    for (let row = 0; row < capRows; row += 1) {
      const [l, r] = (view === 'side' ? HEAD_SIDE : HEAD_FRONT)[row];
      hline(b, 9 + l, hy + row - 1, r - l + 1, cap[2]);
    }
    hline(b, 11, hy - 1, 4, cap[1]);
    if (view === 'front') {
      hline(b, 9, hy + 4, 14, cap[3]);
      hline(b, 10, hy + 5, 12, cap[4]);
      if (kind === 'guard') px(b, 15, hy + 1, RAMPS.gold[1]);
      else px(b, 15, hy + 1, RAMPS.cream[0]);
    } else if (view === 'side') {
      hline(b, 6, hy + 4, 9, cap[3]);
      px(b, 13, hy + 1, kind === 'guard' ? RAMPS.gold[1] : RAMPS.cream[0]);
    } else {
      hline(b, 9, hy + 4, 14, cap[3]);
      if (look.id === 'regular') {
        px(b, 15, hy + 3, hair[1]);
        px(b, 16, hy + 3, hair[1]);
      }
    }
  } else if (kind === 'regular' && view === 'front') {
    px(b, 15, hy + 1, RAMPS.cream[0]);
    px(b, 16, hy + 1, RAMPS.cream[1]);
  } else if (kind === 'troublemaker') {
    if (style !== 'messy' && style !== 'spikes') {
      const spikes = view === 'side' ? [10, 13, 16, 19] : [10, 13, 16, 19];
      for (const x of spikes) {
        px(b, x, hy - 1, hair[1]);
        px(b, x + 1, hy - 1, hair[1]);
        px(b, x + 1, hy - 2, hair[0]);
      }
    }
    if (view === 'front') px(b, 22, hy + 10, RAMPS.gold[1]);
    if (view === 'side') px(b, 17, hy + 10, RAMPS.gold[1]);
  } else if (kind === 'wealthy') {
    if (view === 'front') {
      rect(b, 11, hy + 8, 4, 2, C.ink);
      rect(b, 17, hy + 8, 4, 2, C.ink);
      hline(b, 15, hy + 8, 2, RAMPS.gold[2]);
      px(b, 12, hy + 8, RAMPS.steel[3]);
      px(b, 18, hy + 8, RAMPS.steel[3]);
    } else if (view === 'side') {
      rect(b, 9, hy + 8, 4, 2, C.ink);
      px(b, 10, hy + 8, RAMPS.steel[3]);
      hline(b, 13, hy + 8, 3, RAMPS.gold[2]);
    }
  } else if (kind === 'office' && view === 'front') {
    px(b, 12, hy + 5, hair[0]);
    px(b, 13, hy + 5, hair[0]);
  } else if (kind === 'student' && view === 'front' && style === 'bob') {
    px(b, 11, hy + 9, RAMPS.pink[1]);
    px(b, 20, hy + 9, RAMPS.pink[1]);
  }
}

/** Per-archetype props on the body. */
function accessoryBody(b, look, view, bob) {
  const { kind } = look;
  const ty = 16 + bob;
  if (kind === 'student') {
    const pack = RAMPS.red;
    if (view === 'front') {
      vline(b, 12, ty, 5, pack[3]);
      vline(b, 19, ty, 5, pack[3]);
    } else if (view === 'back') {
      rect(b, 11, ty + 1, 10, 7, pack[2]);
      hline(b, 11, ty + 1, 10, pack[1]);
      rect(b, 12, ty + 4, 8, 3, pack[3]);
      hline(b, 13, ty + 5, 6, pack[1]);
    } else if (view === 'side') {
      rect(b, 19, ty + 1, 3, 6, pack[2]);
      vline(b, 21, ty + 1, 6, pack[3]);
      px(b, 19, ty + 1, pack[1]);
    } else if (view === 'seated') {
      vline(b, 12, 16, 5, pack[3]);
      vline(b, 19, 16, 5, pack[3]);
    }
  } else if (kind === 'office' && (view === 'front' || view === 'seated')) {
    const y = view === 'seated' ? 16 : ty;
    hline(b, 13, y, 6, RAMPS.cream[1]);
    px(b, 15, y, RAMPS.red[3]);
    px(b, 16, y, RAMPS.red[3]);
    vline(b, 15, y + 1, 5, RAMPS.red[2]);
    vline(b, 16, y + 1, 5, RAMPS.red[3]);
  } else if (kind === 'wealthy' && (view === 'front' || view === 'seated')) {
    const y = view === 'seated' ? 16 : ty;
    px(b, 14, y + 1, RAMPS.gold[0]);
    px(b, 15, y + 2, RAMPS.gold[1]);
    px(b, 16, y + 2, RAMPS.gold[1]);
    px(b, 17, y + 1, RAMPS.gold[0]);
  } else if (kind === 'guard' && view !== 'seated') {
    const belt = RAMPS.steel[7];
    if (view === 'side') hline(b, 12, ty + 7, 8, belt);
    else hline(b, 10, ty + 7, 12, belt);
    if (view === 'front') {
      px(b, 18, ty + 2, RAMPS.gold[1]);
      px(b, 18, ty + 3, RAMPS.gold[2]);
      px(b, 15, ty + 7, RAMPS.gold[2]);
      px(b, 16, ty + 7, RAMPS.gold[2]);
    }
  } else if (kind === 'troublemaker' && (view === 'front' || view === 'seated')) {
    const y = view === 'seated' ? 16 : ty;
    rect(b, 14, y, 4, 5, RAMPS.steel[6]);
    px(b, 15, y, SKIN[1]);
    px(b, 16, y, SKIN[2]);
  } else if (kind === 'gamer' && (view === 'front' || view === 'seated')) {
    const y = view === 'seated' ? 16 : ty;
    px(b, 13, y + 3, RAMPS.cyan[1]);
    px(b, 14, y + 3, RAMPS.pink[1]);
    px(b, 13, y + 4, RAMPS.violet[1]);
  } else if (kind === 'regular' && view === 'front') {
    px(b, 14, ty + 2, RAMPS.cream[0]);
    px(b, 17, ty + 2, RAMPS.cream[0]);
  }
}
