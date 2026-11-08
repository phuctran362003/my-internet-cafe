import { RAMPS, shiftColor } from './palette.js';
import {
  C,
  bevel,
  canvas,
  composite,
  ellipse,
  hash,
  hline,
  line,
  outline,
  px,
  rect,
  roundRect,
  shadowEllipse,
  shadowRect,
  text,
  textWidth,
  vline
} from './brush.js';
import { blank, blit } from './pixelBuffer.js';
import { CAP, CELL } from './roomLayout.js';

const TEAK = RAMPS.teak;
const OAK = RAMPS.oak;
const SKY = RAMPS.sky;
const STEEL = RAMPS.steel;
const CREAM = RAMPS.cream;
const BEIGE = RAMPS.beige;
const GOLD = RAMPS.gold;
const RED = RAMPS.red;
const BOX = RAMPS.box;
const LEAF = RAMPS.leafy;
const TERRA = RAMPS.terra;
const TILE = RAMPS.tile;
const PINK = RAMPS.pink;
const VIOLET = RAMPS.violet;
const CYAN = RAMPS.cyan;
const LIME = RAMPS.lime;
const CHALK = RAMPS.chalk;
const WINE = RAMPS.wine;

/** Draws a sprite into a padded canvas, outlines it, and returns it with its offset. */
function sprite(w, h, draw, { edge = true, fixed = null } = {}) {
  const art = canvas(w, h);
  draw(art);
  if (!edge) return { art, ox: 0, oy: 0 };
  const padded = blank(w + 2, h + 2);
  blit(padded, art, 1, 1);
  outline(padded, fixed);
  return { art: padded, ox: -1, oy: -1 };
}

function place(dest, made, x, y) {
  composite(dest, made.art, x + made.ox, y + made.oy);
}

export function paintCounters(buffer, info) {
  for (const region of info.regions('counter')) {
    const w = region.w * CELL;
    const h = region.h * CELL;
    place(buffer, counter(w, h), region.x * CELL, region.y * CELL);
  }
}

const WALL_DECOR = {
  window: { draw: windowDecor, x: 3, y: CAP + 1 },
  poster: { draw: poster, x: 10, y: CAP + 1 },
  clock: { draw: clock, x: 10, y: CAP + 2 },
  board: { draw: priceBoard, x: 3, y: CAP + 1 },
  bulletin: { draw: bulletin, x: 5, y: CAP + 2 },
  sign: { draw: plate, x: 8, y: CAP + 4 },
  extinguisher: { draw: extinguisher, x: 12, y: CAP + 4 },
  neon: { draw: neon, x: 0, y: CAP + 1, center: true },
  sconce: { draw: sconce, x: 12, y: CAP + 2 }
};

const FLOOR_DECOR = {
  shelf: { draw: storageShelf, x: 1, y: -17 },
  boxes: { draw: boxStack, x: 2, y: -6 },
  crates: { draw: crates, x: 4, y: 4 },
  sacks: { draw: sacks, x: 2, y: 9 },
  toilet: { draw: toiletSide, x: 1, y: 5 },
  sink: { draw: sinkSide, x: 13, y: 1 },
  bathMat: { draw: bathMat, x: 26, y: 7 },
  bin: { draw: pedalBin, x: 24, y: 14 },
  fern: { draw: pottedFern, x: 2, y: 6 },
  wetSign: { draw: wetSign, x: 11, y: 12 },
  doormat: { draw: doormat, x: 2, y: 3 },
  rug: { draw: rug, x: 2, y: 4 }
};

/** Paints every entry of `map.decor` that the painter knows. */
export function paintDecor(buffer, info, decor) {
  info.cells.forEach((row, y) => row.forEach((cell, x) => {
    if (cell.name !== 'window' || !cell.face) return;
    sunlight(buffer, info, x * CELL + 4, (y + 1) * CELL);
    place(buffer, windowDecor({}), x * CELL + 3, y * CELL + CAP + 1);
  }));
  for (const item of decor) {
    if (item.type === 'window') sunlight(buffer, info, item.x * CELL + 4, (item.y + 1) * CELL);
  }
  for (const item of decor) {
    const spec = WALL_DECOR[item.type] ?? FLOOR_DECOR[item.type];
    if (!spec) continue;
    const made = spec.draw(item);
    const x = spec.center
      ? item.x * CELL + Math.floor((CELL - made.art.width) / 2) - made.ox
      : item.x * CELL + spec.x;
    place(buffer, made, x, item.y * CELL + spec.y);
  }
}

