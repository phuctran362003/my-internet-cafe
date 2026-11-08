import { GameEvents } from '../../core/EventBus.js';
import { nextTier } from './PricingSystem.js';

export function upgradeComputer(ctx, computerId) {
  const pc = ctx.state.cafe.computers.find((item) => item.id === computerId);
  if (!pc || pc.status === 'broken' || pc.status === 'disabled') return { ok: false, reason: 'unavailable' };
  const next = nextTier(ctx.data, pc.tier);
  if (!next) return { ok: false, reason: 'max' };
  const paid = ctx.economy.debit(next.upgradeCost, 'upgrade', `Nâng cấp ${pc.id} lên ${next.name}`);
  if (!paid) return { ok: false, reason: 'money' };
  pc.tier = next.id;
  pc.condition = Math.min(100, pc.condition + 10);
  ctx.bus.emit(GameEvents.COMPUTER_UPGRADED, { id: pc.id, tier: pc.tier });
  return { ok: true, tier: pc.id && next.id };
}

export function repairComputer(ctx, computerId) {
  const pc = ctx.state.cafe.computers.find((item) => item.id === computerId);
  if (!pc || pc.status === 'disabled') return { ok: false, reason: 'unavailable' };
  const paid = ctx.economy.debit(ctx.data.economy.repairCost, 'repair', `Sửa ${pc.id}`);
  if (!paid) return { ok: false, reason: 'money' };
  pc.condition = 100;
  if (pc.status === 'broken') pc.status = 'available';
  return { ok: true };
}

export function cleanComputer(ctx, computerId) {
  const pc = ctx.state.cafe.computers.find((item) => item.id === computerId);
  if (!pc || pc.status === 'disabled') return { ok: false, reason: 'unavailable' };
  const paid = ctx.economy.debit(ctx.data.economy.cleanCost, 'cleaning', `Vệ sinh ${pc.id}`);
  if (!paid) return { ok: false, reason: 'money' };
  pc.cleanliness = 100;
  return { ok: true };
}

export function buyComputerSlot(ctx) {
  const slot = ctx.state.cafe.computers.find((pc) => pc.status === 'disabled');
  if (!slot) return { ok: false, reason: 'full' };
  const paid = ctx.economy.debit(ctx.data.economy.newComputerCost, 'computer', `Mua ${slot.id}`);
  if (!paid) return { ok: false, reason: 'money' };
  slot.status = 'available';
  slot.tier = 'basic';
  slot.condition = 100;
  slot.cleanliness = 100;
  slot.occupantId = null;
  return { ok: true, id: slot.id };
}

export function applyComputerWear(state) {
  for (const pc of state.cafe.computers) {
    if (pc.status === 'disabled') continue;
    const hours = pc.dailyMinutes / 60;
    pc.condition = Math.max(0, pc.condition - (1 + hours * 0.35));
    pc.cleanliness = Math.max(0, pc.cleanliness - 4);
    if (pc.condition <= 15) {
      pc.status = 'broken';
      pc.occupantId = null;
    }
  }
}
