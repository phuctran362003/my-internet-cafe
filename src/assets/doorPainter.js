import { RAMPS } from './palette.js';
import { C, bevel, ellipse, hline, outline, px, rect, shadowRect, vline } from './brush.js';
import { blank, blit } from './pixelBuffer.js';
import { DOOR_FRAMES } from './layout.js';
import { CAP, CELL } from './roomLayout.js';

const TEAK = RAMPS.teak;
const STEEL = RAMPS.steel;
const SKY = RAMPS.sky;
const CONC = RAMPS.conc;
const GOLD = RAMPS.gold;
const WINE = RAMPS.wine;

/** Door and gate frames. `H` frames sit in a wall face, `V` frames fill a gap in a vertical wall. */
export function paintDoorFrames() {
  const painters = {
    entranceOpenH,
    entranceClosedH,
    entranceOpenV,
    entranceClosedV,
    doorOpenH,
    doorLockedH,
    doorOpenV,
    doorLockedV,
    ropeOpenH,
    ropeLockedH,
    ropeOpenV,
    ropeLockedV
  };
  return DOOR_FRAMES.map((name) => {
    const frame = blank(CELL, CELL);
    painters[name](frame);
    return frame;
  });
}

function outlined(frame, x, y, w, h, draw) {
  const art = blank(w + 2, h + 2);
  draw(art, 1, 1);
  outline(art);
  blit(frame, art, x - 1, y - 1);
}

function casing(frame, x, y, w, h, ramp) {
  rect(frame, x, y, w, h, ramp[2]);
  hline(frame, x, y, w, ramp[1]);
  vline(frame, x, y, h, ramp[1]);
  vline(frame, x + w - 1, y, h, ramp[4]);
}

function entranceOpenH(frame) {
  casing(frame, 4, CAP + 1, 24, 32 - CAP - 1, STEEL);
  for (let y = CAP + 3; y < 32; y += 1) {
    const tone = y < CAP + 8 ? 3 : y < CAP + 15 ? 2 : 1;
    hline(frame, 6, y, 20, CONC[tone]);
  }
  hline(frame, 6, CAP + 3, 20, CONC[5]);
  rect(frame, 6, CAP + 3, 4, 32 - CAP - 3, SKY[2]);
  rect(frame, 22, CAP + 3, 4, 32 - CAP - 3, SKY[2]);
  vline(frame, 7, CAP + 5, 6, SKY[0]);
  vline(frame, 23, CAP + 5, 6, SKY[0]);
  vline(frame, 9, CAP + 3, 32 - CAP - 3, STEEL[4]);
  vline(frame, 22, CAP + 3, 32 - CAP - 3, STEEL[4]);
  hline(frame, 4, 31, 24, STEEL[3]);
}

function entranceClosedH(frame) {
  casing(frame, 4, CAP + 1, 24, 32 - CAP - 1, STEEL);
  rect(frame, 6, CAP + 3, 20, 3, STEEL[5]);
  for (let y = CAP + 6; y < 31; y += 1) {
    hline(frame, 6, y, 20, (y - CAP) % 3 === 0 ? STEEL[4] : (y - CAP) % 3 === 1 ? STEEL[1] : STEEL[2]);
  }
  rect(frame, 14, 27, 4, 3, STEEL[6]);
  px(frame, 15, 28, GOLD[1]);
  hline(frame, 6, 31, 20, STEEL[5]);
}

function threshold(frame, ramp) {
  vline(frame, 0, 0, CELL, ramp[4]);
  vline(frame, 1, 0, CELL, ramp[1]);
  vline(frame, 2, 0, CELL, ramp[3]);
}

function entranceOpenV(frame) {
  threshold(frame, STEEL);
}

function shutterSlab(frame, x, ramp, ribbed) {
  shadowRect(frame, x + 7, 2, 3, CELL - 2);
  outlined(frame, x, 0, 7, CELL, (art, ox, oy) => {
    rect(art, ox, oy, 7, CELL, ramp[2]);
    vline(art, ox, oy, CELL, ramp[1]);
    vline(art, ox + 6, oy, CELL, ramp[4]);
    if (ribbed) {
      for (let y = 2; y < CELL; y += 3) hline(art, ox + 1, oy + y, 5, ramp[3]);
    }
    rect(art, ox, oy + CELL - 4, 7, 4, ramp[4]);
    hline(art, ox, oy + CELL - 4, 7, ramp[3]);
  });
}

function entranceClosedV(frame) {
  threshold(frame, STEEL);
  shutterSlab(frame, 3, STEEL, true);
}

