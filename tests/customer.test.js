import { describe, expect, it } from 'vitest';
import { shouldSkipPayment } from '../src/systems/customer/CustomerAI.js';
import { bareContext, sampleCustomer, testSession } from './helpers.js';
import { beginPayment } from '../src/systems/customer/CustomerAI.js';

describe('customers', () => {
  it('only troublemakers skip payment on a failed roll', () => {
    expect(shouldSkipPayment(sampleCustomer({ archetype: 'student', skipChance: 0.9 }), 0)).toBe(false);
    expect(shouldSkipPayment(sampleCustomer({ archetype: 'troublemaker', skipChance: 0.65 }), 0.1)).toBe(true);
    expect(shouldSkipPayment(sampleCustomer({ archetype: 'troublemaker', skipChance: 0.65 }), 0.9)).toBe(false);
  });

  it('opens one incident and resolves it once', () => {
    const ctx = bareContext(() => 0);
    const customer = sampleCustomer({ archetype: 'troublemaker', skipChance: 1, money: 20000 });
    const pc = ctx.state.cafe.computers[0];
    pc.occupantId = customer.id;
    pc.status = 'occupied';
    ctx.state.cafe.customers = [customer];
    beginPayment(ctx, customer);
    expect(customer.state).toBe('incident');
    expect(ctx.state.narrative.queue).toHaveLength(1);
    const event = ctx.state.narrative.queue[0];
    expect(ctx.events.choose('accept_loss', event.instanceId).ok).toBe(true);
    expect(ctx.events.choose('accept_loss', event.instanceId).ok).toBe(false);
    expect(ctx.state.player.money).toBe(5000000);
  });

  it('never double-books a computer', () => {
    const session = testSession(8);
    session.newGame(8);
    for (const pc of session.state.cafe.computers) {
      if (pc.id !== 'pc1') pc.status = 'disabled';
    }
    for (let i = 0; i < 120; i += 1) {
      const event = session.state.narrative.queue[0];
      if (event) session.choose('accept_loss', event.instanceId);
      session.update(400);
      const holders = session.state.cafe.computers.map((pc) => pc.occupantId).filter(Boolean);
      expect(new Set(holders).size).toBe(holders.length);
    }
  });
});
