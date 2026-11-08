import { GameEvents } from '../../core/EventBus.js';
import { clamp, vnd } from '../../utils/MathUtils.js';

export function createEconomySystem({ state, bus }) {
  function push(type, category, amount, description) {
    state.economy.seq += 1;
    const row = {
      id: `tx_${state.meta.currentDay}_${state.economy.seq}`,
      type,
      category,
      amount: vnd(amount),
      description,
      day: state.meta.currentDay,
      timestamp: Math.floor(state.meta.currentTime)
    };
    state.economy.transactions.push(row);
    if (state.economy.transactions.length > 1000) {
      state.economy.transactions.splice(0, state.economy.transactions.length - 1000);
    }
    return row;
  }

  return {
    credit(amount, category, description) {
      const value = vnd(amount);
      if (value <= 0) return null;
      state.player.money += value;
      state.economy.dailyRevenue += value;
      const row = push('revenue', category, value, description);
      bus.emit(GameEvents.MONEY_CHANGED, { money: state.player.money, delta: value });
      bus.emit(GameEvents.PAYMENT_RECEIVED, row);
      return row;
    },

    debit(amount, category, description) {
      const value = vnd(amount);
      if (value < 0) return false;
      if (value === 0) return true;
      if (state.player.money < value) return false;
      state.player.money -= value;
      state.economy.dailyExpenses += value;
      const row = push('expense', category, value, description);
      bus.emit(GameEvents.MONEY_CHANGED, { money: state.player.money, delta: -value });
      return row;
    },

    addDebt(amount, description) {
      const value = vnd(amount);
      if (value <= 0) return null;
      state.economy.debt += value;
      return push('debt', 'debt', value, description);
    },

    payObligation(amount, category, description) {
      const due = vnd(amount);
      const paid = Math.min(state.player.money, due);
      if (paid > 0) this.debit(paid, category, description);
      const short = due - paid;
      if (short > 0) this.addDebt(short, description);
      return { paid, short };
    },

    repayDebt(amount) {
      const value = Math.min(vnd(amount), state.economy.debt);
      if (value <= 0) return { ok: false, reason: 'none' };
      const paid = this.debit(value, 'debt_payment', 'Trả nợ');
      if (!paid) return { ok: false, reason: 'money' };
      state.economy.debt -= value;
      return { ok: true, amount: value };
    }
  };
}

export function dailyReport(state) {
  const lines = state.economy.transactions.filter((row) => row.day === state.meta.currentDay);
  const revenue = lines.filter((row) => row.type === 'revenue').reduce((sum, row) => sum + row.amount, 0);
  const expenses = lines.filter((row) => row.type === 'expense').reduce((sum, row) => sum + row.amount, 0);
  const shortfall = lines.filter((row) => row.type === 'debt').reduce((sum, row) => sum + row.amount, 0);
  return { revenue, expenses, profit: revenue - expenses, shortfall, lines };
}

export function addReputation(state, amount) {
  state.cafe.reputation = clamp(Math.round(state.cafe.reputation + amount), 0, 100);
}
