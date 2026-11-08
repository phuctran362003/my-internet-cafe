import { describe, expect, it } from 'vitest';
import { tickCustomers } from '../src/systems/customer/CustomerAI.js';
import { applyBusinessExpenses } from '../src/systems/business/ExpenseSystem.js';
import { applyCleaner, hireStaff, tickStaff } from '../src/systems/staff/StaffSystem.js';
import { migrateSave } from '../src/systems/save/SaveSerializer.js';
import { bareContext, sampleCustomer, testSession } from './helpers.js';

describe('guide', () => {
  it('opens the lesson list when a cafe is founded', () => {
    const session = testSession(2);
    expect(session.foundCafe({ playerName: 'Minh', cafeName: 'NET LAG ÍT' }, 2).ok).toBe(true);
    expect(session.ui.guideOpen).toBe(true);
    expect(session.state.meta.pauseReasons.guide).toBe(false);
    session.update(1000);
    expect(session.state.meta.currentTime).toBe(session.data.simulation.dayStartMinute);
    session.closeGuide();
    expect(session.ui.guideOpen).toBe(false);
    session.followLesson('network');
    expect(session.ui.panel).toBe('facility');
    expect(session.state.cafe.guide.met).toEqual({});
  });

  it('marks heat, lag, weak machines, and power from the cafe', () => {
    const ctx = bareContext(() => 0.99);
    for (const pc of ctx.state.cafe.computers.slice(0, 4)) {
      pc.status = 'occupied';
    }
    const pc = ctx.state.cafe.computers[0];
    pc.occupantId = 'c1';
    ctx.state.cafe.customers.push(sampleCustomer({
      archetype: 'gamer',
      preferredTiers: ['gaming', 'highend'],
      targetComputerId: pc.id,
      sessionMinutes: 10,
      plannedMinutes: 100,
      ordered: true
    }));
    tickCustomers(ctx, 36);
    expect(ctx.state.cafe.guide.met.cooling).toBe(true);
    expect(ctx.state.cafe.guide.met.network).toBe(true);
    expect(ctx.state.cafe.guide.met.computers).toBe(true);
    expect(ctx.state.cafe.customers[0].leaveReason).toBe('lag');

    for (const machine of ctx.state.cafe.computers) {
      if (machine.status !== 'disabled') machine.tier = 'premium';
    }
    tickCustomers(ctx, 1);
    expect(ctx.state.cafe.guide.met.power).toBe(true);
  });

  it('hires floor staff, upgrades cooling, and prices a drink', () => {
    const session = testSession(5);
    session.newGame(5);
    const before = session.state.player.money;
    expect(session.hireStaff('cleaner').ok).toBe(true);
    expect(session.hireStaff('cleaner').ok).toBe(false);
    expect(session.upgradeFacility('cooling').ok).toBe(true);
    expect(session.state.cafe.facilities.cooling).toBe(2);
    expect(session.state.player.money).toBe(before - 480000);
    expect(session.setItemPrice('drink', 1000).ok).toBe(false);
    expect(session.setItemPrice('drink', 18000).ok).toBe(true);
    expect(session.state.cafe.itemPrices.drink).toBe(18000);

    const ctx = bareContext();
    ctx.state.cafe.computers[0].cleanliness = 40;
    hireStaff(ctx, 'cleaner');
    applyCleaner(ctx.state);
    expect(ctx.state.cafe.computers[0].cleanliness).toBe(58);
  });

  it('lets hired staff open machines and bills them by the day', () => {
    const ctx = bareContext(() => 0.5);
    const pc = ctx.state.cafe.computers[0];
    const customer = sampleCustomer({
      state: 'waiting',
      waitLeft: 40,
      targetComputerId: pc.id,
      sessionMinutes: 0
    });
    pc.occupantId = customer.id;
    pc.status = 'occupied';
    ctx.state.cafe.customers = [customer];
    ctx.state.cafe.open = true;
    hireStaff(ctx, 'cashier');
    tickStaff(ctx, 3);
    expect(customer.state).toBe('playing');

    const cashier = ctx.state.cafe.employees.find((employee) => employee.role === 'cashier');
    expect(cashier.salary).toBe(150000);
    applyBusinessExpenses(ctx);
    const wage = ctx.state.economy.transactions.find((row) => row.category === 'wages');
    expect(wage?.amount).toBe(150000);
    expect(wage?.description).toContain('Thu ngân');
  });

  it('splits opening machines, cleaning, and food service across roles', () => {
    const waitingCafe = (role) => {
      const ctx = bareContext(() => 0.1);
      const pc = ctx.state.cafe.computers[0];
      const customer = sampleCustomer({
        state: 'waiting',
        waitLeft: 40,
        targetComputerId: pc.id,
        sessionMinutes: 0
      });
      pc.occupantId = customer.id;
      pc.status = 'occupied';
      pc.cleanliness = 80;
      ctx.state.cafe.customers = [customer];
      hireStaff(ctx, role);
      return { ctx, customer, pc };
    };

    const cleaner = waitingCafe('cleaner');
    tickStaff(cleaner.ctx, 10);
    expect(cleaner.customer.state).toBe('waiting');
    expect(cleaner.pc.cleanliness).toBeGreaterThan(80);

    const server = waitingCafe('server');
    tickStaff(server.ctx, 10);
    expect(server.customer.state).toBe('waiting');
    expect(server.pc.cleanliness).toBeLessThan(80);

    const ctx = bareContext(() => 0.1);
    ctx.state.cafe.inventory.drink = 5;
    const pc = ctx.state.cafe.computers[0];
    pc.occupantId = 'c1';
    pc.status = 'occupied';
    const customer = sampleCustomer({
      state: 'playing',
      sessionMinutes: 4,
      plannedMinutes: 80,
      money: 100000,
      foodChance: 0,
      ordered: false,
      cravingId: 'drink',
      targetComputerId: pc.id
    });
    ctx.state.cafe.customers = [customer];
    tickCustomers(ctx, 1);
    expect(customer.money).toBe(100000);
    hireStaff(ctx, 'server');
    tickCustomers(ctx, 1);
    expect(customer.money).toBe(88000);
  });

  it('fills facilities onto an older save', () => {
    const session = testSession(1);
    session.newGame(1);
    const legacy = migrateSave({
      player: { money: 10 },
      meta: { currentDay: 2 },
      cafe: { computers: session.state.cafe.computers },
      economy: {},
      family: { members: session.state.family.members },
      narrative: {}
    });
    expect(legacy.cafe.facilities.cooling).toBe(1);
    expect(legacy.cafe.guide.met).toEqual({});
    expect(legacy.meta.pauseReasons.guide).toBe(false);
  });
});
