import { GameEvents } from '../../core/EventBus.js';
import { addReputation } from '../economy/EconomySystem.js';
import { instantiateEvent } from '../event/EventSystem.js';
import { consumeStock } from '../inventory/InventorySystem.js';
import { advanceAlongPath } from '../movement/Movement.js';
import { routeTo } from '../movement/Pathfinding.js';
import { isOutOfService } from '../business/computerStatus.js';
import { itemPrice, priceOf, tierById, usageBill } from '../business/PricingSystem.js';
import { readPressure } from '../business/FacilitySystem.js';
import { isDemanding, isOnline, markMet, observeCafe } from '../guide/GuideSystem.js';
import { recordVisit } from './CustomerRelationshipSystem.js';

const SNACK_FIRST_MINUTE = 6;
const SNACK_GAP_MINUTES = 28;

export function shouldSkipPayment(customer, roll) {
  if (customer.forceSkip) return true;
  return customer.archetype === 'troublemaker' && roll < (customer.skipChance || 0);
}

export function tickCustomers(ctx, minutes) {
  ctx.cafePressure = readPressure(ctx);
  ctx.state.cafe.internet = ctx.cafePressure.quality;
  observeCafe(ctx, ctx.cafePressure);
  for (const customer of [...ctx.state.cafe.customers]) tickOne(ctx, customer, minutes);
  ctx.state.cafe.customers = ctx.state.cafe.customers.filter((customer) => {
    if (customer.state !== 'exiting') return true;
    recordVisit(ctx.state, customer);
    ctx.bus.emit(GameEvents.CUSTOMER_LEFT, { id: customer.id });
    return false;
  });
}

function tickOne(ctx, customer, minutes) {
  if (customer.state === 'incident') return;
  if (customer.state === 'searching') return search(ctx, customer, minutes);
  if (customer.state === 'moving' || customer.state === 'leaving') return move(ctx, customer, minutes);
  if (customer.state === 'waiting') return waitForStart(ctx, customer, minutes);
  if (customer.state === 'playing') return play(ctx, customer, minutes);
  if (customer.state === 'payment') beginPayment(ctx, customer);
}

export function startMachine(ctx, customerId) {
  const customer = ctx.state.cafe.customers.find((item) => item.id === customerId);
  if (!customer || customer.state !== 'waiting') return { ok: false, reason: 'state' };
  customer.state = 'playing';
  return { ok: true };
}

function search(ctx, customer, minutes) {
  const pc = findComputer(ctx, customer);
  if (!pc) {
    customer.patienceLeft -= minutes;
    if (customer.patienceLeft <= 0) beginLeave(ctx, customer, 'no-seat');
    return;
  }
  pc.occupantId = customer.id;
  const path = routeTo(
    ctx.data.map,
    ctx.state,
    { x: Math.round(customer.x), y: Math.round(customer.y) },
    { x: pc.seatX, y: pc.seatY },
    customer.id
  );
  if (!path) {
    pc.occupantId = null;
    beginLeave(ctx, customer, 'no-path');
    return;
  }
  customer.targetComputerId = pc.id;
  customer.path = path;
  customer.pathIndex = 1;
  customer.state = 'moving';
  customer.movePurpose = 'computer';
}

function move(ctx, customer, minutes) {
  const arrived = advanceAlongPath(customer, minutes, ctx.data.simulation.tilesPerGameMinute);
  if (!arrived) return;
  if (customer.state === 'leaving') {
    customer.state = 'exiting';
    return;
  }
  const pc = computerById(ctx, customer.targetComputerId);
  if (!pc || pc.occupantId !== customer.id || pc.status === 'broken' || isOutOfService(pc)) {
    if (pc?.occupantId === customer.id) {
      pc.occupantId = null;
      if (pc.status === 'occupied') pc.status = 'available';
    }
    beginLeave(ctx, customer, 'lost-seat');
    return;
  }
  pc.status = 'occupied';
  customer.state = 'waiting';
  customer.waitLeft = 48;
  customer.x = pc.seatX;
  customer.y = pc.seatY;
  customer.facing = pc.facing ?? 'up';
  ctx.bus.emit(GameEvents.CUSTOMER_SEATED, { id: customer.id, computerId: pc.id });
}

function waitForStart(ctx, customer, minutes) {
  const pc = computerById(ctx, customer.targetComputerId);
  if (!pc || pc.occupantId !== customer.id || pc.status === 'broken' || isOutOfService(pc)) {
    if (pc?.occupantId === customer.id) {
      pc.occupantId = null;
      if (pc.status === 'occupied') pc.status = 'available';
    }
    beginLeave(ctx, customer, 'lost-seat');
    return;
  }
  customer.waitLeft = (customer.waitLeft ?? 48) - minutes;
  if (customer.waitLeft > 0) return;
  customer.satisfaction = Math.max(0, customer.satisfaction - 18);
  addReputation(ctx.state, -1);
  ctx.bus.emit(GameEvents.NOTICE, { text: `${customer.name} bỏ về vì chưa được mở máy`, kind: 'alert' });
  beginLeave(ctx, customer, 'ignored');
}

