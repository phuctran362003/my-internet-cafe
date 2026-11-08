import { isOutOfService } from '../business/computerStatus.js';
import { readPressure } from '../business/FacilitySystem.js';

const HELPERS = ['cleaner', 'cashier', 'server'];

export function ensureGuide(state) {
  state.cafe.guide = state.cafe.guide ?? { met: {} };
  state.cafe.guide.met = state.cafe.guide.met ?? {};
  return state.cafe.guide;
}

export function markMet(ctx, id) {
  const guide = ensureGuide(ctx.state);
  if (guide.met[id]) return false;
  guide.met[id] = true;
  const lesson = ctx.data.guide.find((item) => item.id === id);
  if (lesson && Array.isArray(ctx.ui?.notes)) {
    ctx.ui.notes.unshift({ id: `guide-${id}`, text: lesson.toast, kind: 'alert' });
    ctx.ui.notes = ctx.ui.notes.slice(0, 5);
  }
  return true;
}

export function observeCafe(ctx, pressure) {
  ensureGuide(ctx.state);
  const customers = ctx.state.cafe.customers;
  const helpers = ctx.state.cafe.employees.some((employee) => HELPERS.includes(employee.role));
  if (!helpers && customers.length >= 3) markMet(ctx, 'staff');
  if (pressure.hot) markMet(ctx, 'cooling');
  if (pressure.lag && customers.some((customer) => customer.state === 'playing' && isOnline(customer))) {
    markMet(ctx, 'network');
  }
  if (pressure.overloaded) markMet(ctx, 'power');
  if (customers.some((customer) => demandingOnWeakPc(ctx, customer))) markMet(ctx, 'computers');
}

export function guideView(state, data) {
  const pressure = readPressure({ state, data });
  const guide = ensureGuide(state);
  const cards = data.guide.map((lesson) => {
    const met = Boolean(guide.met[lesson.id]);
    const active = problemActive(state, data, lesson.id, pressure);
    const status = !met ? 'unseen' : active ? 'active' : 'seen';
    return {
      id: lesson.id,
      icon: lesson.icon,
      title: lesson.title,
      body: lesson.body,
      action: lesson.action,
      panel: lesson.panel,
      status,
      statusLabel: status === 'active' ? 'Đang gặp' : status === 'seen' ? 'Đã gặp' : 'Chưa gặp'
    };
  });
  const metCount = cards.filter((card) => card.status !== 'unseen').length;
  return {
    cards,
    progress: cards.length ? metCount / cards.length : 0,
    hot: pressure.hot,
    lag: pressure.lag,
    overloaded: pressure.overloaded,
    network: pressure.quality,
    coolingName: pressure.cooling.name,
    networkName: pressure.network.name,
    powerName: pressure.power.name,
    watts: pressure.watts,
    capacity: pressure.capacity
  };
}

function problemActive(state, data, id, pressure) {
  if (id === 'staff') {
    const helpers = state.cafe.employees.some((employee) => HELPERS.includes(employee.role));
    return !helpers && state.cafe.customers.length >= 3;
  }
  if (id === 'price') return pricesAreHigh(state, data);
  if (id === 'cooling') return pressure.hot;
  if (id === 'network') return pressure.lag;
  if (id === 'power') return pressure.overloaded;
  if (id === 'computers') {
    const stillBasic = state.cafe.computers
      .filter((pc) => !isOutOfService(pc))
      .every((pc) => pc.tier === 'basic');
    return stillBasic || state.cafe.customers.some((customer) => demandingOnWeakPc({ state }, customer));
  }
  return false;
}

function pricesAreHigh(state, data) {
  for (const tier of data.tiers) {
    if ((state.cafe.prices[tier.id] ?? tier.basePrice) > tier.basePrice * 1.08) return true;
  }
  for (const item of data.items) {
    const price = state.cafe.itemPrices?.[item.id] ?? item.salePrice;
    if (price > item.salePrice * 1.15) return true;
  }
  return false;
}

export function isOnline(customer) {
  return customer.archetype === 'gamer' || customer.archetype === 'regular';
}

export function isDemanding(customer) {
  return customer.archetype === 'gamer' || customer.archetype === 'wealthy';
}

function demandingOnWeakPc(ctx, customer) {
  if (customer.state !== 'playing' || !isDemanding(customer)) return false;
  const pc = ctx.state.cafe.computers.find((item) => item.id === customer.targetComputerId);
  if (!pc) return false;
  return !customer.preferredTiers.includes(pc.tier);
}
