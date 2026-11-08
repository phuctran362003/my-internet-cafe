import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data/loadGameData.js';
import { progressMember, treatMember } from '../src/systems/family/FamilyHealth.js';
import { settleFamilyDay } from '../src/systems/family/FamilySurvival.js';
import { bareContext } from './helpers.js';
import { evaluateFamilyEvents } from '../src/systems/event/EventSystem.js';

describe('family', () => {
  it('consumes food for living members and settles once', () => {
    const ctx = bareContext();
    ctx.state.family.members.find((member) => member.id === 'child').status = 'deceased';
    ctx.state.family.members.find((member) => member.id === 'child').health = 0;
    ctx.state.player.money = 0;
    ctx.state.family.resources.food = 0;
    ctx.state.family.autoPayFood = false;
    ctx.state.family.autoPayHeat = false;
    const first = settleFamilyDay(ctx);
    expect(first.skipped).toBe(false);
    expect(ctx.state.family.resources.food).toBe(0);
    expect(ctx.state.family.members.find((member) => member.id === 'wife').hunger).toBe(1);
    expect(ctx.state.family.members.find((member) => member.id === 'child').hunger).toBe(0);
    expect(settleFamilyDay(ctx).skipped).toBe(true);
  });

  it('gets sick, recovers with medicine, and dies only after very sick persists', () => {
    const config = loadGameData().survival;
    const member = {
      id: 'child',
      health: 40,
      hunger: 3,
      cold: 0,
      sicknessLevel: 0,
      daysVerySick: 0,
      treatmentDelayed: false,
      status: 'hungry'
    };
    progressMember(member, config);
    expect(member.status).toBe('sick');
    expect(treatMember(member, config)).toBe(true);
    expect(member.sicknessLevel).toBe(0);
    expect(treatMember({ ...member, status: 'deceased', health: 0 }, config)).toBe(false);

    const critical = {
      health: 40,
      hunger: 3,
      cold: 0,
      sicknessLevel: 5,
      daysVerySick: 1,
      treatmentDelayed: false,
      status: 'very_sick'
    };
    progressMember(critical, config);
    expect(critical.status).toBe('deceased');
    progressMember(critical, config);
    expect(critical.health).toBe(0);
    expect(critical.status).toBe('deceased');
  });

  it('queues a child sickness dialog once', () => {
    const ctx = bareContext();
    const before = ctx.state.family.members.map((member) => ({ ...member }));
    const child = ctx.state.family.members.find((member) => member.id === 'child');
    child.status = 'sick';
    evaluateFamilyEvents(ctx, before);
    evaluateFamilyEvents(ctx, before);
    expect(ctx.state.narrative.queue.map((event) => event.id)).toEqual(['child_sick']);
    const healthBefore = child.health;
    expect(ctx.events.choose('delay', ctx.state.narrative.queue[0].instanceId).ok).toBe(true);
    expect(ctx.state.narrative.flags.child_treatment_delayed).toBe(true);
    expect(child.treatmentDelayed).toBe(true);
    expect(child.health).toBeLessThan(healthBefore);
  });
});
