import { describe, expect, it } from 'vitest';
import { beginPayment, shouldSkipPayment, startMachine, tickCustomers } from '../src/systems/customer/CustomerAI.js';
import { recordVisit } from '../src/systems/customer/CustomerRelationshipSystem.js';
import { bareContext, sampleCustomer, testSession } from './helpers.js';

describe('customers', () => {
  it('only troublemakers skip payment on a failed roll', () => {
    expect(shouldSkipPayment(sampleCustomer({ archetype: 'student', skipChance: 0.9 }), 0)).toBe(false);
    expect(shouldSkipPayment(sampleCustomer({ archetype: 'troublemaker', skipChance: 0.65 }), 0.1)).toBe(true);
    expect(shouldSkipPayment(sampleCustomer({ archetype: 'troublemaker', skipChance: 0.65 }), 0.9)).toBe(false);
    expect(shouldSkipPayment(sampleCustomer({ archetype: 'student', forceSkip: true }), 0.99)).toBe(true);
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

  it('keeps the clock stopped until the owner starts the machine', () => {
    const ctx = bareContext(() => 0.5);
    const pc = ctx.state.cafe.computers[0];
    const customer = sampleCustomer({
      state: 'waiting',
      waitLeft: 40,
      sessionMinutes: 0,
      plannedMinutes: 30,
      targetComputerId: pc.id
    });
    pc.occupantId = customer.id;
    pc.status = 'occupied';
    ctx.state.cafe.customers = [customer];
    tickCustomers(ctx, 10);
    expect(customer.sessionMinutes).toBe(0);
    expect(customer.state).toBe('waiting');
    expect(startMachine(ctx, customer.id).ok).toBe(true);
    tickCustomers(ctx, 10);
    expect(customer.state).toBe('playing');
    expect(customer.sessionMinutes).toBeGreaterThan(9);

    const impatient = sampleCustomer({
      id: 'c2',
      name: 'Bình',
      state: 'waiting',
      waitLeft: 4,
      targetComputerId: pc.id
    });
    pc.occupantId = impatient.id;
    ctx.state.cafe.customers = [impatient];
    tickCustomers(ctx, 5);
    expect(impatient.state).toBe('leaving');
    expect(impatient.leaveReason).toBe('ignored');
  });

  it('remembers a customer by name across visits', () => {
    const ctx = bareContext();
    recordVisit(ctx.state, sampleCustomer({ id: 'a', name: 'An', billPaid: 10000, satisfaction: 80 }));
    recordVisit(ctx.state, sampleCustomer({ id: 'b', name: 'An', billPaid: 5000, satisfaction: 80 }));
    expect(ctx.state.cafe.relationships.an.visits).toBe(2);
    expect(ctx.state.cafe.relationships.an.spent).toBe(15000);
  });

  it('never double-books a computer', () => {
    const session = testSession(8);
    session.newGame(8);
    session.closeGuide();
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
