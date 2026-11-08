import { PALETTE } from './palette.js';
import { DESIGN_PIXEL } from './layout.js';
import { blank, fillRect, setPixel } from './pixelBuffer.js';

const INK = PALETTE.ink.rgb;
const N = DESIGN_PIXEL;

function ellipse(buffer, cx, cy, rx, ry, color) {
  const rrx = rx * rx || 1;
  const rry = ry * ry || 1;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if ((dx * dx) / rrx + (dy * dy) / rry <= 1) setPixel(buffer, x, y, color);
    }
  }
}

function outline(buffer) {
  const src = buffer.pixels.slice();
  const { width, height } = buffer;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (src[i + 3] !== 0) continue;
      let touch = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (src[(ny * width + nx) * 4 + 3] !== 0) touch = true;
      }
      if (touch) setPixel(buffer, x, y, INK);
    }
  }
}

export function drawFloor(kind) {
  const buffer = blank(N, N);
  const base = kind === 'alt' ? PALETTE.floorLight.rgb : PALETTE.floor.rgb;
  const grout = PALETTE.floorDark.rgb;
  const light = kind === 'alt' ? PALETTE.floor.rgb : PALETTE.floorLight.rgb;
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const edge = x === 0 || y === 0;
      const bevel = !edge && (x === 1 || y === 1);
      const shade = !edge && x >= N - 3 && y >= N - 3;
      setPixel(buffer, x, y, edge ? grout : bevel ? light : shade ? grout : base);
    }
  }
  return buffer;
}

export function drawWall() {
  const buffer = blank(N, N);
  for (let y = 0; y < 50; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const mote = (x * 5 + y * 3) % 29 === 0;
      setPixel(buffer, x, y, mote ? PALETTE.wallDark.rgb : y < 3 ? PALETTE.wallLight.rgb : PALETTE.wall.rgb);
    }
  }
  fillRect(buffer, 0, 50, 64, 14, PALETTE.counter.rgb);
  fillRect(buffer, 0, 50, 64, 2, PALETTE.counterTop.rgb);
  fillRect(buffer, 0, 56, 64, 1, PALETTE.deskLight.rgb);
  fillRect(buffer, 0, 62, 64, 2, PALETTE.desk.rgb);
  return buffer;
}

export function drawDoor(closed) {
  const buffer = drawWall();
  fillRect(buffer, 8, 2, 48, 60, PALETTE.desk.rgb);
  fillRect(buffer, 12, 6, 40, 52, closed ? PALETTE.door.rgb : PALETTE.floor.rgb);
  if (closed) {
    fillRect(buffer, 16, 10, 32, 18, PALETTE.doorLight.rgb);
    fillRect(buffer, 16, 32, 32, 18, PALETTE.doorLight.rgb);
    fillRect(buffer, 18, 12, 12, 4, PALETTE.paper.rgb);
    fillRect(buffer, 18, 34, 12, 4, PALETTE.paper.rgb);
    fillRect(buffer, 42, 28, 4, 6, PALETTE.coin.rgb);
  } else {
    fillRect(buffer, 12, 6, 10, 52, PALETTE.door.rgb);
    fillRect(buffer, 14, 10, 6, 16, PALETTE.doorLight.rgb);
    fillRect(buffer, 14, 32, 6, 16, PALETTE.doorLight.rgb);
    fillRect(buffer, 18, 28, 4, 6, PALETTE.coin.rgb);
    fillRect(buffer, 28, 16, 16, 2, PALETTE.floorDark.rgb);
    fillRect(buffer, 28, 40, 16, 2, PALETTE.floorDark.rgb);
  }
  return buffer;
}

