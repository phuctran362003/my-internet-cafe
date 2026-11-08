/** Shared frame layout. Gameplay only uses these indexes. */

export const DESIGN_PIXEL = 32;
export const DISPLAY_SCALE = 2;
export const TILE_SIZE = 64;

export const DOOR_FRAMES = [
  'entranceOpenH',
  'entranceClosedH',
  'entranceOpenV',
  'entranceClosedV',
  'doorOpenH',
  'doorLockedH',
  'doorOpenV',
  'doorLockedV',
  'ropeOpenH',
  'ropeLockedH',
  'ropeOpenV',
  'ropeLockedV'
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

/**
 * One spritesheet row per look. `kind` maps to gameplay archetype / staff role
 * accessories; `style` changes hair silhouette so guests do not all share one cut.
 */
export const CHARACTER_VARIANTS = [
  { id: 'student', kind: 'student', hair: 'hairBlack', shirt: 'shirtBlue', pants: 'pantsNavy', style: 'short' },
  { id: 'studentSoft', kind: 'student', hair: 'hairBrown', shirt: 'shirtGreen', pants: 'pantsNavy', style: 'bob' },
  { id: 'studentBright', kind: 'student', hair: 'hairBlond', shirt: 'shirtRed', pants: 'pantsBrown', style: 'ponytail' },
  { id: 'studentCool', kind: 'student', hair: 'hairBlack', shirt: 'shirtPurple', pants: 'pantsNavy', style: 'fringe' },
  { id: 'gamer', kind: 'gamer', hair: 'hairPink', shirt: 'shirtPurple', pants: 'pantsNavy', style: 'messy' },
  { id: 'gamerNeon', kind: 'gamer', hair: 'hairBlack', shirt: 'shirtBlue', pants: 'pantsNavy', style: 'undercut' },
  { id: 'gamerAce', kind: 'gamer', hair: 'hairBlond', shirt: 'shirtGreen', pants: 'pantsBrown', style: 'short' },
  { id: 'gamerVivid', kind: 'gamer', hair: 'hairPink', shirt: 'shirtRed', pants: 'pantsNavy', style: 'spikes' },
  { id: 'office', kind: 'office', hair: 'hairBrown', shirt: 'shirtGray', pants: 'pantsBrown', style: 'side' },
  { id: 'officeSharp', kind: 'office', hair: 'hairBlack', shirt: 'shirtBlue', pants: 'pantsNavy', style: 'short' },
  { id: 'officeLate', kind: 'office', hair: 'hairBrown', shirt: 'shirtPurple', pants: 'pantsNavy', style: 'bun' },
  { id: 'regular', kind: 'regular', hair: 'hairBlack', shirt: 'shirtGreen', pants: 'pantsNavy', style: 'short' },
  { id: 'regularWarm', kind: 'regular', hair: 'hairBrown', shirt: 'shirtGold', pants: 'pantsBrown', style: 'bob' },
  { id: 'regularCalm', kind: 'regular', hair: 'hairBlack', shirt: 'shirtGray', pants: 'pantsNavy', style: 'side' },
  { id: 'troublemaker', kind: 'troublemaker', hair: 'hairBlond', shirt: 'shirtRed', pants: 'pantsBrown', style: 'spikes' },
  { id: 'troublemakerWild', kind: 'troublemaker', hair: 'hairPink', shirt: 'shirtPurple', pants: 'pantsNavy', style: 'messy' },
  { id: 'wealthy', kind: 'wealthy', hair: 'hairBlond', shirt: 'shirtGold', pants: 'pantsNavy', style: 'slick' },
  { id: 'wealthyChic', kind: 'wealthy', hair: 'hairBlack', shirt: 'shirtPurple', pants: 'pantsNavy', style: 'bob' },
  { id: 'guard', kind: 'guard', hair: 'hairBlack', shirt: 'shirtGray', pants: 'pantsNavy', style: 'short' }
];

/** Looks available for a customer archetype or staff role. */
export function looksForKind(kind) {
  return CHARACTER_VARIANTS.filter((variant) => variant.kind === kind).map((variant) => variant.id);
}

export const COMPUTER_TIERS = ['basic', 'standard', 'gaming', 'highend', 'premium'];
export const COMPUTER_STATES = ['available', 'occupied', 'broken', 'maintenance'];

export const FURNITURE_FRAMES = ['chair', 'plant', 'counterProp', 'chairWhite', 'chairNavy', 'chairGray', 'lamp'];
export const ITEM_FRAMES = ['drink', 'noodle', 'medicine', 'foodPack'];
export const EFFECT_FRAMES = ['alert', 'coin', 'meal', 'lock'];
export const PORTRAIT_IDS = ['player', 'wife', 'child'];

export function frameIndex(row, column, columns) {
  return row * columns + column;
}
