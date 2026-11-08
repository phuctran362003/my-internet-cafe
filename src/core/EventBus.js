export const GameEvents = {
  CUSTOMER_ARRIVED: 'customer:arrived',
  CUSTOMER_SEATED: 'customer:seated',
  CUSTOMER_LEFT: 'customer:left',
  PAYMENT_RECEIVED: 'payment:received',
  PAYMENT_FAILED: 'payment:failed',
  COMPUTER_BROKEN: 'computer:broken',
  COMPUTER_BOUGHT: 'computer:bought',
  COMPUTER_UPGRADED: 'computer:upgraded',
  INCIDENT_CREATED: 'incident:created',
  INCIDENT_RESOLVED: 'incident:resolved',
  FAMILY_STATUS_CHANGED: 'family:status:changed',
  FAMILY_RESOURCE_LOW: 'family:resource:low',
  FAMILY_EVENT_TRIGGERED: 'family:event:triggered',
  FAMILY_MEMBER_SICK: 'family:member:sick',
  FAMILY_MEMBER_DECEASED: 'family:member:deceased',
  DAY_STARTED: 'day:started',
  DAY_ENDED: 'day:ended',
  MONEY_CHANGED: 'economy:money:changed',
  SAVE_COMPLETED: 'save:completed',
  SAVE_DELETED: 'save:deleted',
  SESSION_RESET: 'session:reset',
  NOTICE: 'ui:notice',
  AUDIO_CHANGED: 'audio:changed',
  VIEW_SCALE_CHANGED: 'view:scale:changed',
  ROOM_UNLOCKED: 'room:unlocked',
  DOOR_TOGGLED: 'door:toggled',
  FURNITURE_CHANGED: 'furniture:changed'
};

export function createEventBus() {
  const listeners = new Map();
  return {
    on(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
      return () => listeners.get(type)?.delete(fn);
    },
    emit(type, payload) {
      const set = listeners.get(type);
      if (!set) return;
      for (const fn of [...set]) fn(payload);
    },
    clear() {
      listeners.clear();
    }
  };
}
