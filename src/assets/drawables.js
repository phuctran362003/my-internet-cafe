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
  const gap = PALETTE.floorDark.rgb;
  const knot = kind === 'alt' ? PALETTE.floor.rgb : PALETTE.floorLight.rgb;
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const seam = y % 8 === 0 || (y > 2 && y < 6 && x % 16 === 0) || (y > 10 && y < 14 && x % 16 === 8);
      const grain = !seam && y % 8 === 3 && x % 5 === 0;
      const knotHere = !seam && ((x * 3 + y) % 17 === 0);
      setPixel(buffer, x, y, seam ? gap : grain || knotHere ? knot : base);
    }
  }
  return buffer;
}

export function drawWall() {
  const buffer = blank(N, N);
  const brickH = 8;
  const brickW = 10;
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const row = Math.floor(y / brickH);
      const offset = row % 2 === 0 ? 0 : 5;
      const localX = (x + offset) % brickW;
      const localY = y % brickH;
      if (localY === 0 || localX === 0) setPixel(buffer, x, y, PALETTE.wallDark.rgb);
      else if (localY === 1) setPixel(buffer, x, y, PALETTE.wallLight.rgb);
      else if (localY > 5 && localX % 4 === 0) setPixel(buffer, x, y, PALETTE.wallDark.rgb);
      else setPixel(buffer, x, y, PALETTE.wall.rgb);
    }
  }
  return buffer;
}

export function drawDoor(closed) {
  const buffer = drawWall();
  fillRect(buffer, 6, 2, 20, 28, PALETTE.door.rgb);
  fillRect(buffer, 8, 4, 16, 10, closed ? PALETTE.doorLight.rgb : PALETTE.floorLight.rgb);
  fillRect(buffer, 8, 16, 16, 10, PALETTE.doorLight.rgb);
  fillRect(buffer, 9, 5, 6, 2, PALETTE.paper.rgb);
  if (!closed) {
    fillRect(buffer, 10, 6, 12, 6, PALETTE.floor.rgb);
    fillRect(buffer, 10, 18, 12, 6, PALETTE.floorDark.rgb);
  }
  fillRect(buffer, 21, 15, 2, 3, PALETTE.coin.rgb);
  return buffer;
}

export function drawWindow() {
  const buffer = drawWall();
  fillRect(buffer, 4, 4, 24, 20, PALETTE.windowDark.rgb);
  fillRect(buffer, 6, 6, 9, 7, PALETTE.window.rgb);
  fillRect(buffer, 17, 6, 9, 7, PALETTE.window.rgb);
  fillRect(buffer, 6, 15, 9, 7, PALETTE.window.rgb);
  fillRect(buffer, 17, 15, 9, 7, PALETTE.window.rgb);
  fillRect(buffer, 7, 7, 3, 2, PALETTE.white.rgb);
  fillRect(buffer, 18, 7, 3, 2, PALETTE.white.rgb);
  return buffer;
}

export function drawCounter() {
  const buffer = blank(N, N);
  fillRect(buffer, 0, 8, 32, 22, PALETTE.counter.rgb);
  fillRect(buffer, 0, 6, 32, 5, PALETTE.counterTop.rgb);
  fillRect(buffer, 0, 6, 32, 1, PALETTE.paper.rgb);
  fillRect(buffer, 4, 16, 8, 8, PALETTE.desk.rgb);
  fillRect(buffer, 20, 16, 8, 8, PALETTE.desk.rgb);
  setPixel(buffer, 10, 20, PALETTE.coin.rgb);
  setPixel(buffer, 26, 20, PALETTE.coin.rgb);
  return buffer;
}

export function drawStorage() {
  const buffer = drawFloor('base');
  fillRect(buffer, 3, 3, 12, 12, PALETTE.desk.rgb);
  fillRect(buffer, 4, 4, 10, 3, PALETTE.deskLight.rgb);
  fillRect(buffer, 5, 8, 8, 1, PALETTE.floorDark.rgb);
  fillRect(buffer, 17, 16, 12, 12, PALETTE.counter.rgb);
  fillRect(buffer, 18, 17, 10, 3, PALETTE.counterTop.rgb);
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
    fillRect(buffer, 7, 20, 18, 8, PALETTE.desk.rgb);
    fillRect(buffer, 8, 21, 16, 2, PALETTE.deskLight.rgb);
    fillRect(buffer, 9, 26, 3, 3, PALETTE.desk.rgb);
    fillRect(buffer, 20, 26, 3, 3, PALETTE.desk.rgb);
    ellipse(buffer, 16, 18, 8, 5, shirt);
    fillRect(buffer, 12, 16, 8, 2, PALETTE.white.rgb);
    paintHead(buffer, { hair, skin, shade, back: false });
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

export function drawComputer(tierScreen, state) {
  const buffer = blank(N, N);
  const screen = state === 'broken'
    ? PALETTE.screenBroken.rgb
    : state === 'occupied'
      ? PALETTE[tierScreen].rgb
      : state === 'maintenance'
        ? PALETTE.hunger.rgb
        : PALETTE.screenOff.rgb;
  fillRect(buffer, 2, 3, 28, 16, PALETTE.desk.rgb);
  fillRect(buffer, 2, 3, 28, 2, PALETTE.deskLight.rgb);
  fillRect(buffer, 6, 5, 20, 12, PALETTE.bezel.rgb);
  fillRect(buffer, 8, 7, 16, 8, screen);
  if (state === 'occupied') {
    fillRect(buffer, 9, 8, 5, 2, PALETTE.white.rgb);
    fillRect(buffer, 9, 13, 14, 1, PALETTE.paper.rgb);
  }
  if (state === 'broken') {
    for (let i = 0; i < 7; i += 1) setPixel(buffer, 10 + i, 8 + i, INK);
    setPixel(buffer, 18, 9, INK);
    setPixel(buffer, 19, 10, INK);
  }
  fillRect(buffer, 14, 17, 4, 3, PALETTE.bezel.rgb);
  fillRect(buffer, 7, 21, 18, 6, PALETTE.deskLight.rgb);
  fillRect(buffer, 7, 21, 18, 1, PALETTE.paper.rgb);
  for (let key = 0; key < 7; key += 1) {
    fillRect(buffer, 9 + key * 2, 23, 1, 2, PALETTE.bezel.rgb);
  }
  const led = state === 'occupied' ? PALETTE.shirtGreen.rgb : state === 'broken' ? PALETTE.alert.rgb : PALETTE.floorDark.rgb;
  setPixel(buffer, 23, 8, led);
  setPixel(buffer, 23, 9, led);
  outline(buffer);
  return buffer;
}

export function drawChair() {
  const buffer = blank(N, N);
  ellipse(buffer, 16, 12, 8, 6, PALETTE.desk.rgb);
  fillRect(buffer, 9, 8, 14, 3, PALETTE.deskLight.rgb);
  fillRect(buffer, 10, 16, 3, 8, PALETTE.desk.rgb);
  fillRect(buffer, 19, 16, 3, 8, PALETTE.desk.rgb);
  fillRect(buffer, 8, 23, 5, 2, PALETTE.deskLight.rgb);
  fillRect(buffer, 19, 23, 5, 2, PALETTE.deskLight.rgb);
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
