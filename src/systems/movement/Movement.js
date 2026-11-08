export function advanceAlongPath(entity, minutes, tilesPerMinute) {
  let budget = minutes * tilesPerMinute;
  if (!entity.path) return false;
  while (budget > 0 && entity.pathIndex < entity.path.length) {
    const target = entity.path[entity.pathIndex];
    const dx = target.x - entity.x;
    const dy = target.y - entity.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      entity.x = target.x;
      entity.y = target.y;
      entity.pathIndex += 1;
      continue;
    }
    if (Math.abs(dx) > Math.abs(dy)) entity.facing = dx > 0 ? 'right' : 'left';
    else entity.facing = dy > 0 ? 'down' : 'up';
    const step = Math.min(budget, dist);
    entity.x += (dx / dist) * step;
    entity.y += (dy / dist) * step;
    budget -= step;
    if (step >= dist - 0.0001) {
      entity.x = target.x;
      entity.y = target.y;
      entity.pathIndex += 1;
    }
  }
  return entity.pathIndex >= entity.path.length;
}
