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
  const speck = kind === 'alt' ? PALETTE.floor.rgb : PALETTE.floorLight.rgb;
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const edge = x === 0 || y === 0;
      const shade = !edge && x > 28 && y > 28;
      setPixel(buffer, x, y, edge ? grout : shade ? speck : base);
    }
  }
  return buffer;
}

export function drawWall() {
  const buffer = blank(N, N);
  for (let y = 0; y < 26; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const mote = (x * 7 + y * 3) % 23 === 0;
      setPixel(buffer, x, y, mote ? PALETTE.wallDark.rgb : y < 2 ? PALETTE.wallLight.rgb : PALETTE.wall.rgb);
    }
  }
  fillRect(buffer, 0, 26, 32, 6, PALETTE.counter.rgb);
  fillRect(buffer, 0, 26, 32, 1, PALETTE.counterTop.rgb);
  fillRect(buffer, 0, 31, 32, 1, PALETTE.desk.rgb);
  return buffer;
}

export function drawDoor(closed) {
  const buffer = drawWall();
  fillRect(buffer, 4, 1, 24, 30, PALETTE.desk.rgb);
  fillRect(buffer, 6, 3, 20, 26, closed ? PALETTE.door.rgb : PALETTE.floor.rgb);
  if (closed) {
    fillRect(buffer, 8, 5, 16, 9, PALETTE.doorLight.rgb);
    fillRect(buffer, 8, 16, 16, 9, PALETTE.doorLight.rgb);
    fillRect(buffer, 9, 6, 6, 2, PALETTE.paper.rgb);
    fillRect(buffer, 9, 17, 6, 2, PALETTE.paper.rgb);
    fillRect(buffer, 21, 14, 2, 3, PALETTE.coin.rgb);
  } else {
    fillRect(buffer, 6, 3, 5, 26, PALETTE.door.rgb);
    fillRect(buffer, 7, 5, 3, 8, PALETTE.doorLight.rgb);
    fillRect(buffer, 7, 16, 3, 8, PALETTE.doorLight.rgb);
    fillRect(buffer, 9, 14, 2, 3, PALETTE.coin.rgb);
    fillRect(buffer, 14, 8, 8, 1, PALETTE.floorDark.rgb);
    fillRect(buffer, 14, 20, 8, 1, PALETTE.floorDark.rgb);
  }
  return buffer;
}

export function drawWindow() {
  const buffer = drawWall();
  fillRect(buffer, 3, 3, 26, 20, PALETTE.desk.rgb);
  fillRect(buffer, 5, 5, 10, 7, PALETTE.window.rgb);
  fillRect(buffer, 17, 5, 10, 7, PALETTE.window.rgb);
  fillRect(buffer, 5, 14, 10, 7, PALETTE.window.rgb);
  fillRect(buffer, 17, 14, 10, 7, PALETTE.window.rgb);
  fillRect(buffer, 6, 6, 3, 2, PALETTE.white.rgb);
  fillRect(buffer, 18, 6, 3, 2, PALETTE.white.rgb);
  fillRect(buffer, 14, 5, 2, 16, PALETTE.windowDark.rgb);
  fillRect(buffer, 5, 12, 22, 2, PALETTE.windowDark.rgb);
  return buffer;
}

export function drawCounter() {
  const buffer = blank(N, N);
  fillRect(buffer, 0, 0, 32, 8, PALETTE.counterTop.rgb);
  fillRect(buffer, 0, 0, 32, 1, PALETTE.paper.rgb);
  fillRect(buffer, 0, 6, 32, 2, PALETTE.counter.rgb);
  fillRect(buffer, 0, 8, 32, 21, PALETTE.counter.rgb);
  fillRect(buffer, 2, 11, 13, 14, PALETTE.desk.rgb);
  fillRect(buffer, 17, 11, 13, 14, PALETTE.desk.rgb);
  fillRect(buffer, 2, 11, 13, 2, PALETTE.deskLight.rgb);
  fillRect(buffer, 17, 11, 13, 2, PALETTE.deskLight.rgb);
  fillRect(buffer, 4, 16, 9, 1, PALETTE.counter.rgb);
  fillRect(buffer, 19, 16, 9, 1, PALETTE.counter.rgb);
  fillRect(buffer, 12, 18, 2, 4, PALETTE.coin.rgb);
  fillRect(buffer, 18, 18, 2, 4, PALETTE.coin.rgb);
  fillRect(buffer, 0, 29, 32, 3, PALETTE.desk.rgb);
  return buffer;
}