export function drawWindow() {
  const buffer = drawWall();
  fillRect(buffer, 6, 6, 52, 40, PALETTE.desk.rgb);
  fillRect(buffer, 10, 10, 20, 14, PALETTE.window.rgb);
  fillRect(buffer, 34, 10, 20, 14, PALETTE.window.rgb);
  fillRect(buffer, 10, 28, 20, 14, PALETTE.window.rgb);
  fillRect(buffer, 34, 28, 20, 14, PALETTE.window.rgb);
  fillRect(buffer, 12, 12, 6, 4, PALETTE.white.rgb);
  fillRect(buffer, 36, 12, 6, 4, PALETTE.white.rgb);
  fillRect(buffer, 28, 10, 4, 32, PALETTE.windowDark.rgb);
  fillRect(buffer, 10, 24, 44, 4, PALETTE.windowDark.rgb);
  return buffer;
}

export function drawCounter() {
  const buffer = blank(N, N);
  fillRect(buffer, 0, 0, 64, 16, PALETTE.counterTop.rgb);
  fillRect(buffer, 0, 0, 64, 2, PALETTE.paper.rgb);
  fillRect(buffer, 0, 12, 64, 4, PALETTE.counter.rgb);
  fillRect(buffer, 0, 16, 64, 42, PALETTE.counter.rgb);
  fillRect(buffer, 4, 22, 26, 28, PALETTE.desk.rgb);
  fillRect(buffer, 34, 22, 26, 28, PALETTE.desk.rgb);
  fillRect(buffer, 4, 22, 26, 4, PALETTE.deskLight.rgb);
  fillRect(buffer, 34, 22, 26, 4, PALETTE.deskLight.rgb);
  fillRect(buffer, 8, 32, 18, 2, PALETTE.counter.rgb);
  fillRect(buffer, 38, 32, 18, 2, PALETTE.counter.rgb);
  fillRect(buffer, 24, 36, 4, 8, PALETTE.coin.rgb);
  fillRect(buffer, 36, 36, 4, 8, PALETTE.coin.rgb);
  fillRect(buffer, 0, 58, 64, 6, PALETTE.desk.rgb);
  return buffer;
}

export function drawStorage() {
  const buffer = drawFloor('base');
  fillRect(buffer, 8, 10, 48, 44, PALETTE.desk.rgb);
  fillRect(buffer, 8, 10, 48, 6, PALETTE.deskLight.rgb);
  fillRect(buffer, 12, 22, 40, 2, PALETTE.counter.rgb);
  fillRect(buffer, 12, 34, 40, 2, PALETTE.counter.rgb);
  fillRect(buffer, 30, 16, 2, 32, PALETTE.counter.rgb);
  fillRect(buffer, 14, 14, 3, 3, PALETTE.coin.rgb);
  fillRect(buffer, 47, 14, 3, 3, PALETTE.coin.rgb);
  fillRect(buffer, 14, 46, 3, 3, PALETTE.coin.rgb);
  fillRect(buffer, 47, 46, 3, 3, PALETTE.coin.rgb);
  return buffer;
}

export function drawToilet() {
  const buffer = blank(N, N);
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const gx = Math.floor(x / 8);
      const gy = Math.floor(y / 8);
      const grout = x % 8 === 0 || y % 8 === 0;
      setPixel(buffer, x, y, grout ? PALETTE.cold.rgb : (gx + gy) % 2 === 0 ? PALETTE.toilet.rgb : PALETTE.white.rgb);
    }
  }
  return buffer;
}

export function drawRug() {
  const buffer = drawFloor('base');
  fillRect(buffer, 6, 6, 52, 52, PALETTE.rug.rgb);
  fillRect(buffer, 12, 12, 40, 40, PALETTE.shirtRed.rgb);
  fillRect(buffer, 16, 16, 32, 32, PALETTE.rug.rgb);
  fillRect(buffer, 28, 28, 8, 8, PALETTE.coin.rgb);
  return buffer;
}

