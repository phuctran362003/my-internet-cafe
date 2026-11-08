import { GameEvents, createEventBus } from './EventBus.js';
import { copyInto } from '../utils/cloneState.js';
import { createRng } from '../utils/RandomUtils.js';
import { formatMoney } from '../utils/format.js';
import { createInitialState } from '../state/createInitialState.js';
import { createEconomySystem } from '../systems/economy/EconomySystem.js';
import { createEventSystem } from '../systems/event/EventSystem.js';
import { createSimulation, continueNextDay, requestEndDay } from '../systems/simulation/SimulationSystem.js';
import { setPrice } from '../systems/business/PricingSystem.js';
import { buyComputerSlot, cleanComputer, repairComputer, upgradeComputer } from '../systems/business/UpgradeSystem.js';
import { buyCafeItem } from '../systems/inventory/InventorySystem.js';
import { buyFoodPack, buyMedicine } from '../systems/family/FamilySurvival.js';
import { fireGuard, hireGuard } from '../systems/security/SecuritySystem.js';
import { createSaveSystem } from '../systems/save/SaveSystem.js';

export function createGameSession({ data, storage, seed = 1 }) {
  const state = createInitialState(data, seed);
  const bus = createEventBus();
  const ui = {
    screen: 'menu',
    panel: 'overview',
    selection: null,
    notes: [],
    portraits: {},
    assetsReady: false,
    lastError: ''
  };
  const rng = createRng(() => state.meta.rng, (value) => { state.meta.rng = value; });
  const ctx = { state, data, bus, ui, rng, storage };
  ctx.economy = createEconomySystem({ state, bus });
  ctx.events = createEventSystem(ctx);
  ctx.simulation = createSimulation(ctx);
  ctx.saveSystem = createSaveSystem({ state, storage, bus });

  bus.on(GameEvents.PAYMENT_RECEIVED, (tx) => {
    if (tx?.amount) pushNote(ui, `+${formatMoney(tx.amount)} ${tx.description}`, 'earn');
  });
  bus.on(GameEvents.INCIDENT_CREATED, () => pushNote(ui, 'Có khách không chịu trả tiền', 'alert'));
  bus.on(GameEvents.FAMILY_EVENT_TRIGGERED, () => pushNote(ui, 'Gia đình cần một quyết định', 'family'));
  bus.on(GameEvents.SAVE_COMPLETED, () => pushNote(ui, 'Đã lưu game', 'save'));
  bus.on(GameEvents.COMPUTER_BROKEN, (payload) => pushNote(ui, `${payload?.id || 'Máy'} hỏng`, 'alert'));

  return {
    state,
    bus,
    ui,
    data,
    update(delta) {
      ctx.simulation.update(delta);
    },
    newGame(nextSeed = Date.now()) {
      copyInto(state, createInitialState(data, nextSeed));
      state.meta.started = true;
      ui.screen = 'playing';
      ui.panel = 'overview';
      ui.selection = null;
      ui.notes = [];
      ui.lastError = '';
      bus.emit(GameEvents.SESSION_RESET, { mode: 'new' });
      bus.emit(GameEvents.DAY_STARTED, { day: 1 });
    },
    async save(slot = 0) {
      return ctx.saveSystem.save(slot);
    },
    async load(slot) {
      const result = await ctx.saveSystem.load(slot);
      if (!result.ok) {
        ui.lastError = 'Không tải được bản lưu';
        return result;
      }
      copyInto(state, result.data);
      state.meta.started = true;
      ui.selection = null;
      ui.lastError = '';
      ctx.events.syncPause();
      ui.screen = state.meta.ending ? 'ending' : state.meta.dayEnded ? 'report' : 'playing';
      ui.panel = 'overview';
      bus.emit(GameEvents.SESSION_RESET, { mode: 'load' });
      return { ok: true };
    },
    async listSaves() {
      return ctx.saveSystem.list();
    },
    togglePause() {
      if (!state.meta.started || state.meta.dayEnded) return;
      state.meta.pauseReasons.user = !state.meta.pauseReasons.user;
    },
    setSpeed(speed) {
      if (![1, 2, 3].includes(speed)) return;
      state.meta.speed = speed;
    },
    toggleDoor() {
      state.cafe.open = !state.cafe.open;
    },
    endDay() {
      return requestEndDay(state);
    },
    continueDay() {
      return continueNextDay(ctx);
    },
    acceptEnding() {
      ui.screen = 'menu';
      state.meta.started = false;
    },
    setPanel(panel) {
      ui.panel = panel;
    },
    select(selection) {
      ui.selection = selection;
      if (selection?.type === 'computer') ui.panel = 'computer';
      if (selection?.type === 'customer') ui.panel = 'customer';
      if (selection?.type === 'counter') ui.panel = 'shop';
      if (selection?.type === 'door') ui.panel = 'overview';
    },
    setPrice(tierId, price) {
      const result = setPrice(state, data, tierId, price);
      if (!result.ok) ui.lastError = 'Giá nằm ngoài biên cho phép';
      else ui.lastError = '';
      return result;
    },
    upgrade(id) {
      return toastResult(ui, upgradeComputer(ctx, id), 'Không nâng cấp được');
    },
    repair(id) {
      return toastResult(ui, repairComputer(ctx, id), 'Không sửa được');
    },
    clean(id) {
      return toastResult(ui, cleanComputer(ctx, id), 'Không đủ tiền vệ sinh');
    },
    buyComputer() {
      return toastResult(ui, buyComputerSlot(ctx), 'Không mua thêm máy được');
    },
    buyItem(id) {
      return toastResult(ui, buyCafeItem(ctx, id, 1), 'Không nhập được hàng');
    },
    buyFood() {
      return toastResult(ui, { ok: buyFoodPack(ctx) }, 'Không đủ tiền mua thức ăn');
    },
    buyMedicine(qty = 1) {
      return toastResult(ui, { ok: buyMedicine(ctx, qty) }, 'Không đủ tiền mua thuốc');
    },
    setAutoPay(kind, value) {
      if (kind === 'food') state.family.autoPayFood = Boolean(value);
      if (kind === 'heat') state.family.autoPayHeat = Boolean(value);
    },
    hireGuard() {
      return toastResult(ui, hireGuard(ctx), 'Đã có bảo vệ');
    },
    fireGuard() {
      return fireGuard(ctx);
    },
    repay(amount) {
      return toastResult(ui, ctx.economy.repayDebt(amount), 'Không trả được nợ');
    },
    choose(choiceId, instanceId) {
      const result = ctx.events.choose(choiceId, instanceId);
      if (!result.ok) ui.lastError = reasonText(result.reason);
      else ui.lastError = '';
      return result;
    }
  };
}

function pushNote(ui, text, kind = 'info') {
  ui.notes.unshift({ id: `${Date.now()}-${ui.notes.length}-${text.slice(0, 12)}`, text, kind });
  ui.notes = ui.notes.slice(0, 5);
}

function toastResult(ui, result, message) {
  if (!result?.ok) ui.lastError = message;
  else ui.lastError = '';
  return result;
}

function reasonText(reason) {
  if (reason === 'money' || reason === 'medicine') return 'Không đủ tiền hoặc thuốc';
  if (reason === 'guard') return 'Chưa có bảo vệ';
  return 'Chưa thực hiện được lựa chọn';
}
