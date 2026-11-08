import { GameEvents } from '../../core/EventBus.js';
import { clamp } from '../../utils/MathUtils.js';
import { isOutOfService } from '../business/computerStatus.js';
import { addReputation } from '../economy/EconomySystem.js';
import { relationshipKey } from '../customer/CustomerRelationshipSystem.js';
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
  /** Pay what you can; leftover becomes debt so costly choices stay available when broke. */
  charge_money: (effect) => (finiteAmount(effect.amount) ? { ok: true } : { ok: false, reason: 'amount' }),
  hurt_member: (effect, ctx) => {
    const target = member(ctx, effect.target);
    if (!target) return { ok: false, reason: 'member' };
    if (target.status === 'deceased') return { ok: true };
    return Number.isFinite(effect.amount) ? { ok: true } : { ok: false, reason: 'amount' };
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
  },
  dirty_computer: (effect, ctx) => (
    computerOf(ctx) && finiteAmount(effect.amount) ? { ok: true } : { ok: false, reason: 'computer' }
  ),
  restore_computer: (effect, ctx) => (
    computerOf(ctx) && finiteAmount(effect.amount) ? { ok: true } : { ok: false, reason: 'computer' }
  ),
  adjust_satisfaction: (effect, ctx) => (
    customerOf(ctx) && Number.isFinite(effect.amount) ? { ok: true } : { ok: false, reason: 'customer' }
  ),
  adjust_loyalty: (effect, ctx) => (
    customerOf(ctx) && Number.isFinite(effect.amount) ? { ok: true } : { ok: false, reason: 'customer' }
  ),
  add_resource: (effect, ctx) => {
    if (!['food', 'medicine'].includes(effect.resource) || !finiteAmount(effect.amount)) {
      return { ok: false, reason: 'resource' };
    }
    return ctx.state.family.resources ? { ok: true } : { ok: false, reason: 'resource' };
  },
  add_debt: (effect) => (finiteAmount(effect.amount) ? { ok: true } : { ok: false, reason: 'amount' }),
  mark_skip: (_effect, ctx) => (customerOf(ctx) ? { ok: true } : { ok: false, reason: 'customer' }),
  end_session: (_effect, ctx) => (customerOf(ctx) ? { ok: true } : { ok: false, reason: 'customer' })
};

const HANDLERS = {
  add_money: (effect, ctx) => {
    ctx.economy.credit(effect.amount, effect.category || 'event', effect.label || 'Sự kiện');
  },
  subtract_money: (effect, ctx) => {
    ctx.economy.debit(effect.amount, effect.category || 'event', effect.label || 'Sự kiện');
  },
  charge_money: (effect, ctx) => {
    ctx.economy.payObligation(
      effect.amount,
      effect.category || 'event',
      effect.label || 'Sự kiện'
    );
  },
  hurt_member: (effect, ctx) => {
    const target = member(ctx, effect.target);
    if (!target || target.status === 'deceased') return;
    const loss = Math.max(0, Math.round(effect.amount));
    target.health = Math.max(0, target.health - loss);
    if (effect.sickness) {
      target.sicknessLevel = Math.max(0, (target.sicknessLevel || 0) + Math.round(effect.sickness));
    }
    if (effect.delayTreatment) target.treatmentDelayed = true;
    if (target.health <= 0) {
      target.health = 0;
      target.status = 'deceased';
      return;
    }
    const rules = ctx.data.survival.health;
    if (target.sicknessLevel >= rules.verySickLevel) target.status = 'very_sick';
    else if (target.sicknessLevel >= 1) target.status = 'sick';
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
    if (!pc || isOutOfService(pc)) return;
    pc.condition = Math.max(0, pc.condition - effect.amount);
    if (pc.condition <= 20 && pc.status !== 'broken') {
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
  },
  dirty_computer: (effect, ctx) => {
    const pc = computerOf(ctx);
    if (!pc || isOutOfService(pc)) return;
    pc.cleanliness = clamp(pc.cleanliness - effect.amount, 0, 100);
  },
  restore_computer: (effect, ctx) => {
    const pc = computerOf(ctx);
    if (!pc || isOutOfService(pc)) return;
    pc.condition = clamp(pc.condition + effect.amount, 0, 100);
    if (pc.status === 'broken' && pc.condition > 20) {
      pc.status = pc.occupantId ? 'occupied' : 'available';
    }
  },
  adjust_satisfaction: (effect, ctx) => {
    const person = customerOf(ctx);
    person.satisfaction = clamp(Math.round(person.satisfaction + effect.amount), 0, 100);
  },
  adjust_loyalty: (effect, ctx) => {
    const person = customerOf(ctx);
    const key = relationshipKey(person);
    if (!key) return;
    const current = ctx.state.cafe.relationships[key] ?? {
      name: person.name,
      archetype: person.archetype,
      visits: 0,
      spent: 0,
      loyalty: 0
    };
    current.loyalty = clamp((current.loyalty || 0) + effect.amount, 0, 30);
    ctx.state.cafe.relationships[key] = current;
  },
  add_resource: (effect, ctx) => {
    ctx.state.family.resources[effect.resource] += effect.amount;
  },
  add_debt: (effect, ctx) => {
    ctx.economy.addDebt(effect.amount, effect.label || 'Nợ phát sinh');
  },
  mark_skip: (_effect, ctx) => {
    customerOf(ctx).forceSkip = true;
  },
  end_session: (_effect, ctx) => {
    const person = customerOf(ctx);
    person.plannedMinutes = Math.min(person.plannedMinutes ?? 0, person.sessionMinutes ?? 0);
  }
};

export const EFFECT_TYPES = Object.keys(HANDLERS);
