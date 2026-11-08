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

  it('stops at 22:00 and waits for the closing prompt', () => {
    const session = testSession(7);
    session.newGame(7);
    session.closeGuide();
    session.state.meta.currentTime = session.data.simulation.dayEndMinute - 5;
    for (let i = 0; i < 20 && !session.state.meta.pendingDayEnd; i += 1) {
      session.update(3000);
    }
    expect(session.state.meta.currentTime).toBe(1320);
    expect(session.state.meta.pendingDayEnd).toBe(true);
    expect(session.state.meta.dayEnded).toBe(false);
    expect(session.state.cafe.open).toBe(false);
    expect(session.confirmEndDay().ok).toBe(true);
    expect(session.state.meta.dayEnded).toBe(true);
    expect(session.ui.screen).toBe('report');
    expect(session.continueDay().ok).toBe(true);
    expect(session.state.meta.currentDay).toBe(2);
    expect(session.state.meta.currentTime).toBe(420);
  });
});
