export const SAVE_VERSION = 1;

export function serializeState(state) {
  return structuredClone(state);
}

export function migrateSave(data) {
  const copy = structuredClone(data);
  copy.meta = copy.meta ?? {};
  if (!copy.meta.version) copy.meta.version = 1;
  copy.meta.version = SAVE_VERSION;
  copy.meta.pauseReasons = copy.meta.pauseReasons ?? { user: false, event: false };
  copy.family = copy.family ?? {};
  copy.family.shortage = copy.family.shortage ?? { food: false, heat: false };
  copy.family.resources = copy.family.resources ?? { food: 0, medicine: 0 };
  copy.narrative = copy.narrative ?? {};
  copy.narrative.flags = copy.narrative.flags ?? {};
  copy.narrative.queue = copy.narrative.queue ?? [];
  copy.narrative.eventHistory = copy.narrative.eventHistory ?? [];
  copy.narrative.completedEvents = copy.narrative.completedEvents ?? [];
  copy.economy = copy.economy ?? {};
  copy.economy.transactions = copy.economy.transactions ?? [];
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
