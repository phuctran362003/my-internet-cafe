/** Closed palette. Every placeholder pixel must use these colors. */
export const PALETTE = {
  ink: rgb('#1b1420'),
  paper: rgb('#f3e6c8'),
  panel: rgb('#2a3142'),
  panelLight: rgb('#3b4458'),
  floor: rgb('#d4cfc5'),
  floorDark: rgb('#b7b2a8'),
  floorLight: rgb('#e7e2d8'),
  wall: rgb('#efe6d4'),
  wallDark: rgb('#c9b89a'),
  wallLight: rgb('#f7f2e6'),
  door: rgb('#7a4e2d'),
  doorLight: rgb('#a56b3d'),
  window: rgb('#9fd7e8'),
  windowDark: rgb('#3c6f86'),
  counter: rgb('#7a4e2d'),
  counterTop: rgb('#f0d2a0'),
  storage: rgb('#8d7a58'),
  toilet: rgb('#d5ddd8'),
  rug: rgb('#8c3d4a'),
  skin: rgb('#f0c29a'),
  skinShadow: rgb('#d39a72'),
  eye: rgb('#1b1420'),
  hairBlack: rgb('#241c1a'),
  hairBrown: rgb('#6b3a22'),
  hairBlond: rgb('#e0b15a'),
  hairPink: rgb('#d46a8a'),
  shirtBlue: rgb('#3d6fbf'),
  shirtGreen: rgb('#3e8f62'),
  shirtRed: rgb('#c4503c'),
  shirtPurple: rgb('#7a4ea3'),
  shirtGold: rgb('#e0a23a'),
  shirtGray: rgb('#5e6772'),
  pantsNavy: rgb('#243044'),
  pantsBrown: rgb('#5a3a28'),
  shoeBrown: rgb('#3a2418'),
  desk: rgb('#b57a3e'),
  deskLight: rgb('#e0b56a'),
  bezel: rgb('#232833'),
  screenOff: rgb('#1e3a4c'),
  screenBasic: rgb('#2f8f78'),
  screenStandard: rgb('#3d9ed6'),
  screenGaming: rgb('#7ee0c8'),
  screenHigh: rgb('#68b7ff'),
  screenPremium: rgb('#e6c15a'),
  screenBroken: rgb('#c4503c'),
  leaf: rgb('#3e8f62'),
  leafDark: rgb('#246043'),
  pot: rgb('#8c3d4a'),
  drink: rgb('#3d6fbf'),
  noodle: rgb('#e0a23a'),
  medicine: rgb('#f7f3ea'),
  medicineMark: rgb('#c4503c'),
  foodPack: rgb('#c4503c'),
  coin: rgb('#e0a23a'),
  alert: rgb('#e0564a'),
  white: rgb('#f7f3ea'),
  canvas: rgb('#141820'),
  night: rgb('#0b1020'),
  heat: rgb('#e07a3d'),
  cold: rgb('#7eb6d6'),
  hunger: rgb('#d0a04a')
};

export const STYLE_ID = 'cafe-pixel-v1';

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
