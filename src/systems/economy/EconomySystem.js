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

const CATEGORY_LABEL = {
  computer_usage: 'Giờ chơi',
  food: 'Đồ ăn và nước',
  rent: 'Thuê mặt bằng',
  internet: 'Internet',
  electricity: 'Tiền điện',
  wages: 'Lương nhân viên',
  upgrade: 'Nâng cấp / mở rộng',
  repair: 'Sửa chữa',
  cleaning: 'Vệ sinh',
  computer: 'Mua máy',
  stock: 'Nhập hàng',
  furniture: 'Nội thất',
  family_food: 'Thức ăn gia đình',
  family_heat: 'Tiền sưởi',
  medicine: 'Thuốc men',
  debt: 'Ghi nợ',
  debt_payment: 'Trả nợ',
  event: 'Sự kiện',
  fine: 'Phạt'
};

const EXPENSE_GROUP = {
  rent: 'ops',
  internet: 'ops',
  electricity: 'ops',
  wages: 'ops',
  upgrade: 'invest',
  repair: 'invest',
  cleaning: 'invest',
  computer: 'invest',
  stock: 'invest',
  furniture: 'invest',
  family_food: 'family',
  family_heat: 'family',
  medicine: 'family',
  debt_payment: 'other',
  event: 'other',
  fine: 'other'
};

const GROUP_LABEL = {
  income: 'Khoản thu',
  ops: 'Chi vận hành tiệm',
  invest: 'Chi đầu tư / mua sắm',
  family: 'Chi gia đình',
  other: 'Chi khác',
  debt: 'Thiếu, ghi nợ'
};

const GROUP_ORDER = ['income', 'ops', 'invest', 'family', 'other', 'debt'];

export function categoryLabel(category) {
  return CATEGORY_LABEL[category] || 'Khác';
}

export function dailyReport(state) {
  const lines = state.economy.transactions.filter((row) => row.day === state.meta.currentDay);
  const revenue = lines.filter((row) => row.type === 'revenue').reduce((sum, row) => sum + row.amount, 0);
  const expenses = lines.filter((row) => row.type === 'expense').reduce((sum, row) => sum + row.amount, 0);
  const shortfall = lines.filter((row) => row.type === 'debt').reduce((sum, row) => sum + row.amount, 0);
  return {
    revenue,
    expenses,
    profit: revenue - expenses,
    shortfall,
    lines,
    breakdown: buildBreakdown(lines)
  };
}

function buildBreakdown(lines) {
  const buckets = new Map();

  for (const row of lines) {
    const group = row.type === 'revenue'
      ? 'income'
      : row.type === 'debt'
        ? 'debt'
        : (EXPENSE_GROUP[row.category] || 'other');
    if (!buckets.has(group)) buckets.set(group, new Map());
    const cats = buckets.get(group);
    if (!cats.has(row.category)) {
      cats.set(row.category, {
        category: row.category,
        label: categoryLabel(row.category),
        amount: 0,
        count: 0,
        entries: []
      });
    }
    const bucket = cats.get(row.category);
    bucket.amount += row.amount;
    bucket.count += 1;
    bucket.entries.push({
      description: row.description,
      amount: row.amount,
      type: row.type
    });
  }

  const sections = [];
  for (const group of GROUP_ORDER) {
    const cats = buckets.get(group);
    if (!cats || cats.size === 0) continue;
    const items = [...cats.values()].sort((a, b) => b.amount - a.amount);
    sections.push({
      id: group,
      title: GROUP_LABEL[group],
      tone: group === 'income' ? 'earn' : group === 'debt' ? 'alert' : 'spend',
      total: items.reduce((sum, item) => sum + item.amount, 0),
      items
    });
  }
  return sections;
}

export function addReputation(state, amount) {
  state.cafe.reputation = clamp(Math.round(state.cafe.reputation + amount), 0, 100);
}
