import { relationshipKey } from '../systems/customer/CustomerRelationshipSystem.js';
import { guideView } from '../systems/guide/GuideSystem.js';
import { itemPrice, tierById } from '../systems/business/PricingSystem.js';
import { stockLimit } from '../systems/inventory/InventorySystem.js';
import { visibleChoices } from '../systems/event/EventSystem.js';
import { dailyReport } from '../systems/economy/EconomySystem.js';
import { getPeriod } from '../systems/simulation/TimeSystem.js';
import { formatClock, formatDate, formatDuration, formatMoney } from '../utils/format.js';
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
  locked: 'Đang khóa',
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
  const guide = guideView(state, data);
  const playing = ui.screen === 'playing' && !active;
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
    playerName: state.player.name,
    cafeName: state.cafe.name,
    money: formatMoney(state.player.money),
    debt: state.economy.debt,
    debtLabel: formatMoney(state.economy.debt),
    reputation: state.cafe.reputation,
    customerCount: customers.length,
    freeComputers: computers.filter((pc) => pc.status === 'available' && !pc.occupantId).length,
    activeComputers: computers.filter((pc) => pc.status !== 'disabled' && pc.status !== 'locked').length,
    incidents: state.cafe.incidents.filter((incident) => !incident.resolved).length,
    mood: guide.hot ? 'Nóng' : 'Mát',
    networkLabel: String(guide.network),
    networkLag: guide.lag,
    computers,
    customers: customers.map((customer) => {
      const seat = computers.find((pc) => pc.id === customer.targetComputerId);
      const quote = Math.round(((customer.plannedMinutes || 0) * (seat?.price || 0)) / 60);
      return {
        id: customer.id,
        name: customer.name,
        label: customer.label,
        state: customer.state,
        satisfaction: customer.satisfaction,
        bill: customer.bill,
        billLabel: formatMoney(customer.bill || 0),
        money: customer.money,
        sessionMinutes: Math.floor(customer.sessionMinutes),
        plannedMinutes: customer.plannedMinutes,
        requestLabel: formatDuration(customer.plannedMinutes),
        quoteLabel: formatMoney(quote),
        visits: state.cafe.relationships[relationshipKey(customer)]?.visits ?? 0,
        speech: customer.speech?.text ?? ''
      };
    }),
    family: {
      autoPayFood: state.family.autoPayFood,
      autoPayHeat: state.family.autoPayHeat,
      food: state.family.resources.food,
      medicine: state.family.resources.medicine,
      heatPaid: state.family.heatPaid,
      alert: state.family.members.some((member) => member.status !== 'healthy')
        || state.family.shortage.food
        || state.family.shortage.heat,
      members: state.family.members.map((member) => ({
        ...member,
        statusLabel: STATUS_LABEL[member.status] ?? member.status
      }))
    },
    guard: state.cafe.employees.find((employee) => employee.role === 'guard') ?? null,
    staff: ['cleaner', 'cashier', 'server'].map((role) => {
      const spec = data.staff[role];
      const hired = state.cafe.employees.find((employee) => employee.role === role) ?? null;
      return {
        role,
        name: spec.name,
        salary: spec.salary,
        blurb: spec.blurb,
        hired: Boolean(hired)
      };
    }),
    facilities: ['cooling', 'network', 'power'].map((id) => {
      const level = state.cafe.facilities?.[id] ?? 1;
      const track = data.facilities[id];
      const current = track.find((entry) => entry.level === level) ?? track[0];
      const next = track.find((entry) => entry.level === level + 1) ?? null;
      return {
        id,
        level,
        name: current.name,
        detail: facilityDetail(id, current),
        nextName: next?.name ?? '',
        nextCost: next ? formatMoney(next.cost) : '',
        nextDetail: next ? facilityDetail(id, next) : ''
      };
    }),
    guide: {
      open: Boolean(ui.guideOpen) && playing,
      showBar: playing && !ui.guideOpen,
      progress: guide.progress,
      cards: guide.cards
    },
    stock: { ...state.cafe.inventory },
    stockLimit: stockLimit(state),
    rooms: (data.map.rooms ?? []).map((room) => ({
      id: room.id,
      name: room.name,
      cost: room.cost,
      costLabel: formatMoney(room.cost),
      effect: room.effect,
      unlocked: Boolean(state.cafe.rooms?.[room.id]),
      kind: room.kind || ''
    })),
    build: Boolean(ui.build),
    buildType: ui.buildType || 'plant',
    music: ui.music !== false,
    bag: { ...(state.cafe.furnitureBag ?? {}) },
    catalog: (data.furniture ?? []).map((item) => ({
      ...item,
      costLabel: formatMoney(item.cost),
      owned: state.cafe.furnitureBag?.[item.id] ?? 0
    })),
    placed: (state.cafe.furniture ?? []).map((piece) => ({ ...piece })),
    items: data.items.map((item) => ({ ...item, salePrice: itemPrice(state, item) })),
    prices: { ...state.cafe.prices },
    tiers: data.tiers.map((tier) => ({ id: tier.id, name: tier.name, basePrice: tier.basePrice, upgradeCost: tier.upgradeCost })),
    activeEvent: active ? {
      instanceId: active.instanceId,
      title: active.title,
      description: active.description,
      tone: active.tone || '',
      kicker: active.tone === 'beneficial' ? 'Có lợi' : active.tone === 'adverse' ? 'Bất lợi' : '',
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
    dayEvents: {
      adverse: state.narrative.eventHistory.filter((event) => event.day === state.meta.currentDay && event.tone === 'adverse').length,
      beneficial: state.narrative.eventHistory.filter((event) => event.day === state.meta.currentDay && event.tone === 'beneficial').length
    },
    statusLabel: STATUS_LABEL,
    newComputerCost: formatMoney(data.economy.newComputerCost),
    nextSlot: state.cafe.computers.some((pc) => pc.status === 'disabled')
  };
}

function facilityDetail(id, spec) {
  if (id === 'cooling') return `Mát cho ${spec.seats} máy đang ngồi`;
  if (id === 'network') return `Chất lượng ${spec.quality}`;
  return `Chịu ${spec.watts}W`;
}
