import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data/loadGameData.js';
import { createInitialState } from '../src/state/createInitialState.js';
import { buildWalkGrid, findPath, routeTo } from '../src/systems/movement/Pathfinding.js';

describe('pathfinding', () => {
  it('walks from the door to every seat and refuses walls', () => {
    const data = loadGameData();
    const state = createInitialState(data, 1);
    for (const row of data.map.rows) expect(row).toHaveLength(data.map.rows[0].length);
    const grid = buildWalkGrid(data.map, state);
    expect(grid[0][0]).toBe(1);
    for (const pc of state.cafe.computers) {
      expect(grid[pc.y][pc.x]).toBe(1);
      const path = findPath(grid, data.map.entrance, { x: pc.seatX, y: pc.seatY });
      expect(path?.length).toBeGreaterThan(1);
      expect(path.at(-1)).toEqual({ x: pc.seatX, y: pc.seatY });
      expect(path.some((step) => grid[step.y][step.x] === 1)).toBe(false);
    }
    expect(routeTo(data.map, state, data.map.entrance, data.map.exit, 'nobody')).toBeTruthy();
  });
});