function doorOpenH(frame) {
  casing(frame, 5, CAP + 1, 22, 32 - CAP - 1, TEAK);
  for (let y = CAP + 3; y < 32; y += 1) {
    const tone = y < CAP + 7 ? 5 : y < CAP + 13 ? 4 : y < CAP + 20 ? 3 : 2;
    hline(frame, 7, y, 18, CONC[tone]);
  }
  rect(frame, 7, CAP + 3, 3, 32 - CAP - 3, TEAK[3]);
  vline(frame, 7, CAP + 3, 32 - CAP - 3, TEAK[2]);
  px(frame, 9, 20, GOLD[1]);
  hline(frame, 5, 31, 22, TEAK[4]);
}

function doorLockedH(frame) {
  casing(frame, 5, CAP + 1, 22, 32 - CAP - 1, TEAK);
  const x = 7;
  const y = CAP + 3;
  const w = 18;
  const h = 32 - y;
  rect(frame, x, y, w, h, TEAK[2]);
  bevel(frame, x + 2, y + 2, 6, 9, TEAK[3], TEAK[4], TEAK[1]);
  bevel(frame, x + 10, y + 2, 6, 9, TEAK[3], TEAK[4], TEAK[1]);
  bevel(frame, x + 2, y + 13, 6, h - 15, TEAK[3], TEAK[4], TEAK[1]);
  bevel(frame, x + 10, y + 13, 6, h - 15, TEAK[3], TEAK[4], TEAK[1]);
  rect(frame, x + 13, y + 11, 3, 3, GOLD[2]);
  px(frame, x + 13, y + 11, GOLD[0]);
  px(frame, x + 14, y + 12, C.ink);
  vline(frame, x + 14, y + 9, 2, STEEL[3]);
  hline(frame, x, 31, w, TEAK[4]);
}

function doorOpenV(frame) {
  threshold(frame, TEAK);
}

function doorLockedV(frame) {
  shutterSlab(frame, 12, TEAK, false);
  px(frame, 16, 15, GOLD[1]);
  px(frame, 16, 16, GOLD[3]);
}

function stanchion(frame, x, baseY) {
  shadowRect(frame, x - 2, baseY + 1, 6, 1);
  outlined(frame, x - 2, baseY - 10, 5, 12, (art, ox, oy) => {
    ellipse(art, ox + 2.5, oy + 10.5, 2.5, 1.5, GOLD[3]);
    hline(art, ox + 1, oy + 10, 3, GOLD[2]);
    vline(art, ox + 2, oy + 2, 8, GOLD[2]);
    vline(art, ox + 1, oy + 3, 7, GOLD[1]);
    rect(art, ox + 1, oy, 3, 3, GOLD[1]);
    px(art, ox + 1, oy, GOLD[0]);
  });
}

function rope(frame, points) {
  for (const [x, y] of points) {
    px(frame, x, y, WINE[2]);
    px(frame, x + 1, y, WINE[4]);
  }
}

function ropeOpenV(frame) {
  for (let x = 0; x < CELL; x += 1) {
    vline(frame, x, 14, 11, WINE[2]);
    px(frame, x, 14, GOLD[2]);
    px(frame, x, 24, GOLD[3]);
    if ((x + 1) % 4 === 0) px(frame, x, 19, WINE[1]);
  }
  stanchion(frame, 15, 11);
  rope(frame, [[17, 3], [17, 4], [18, 5], [18, 6], [18, 7], [18, 8], [19, 9], [19, 10]]);
}

function ropeLockedV(frame) {
  stanchion(frame, 15, 11);
  const points = [];
  for (let y = 0; y <= 17; y += 1) {
    const sag = Math.round(3 * Math.sin((Math.PI * y) / 17));
    points.push([16 + sag, 3 + y]);
  }
  rope(frame, points);
  stanchion(frame, 15, 30);
}

function archway(frame) {
  casing(frame, 4, CAP + 1, 24, 32 - CAP - 1, GOLD);
  for (let y = CAP + 3; y < 32; y += 1) {
    const tone = y < CAP + 7 ? 5 : y < CAP + 14 ? 4 : 3;
    hline(frame, 6, y, 20, WINE[tone]);
  }
}

function ropeOpenH(frame) {
  archway(frame);
  stanchion(frame, 7, 30);
  stanchion(frame, 24, 30);
  rope(frame, [[8, 21], [8, 22], [8, 23], [9, 24], [9, 25]]);
}

function ropeLockedH(frame) {
  archway(frame);
  stanchion(frame, 7, 30);
  stanchion(frame, 24, 30);
  const points = [];
  for (let x = 8; x <= 23; x += 1) {
    points.push([x, 22 + Math.round(2 * Math.sin((Math.PI * (x - 8)) / 15))]);
  }
  for (const [x, y] of points) {
    px(frame, x, y, WINE[2]);
    px(frame, x, y + 1, WINE[4]);
  }
}
