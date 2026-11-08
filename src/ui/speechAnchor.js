/**
 * CSS left/top of a world point on the speech layer.
 * The canvas is the camera viewport (it can be larger than the room), so the
 * point has to go through scroll and zoom before it is scaled into the canvas box.
 * @param {number} worldX
 * @param {number} worldY
 * @param {{ x?: number, y?: number, scrollX: number, scrollY: number, zoomX: number, zoomY: number, width: number, height: number }} camera
 * @param {{ left: number, top: number, width: number, height: number }} canvas
 * @param {{ left: number, top: number }} host
 */
export function speechAnchor(worldX, worldY, camera, canvas, host) {
  const zoomX = camera.zoomX;
  const zoomY = camera.zoomY;
  const originX = camera.width * (camera.originX ?? 0.5);
  const originY = camera.height * (camera.originY ?? 0.5);
  // Phaser zooms around the viewport center, then scrolls in world space.
  const screenX = (camera.x ?? 0) + originX + (worldX - camera.scrollX - originX) * zoomX;
  const screenY = (camera.y ?? 0) + originY + (worldY - camera.scrollY - originY) * zoomY;
  return {
    left: canvas.left - host.left + screenX * (canvas.width / camera.width),
    top: canvas.top - host.top + screenY * (canvas.height / camera.height)
  };
}
