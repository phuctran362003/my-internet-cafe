import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AssetRegistry } from '../src/assets/AssetRegistry.js';
import { generateAllAssets } from '../src/assets/generatePlaceholders.js';
import { encodePng } from './png.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const map = JSON.parse(readFileSync(join(root, 'src/data/maps/cafe.json'), 'utf8'));
const assets = generateAllAssets({ map });

for (const [key, image] of Object.entries(assets.textures)) {
  const rel = AssetRegistry.textures[key].file;
  const out = join(root, 'public', rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, encodePng(image));
  console.log(`${rel} ${image.width}x${image.height}`);
}
