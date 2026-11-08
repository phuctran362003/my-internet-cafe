import { PALETTE, STYLE_ID } from './palette.js';
import {
  CHAR_COLUMNS,
  CHARACTER_VARIANTS,
  COMPUTER_STATES,
  DISPLAY_SCALE,
  DOOR_FRAMES,
  EFFECT_FRAMES,
  FURNITURE_FRAMES,
  ITEM_FRAMES,
  PORTRAIT_IDS,
  TILE_SIZE
} from './layout.js';
import { composeSheet, scaleNearest } from './pixelBuffer.js';
import { paintCharacterFrames } from './characters.js';
import { paintDoorFrames } from './doorPainter.js';
import { paintRoom } from './roomPainter.js';
import {
  paintComputerFrames,
  paintEffectFrames,
  paintFurnitureFrames,
  paintItemFrames,
  paintPortraitFrames
} from './sprites.js';

function sheet(frames, columns) {
  const scaled = frames.map((frame) => scaleNearest(frame, DISPLAY_SCALE));
  const image = composeSheet(scaled, columns);
  image.frameWidth = TILE_SIZE;
  image.frameHeight = TILE_SIZE;
  image.columns = columns;
  return image;
}

/** `map` is required for `room-cafe`, which paints the whole map as one image. */
export function generateAllAssets({ map } = {}) {
  const doors = sheet(paintDoorFrames(), DOOR_FRAMES.length);
  const characters = sheet(CHARACTER_VARIANTS.flatMap((variant) => paintCharacterFrames(variant)), CHAR_COLUMNS.length);
  const computers = sheet(paintComputerFrames(), COMPUTER_STATES.length);
  const furniture = sheet(paintFurnitureFrames(), FURNITURE_FRAMES.length);
  const items = sheet(paintItemFrames(), ITEM_FRAMES.length);
  const effects = sheet(paintEffectFrames(), EFFECT_FRAMES.length);
  const portraits = sheet(paintPortraitFrames(), PORTRAIT_IDS.length);
  const room = map ? { 'room-cafe': scaleNearest(paintRoom(map), DISPLAY_SCALE) } : {};

  return {
    styleId: STYLE_ID,
    placeholder: false,
    final: true,
    textures: {
      ...room,
      doors,
      characters,
      computers,
      furniture,
      items,
      effects,
      portraits
    }
  };
}

export const UI_PALETTE_VARS = {
  '--ink': PALETTE.ink.hex,
  '--paper': PALETTE.paper.hex,
  '--panel': PALETTE.panel.hex,
  '--panel-light': PALETTE.panelLight.hex,
  '--alert': PALETTE.alert.hex,
  '--ok': PALETTE.shirtGreen.hex,
  '--coin': PALETTE.coin.hex,
  '--cold': PALETTE.cold.hex,
  '--hunger': PALETTE.hunger.hex,
  '--heat': PALETTE.heat.hex,
  '--canvas': PALETTE.canvas.hex,
  '--white': PALETTE.white.hex,
  '--screen': PALETTE.screenGaming.hex
};
