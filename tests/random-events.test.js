import { describe, expect, it } from 'vitest';
import { beginPayment } from '../src/systems/customer/CustomerAI.js';
import { openRandomEvent, pickRandomEvent, tickRandomEvents } from '../src/systems/event/RandomEventSystem.js';
import { bareContext, playUntilDayEnd, sampleCustomer, testSession } from './helpers.js';

describe('random events', () => {
  it('ships a mixed catalog and resolves every choice', () => {
    const ctx = bareContext(() => 0.4);
    const defs = ctx.data.randomEvents;
    const ids = defs.map((def) => def.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(defs.filter((def) => def.tone === 'adverse').length).toBeGreaterThanOrEqual(12);
    expect(defs.filter((def) => def.tone === 'beneficial').length).toBeGreaterThanOrEqual(12);

    for (const def of defs) {
      expect(def.choices.some((choice) => choice.id === 'ignore')).toBe(true);
      expect(new Set(def.choices.map((choice) => choice.id)).size).toBe(def.choices.length);
      for (const choice of def.choices) {
        stage(ctx, def);
        if (choice.requires === 'guard') {
          ctx.state.cafe.employees.push({ id: 'guard', role: 'guard', name: 'Bảo vệ', reactionMinutes: 12 });
        }
        const event = openRandomEvent(ctx, def);
        expect(event, def.id).toBeTruthy();
        expect(ctx.events.choose(choice.id, event.instanceId).ok, `${def.id}:${choice.id}`).toBe(true);
      }
    }
  });

  it('pays a tip and lets a power cut scar a machine', () => {
    const ctx = bareContext(() => 0.5);
    const tip = ctx.data.randomEvents.find((def) => def.id === 'fat_tip');
    stage(ctx, tip);
    const before = ctx.state.player.money;
    const event = openRandomEvent(ctx, tip);
    const take = event.choices.find((choice) => choice.effects.some((effect) => effect.type === 'add_money'));
    expect(ctx.events.choose(take.id, event.instanceId).ok).toBe(true);
    expect(ctx.state.player.money).toBeGreaterThan(before);

    const flicker = ctx.data.randomEvents.find((def) => def.id === 'power_flicker');
    stage(ctx, flicker);
    const incident = openRandomEvent(ctx, flicker);
    const pc = ctx.state.cafe.computers.find((item) => item.id === incident.context.computerId);
    const condition = pc.condition;
    expect(ctx.events.choose('ignore', incident.instanceId).ok).toBe(true);
    expect(pc.condition).toBeLessThan(condition);
  });

  it('turns a trusted fake transfer into a skipped bill', () => {
    const ctx = bareContext(() => 0.99);
    const def = ctx.data.randomEvents.find((item) => item.id === 'fake_transfer');
    stage(ctx, def);
    const event = openRandomEvent(ctx, def);
    expect(ctx.events.choose('trust', event.instanceId).ok).toBe(true);
    const customer = ctx.state.cafe.customers.find((item) => item.forceSkip);
    beginPayment(ctx, customer);
    expect(customer.state).toBe('incident');
    expect(ctx.state.narrative.queue.some((item) => item.id === 'skip_payment')).toBe(true);
  });

  it('alternates good and bad draws and holds one at a time', () => {
    const ctx = bareContext(() => 0.37);
    const tones = new Set();
    for (let i = 0; i < 8; i += 1) {
      const def = pickRandomEvent(ctx);
      expect(def).toBeTruthy();
      tones.add(def.tone);
      ctx.state.narrative.cooldowns[def.id] = ctx.state.meta.currentDay;
      ctx.state.narrative.eventHistory.push({
        id: def.id,
        day: ctx.state.meta.currentDay,
        tone: def.tone,
        source: 'random'
      });
    }
    expect(tones.has('adverse')).toBe(true);
    expect(tones.has('beneficial')).toBe(true);

    ctx.state.narrative.queue = [];
    ctx.state.cafe.nextEventIn = 1;
    tickRandomEvents(ctx, 2);
    expect(ctx.state.narrative.queue).toHaveLength(1);
    const openId = ctx.state.narrative.queue[0].instanceId;
    ctx.state.cafe.nextEventIn = 0;
    tickRandomEvents(ctx, 40);
    expect(ctx.state.narrative.queue.map((event) => event.instanceId)).toEqual([openId]);
  });

  it('fills a day with several different beats', () => {
    const session = testSession(2);
    session.newGame(2);
    playUntilDayEnd(session);
    expect(session.state.meta.dayEnded).toBe(true);
    const beats = session.state.narrative.eventHistory.filter((event) => event.source === 'random');
    const tones = new Set(beats.map((event) => event.tone));
    expect(beats.length).toBeGreaterThanOrEqual(6);
    expect(beats.length).toBeLessThanOrEqual(10);
    expect(new Set(beats.map((event) => event.id)).size).toBe(beats.length);
    expect(tones.has('adverse')).toBe(true);
    expect(tones.has('beneficial')).toBe(true);
  });
});

function stage(ctx, def) {
  ctx.state.narrative.queue = [];
  ctx.state.meta.pauseReasons.event = false;
  ctx.state.player.money = 5000000;
  ctx.state.economy.debt = 0;
  ctx.state.family.resources.food = 5;
  ctx.state.family.resources.medicine = 5;
  const period = ctx.data.simulation.periods.find((item) => item.id === (def.periods?.[0] ?? 'evening'));
  ctx.state.meta.currentTime = period.start + 1;
  ctx.state.cafe.employees = def.needsRole ? [{ id: 'staff', role: def.needsRole, name: 'Nhân viên' }] : [];
  for (const pc of ctx.state.cafe.computers) {
    if (pc.status === 'locked' || pc.status === 'disabled') continue;
    pc.occupantId = null;
    pc.condition = 80;
    pc.cleanliness = 80;
    if (pc.status === 'broken' || pc.status === 'occupied') pc.status = 'available';
  }
  const types = def.archetypes?.length ? def.archetypes : ['student', 'gamer'];
  const pcs = ctx.state.cafe.computers.filter((pc) => pc.status === 'available');
  ctx.state.cafe.customers = [0, 1].map((index) => sampleCustomer({
    id: `c${index}`,
    name: index === 0 ? 'An' : 'Bình',
    archetype: types[Math.min(index, types.length - 1)],
    state: 'playing',
    targetComputerId: pcs[index].id,
    sessionMinutes: 50,
    plannedMinutes: 80,
    incidentId: null,
    forceSkip: false,
    x: pcs[index].seatX,
    y: pcs[index].seatY
  }));
  pcs[0].occupantId = 'c0';
  pcs[0].status = 'occupied';
  pcs[1].occupantId = 'c1';
  pcs[1].status = 'occupied';
}
