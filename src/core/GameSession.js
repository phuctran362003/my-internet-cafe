import { GameEvents, createEventBus } from './EventBus.js';
import { copyInto } from '../utils/cloneState.js';
import { createRng } from '../utils/RandomUtils.js';
import { formatMoney } from '../utils/format.js';
import { createInitialState } from '../state/createInitialState.js';
import { createEconomySystem } from '../systems/economy/EconomySystem.js';
import { createEventSystem } from '../systems/event/EventSystem.js';
import { createSimulation, continueNextDay, finishDay, requestEndDay } from '../systems/simulation/SimulationSystem.js';
import { setItemPrice, setPrice } from '../systems/business/PricingSystem.js';
import { upgradeFacility } from '../systems/business/FacilitySystem.js';
import { buyComputerSlot, cleanComputer, repairComputer, upgradeComputer } from '../systems/business/UpgradeSystem.js';
import { furnitureAt as furnitureAtTile, moveFurniture, placeFurniture, stashFurniture as stashPiece } from '../systems/business/FurnitureSystem.js';
import { lockedRoomAt, unlockRoom as unlockRoomSystem } from '../systems/business/RoomSystem.js';
import { fireStaff, hireStaff } from '../systems/staff/StaffSystem.js';
import { buyCafeItem } from '../systems/inventory/InventorySystem.js';
import { buyFoodPack, buyMedicine } from '../systems/family/FamilySurvival.js';
import { fireGuard, hireGuard } from '../systems/security/SecuritySystem.js';
import { startMachine as openCustomerMachine } from '../systems/customer/CustomerAI.js';
import { createSaveSystem, latestSave } from '../systems/save/SaveSystem.js';
import { pushNote } from '../ui/notes.js';

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
    lastError: '',
    guideOpen: false,
    drawerOpen: false,
    build: false,
    buildType: 'plant',
    music: storedMusic(),
    viewScale: storedViewScale()
  };
  const rng = createRng(() => state.meta.rng, (value) => { state.meta.rng = value; });
  const ctx = { state, data, bus, ui, rng, storage };
  ctx.economy = createEconomySystem({ state, bus });
  ctx.events = createEventSystem(ctx);
  ctx.simulation = createSimulation(ctx);
  ctx.saveSystem = createSaveSystem({ state, storage, bus });
  let saveQueue = Promise.resolve();

  bus.on(GameEvents.PAYMENT_RECEIVED, (tx) => {
    if (tx?.amount) pushNote(ui, `+${formatMoney(tx.amount)} ${tx.description}`, 'earn');
  });
  bus.on(GameEvents.INCIDENT_CREATED, (payload) => pushNote(ui, payload?.title || 'Có sự cố cần xử lý', 'alert'));
  bus.on(GameEvents.FAMILY_EVENT_TRIGGERED, (payload) => {
    const good = payload?.tone === 'beneficial';
    pushNote(ui, payload?.title || (good ? 'Gia đình có tin vui' : 'Gia đình cần một quyết định'), good ? 'earn' : 'family');
  });
  bus.on(GameEvents.NOTICE, (payload) => {
    if (!payload?.text) return;
    pushNote(ui, payload.text, payload.kind || 'info');
  });
  bus.on(GameEvents.SAVE_COMPLETED, (payload) => {
    if (payload?.quiet) return;
    pushNote(ui, payload?.slot === 0 ? 'Đã tự lưu' : 'Đã lưu game', 'save');
  });
  bus.on(GameEvents.COMPUTER_BROKEN, (payload) => pushNote(ui, `${payload?.id || 'Máy'} hỏng`, 'alert'));
  bus.on(GameEvents.COMPUTER_BOUGHT, (payload) => {
    if (!payload?.id) return;
    ui.selection = { type: 'computer', id: payload.id };
    ui.panel = 'computer';
    ui.drawerOpen = true;
    pushNote(ui, `Đã mua máy ${payload.id.toUpperCase()}`, 'earn');
  });
  bus.on(GameEvents.DAY_ENDED, () => queueSave(0));

  function queueSave(slot, options = {}) {
    saveQueue = saveQueue
      .then(() => ctx.saveSystem.save(slot, options))
      .catch(() => {
        if (!options.quiet) pushNote(ui, 'Lưu không thành công', 'alert');
        return { ok: false, reason: 'storage' };
      });
    return saveQueue;
  }

  return {
    state,
    bus,
    ui,
    data,
    update(delta) {
      state.meta.pauseReasons.guide = Boolean(ui.guideOpen && ui.screen === 'playing');
      ctx.simulation.update(delta);
    },
    newGame(nextSeed = Date.now()) {
      this.foundCafe({ playerName: 'Bạn', cafeName: 'Tiệm Net Bình Dân' }, nextSeed);
    },
    openFounding() {
      ui.screen = 'naming';
      ui.lastError = '';
    },
    cancelFounding() {
      ui.screen = 'menu';
      ui.lastError = '';
    },
    foundCafe({ playerName, cafeName } = {}, nextSeed = Date.now()) {
      const player = cleanName(playerName);
      const cafe = cleanName(cafeName);
      if (player.length < 2 || player.length > 16) {
        return { ok: false, message: 'Tên người chơi từ 2 đến 16 ký tự.' };
      }
      if (cafe.length < 2 || cafe.length > 22) {
        return { ok: false, message: 'Tên tiệm từ 2 đến 22 ký tự.' };
      }
      copyInto(state, createInitialState(data, nextSeed));
      state.player.name = player;
      state.cafe.name = cafe;
      const owner = state.family.members.find((member) => member.id === 'player');
      if (owner) owner.name = player;
      state.meta.started = true;
      ui.screen = 'playing';
      ui.panel = 'overview';
      ui.selection = null;
      ui.notes = [];
      ui.lastError = '';
      ui.guideOpen = true;
      ui.build = false;
      bus.emit(GameEvents.SESSION_RESET, { mode: 'new' });
      bus.emit(GameEvents.DAY_STARTED, { day: 1 });
      queueSave(0, { quiet: true });
      return { ok: true };
    },
    async save(slot = 0) {
      if (!state.meta.started && slot !== 0) {
        pushNote(ui, 'Chưa có ván để lưu', 'alert');
        return { ok: false, reason: 'idle' };
      }
      return queueSave(slot);
    },
    flushSaves() {
      return saveQueue;
    },
    async load(slot) {
      await saveQueue;
      const result = await ctx.saveSystem.load(slot);
      if (!result.ok) {
        ui.lastError = 'Không tải được bản lưu';
        pushNote(ui, 'Không tải được bản lưu', 'alert');
        return result;
      }
      copyInto(state, result.data);
      state.meta.started = true;
      ui.selection = null;
      ui.lastError = '';
      ui.notes = [];
      ctx.events.syncPause();
      ui.screen = state.meta.ending ? 'ending' : state.meta.dayEnded ? 'report' : 'playing';
      ui.panel = 'overview';
      ui.guideOpen = false;
      ui.build = false;
      bus.emit(GameEvents.SESSION_RESET, { mode: 'load' });
      return { ok: true, slot, savedAt: result.savedAt };
    },
    async listSaves() {
      return ctx.saveSystem.list();
    },
    async deleteSave(slot) {
      await saveQueue;
      const result = await ctx.saveSystem.delete(slot);
      if (!result.ok) {
        pushNote(ui, 'Không xóa được bản lưu', 'alert');
        return result;
      }
      pushNote(ui, slot === 0 ? 'Đã xóa bản tự lưu' : `Đã xóa ô ${slot}`, 'save');
      return result;
    },
    async latestSaveSlot() {
      const records = await ctx.saveSystem.list();
      const metaSlot = await ctx.saveSystem.lastSlot();
      if (metaSlot != null && records.some((record) => record.slot === metaSlot)) return metaSlot;
      return latestSave(records)?.slot ?? null;
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
      bus.emit(GameEvents.DOOR_TOGGLED, { open: state.cafe.open });
    },
    toggleMusic() {
      ui.music = ui.music === false;
      try {
        localStorage.setItem('cafe-music', ui.music === false ? 'off' : 'on');
      } catch {
        /* preference stays in this tab */
      }
      bus.emit(GameEvents.AUDIO_CHANGED, { music: ui.music !== false });
    },
    nudgeViewScale(dir) {
      const next = clampViewScale(ui.viewScale + Math.sign(dir || 0) * VIEW_SCALE_STEP);
      if (next === ui.viewScale) return;
      ui.viewScale = next;
      try {
        localStorage.setItem('cafe-view-scale', String(next));
      } catch {
        /* preference stays in this tab */
      }
      bus.emit(GameEvents.VIEW_SCALE_CHANGED, { scale: next });
    },
    toggleBuild() {
      ui.build = !ui.build;
      ui.lastError = '';
      if (ui.build) ui.panel = 'rooms';
      else if (ui.selection?.type === 'furniture') ui.selection = null;
    },
    armFurniture(type) {
      if (!data.furniture.some((item) => item.id === type)) return;
      ui.build = true;
      ui.buildType = type;
      ui.panel = 'rooms';
      if (ui.selection?.type === 'furniture') ui.selection = null;
      ui.lastError = '';
    },
    roomAt(x, y) {
      return lockedRoomAt(data.map, state, x, y);
    },
    furnitureAt(x, y) {
      return furnitureAtTile(state, x, y);
    },
    useTile(x, y) {
      if (!ui.build) return { ok: false, reason: 'mode' };
      if (ui.selection?.type === 'furniture') return toastPlace(ui, moveFurniture(ctx, ui.selection.id, x, y));
      return toastPlace(ui, placeFurniture(ctx, ui.buildType, x, y));
    },
    stashFurniture() {
      if (ui.selection?.type !== 'furniture') {
        return failAction(ui, { ok: false, reason: 'missing' }, {
          missing: 'Chưa chọn đồ để cất',
          default: 'Không cất được đồ'
        });
      }
      const result = stashPiece(ctx, ui.selection.id);
      if (!result.ok) {
        return failAction(ui, result, {
          missing: 'Không tìm thấy món đang chọn',
          default: 'Không cất được đồ'
        });
      }
      ui.selection = null;
      clearFail(ui);
      return result;
    },
    unlockRoom(id) {
      const result = unlockRoomSystem(ctx, id);
      if (!result.ok) {
        return failAction(ui, result, {
          money: 'Không đủ tiền mở phòng này',
          open: 'Phòng này đã mở rồi',
          unknown: 'Không tìm thấy phòng',
          default: 'Không mở được phòng'
        });
      }
      clearFail(ui);
      pushNote(ui, `Đã mở ${result.name}`, 'earn');
      return result;
    },
    endDay() {
      return requestEndDay(state);
    },
    confirmEndDay() {
      if (!state.meta.pendingDayEnd || state.meta.dayEnded) return { ok: false, reason: 'state' };
      if (ctx.events.hasBlocking()) {
        pushNote(ui, 'Xử lý hộp thoại đang mở trước đã', 'alert');
        return { ok: false, reason: 'event' };
      }
      return finishDay(ctx);
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
      ui.drawerOpen = true;
    },
    closeDrawer() {
      ui.drawerOpen = false;
    },
    toggleDrawer() {
      ui.drawerOpen = !ui.drawerOpen;
    },
    startMachine(customerId) {
      const result = openCustomerMachine(ctx, customerId);
      if (!result.ok) return failAction(ui, result, { default: 'Khách chưa ngồi chờ mở máy' });
      clearFail(ui);
      return result;
    },
    select(selection) {
      ui.selection = selection;
      if (selection?.type === 'computer') ui.panel = 'computer';
      if (selection?.type === 'customer') ui.panel = 'customer';
      if (selection?.type === 'counter') ui.panel = 'shop';
      if (selection?.type === 'door') ui.panel = 'overview';
      if (selection?.type === 'room' || selection?.type === 'furniture') ui.panel = 'rooms';
      if (selection) ui.drawerOpen = true;
    },
    setPrice(tierId, price) {
      const result = setPrice(state, data, tierId, price);
      if (!result.ok) {
        return failAction(ui, result, {
          range: 'Giá giờ chơi từ 2.000đ đến 40.000đ',
          default: 'Không đổi được giá giờ'
        });
      }
      clearFail(ui);
      return result;
    },
    setItemPrice(itemId, price) {
      const result = setItemPrice(state, data, itemId, price);
      if (!result.ok) {
        return failAction(ui, result, {
          range: 'Giá món phải từ giá nhập đến gấp 5 lần',
          default: 'Không đổi được giá món'
        });
      }
      clearFail(ui);
      return result;
    },
    openGuide() {
      if (ui.screen !== 'playing') return;
      ui.guideOpen = true;
    },
    closeGuide() {
      ui.guideOpen = false;
    },
    followLesson(id) {
      const lesson = data.guide.find((item) => item.id === id);
      if (!lesson) return;
      ui.guideOpen = false;
      ui.panel = lesson.panel;
      ui.drawerOpen = true;
      ui.lastError = '';
    },
    upgradeFacility(id) {
      return toastResult(ui, upgradeFacility(ctx, id), {
        money: 'Không đủ tiền nâng cấp thiết bị',
        max: 'Thiết bị đã ở mức cao nhất',
        unknown: 'Không tìm thấy thiết bị',
        default: 'Không nâng cấp được thiết bị'
      });
    },
    hireStaff(role) {
      return toastResult(ui, hireStaff(ctx, role), {
        hired: 'Đã thuê người này rồi',
        role: 'Không thuê được vị trí này',
        default: 'Không thuê được nhân viên'
      });
    },
    fireStaff(role) {
      return fireStaff(ctx, role);
    },
    upgrade(id) {
      return toastResult(ui, upgradeComputer(ctx, id), {
        money: 'Không đủ tiền nâng cấp máy',
        unavailable: 'Máy này đang hỏng hoặc không dùng được',
        max: 'Máy đã ở cấu hình cao nhất',
        default: 'Không nâng cấp được máy'
      });
    },
    repair(id) {
      return toastResult(ui, repairComputer(ctx, id), {
        money: 'Không đủ tiền sửa máy',
        unavailable: 'Máy này không sửa được lúc này',
        default: 'Không sửa được máy'
      });
    },
    clean(id) {
      return toastResult(ui, cleanComputer(ctx, id), {
        money: 'Không đủ tiền vệ sinh máy',
        unavailable: 'Máy này không vệ sinh được lúc này',
        default: 'Không vệ sinh được máy'
      });
    },
    buyComputer(id = null) {
      return toastResult(ui, buyComputerSlot(ctx, id), {
        money: 'Không đủ tiền mua máy mới',
        full: 'Không còn chỗ để thêm máy',
        missing: 'Không tìm thấy máy này',
        default: 'Không mua thêm máy được'
      });
    },
    buyItem(id) {
      return toastResult(ui, buyCafeItem(ctx, id, 1), {
        money: 'Không đủ tiền nhập hàng',
        full: 'Kho đầy. Mở phòng kho để xếp thêm.',
        item: 'Không tìm thấy món hàng',
        default: 'Không nhập được hàng'
      });
    },
    buyFood() {
      return toastResult(ui, { ok: buyFoodPack(ctx), reason: 'money' }, {
        money: 'Không đủ tiền mua thức ăn',
        default: 'Không mua được thức ăn'
      });
    },
    buyMedicine(qty = 1) {
      return toastResult(ui, { ok: buyMedicine(ctx, qty), reason: 'money' }, {
        money: 'Không đủ tiền mua thuốc',
        default: 'Không mua được thuốc'
      });
    },
    setAutoPay(kind, value) {
      if (kind === 'food') state.family.autoPayFood = Boolean(value);
      if (kind === 'heat') state.family.autoPayHeat = Boolean(value);
    },
    hireGuard() {
      return toastResult(ui, hireGuard(ctx), {
        hired: 'Đã có bảo vệ rồi',
        default: 'Không thuê được bảo vệ'
      });
    },
    fireGuard() {
      return fireGuard(ctx);
    },
    repay(amount) {
      return toastResult(ui, ctx.economy.repayDebt(amount), {
        money: 'Không đủ tiền trả nợ',
        none: 'Không còn nợ để trả',
        default: 'Không trả được nợ'
      });
    },
    choose(choiceId, instanceId) {
      const result = ctx.events.choose(choiceId, instanceId);
      if (!result.ok) {
        return failAction(ui, result, {
          money: 'Không đủ tiền cho lựa chọn này',
          medicine: 'Không đủ tiền hoặc thuốc',
          guard: 'Chưa có bảo vệ',
          resource: 'Không đủ vật tư cần thiết',
          default: 'Chưa thực hiện được lựa chọn'
        });
      }
      clearFail(ui);
      return result;
    }
  };
}

