import { describe, expect, it } from 'vitest';
import { generateAllAssets } from '../src/assets/generatePlaceholders.js';
import { paletteRgbSet, STYLE_ID } from '../src/assets/palette.js';
import { AssetRegistry, placeholderTextures } from '../src/assets/AssetRegistry.js';
import { CHAR_COLUMNS, CHARACTER_VARIANTS, TILE_SIZE } from '../src/assets/layout.js';
import { usedColorKeys } from '../src/assets/pixelBuffer.js';

describe('asset pipeline', () => {
  it('builds one style, shared frames, and palette-only pixels', () => {
    const assets = generateAllAssets();
    expect(assets.styleId).toBe(STYLE_ID);
    expect(assets.placeholder).toBe(true);
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
    expect(placeholderTextures().length).toBe(Object.keys(AssetRegistry.textures).length);
  });
});
