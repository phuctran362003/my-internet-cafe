import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/state/createInitialState.js';
import { loadGameData } from '../src/data/loadGameData.js';
import { createTimeSystem } from '../src/systems/simulation/TimeSystem.js';
import { testSession, playUntilDayEnd } from './helpers.js';

describe('time', () => {
  it('pauses and scales speed', () => {
    const data = loadGameData();
    const state = createInitialState(data, 1);
    state.meta.started = true;
    const time = createTimeSystem({ state, data });
    const one = time.advance(1000, 1);
    const two = time.advance(1000, 2);
    expect(two).toBeCloseTo(one * 2, 5);
    state.meta.pauseReasons.user = true;
    expect(time.advance(5000, 3)).toBe(0);
  });

  it('records daily obligations once', () => {
    const session = testSession(4);
    session.newGame(4);
    playUntilDayEnd(session);
    expect(session.state.meta.dayEnded).toBe(true);
    const rents = session.state.economy.transactions.filter((row) => row.category === 'rent');
    expect(rents).toHaveLength(1);
    const money = session.state.player.money;
    session.update(5000);
    session.endDay();
    session.update(5000);
    expect(session.state.economy.transactions.filter((row) => row.category === 'rent')).toHaveLength(1);
    expect(session.state.player.money).toBe(money);
    expect(session.state.family.lastSettledDay).toBe(1);
  });
});