/** A slanted patch of window light: open floor one ramp step lighter, dithered at the edges. */
function sunlight(buffer, info, x0, y0) {
  const width = 22;
  const height = 44;
  for (let r = 0; r < height; r += 1) {
    const shift = Math.floor(r * 0.45);
    for (let c = 0; c < width; c += 1) {
      const x = x0 + c + shift;
      const y = y0 + r;
      if (!info.cell(Math.floor(x / CELL), Math.floor(y / CELL))?.open) continue;
      const edge = c < 2 || c >= width - 2 || r >= height - 6;
      if (edge && (x + y) % 2 === 0) continue;
      if (r >= height - 3 && (x + y) % 4 !== 1) continue;
      const i = (y * buffer.width + x) * 4;
      const lit = shiftColor([buffer.pixels[i], buffer.pixels[i + 1], buffer.pixels[i + 2]], -1);
      buffer.pixels[i] = lit[0];
      buffer.pixels[i + 1] = lit[1];
      buffer.pixels[i + 2] = lit[2];
    }
  }
}

function windowDecor(item) {
  return sprite(26, 16, (s) => {
    rect(s, 1, 0, 24, 14, TEAK[2]);
    hline(s, 1, 0, 24, TEAK[1]);
    vline(s, 1, 0, 14, TEAK[1]);
    hline(s, 1, 13, 24, TEAK[3]);
    vline(s, 24, 0, 14, TEAK[3]);
    for (const [gx, gy] of [[3, 2], [14, 2], [3, 8], [14, 8]]) {
      for (let y = 0; y < 4; y += 1) {
        hline(s, gx, gy + y, 9, y === 0 ? SKY[1] : y === 3 ? SKY[3] : SKY[2]);
      }
      px(s, gx + 1, gy + 2, SKY[0]);
      px(s, gx + 2, gy + 1, SKY[0]);
      px(s, gx + 3, gy + 1, SKY[0]);
      px(s, gx + 6, gy + 2, SKY[1]);
    }
    hline(s, 3, 6, 20, TEAK[1]);
    hline(s, 3, 7, 20, TEAK[3]);
    vline(s, 12, 2, 10, TEAK[1]);
    vline(s, 13, 2, 10, TEAK[3]);
    rect(s, 0, 14, 26, 1, TEAK[1]);
    rect(s, 0, 15, 26, 1, TEAK[3]);
    if (item.plant !== false) {
      rect(s, 19, 11, 4, 3, TERRA[2]);
      hline(s, 19, 11, 4, TERRA[1]);
      px(s, 20, 9, LEAF[2]);
      px(s, 21, 8, LEAF[1]);
      px(s, 19, 10, LEAF[3]);
      px(s, 22, 10, LEAF[2]);
      px(s, 21, 10, LEAF[1]);
      px(s, 20, 10, LEAF[2]);
    }
  });
}

function poster(item) {
  const variant = item.variant ?? 0;
  return sprite(12, 15, (s) => {
    rect(s, 0, 0, 12, 15, CREAM[1]);
    const bg = variant === 1 ? [RED[3], RED[2]] : variant === 2 ? [SKY[3], SKY[2]] : [VIOLET[3], VIOLET[2]];
    for (let y = 1; y < 11; y += 1) hline(s, 1, y, 10, y < 6 ? bg[0] : bg[1]);
    if (variant === 0) {
      ellipse(s, 8, 4, 2.5, 2.5, GOLD[1]);
      line(s, 2, 9, 6, 3, STEEL[1]);
      px(s, 6, 2, STEEL[0]);
      rect(s, 3, 6, 3, 4, VIOLET[4]);
      ellipse(s, 4.5, 5, 1.6, 1.6, VIOLET[4]);
      rect(s, 1, 11, 10, 3, GOLD[2]);
      hline(s, 2, 12, 8, RED[3]);
    } else if (variant === 1) {
      ellipse(s, 8.5, 3.5, 2, 2, CREAM[0]);
      rect(s, 3, 5, 3, 5, STEEL[7]);
      ellipse(s, 4.5, 4, 1.6, 1.6, STEEL[7]);
      hline(s, 5, 6, 5, STEEL[6]);
      px(s, 9, 5, GOLD[1]);
      rect(s, 1, 11, 10, 3, STEEL[1]);
      hline(s, 2, 12, 5, RED[2]);
    } else {
      ellipse(s, 6, 6, 3.5, 3.2, PINK[1]);
      rect(s, 3, 2, 6, 2, PINK[2]);
      px(s, 4, 6, C.ink);
      px(s, 7, 6, C.ink);
      px(s, 4, 5, CREAM[0]);
      px(s, 7, 5, CREAM[0]);
      hline(s, 5, 8, 2, RED[2]);
      rect(s, 1, 11, 10, 3, PINK[1]);
      hline(s, 2, 12, 8, VIOLET[3]);
    }
    px(s, 0, 0, RED[2]);
    px(s, 11, 0, RED[2]);
  });
}

