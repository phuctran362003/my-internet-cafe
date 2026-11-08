import { blank } from '../assets/pixelBuffer.js';

export function pixelsToCanvas(buffer) {
  const canvas = document.createElement('canvas');
  canvas.width = buffer.width;
  canvas.height = buffer.height;
  const context = canvas.getContext('2d');
  context.putImageData(new ImageData(buffer.pixels, buffer.width, buffer.height), 0, 0);
  return canvas;
}

export function installGeneratedTextures(scene, generated) {
  for (const [key, image] of Object.entries(generated.textures)) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const canvas = pixelsToCanvas(image);
    if (image.frameWidth) {
      scene.textures.addSpriteSheet(key, canvas, {
        frameWidth: image.frameWidth,
        frameHeight: image.frameHeight
      });
    } else {
      scene.textures.addCanvas(key, canvas);
    }
    scene.textures.get(key).setFilter(1);
  }
}

export function sliceFrame(sheet, index) {
  const col = index % sheet.columns;
  const row = Math.floor(index / sheet.columns);
  const frame = blank(sheet.frameWidth, sheet.frameHeight);
  for (let y = 0; y < sheet.frameHeight; y += 1) {
    for (let x = 0; x < sheet.frameWidth; x += 1) {
      const sx = col * sheet.frameWidth + x;
      const sy = row * sheet.frameHeight + y;
      const si = (sy * sheet.width + sx) * 4;
      const di = (y * frame.width + x) * 4;
      frame.pixels[di] = sheet.pixels[si];
      frame.pixels[di + 1] = sheet.pixels[si + 1];
      frame.pixels[di + 2] = sheet.pixels[si + 2];
      frame.pixels[di + 3] = sheet.pixels[si + 3];
    }
  }
  return frame;
}

export function portraitUrlsFromTexture(texture, ids) {
  const urls = {};
  const source = texture.getSourceImage();
  ids.forEach((id, index) => {
    const frame = texture.get(index);
    const canvas = document.createElement('canvas');
    canvas.width = frame.width;
    canvas.height = frame.height;
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    context.drawImage(
      source,
      frame.cutX,
      frame.cutY,
      frame.width,
      frame.height,
      0,
      0,
      frame.width,
      frame.height
    );
    urls[id] = canvas.toDataURL();
  });
  return urls;
}

export function portraitDataUrls(portraits, ids) {
  const urls = {};
  ids.forEach((id, index) => {
    urls[id] = pixelsToCanvas(sliceFrame(portraits, index)).toDataURL();
  });
  return urls;
}
