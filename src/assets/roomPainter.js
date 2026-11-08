import { RAMPS, shiftColor } from './palette.js';
import { C, hash } from './brush.js';
import { blank, setPixel } from './pixelBuffer.js';
import { analyzeRoom, CAP, CELL } from './roomLayout.js';
import { paintCounters, paintDecor } from './decor.js';

const FLOOR = 0;
const FACE = 1;
const TOP = 2;

const OAK = RAMPS.oak;
const TEAK = RAMPS.teak;
const SAGE = RAMPS.sage;
const BARN = RAMPS.barn;
const CONC = RAMPS.conc;
const TILE = RAMPS.tile;
const WINE = RAMPS.wine;
const GOLD = RAMPS.gold;
const NAVY = RAMPS.navy;
const STEEL = RAMPS.steel;
const SKY = RAMPS.sky;

const TRIM = [null, TEAK[5], TEAK[2], TEAK[3], TEAK[4]];
const PLANK_TONES = [2, 2, 2, 2, 3, 2, 2, 1, 2, 3];

/**
 * Paints the whole café as one picture at design scale: floors, wall
 * faces, wall tops, wall shadows, the counter and the map's decor list.
 */
export function paintRoom(map) {
  const info = analyzeRoom(map);
  const width = info.cols * CELL;
  const height = info.rows * CELL;
  const buffer = blank(width, height);
  const zone = new Uint8Array(width * height);
  const ctx = {
    info,
    width,
    height,
    buffer,
    zone,
    planks: new Map(),
    rooms: roomRects(map, info)
  };

  for (let cy = 0; cy < info.rows; cy += 1) {
    for (let cx = 0; cx < info.cols; cx += 1) {
      paintCell(ctx, cx, cy, info.cells[cy][cx]);
    }
  }
  paintFloorShadows(ctx);
  paintFaceEdges(ctx);
  paintTops(ctx);
  paintCounters(buffer, info);
  paintDecor(buffer, info, map.decor ?? []);
  return buffer;
}

function roomRects(map, info) {
  const rects = (map.rooms ?? []).map((room) => ({ kind: room.kind, ...room.area }));
  for (const kind of ['vip', 'storage', 'toilet']) {
    for (const region of info.regions(kind)) {
      if (!rects.some((r) => r.kind === kind && contains(r, region.x, region.y))) rects.push({ kind, ...region });
    }
  }
  return rects;
}

function contains(rect, x, y) {
  return x >= rect.x && y >= rect.y && x < rect.x + rect.w && y < rect.y + rect.h;
}

function paintCell(ctx, cx, cy, cell) {
  const x0 = cx * CELL;
  const y0 = cy * CELL;
  if (cell.open) {
    const room = ctx.rooms.find((r) => r.kind === cell.material && contains(r, cx, cy));
    for (let y = y0; y < y0 + CELL; y += 1) {
      for (let x = x0; x < x0 + CELL; x += 1) {
        ctx.zone[y * ctx.width + x] = FLOOR;
        setPixel(ctx.buffer, x, y, floorColor(ctx, cell.material, x, y, room));
      }
    }
    const above = ctx.info.cell(cx, cy - 1);
    if (above?.open && above.material !== cell.material) {
      for (let x = x0; x < x0 + CELL; x += 1) {
        setPixel(ctx.buffer, x, y0, STEEL[4]);
        setPixel(ctx.buffer, x, y0 + 1, STEEL[1]);
        setPixel(ctx.buffer, x, y0 + 2, STEEL[3]);
      }
    }
    const left = ctx.info.cell(cx - 1, cy);
    if (left?.open && left.material !== cell.material) {
      for (let y = y0; y < y0 + CELL; y += 1) {
        setPixel(ctx.buffer, x0, y, STEEL[4]);
        setPixel(ctx.buffer, x0 + 1, y, STEEL[1]);
        setPixel(ctx.buffer, x0 + 2, y, STEEL[3]);
      }
    }
    return;
  }
  const faceTop = cell.face ? y0 + CAP : y0 + CELL;
  for (let y = y0; y < y0 + CELL; y += 1) {
    for (let x = x0; x < x0 + CELL; x += 1) {
      if (y < faceTop) {
        ctx.zone[y * ctx.width + x] = TOP;
        continue;
      }
      ctx.zone[y * ctx.width + x] = FACE;
      setPixel(ctx.buffer, x, y, faceColor(cell.faceStyle, x, y - faceTop));
    }
  }
}