export function drawCharacterFrame(pose, variant) {
  const buffer = blank(N, N);
  const hair = PALETTE[variant.hair].rgb;
  const shirt = PALETTE[variant.shirt].rgb;
  const pants = PALETTE[variant.pants].rgb;
  const skin = PALETTE.skin.rgb;
  const shade = PALETTE.skinShadow.rgb;
  const shoe = PALETTE.shoeBrown.rgb;
  const back = pose === 'upIdle' || pose === 'upWalk';
  const stepping = pose === 'downWalk' || pose === 'upWalk';
  const sitting = pose === 'sit';

  ellipse(buffer, 32, 58, 14, 4, PALETTE.floorDark.rgb);

  if (sitting) {
    fillRect(buffer, 20, 40, 10, 14, pants);
    fillRect(buffer, 34, 40, 10, 14, pants);
    fillRect(buffer, 20, 52, 10, 4, shoe);
    fillRect(buffer, 34, 52, 10, 4, shoe);
    ellipse(buffer, 32, 36, 16, 12, shirt);
    fillRect(buffer, 20, 34, 5, 8, shirt);
    fillRect(buffer, 39, 34, 5, 8, shirt);
    paintHead(buffer, { hair, skin, shade, back: true, dy: 8 });
    outline(buffer);
    return buffer;
  }

  const left = stepping ? 18 : 22;
  const right = stepping ? 38 : 34;
  fillRect(buffer, left, 38, 8, 16, pants);
  fillRect(buffer, right, 38, 8, 16, pants);
  fillRect(buffer, left, 52, 8, 6, shoe);
  fillRect(buffer, right, 52, 8, 6, shoe);
  fillRect(buffer, left + 1, 52, 6, 2, PALETTE.floorLight.rgb);
  fillRect(buffer, right + 1, 52, 6, 2, PALETTE.floorLight.rgb);

  ellipse(buffer, 32, 36, 14, 12, shirt);
  fillRect(buffer, 26, 28, 12, 4, shade);
  if (!back) fillRect(buffer, 26, 32, 12, 3, PALETTE.white.rgb);
  fillRect(buffer, 18, 34, 5, 10, shirt);
  fillRect(buffer, 41, 34, 5, 10, shirt);

  paintHead(buffer, { hair, skin, shade, back, dy: 0 });
  outline(buffer);
  return buffer;
}

function paintHead(buffer, { hair, skin, shade, back, dy }) {
  const y = (value) => value + dy;
  ellipse(buffer, 32, y(18), 15, 13, hair);
  fillRect(buffer, 26, y(8), 8, 3, PALETTE.paper.rgb);
  setPixel(buffer, 36, y(9), PALETTE.white.rgb);
  if (back) {
    ellipse(buffer, 32, y(20), 13, 11, hair);
    fillRect(buffer, 26, y(30), 12, 4, shade);
    return;
  }
  ellipse(buffer, 32, y(22), 11, 11, skin);
  fillRect(buffer, 22, y(14), 20, 6, hair);
  fillRect(buffer, 24, y(20), 4, 4, PALETTE.eye.rgb);
  fillRect(buffer, 36, y(20), 4, 4, PALETTE.eye.rgb);
  fillRect(buffer, 25, y(21), 2, 2, PALETTE.white.rgb);
  fillRect(buffer, 37, y(21), 2, 2, PALETTE.white.rgb);
  fillRect(buffer, 31, y(26), 2, 2, shade);
  fillRect(buffer, 29, y(29), 6, 2, shade);
  setPixel(buffer, 22, y(24), shade);
  setPixel(buffer, 41, y(24), shade);
}

const TIER_LED = {
  screenBasic: 'shirtGreen',
  screenStandard: 'screenStandard',
  screenGaming: 'screenGaming',
  screenHigh: 'screenHigh',
  screenPremium: 'coin'
};

