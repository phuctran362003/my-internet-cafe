import { isOutOfService } from './computerStatus.js';
import { tierById } from './PricingSystem.js';

const DEFAULT_FACILITIES = { cooling: 1, network: 1, power: 1 };

export function ensureFacilities(state) {
  state.cafe.facilities = { ...DEFAULT_FACILITIES, ...(state.cafe.facilities ?? {}) };
  return state.cafe.facilities;
}

export function levelSpec(data, id, level) {
  const track = data.facilities[id] ?? [];
  return track.find((entry) => entry.level === level) ?? track[0];
}

export function readPressure(ctx) {
  const facilities = ensureFacilities(ctx.state);
  const cooling = levelSpec(ctx.data, 'cooling', facilities.cooling);
  const network = levelSpec(ctx.data, 'network', facilities.network);
  const power = levelSpec(ctx.data, 'power', facilities.power);
  const occupied = ctx.state.cafe.computers.filter((pc) => pc.status === 'occupied').length;
  let watts = 0;
  for (const pc of ctx.state.cafe.computers) {
    if (isOutOfService(pc)) continue;
    watts += tierById(ctx.data, pc.tier)?.watts ?? 0;
  }
  return {
    hot: occupied > cooling.seats,
    occupied,
    seats: cooling.seats,
    quality: network.quality,
    lag: network.quality < 75,
    watts,
    capacity: power.watts,
    overloaded: watts > power.watts * 0.85,
    cooling,
    network,
    power
  };
}

export function upgradeFacility(ctx, id) {
  const track = ctx.data.facilities[id];
  if (!track) return { ok: false, reason: 'unknown' };
  const facilities = ensureFacilities(ctx.state);
  const next = track.find((entry) => entry.level === facilities[id] + 1);
  if (!next) return { ok: false, reason: 'max' };
  const paid = ctx.economy.debit(next.cost, 'upgrade', `Nâng cấp ${next.name}`);
  if (!paid) return { ok: false, reason: 'money' };
  facilities[id] = next.level;
  if (id === 'network') ctx.state.cafe.internet = next.quality;
  return { ok: true, level: next.level };
}