function clock() {
  return sprite(11, 11, (s) => {
    ellipse(s, 5.5, 5.5, 5.5, 5.5, RED[3]);
    ellipse(s, 5.5, 5.5, 4.6, 4.6, RED[2]);
    ellipse(s, 5.5, 5.5, 3.8, 3.8, CREAM[0]);
    px(s, 5, 2, STEEL[4]);
    px(s, 8, 5, STEEL[4]);
    px(s, 5, 8, STEEL[4]);
    px(s, 2, 5, STEEL[4]);
    vline(s, 5, 3, 3, C.ink);
    hline(s, 5, 5, 3, STEEL[5]);
    px(s, 5, 5, RED[3]);
    px(s, 3, 2, CREAM[0]);
  });
}

function priceBoard() {
  return sprite(26, 15, (s) => {
    bevel(s, 0, 0, 26, 15, TEAK[2], TEAK[1], TEAK[3]);
    rect(s, 2, 2, 22, 11, CHALK[2]);
    for (let i = 0; i < 9; i += 1) {
      px(s, 3 + Math.floor(hash(i, 1, 61) * 20), 3 + Math.floor(hash(i, 2, 61) * 9), CHALK[1]);
    }
    text(s, 2 + Math.floor((22 - textWidth('NET')) / 2), 2, 'NET', CREAM[1]);
    text(s, 2 + Math.floor((22 - textWidth('5k/H')) / 2), 8, '5k/H', GOLD[1]);
    hline(s, 4, 7, 18, CHALK[1]);
    rect(s, 20, 13, 3, 1, CREAM[0]);
  });
}

function bulletin() {
  return sprite(22, 13, (s) => {
    bevel(s, 0, 0, 22, 13, TEAK[3], TEAK[2], TEAK[4]);
    rect(s, 1, 1, 20, 11, BOX[2]);
    for (let i = 0; i < 18; i += 1) {
      px(s, 1 + Math.floor(hash(i, 3, 62) * 20), 1 + Math.floor(hash(i, 4, 62) * 11), i % 3 ? BOX[3] : BOX[1]);
    }
    rect(s, 3, 2, 5, 6, CREAM[0]);
    hline(s, 4, 4, 3, STEEL[3]);
    hline(s, 4, 6, 2, STEEL[3]);
    px(s, 5, 2, RED[2]);
    rect(s, 10, 3, 4, 4, PINK[1]);
    px(s, 11, 3, SKY[4]);
    rect(s, 15, 5, 5, 5, SKY[1]);
    hline(s, 16, 7, 3, SKY[4]);
    px(s, 17, 5, LIME[2]);
    rect(s, 9, 8, 4, 3, GOLD[1]);
  });
}

function plate(item) {
  const label = item.text ?? 'KHO';
  const w = textWidth(label) + 4;
  return sprite(w, 9, (s) => {
    bevel(s, 0, 0, w, 9, STEEL[1], STEEL[0], STEEL[3]);
    text(s, 2, 2, label, STEEL[6]);
  });
}

function extinguisher() {
  return sprite(9, 16, (s) => {
    rect(s, 2, 4, 5, 10, RED[2]);
    vline(s, 3, 5, 8, RED[1]);
    vline(s, 6, 4, 10, RED[3]);
    rect(s, 2, 8, 5, 2, CREAM[1]);
    rect(s, 3, 2, 3, 2, STEEL[3]);
    hline(s, 2, 1, 4, STEEL[2]);
    px(s, 6, 2, STEEL[5]);
    vline(s, 7, 3, 6, STEEL[6]);
    px(s, 8, 9, STEEL[6]);
    hline(s, 2, 14, 5, RED[4]);
  });
}

const NEON_STROKES = [
  [[1, 1], [4, 9]], [[4, 9], [7, 1]],
  [[11, 1], [11, 9]],
  [[15, 1], [15, 9]], [[15, 1], [19, 1]], [[19, 1], [20, 2]], [[20, 2], [20, 4]], [[20, 4], [19, 5]], [[19, 5], [15, 5]]
];

function neon() {
  const w = 22;
  const h = 11;
  const core = canvas(w + 4, h + 4);
  for (const [[x0, y0], [x1, y1]] of NEON_STROKES) line(core, x0 + 2, y0 + 2, x1 + 2, y1 + 2, PINK[0]);
  const art = canvas(w + 4, h + 4);
  const lit = (buf, x, y) => buf.pixels[(y * buf.width + x) * 4 + 3] !== 0;
  for (let y = 0; y < art.height; y += 1) {
    for (let x = 0; x < art.width; x += 1) {
      if (lit(core, x, y)) continue;
      let near = 0;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= art.width || ny >= art.height || !lit(core, nx, ny)) continue;
          near = Math.max(near, Math.abs(dx) <= 1 && Math.abs(dy) <= 1 ? 2 : 1);
        }
      }
      if (near === 2) px(art, x, y, PINK[1]);
      else if (near === 1 && (x + y) % 2 === 0) px(art, x, y, PINK[3]);
    }
  }
  blit(art, core, 0, 0);
  return { art, ox: -2, oy: -2 };
}

