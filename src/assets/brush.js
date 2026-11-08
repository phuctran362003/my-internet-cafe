import { PALETTE, outlineFor, shiftColor } from './palette.js';
import { alphaAt, blank, setPixel } from './pixelBuffer.js';

/** Palette colors by name as [r, g, b]. */
export const C = Object.fromEntries(Object.entries(PALETTE).map(([name, color]) => [name, color.rgb]));

/** Sprite shadows are ink at this alpha; Phaser blends them over any floor. */
export const SHADOW_ALPHA = 78;

export function hash(x, y = 0, seed = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function px(buffer, x, y, color) {
  setPixel(buffer, x, y, color);
}

export function rect(buffer, x, y, w, h, color) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) setPixel(buffer, xx, yy, color);
  }
}

export function hline(buffer, x, y, w, color) {
  rect(buffer, x, y, w, 1, color);
}

export function vline(buffer, x, y, h, color) {
  rect(buffer, x, y, 1, h, color);
}

/** Rectangle with the four corner pixels left out. */
export function roundRect(buffer, x, y, w, h, color) {
  rect(buffer, x + 1, y, w - 2, h, color);
  rect(buffer, x, y + 1, 1, h - 2, color);
  rect(buffer, x + w - 1, y + 1, 1, h - 2, color);
}

/** Light top and left edge, dark bottom and right edge. */
export function bevel(buffer, x, y, w, h, fill, light, dark) {
  rect(buffer, x, y, w, h, fill);
  hline(buffer, x, y, w, light);
  vline(buffer, x, y, h, light);
  hline(buffer, x, y + h - 1, w, dark);
  vline(buffer, x + w - 1, y, h, dark);
}

export function ellipse(buffer, cx, cy, rx, ry, color) {
  const rrx = rx * rx || 1;
  const rry = ry * ry || 1;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if ((dx * dx) / rrx + (dy * dy) / rry <= 1) setPixel(buffer, x, y, color);
    }
  }
}

export function line(buffer, x0, y0, x1, y1, color) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i += 1) {
    setPixel(buffer, Math.round(x0 + ((x1 - x0) * i) / steps), Math.round(y0 + ((y1 - y0) * i) / steps), color);
  }
}

/** Soft ink shadow on empty pixels only, so later paint sits on top of it. */
export function shadowRect(buffer, x, y, w, h, alpha = SHADOW_ALPHA) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      if (alphaAt(buffer, xx, yy) === 0) setPixel(buffer, xx, yy, C.ink, alpha);
    }
  }
}

export function shadowEllipse(buffer, cx, cy, rx, ry, alpha = SHADOW_ALPHA) {
  const rrx = rx * rx || 1;
  const rry = ry * ry || 1;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if ((dx * dx) / rrx + (dy * dy) / rry <= 1 && alphaAt(buffer, x, y) === 0) {
        setPixel(buffer, x, y, C.ink, alpha);
      }
    }
  }
}

/** Moves opaque pixels along their ramp: positive darkens, negative lightens. */
export function shadeRect(buffer, x, y, w, h, steps) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      if (alphaAt(buffer, xx, yy) !== 255) continue;
      const i = (yy * buffer.width + xx) * 4;
      const color = shiftColor([buffer.pixels[i], buffer.pixels[i + 1], buffer.pixels[i + 2]], steps);
      setPixel(buffer, xx, yy, color);
    }
  }
}

/**
 * One-pixel outline around opaque pixels. Each outline pixel takes the
 * darkest step of the ramp it touches, so wood gets a brown edge and
 * leaves a green one. `fixed` forces one color.
 */
export function outline(buffer, fixed = null) {
  const { width, height } = buffer;
  const src = buffer.pixels.slice();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (src[i + 3] === 255) continue;
      let pick = null;
      let pickLum = Infinity;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const j = (ny * width + nx) * 4;
        if (src[j + 3] !== 255) continue;
        const edge = fixed ?? outlineFor([src[j], src[j + 1], src[j + 2]]);
        const lum = edge[0] * 0.3 + edge[1] * 0.59 + edge[2] * 0.11;
        if (lum < pickLum) {
          pick = edge;
          pickLum = lum;
        }
      }
      if (pick) setPixel(buffer, x, y, pick);
    }
  }
  return buffer;
}

/**
 * Paints a sprite onto an opaque background. Opaque pixels are copied;
 * shadow pixels darken the background one or two ramp steps so the
 * result stays inside the palette.
 */
export function composite(dest, src, dx, dy) {
  for (let y = 0; y < src.height; y += 1) {
    for (let x = 0; x < src.width; x += 1) {
      const si = (y * src.width + x) * 4;
      const a = src.pixels[si + 3];
      if (a === 0) continue;
      const tx = dx + x;
      const ty = dy + y;
      if (tx < 0 || ty < 0 || tx >= dest.width || ty >= dest.height) continue;
      const di = (ty * dest.width + tx) * 4;
      if (a === 255) {
        dest.pixels[di] = src.pixels[si];
        dest.pixels[di + 1] = src.pixels[si + 1];
        dest.pixels[di + 2] = src.pixels[si + 2];
        dest.pixels[di + 3] = 255;
        continue;
      }
      const under = [dest.pixels[di], dest.pixels[di + 1], dest.pixels[di + 2]];
      const color = shiftColor(under, a >= 128 ? 2 : 1);
      dest.pixels[di] = color[0];
      dest.pixels[di + 1] = color[1];
      dest.pixels[di + 2] = color[2];
    }
  }
}

export function canvas(width, height) {
  return blank(width, height);
}

const GLYPHS = {
  A: ['010', '101', '111', '101', '101'],
  C: ['011', '100', '100', '100', '011'],
  E: ['111', '100', '110', '100', '111'],
  G: ['011', '100', '101', '101', '011'],
  H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
  K: ['101', '110', '100', '110', '101'],
  N: ['101', '111', '111', '111', '101'],
  O: ['010', '101', '101', '101', '010'],
  P: ['110', '101', '110', '100', '100'],
  S: ['011', '100', '010', '001', '110'],
  T: ['111', '010', '010', '010', '010'],
  V: ['101', '101', '101', '101', '010'],
  W: ['101', '101', '111', '111', '101'],
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['110', '001', '010', '100', '111'],
  3: ['110', '001', '010', '001', '110'],
  5: ['111', '100', '110', '001', '110'],
  7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'],
  k: ['100', '101', '110', '110', '101'],
  '/': ['001', '001', '010', '100', '100'],
  ':': ['000', '010', '000', '010', '000'],
  '-': ['000', '000', '111', '000', '000'],
  ' ': ['000', '000', '000', '000', '000']
};

/** 3x5 pixel text. Returns the drawn width. */
export function text(buffer, x, y, value, color) {
  let cursor = x;
  for (const ch of value) {
    const glyph = GLYPHS[ch] ?? GLYPHS[' '];
    glyph.forEach((row, gy) => {
      for (let gx = 0; gx < row.length; gx += 1) {
        if (row[gx] === '1') setPixel(buffer, cursor + gx, y + gy, color);
      }
    });
    cursor += 4;
  }
  return cursor - x - 1;
}

export function textWidth(value) {
  return value.length * 4 - 1;
}