export function drawStorage() {
  const buffer = drawFloor('base');
  fillRect(buffer, 4, 5, 24, 22, PALETTE.desk.rgb);
  fillRect(buffer, 4, 5, 24, 3, PALETTE.deskLight.rgb);
  fillRect(buffer, 6, 11, 20, 1, PALETTE.counter.rgb);
  fillRect(buffer, 6, 17, 20, 1, PALETTE.counter.rgb);
  fillRect(buffer, 15, 8, 1, 16, PALETTE.counter.rgb);
  setPixel(buffer, 7, 7, PALETTE.coin.rgb);
  setPixel(buffer, 24, 7, PALETTE.coin.rgb);
  setPixel(buffer, 7, 23, PALETTE.coin.rgb);
  setPixel(buffer, 24, 23, PALETTE.coin.rgb);
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
  fillRect(buffer, 3, 3, 26, 26, PALETTE.rug.rgb);
  fillRect(buffer, 6, 6, 20, 20, PALETTE.shirtRed.rgb);
  fillRect(buffer, 8, 8, 16, 16, PALETTE.rug.rgb);
  fillRect(buffer, 14, 14, 4, 4, PALETTE.coin.rgb);
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

  ellipse(buffer, 16, 29, 7, 2, PALETTE.floorDark.rgb);

  if (sitting) {
    fillRect(buffer, 10, 18, 5, 7, pants);
    fillRect(buffer, 17, 18, 5, 7, pants);
    fillRect(buffer, 10, 24, 5, 2, shoe);
    fillRect(buffer, 17, 24, 5, 2, shoe);
    ellipse(buffer, 16, 16, 7, 6, shirt);
    fillRect(buffer, 11, 16, 2, 4, shirt);
    fillRect(buffer, 19, 16, 2, 4, shirt);
    paintHead(buffer, { hair, skin, shade, back: true });
    outline(buffer);
    return buffer;
  }

  const left = stepping ? 9 : 12;
  const right = stepping ? 19 : 17;
  fillRect(buffer, left, 18, 4, 8, pants);
  fillRect(buffer, right, 18, 4, 8, pants);
  fillRect(buffer, left, 25, 4, 3, shoe);
  fillRect(buffer, right, 25, 4, 3, shoe);
  setPixel(buffer, left + 1, 25, PALETTE.floorLight.rgb);
  setPixel(buffer, right + 1, 25, PALETTE.floorLight.rgb);

  ellipse(buffer, 16, 17, 7, 6, shirt);
  fillRect(buffer, 13, 13, 6, 2, shade);
  if (!back) fillRect(buffer, 13, 15, 6, 1, PALETTE.white.rgb);
  fillRect(buffer, 10, 18, 2, 4, shirt);
  fillRect(buffer, 20, 18, 2, 4, shirt);

  paintHead(buffer, { hair, skin, shade, back });
  outline(buffer);
  return buffer;
}