function play(ctx, customer, minutes) {
  const pc = computerById(ctx, customer.targetComputerId);
  customer.sessionMinutes += minutes;
  if (pc && pc.status !== 'broken') {
    pc.dailyMinutes += minutes;
    pc.sessionMinutes += minutes;
  }
  if (pc?.status === 'broken') {
    cutSession(ctx, customer, 'broken');
    return;
  }
  const pressure = ctx.cafePressure;
  if (pc) rateSatisfaction(ctx, customer, pc, pressure);
  if (pressure?.hot) {
    customer.heatMinutes = (customer.heatMinutes || 0) + minutes;
    if (customer.heatMinutes >= 50) {
      cutSession(ctx, customer, 'heat');
      return;
    }
  }
  if (pressure?.lag && isOnline(customer)) {
    customer.lagMinutes = (customer.lagMinutes || 0) + minutes;
    if (customer.lagMinutes >= 36) {
      cutSession(ctx, customer, 'lag');
      return;
    }
  }
  if (pressure?.overloaded) {
    customer.outageMinutes = (customer.outageMinutes || 0) + minutes;
    if (customer.outageMinutes >= 40) {
      cutSession(ctx, customer, 'outage');
      return;
    }
  }
  maybeSnack(ctx, customer);
  if (customer.sessionMinutes >= customer.plannedMinutes) beginPayment(ctx, customer);
}

function cutSession(ctx, customer, reason) {
  customer.plannedMinutes = customer.sessionMinutes;
  beginPayment(ctx, customer, reason);
}

export function beginPayment(ctx, customer, leaveReason = 'paid') {
  if (customer.paid || customer.state === 'incident') return;
  const pc = computerById(ctx, customer.targetComputerId);
  const tierId = pc?.tier || customer.preferredTiers?.[0] || 'basic';
  const bill = usageBill(customer.sessionMinutes, priceOf(ctx.state, tierId));
  customer.bill = bill;
  if (pc) rateSatisfaction(ctx, customer, pc, ctx.cafePressure);

  if (bill <= 0) {
    customer.paid = true;
    customer.billPaid = 0;
    freeComputer(customer, pc);
    beginLeave(ctx, customer, leaveReason);
    return;
  }

  const cashier = ctx.state.cafe.employees.some((employee) => employee.role === 'cashier');
  const skipRoll = ctx.rng() + (cashier ? 0.35 : 0);
  const refuses = shouldSkipPayment(customer, skipRoll);
  const shortOnCash = customer.money < bill;
  if (refuses || shortOnCash) {
    openSkipIncident(ctx, customer, bill);
    return;
  }

  ctx.economy.credit(bill, 'computer_usage', `${customer.name} trả giờ chơi`);
  customer.money -= bill;
  customer.billPaid = bill;
  customer.paid = true;
  if (customer.satisfaction >= 60) addReputation(ctx.state, 1);
  freeComputer(customer, pc);
  beginLeave(ctx, customer, leaveReason);
}

function openSkipIncident(ctx, customer, bill) {
  const template = ctx.data.incidents.find((item) => item.id === 'skip_payment');
  const pc = computerById(ctx, customer.targetComputerId);
  if (!template) {
    ctx.bus.emit(GameEvents.PAYMENT_FAILED, { id: customer.id, bill, paid: 0 });
    customer.paid = true;
    customer.billPaid = 0;
    freeComputer(customer, pc);
    beginLeave(ctx, customer, 'skip');
    return;
  }
  ctx.state.meta.incidentSeq += 1;
  const instanceId = `inc_${ctx.state.meta.currentDay}_${ctx.state.meta.incidentSeq}`;
  const event = instantiateEvent(template, {
    instanceId,
    context: { customerId: customer.id, computerId: pc?.id ?? null, bill },
    vars: { name: customer.name, bill: formatBillLabel(bill) }
  });
  customer.state = 'incident';
  customer.incidentId = instanceId;
  ctx.state.cafe.incidents.push({
    instanceId,
    customerId: customer.id,
    computerId: pc?.id ?? null,
    bill,
    ageMinutes: 0,
    resolved: false
  });
  ctx.events.enqueue(event);
}

