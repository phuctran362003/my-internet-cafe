import { visibleChoices } from '../systems/event/EventSystem.js';
import { dailyReport } from '../systems/economy/EconomySystem.js';
import { getPeriod } from '../systems/simulation/TimeSystem.js';
import { tierById } from '../systems/business/PricingSystem.js';
import { formatClock, formatDate, formatMoney } from '../utils/format.js';
import { isSimulationPaused } from './createInitialState.js';

const STATUS_LABEL = {
  healthy: 'Khỏe',
  hungry: 'Đói',
  cold: 'Lạnh',
  sick: 'Ốm',
  very_sick: 'Bệnh nặng',
  deceased: 'Đã mất',
  available: 'Trống',
  occupied: 'Đang dùng',
  broken: 'Hỏng',
  disabled: 'Chưa mua',
  maintenance: 'Bảo trì'
};

export function buildView(session) {
  const { state, ui, data } = session;
  const period = getPeriod(state.meta.currentTime, data.simulation.periods);
  const customers = state.cafe.customers;
  const computers = state.cafe.computers.map((pc) => {
    const tier = tierById(data, pc.tier);
    const occupant = customers.find((customer) => customer.id === pc.occupantId);
    return {
      ...pc,
      tierName: tier?.name ?? pc.tier,
      price: state.cafe.prices[pc.tier],
      occupantName: occupant?.name ?? '',
      specs: tier ? `CPU ${tier.cpu} · GPU ${tier.gpu} · RAM ${tier.ram}GB` : ''
    };
  });
  const active = state.narrative.queue.find((event) => !event.resolved) ?? null;
  const report = dailyReport(state);
  return {
    screen: ui.screen,
    panel: ui.panel,
    selection: ui.selection,
    notes: ui.notes,
    portraits: ui.portraits,
    assetsReady: ui.assetsReady,
    lastError: ui.lastError,
    paused: isSimulationPaused(state),
    userPaused: state.meta.pauseReasons.user,
    speed: state.meta.speed,
    open: state.cafe.open,
    day: state.meta.currentDay,
    date: formatDate(state.meta.currentDay),
    clock: formatClock(state.meta.currentTime),
    period: period.label,
    light: period.light,
    money: formatMoney(state.player.money),
    debt: state.economy.debt,
    debtLabel: formatMoney(state.economy.debt),
    reputation: state.cafe.reputation,
    customerCount: customers.length,
    freeComputers: computers.filter((pc) => pc.status === 'available' && !pc.occupantId).length,
    activeComputers: computers.filter((pc) => pc.status !== 'disabled').length,
    incidents: state.cafe.incidents.filter((incident) => !incident.resolved).length,
    computers,
    customers: customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      label: customer.label,
      state: customer.state,
      satisfaction: customer.satisfaction,
      bill: customer.bill,
      billLabel: formatMoney(customer.bill || 0),
      money: customer.money,
      sessionMinutes: Math.floor(customer.sessionMinutes),
      plannedMinutes: customer.plannedMinutes
    })),
    family: {
      autoPayFood: state.family.autoPayFood,
      autoPayHeat: state.family.autoPayHeat,
      food: state.family.resources.food,
      medicine: state.family.resources.medicine,
      heatPaid: state.family.heatPaid,
      members: state.family.members.map((member) => ({
        ...member,
        statusLabel: STATUS_LABEL[member.status] ?? member.status
      }))
    },
    guard: state.cafe.employees.find((employee) => employee.role === 'guard') ?? null,
    stock: { ...state.cafe.inventory },
    items: data.items,
    prices: { ...state.cafe.prices },
    tiers: data.tiers.map((tier) => ({ id: tier.id, name: tier.name, basePrice: tier.basePrice, upgradeCost: tier.upgradeCost })),
    activeEvent: active ? {
      instanceId: active.instanceId,
      title: active.title,
      description: active.description,
      choices: visibleChoices(active, state).map((choice) => ({ id: choice.id, label: choice.label }))
    } : null,
    report: {
      ...report,
      revenueLabel: formatMoney(report.revenue),
      expenseLabel: formatMoney(report.expenses),
      profitLabel: formatMoney(report.profit),
      shortfallLabel: formatMoney(report.shortfall)
    },
    ending: state.meta.ending,
    dayEnded: state.meta.dayEnded,
    pendingDayEnd: state.meta.pendingDayEnd,
    journal: state.narrative.eventHistory.slice(-8).reverse(),
    statusLabel: STATUS_LABEL,
    newComputerCost: formatMoney(data.economy.newComputerCost),
    nextSlot: state.cafe.computers.some((pc) => pc.status === 'disabled')
  };
}
