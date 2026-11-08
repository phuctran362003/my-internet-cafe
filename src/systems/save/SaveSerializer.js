import cafeMap from '../../data/maps/cafe.json';
import furnitureCatalog from '../../data/furniture/catalog.json';
import tiers from '../../data/computers/tiers.json';
import items from '../../data/items/items.json';
import { ensureComputers } from '../../state/createInitialState.js';
import { ensureFurniture } from '../business/FurnitureSystem.js';
import { ensureRooms } from '../business/RoomSystem.js';

export const SAVE_VERSION = 1;

export function serializeState(state) {
  return structuredClone(state);
}

export function migrateSave(data) {
  const copy = structuredClone(data);
  copy.meta = copy.meta ?? {};
  if (!copy.meta.version) copy.meta.version = 1;
  copy.meta.version = SAVE_VERSION;
  copy.meta.eventSeq = copy.meta.eventSeq ?? 0;
  copy.meta.pauseReasons = copy.meta.pauseReasons ?? { user: false, event: false, guide: false };
  copy.meta.pauseReasons.guide = false;
  copy.family = copy.family ?? {};
  copy.family.shortage = copy.family.shortage ?? { food: false, heat: false };
  copy.family.resources = copy.family.resources ?? { food: 0, medicine: 0 };
  copy.narrative = copy.narrative ?? {};
  copy.narrative.flags = copy.narrative.flags ?? {};
  copy.narrative.cooldowns = copy.narrative.cooldowns ?? {};
  copy.narrative.queue = copy.narrative.queue ?? [];
  copy.narrative.eventHistory = copy.narrative.eventHistory ?? [];
  copy.narrative.completedEvents = copy.narrative.completedEvents ?? [];
  copy.economy = copy.economy ?? {};
  copy.economy.transactions = copy.economy.transactions ?? [];
  copy.cafe = copy.cafe ?? {};
  copy.cafe.facilities = { cooling: 1, network: 1, power: 1, ...(copy.cafe.facilities ?? {}) };
  copy.cafe.guide = copy.cafe.guide ?? { met: {} };
  copy.cafe.guide.met = copy.cafe.guide.met ?? {};
  copy.cafe.itemPrices = copy.cafe.itemPrices ?? {};
  copy.cafe.prices = copy.cafe.prices ?? {};
  for (const tier of tiers) {
    if (copy.cafe.prices[tier.id] == null) copy.cafe.prices[tier.id] = tier.basePrice;
  }
  copy.cafe.inventory = copy.cafe.inventory ?? {};
  for (const item of items) {
    if (copy.cafe.itemPrices[item.id] == null) copy.cafe.itemPrices[item.id] = item.salePrice;
    if (copy.cafe.inventory[item.id] == null) copy.cafe.inventory[item.id] = 0;
  }
  copy.cafe.employees = copy.cafe.employees ?? [];
  ensureRooms(copy, cafeMap);
  ensureComputers(copy, cafeMap);
  ensureFurniture(copy, { map: cafeMap, furniture: furnitureCatalog });
  return copy;
}

export function validateSave(data) {
  if (!data?.meta || !data.player || !data.cafe || !data.economy || !data.family || !data.narrative) {
    return { ok: false, reason: 'shape' };
  }
  if (typeof data.player.money !== 'number' || typeof data.meta.currentDay !== 'number') {
    return { ok: false, reason: 'money' };
  }
  if (!Array.isArray(data.cafe.computers) || data.cafe.computers.length < 5) {
    return { ok: false, reason: 'computers' };
  }
  if (!Array.isArray(data.family.members) || data.family.members.length < 3) {
    return { ok: false, reason: 'family' };
  }
  if (!Array.isArray(data.economy.transactions)) return { ok: false, reason: 'ledger' };
  return { ok: true };
}
