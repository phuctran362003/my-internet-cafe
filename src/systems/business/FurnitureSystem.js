import { GameEvents } from '../../core/EventBus.js';
import { buildWalkGrid, findPath, tileNameGrid } from '../movement/Pathfinding.js';
import { lockedRoomAt } from './RoomSystem.js';

const PLACEABLE = new Set(['floor', 'floorAlt', 'rug', 'vip']);

export function ensureFurniture(state, data) {
  if (!Array.isArray(state.cafe.furniture)) {
    state.cafe.furniture = (data.map.props ?? []).map((prop, index) => ({
      id: `furn_${index + 1}`,
      type: prop.type,
      x: prop.x,
      y: prop.y
    }));
  }
  let max = state.cafe.furnitureSeq ?? 0;
  for (const piece of state.cafe.furniture) {
    const num = Number(String(piece.id).replace('furn_', ''));
    if (Number.isFinite(num)) max = Math.max(max, num);
  }
  state.cafe.furnitureSeq = max;
  state.cafe.furnitureBag = state.cafe.furnitureBag ?? {};
  for (const item of data.furniture ?? []) {
    if (typeof state.cafe.furnitureBag[item.id] !== 'number') state.cafe.furnitureBag[item.id] = 0;
  }
  return state.cafe.furniture;
}

export function furnitureAt(state, x, y) {
  return state.cafe.furniture?.find((piece) => piece.x === x && piece.y === y) ?? null;
}

export function canPlace(ctx, x, y, ignoreId = null) {
  const map = ctx.data.map;
  const names = tileNameGrid(map);
  if (y < 0 || x < 0 || y >= names.length || x >= names[0].length) return false;
  if (!PLACEABLE.has(names[y][x])) return false;
  if (lockedRoomAt(map, ctx.state, x, y)) return false;
  if (x === map.entrance.x && y === map.entrance.y) return false;
  if (x === map.exit.x && y === map.exit.y) return false;
  if (x === map.door.x && y === map.door.y) return false;
  if (ctx.state.cafe.computers.some((pc) => (
    (pc.x === x && pc.y === y) || (pc.seatX === x && pc.seatY === y)
  ))) return false;
  if ((ctx.state.cafe.furniture ?? []).some((piece) => piece.id !== ignoreId && piece.x === x && piece.y === y)) return false;
  for (const spec of Object.values(ctx.data.staff ?? {})) {
    if (spec.post && spec.post.x === x && spec.post.y === y) return false;
  }
  if (ctx.state.cafe.customers.some((customer) => Math.round(customer.x) === x && Math.round(customer.y) === y)) return false;

  const furniture = (ctx.state.cafe.furniture ?? []).filter((piece) => piece.id !== ignoreId);
  furniture.push({ id: ignoreId || 'probe', type: 'plant', x, y });
  const grid = buildWalkGrid(map, { ...ctx.state, cafe: { ...ctx.state.cafe, furniture } });
  if (!findPath(grid, map.entrance, map.exit)) return false;
  for (const pc of ctx.state.cafe.computers) {
    if (pc.status === 'locked' || lockedRoomAt(map, ctx.state, pc.seatX, pc.seatY)) continue;
    if (!findPath(grid, map.entrance, { x: pc.seatX, y: pc.seatY })) return false;
  }
  return true;
}

export function placeFurniture(ctx, type, x, y) {
  ensureFurniture(ctx.state, ctx.data);
  const spec = ctx.data.furniture.find((item) => item.id === type);
  if (!spec) return { ok: false, reason: 'type' };
  if (!canPlace(ctx, x, y, null)) return { ok: false, reason: 'tile' };
  const bag = ctx.state.cafe.furnitureBag;
  if ((bag[type] ?? 0) > 0) bag[type] -= 1;
  else {
    const paid = ctx.economy.debit(spec.cost, 'furniture', `Mua ${spec.name}`);
    if (!paid) return { ok: false, reason: 'money' };
  }
  ctx.state.cafe.furnitureSeq += 1;
  const id = `furn_${ctx.state.cafe.furnitureSeq}`;
  ctx.state.cafe.furniture.push({ id, type, x, y });
  ctx.bus.emit(GameEvents.FURNITURE_CHANGED, { action: 'place', id });
  return { ok: true, id };
}

export function moveFurniture(ctx, id, x, y) {
  const piece = ctx.state.cafe.furniture.find((item) => item.id === id);
  if (!piece) return { ok: false, reason: 'missing' };
  if (piece.x === x && piece.y === y) return { ok: true, id };
  if (!canPlace(ctx, x, y, id)) return { ok: false, reason: 'tile' };
  piece.x = x;
  piece.y = y;
  ctx.bus.emit(GameEvents.FURNITURE_CHANGED, { action: 'move', id });
  return { ok: true, id };
}

export function stashFurniture(ctx, id) {
  ensureFurniture(ctx.state, ctx.data);
  const piece = ctx.state.cafe.furniture.find((item) => item.id === id);
  if (!piece) return { ok: false, reason: 'missing' };
  ctx.state.cafe.furniture = ctx.state.cafe.furniture.filter((item) => item.id !== id);
  ctx.state.cafe.furnitureBag[piece.type] = (ctx.state.cafe.furnitureBag[piece.type] ?? 0) + 1;
  ctx.bus.emit(GameEvents.FURNITURE_CHANGED, { action: 'stash', id });
  return { ok: true, type: piece.type };
}