export function drawComputer(tierScreen, state) {
  const buffer = blank(N, N);
  const screen = state === 'broken'
    ? PALETTE.screenBroken.rgb
    : state === 'maintenance'
      ? PALETTE.hunger.rgb
      : PALETTE[tierScreen].rgb;
  const ledName = state === 'broken' ? 'alert' : state === 'maintenance' ? 'hunger' : TIER_LED[tierScreen] || 'shirtGreen';
  const led = PALETTE[ledName].rgb;

  fillRect(buffer, 6, 0, 52, 36, PALETTE.bezel.rgb);
  fillRect(buffer, 6, 0, 52, 2, PALETTE.panelLight.rgb);
  fillRect(buffer, 10, 4, 44, 26, screen);
  fillRect(buffer, 12, 6, 14, 4, PALETTE.white.rgb);
  if (state === 'available' || state === 'occupied') {
    fillRect(buffer, 12, 12, 28, 3, PALETTE.paper.rgb);
    fillRect(buffer, 12, 17, 36, 2, PALETTE.paper.rgb);
    fillRect(buffer, 12, 21, 22, 2, PALETTE.paper.rgb);
  }
  if (state === 'occupied') {
    fillRect(buffer, 10, 26, 44, 4, PALETTE.panel.rgb);
    fillRect(buffer, 13, 27, 3, 2, PALETTE.shirtGreen.rgb);
    fillRect(buffer, 40, 7, 8, 6, PALETTE.white.rgb);
  }
  if (state === 'broken') {
    for (let i = 0; i < 16; i += 1) setPixel(buffer, 16 + i, 8 + i, INK);
    fillRect(buffer, 36, 12, 2, 8, INK);
    fillRect(buffer, 34, 20, 8, 2, INK);
  }
  if (state === 'maintenance') {
    fillRect(buffer, 30, 10, 4, 14, INK);
    fillRect(buffer, 24, 16, 16, 4, INK);
  }
  fillRect(buffer, 30, 32, 4, 2, led);
  fillRect(buffer, 28, 36, 8, 4, PALETTE.bezel.rgb);
  fillRect(buffer, 22, 40, 20, 3, PALETTE.shirtGray.rgb);

  fillRect(buffer, 2, 42, 60, 22, PALETTE.desk.rgb);
  fillRect(buffer, 2, 42, 60, 2, PALETTE.deskLight.rgb);
  fillRect(buffer, 2, 58, 60, 6, PALETTE.counter.rgb);
  fillRect(buffer, 8, 46, 36, 10, PALETTE.shirtGray.rgb);
  fillRect(buffer, 10, 48, 32, 2, PALETTE.bezel.rgb);
  fillRect(buffer, 10, 52, 32, 2, PALETTE.bezel.rgb);
  for (let key = 0; key < 8; key += 1) fillRect(buffer, 10 + key * 4, 48, 2, 2, PALETTE.panel.rgb);
  for (let key = 0; key < 8; key += 1) fillRect(buffer, 10 + key * 4, 52, 2, 2, PALETTE.panel.rgb);
  fillRect(buffer, 48, 46, 8, 10, PALETTE.white.rgb);
  fillRect(buffer, 50, 48, 4, 4, PALETTE.shirtGray.rgb);
  outline(buffer);
  return buffer;
}

export function drawChair(clothKey = 'shirtRed', shadeKey = 'rug') {
  const buffer = blank(N, N);
  const cloth = PALETTE[clothKey].rgb;
  const shade = PALETTE[shadeKey].rgb;
  const post = PALETTE.bezel.rgb;
  fillRect(buffer, 14, 2, 36, 22, cloth);
  fillRect(buffer, 14, 2, 36, 4, shade);
  fillRect(buffer, 14, 2, 4, 22, shade);
  fillRect(buffer, 46, 2, 4, 22, shade);
  if (clothKey !== 'white') fillRect(buffer, 20, 8, 12, 4, PALETTE.white.rgb);
  else fillRect(buffer, 20, 8, 12, 4, PALETTE.paper.rgb);
  fillRect(buffer, 18, 20, 28, 2, shade);
  fillRect(buffer, 12, 24, 6, 8, post);
  fillRect(buffer, 46, 24, 6, 8, post);
  fillRect(buffer, 10, 30, 44, 16, cloth);
  fillRect(buffer, 10, 42, 44, 4, shade);
  fillRect(buffer, 14, 46, 6, 10, post);
  fillRect(buffer, 44, 46, 6, 10, post);
  fillRect(buffer, 12, 54, 10, 4, PALETTE.shirtGray.rgb);
  fillRect(buffer, 42, 54, 10, 4, PALETTE.shirtGray.rgb);
  outline(buffer);
  return buffer;
}

