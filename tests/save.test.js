import { describe, expect, it } from 'vitest';
import { bareContext, testSession } from './helpers.js';
import { migrateSave, validateSave } from '../src/systems/save/SaveSerializer.js';

describe('events and save', () => {
  it('rejects unknown effects and missing medicine', () => {
    const ctx = bareContext();
    ctx.state.family.resources.medicine = 0;
    ctx.state.player.money = 0;
    ctx.state.narrative.queue.push({
      instanceId: 'e1',
      id: 'custom',
      category: 'family',
      priority: 'urgent',
      pause: true,
      title: 'Test',
      description: 'Test',
      resolved: false,
      context: { memberId: 'child' },
      choices: [{ id: 'bad', label: 'Bad', effects: [{ type: 'run_code' }] }]
    });
    expect(ctx.events.choose('bad', 'e1').ok).toBe(false);
    expect(ctx.state.narrative.queue).toHaveLength(1);
  });

  it('names the owner before the cafe opens', () => {
    const session = testSession(3);
    session.openFounding();
    expect(session.ui.screen).toBe('naming');
    expect(session.state.meta.started).toBe(false);
    session.cancelFounding();
    expect(session.ui.screen).toBe('menu');
    session.openFounding();
    expect(session.foundCafe({ playerName: ' ', cafeName: 'A' }).ok).toBe(false);
    expect(session.foundCafe({ playerName: 'Minh Trí', cafeName: 'NET LAG ÍT' }, 9).ok).toBe(true);
    expect(session.state.player.name).toBe('Minh Trí');
    expect(session.state.cafe.name).toBe('NET LAG ÍT');
    expect(session.state.family.members.find((member) => member.id === 'player').name).toBe('Minh Trí');
    expect(session.ui.screen).toBe('playing');
    expect(session.state.meta.started).toBe(true);
  });

  it('saves and loads family, ledger, and version', async () => {
    const session = testSession(3);
    session.newGame(3);
    session.state.player.money = 123456;
    session.state.family.resources.medicine = 4;
    const saved = await session.save(2);
    expect(saved.ok).toBe(true);
    session.state.player.money = 1;
    const loaded = await session.load(2);
    expect(loaded.ok).toBe(true);
    expect(session.state.player.money).toBe(123456);
    expect(session.state.family.resources.medicine).toBe(4);
    expect(session.state.meta.started).toBe(true);

    const legacy = migrateSave({ player: { money: 10 }, meta: { currentDay: 2 }, cafe: { computers: session.state.cafe.computers }, economy: {}, family: { members: session.state.family.members }, narrative: {} });
    expect(legacy.meta.version).toBe(1);
    expect(validateSave(legacy).ok).toBe(true);
    expect(validateSave({ meta: {} }).ok).toBe(false);
  });
});
