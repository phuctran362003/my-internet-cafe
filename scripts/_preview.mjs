import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { paintRoom } from '../src/assets/roomPainter.js';
import { scaleNearest } from '../src/assets/pixelBuffer.js';
import { encodePng } from './png.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const map = JSON.parse(readFileSync(join(root, 'src/data/maps/cafe.json'), 'utf8'));
const out = process.argv[2] || join(root, '.preview');
mkdirSync(out, { recursive: true });
const t0 = Date.now();
const room = paintRoom(map);
console.log('paint ms', Date.now() - t0);
writeFileSync(join(out, 'room-1x.png'), encodePng(room));
writeFileSync(join(out, 'room-2x.png'), encodePng(scaleNearest(room, 2)));
const crop = (buf, x, y, w, h, s) => {
  const c = { width: w, height: h, pixels: new Uint8ClampedArray(w * h * 4) };
  for (let yy = 0; yy < h; yy += 1) {
    for (let xx = 0; xx < w; xx += 1) {
      const si = ((y + yy) * buf.width + (x + xx)) * 4;
      const di = (yy * w + xx) * 4;
      for (let k = 0; k < 4; k += 1) c.pixels[di + k] = buf.pixels[si + k];
    }
  }
  return scaleNearest(c, s);
};
const zones = { tl: [0, 0, 352, 192], bl: [0, 288, 256, 224], vip: [384, 192, 320, 320] };
for (const [name, [x, y, w, h]] of Object.entries(zones)) {
  writeFileSync(join(out, `zoom-${name}.png`), encodePng(crop(room, x, y, w, h, 3)));
}
console.log('written to', out);
