import {
  CHAR_COLUMNS,
  CHARACTER_VARIANTS,
  COMPUTER_ROWS,
  COMPUTER_STATES,
  DOOR_FRAMES,
  EFFECT_FRAMES,
  FURNITURE_FRAMES,
  ITEM_FRAMES,
  PORTRAIT_IDS,
  TILE_SIZE
} from './layout.js';
import { STYLE_ID } from './palette.js';

/**
 * Central asset registry.
 * mode `file` loads the shipped PNG under public/.
 * `npm run art` exports those files from the cafe-pixel-v2 painters.
 * Frame layout must stay identical so gameplay code does not change.
 * `room-cafe` is the whole map painted as one image, so it has no frames.
 */
export const AssetRegistry = {
  styleId: STYLE_ID,
  tileSize: TILE_SIZE,
  groups: ['characters', 'computers', 'furniture', 'environment', 'items', 'ui', 'effects'],
  textures: {
    'room-cafe': {
      group: 'environment',
      kind: 'image',
      mode: 'file',
      file: 'assets/tilesets/cafe-room.png'
    },
    doors: {
      group: 'environment',
      kind: 'spritesheet',
      mode: 'file',
      file: 'assets/tilesets/doors.png',
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
      frames: DOOR_FRAMES
    },
    characters: {
      group: 'characters',
      kind: 'spritesheet',
      mode: 'file',
      file: 'assets/characters/customers.png',
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
      rows: CHARACTER_VARIANTS.map((v) => v.id),
      columns: CHAR_COLUMNS
    },
    computers: {
      group: 'computers',
      kind: 'spritesheet',
      mode: 'file',
      file: 'assets/computers/computers.png',
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
      rows: COMPUTER_ROWS,
      columns: COMPUTER_STATES
    },
    furniture: {
      group: 'furniture',
      kind: 'spritesheet',
      mode: 'file',
      file: 'assets/furniture/furniture.png',
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
      frames: FURNITURE_FRAMES
    },
    items: {
      group: 'items',
      kind: 'spritesheet',
      mode: 'file',
      file: 'assets/items/items.png',
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
      frames: ITEM_FRAMES
    },
    effects: {
      group: 'effects',
      kind: 'spritesheet',
      mode: 'file',
      file: 'assets/effects/effects.png',
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
      frames: EFFECT_FRAMES
    },
    portraits: {
      group: 'ui',
      kind: 'spritesheet',
      mode: 'file',
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