const VIEW_SCALE_MIN = 0.7;
const VIEW_SCALE_MAX = 1.8;
const VIEW_SCALE_STEP = 0.1;

function storedMusic() {
  try {
    return localStorage.getItem('cafe-music') !== 'off';
  } catch {
    return true;
  }
}

function storedViewScale() {
  try {
    return clampViewScale(Number(localStorage.getItem('cafe-view-scale')));
  } catch {
    return 1;
  }
}

function clampViewScale(value) {
  if (!Number.isFinite(value)) return 1;
  const stepped = Math.round(value / VIEW_SCALE_STEP) * VIEW_SCALE_STEP;
  return Math.min(VIEW_SCALE_MAX, Math.max(VIEW_SCALE_MIN, Number(stepped.toFixed(1))));
}

function toastPlace(ui, result) {
  if (result?.ok) {
    clearFail(ui);
    return result;
  }
  return failAction(ui, result, {
    money: 'Không đủ tiền mua đồ này',
    tile: 'Ô này không đặt được. Chừa lối đi tới máy và cửa.',
    type: 'Không tìm thấy đồ nội thất',
    missing: 'Không tìm thấy món đang chọn',
    default: 'Không đặt được'
  });
}

function cleanName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function toastResult(ui, result, messages) {
  if (result?.ok) {
    clearFail(ui);
    return result;
  }
  return failAction(ui, result, messages);
}

function failAction(ui, result, messages = {}) {
  const message = failMessage(result?.reason, messages);
  ui.lastError = message;
  pushNote(ui, message, 'alert');
  return result;
}

function clearFail(ui) {
  ui.lastError = '';
}

function failMessage(reason, messages = {}) {
  if (typeof messages === 'string') return messages;
  if (reason && messages[reason]) return messages[reason];
  if (messages.default) return messages.default;
  if (reason === 'money') return 'Không đủ tiền';
  return 'Không thực hiện được';
}
