import { isRoomUnlocked, roomTiles } from '../business/RoomSystem.js';

const BLOCKING = new Set(['wall', 'window', 'counter']);

export const CHAR_TO_TILE = {
  '.': 'floor',
  ',': 'floorAlt',
  '#': 'wall',
  D: 'door',
  W: 'window',
  C: 'counter',
  S: 'storage',
  T: 'toilet',
  R: 'rug',
  V: 'vip',
  G: 'gate'
};

export function tileNameGrid(map) {
  return map.rows.map((row) => [...row].map((ch) => {
    const name = CHAR_TO_TILE[ch];
    if (!name) throw new Error(`Unknown map character ${ch}`);
    return name;
  }));
}

export function buildWalkGrid(map, state) {
  const names = tileNameGrid(map);
  const grid = names.map((row) => row.map((name) => (BLOCKING.has(name) ? 1 : 0)));
  for (const pc of state.cafe.computers) grid[pc.y][pc.x] = 1;
  for (const room of map.rooms ?? []) {
    if (isRoomUnlocked(state, room.id)) continue;
    for (const tile of roomTiles(room)) {
      if (grid[tile.y]?.[tile.x] != null) grid[tile.y][tile.x] = 1;
    }
  }
  for (const piece of state.cafe.furniture ?? []) {
    if (grid[piece.y]?.[piece.x] != null) grid[piece.y][piece.x] = 1;
  }
  return grid;
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function findPath(grid, start, goal) {
  if (!inside(grid, start) || !inside(grid, goal)) return null;
  if (blocked(grid, goal) || blocked(grid, start)) return null;
  const key = (x, y) => `${x},${y}`;
  const open = [{ x: start.x, y: start.y }];
  const openSet = new Set([key(start.x, start.y)]);
  const closed = new Set();
  const came = new Map();
  const gScore = new Map([[key(start.x, start.y), 0]]);
  const fScore = new Map([[key(start.x, start.y), heuristic(start, goal)]]);

  while (open.length) {
    open.sort((a, b) => fScore.get(key(a.x, a.y)) - fScore.get(key(b.x, b.y)));
    const current = open.shift();
    const currentKey = key(current.x, current.y);
    openSet.delete(currentKey);
    if (current.x === goal.x && current.y === goal.y) return reconstruct(came, current);
    closed.add(currentKey);
    for (const [dx, dy] of DIRS) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (!inside(grid, next) || blocked(grid, next)) continue;
      const nextKey = key(next.x, next.y);
      if (closed.has(nextKey)) continue;
      const tentative = gScore.get(currentKey) + 1;
      if (tentative >= (gScore.get(nextKey) ?? Infinity)) continue;
      came.set(nextKey, current);
      gScore.set(nextKey, tentative);
      fScore.set(nextKey, tentative + heuristic(next, goal));
      if (!openSet.has(nextKey)) {
        open.push(next);
        openSet.add(nextKey);
      }
    }
  }
  return null;
}

export function routeTo(map, state, from, goal, ignoreId) {
  const base = buildWalkGrid(map, state);
  const crowded = base.map((row) => row.slice());
  for (const other of state.cafe.customers) {
    if (other.id === ignoreId) continue;
    const x = Math.round(other.x);
    const y = Math.round(other.y);
    if (crowded[y] && crowded[y][x] === 0) crowded[y][x] = 1;
  }
  crowded[goal.y][goal.x] = 0;
  crowded[from.y][from.x] = 0;
  return findPath(crowded, from, goal) ?? findPath(base, from, goal);
}

function inside(grid, point) {
  return point.y >= 0 && point.y < grid.length && point.x >= 0 && point.x < grid[0].length;
}

function blocked(grid, point) {
  return grid[point.y][point.x] === 1;
}

function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function reconstruct(came, current) {
  const path = [current];
  let key = `${current.x},${current.y}`;
  while (came.has(key)) {
    current = came.get(key);
    path.push(current);
    key = `${current.x},${current.y}`;
  }
  return path.reverse();
}
