import { describe, expect, it } from 'vitest';
import { bareContext, sampleCustomer } from './helpers.js';
import { beginPayment } from '../src/systems/customer/CustomerAI.js';
import { dailyReport } from '../src/systems/economy/EconomySystem.js';
import { buyComputerSlot } from '../src/systems/business/UpgradeSystem.js';
import { buildView } from '../src/state/buildView.js';
import { GameEvents } from '../src/core/EventBus.js';

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

  it('groups daily money by category so thu/chi stay transparent', () => {
    const ctx = bareContext();
    ctx.economy.credit(12000, 'computer_usage', 'An trả giờ chơi');
    ctx.economy.credit(8000, 'computer_usage', 'Bình trả giờ chơi');
    ctx.economy.credit(15000, 'food', 'An mua mì');
    ctx.economy.debit(100000, 'rent', 'Tiền thuê mặt bằng');
    ctx.economy.debit(30000, 'internet', 'Tiền mạng');
    ctx.economy.debit(25000, 'family_food', 'Mua thức ăn cho gia đình');
    ctx.state.player.money = 500;
    ctx.economy.payObligation(5000, 'electricity', 'Tiền điện');

    const report = dailyReport(ctx.state);
    expect(report.revenue).toBe(35000);
    expect(report.expenses).toBe(155500);
    expect(report.shortfall).toBe(4500);

    const income = report.breakdown.find((section) => section.id === 'income');
    expect(income.title).toBe('Khoản thu');
    expect(income.total).toBe(35000);
    expect(income.items.map((item) => [item.label, item.amount, item.count])).toEqual([
      ['Giờ chơi', 20000, 2],
      ['Đồ ăn và nước', 15000, 1]
    ]);
    expect(income.items[0].entries.map((entry) => entry.description)).toEqual([
      'An trả giờ chơi',
      'Bình trả giờ chơi'
    ]);

    const ops = report.breakdown.find((section) => section.id === 'ops');
    expect(ops.title).toBe('Chi vận hành tiệm');
    expect(ops.items.map((item) => item.label)).toEqual(['Thuê mặt bằng', 'Internet', 'Tiền điện']);

    const family = report.breakdown.find((section) => section.id === 'family');
    expect(family.items[0]).toMatchObject({ label: 'Thức ăn gia đình', amount: 25000 });

    const debt = report.breakdown.find((section) => section.id === 'debt');
    expect(debt).toMatchObject({ title: 'Thiếu, ghi nợ', total: 4500 });
    expect(debt.items[0].entries[0].description).toBe('Tiền điện');
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

  it('buys a disabled floor slot and counts only owned machines', () => {
    const ctx = bareContext();
    const session = { state: ctx.state, ui: ctx.ui, data: ctx.data };
    const before = buildView(session);
    expect(before.activeComputers).toBe(5);
    expect(before.freeComputers).toBe(5);
    expect(before.buyableSlots).toBe(23);
    expect(before.nextSlot).toEqual({ id: 'pc6', cost: expect.any(String), console: false });
    expect(before.nextConsole).toEqual({ id: 'console1', cost: expect.any(String), owned: 0, total: 2 });

    const bought = [];
    ctx.bus.on(GameEvents.COMPUTER_BOUGHT, (payload) => bought.push(payload.id));
    const money = ctx.state.player.money;
    expect(buyComputerSlot(ctx, 'pc7').ok).toBe(true);
    expect(ctx.state.player.money).toBe(money - ctx.data.economy.newComputerCost);
    expect(ctx.state.cafe.computers.find((pc) => pc.id === 'pc7').status).toBe('available');
    expect(bought).toEqual(['pc7']);

    const after = buildView(session);
    expect(after.activeComputers).toBe(6);
    expect(after.freeComputers).toBe(6);
    expect(after.buyableSlots).toBe(22);
    expect(after.nextSlot.id).toBe('pc6');

    ctx.state.player.money = Math.max(ctx.state.player.money, ctx.data.economy.newConsoleCost);
    const consoleMoney = ctx.state.player.money;
    expect(buyComputerSlot(ctx, 'console1').ok).toBe(true);
    expect(ctx.state.player.money).toBe(consoleMoney - ctx.data.economy.newConsoleCost);
    expect(ctx.state.cafe.computers.find((pc) => pc.id === 'console1')).toMatchObject({
      status: 'available',
      tier: 'console'
    });
    const withConsole = buildView(session);
    expect(withConsole.nextSlot.id).toBe('pc6');
    expect(withConsole.nextConsole).toMatchObject({ id: 'console2', owned: 1, total: 2 });

    ctx.state.player.money = Math.max(ctx.state.player.money, ctx.data.economy.newConsoleCost);
    expect(buyComputerSlot(ctx, 'console2').ok).toBe(true);
    expect(buildView(session).nextConsole).toBeNull();
  });
});
