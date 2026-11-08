import { GameEvents } from '../../core/EventBus.js';
import { addReputation } from '../economy/EconomySystem.js';
import { treatMember } from '../family/FamilyHealth.js';
import { buyFoodPack, payHeatNow } from '../family/FamilySurvival.js';
import { routeTo } from '../movement/Pathfinding.js';
import { setFlag } from './NarrativeFlagSystem.js';
import { formatMoney } from '../../utils/format.js';

export function validateEffects(effects, ctx) {
  if (!Array.isArray(effects)) return { ok: false, reason: 'effects' };
  for (const effect of effects) {
    const check = CHECKS[effect.type];
    if (!check) return { ok: false, reason: 'unknown_effect' };
    const result = check(effect, ctx);
    if (!result.ok) return result;
  }
  return { ok: true };
}

export function applyEffects(effects, ctx) {
  const valid = validateEffects(effects, ctx);
  if (!valid.ok) return valid;
  for (const effect of effects) HANDLERS[effect.type](effect, ctx);
  return { ok: true };
}

function member(ctx, id) {
  return ctx.state.family.members.find((item) => item.id === id);
}

function customerOf(ctx) {
  const id = ctx.event?.context?.customerId;
  return ctx.state.cafe.customers.find((item) => item.id === id);
}

function computerOf(ctx) {
  const id = ctx.event?.context?.computerId;
  return ctx.state.cafe.computers.find((item) => item.id === id);
}

function finiteAmount(value) {
  return Number.isFinite(value) && value >= 0;
}

const CHECKS = {
  add_money: (effect) => (finiteAmount(effect.amount) ? { ok: true } : { ok: false, reason: 'amount' }),
  subtract_money: (effect, ctx) => {
    if (!finiteAmount(effect.amount)) return { ok: false, reason: 'amount' };
    if (ctx.state.player.money < effect.amount) return { ok: false, reason: 'money' };
    return { ok: true };
  },
  use_medicine: (effect, ctx) => {
    const target = member(ctx, effect.target);
    if (!target || target.status === 'deceased') return { ok: false, reason: 'member' };
    const stock = ctx.state.family.resources.medicine;
    const cost = ctx.data.survival.medicine.costPerUnit;
    if (stock < 1 && ctx.state.player.money < cost) return { ok: false, reason: 'medicine' };
    return { ok: true };
  },
  delay_treatment: (effect, ctx) => (member(ctx, effect.target) ? { ok: true } : { ok: false, reason: 'member' }),
  buy_food_pack: (_effect, ctx) => {
    const pack = ctx.data.survival.dailyNeeds.food.packSize;
    const cost = pack * ctx.data.survival.dailyNeeds.food.costPerUnit;
    return ctx.state.player.money >= cost ? { ok: true } : { ok: false, reason: 'money' };
  },
  pay_heat: (_effect, ctx) => (
    ctx.state.player.money >= ctx.data.survival.dailyNeeds.heat.dailyCost
      ? { ok: true }
      : { ok: false, reason: 'money' }
  ),
  set_flag: (effect) => (effect.key ? { ok: true } : { ok: false, reason: 'flag' }),
  add_reputation: (effect) => (Number.isFinite(effect.amount) ? { ok: true } : { ok: false, reason: 'amount' }),
  pay_bill_ratio: (effect, ctx) => (
    finiteAmount(effect.ratio) && ctx.event?.context ? { ok: true } : { ok: false, reason: 'bill' }
  ),
  damage_computer: (effect, ctx) => (
    computerOf(ctx) && finiteAmount(effect.amount) ? { ok: true } : { ok: false, reason: 'computer' }
  ),
  resolve_incident: (_effect, ctx) => (ctx.event ? { ok: true } : { ok: false, reason: 'incident' }),
  release_customer: (_effect, ctx) => (customerOf(ctx) ? { ok: true } : { ok: false, reason: 'customer' }),
  consume_resource: (effect, ctx) => {
    const have = ctx.state.family.resources[effect.resource] ?? 0;
    return have >= effect.amount ? { ok: true } : { ok: false, reason: 'resource' };
  },
  recover_health: (effect, ctx) => {
    const target = member(ctx, effect.target);
    return target && target.status !== 'deceased' ? { ok: true } : { ok: false, reason: 'member' };
  }
};

