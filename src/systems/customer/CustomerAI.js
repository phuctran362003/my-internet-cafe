import { GameEvents } from '../../core/EventBus.js';
import { addReputation } from '../economy/EconomySystem.js';
import { instantiateEvent } from '../event/EventSystem.js';
import { consumeStock } from '../inventory/InventorySystem.js';
import { advanceAlongPath } from '../movement/Movement.js';
import { routeTo } from '../movement/Pathfinding.js';
import { priceOf, tierById } from '../business/PricingSystem.js';
import { recordVisit } from './CustomerRelationshipSystem.js';

export function shouldSkipPayment(customer, roll) {
  return customer.archetype === 'troublemaker' && roll < (customer.skipChance || 0);
}

export function tickCustomers(ctx, minutes) {
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
  if (customer.state === 'playing') return play(ctx, customer, minutes);
  if (customer.state === 'payment') beginPayment(ctx, customer);
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
  if (!pc || pc.occupantId !== customer.id || pc.status === 'broken' || pc.status === 'disabled') {
    if (pc?.occupantId === customer.id) {
      pc.occupantId = null;
      if (pc.status === 'occupied') pc.status = 'available';
    }
    beginLeave(ctx, customer, 'lost-seat');
    return;
  }
  pc.status = 'occupied';
  customer.state = 'playing';
  customer.x = pc.seatX;
  customer.y = pc.seatY;
  customer.facing = 'up';
  ctx.bus.emit(GameEvents.CUSTOMER_SEATED, { id: customer.id, computerId: pc.id });
}

function play(ctx, customer, minutes) {
  const pc = computerById(ctx, customer.targetComputerId);
  customer.sessionMinutes += minutes;
  if (pc && pc.status !== 'broken') {
    pc.dailyMinutes += minutes;
    pc.sessionMinutes += minutes;
  }
  if (pc?.status === 'broken') {
    beginLeave(ctx, customer, 'broken');
    return;
  }
  maybeSnack(ctx, customer);
  if (customer.sessionMinutes >= customer.plannedMinutes) beginPayment(ctx, customer);
}

export function beginPayment(ctx, customer) {
  if (customer.paid || customer.state === 'incident') return;
  const pc = computerById(ctx, customer.targetComputerId);
  const tierId = pc?.tier || customer.preferredTiers?.[0] || 'basic';
  const price = priceOf(ctx.state, tierId);
  const bill = Math.max(0, Math.round((customer.sessionMinutes * price) / 60));
  customer.bill = bill;
  if (pc) rateSatisfaction(ctx, customer, pc);
  if (shouldSkipPayment(customer, ctx.rng())) {
    openSkipIncident(ctx, customer, bill);
    return;
  }
  const paid = Math.min(customer.money, bill);
  if (paid > 0) ctx.economy.credit(paid, 'computer_usage', `${customer.name} trả giờ chơi`);
  customer.money -= paid;
  customer.billPaid = paid;
  customer.paid = true;
  if (bill > 0 && paid < bill) {
    addReputation(ctx.state, -2);
    ctx.bus.emit(GameEvents.PAYMENT_FAILED, { id: customer.id, bill, paid });
  } else if (customer.satisfaction >= 60) addReputation(ctx.state, 1);
  freeComputer(customer, pc);
  beginLeave(ctx, customer, 'paid');
}

function openSkipIncident(ctx, customer, bill) {
  const template = ctx.data.incidents.find((item) => item.id === 'skip_payment');
  const pc = computerById(ctx, customer.targetComputerId);
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
  if (customer.ordered || customer.sessionMinutes < 8) return;
  if (ctx.rng() > customer.foodChance) {
    customer.ordered = true;
    return;
  }
  customer.ordered = true;
  const item = ctx.data.items.find((entry) => (ctx.state.cafe.inventory[entry.id] ?? 0) > 0);
  if (!item || customer.money < item.salePrice) return;
  if (!consumeStock(ctx.state, item.id, 1)) return;
  customer.money -= item.salePrice;
  ctx.economy.credit(item.salePrice, 'food', `${customer.name} mua ${item.name}`);
  customer.satisfaction = Math.min(100, customer.satisfaction + 4);
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
    if (pc.occupantId || pc.status === 'broken' || pc.status === 'disabled' || pc.status === 'maintenance') continue;
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

function rateSatisfaction(ctx, customer, pc) {
  const tier = tierById(ctx.data, pc.tier);
  const price = priceOf(ctx.state, pc.tier);
  const ratio = price / (tier?.basePrice || price);
  let score = 68 + (tier?.comfort ?? 0);
  score -= Math.max(0, ratio - 1) * 40 * customer.priceSensitivity;
  score += (pc.cleanliness - 60) / 8;
  if (pc.condition < 50) score -= 12;
  customer.satisfaction = Math.max(0, Math.min(100, Math.round(score)));
}

function computerById(ctx, id) {
  return ctx.state.cafe.computers.find((pc) => pc.id === id);
}

function formatBillLabel(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}
