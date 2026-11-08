import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { paintRoom } from '../src/assets/roomPainter.js';
import { blank, scaleNearest } from '../src/assets/pixelBuffer.js';
import { composite } from '../src/assets/brush.js';
import { encodePng } from './png.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const map = JSON.parse(readFileSync(join(root, 'src/data/maps/cafe.json'), 'utf8'));
const out = process.argv[2];
const which = process.argv.slice(3);
mkdirSync(out, { recursive: true });
const room = paintRoom(map);

function cellOf(x, y) {
  const c = blank(32, 32);
  for (let yy = 0; yy < 32; yy += 1) {
    for (let xx = 0; xx < 32; xx += 1) {
      const si = ((y * 32 + yy) * room.width + (x * 32 + xx)) * 4;
      const di = (yy * 32 + xx) * 4;
      for (let k = 0; k < 4; k += 1) c.pixels[di + k] = room.pixels[si + k];
    }
  }
  return c;
}

/** Lays frames out on floor cells (and a cell above when `tall`) and writes one PNG. */
function board(name, frames, columns, { floor = [10, 5], tall = false, scale = 4, above = null } = {}) {
  const rows = Math.ceil(frames.length / columns);
  const ch = tall ? 64 : 32;
  const img = blank(columns * 32, rows * ch);
  frames.forEach((frame, i) => {
    const x = (i % columns) * 32;
    const y = Math.floor(i / columns) * ch;
    composite(img, cellOf(...floor), x, y + (tall ? 32 : 0));
    if (tall) composite(img, cellOf(...floor), x, y);
    if (above) composite(img, above(i), x, y);
    composite(img, frame, x, y + (tall ? 32 : 0));
  });
  writeFileSync(join(out, `${name}.png`), encodePng(scaleNearest(img, scale)));
}

const mods = {
  characters: async () => {
    const { paintCharacterFrames } = await import('../src/assets/characters.js');
    const { CHARACTER_VARIANTS } = await import('../src/assets/layout.js');
    board('characters', CHARACTER_VARIANTS.flatMap((v) => paintCharacterFrames(v)), 9);
  },
  computers: async () => {
    const { paintComputerFrames, paintFurnitureFrames } = await import('../src/assets/sprites.js');
    const { paintCharacterFrames } = await import('../src/assets/characters.js');
    const { CHARACTER_VARIANTS } = await import('../src/assets/layout.js');
    const pcs = paintComputerFrames();
    const chairs = paintFurnitureFrames();
    const chairOrder = [0, 3, 4, 5];
    const img = blank(4 * 32, 5 * 64);
    pcs.forEach((pc, i) => {
      const x = (i % 4) * 32;
      const y = Math.floor(i / 4) * 64;
      composite(img, cellOf(10, 5), x, y);
      composite(img, cellOf(10, 6), x, y + 32);
      composite(img, pc, x, y);
      if (i % 4 === 1) composite(img, paintCharacterFrames(CHARACTER_VARIANTS[Math.floor(i / 4)])[8], x, y + 32);
      composite(img, chairs[chairOrder[Math.floor(i / 4) % 4]], x, y + 32);
    });
    writeFileSync(join(out, 'computers.png'), encodePng(scaleNearest(img, 4)));
  },
  furniture: async () => {
    const { paintFurnitureFrames } = await import('../src/assets/sprites.js');
    board('furniture', paintFurnitureFrames(), 7);
  },
  effects: async () => {
    const { paintEffectFrames, paintItemFrames, paintPortraitFrames } = await import('../src/assets/sprites.js');
    board('effects', [...paintEffectFrames(), ...paintItemFrames()], 4);
    board('portraits', paintPortraitFrames(), 3, { floor: [20, 12] });
  },
  doors: async () => {
    const { paintDoorFrames } = await import('../src/assets/doorPainter.js');
    board('doors', paintDoorFrames(), 4);
  }
};

for (const name of which) await mods[name]();
console.log('written', which.join(', '), 'to', out);
