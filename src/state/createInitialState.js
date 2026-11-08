import { hashSeed } from '../utils/RandomUtils.js';

export function createInitialState(data, seed = 1) {
  return {
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
      computers: data.map.computers.map((pc) => ({
        id: pc.id,
        tier: pc.tier,
        status: pc.status,
        condition: 100,
        cleanliness: 100,
        occupantId: null,
        sessionMinutes: 0,
        dailyMinutes: 0,
        x: pc.x,
        y: pc.y,
        seatX: pc.seatX,
        seatY: pc.seatY
      })),
      customers: [],
      employees: [],
      inventory: Object.fromEntries(data.items.map((item) => [item.id, 4])),
      relationships: {},
      incidents: [],
      spawnTimer: 0
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
      completedEvents: [],
      eventHistory: [],
      queue: []
    }
  };
}

export function isSimulationPaused(state) {
  if (!state.meta.started || state.meta.dayEnded) return true;
  const reasons = state.meta.pauseReasons;
  return Boolean(reasons.user || reasons.event || reasons.guide);
}
