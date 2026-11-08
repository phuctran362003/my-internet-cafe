import { describe, expect, it } from 'vitest';
import { speechAnchor } from '../src/ui/speechAnchor.js';

const ROOM_W = 22 * 64;
const ROOM_H = 16 * 64;
const SCALE = 1.15;

describe('speech bubble anchor', () => {
  it('follows the camera when the viewport is larger than the room', () => {
    const camera = {
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      zoomX: 1,
      zoomY: 1,
      width: ROOM_W * SCALE,
      height: ROOM_H * SCALE
    };
    const canvas = { left: 10, top: 20, width: camera.width / 2, height: camera.height / 2 };
    const host = { left: 0, top: 0 };
    const point = speechAnchor(544, 220, camera, canvas, host);
    expect(point.left).toBeCloseTo(10 + 544 * 0.5, 5);
    expect(point.top).toBeCloseTo(20 + 220 * 0.5, 5);
    const stretched = {
      left: canvas.left + (544 / ROOM_W) * canvas.width,
      top: canvas.top + (220 / ROOM_H) * canvas.height
    };
    expect(Math.hypot(point.left - stretched.left, point.top - stretched.top)).toBeGreaterThan(30);
  });

  it('keeps a bubble above a high character on screen when the camera is zoomed out', () => {
    const camera = {
      x: 0,
      y: 0,
      scrollX: 254,
      scrollY: 190,
      zoomX: 0.629,
      zoomY: 0.629,
      originX: 0.5,
      originY: 0.5,
      width: 1022,
      height: 644
    };
    const canvas = { left: 8, top: 52, width: 1022, height: 644 };
    const point = speechAnchor(544, 92, camera, canvas, { left: 0, top: 0 });
    expect(point.left).toBeCloseTo(380, 0);
    expect(point.top).toBeCloseTo(109.8, 0);
    const clippedByTopLeftZoom = 52 + (92 - 190) * 0.629;
    expect(clippedByTopLeftZoom).toBeLessThan(0);
  });

  it('includes a centered camera scroll', () => {
    const camera = {
      scrollX: (ROOM_W - ROOM_W * SCALE) / 2,
      scrollY: (ROOM_H - ROOM_H * SCALE) / 2,
      zoomX: 1,
      zoomY: 1,
      width: ROOM_W * SCALE,
      height: ROOM_H * SCALE
    };
    const canvas = { left: 0, top: 0, width: camera.width, height: camera.height };
    const point = speechAnchor(544, 220, camera, canvas, { left: 0, top: 0 });
    expect(point.left).toBeCloseTo(544 - camera.scrollX, 5);
    expect(point.top).toBeCloseTo(220 - camera.scrollY, 5);
  });
});