function sconce() {
  return sprite(7, 10, (s) => {
    px(s, 3, 0, GOLD[0]);
    rect(s, 1, 1, 5, 4, CREAM[1]);
    hline(s, 2, 1, 3, CREAM[0]);
    hline(s, 1, 4, 5, GOLD[1]);
    vline(s, 3, 5, 3, GOLD[3]);
    rect(s, 2, 8, 3, 2, GOLD[3]);
    px(s, 2, 8, GOLD[2]);
  });
}

function cardboard(s, x, y, w, h, top) {
  rect(s, x, y, w, top, BOX[1]);
  hline(s, x, y, w, BOX[0]);
  rect(s, x, y + top, w, h - top, BOX[2]);
  hline(s, x, y + top, w, BOX[1]);
  vline(s, x + w - 1, y + top, h - top, BOX[3]);
  hline(s, x, y + h - 1, w, BOX[3]);
  const mid = x + Math.floor(w / 2) - 1;
  rect(s, mid, y, 2, top, BEIGE[0]);
  rect(s, mid, y + top, 2, 3, BEIGE[1]);
}

function storageShelf() {
  return sprite(60, 42, (s) => {
    shadowRect(s, 1, 39, 58, 3);
    rect(s, 2, 1, 56, 37, STEEL[6]);
    const levels = [12, 25, 37];
    for (const y of levels) {
      rect(s, 1, y - 1, 58, 2, STEEL[1]);
      hline(s, 1, y + 1, 58, STEEL[4]);
    }
    rect(s, 1, 0, 58, 1, STEEL[2]);
    cardboard(s, 4, 3, 13, 9, 3);
    cardboard(s, 18, 5, 11, 7, 3);
    cardboard(s, 31, 2, 14, 10, 3);
    rect(s, 47, 6, 9, 6, RED[2]);
    hline(s, 47, 6, 9, RED[1]);
    hline(s, 48, 8, 7, CREAM[0]);
    for (let i = 0; i < 9; i += 1) {
      const x = 3 + i * 6;
      rect(s, x, 17, 5, 7, GOLD[1]);
      hline(s, x, 17, 5, GOLD[0]);
      hline(s, x, 20, 5, RED[2]);
      vline(s, x + 4, 18, 6, GOLD[2]);
    }
    const bottles = [LEAF[2], RED[2], GOLD[2], SKY[3], LEAF[2], RED[2], SKY[3], GOLD[2], RED[2], LEAF[2], SKY[3], RED[2], GOLD[2]];
    bottles.forEach((color, i) => {
      const x = 3 + i * 4;
      rect(s, x, 30, 3, 6, color);
      px(s, x, 31, CREAM[0]);
      px(s, x + 1, 28, color);
      px(s, x + 1, 27, STEEL[2]);
      hline(s, x, 33, 3, CREAM[1]);
    });
    vline(s, 1, 0, 39, STEEL[3]);
    vline(s, 0, 0, 39, STEEL[2]);
    vline(s, 58, 0, 39, STEEL[3]);
    vline(s, 59, 0, 39, STEEL[4]);
  });
}

function boxStack() {
  return sprite(28, 32, (s) => {
    shadowRect(s, 1, 29, 27, 3);
    cardboard(s, 0, 15, 15, 15, 5);
    cardboard(s, 14, 18, 13, 12, 4);
    cardboard(s, 3, 3, 13, 13, 4);
    rect(s, 5, 10, 4, 3, CREAM[1]);
    hline(s, 6, 11, 2, STEEL[4]);
    line(s, 18, 25, 18, 23, STEEL[6]);
    line(s, 21, 25, 21, 23, STEEL[6]);
  });
}

function crate(s, x, y, color, light, dark) {
  rect(s, x, y, 20, 4, dark);
  for (let i = 0; i < 6; i += 1) {
    px(s, x + 2 + i * 3, y + 1, GOLD[2]);
    px(s, x + 2 + i * 3, y + 2, LEAF[4]);
  }
  rect(s, x, y + 4, 20, 8, color);
  hline(s, x, y + 4, 20, light);
  for (let i = 0; i < 4; i += 1) rect(s, x + 2 + i * 5, y + 6, 3, 2, dark);
  rect(s, x + 6, y + 9, 8, 2, CREAM[1]);
  hline(s, x, y + 11, 20, dark);
}