const HANDLERS = {
  add_money: (effect, ctx) => {
    ctx.economy.credit(effect.amount, effect.category || 'event', effect.label || 'Sự kiện');
  },
  subtract_money: (effect, ctx) => {
    ctx.economy.debit(effect.amount, effect.category || 'event', effect.label || 'Sự kiện');
  },
  use_medicine: (effect, ctx) => {
    if (ctx.state.family.resources.medicine > 0) ctx.state.family.resources.medicine -= 1;
    else ctx.economy.debit(ctx.data.survival.medicine.costPerUnit, 'medicine', 'Mua thuốc');
    const target = member(ctx, effect.target);
    treatMember(target, ctx.data.survival);
    setFlag(ctx.state, `${effect.target}_treatment_delayed`, false);
  },
  delay_treatment: (effect, ctx) => {
    const target = member(ctx, effect.target);
    target.treatmentDelayed = true;
  },
  buy_food_pack: (_effect, ctx) => {
    buyFoodPack(ctx);
  },
  pay_heat: (_effect, ctx) => {
    payHeatNow(ctx);
  },
  set_flag: (effect, ctx) => setFlag(ctx.state, effect.key, effect.value),
  add_reputation: (effect, ctx) => addReputation(ctx.state, effect.amount),
  pay_bill_ratio: (effect, ctx) => {
    const person = customerOf(ctx);
    const bill = ctx.event.context.bill || 0;
    const due = Math.round(bill * effect.ratio);
    const paid = Math.min(person.money, due);
    if (paid > 0) {
      ctx.economy.credit(paid, 'computer_usage', `${person.name} trả ${formatMoney(paid)}`);
      person.money -= paid;
      person.billPaid = (person.billPaid || 0) + paid;
    }
    person.paid = true;
  },
  damage_computer: (effect, ctx) => {
    const pc = computerOf(ctx);
    pc.condition = Math.max(0, pc.condition - effect.amount);
    if (pc.condition <= 20 && pc.status !== 'broken' && pc.status !== 'disabled') {
      pc.status = 'broken';
      ctx.bus.emit(GameEvents.COMPUTER_BROKEN, { id: pc.id });
    }
  },
  resolve_incident: (_effect, ctx) => {
    const incident = ctx.state.cafe.incidents.find((item) => item.instanceId === ctx.event.instanceId);
    if (incident) incident.resolved = true;
  },
  release_customer: (_effect, ctx) => {
    const person = customerOf(ctx);
    const pc = computerOf(ctx);
    if (pc && pc.occupantId === person.id) {
      pc.occupantId = null;
      if (pc.status === 'occupied') pc.status = 'available';
    }
    person.state = 'leaving';
    person.incidentId = null;
    const path = routeTo(
      ctx.data.map,
      ctx.state,
      { x: Math.round(person.x), y: Math.round(person.y) },
      ctx.data.map.exit,
      person.id
    );
    if (path) {
      person.path = path;
      person.pathIndex = 1;
    } else {
      person.path = [ctx.data.map.exit];
      person.pathIndex = 0;
      person.x = ctx.data.map.exit.x;
      person.y = ctx.data.map.exit.y;
    }
  },
  consume_resource: (effect, ctx) => {
    ctx.state.family.resources[effect.resource] -= effect.amount;
  },
  recover_health: (effect, ctx) => {
    treatMember(member(ctx, effect.target), ctx.data.survival);
  }
};

export const EFFECT_TYPES = Object.keys(HANDLERS);
