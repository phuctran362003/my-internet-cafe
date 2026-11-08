import {
  CHAR_COLUMNS,
  CHARACTER_VARIANTS,
  COMPUTER_STATES,
  COMPUTER_TIERS,
  EFFECT_FRAMES,
  FURNITURE_FRAMES,
  ITEM_FRAMES,
  PORTRAIT_IDS,
  TILE_ORDER,
  TILE_SIZE
} from './layout.js';
import { STYLE_ID } from './palette.js';

/**
 * Central asset registry.
 * mode `placeholder` draws the shared procedural set.
 * Switch an entry to `file` and add the PNG under public/ when final art exists.
 * Frame layout must stay identical so gameplay code does not change.
 */
export const AssetRegistry = {
  styleId: STYLE_ID,
  tileSize: TILE_SIZE,
  groups: ['characters', 'computers', 'furniture', 'environment', 'items', 'ui', 'effects'],
  textures: {
    'tileset-cafe': {
      group: 'environment',
      kind: 'spritesheet',
      mode: 'placeholder',
      file: 'assets/tilesets/cafe.png',
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
      frames: TILE_ORDER
    },
    characters: {
      group: 'characters',
      kind: 'spritesheet',
      mode: 'placeholder',
      file: 'assets/characters/customers.png',
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
      rows: CHARACTER_VARIANTS.map((v) => v.id),
      columns: CHAR_COLUMNS
    },
    computers: {
      group: 'computers',
      kind: 'spritesheet',
      mode: 'placeholder',
      file: 'assets/computers/computers.png',
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
      rows: COMPUTER_TIERS,
      columns: COMPUTER_STATES
    },
    furniture: {
      group: 'furniture',
      kind: 'spritesheet',
      mode: 'placeholder',
      file: 'assets/furniture/furniture.png',
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
      frames: FURNITURE_FRAMES
    },
    items: {
      group: 'items',
      kind: 'spritesheet',
      mode: 'placeholder',
      file: 'assets/items/items.png',
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
      frames: ITEM_FRAMES
    },
    effects: {
      group: 'effects',
      kind: 'spritesheet',
      mode: 'placeholder',
      file: 'assets/effects/effects.png',
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
      frames: EFFECT_FRAMES
    },
    portraits: {
      group: 'ui',
      kind: 'spritesheet',
      mode: 'placeholder',
      file: 'assets/ui/portraits.png',
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
      frames: PORTRAIT_IDS
    }
  }
};

export function placeholderTextures() {
  return Object.entries(AssetRegistry.textures)
    .filter(([, asset]) => asset.mode === 'placeholder')
    .map(([key, asset]) => ({ key, ...asset }));
}

export function fileTextures() {
  return Object.entries(AssetRegistry.textures)
    .filter(([, asset]) => asset.mode === 'file')
    .map(([key, asset]) => ({ key, ...asset }));
}
