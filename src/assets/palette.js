/** Closed palette. Every exported pixel must use these colors. */
const BASE_HEX = {
  ink: '#1b1420',
  paper: '#f3e6c8',
  panel: '#2a3142',
  panelLight: '#3b4458',
  floor: '#d4cfc5',
  floorDark: '#b7b2a8',
  floorLight: '#e7e2d8',
  wall: '#efe6d4',
  wallDark: '#c9b89a',
  wallLight: '#f7f2e6',
  door: '#7a4e2d',
  doorLight: '#a56b3d',
  window: '#9fd7e8',
  windowDark: '#3c6f86',
  counter: '#7a4e2d',
  counterTop: '#f0d2a0',
  storage: '#8d7a58',
  toilet: '#d5ddd8',
  rug: '#8c3d4a',
  skin: '#f0c29a',
  skinShadow: '#d39a72',
  eye: '#1b1420',
  hairBlack: '#241c1a',
  hairBrown: '#6b3a22',
  hairBlond: '#e0b15a',
  hairPink: '#d46a8a',
  shirtBlue: '#3d6fbf',
  shirtGreen: '#3e8f62',
  shirtRed: '#c4503c',
  shirtPurple: '#7a4ea3',
  shirtGold: '#e0a23a',
  shirtGray: '#5e6772',
  pantsNavy: '#243044',
  pantsBrown: '#5a3a28',
  shoeBrown: '#3a2418',
  desk: '#b57a3e',
  deskLight: '#e0b56a',
  bezel: '#232833',
  screenOff: '#1e3a4c',
  screenBasic: '#2f8f78',
  screenStandard: '#3d9ed6',
  screenGaming: '#7ee0c8',
  screenHigh: '#68b7ff',
  screenPremium: '#e6c15a',
  screenBroken: '#c4503c',
  leaf: '#3e8f62',
  leafDark: '#246043',
  pot: '#8c3d4a',
  drink: '#3d6fbf',
  noodle: '#e0a23a',
  medicine: '#f7f3ea',
  medicineMark: '#c4503c',
  foodPack: '#c4503c',
  coin: '#e0a23a',
  alert: '#e0564a',
  white: '#f7f3ea',
  canvas: '#141820',
  night: '#0b1020',
  heat: '#e07a3d',
  cold: '#7eb6d6',
  hunger: '#d0a04a'
};

/**
 * Material ramps, light to dark. Painters shade by stepping along a ramp,
 * so a ramp must not share a color with another ramp.
 */
