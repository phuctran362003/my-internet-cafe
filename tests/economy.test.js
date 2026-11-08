import { describe, expect, it } from 'vitest';
import { bareContext, sampleCustomer } from './helpers.js';
import { beginPayment } from '../src/systems/customer/CustomerAI.js';
import { dailyReport } from '../src/systems/economy/EconomySystem.js';

describe('economy', () => {
  it('credits and debits through the ledger once', () => {
    const ctx = bareContext();
    ctx.economy.credit(5000, 'computer_usage', 'Thanh toán');
    expect(ctx.state.player.money).toBe(5005000);
    const again = ctx.economy.debit(5000, 'rent', 'Thuê');
    expect(again).toBeTruthy();
    expect(ctx.state.player.money).toBe(5000000);
    expect(ctx.economy.debit(99999999, 'rent', 'Quá lớn')).toBe(false);
    expect(ctx.state.player.money).toBe(5000000);
    const report = dailyReport(ctx.state);
    expect(report.revenue).toBe(5000);
    expect(report.expenses).toBe(5000);
    expect(report.lines).toHaveLength(2);
  });

  it('turns an unpaid obligation into debt without negative cash', () => {
    const ctx = bareContext();
    ctx.state.player.money = 1000;
    const result = ctx.economy.payObligation(4000, 'rent', 'Thuê');
    expect(result).toEqual({ paid: 1000, short: 3000 });
    expect(ctx.state.player.money).toBe(0);
    expect(ctx.state.economy.debt).toBe(3000);
  });

  it('does not pay a customer twice', () => {
    const ctx = bareContext();
    const customer = sampleCustomer();
    const pc = ctx.state.cafe.computers[0];
    pc.occupantId = customer.id;
    pc.status = 'occupied';
    ctx.state.cafe.customers = [customer];
    beginPayment(ctx, customer);
    const money = ctx.state.player.money;
    const count = ctx.state.economy.transactions.length;
    beginPayment(ctx, customer);
    expect(ctx.state.player.money).toBe(money);
    expect(ctx.state.economy.transactions.length).toBe(count);
    expect(customer.paid).toBe(true);
  });
});
