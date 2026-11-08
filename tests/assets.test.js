import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { generateAllAssets } from '../src/assets/generatePlaceholders.js';
import { paletteRgbSet, STYLE_ID } from '../src/assets/palette.js';
import { AssetRegistry, fileTextures, placeholderTextures } from '../src/assets/AssetRegistry.js';
import { CHAR_COLUMNS, CHARACTER_VARIANTS, TILE_SIZE } from '../src/assets/layout.js';
import { usedColorKeys } from '../src/assets/pixelBuffer.js';
import { encodePng } from '../scripts/png.js';

describe('asset pipeline', () => {
  it('builds one style, shared frames, and palette-only pixels', () => {
    const assets = generateAllAssets();
    expect(assets.styleId).toBe(STYLE_ID);
    expect(assets.final).toBe(true);
    expect(assets.placeholder).toBe(false);
    expect(AssetRegistry.styleId).toBe(STYLE_ID);
    const characters = assets.textures.characters;
    expect(characters.frameWidth).toBe(TILE_SIZE);
    expect(characters.frameHeight).toBe(TILE_SIZE);
    expect(characters.width).toBe(CHAR_COLUMNS.length * TILE_SIZE);
    expect(characters.height).toBe(CHARACTER_VARIANTS.length * TILE_SIZE);
    const allowed = paletteRgbSet();
    for (const image of Object.values(assets.textures)) {
      for (const color of usedColorKeys(image)) expect(allowed.has(color)).toBe(true);
    }
    expect(fileTextures().length).toBe(Object.keys(AssetRegistry.textures).length);
    expect(placeholderTextures().length).toBe(0);
    for (const [key, image] of Object.entries(assets.textures)) {
      const file = readFileSync(`public/${AssetRegistry.textures[key].file}`);
      expect(Buffer.compare(file, encodePng(image))).toBe(0);
    }
  });
});
