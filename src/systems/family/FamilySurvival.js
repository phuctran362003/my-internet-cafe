import { GameEvents } from '../../core/EventBus.js';
import { livingMembers, progressMember, snapshotMembers } from './FamilyHealth.js';

export function settleFamilyDay(ctx) {
  const { state, economy, data, bus } = ctx;
  if (state.family.lastSettledDay === state.meta.currentDay) return { skipped: true };
  const before = snapshotMembers(state);
  const rules = data.survival;
  const living = livingMembers(state);
  const foodNeed = living.length * rules.dailyNeeds.food.consumptionPerMember;
  const unitCost = rules.dailyNeeds.food.costPerUnit;

  if (state.family.resources.food < foodNeed && state.family.autoPayFood) {
    const missing = foodNeed - state.family.resources.food;
    const affordable = Math.floor(state.player.money / unitCost);
    const bought = Math.min(missing, affordable);
    if (bought > 0 && economy.debit(bought * unitCost, 'family_food', 'Mua thức ăn cho gia đình')) {
      state.family.resources.food += bought;
    }
  }

  const consumed = Math.min(state.family.resources.food, foodNeed);
  state.family.resources.food -= consumed;
  const foodShort = consumed < foodNeed;
  state.family.shortage.food = foodShort;
  for (const member of living) {
    member.hunger = foodShort ? member.hunger + 1 : Math.max(0, member.hunger - 1);
  }

  const heatCost = rules.dailyNeeds.heat.dailyCost;
  let heatPaid = false;
  if (state.family.autoPayHeat && state.player.money >= heatCost) {
    heatPaid = Boolean(economy.debit(heatCost, 'family_heat', 'Tiền sưởi'));
  }
  state.family.heatPaid = heatPaid;
  state.family.shortage.heat = !heatPaid;
  for (const member of living) {
    member.cold = heatPaid ? Math.max(0, member.cold - 1) : member.cold + 1;
  }

  if (foodShort) bus.emit(GameEvents.FAMILY_RESOURCE_LOW, { resource: 'food' });
  if (!heatPaid) bus.emit(GameEvents.FAMILY_RESOURCE_LOW, { resource: 'heat' });

  for (const member of state.family.members) progressMember(member, rules);

  for (const member of state.family.members) {
    const prev = before.find((item) => item.id === member.id);
    if (!prev || prev.status === member.status) continue;
    state.family.history.push({
      day: state.meta.currentDay,
      memberId: member.id,
      from: prev.status,
      to: member.status
    });
    bus.emit(GameEvents.FAMILY_STATUS_CHANGED, { id: member.id, status: member.status, from: prev.status });
    if (member.status === 'sick' || member.status === 'very_sick') {
      bus.emit(GameEvents.FAMILY_MEMBER_SICK, { id: member.id, status: member.status });
    }
    if (member.status === 'deceased') bus.emit(GameEvents.FAMILY_MEMBER_DECEASED, { id: member.id });
  }

  state.family.lastSettledDay = state.meta.currentDay;
  return { skipped: false, before };
}

export function buyFoodPack(ctx) {
  const pack = ctx.data.survival.dailyNeeds.food.packSize;
  const cost = pack * ctx.data.survival.dailyNeeds.food.costPerUnit;
  const paid = ctx.economy.debit(cost, 'family_food', 'Mua túi thức ăn');
  if (!paid) return false;
  ctx.state.family.resources.food += pack;
  return true;
}

export function buyMedicine(ctx, qty = 1) {
  const cost = qty * ctx.data.survival.medicine.costPerUnit;
  const paid = ctx.economy.debit(cost, 'medicine', 'Mua thuốc');
  if (!paid) return false;
  ctx.state.family.resources.medicine += qty;
  return true;
}

export function payHeatNow(ctx) {
  const cost = ctx.data.survival.dailyNeeds.heat.dailyCost;
  const paid = ctx.economy.debit(cost, 'family_heat', 'Trả tiền sưởi');
  if (!paid) return false;
  ctx.state.family.heatPaid = true;
  ctx.state.family.shortage.heat = false;
  for (const member of livingMembers(ctx.state)) member.cold = Math.max(0, member.cold - 1);
  return true;
}