function crates() {
  return sprite(22, 26, (s) => {
    shadowRect(s, 1, 23, 21, 3);
    crate(s, 1, 12, RED[2], RED[1], RED[3]);
    crate(s, 0, 1, SKY[4], SKY[3], SKY[5]);
  });
}

function sacks() {
  return sprite(28, 21, (s) => {
    shadowRect(s, 1, 18, 27, 3);
    for (let x = 0; x < 28; x += 1) {
      const slat = x % 7 < 5;
      rect(s, x, 15, 1, 4, slat ? OAK[3] : OAK[5]);
      if (slat) px(s, x, 15, OAK[2]);
    }
    for (const [x, y, w] of [[1, 4, 14], [12, 6, 15]]) {
      ellipse(s, x + w / 2, y + 5.5, w / 2, 5.5, BEIGE[1]);
      ellipse(s, x + w / 2 - 1, y + 4, w / 2 - 2, 3, BEIGE[0]);
      hline(s, x + 2, y + 9, w - 4, BEIGE[3]);
      rect(s, x + 3, y + 5, w - 6, 3, y === 4 ? RED[2] : LEAF[3]);
      hline(s, x + 4, y + 6, w - 8, CREAM[0]);
      for (let i = 0; i < w - 4; i += 2) px(s, x + 2 + i, y + 1, BEIGE[3]);
    }
  });
}

/** Toilet against the left wall, facing right, with a blue seat and a paper roll on the wall. */
function toiletSide() {
  return sprite(22, 26, (s) => {
    shadowEllipse(s, 12, 23.5, 8, 2);
    rect(s, 0, 0, 10, 2, TILE[1]);
    hline(s, 0, 0, 10, TILE[0]);
    hline(s, 0, 2, 10, TILE[4]);
    rect(s, 0, 3, 9, 11, TILE[2]);
    vline(s, 0, 3, 11, TILE[0]);
    vline(s, 1, 3, 11, TILE[1]);
    vline(s, 7, 3, 11, TILE[3]);
    vline(s, 8, 3, 11, TILE[4]);
    hline(s, 2, 5, 5, SKY[3]);
    rect(s, 9, 5, 3, 1, STEEL[1]);
    px(s, 9, 6, STEEL[3]);
    px(s, 11, 6, STEEL[4]);
    rect(s, 6, 13, 15, 3, SKY[3]);
    hline(s, 6, 13, 15, SKY[2]);
    hline(s, 7, 15, 13, SKY[4]);
    px(s, 20, 14, SKY[4]);
    ellipse(s, 13.5, 17.5, 7, 3.2, TILE[1]);
    hline(s, 8, 16, 12, TILE[0]);
    hline(s, 9, 19, 9, TILE[3]);
    rect(s, 10, 19, 7, 3, TILE[1]);
    vline(s, 10, 19, 3, TILE[0]);
    vline(s, 16, 19, 3, TILE[3]);
    rect(s, 9, 22, 9, 2, TILE[2]);
    hline(s, 9, 23, 9, TILE[3]);
    hline(s, 0, 16, 5, STEEL[3]);
    rect(s, 0, 17, 4, 4, CREAM[1]);
    vline(s, 0, 17, 4, CREAM[0]);
    vline(s, 3, 17, 4, CREAM[3]);
    rect(s, 1, 21, 2, 2, CREAM[1]);
  });
}

/** Pedestal sink against the right wall: oval mirror, chrome tap, soap and a hanging towel. */
function sinkSide() {
  return sprite(18, 38, (s) => {
    shadowEllipse(s, 10, 36, 6, 1.6);
    ellipse(s, 14.5, 6, 3.5, 6, GOLD[2]);
    ellipse(s, 14.5, 6, 2.4, 4.8, SKY[2]);
    vline(s, 14, 3, 5, SKY[1]);
    px(s, 13, 4, SKY[0]);
    px(s, 15, 9, SKY[3]);
    px(s, 13, 0, GOLD[1]);
    rect(s, 16, 13, 2, 8, STEEL[2]);
    rect(s, 10, 14, 7, 2, STEEL[1]);
    hline(s, 10, 14, 7, STEEL[0]);
    px(s, 10, 16, STEEL[3]);
    px(s, 13, 13, STEEL[3]);
    rect(s, 1, 19, 17, 2, TILE[0]);
    ellipse(s, 9.5, 22, 8.5, 3.2, TILE[1]);
    hline(s, 3, 21, 13, TILE[2]);
    hline(s, 2, 23, 15, TILE[3]);
    rect(s, 7, 24, 5, 10, TILE[1]);
    vline(s, 7, 24, 10, TILE[0]);
    vline(s, 11, 24, 10, TILE[3]);
    rect(s, 6, 33, 7, 2, TILE[2]);
    rect(s, 2, 15, 3, 4, PINK[1]);
    vline(s, 2, 15, 4, PINK[0]);
    px(s, 3, 14, PINK[3]);
    hline(s, 3, 13, 2, PINK[3]);
    rect(s, 14, 24, 4, 9, PINK[1]);
    vline(s, 14, 24, 9, PINK[0]);
    vline(s, 17, 24, 9, PINK[2]);
    hline(s, 14, 30, 4, CREAM[0]);
    hline(s, 13, 23, 5, STEEL[2]);
  });
}

