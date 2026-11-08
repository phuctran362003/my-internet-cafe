import { GameEvents } from '../../core/EventBus.js';

export function ensureRooms(state, map) {
  state.cafe.rooms = state.cafe.rooms ?? {};
  for (const room of map.rooms ?? []) {
    if (typeof state.cafe.rooms[room.id] !== 'boolean') state.cafe.rooms[room.id] = false;
  }
  return state.cafe.rooms;
}

export function isRoomUnlocked(state, roomId) {
  return Boolean(state.cafe?.rooms?.[roomId]);
}

export function roomTiles(room) {
  const tiles = [];
  const area = room.area;
  for (let y = area.y; y < area.y + area.h; y += 1) {
    for (let x = area.x; x < area.x + area.w; x += 1) tiles.push({ x, y });
  }
  if (room.gate && !tiles.some((tile) => tile.x === room.gate.x && tile.y === room.gate.y)) {
    tiles.push({ x: room.gate.x, y: room.gate.y });
  }
  return tiles;
}

export function lockedRoomAt(map, state, x, y) {
  for (const room of map.rooms ?? []) {
    if (isRoomUnlocked(state, room.id)) continue;
    if (roomTiles(room).some((tile) => tile.x === x && tile.y === y)) return room;
  }
  return null;
}

export function unlockRoom(ctx, id) {
  const room = (ctx.data.map.rooms ?? []).find((item) => item.id === id);
  if (!room) return { ok: false, reason: 'unknown' };
  ensureRooms(ctx.state, ctx.data.map);
  if (ctx.state.cafe.rooms[id]) return { ok: false, reason: 'open' };
  const paid = ctx.economy.debit(room.cost, 'upgrade', `Mở ${room.name}`);
  if (!paid) return { ok: false, reason: 'money' };
  ctx.state.cafe.rooms[id] = true;
  for (const pc of ctx.state.cafe.computers) {
    if (pc.room === id && pc.status === 'locked') pc.status = 'available';
  }
  ctx.state.narrative.flags[`room_${id}`] = true;
  ctx.bus.emit(GameEvents.ROOM_UNLOCKED, { id, name: room.name });
  return { ok: true, name: room.name, id };
}