export function drawPlant() {
  const buffer = blank(N, N);
  ellipse(buffer, 32, 24, 16, 14, PALETTE.leaf.rgb);
  ellipse(buffer, 24, 22, 8, 8, PALETTE.leafDark.rgb);
  ellipse(buffer, 40, 26, 6, 6, PALETTE.leafDark.rgb);
  fillRect(buffer, 28, 14, 4, 3, PALETTE.shirtGreen.rgb);
  fillRect(buffer, 36, 12, 3, 3, PALETTE.paper.rgb);
  fillRect(buffer, 26, 36, 12, 14, PALETTE.pot.rgb);
  fillRect(buffer, 24, 36, 16, 4, PALETTE.shirtRed.rgb);
  fillRect(buffer, 28, 44, 8, 2, PALETTE.floorDark.rgb);
  outline(buffer);
  return buffer;
}

export function drawCounterProp() {
  return drawCounter();
}

export function drawLamp() {
  const buffer = blank(N, N);
  fillRect(buffer, 22, 50, 20, 8, PALETTE.desk.rgb);
  fillRect(buffer, 24, 48, 16, 4, PALETTE.deskLight.rgb);
  fillRect(buffer, 30, 28, 4, 22, PALETTE.bezel.rgb);
  fillRect(buffer, 16, 14, 32, 16, PALETTE.coin.rgb);
  fillRect(buffer, 18, 16, 28, 4, PALETTE.paper.rgb);
  fillRect(buffer, 20, 26, 24, 4, PALETTE.shirtGold.rgb);
  fillRect(buffer, 26, 30, 12, 4, PALETTE.white.rgb);
  outline(buffer);
  return buffer;
}

export function drawVipFloor() {
  const buffer = blank(N, N);
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const edge = x < 3 || y < 3 || x >= N - 3 || y >= N - 3;
      const seam = x % 16 === 0 || y % 16 === 0;
      setPixel(buffer, x, y, edge ? PALETTE.coin.rgb : seam ? PALETTE.floor.rgb : PALETTE.floorDark.rgb);
    }
  }
  fillRect(buffer, 28, 28, 8, 8, PALETTE.shirtGold.rgb);
  return buffer;
}

export function drawGate() {
  return drawDoor(true);
}

export function drawItem(kind) {
  const buffer = blank(N, N);
  if (kind === 'drink') {
    fillRect(buffer, 24, 12, 16, 6, PALETTE.drink.rgb);
    fillRect(buffer, 26, 18, 12, 28, PALETTE.drink.rgb);
    fillRect(buffer, 28, 22, 8, 8, PALETTE.white.rgb);
    fillRect(buffer, 24, 44, 16, 6, PALETTE.windowDark.rgb);
  } else if (kind === 'noodle') {
    ellipse(buffer, 32, 32, 18, 14, PALETTE.noodle.rgb);
    ellipse(buffer, 32, 30, 14, 8, PALETTE.paper.rgb);
    fillRect(buffer, 24, 28, 16, 2, PALETTE.shirtRed.rgb);
    fillRect(buffer, 40, 16, 4, 12, PALETTE.deskLight.rgb);
  } else if (kind === 'medicine') {
    fillRect(buffer, 16, 20, 32, 24, PALETTE.medicine.rgb);
    fillRect(buffer, 16, 20, 32, 6, PALETTE.alert.rgb);
    fillRect(buffer, 28, 30, 8, 10, PALETTE.medicineMark.rgb);
    fillRect(buffer, 24, 34, 16, 2, PALETTE.medicineMark.rgb);
  } else {
    fillRect(buffer, 14, 18, 36, 28, PALETTE.foodPack.rgb);
    fillRect(buffer, 18, 24, 28, 12, PALETTE.paper.rgb);
    fillRect(buffer, 22, 28, 12, 4, PALETTE.shirtRed.rgb);
    fillRect(buffer, 20, 40, 24, 2, PALETTE.desk.rgb);
  }
  outline(buffer);
  return buffer;
}