function bathMat() {
  return sprite(14, 24, (s) => {
    roundRect(s, 0, 0, 14, 24, SKY[3]);
    roundRect(s, 1, 1, 12, 22, SKY[2]);
    for (let y = 3; y < 21; y += 1) {
      for (let x = 3; x < 11; x += 1) {
        if ((x + y) % 4 === 0) px(s, x, y, SKY[1]);
        else if ((x - y + 40) % 4 === 0) px(s, x, y, SKY[3]);
      }
    }
    for (let y = 2; y < 22; y += 3) {
      px(s, 0, y, CREAM[0]);
      px(s, 13, y, CREAM[0]);
    }
  }, { edge: false });
}

function pedalBin() {
  return sprite(9, 13, (s) => {
    shadowEllipse(s, 4.5, 12, 4.5, 1.2);
    rect(s, 1, 3, 7, 8, STEEL[2]);
    vline(s, 1, 3, 8, STEEL[1]);
    vline(s, 2, 3, 8, STEEL[0]);
    vline(s, 7, 3, 8, STEEL[4]);
    rect(s, 0, 1, 9, 2, STEEL[1]);
    hline(s, 0, 1, 9, STEEL[0]);
    rect(s, 3, 0, 3, 1, STEEL[3]);
    hline(s, 1, 10, 7, STEEL[4]);
    rect(s, 3, 11, 3, 1, STEEL[5]);
  });
}

function pottedFern() {
  return sprite(14, 22, (s) => {
    shadowEllipse(s, 7, 21, 6, 1.4);
    rect(s, 3, 13, 8, 7, SKY[4]);
    hline(s, 3, 13, 8, SKY[3]);
    hline(s, 2, 12, 10, SKY[3]);
    vline(s, 4, 14, 5, SKY[3]);
    vline(s, 10, 14, 6, SKY[5]);
    hline(s, 4, 19, 6, SKY[5]);
    hline(s, 4, 16, 6, CREAM[0]);
    const fronds = [[7, 11, 1, 1], [7, 11, 13, 2], [7, 11, 0, 7], [7, 11, 13, 8], [7, 11, 4, 0], [7, 11, 10, 0]];
    for (const [x0, y0, x1, y1] of fronds) line(s, x0, y0, x1, y1, LEAF[3]);
    for (const [x, y] of [[3, 2], [11, 3], [2, 7], [12, 8], [5, 1], [9, 1], [4, 5], [10, 5], [6, 3], [8, 4]]) {
      px(s, x, y, LEAF[1]);
      px(s, x + 1, y, LEAF[2]);
    }
    px(s, 7, 6, LEAF[1]);
    px(s, 7, 9, LEAF[2]);
  });
}

function wetSign() {
  return sprite(10, 15, (s) => {
    shadowEllipse(s, 5, 13.5, 5, 1.4);
    for (let y = 0; y < 13; y += 1) {
      const half = 2 + Math.floor(y / 4);
      hline(s, 5 - half, y, half * 2, y === 0 ? GOLD[0] : GOLD[1]);
      px(s, 5 + half - 1, y, GOLD[2]);
    }
    hline(s, 1, 12, 8, GOLD[3]);
    vline(s, 5, 3, 4, C.ink);
    px(s, 5, 8, C.ink);
  });
}

function doormat() {
  return sprite(12, 26, (s) => {
    rect(s, 0, 0, 12, 26, WINE[3]);
    rect(s, 1, 1, 10, 24, BOX[2]);
    for (let y = 2; y < 24; y += 1) {
      for (let x = 2; x < 10; x += 1) if ((x + y) % 3 === 0) px(s, x, y, BOX[3]);
    }
    hline(s, 1, 1, 10, BOX[1]);
    hline(s, 0, 25, 12, WINE[4]);
  }, { edge: false });
}

function diamond(s, cx, cy, rx, ry, color) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      if (Math.abs(x - cx) / rx + Math.abs(y - cy) / ry <= 1) px(s, x, y, color);
    }
  }
}

