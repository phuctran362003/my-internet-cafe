import { GameEvents } from '../../core/EventBus.js';
import { isOutOfService } from './computerStatus.js';
import { markComputerBroken } from './ComputerCareSystem.js';
import { nextTier, slotBuyCost } from './PricingSystem.js';

export function upgradeComputer(ctx, computerId) {
  const pc = ctx.state.cafe.computers.find((item) => item.id === computerId);
  if (!pc || pc.status === 'broken' || isOutOfService(pc)) return { ok: false, reason: 'unavailable' };
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
  if (!pc || isOutOfService(pc)) return { ok: false, reason: 'unavailable' };
  const paid = ctx.economy.debit(ctx.data.economy.repairCost, 'repair', `Sửa ${pc.id}`);
  if (!paid) return { ok: false, reason: 'money' };
  pc.condition = 100;
  if (pc.status === 'broken') pc.status = 'available';
  return { ok: true };
}

export function cleanComputer(ctx, computerId) {
  const pc = ctx.state.cafe.computers.find((item) => item.id === computerId);
  if (!pc || isOutOfService(pc)) return { ok: false, reason: 'unavailable' };
  const paid = ctx.economy.debit(ctx.data.economy.cleanCost, 'cleaning', `Vệ sinh ${pc.id}`);
  if (!paid) return { ok: false, reason: 'money' };
  pc.cleanliness = 100;
  return { ok: true };
}

export function buyComputerSlot(ctx, computerId = null) {
  const slot = computerId
    ? ctx.state.cafe.computers.find((pc) => pc.id === computerId && pc.status === 'disabled')
    : ctx.state.cafe.computers.find((pc) => pc.status === 'disabled');
  if (!slot) return { ok: false, reason: computerId ? 'missing' : 'full' };
  const spec = ctx.data.map.computers.find((pc) => pc.id === slot.id);
  const tier = spec?.tier ?? slot.tier ?? 'basic';
  const cost = slotBuyCost(ctx.data, { tier });
  const label = tier === 'console' ? `Mua console ${slot.id}` : `Mua ${slot.id}`;
  const paid = ctx.economy.debit(cost, 'computer', label);
  if (!paid) return { ok: false, reason: 'money' };
  slot.status = 'available';
  slot.tier = tier;
  slot.condition = 100;
  slot.cleanliness = 100;
  slot.occupantId = null;
  ctx.bus.emit(GameEvents.COMPUTER_BOUGHT, { id: slot.id });
  return { ok: true, id: slot.id };
}

export function applyComputerWear(ctx) {
  const state = ctx.state ?? ctx;
  const bus = ctx.bus;
  for (const pc of state.cafe.computers) {
    if (isOutOfService(pc)) continue;
    const hours = pc.dailyMinutes / 60;
    pc.condition = Math.max(0, pc.condition - (1 + hours * 0.35));
    pc.cleanliness = Math.max(0, pc.cleanliness - 4);
    if (pc.condition <= 15) {
      if (ctx.events) markComputerBroken(ctx, pc);
      else if (pc.status !== 'broken') {
        pc.status = 'broken';
        pc.occupantId = null;
        bus?.emit(GameEvents.COMPUTER_BROKEN, { id: pc.id });
      }
    }
  }
}