function maybeSnack(ctx, customer) {
  const server = ctx.state.cafe.employees.some((employee) => employee.role === 'server');
  const firstMinute = server ? 3 : SNACK_FIRST_MINUTE;
  const gap = server ? 14 : SNACK_GAP_MINUTES;
  if (customer.sessionMinutes < firstMinute) return;
  if (customer.sessionMinutes < (customer.nextSnackAt ?? firstMinute)) return;
  const chance = Math.min(0.98, customer.foodChance + (server ? 0.25 : 0));
  customer.ordered = true;
  customer.nextSnackAt = customer.sessionMinutes + gap;
  if (ctx.rng() > chance) return;
  const wanted = pickCraving(ctx, customer);
  const price = itemPrice(ctx.state, wanted);
  const pc = computerById(ctx, customer.targetComputerId);
  const tierId = pc?.tier || customer.preferredTiers?.[0] || 'basic';
  const reserved = usageBill(customer.plannedMinutes, priceOf(ctx.state, tierId));
  if (customer.money - reserved < price) return;
  if ((ctx.state.cafe.inventory[wanted.id] ?? 0) < 1) {
    missSnack(ctx, customer, wanted);
    return;
  }
  if (!consumeStock(ctx.state, wanted.id, 1)) {
    missSnack(ctx, customer, wanted);
    return;
  }
  customer.money -= price;
  ctx.economy.credit(price, 'food', `${customer.name} mua ${wanted.name}`);
  customer.satisfaction = Math.min(100, customer.satisfaction + 5);
  customer.cravingId = null;
}

function pickCraving(ctx, customer) {
  if (customer.cravingId) {
    const known = ctx.data.items.find((entry) => entry.id === customer.cravingId);
    if (known) return known;
  }
  const list = ctx.data.items;
  const index = Math.min(list.length - 1, Math.floor(ctx.rng() * list.length));
  const wanted = list[index];
  customer.cravingId = wanted.id;
  return wanted;
}

function missSnack(ctx, customer, wanted) {
  customer.satisfaction = Math.max(0, customer.satisfaction - 10);
  addReputation(ctx.state, -2);
  markMet(ctx, 'stock');
  ctx.bus.emit(GameEvents.NOTICE, {
    text: `${customer.name} muốn ${wanted.name} nhưng hết hàng`,
    kind: 'alert'
  });
}

function beginLeave(ctx, customer, reason) {
  const held = ctx.state.cafe.computers.find((pc) => pc.occupantId === customer.id);
  freeComputer(customer, held);
  if (reason === 'no-seat') {
    customer.satisfaction = Math.max(0, customer.satisfaction - 20);
    addReputation(ctx.state, -1);
  }
  customer.state = 'leaving';
  customer.leaveReason = reason;
  const path = routeTo(
    ctx.data.map,
    ctx.state,
    { x: Math.round(customer.x), y: Math.round(customer.y) },
    ctx.data.map.exit,
    customer.id
  );
  if (!path) {
    customer.state = 'exiting';
    return;
  }
  customer.path = path;
  customer.pathIndex = 1;
}

function freeComputer(customer, pc) {
  if (!pc || pc.occupantId !== customer.id) return;
  pc.occupantId = null;
  if (pc.status === 'occupied') pc.status = 'available';
}

function findComputer(ctx, customer) {
  let best = null;
  let bestScore = 0;
  for (const pc of ctx.state.cafe.computers) {
    if (pc.occupantId || pc.status === 'broken' || pc.status === 'maintenance' || isOutOfService(pc)) continue;
    const tier = tierById(ctx.data, pc.tier);
    const price = priceOf(ctx.state, pc.tier);
    let score = 8 + (tier?.comfort ?? 0);
    if (customer.preferredTiers.includes(pc.tier)) score += 24;
    else score -= 8;
    const ratio = price / (tier?.basePrice || price || 1);
    score -= Math.max(0, ratio - 1) * 30 * customer.priceSensitivity;
    score += pc.condition / 25;
    if (score > bestScore) {
      best = pc;
      bestScore = score;
    }
  }
  return best;
}

function rateSatisfaction(ctx, customer, pc, pressure) {
  const tier = tierById(ctx.data, pc.tier);
  const price = priceOf(ctx.state, pc.tier);
  const ratio = price / (tier?.basePrice || price);
  let score = 68 + (tier?.comfort ?? 0);
  score -= Math.max(0, ratio - 1) * 40 * customer.priceSensitivity;
  score += (pc.cleanliness - 70) / 5;
  if (pc.condition < 50) score -= 12;
  if (pressure?.hot) score -= 16;
  if (pressure?.lag && isOnline(customer)) score -= 18;
  if (pressure?.overloaded) score -= 12;
  if (isDemanding(customer) && !customer.preferredTiers.includes(pc.tier)) score -= 14;
  if (ctx.state.cafe.rooms?.toilet) score += 6;
  if (pc.room === 'vip') score += 8;
  customer.satisfaction = Math.max(0, Math.min(100, Math.round(score)));
}

function computerById(ctx, id) {
  return ctx.state.cafe.computers.find((pc) => pc.id === id);
}

function formatBillLabel(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}