function paintHead(buffer, { hair, skin, shade, back }) {
  ellipse(buffer, 16, 9, 7, 6, hair);
  fillRect(buffer, 13, 4, 3, 1, PALETTE.paper.rgb);
  setPixel(buffer, 17, 4, PALETTE.white.rgb);
  if (back) {
    ellipse(buffer, 16, 10, 6, 5, hair);
    fillRect(buffer, 14, 14, 4, 2, shade);
    return;
  }
  ellipse(buffer, 16, 10, 5, 5, skin);
  fillRect(buffer, 11, 7, 10, 2, hair);
  setPixel(buffer, 13, 10, PALETTE.eye.rgb);
  setPixel(buffer, 18, 10, PALETTE.eye.rgb);
  setPixel(buffer, 14, 10, PALETTE.white.rgb);
  setPixel(buffer, 19, 10, PALETTE.white.rgb);
  setPixel(buffer, 16, 12, shade);
  setPixel(buffer, 12, 12, shade);
  setPixel(buffer, 19, 12, shade);
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

  fillRect(buffer, 3, 0, 26, 18, PALETTE.bezel.rgb);
  fillRect(buffer, 5, 2, 22, 13, screen);
  fillRect(buffer, 6, 3, 7, 2, PALETTE.white.rgb);
  if (state === 'available' || state === 'occupied') {
    fillRect(buffer, 6, 7, 14, 1, PALETTE.paper.rgb);
    fillRect(buffer, 6, 9, 18, 1, PALETTE.paper.rgb);
    fillRect(buffer, 6, 11, 10, 1, PALETTE.paper.rgb);
  }
  if (state === 'occupied') {
    fillRect(buffer, 5, 13, 22, 2, PALETTE.panel.rgb);
    setPixel(buffer, 7, 13, PALETTE.shirtGreen.rgb);
  }
  if (state === 'broken') {
    for (let i = 0; i < 8; i += 1) setPixel(buffer, 8 + i, 4 + i, INK);
    setPixel(buffer, 20, 6, INK);
    setPixel(buffer, 21, 7, INK);
    setPixel(buffer, 18, 10, INK);
  }
  if (state === 'maintenance') {
    fillRect(buffer, 14, 5, 2, 7, INK);
    fillRect(buffer, 11, 8, 8, 2, INK);
  }
  setPixel(buffer, 15, 16, led);
  setPixel(buffer, 16, 16, led);
  fillRect(buffer, 13, 18, 6, 2, PALETTE.bezel.rgb);

  fillRect(buffer, 1, 20, 30, 12, PALETTE.desk.rgb);
  fillRect(buffer, 1, 20, 30, 1, PALETTE.deskLight.rgb);
  fillRect(buffer, 1, 29, 30, 3, PALETTE.counter.rgb);
  fillRect(buffer, 4, 22, 18, 6, PALETTE.shirtGray.rgb);
  fillRect(buffer, 5, 23, 16, 1, PALETTE.bezel.rgb);
  fillRect(buffer, 5, 25, 16, 1, PALETTE.bezel.rgb);
  for (let key = 0; key < 8; key += 1) setPixel(buffer, 5 + key * 2, 24, PALETTE.panel.rgb);
  fillRect(buffer, 24, 22, 4, 5, PALETTE.white.rgb);
  fillRect(buffer, 25, 23, 2, 2, PALETTE.shirtGray.rgb);
  outline(buffer);
  return buffer;
}

export function drawChair(clothKey = 'shirtRed', shadeKey = 'rug') {
  const buffer = blank(N, N);
  const cloth = PALETTE[clothKey].rgb;
  const shade = PALETTE[shadeKey].rgb;
  const post = PALETTE.bezel.rgb;
  fillRect(buffer, 7, 1, 18, 11, cloth);
  fillRect(buffer, 7, 1, 18, 2, shade);
  fillRect(buffer, 7, 1, 2, 11, shade);
  fillRect(buffer, 23, 1, 2, 11, shade);
  if (clothKey !== 'white') fillRect(buffer, 10, 4, 6, 2, PALETTE.white.rgb);
  else fillRect(buffer, 10, 4, 6, 2, PALETTE.paper.rgb);
  fillRect(buffer, 6, 12, 3, 4, post);
  fillRect(buffer, 23, 12, 3, 4, post);
  fillRect(buffer, 5, 15, 22, 8, cloth);
  fillRect(buffer, 5, 21, 22, 2, shade);
  fillRect(buffer, 7, 23, 3, 5, post);
  fillRect(buffer, 22, 23, 3, 5, post);
  fillRect(buffer, 6, 27, 5, 2, PALETTE.shirtGray.rgb);
  fillRect(buffer, 21, 27, 5, 2, PALETTE.shirtGray.rgb);
  outline(buffer);
  return buffer;
}

export function drawPlant() {
  const buffer = blank(N, N);
  ellipse(buffer, 16, 12, 8, 7, PALETTE.leaf.rgb);
  ellipse(buffer, 12, 11, 4, 4, PALETTE.leafDark.rgb);
  ellipse(buffer, 20, 13, 3, 3, PALETTE.leafDark.rgb);
  setPixel(buffer, 14, 8, PALETTE.shirtGreen.rgb);
  setPixel(buffer, 18, 7, PALETTE.paper.rgb);
  fillRect(buffer, 13, 18, 6, 7, PALETTE.pot.rgb);
  fillRect(buffer, 12, 18, 8, 2, PALETTE.shirtRed.rgb);
  fillRect(buffer, 14, 22, 4, 1, PALETTE.floorDark.rgb);
  outline(buffer);
  return buffer;
}

export function drawCounterProp() {
  return drawCounter();
}

