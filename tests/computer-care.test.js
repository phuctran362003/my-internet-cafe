import { describe, expect, it } from 'vitest';
import {
  DIRTY_THRESHOLD,
  checkComputerCareNeeds,
  markComputerBroken,
  openDirtyComputerIncident
} from '../src/systems/business/ComputerCareSystem.js';
import { applyComputerWear } from '../src/systems/business/UpgradeSystem.js';
import { applyEffects } from '../src/systems/event/EffectExecutor.js';
import { bareContext } from './helpers.js';

describe('computer care dialogs', () => {
  it('opens a repair dialog when a machine breaks', () => {
    const ctx = bareContext(() => 0.5);
    const pc = ctx.state.cafe.computers[0];
    markComputerBroken(ctx, pc);
    expect(pc.status).toBe('broken');
    expect(ctx.state.narrative.queue[0]?.id).toBe('computer_broken');
    const before = ctx.state.player.money;
    expect(ctx.events.choose('repair', ctx.state.narrative.queue[0].instanceId).ok).toBe(true);
    expect(pc.status).toBe('available');
    expect(pc.condition).toBe(100);
    expect(ctx.state.player.money).toBe(before - ctx.data.economy.repairCost);
    expect(ctx.state.narrative.queue).toHaveLength(0);
  });

  it('opens a cleaning dialog when a machine gets filthy', () => {
    const ctx = bareContext(() => 0.5);
    const pc = ctx.state.cafe.computers[1];
    pc.cleanliness = DIRTY_THRESHOLD;
    openDirtyComputerIncident(ctx, pc);
    expect(ctx.state.narrative.queue[0]?.id).toBe('computer_filthy');
    const before = ctx.state.player.money;
    expect(ctx.events.choose('clean', ctx.state.narrative.queue[0].instanceId).ok).toBe(true);
    expect(pc.cleanliness).toBe(100);
    expect(ctx.state.player.money).toBe(before - ctx.data.economy.cleanCost);
  });

  it('does not stack duplicate care dialogs for the same machine', () => {
    const ctx = bareContext(() => 0.5);
    const pc = ctx.state.cafe.computers[0];
    markComputerBroken(ctx, pc);
    markComputerBroken(ctx, pc);
    expect(ctx.state.narrative.queue.filter((event) => event.id === 'computer_broken')).toHaveLength(1);
  });

  it('prompts from dirty effects and end-of-day care checks', () => {
    const ctx = bareContext(() => 0.5);
    const pc = ctx.state.cafe.computers[2];
    pc.cleanliness = DIRTY_THRESHOLD + 5;
    applyEffects(
      [{ type: 'dirty_computer', amount: 20 }],
      { ...ctx, event: { context: { computerId: pc.id } } }
    );
    expect(pc.cleanliness).toBeLessThanOrEqual(DIRTY_THRESHOLD);
    expect(ctx.state.narrative.queue.some((event) => event.id === 'computer_filthy')).toBe(true);

    ctx.state.narrative.queue = [];
    ctx.state.cafe.incidents.forEach((incident) => { incident.resolved = true; });
    pc.cleanliness = DIRTY_THRESHOLD;
    checkComputerCareNeeds(ctx);
    expect(ctx.state.narrative.queue.some((event) => event.id === 'computer_filthy' && event.context.computerId === pc.id)).toBe(true);
  });

  it('breaks from damage effects and asks the owner to pay for repair', () => {
    const ctx = bareContext(() => 0.5);
    const pc = ctx.state.cafe.computers[0];
    pc.condition = 25;
    applyEffects(
      [{ type: 'damage_computer', amount: 20 }],
      { ...ctx, event: { context: { computerId: pc.id } } }
    );
    expect(pc.status).toBe('broken');
    expect(ctx.state.narrative.queue[0]?.id).toBe('computer_broken');
  });
});