export function drawEffect(kind) {
  const buffer = blank(N, N);
  if (kind === 'alert') {
    for (let y = 12; y < 44; y += 1) {
      const half = Math.floor((y - 12) * 0.7);
      fillRect(buffer, 32 - half, y, half * 2, 1, PALETTE.alert.rgb);
    }
    fillRect(buffer, 30, 20, 4, 12, PALETTE.white.rgb);
    fillRect(buffer, 30, 36, 4, 4, PALETTE.white.rgb);
  } else if (kind === 'coin') {
    ellipse(buffer, 32, 32, 16, 16, PALETTE.coin.rgb);
    ellipse(buffer, 32, 32, 10, 10, PALETTE.paper.rgb);
    fillRect(buffer, 30, 24, 4, 16, PALETTE.coin.rgb);
  } else if (kind === 'lock') {
    ellipse(buffer, 32, 22, 12, 10, PALETTE.coin.rgb);
    ellipse(buffer, 32, 22, 6, 6, PALETTE.panel.rgb);
    fillRect(buffer, 16, 28, 32, 24, PALETTE.coin.rgb);
    fillRect(buffer, 20, 32, 24, 16, PALETTE.shirtGold.rgb);
    fillRect(buffer, 30, 34, 4, 8, PALETTE.ink.rgb);
    fillRect(buffer, 28, 40, 8, 3, PALETTE.ink.rgb);
  } else {
    ellipse(buffer, 32, 36, 16, 10, PALETTE.noodle.rgb);
    ellipse(buffer, 32, 32, 12, 6, PALETTE.paper.rgb);
    fillRect(buffer, 36, 16, 4, 12, PALETTE.desk.rgb);
  }
  outline(buffer);
  return buffer;
}

export function drawPortrait(kind) {
  const buffer = blank(N, N);
  const hair = kind === 'child' ? PALETTE.hairBrown.rgb : kind === 'wife' ? PALETTE.hairPink.rgb : PALETTE.hairBlack.rgb;
  const shirt = kind === 'wife' ? PALETTE.shirtRed.rgb : kind === 'child' ? PALETTE.shirtGreen.rgb : PALETTE.shirtBlue.rgb;
  fillRect(buffer, 12, 44, 40, 20, shirt);
  fillRect(buffer, 24, 40, 16, 6, PALETTE.white.rgb);
  ellipse(buffer, 32, 28, 18, 18, hair);
  ellipse(buffer, 32, 30, 14, 14, PALETTE.skin.rgb);
  fillRect(buffer, 18, 20, 28, 6, hair);
  fillRect(buffer, 28, 16, 6, 3, PALETTE.paper.rgb);
  fillRect(buffer, 26, 30, 4, 4, PALETTE.eye.rgb);
  fillRect(buffer, 36, 30, 4, 4, PALETTE.eye.rgb);
  fillRect(buffer, 27, 31, 2, 2, PALETTE.white.rgb);
  fillRect(buffer, 37, 31, 2, 2, PALETTE.white.rgb);
  fillRect(buffer, 31, 36, 2, 2, PALETTE.skinShadow.rgb);
  fillRect(buffer, 29, 38, 6, 2, PALETTE.shirtRed.rgb);
  if (kind === 'child') fillRect(buffer, 44, 24, 6, 6, PALETTE.shirtGreen.rgb);
  outline(buffer);
  return buffer;
}
