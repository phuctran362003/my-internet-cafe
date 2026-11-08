import { PALETTE, STYLE_ID } from './palette.js';
import {
  CHAR_COLUMNS,
  CHARACTER_VARIANTS,
  COMPUTER_STATES,
  COMPUTER_TIERS,
  DISPLAY_SCALE,
  EFFECT_FRAMES,
  FURNITURE_FRAMES,
  ITEM_FRAMES,
  PORTRAIT_IDS,
  SCREEN_BY_TIER,
  TILE_ORDER,
  TILE_SIZE
} from './layout.js';
import { composeSheet, mirror, scaleNearest } from './pixelBuffer.js';
import {
  drawChair,
  drawCharacterFrame,
  drawComputer,
  drawCounter,
  drawCounterProp,
  drawDoor,
  drawEffect,
  drawFloor,
  drawItem,
  drawPlant,
  drawPortrait,
  drawRug,
  drawStorage,
  drawToilet,
  drawWall,
  drawWindow
} from './drawables.js';

const TILE_DRAW = {
  floor: () => drawFloor('base'),
  floorAlt: () => drawFloor('alt'),
  wall: () => drawWall(),
  door: () => drawDoor(false),
  doorClosed: () => drawDoor(true),
  window: () => drawWindow(),
  counter: () => drawCounter(),
  storage: () => drawStorage(),
  toilet: () => drawToilet(),
  rug: () => drawRug()
};

function sheet(frames, columns) {
  const scaled = frames.map((frame) => scaleNearest(frame, DISPLAY_SCALE));
  const image = composeSheet(scaled, columns);
  image.frameWidth = TILE_SIZE;
  image.frameHeight = TILE_SIZE;
  image.columns = columns;
  return image;
}

function characterFrames(variant) {
  const downIdle = drawCharacterFrame('downIdle', variant);
  const downWalk = drawCharacterFrame('downWalk', variant);
  const upIdle = drawCharacterFrame('upIdle', variant);
  const upWalk = drawCharacterFrame('upWalk', variant);
  const sit = drawCharacterFrame('sit', variant);
  const leftIdle = mirror(downIdle);
  const leftWalk = mirror(downWalk);
  const rightIdle = mirror(leftIdle);
  const rightWalk = mirror(leftWalk);
  return [downIdle, downWalk, leftIdle, leftWalk, rightIdle, rightWalk, upIdle, upWalk, sit];
}

export function generateAllAssets() {
  const tiles = sheet(TILE_ORDER.map((name) => TILE_DRAW[name]()), TILE_ORDER.length);
  const characters = sheet(
    CHARACTER_VARIANTS.flatMap((variant) => characterFrames(variant)),
    CHAR_COLUMNS.length
  );
  const computers = sheet(
    COMPUTER_TIERS.flatMap((tier) => COMPUTER_STATES.map((state) => drawComputer(SCREEN_BY_TIER[tier], state))),
    COMPUTER_STATES.length
  );
  const furniture = sheet(
    [
      drawChair('shirtRed', 'rug'),
      drawPlant(),
      drawCounterProp(),
      drawChair('white', 'shirtGray'),
      drawChair('pantsNavy', 'panel'),
      drawChair('shirtGray', 'bezel')
    ],
    FURNITURE_FRAMES.length
  );
  const items = sheet(ITEM_FRAMES.map((kind) => drawItem(kind)), ITEM_FRAMES.length);
  const effects = sheet(EFFECT_FRAMES.map((kind) => drawEffect(kind)), EFFECT_FRAMES.length);
  const portraits = sheet(PORTRAIT_IDS.map((id) => drawPortrait(id)), PORTRAIT_IDS.length);

  return {
    styleId: STYLE_ID,
    placeholder: true,
    textures: {
      'tileset-cafe': tiles,
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
