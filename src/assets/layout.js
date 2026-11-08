/** Shared frame layout. Gameplay only uses these indexes. */

export const DESIGN_PIXEL = 64;
export const DISPLAY_SCALE = 1;
export const TILE_SIZE = 64;

export const TILE_ORDER = [
  'floor',
  'floorAlt',
  'wall',
  'door',
  'doorClosed',
  'window',
  'counter',
  'storage',
  'toilet',
  'rug',
  'vip',
  'gate'
];

export const CHAR_COLUMNS = [
  'downIdle',
  'downWalk',
  'leftIdle',
  'leftWalk',
  'rightIdle',
  'rightWalk',
  'upIdle',
  'upWalk',
  'sit'
];

export const CHARACTER_VARIANTS = [
  { id: 'student', hair: 'hairBlack', shirt: 'shirtBlue', pants: 'pantsNavy' },
  { id: 'gamer', hair: 'hairPink', shirt: 'shirtPurple', pants: 'pantsNavy' },
  { id: 'office', hair: 'hairBrown', shirt: 'shirtGray', pants: 'pantsBrown' },
  { id: 'regular', hair: 'hairBlack', shirt: 'shirtGreen', pants: 'pantsNavy' },
  { id: 'troublemaker', hair: 'hairBlond', shirt: 'shirtRed', pants: 'pantsBrown' },
  { id: 'wealthy', hair: 'hairBlond', shirt: 'shirtGold', pants: 'pantsNavy' },
  { id: 'guard', hair: 'hairBlack', shirt: 'shirtGray', pants: 'pantsNavy' }
];

export const COMPUTER_TIERS = ['basic', 'standard', 'gaming', 'highend', 'premium'];
export const COMPUTER_STATES = ['available', 'occupied', 'broken', 'maintenance'];

export const SCREEN_BY_TIER = {
  basic: 'screenBasic',
  standard: 'screenStandard',
  gaming: 'screenGaming',
  highend: 'screenHigh',
  premium: 'screenPremium'
};

export const FURNITURE_FRAMES = ['chair', 'plant', 'counterProp', 'chairWhite', 'chairNavy', 'chairGray', 'lamp'];
export const ITEM_FRAMES = ['drink', 'noodle', 'medicine', 'foodPack'];
export const EFFECT_FRAMES = ['alert', 'coin', 'meal', 'lock'];
export const PORTRAIT_IDS = ['player', 'wife', 'child'];

export function frameIndex(row, column, columns) {
  return row * columns + column;
}
