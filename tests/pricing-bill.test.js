import { describe, expect, it } from 'vitest';
import { beginPayment, tickCustomers } from '../src/systems/customer/CustomerAI.js';
import { usageBill } from '../src/systems/business/PricingSystem.js';
import { upgradeComputer } from '../src/systems/business/UpgradeSystem.js';
import { bareContext, sampleCustomer, testSession } from './helpers.js';

describe('standard pc billing', () => {
  it('charges at least one hour at the configured tier price', () => {
    expect(usageBill(40, 12000)).toBe(12000);
    expect(usageBill(60, 12000)).toBe(12000);
    expect(usageBill(90, 12000)).toBe(18000);
    expect(usageBill(0, 12000)).toBe(0);
  });

  it('bills an upgraded standard pc at the set hourly rate, not basePrice', () => {
    const ctx = bareContext(() => 0.5);
    ctx.state.cafe.prices.standard = 12000;
    ctx.state.cafe.prices.basic = 6000;
    const pc = ctx.state.cafe.computers[0];
    pc.tier = 'standard';
    pc.occupantId = 'c1';
    pc.status = 'occupied';
    const customer = sampleCustomer({
      id: 'c1',
      sessionMinutes: 40,
      plannedMinutes: 40,
      money: 100000,
      targetComputerId: pc.id,
      preferredTiers: ['basic', 'standard']
    });
    const before = ctx.state.player.money;
    beginPayment(ctx, customer);
    expect(customer.bill).toBe(12000);
    expect(customer.billPaid).toBe(12000);
    expect(ctx.state.player.money - before).toBe(12000);
  });

  it('keeps snack money from eating the reserved play bill', () => {
    const ctx = bareContext(() => 0);
    ctx.state.cafe.prices.standard = 12000;
    ctx.state.cafe.inventory.drink = 4;
    const pc = ctx.state.cafe.computers[0];
    pc.tier = 'standard';
    pc.occupantId = 'c1';
    pc.status = 'occupied';
    const customer = sampleCustomer({
      id: 'c1',
      state: 'playing',
      sessionMinutes: 10,
      plannedMinutes: 60,
      money: 22000,
      foodChance: 1,
      ordered: false,
      cravingId: 'drink',
      targetComputerId: pc.id
    });
    ctx.state.cafe.customers = [customer];
    tickCustomers(ctx, 1);
    expect(customer.money).toBe(22000);
    beginPayment(ctx, customer);
    expect(customer.billPaid).toBe(12000);
  });

  it('keeps the set standard rate after upgrading a machine', () => {
    const session = testSession(3);
    session.newGame(3);
    session.closeGuide();
    expect(session.setPrice('standard', 12000).ok).toBe(true);
    const pc = session.state.cafe.computers[0];
    session.state.player.money = 10_000_000;
    expect(session.upgrade(pc.id).ok).toBe(true);
    expect(pc.tier).toBe('standard');
    expect(session.state.cafe.prices.standard).toBe(12000);
  });

  it('upgrades basic to standard and bills at cafe.prices.standard', () => {
    const ctx = bareContext(() => 0.5);
    ctx.state.player.money = 10_000_000;
    ctx.state.cafe.prices.standard = 12000;
    const pc = ctx.state.cafe.computers[0];
    expect(upgradeComputer(ctx, pc.id).ok).toBe(true);
    expect(pc.tier).toBe('standard');
    pc.occupantId = 'c1';
    pc.status = 'occupied';
    const customer = sampleCustomer({
      id: 'c1',
      sessionMinutes: 40,
      money: 100000,
      targetComputerId: pc.id
    });
    beginPayment(ctx, customer);
    expect(customer.bill).toBe(12000);
  });
});