function floorColor(ctx, material, x, y, room) {
  if (material === 'storage') return concrete(x, y);
  if (material === 'toilet') return ceramic(x, y, room);
  if (material === 'vip') return carpet(x, y, room);
  return planks(ctx, x, y);
}

function plankRow(ctx, row) {
  let entry = ctx.planks.get(row);
  if (entry) return entry;
  const list = [];
  let x = -Math.floor(hash(row, 0, 11) * 40);
  for (let i = 0; x < ctx.width; i += 1) {
    const len = 22 + Math.floor(hash(row, i, 12) * 5) * 8;
    const seed = row * 977 + i;
    list.push({ start: x, len, seed, tone: PLANK_TONES[Math.floor(hash(seed, 0, 3) * PLANK_TONES.length)] });
    x += len;
  }
  const index = new Int16Array(ctx.width);
  let p = 0;
  for (let px = 0; px < ctx.width; px += 1) {
    while (list[p].start + list[p].len <= px) p += 1;
    index[px] = p;
  }
  entry = { list, index };
  ctx.planks.set(row, entry);
  return entry;
}

function planks(ctx, x, y) {
  const row = Math.floor(y / 8);
  const ly = y % 8;
  const { list, index } = plankRow(ctx, row);
  const plank = list[index[x]];
  const lx = x - plank.start;
  const tone = plank.tone;
  if (ly === 7 || lx === 0) return OAK[5];
  if (ly === 0 || lx === 1) return OAK[tone - 1];
  if (ly === 6) return OAK[tone + 1];
  for (let g = 0; g < 2; g += 1) {
    const gy = 1 + Math.floor(hash(plank.seed, g * 3 + 1, 5) * 5);
    const gx = 3 + Math.floor(hash(plank.seed, g * 3 + 2, 5) * Math.max(1, plank.len - 12));
    const gl = 3 + Math.floor(hash(plank.seed, g * 3 + 3, 5) * 9);
    if (ly === gy && lx >= gx && lx < gx + gl) return OAK[tone + 1];
  }
  if (hash(plank.seed, 9, 5) < 0.18) {
    const kx = 4 + Math.floor(hash(plank.seed, 10, 5) * Math.max(1, plank.len - 8));
    const ky = 2 + Math.floor(hash(plank.seed, 11, 5) * 3);
    if (ly === ky && (lx === kx || lx === kx + 1)) return OAK[tone + 2];
    if ((ly === ky - 1 || ly === ky + 1) && lx === kx) return OAK[tone + 1];
  }
  if (hash(x, y, 9) < 0.02) return OAK[tone + 1];
  return OAK[tone];
}

function concrete(x, y) {
  const lx = x % 16;
  const ly = y % 16;
  const worn = hash(Math.floor(x / 16), Math.floor(y / 16), 21);
  if (lx === 0 || ly === 0) return CONC[3];
  if (lx === 1 || ly === 1) return CONC[0];
  if (lx === 15 || ly === 15) return CONC[2];
  const n = hash(x, y, 22);
  if (n < 0.03 + worn * 0.09) return CONC[2];
  if (n > 0.985) return CONC[0];
  return CONC[1];
}

/** Checkered tiles framed by a ring of blue tiles, with a small blue inlay where four tiles meet. */
function ceramic(x, y, room) {
  const lx = x % 8;
  const ly = y % 8;
  const tx = Math.floor(x / 8);
  const ty = Math.floor(y / 8);
  if (room) {
    const per = CELL / 8;
    const rx = tx - room.x * per;
    const ry = ty - room.y * per;
    if (rx === 0 || ry === 0 || rx === room.w * per - 1 || ry === room.h * per - 1) {
      if (lx === 0 || ly === 0) return SKY[6];
      if (lx === 1 || ly === 1) return SKY[3];
      if (lx === 7 || ly === 7) return SKY[5];
      if (lx === ly && lx >= 3 && lx <= 5) return SKY[3];
      return SKY[4];
    }
    const corner = (lx === 0 || lx === 7) && (ly === 0 || ly === 7);
    if (corner && (rx + (lx === 7 ? 1 : 0)) % 2 === 0 && (ry + (ly === 7 ? 1 : 0)) % 2 === 0) return SKY[3];
  }
  if (lx === 0 || ly === 0) return TILE[3];
  const tone = (tx + ty) % 2 === 0 ? 1 : 2;
  if ((ly === 1 && lx <= 3) || (lx === 1 && ly <= 3)) return TILE[tone - 1];
  if (lx === 7 || ly === 7) return TILE[tone + 1];
  return TILE[tone];
}

