import { GameEvents } from '../../core/EventBus.js';
import { getPeriod } from '../simulation/TimeSystem.js';
import { priceOf, tierById } from '../business/PricingSystem.js';
import { markMet } from '../guide/GuideSystem.js';
import { pick, rangeInt } from '../../utils/RandomUtils.js';

export function tickSpawn(ctx, minutes) {
  if (!ctx.state.cafe.open || ctx.state.meta.pendingDayEnd) return;
  const sim = ctx.data.simulation;
  ctx.state.cafe.spawnTimer += minutes;
  const period = getPeriod(ctx.state.meta.currentTime, sim.periods);
  while (ctx.state.cafe.spawnTimer >= sim.spawnInterval) {
    ctx.state.cafe.spawnTimer -= sim.spawnInterval;
    if (ctx.rng() > period.spawnChance) continue;
    if (ctx.state.cafe.customers.length >= sim.maxCustomers) continue;
    const archetype = pickArchetype(ctx, period);
    if (!archetype || walksAway(ctx, archetype)) continue;
    if (entranceBusy(ctx)) continue;
    const customer = makeCustomer(ctx, archetype);
    ctx.state.cafe.customers.push(customer);
    ctx.bus.emit(GameEvents.CUSTOMER_ARRIVED, { id: customer.id, archetype: archetype.id });
  }
}

function pickArchetype(ctx, period) {
  const pool = ctx.data.customers.archetypes
    .map((archetype) => ({ archetype, weight: archetype.spawn[period.id] ?? 0 }))
    .filter((item) => item.weight > 0);
  const total = pool.reduce((sum, item) => sum + item.weight, 0);
  if (!total) return null;
  let roll = ctx.rng() * total;
  for (const item of pool) {
    roll -= item.weight;
    if (roll <= 0) return item.archetype;
  }
  return pool[pool.length - 1].archetype;
}

function walksAway(ctx, archetype) {
  const tierId = archetype.preferredTiers[0];
  const tier = tierById(ctx.data, tierId);
  const price = priceOf(ctx.state, tierId);
  const ratio = price / tier.basePrice;
  const rejected = ratio > 1 && ctx.rng() < (ratio - 1) * archetype.priceSensitivity;
  if (rejected) markMet(ctx, 'price');
  return rejected;
}

function entranceBusy(ctx) {
  const spot = ctx.data.map.entrance;
  return ctx.state.cafe.customers.some((customer) => Math.hypot(customer.x - spot.x, customer.y - spot.y) < 0.75);
}

function makeCustomer(ctx, archetype) {
  ctx.state.meta.customerSeq += 1;
  const baseName = pick(ctx.rng, ctx.data.customers.names);
  const used = ctx.state.cafe.customers.some((customer) => customer.name === baseName);
  return {
    id: `cus_${ctx.state.meta.currentDay}_${ctx.state.meta.customerSeq}`,
    name: used ? `${baseName} ${ctx.state.meta.customerSeq}` : baseName,
    archetype: archetype.id,
    label: archetype.label,
    preferredTiers: archetype.preferredTiers,
    priceSensitivity: archetype.priceSensitivity,
    skipChance: archetype.skipChance,
    foodChance: archetype.foodChance,
    state: 'searching',
    x: ctx.data.map.entrance.x,
    y: ctx.data.map.entrance.y,
    facing: 'right',
    path: [],
    pathIndex: 0,
    targetComputerId: null,
    sessionMinutes: 0,
    plannedMinutes: rangeInt(ctx.rng, archetype.session[0], archetype.session[1]),
    money: rangeInt(ctx.rng, archetype.wallet[0], archetype.wallet[1]),
    patienceLeft: archetype.patience,
    satisfaction: 60,
    bill: 0,
    billPaid: 0,
    paid: false,
    ordered: false,
    incidentId: null,
    forceSkip: false,
    banterIn: 0,
    banterState: ''
  };
}
