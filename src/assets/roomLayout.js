import { tileNameGrid } from '../systems/movement/Pathfinding.js';
import { DESIGN_PIXEL } from './layout.js';

/** Design pixels per map tile. */
export const CELL = DESIGN_PIXEL;
/** Height of the wall-top strip above every wall face. */
export const CAP = 5;

const SOLID = new Set(['wall', 'window']);
const OPENINGS = new Set(['door', 'gate']);
const MATERIAL_BY_TILE = { storage: 'storage', toilet: 'toilet', vip: 'vip' };

/**
 * Reads the map the way the painter sees it. A door in a wall that runs
 * left-right ("h") sits in a wall face; a door in a wall that runs
 * up-down ("v") is an opening in the floor plan. A wall cell shows its
 * face when the cell below it is open floor.
 */
export function analyzeRoom(map) {
  const names = tileNameGrid(map);
  const rows = names.length;
  const cols = names[0].length;
  const nameAt = (x, y) => (x < 0 || y < 0 || x >= cols || y >= rows ? 'void' : names[y][x]);
  const structural = (x, y) => {
    const name = nameAt(x, y);
    return name === 'void' || SOLID.has(name) || OPENINGS.has(name);
  };

  const doors = [];
  const doorAt = new Map();
  const addDoor = (door) => {
    const orientation = structural(door.x - 1, door.y) && structural(door.x + 1, door.y) ? 'h' : 'v';
    const flip = door.kind === 'main' && orientation === 'v' && !structural(door.x - 1, door.y);
    const entry = { ...door, orientation, flip };
    doors.push(entry);
    doorAt.set(`${door.x},${door.y}`, entry);
  };
  addDoor({ kind: 'main', x: map.door.x, y: map.door.y, roomKind: 'hall' });
  for (const room of map.rooms ?? []) {
    if (room.gate) addDoor({ kind: 'gate', x: room.gate.x, y: room.gate.y, roomId: room.id, roomKind: room.kind });
  }

  const isOpen = (x, y) => {
    const name = nameAt(x, y);
    if (name === 'void' || SOLID.has(name)) return false;
    if (OPENINGS.has(name)) return doorAt.get(`${x},${y}`)?.orientation === 'v';
    return true;
  };
  const floorAt = (x, y) => (doorAt.has(`${x},${y}`) ? 'hall' : MATERIAL_BY_TILE[nameAt(x, y)] ?? 'hall');
  const styleAt = (x, y) => doorAt.get(`${x},${y}`)?.roomKind ?? floorAt(x, y);

  const cells = [];
  for (let y = 0; y < rows; y += 1) {
    const row = [];
    for (let x = 0; x < cols; x += 1) {
      const open = isOpen(x, y);
      const face = !open && isOpen(x, y + 1);
      row.push({
        name: names[y][x],
        open,
        face,
        material: open ? floorAt(x, y) : null,
        faceStyle: face ? styleAt(x, y + 1) : null,
        door: doorAt.get(`${x},${y}`) ?? null
      });
    }
    cells.push(row);
  }

  return {
    cols,
    rows,
    cells,
    doors,
    cell: (x, y) => cells[y]?.[x] ?? null,
    regions: (name) => regionsOf(names, name)
  };
}

/** Frame name in the `doors` sheet for a door from `analyzeRoom`. */
export function doorFrameName(door, open) {
  const side = door.orientation === 'h' ? 'H' : 'V';
  if (door.kind === 'main') return `entrance${open ? 'Open' : 'Closed'}${side}`;
  const style = door.roomKind === 'vip' ? 'rope' : 'door';
  return `${style}${open ? 'Open' : 'Locked'}${side}`;
}

/** Bounding boxes of 4-connected groups of one tile name. */
function regionsOf(names, name) {
  const rows = names.length;
  const cols = names[0].length;
  const seen = new Set();
  const out = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (names[y][x] !== name || seen.has(`${x},${y}`)) continue;
      const box = { x0: x, y0: y, x1: x, y1: y };
      const stack = [[x, y]];
      seen.add(`${x},${y}`);
      while (stack.length) {
        const [cx, cy] = stack.pop();
        box.x0 = Math.min(box.x0, cx);
        box.y0 = Math.min(box.y0, cy);
        box.x1 = Math.max(box.x1, cx);
        box.y1 = Math.max(box.y1, cy);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          if (names[ny][nx] !== name || seen.has(`${nx},${ny}`)) continue;
          seen.add(`${nx},${ny}`);
          stack.push([nx, ny]);
        }
      }
      out.push({ x: box.x0, y: box.y0, w: box.x1 - box.x0 + 1, h: box.y1 - box.y0 + 1 });
    }
  }
  return out;
}