export const RAMP_HEX = {
  oak: ['#f7d9a4', '#ecbf80', '#dea96a', '#cc9257', '#b67a47', '#976039', '#79482d', '#5c3523'],
  teak: ['#e3a878', '#c88656', '#aa6a40', '#8b5130', '#6c3c25', '#4f2a1b', '#361b13'],
  sage: ['#d6e8bc', '#bdd8a2', '#a4c58b', '#8aae76', '#709364', '#567652'],
  barn: ['#c9ab88', '#ae8f6e', '#937556', '#795d44', '#5f4836', '#46362b'],
  conc: ['#d8d1c4', '#c3baab', '#aca394', '#938a7d', '#797266', '#5f5951', '#48433e'],
  tile: ['#fdffff', '#eaf4f5', '#d5e7ea', '#bcd3d8', '#9db8c0', '#7d99a3', '#5f7a86'],
  wine: ['#dc7286', '#bd5268', '#9e4057', '#803147', '#632438', '#48192a', '#33111e'],
  gold: ['#fff6c4', '#f8dc7a', '#e6b652', '#c08d38', '#926428', '#66431c'],
  navy: ['#6377aa', '#4c5e91', '#3b4a77', '#2d395e', '#212a47', '#171d33'],
  steel: ['#f2f5f8', '#d3d9e0', '#adb5bf', '#868f9a', '#636b77', '#454c57', '#2e333d', '#1f232b'],
  cream: ['#fffdf6', '#f3ecdc', '#ddd3bd', '#bfb39b', '#968a74', '#6e6453'],
  beige: ['#efe3c4', '#dccca6', '#c3b088', '#a1906c', '#7a6c52'],
  leafy: ['#c4e88a', '#92cc62', '#67ac4e', '#488c42', '#326a37', '#214a2a', '#15321d'],
  terra: ['#f2ab84', '#da8761', '#ba6847', '#934d36', '#693629', '#47241d'],
  red: ['#ff9b84', '#ee6a52', '#cf4a3b', '#a43532', '#772628', '#4f1a1e'],
  sky: ['#f0fcff', '#c6f0fb', '#9adcf0', '#6cbcdc', '#4892bb', '#2f6a93', '#224c6e'],
  box: ['#f3d6a2', '#e2bb84', '#ca9f68', '#a97f50', '#84603c', '#5e432b'],
  chalk: ['#5e8a68', '#4a7055', '#385843', '#284033'],
  pink: ['#ffe3f4', '#ff8fd2', '#e05aae', '#9e3a7c', '#5e2450'],
  cyan: ['#e6fdff', '#8ff6ff', '#45c8e0', '#2a8aa6', '#1b566a'],
  lime: ['#e4ffb0', '#9df05a', '#5cc23a', '#3a8a2c'],
  violet: ['#d9c2ff', '#a884f0', '#7a5ad0', '#54409a', '#382a6a'],
  skinR: ['#ffe2c4', '#f0c29a', '#d39a72', '#a9714f', '#7a4b35'],
  hairK: ['#57463f', '#241c1a', '#120d0e'],
  hairN: ['#9a5a34', '#6b3a22', '#4a2616', '#2e170d'],
  hairY: ['#f8dc90', '#e0b15a', '#b8853a', '#8a5f28'],
  hairP: ['#f4a2bc', '#d46a8a', '#a84a6a', '#7a3450'],
  shirtB: ['#76a4e8', '#3d6fbf', '#2c5096', '#1f3a6e'],
  shirtG: ['#74c890', '#3e8f62', '#2c6a49', '#1e4a34'],
  shirtR: ['#ee8a72', '#c4503c', '#9a3a2e', '#6e2822'],
  shirtP: ['#ae86d2', '#7a4ea3', '#5a387c', '#3e2656'],
  shirtY: ['#f8d078', '#e0a23a', '#b67c28', '#86581c'],
  shirtA: ['#909aa6', '#5e6772', '#454d57', '#30363e'],
  pantsN: ['#40527a', '#243044', '#161e2c'],
  pantsW: ['#80583f', '#5a3a28', '#3c2619'],
  shoe: ['#62402c', '#3a2418', '#24160e']
};

function buildPalette() {
  const out = {};
  for (const [name, hex] of Object.entries(BASE_HEX)) out[name] = rgb(hex);
  for (const [ramp, hexes] of Object.entries(RAMP_HEX)) {
    hexes.forEach((hex, index) => {
      out[`${ramp}${index}`] = rgb(hex);
    });
  }
  return out;
}

export const PALETTE = buildPalette();

/** Ramp colors as [r, g, b], light to dark. */
export const RAMPS = Object.fromEntries(
  Object.entries(RAMP_HEX).map(([name, hexes]) => [name, hexes.map((hex) => rgb(hex).rgb)])
);

const RAMP_OF = new Map();
for (const [name, hexes] of Object.entries(RAMP_HEX)) {
  hexes.forEach((hex, index) => RAMP_OF.set(rgb(hex).key, { name, index }));
}

/** Same color moved `steps` along its ramp (positive is darker). Colors outside a ramp stay put. */
export function shiftColor(color, steps) {
  const hit = RAMP_OF.get(`${color[0]},${color[1]},${color[2]}`);
  if (!hit) return color;
  const ramp = RAMPS[hit.name];
  return ramp[Math.max(0, Math.min(ramp.length - 1, hit.index + steps))];
}

/** Outline color for a pixel: the darkest step of its ramp, ink otherwise. */
export function outlineFor(color) {
  const hit = RAMP_OF.get(`${color[0]},${color[1]},${color[2]}`);
  if (!hit) return PALETTE.ink.rgb;
  const ramp = RAMPS[hit.name];
  return ramp[ramp.length - 1];
}

export const STYLE_ID = 'cafe-pixel-v2';

export function paletteRgbSet() {
  return new Set(Object.values(PALETTE).map((c) => c.key));
}

function rgb(hex) {
  const n = hex.replace('#', '');
  return {
    hex,
    rgb: [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)],
    key: `${parseInt(n.slice(0, 2), 16)},${parseInt(n.slice(2, 4), 16)},${parseInt(n.slice(4, 6), 16)}`
  };
}