/** Flat rug spanning `w` x `h` cells, with tassels on the short ends. */
function rug(item) {
  const NAVY = RAMPS.navy;
  const w = item.w * CELL - 8;
  const h = item.h * CELL - 8;
  return sprite(w + 4, h, (s) => {
    for (let y = 1; y < h - 1; y += 2) {
      px(s, 0, y, CREAM[2]);
      px(s, 1, y, CREAM[1]);
      px(s, w + 2, y, CREAM[1]);
      px(s, w + 3, y, CREAM[2]);
    }
    const x0 = 2;
    rect(s, x0, 0, w, h, NAVY[4]);
    rect(s, x0 + 1, 1, w - 2, h - 2, NAVY[3]);
    rect(s, x0 + 3, 3, w - 6, h - 6, GOLD[3]);
    rect(s, x0 + 4, 4, w - 8, h - 8, NAVY[3]);
    for (let x = x0 + 5; x < x0 + w - 5; x += 3) {
      px(s, x, 2, CREAM[2]);
      px(s, x, h - 3, CREAM[2]);
    }
    const fx = x0 + 6;
    const fy = 6;
    const fw = w - 12;
    const fh = h - 12;
    rect(s, fx, fy, fw, fh, NAVY[2]);
    for (let y = 0; y < fh; y += 1) {
      for (let x = 0; x < fw; x += 1) {
        const u = (x + y) % 12;
        const v = (x - y + 1200) % 12;
        if (u === 0 || v === 0) px(s, fx + x, fy + y, NAVY[3]);
        else if (u === 6 && v === 6) px(s, fx + x, fy + y, CREAM[2]);
        else if (hash(fx + x, fy + y, 81) < 0.03) px(s, fx + x, fy + y, NAVY[1]);
      }
    }
    const cx = x0 + Math.floor(w / 2) - 0.5;
    const cy = Math.floor(h / 2) - 0.5;
    diamond(s, cx, cy, 22, 15, GOLD[3]);
    diamond(s, cx, cy, 20, 13, NAVY[4]);
    diamond(s, cx, cy, 17, 11, WINE[3]);
    diamond(s, cx, cy, 12, 8, GOLD[2]);
    diamond(s, cx, cy, 10, 6.5, WINE[2]);
    diamond(s, cx, cy, 4, 2.5, CREAM[1]);
    for (const [dx, dy] of [[-14, 0], [14, 0], [0, -9], [0, 9]]) diamond(s, cx + dx, cy + dy, 2, 1.5, CREAM[2]);
    for (const [ax, ay, sx, sy] of [[fx, fy, 1, 1], [fx + fw - 1, fy, -1, 1], [fx, fy + fh - 1, 1, -1], [fx + fw - 1, fy + fh - 1, -1, -1]]) {
      for (let i = 0; i < 6; i += 1) {
        for (let j = 0; j < 6 - i; j += 1) px(s, ax + sx * i, ay + sy * j, (i + j) % 2 ? GOLD[3] : WINE[3]);
      }
    }
  }, { edge: false });
}

/** Cashier counter: a cream top with a register and snacks, and a glass case facing the room. */
function counter(w, h) {
  const top = Math.max(18, h - CELL);
  return sprite(w, h + 3, (s) => {
    shadowRect(s, 1, h - 1, w - 1, 4);
    rect(s, 0, 2, w, top - 4, CREAM[1]);
    hline(s, 0, 2, w, CREAM[0]);
    hline(s, 0, 3, w, CREAM[0]);
    for (let i = 0; i < w / 3; i += 1) {
      px(s, Math.floor(hash(i, 1, 71) * w), 4 + Math.floor(hash(i, 2, 71) * (top - 8)), CREAM[2]);
    }
    rect(s, 0, top - 2, w, 1, CREAM[0]);
    rect(s, 0, top - 1, w, 2, TEAK[1]);
    hline(s, 0, top + 1, w, TEAK[3]);

    const front = top + 2;
    rect(s, 0, front, w, h - front, TEAK[2]);
    vline(s, 0, front, h - front, TEAK[1]);
    vline(s, w - 1, front, h - front, TEAK[4]);
    const gx = 5;
    const gy = front + 3;
    const gw = w - 10;
    const gh = h - front - 11;
    rect(s, gx - 1, gy - 1, gw + 2, gh + 2, TEAK[4]);
    rect(s, gx, gy, gw, gh, SKY[5]);
    const mid = gy + Math.floor(gh / 2);
    hline(s, gx, mid, gw, STEEL[2]);
    hline(s, gx, mid + 1, gw, STEEL[4]);
    const drinks = [RED[2], LEAF[2], SKY[3], GOLD[2], RED[2], LEAF[2], CREAM[1]];
    for (let x = gx + 2, i = 0; x + 3 <= gx + gw - 1; x += 5, i += 1) {
      const color = drinks[i % drinks.length];
      rect(s, x, mid - 6, 3, 6, color);
      px(s, x + 1, mid - 7, STEEL[2]);
      px(s, x, mid - 5, CREAM[0]);
    }
    const snacks = [GOLD[1], PINK[1], LIME[1], RED[1], SKY[2], GOLD[1]];
    for (let x = gx + 2, i = 0; x + 6 <= gx + gw - 1; x += 8, i += 1) {
      const color = snacks[i % snacks.length];
      roundRect(s, x, mid + 3, 6, gh - (mid - gy) - 4, color);
      hline(s, x + 1, mid + 5, 4, CREAM[0]);
    }
    for (let i = 0; i < 3; i += 1) {
      const rx = gx + 6 + i * Math.floor(gw / 3);
      line(s, rx, gy + gh - 2, rx + 5, gy + 1, SKY[1]);
      line(s, rx + 2, gy + gh - 2, rx + 6, gy + 3, SKY[2]);
    }
    rect(s, 0, h - 6, w, 6, TEAK[4]);
    hline(s, 0, h - 6, w, TEAK[3]);
    hline(s, 0, h - 1, w, TEAK[5]);

    register(s, 6, 3);
    bell(s, Math.floor(w * 0.42), top - 9);
    candyJar(s, Math.floor(w * 0.52), top - 16);
    noodleCups(s, Math.floor(w * 0.66), top - 18);
    succulent(s, w - 13, top - 13);
  });
}

