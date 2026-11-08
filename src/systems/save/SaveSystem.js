import { GameEvents } from '../../core/EventBus.js';
import { migrateSave, SAVE_VERSION, serializeState, validateSave } from './SaveSerializer.js';

export function createSaveSystem({ state, storage, bus }) {
  return {
    async save(slot = 0) {
      const data = serializeState(state);
      const record = {
        slot,
        savedAt: new Date().toISOString(),
        version: SAVE_VERSION,
        summary: {
          day: state.meta.currentDay,
          money: state.player.money,
          reputation: state.cafe.reputation,
          label: slot === 0 ? 'Tự động' : `Ô ${slot}`
        },
        data
      };
      await storage.putSave(record);
      await storage.putMeta({ id: 'lastSlot', slot });
      bus.emit(GameEvents.SAVE_COMPLETED, { slot });
      return { ok: true, slot };
    },
    async load(slot) {
      const record = await storage.getSave(slot);
      if (!record?.data) return { ok: false, reason: 'missing' };
      const data = migrateSave(record.data);
      const valid = validateSave(data);
      if (!valid.ok) return valid;
      return { ok: true, data };
    },
    async list() {
      return storage.listSaves();
    },
    async lastSlot() {
      const meta = await storage.getMeta('lastSlot');
      return meta?.slot ?? null;
    }
  };
}

export function createMemoryStorage() {
  const saves = new Map();
  const meta = new Map();
  return {
    async putSave(record) {
      saves.set(record.slot, structuredClone(record));
    },
    async getSave(slot) {
      return saves.has(slot) ? structuredClone(saves.get(slot)) : null;
    },
    async listSaves() {
      return [...saves.values()].map((record) => structuredClone(record));
    },
    async deleteSave(slot) {
      saves.delete(slot);
    },
    async putMeta(record) {
      meta.set(record.id, structuredClone(record));
    },
    async getMeta(id) {
      return meta.has(id) ? structuredClone(meta.get(id)) : null;
    }
  };
}