function carpet(x, y, room) {
  if (!room) return WINE[2];
  const rx = x - room.x * CELL;
  const ry = y - room.y * CELL;
  const rw = room.w * CELL;
  const rh = room.h * CELL;
  const d = Math.min(rx, ry, rw - 1 - rx, rh - 1 - ry);
  if (d <= 1) return WINE[4];
  if (d === 2) return GOLD[3];
  if (d === 3) return GOLD[2];
  if (d === 4) return WINE[4];
  if (d <= 8) {
    const along = d === ry || d === rh - 1 - ry ? rx : ry;
    if (d === 6 && along % 4 === 1) return GOLD[3];
    if ((d === 5 || d === 7) && along % 4 === 3) return WINE[2];
    return WINE[3];
  }
  if (d === 9) return GOLD[3];
  if (d === 10) return WINE[4];
  const u = (rx + ry) % 12;
  const v = (rx - ry + 1200) % 12;
  if (u === 0 && v === 0) return GOLD[2];
  if (u === 0 || v === 0) return WINE[1];
  if (u === 6 && v === 6) return GOLD[3];
  if ((u === 6 && (v === 5 || v === 7)) || (v === 6 && (u === 5 || u === 7))) return WINE[3];
  if (hash(x, y, 31) < 0.05) return WINE[3];
  return WINE[2];
}

function faceColor(style, x, ly) {
  if (style === 'storage') return barnFace(x, ly);
  if (style === 'vip') return vipFace(x, ly);
  if (style === 'toilet') return tileFace(x, ly);
  return hallFace(x, ly);
}

function hallFace(x, ly) {
  if (ly === 0) return SAGE[5];
  if (ly === 1) return SAGE[4];
  if (ly <= 13) {
    const m = x % 8;
    if (m === 0) return SAGE[3];
    if (m === 1) return SAGE[1];
    if (m === 4 && ly % 4 === 1) return SAGE[1];
    if (m === 4 && ly % 4 === 3) return SAGE[3];
    return SAGE[2];
  }
  return wainscot(x, ly);
}

/** Chair rail, recessed wood panels and baseboard shared by the plain wall styles. */
function wainscot(x, ly) {
  if (ly === 14) return TEAK[1];
  if (ly === 15) return TEAK[2];
  if (ly === 16) return TEAK[4];
  if (ly <= 23) {
    const m = x % 16;
    if (m === 0) return TEAK[1];
    if (m === 15) return TEAK[3];
    if (ly === 17 || m === 1) return TEAK[4];
    if (ly === 23 || m === 14) return TEAK[1];
    return TEAK[2];
  }
  if (ly === 24) return TEAK[4];
  if (ly === 25) return TEAK[2];
  return TEAK[5];
}

function barnFace(x, ly) {
  if (ly === 0) return BARN[4];
  if (ly === 1) return BARN[3];
  if (ly === 24) return BARN[2];
  if (ly === 25) return BARN[4];
  if (ly >= 26) return BARN[5];
  const board = Math.floor(x / 7);
  const m = x % 7;
  const tone = hash(board, 0, 51) < 0.5 ? 1 : 2;
  if (m === 0) return BARN[4];
  if (m === 1) return BARN[tone - 1];
  if ((ly === 4 || ly === 20) && m === 4) return BARN[5];
  if (ly === 12) return BARN[tone + 1];
  if (hash(x, ly, 52) < 0.06) return BARN[tone + 1];
  return BARN[tone];
}

function vipFace(x, ly) {
  if (ly === 0) return NAVY[4];
  if (ly === 1) return NAVY[3];
  if (ly <= 14) {
    const m = Math.abs((x % 10) - 5) + Math.abs(((ly + 3) % 8) - 4);
    if (m === 0) return GOLD[3];
    if (m === 2) return NAVY[1];
    if (m === 1) return NAVY[2];
    return NAVY[2];
  }
  if (ly === 15) return GOLD[2];
  if (ly === 16) return GOLD[4];
  if (ly === 17) return TEAK[5];
  if (ly <= 22) {
    const m = x % 16;
    if (m === 0) return TEAK[5];
    if (m === 1) return TEAK[2];
    if (ly === 18) return TEAK[3];
    return TEAK[4];
  }
  if (ly === 23) return TEAK[5];
  if (ly === 24) {
    const k = Math.floor(x / 3) % 3;
    return k === 0 ? RAMPS.pink[1] : k === 1 ? RAMPS.violet[1] : RAMPS.cyan[1];
  }
  if (ly === 25) return TEAK[5];
  return TEAK[6];
}

