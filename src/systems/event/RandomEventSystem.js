import { GameEvents } from '../../core/EventBus.js';
import { formatMoney } from '../../utils/format.js';
import { pick, rangeInt } from '../../utils/RandomUtils.js';
import { isOutOfService } from '../business/computerStatus.js';
import { getPeriod } from '../simulation/TimeSystem.js';
import { instantiateEvent } from './EventSystem.js';

export function tickRandomEvents(ctx, minutes) {
  const state = ctx.state;
  if (!state.meta.started || state.meta.dayEnded) return;
  const sim = ctx.data.simulation;
  if (state.cafe.nextEventIn == null) state.cafe.nextEventIn = rollGap(ctx, true);
  if (ctx.events.hasBlocking() || state.narrative.queue.some((event) => !event.resolved)) return;

  state.cafe.nextEventIn -= minutes;
  if (state.cafe.nextEventIn > 0) return;

  const today = state.narrative.eventHistory.filter((event) => (
    event.day === state.meta.currentDay && event.source === 'random'
  )).length;
  if (today >= (sim.maxRandomEventsPerDay ?? 10)) {
    state.cafe.nextEventIn = sim.eventGapMax ?? 150;
    return;
  }

  const opened = openRandomEvent(ctx);
  state.cafe.nextEventIn = opened ? rollGap(ctx, false) : rangeInt(ctx.rng, 20, 35);
}

export function eligibleRandomEvents(ctx) {
  return (ctx.data.randomEvents ?? []).filter((def) => isEligible(ctx, def));
}

export function pickRandomEvent(ctx) {
  const list = eligibleRandomEvents(ctx);
  if (!list.length) return null;
  const weighted = list.map((def) => ({
    def,
    weight: Math.max(0.05, (def.weight || 1) * toneMultiplier(def, ctx.state))
  }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = ctx.rng() * total;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.def;
  }
  return weighted[weighted.length - 1].def;
}

export function openRandomEvent(ctx, def = pickRandomEvent(ctx)) {
  if (!def) return null;
  const event = bindRandomEvent(ctx, def);
  if (!event) return null;
  if (!ctx.state.narrative.cooldowns) ctx.state.narrative.cooldowns = {};
  ctx.state.narrative.cooldowns[def.id] = ctx.state.meta.currentDay;
  ctx.events.enqueue(event);
  if (event.category !== 'family' && event.category !== 'security') {
    ctx.bus.emit(GameEvents.NOTICE, {
      text: event.title,
      kind: event.tone === 'beneficial' ? 'earn' : 'alert'
    });
  }
  return event;
}

function rollGap(ctx, first) {
  const sim = ctx.data.simulation;
  const min = first ? (sim.eventFirstGapMin ?? 40) : (sim.eventGapMin ?? 85);
  const max = first ? (sim.eventFirstGapMax ?? 70) : (sim.eventGapMax ?? 150);
  let gap = rangeInt(ctx.rng, min, max);
  const rowdy = ctx.state.cafe.customers.some((customer) => (
    customer.archetype === 'troublemaker'
    || (customer.state === 'playing' && customer.archetype === 'gamer')
  ));
  if (!first && rowdy && ctx.rng() < 0.45) gap = Math.max(Math.round(min * 0.62), Math.round(gap * 0.72));
  return gap;
}

function toneMultiplier(def, state) {
  const today = state.narrative.eventHistory.filter((event) => event.day === state.meta.currentDay && event.tone);
  const bad = today.filter((event) => event.tone === 'adverse').length;
  const good = today.filter((event) => event.tone === 'beneficial').length;
  if (def.tone === 'adverse' && bad > good) return 0.2;
  if (def.tone === 'beneficial' && good > bad) return 0.2;
  if (def.tone === 'adverse' && good > bad) return 2.4;
  if (def.tone === 'beneficial' && bad > good) return 2.4;
  return 1;
}

function isEligible(ctx, def) {
  if ((def.minDay || 1) > ctx.state.meta.currentDay) return false;
  if (def.periods?.length) {
    const period = getPeriod(ctx.state.meta.currentTime, ctx.data.simulation.periods);
    if (!def.periods.includes(period.id)) return false;
  }
  if (def.needsRole && !ctx.state.cafe.employees.some((employee) => employee.role === def.needsRole)) return false;
  const last = ctx.state.narrative.cooldowns?.[def.id];
  const cooldown = def.cooldownDays ?? 1;
  if (last != null && ctx.state.meta.currentDay - last < cooldown) return false;
  if ((def.needsCustomers || 0) > matchingCustomers(ctx, def).length) return false;
  if (def.needsComputer && !hasComputer(ctx, def)) return false;
  return true;
}

function hasComputer(ctx, def) {
  if (def.needsCustomers && matchingCustomers(ctx, def).some((customer) => customer.targetComputerId)) return true;
  return ctx.state.cafe.computers.some((pc) => !isOutOfService(pc));
}

function matchingCustomers(ctx, def) {
  return ctx.state.cafe.customers.filter((customer) => {
    if (customer.state !== 'playing' || customer.incidentId) return false;
    if (def.archetypes?.length && !def.archetypes.includes(customer.archetype)) return false;
    if (def.minSession && (customer.sessionMinutes || 0) < def.minSession) return false;
    return true;
  });
}

function bindRandomEvent(ctx, def) {
  const people = def.needsCustomers ? matchingCustomers(ctx, def) : [];
  if ((def.needsCustomers || 0) > people.length) return null;
  const customer = people.length ? pick(ctx.rng, people) : null;
  const others = people.filter((item) => item !== customer);
  const customer2 = others.length ? pick(ctx.rng, others) : null;
  const pc = def.needsComputer || customer ? pickComputer(ctx, customer) : null;
  if (def.needsComputer && !pc) return null;
  const amount = rollAmount(ctx, def);
  const memberName = (id, fallback) => ctx.state.family.members.find((member) => member.id === id)?.name || fallback;
  const vars = {
    name: customer?.name || 'Khách',
    name2: customer2?.name || 'khách kia',
    amount: formatMoney(amount),
    amountValue: amount,
    child: memberName('child', 'con bạn'),
    wife: memberName('wife', 'vợ bạn'),
    cafe: ctx.state.cafe.name
  };
  ctx.state.meta.eventSeq = (ctx.state.meta.eventSeq ?? 0) + 1;
  const event = instantiateEvent(def, {
    instanceId: `rnd_${ctx.state.meta.currentDay}_${ctx.state.meta.eventSeq}`,
    context: {
      customerId: customer?.id ?? null,
      customerId2: customer2?.id ?? null,
      computerId: pc?.id ?? null,
      amount,
      memberId: def.memberId ?? null
    },
    vars
  });
  event.source = 'random';
  return event;
}

function pickComputer(ctx, customer) {
  if (customer?.targetComputerId) {
    const seated = ctx.state.cafe.computers.find((pc) => pc.id === customer.targetComputerId);
    if (seated && !isOutOfService(seated)) return seated;
  }
  const pool = ctx.state.cafe.computers.filter((pc) => !isOutOfService(pc));
  return pool.length ? pick(ctx.rng, pool) : null;
}

function rollAmount(ctx, def) {
  if (Array.isArray(def.amountRange)) {
    const raw = rangeInt(ctx.rng, def.amountRange[0], def.amountRange[1]);
    return Math.max(0, Math.round(raw / 1000) * 1000);
  }
  return Number.isFinite(def.amount) ? def.amount : 0;
}
