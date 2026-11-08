import { GameEvents } from '../../core/EventBus.js';
import { migrateSave, SAVE_VERSION, serializeState, validateSave } from './SaveSerializer.js';

export function createSaveSystem({ state, storage, bus }) {
  return {
    async save(slot = 0, options = {}) {
      const data = serializeState(state);
      const record = {
        slot,
        savedAt: new Date().toISOString(),
        version: SAVE_VERSION,
        summary: {
          day: state.meta.currentDay,
          time: state.meta.currentTime,
          money: state.player.money,
          reputation: state.cafe.reputation,
          label: slotLabel(slot),
          cafeName: state.cafe.name,
          playerName: state.player.name
        },
        data
      };
      await storage.putSave(record);
      try {
        await storage.putMeta({ id: 'lastSlot', slot });
      } catch {
        /* slot file already written; metadata is optional */
      }
      bus.emit(GameEvents.SAVE_COMPLETED, { slot, quiet: Boolean(options.quiet) });
      return { ok: true, slot, savedAt: record.savedAt, summary: record.summary };
    },
    async load(slot) {
      const record = await storage.getSave(slot);
      if (!record?.data) return { ok: false, reason: 'missing' };
      const data = migrateSave(record.data);
      const valid = validateSave(data);
      if (!valid.ok) return valid;
      return { ok: true, data, savedAt: record.savedAt, summary: record.summary };
    },
    async list() {
      const records = await storage.listSaves();
      return [...records].sort((a, b) => a.slot - b.slot);
    },
    async lastSlot() {
      const meta = await storage.getMeta('lastSlot');
      if (meta?.slot != null) return meta.slot;
      return latestSave(await this.list())?.slot ?? null;
    }
  };
}

export function slotLabel(slot) {
  return slot === 0 ? 'Tự động' : `Ô ${slot}`;
}

export function latestSave(records = []) {
  return [...records].sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || '')))[0] ?? null;
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