function register(s, x, y) {
  rect(s, x + 1, y + 13, 16, 7, STEEL[5]);
  hline(s, x + 1, y + 13, 16, STEEL[4]);
  rect(s, x + 3, y + 15, 9, 3, STEEL[3]);
  for (let i = 0; i < 4; i += 1) px(s, x + 4 + i * 2, y + 16, STEEL[1]);
  rect(s, x + 7, y + 10, 3, 3, STEEL[6]);
  rect(s, x + 2, y, 13, 10, STEEL[6]);
  rect(s, x + 3, y + 1, 11, 8, RAMPS.cyan[4]);
  hline(s, x + 4, y + 2, 6, LIME[1]);
  hline(s, x + 4, y + 4, 8, LIME[2]);
  hline(s, x + 4, y + 6, 4, LIME[2]);
  rect(s, x + 13, y + 12, 5, 6, STEEL[2]);
  rect(s, x + 14, y + 10, 3, 3, CREAM[0]);
}

function bell(s, x, y) {
  rect(s, x, y + 5, 7, 2, STEEL[4]);
  ellipse(s, x + 3.5, y + 5, 3.2, 3.2, GOLD[2]);
  rect(s, x, y + 5, 7, 1, GOLD[3]);
  px(s, x + 2, y + 3, GOLD[0]);
  px(s, x + 3, y + 1, GOLD[1]);
}

function candyJar(s, x, y) {
  rect(s, x, y + 3, 8, 13, SKY[1]);
  vline(s, x, y + 3, 13, SKY[0]);
  vline(s, x + 7, y + 3, 13, SKY[2]);
  rect(s, x + 1, y + 1, 6, 2, STEEL[2]);
  hline(s, x + 1, y + 1, 6, STEEL[1]);
  const candies = [RED[1], LIME[1], GOLD[1], PINK[1], VIOLET[1], CYAN[1]];
  for (let i = 0; i < 14; i += 1) {
    px(s, x + 1 + (i * 3) % 6, y + 8 + Math.floor(i / 2.5), candies[i % candies.length]);
  }
}

function noodleCups(s, x, y) {
  for (let i = 0; i < 3; i += 1) {
    const cy = y + i * 5;
    const cx = x + (i === 1 ? 1 : 0);
    rect(s, cx, cy, 8, 5, CREAM[0]);
    hline(s, cx, cy, 8, GOLD[1]);
    rect(s, cx, cy + 2, 8, 2, RED[2]);
    vline(s, cx + 7, cy + 1, 4, CREAM[2]);
  }
  rect(s, x + 10, y + 8, 6, 7, CREAM[0]);
  hline(s, x + 10, y + 8, 6, GOLD[1]);
  rect(s, x + 10, y + 11, 6, 2, LEAF[2]);
  vline(s, x + 15, y + 9, 6, CREAM[2]);
}

function succulent(s, x, y) {
  rect(s, x + 1, y + 7, 8, 6, TERRA[2]);
  hline(s, x + 1, y + 7, 8, TERRA[1]);
  vline(s, x + 8, y + 8, 5, TERRA[3]);
  ellipse(s, x + 5, y + 5, 4, 3, LEAF[2]);
  ellipse(s, x + 3.5, y + 4, 2, 2, LEAF[1]);
  ellipse(s, x + 7, y + 4.5, 1.8, 1.8, LEAF[3]);
  px(s, x + 5, y + 1, LEAF[1]);
  px(s, x + 3, y + 3, LEAF[0]);
}

export const DECOR_TYPES = [...Object.keys(WALL_DECOR), ...Object.keys(FLOOR_DECOR)];
