import { ensureFurniture } from '../systems/business/FurnitureSystem.js';
import { hashSeed } from '../utils/RandomUtils.js';

export function computerFromMap(pc, rooms) {
  const sealed = pc.room && !rooms[pc.room];
  return {
    id: pc.id,
    tier: pc.tier,
    status: sealed ? 'locked' : (pc.status === 'locked' ? 'available' : pc.status),
    room: pc.room ?? null,
    condition: 100,
    cleanliness: 100,
    occupantId: null,
    sessionMinutes: 0,
    dailyMinutes: 0,
    x: pc.x,
    y: pc.y,
    seatX: pc.seatX,
    seatY: pc.seatY
  };
}

export function ensureComputers(state, map) {
  const rooms = state.cafe.rooms ?? {};
  const specs = new Map((map.computers ?? []).map((pc) => [pc.id, pc]));
  state.cafe.computers = state.cafe.computers ?? [];
  for (const pc of state.cafe.computers) {
    if (pc.room == null) pc.room = specs.get(pc.id)?.room ?? null;
  }
  const have = new Set(state.cafe.computers.map((pc) => pc.id));
  for (const spec of map.computers ?? []) {
    if (!have.has(spec.id)) state.cafe.computers.push(computerFromMap(spec, rooms));
  }
  return state.cafe.computers;
}

export function createInitialState(data, seed = 1) {
  const rooms = Object.fromEntries((data.map.rooms ?? []).map((room) => [room.id, false]));
  const state = {
    meta: {
      version: 1,
      currentDay: 1,
      currentTime: data.simulation.dayStartMinute,
      started: false,
      dayEnded: false,
      pendingDayEnd: false,
      settling: false,
      pauseReasons: { user: false, event: false, guide: false },
      speed: 1,
      seed: hashSeed(seed),
      rng: hashSeed(seed),
      customerSeq: 1,
      incidentSeq: 1,
      eventSeq: 0,
      ending: null,
      sandbox: false,
      successOffered: false
    },
    player: {
      name: 'Bạn',
      money: data.economy.startingMoney
    },
    cafe: {
      name: 'Tiệm Net Bình Dân',
      open: true,
      reputation: 50,
      internet: 64,
      prices: Object.fromEntries(data.tiers.map((tier) => [tier.id, tier.basePrice])),
      itemPrices: Object.fromEntries(data.items.map((item) => [item.id, item.salePrice])),
      facilities: { cooling: 1, network: 1, power: 1 },
      guide: { met: {} },
      rooms,
      computers: data.map.computers.map((pc) => computerFromMap(pc, rooms)),
      customers: [],
      employees: [],
      inventory: Object.fromEntries(data.items.map((item) => [item.id, 4])),
      relationships: {},
      incidents: [],
      spawnTimer: 0,
      nextEventIn: null
    },
    economy: {
      dailyRevenue: 0,
      dailyExpenses: 0,
      debt: 0,
      seq: 0,
      transactions: []
    },
    family: {
      members: data.familyMembers.map((member) => ({ ...member })),
      resources: { food: 5, medicine: 2 },
      autoPayFood: true,
      autoPayHeat: true,
      heatPaid: true,
      shortage: { food: false, heat: false },
      lastSettledDay: 0,
      history: []
    },
    narrative: {
      flags: {},
      cooldowns: {},
      completedEvents: [],
      eventHistory: [],
      queue: []
    }
  };
  ensureFurniture(state, data);
  return state;
}

export function isSimulationPaused(state) {
  if (!state.meta.started || state.meta.dayEnded) return true;
  const reasons = state.meta.pauseReasons;
  return Boolean(reasons.user || reasons.event || reasons.guide);
}
