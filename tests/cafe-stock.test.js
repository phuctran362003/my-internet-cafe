import { describe, expect, it } from 'vitest';
import { tickCustomers } from '../src/systems/customer/CustomerAI.js';
import { bareContext, sampleCustomer } from './helpers.js';

describe('cafe snack stock', () => {
  it('sells the craving item and boosts satisfaction', () => {
    const ctx = bareContext(() => 0);
    for (const id of Object.keys(ctx.state.cafe.inventory)) ctx.state.cafe.inventory[id] = 0;
    ctx.state.cafe.inventory.drink = 2;
    const pc = ctx.state.cafe.computers[0];
    pc.occupantId = 'c1';
    pc.status = 'occupied';
    const customer = sampleCustomer({
      id: 'c1',
      state: 'playing',
      sessionMinutes: 10,
      plannedMinutes: 60,
      money: 100000,
      foodChance: 1,
      ordered: false,
      cravingId: 'drink',
      satisfaction: 70,
      targetComputerId: pc.id
    });
    ctx.state.cafe.customers = [customer];
    const before = ctx.state.player.money;
    tickCustomers(ctx, 1);
    expect(customer.ordered).toBe(true);
    expect(ctx.state.cafe.inventory.drink).toBe(1);
    expect(customer.money).toBe(100000 - 12000);
    expect(ctx.state.player.money - before).toBe(12000);
    expect(customer.satisfaction).toBeGreaterThan(70);
  });

  it('cuts reputation when the wanted item is out of stock', () => {
    const ctx = bareContext(() => 0);
    for (const id of Object.keys(ctx.state.cafe.inventory)) ctx.state.cafe.inventory[id] = 0;
    ctx.state.cafe.inventory.noodle = 3;
    const pc = ctx.state.cafe.computers[0];
    pc.occupantId = 'c1';
    pc.status = 'occupied';
    const customer = sampleCustomer({
      id: 'c1',
      state: 'playing',
      sessionMinutes: 10,
      plannedMinutes: 60,
      money: 100000,
      foodChance: 1,
      ordered: false,
      cravingId: 'drink',
      satisfaction: 70,
      targetComputerId: pc.id
    });
    ctx.state.cafe.customers = [customer];
    const rep = ctx.state.cafe.reputation;
    tickCustomers(ctx, 1);
    expect(customer.ordered).toBe(true);
    expect(ctx.state.cafe.inventory.noodle).toBe(3);
    expect(customer.money).toBe(100000);
    expect(ctx.state.cafe.reputation).toBe(rep - 2);
    expect(customer.satisfaction).toBeLessThan(70);
    expect(ctx.state.cafe.guide.met.stock).toBe(true);
  });
});
