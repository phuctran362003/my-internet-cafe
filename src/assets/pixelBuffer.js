export function blank(width, height) {
  return { width, height, pixels: new Uint8ClampedArray(width * height * 4) };
}

export function setPixel(buffer, x, y, rgb, alpha = 255) {
  if (x < 0 || y < 0 || x >= buffer.width || y >= buffer.height) return;
  const i = (y * buffer.width + x) * 4;
  buffer.pixels[i] = rgb[0];
  buffer.pixels[i + 1] = rgb[1];
  buffer.pixels[i + 2] = rgb[2];
  buffer.pixels[i + 3] = alpha;
}

export function getPixel(buffer, x, y) {
  if (x < 0 || y < 0 || x >= buffer.width || y >= buffer.height) return null;
  const i = (y * buffer.width + x) * 4;
  if (buffer.pixels[i + 3] === 0) return null;
  return [buffer.pixels[i], buffer.pixels[i + 1], buffer.pixels[i + 2]];
}

export function alphaAt(buffer, x, y) {
  if (x < 0 || y < 0 || x >= buffer.width || y >= buffer.height) return 0;
  return buffer.pixels[(y * buffer.width + x) * 4 + 3];
}

export function fillRect(buffer, x, y, w, h, rgb) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) setPixel(buffer, xx, yy, rgb);
  }
}

/** Copies every visible source pixel, alpha included. */
export function blit(dest, src, dx, dy) {
  for (let y = 0; y < src.height; y += 1) {
    for (let x = 0; x < src.width; x += 1) {
      const si = (y * src.width + x) * 4;
      if (src.pixels[si + 3] === 0) continue;
      const tx = dx + x;
      const ty = dy + y;
      if (tx < 0 || ty < 0 || tx >= dest.width || ty >= dest.height) continue;
      const di = (ty * dest.width + tx) * 4;
      dest.pixels[di] = src.pixels[si];
      dest.pixels[di + 1] = src.pixels[si + 1];
      dest.pixels[di + 2] = src.pixels[si + 2];
      dest.pixels[di + 3] = src.pixels[si + 3];
    }
  }
}

export function scaleNearest(buffer, factor) {
  if (factor === 1) return buffer;
  const width = buffer.width * factor;
  const height = buffer.height * factor;
  const out = blank(width, height);
  for (let y = 0; y < height; y += 1) {
    const sy = Math.floor(y / factor);
    for (let x = 0; x < width; x += 1) {
      const si = (sy * buffer.width + Math.floor(x / factor)) * 4;
      const di = (y * width + x) * 4;
      out.pixels[di] = buffer.pixels[si];
      out.pixels[di + 1] = buffer.pixels[si + 1];
      out.pixels[di + 2] = buffer.pixels[si + 2];
      out.pixels[di + 3] = buffer.pixels[si + 3];
    }
  }
  return out;
}

export function usedColorKeys(buffer) {
  const colors = new Set();
  for (let i = 0; i < buffer.pixels.length; i += 4) {
    if (buffer.pixels[i + 3] === 0) continue;
    colors.add(`${buffer.pixels[i]},${buffer.pixels[i + 1]},${buffer.pixels[i + 2]}`);
  }
  return colors;
}

export function drawMask(rows, colorMap, outline) {
  const height = rows.length;
  const width = rows[0].length;
  const buffer = blank(width, height);
  for (let y = 0; y < height; y += 1) {
    if (rows[y].length !== width) {
      throw new Error(`Mask row ${y} has length ${rows[y].length}, expected ${width}`);
    }
    for (let x = 0; x < width; x += 1) {
      const ch = rows[y][x];
      if (ch === '.' || ch === ' ') continue;
      const color = colorMap[ch];
      if (!color) throw new Error(`Missing mask color '${ch}'`);
      setPixel(buffer, x, y, color);
    }
  }
  if (outline) applyOutline(buffer, outline);
  return buffer;
}

function applyOutline(buffer, outline) {
  const src = buffer.pixels.slice();
  const { width, height } = buffer;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (src[i + 3] === 255) continue;
      let touch = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (src[(ny * width + nx) * 4 + 3] === 255) touch = true;
      }
      if (touch) setPixel(buffer, x, y, outline);
    }
  }
}

export function composeSheet(frames, columns) {
  const frameWidth = frames[0].width;
  const frameHeight = frames[0].height;
  const rows = Math.ceil(frames.length / columns);
  const sheet = blank(columns * frameWidth, rows * frameHeight);
  frames.forEach((frame, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    blit(sheet, frame, col * frameWidth, row * frameHeight);
  });
  return sheet;
}

export function mirror(buffer) {
  const out = blank(buffer.width, buffer.height);
  for (let y = 0; y < buffer.height; y += 1) {
    for (let x = 0; x < buffer.width; x += 1) {
      const si = (y * buffer.width + x) * 4;
      const di = (y * buffer.width + (buffer.width - 1 - x)) * 4;
      out.pixels[di] = buffer.pixels[si];
      out.pixels[di + 1] = buffer.pixels[si + 1];
      out.pixels[di + 2] = buffer.pixels[si + 2];
      out.pixels[di + 3] = buffer.pixels[si + 3];
    }
  }
  return out;
}