function tileFace(x, ly) {
  if (ly === 0) return TILE[5];
  if (ly === 1) return TILE[4];
  if (ly >= 24) return ly === 24 ? TILE[3] : TILE[5];
  if (x % 8 === 0 || (ly - 2) % 8 === 0) return TILE[3];
  return (ly - 2) % 8 === 1 ? TILE[0] : TILE[1];
}

function zoneAt(ctx, x, y) {
  if (x < 0 || y < 0 || x >= ctx.width || y >= ctx.height) return TOP;
  return ctx.zone[y * ctx.width + x];
}

function darken(ctx, x, y, steps) {
  const i = (y * ctx.width + x) * 4;
  const color = shiftColor([ctx.buffer.pixels[i], ctx.buffer.pixels[i + 1], ctx.buffer.pixels[i + 2]], steps);
  setPixel(ctx.buffer, x, y, color);
}

/** Walls drop a band of shadow onto the floor below them and a thin one to their right. */
function paintFloorShadows(ctx) {
  for (let y = 0; y < ctx.height; y += 1) {
    for (let x = 0; x < ctx.width; x += 1) {
      if (ctx.zone[y * ctx.width + x] !== FLOOR) continue;
      let up = 0;
      for (let k = 1; k <= 6; k += 1) {
        if (zoneAt(ctx, x, y - k) !== FLOOR) {
          up = k;
          break;
        }
      }
      let left = false;
      for (let k = 1; k <= 2; k += 1) {
        if (zoneAt(ctx, x - k, y) !== FLOOR) left = true;
      }
      let steps = up >= 1 && up <= 4 ? 2 : up ? 1 : 0;
      if (left) steps = Math.min(2, steps + 1);
      if (steps) darken(ctx, x, y, steps);
    }
  }
}

/** Exposed wall ends get a dark edge; faces tucked against a wall top get a soft corner shade. */
function paintFaceEdges(ctx) {
  const edges = [];
  for (let y = 0; y < ctx.height; y += 1) {
    for (let x = 0; x < ctx.width; x += 1) {
      if (ctx.zone[y * ctx.width + x] !== FACE) continue;
      for (const dir of [-1, 1]) {
        const side = zoneAt(ctx, x + dir, y);
        if (side === FLOOR) edges.push([x, y, 'end', dir]);
        else if (side === TOP) edges.push([x, y, 'corner', dir]);
      }
    }
  }
  for (const [x, y, kind, dir] of edges) {
    if (kind === 'end') {
      setPixel(ctx.buffer, x, y, TEAK[5]);
      if (zoneAt(ctx, x - dir, y) === FACE) darken(ctx, x - dir, y, 1);
    } else {
      darken(ctx, x, y, 1);
    }
  }
}

/** Wall tops: dark void framed by a wooden trim wherever they meet a face or a floor. */
function paintTops(ctx) {
  const { width, height, zone } = ctx;
  const dist = new Uint8Array(width * height);
  for (let i = 0; i < dist.length; i += 1) dist[i] = zone[i] === TOP ? 255 : 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (!dist[i]) continue;
      let m = dist[i];
      if (x > 0) m = Math.min(m, dist[i - 1] + 1);
      if (y > 0) {
        m = Math.min(m, dist[i - width] + 1);
        if (x > 0) m = Math.min(m, dist[i - width - 1] + 1);
        if (x < width - 1) m = Math.min(m, dist[i - width + 1] + 1);
      }
      dist[i] = m;
    }
  }
  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = width - 1; x >= 0; x -= 1) {
      const i = y * width + x;
      if (!dist[i]) continue;
      let m = dist[i];
      if (x < width - 1) m = Math.min(m, dist[i + 1] + 1);
      if (y < height - 1) {
        m = Math.min(m, dist[i + width] + 1);
        if (x < width - 1) m = Math.min(m, dist[i + width + 1] + 1);
        if (x > 0) m = Math.min(m, dist[i + width - 1] + 1);
      }
      dist[i] = m;
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const d = dist[y * width + x];
      if (!d) continue;
      setPixel(ctx.buffer, x, y, TRIM[d] ?? C.ink);
    }
  }
}