export function drawItem(kind) {
  const buffer = blank(N, N);
  if (kind === 'drink') {
    fillRect(buffer, 12, 6, 8, 3, PALETTE.drink.rgb);
    fillRect(buffer, 13, 9, 6, 14, PALETTE.drink.rgb);
    fillRect(buffer, 14, 11, 4, 4, PALETTE.white.rgb);
    fillRect(buffer, 12, 22, 8, 3, PALETTE.windowDark.rgb);
  } else if (kind === 'noodle') {
    ellipse(buffer, 16, 16, 9, 7, PALETTE.noodle.rgb);
    ellipse(buffer, 16, 15, 7, 4, PALETTE.paper.rgb);
    fillRect(buffer, 12, 14, 8, 1, PALETTE.shirtRed.rgb);
    fillRect(buffer, 20, 8, 2, 6, PALETTE.deskLight.rgb);
  } else if (kind === 'medicine') {
    fillRect(buffer, 8, 10, 16, 12, PALETTE.medicine.rgb);
    fillRect(buffer, 8, 10, 16, 3, PALETTE.alert.rgb);
    fillRect(buffer, 14, 15, 4, 5, PALETTE.medicineMark.rgb);
    fillRect(buffer, 12, 17, 8, 1, PALETTE.medicineMark.rgb);
  } else {
    fillRect(buffer, 7, 9, 18, 14, PALETTE.foodPack.rgb);
    fillRect(buffer, 9, 12, 14, 6, PALETTE.paper.rgb);
    fillRect(buffer, 11, 14, 6, 2, PALETTE.shirtRed.rgb);
    fillRect(buffer, 10, 20, 12, 1, PALETTE.desk.rgb);
  }
  outline(buffer);
  return buffer;
}

export function drawEffect(kind) {
  const buffer = blank(N, N);
  if (kind === 'alert') {
    for (let y = 6; y < 22; y += 1) {
      const half = Math.floor((y - 6) * 0.7);
      fillRect(buffer, 16 - half, y, half * 2, 1, PALETTE.alert.rgb);
    }
    fillRect(buffer, 15, 10, 2, 6, PALETTE.white.rgb);
    fillRect(buffer, 15, 18, 2, 2, PALETTE.white.rgb);
  } else if (kind === 'coin') {
    ellipse(buffer, 16, 16, 8, 8, PALETTE.coin.rgb);
    ellipse(buffer, 16, 16, 5, 5, PALETTE.paper.rgb);
    fillRect(buffer, 15, 12, 2, 8, PALETTE.coin.rgb);
  } else {
    ellipse(buffer, 16, 18, 8, 5, PALETTE.noodle.rgb);
    ellipse(buffer, 16, 16, 6, 3, PALETTE.paper.rgb);
    fillRect(buffer, 18, 8, 2, 6, PALETTE.desk.rgb);
  }
  outline(buffer);
  return buffer;
}

export function drawPortrait(kind) {
  const buffer = blank(N, N);
  const hair = kind === 'child' ? PALETTE.hairBrown.rgb : kind === 'wife' ? PALETTE.hairPink.rgb : PALETTE.hairBlack.rgb;
  const shirt = kind === 'wife' ? PALETTE.shirtRed.rgb : kind === 'child' ? PALETTE.shirtGreen.rgb : PALETTE.shirtBlue.rgb;
  fillRect(buffer, 6, 22, 20, 10, shirt);
  fillRect(buffer, 12, 20, 8, 3, PALETTE.white.rgb);
  ellipse(buffer, 16, 14, 9, 9, hair);
  ellipse(buffer, 16, 15, 7, 7, PALETTE.skin.rgb);
  fillRect(buffer, 9, 10, 14, 3, hair);
  setPixel(buffer, 14, 8, PALETTE.paper.rgb);
  setPixel(buffer, 13, 15, PALETTE.eye.rgb);
  setPixel(buffer, 18, 15, PALETTE.eye.rgb);
  setPixel(buffer, 14, 14, PALETTE.white.rgb);
  setPixel(buffer, 19, 14, PALETTE.white.rgb);
  setPixel(buffer, 16, 18, PALETTE.skinShadow.rgb);
  setPixel(buffer, 15, 19, PALETTE.shirtRed.rgb);
  setPixel(buffer, 17, 19, PALETTE.shirtRed.rgb);
  if (kind === 'child') fillRect(buffer, 22, 12, 3, 3, PALETTE.shirtGreen.rgb);
  outline(buffer);
  return buffer;
}
