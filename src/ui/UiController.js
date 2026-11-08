import '../styles/interface.css';

import { TILE_SIZE } from '../assets/layout.js';
import { buildView } from '../state/buildView.js';
import { speechAnchor } from './speechAnchor.js';
import { pruneNotes } from './notes.js';
import { formatClock, formatMoney, formatSavedAt } from '../utils/format.js';
import { latestSave, slotLabel } from '../systems/save/SaveSystem.js';

const PANELS = [
  ['overview', 'Tiệm', 'shop'],
  ['computer', 'Máy', 'pc'],
  ['customer', 'Khách', 'guest'],
  ['shop', 'Quầy', 'counter'],
  ['staff', 'Nhân sự', 'staff'],
  ['facility', 'Cơ sở', 'facility'],
  ['rooms', 'Phòng', 'door'],
  ['finance', 'Giá', 'price'],
  ['family', 'Gia đình', 'home'],
  ['journal', 'Nhật ký', 'book']
];

const NAV_ICONS = {
  shop: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M6.5 10v9h11v-9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 19v-5h4v5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  pc: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 20h8M12 16v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  guest: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3" fill="currentColor"/><path d="M5.5 19.5c.9-3.2 3.3-5 6.5-5s5.6 1.8 6.5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  counter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h10v5.5a5 5 0 0 1-10 0V9z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 10.5h2.2a2.3 2.3 0 0 1 0 4.6H15" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 5c.5 1 .4 1.7 0 2.6M11 5c.5 1 .4 1.7 0 2.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  staff: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="2.3" fill="currentColor"/><circle cx="16" cy="9" r="1.8" fill="currentColor"/><path d="M3.8 19c.7-2.8 2.7-4.3 5.2-4.3s4.6 1.5 5.3 4.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M14.2 15.1c1.5-.2 2.9.3 3.8 1.5.6.8.8 1.6.8 2.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  facility: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2.5 5.5 13H11l-1 8.5L19 10h-5.5L13 2.5z" fill="currentColor"/></svg>',
  door: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h8.5a1.5 1.5 0 0 1 1.5 1.5V21H7V3z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="14.2" cy="12" r="1.1" fill="currentColor"/></svg>',
  price: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.2 4H20v7.8L11.2 20.6 4.4 13.8 12.2 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="16.2" cy="8" r="1.2" fill="currentColor"/></svg>',
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11.5 12 4l8.5 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M6.5 10.5V20h11v-9.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.2A2.2 2.2 0 0 1 7.2 3H19v16H7.2A2.2 2.2 0 0 0 5 21.2V5.2z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 8h6M9 12h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
};

export function mountUi(session, root) {
  root.replaceChildren();
  attachButtonFeel(root);
  const menu = el('div', 'menu');
  const hud = el('div', 'hud');
  const guidebar = el('div', 'guidebar');
  const drawer = el('aside', 'drawer');
  const dock = el('div', 'dock');
  const modal = el('div', 'modal');
  const toasts = el('div', 'toasts');
  const speech = el('div', 'speech-layer');
  root.append(menu, hud, guidebar, drawer, dock, modal, toasts, speech);
  const tickSpeech = () => {
    try {
      syncSpeechLayer(speech, session);
    } catch (error) {
      console.error(error);
    }
    requestAnimationFrame(tickSpeech);
  };
  requestAnimationFrame(tickSpeech);

  let drawerKey = '';
  let modalKey = '';
  let menuKey = '';
  let guideKey = '';
  let dockKey = '';
  let listedMenu = false;
  const saves = { list: [] };

  const refreshSaves = async () => {
    saves.list = await session.listSaves();
    menuKey = '';
  };

  const paint = () => {
    const view = buildView(session);
    paintHud(hud, view);
    const nextGuide = view.guide.showBar ? `on-${view.family.alert}` : '';
    if (nextGuide !== guideKey) {
      guideKey = nextGuide;
      paintGuideBar(guidebar, view, session);
    }
    guidebar.hidden = !view.guide.showBar;
    const nextDock = dockSignature(view);
    if (nextDock !== dockKey) {
      dockKey = nextDock;
      paintDock(dock, view, session);
    }
    paintToasts(toasts, session);
    if (view.screen === 'menu' && !listedMenu) {
      listedMenu = true;
      refreshSaves();
    }
    if (view.screen !== 'menu') listedMenu = false;
    const nextMenu = view.screen === 'menu'
      ? `menu-${saves.list.length}-${saves.list.map((record) => record.savedAt).join()}`
      : view.screen === 'naming'
        ? 'naming'
        : '';
    if (nextMenu !== menuKey) {
      menuKey = nextMenu;
      if (view.screen === 'naming') paintNaming(menu, session);
      else if (view.screen === 'menu') paintMenu(menu, view, session, saves.list, refreshSaves);
    }
    const covered = view.screen === 'menu' || view.screen === 'naming';
    menu.hidden = !covered;
    hud.hidden = covered;
    dock.hidden = covered;

    const nextDrawer = drawerSignature(view);
    if (nextDrawer !== drawerKey) {
      drawerKey = nextDrawer;
      paintDrawer(drawer, view, session);
    }
    drawer.hidden = covered;
    drawer.classList.toggle('active', !covered && view.drawerOpen);

    const nextModal = modalSignature(view);
    if (nextModal !== modalKey) {
      modalKey = nextModal;
      paintModal(modal, view, session);
    }
    modal.hidden = !nextModal;
  };

  const loop = () => {
    paint();
    requestAnimationFrame(loop);
  };
  refreshSaves().finally(loop);
}

function paintHud(node, view) {
  node.replaceChildren(
    stat('Ngày', view.date, 'calm', HUD_DAY),
    stat('Giờ', `${view.clock} ${view.period}`, 'calm', HUD_CLOCK),
    stat('Tiệm', view.cafeName, 'cafe', HUD_CAFE),
    stat('Tiền', view.money, 'money', HUD_MONEY),
    stat('Uy tín', String(view.reputation), view.reputation >= 50 ? 'good' : 'warn', HUD_REP),
    stat('Khách', String(view.customerCount), view.customerCount ? 'good' : 'calm', HUD_GUEST),
    stat('Máy trống', String(view.freeComputers), view.freeComputers ? 'good' : 'warn', HUD_PC),
    stat('Sự cố', String(view.incidents), view.incidents ? 'alert' : 'good', HUD_ALERT)
  );
}

function houseStat(view, session) {
  const node = el('button', `stat tone-${view.family.alert ? 'alert' : 'good'}`);
  node.type = 'button';
  node.title = 'Gia đình';
  node.setAttribute('aria-label', view.family.alert ? 'Gia đình: Cần lo' : 'Gia đình: Ổn');
  const icon = el('i', 'stat-icon');
  icon.innerHTML = HUD_HOME;
  node.append(icon, el('b', '', view.family.alert ? 'Cần lo' : 'Ổn'));
  node.addEventListener('click', () => session.setPanel('family'));
  return node;
}

function paintGuideBar(node, view, session) {
  if (!view.guide.showBar) {
    node.replaceChildren();
    return;
  }
  const open = button('Học lại hướng dẫn', () => session.openGuide());
  open.classList.add('guide-reopen');
  node.replaceChildren(open, houseStat(view, session));
}

function dockSignature(view) {
  if (view.screen === 'menu' || view.screen === 'naming') return 'hidden';
  return [view.userPaused, view.speed, view.open, view.dayEnded, view.music, view.viewScale, view.build, view.drawerOpen].join('|');
}

function paintDock(node, view, session) {
  node.replaceChildren();
  if (view.screen === 'menu' || view.screen === 'naming') return;
  const menuToggle = iconButton(view.drawerOpen ? 'Đóng bảng quản lý' : 'Mở bảng quản lý', MENU_ICON, () => session.toggleDrawer(), view.drawerOpen);
  menuToggle.classList.add('drawer-toggle');
  node.append(
    menuToggle,
    iconButton(view.userPaused ? 'Tiếp tục' : 'Tạm dừng', view.userPaused ? PLAY_ICON : PAUSE_ICON, () => session.togglePause()),
    iconButton('Tốc độ x1', speedIcon(1), () => session.setSpeed(1), view.speed === 1),
    iconButton('Tốc độ x2', speedIcon(2), () => session.setSpeed(2), view.speed === 2),
    iconButton('Tốc độ x3', speedIcon(3), () => session.setSpeed(3), view.speed === 3),
    iconButton(view.open ? 'Đóng cửa' : 'Mở cửa', view.open ? DOOR_OPEN_ICON : DOOR_SHUT_ICON, () => session.toggleDoor(), !view.open),
    iconButton(view.music ? 'Tắt nhạc' : 'Bật nhạc', view.music ? MUSIC_ICON : MUSIC_OFF_ICON, () => session.toggleMusic(), view.music),
    iconButton(`Thu nhỏ bản đồ (${Math.round(view.viewScale * 100)}%)`, ZOOM_OUT_ICON, () => session.nudgeViewScale(-1), false, view.viewScale <= 0.7),
    iconButton(`Phóng to bản đồ (${Math.round(view.viewScale * 100)}%)`, ZOOM_IN_ICON, () => session.nudgeViewScale(1), false, view.viewScale >= 1.8),
    iconButton(view.build ? 'Xong xếp đồ' : 'Xếp đồ', CHAIR_ICON, () => session.toggleBuild(), view.build),
    iconButton('Kết thúc ngày', MOON_ICON, () => session.endDay(), false, view.dayEnded),
    iconButton('Lưu ô 1', saveIcon(1), () => { void session.save(1); }),
    iconButton('Lưu ô 2', saveIcon(2), () => { void session.save(2); }),
    iconButton('Lưu ô 3', saveIcon(3), () => { void session.save(3); })
  );
}

const MENU_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
const PAUSE_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/></svg>';
const PLAY_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
const DOOR_OPEN_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 20V5h10v15" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14 8l6 2v10l-6 2V8z" fill="currentColor"/><circle cx="17.5" cy="13" r="1" fill="#3a2a1c"/></svg>';
const DOOR_SHUT_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="6" y="3" width="12" height="18" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/></svg>';
const MOON_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 3a8 8 0 1 0 6 13 6.5 6.5 0 1 1-6-13z" fill="currentColor"/></svg>';
const MUSIC_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 17V6l10-2v11" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="7" cy="17" r="2.4" fill="currentColor"/><circle cx="17" cy="15" r="2.4" fill="currentColor"/></svg>';
const MUSIC_OFF_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 17V6l10-2v11" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="7" cy="17" r="2.4" fill="currentColor"/><circle cx="17" cy="15" r="2.4" fill="currentColor"/><path d="M4 4l16 16" stroke="currentColor" stroke-width="2"/></svg>';
const CHAIR_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M7 11V4h10v7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 11h14v4H5z" fill="currentColor"/><path d="M7 15v5M17 15v5" stroke="currentColor" stroke-width="2"/></svg>';
const ZOOM_OUT_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 12h12" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
const ZOOM_IN_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 12h12M12 6v12" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
const HUD_DAY = hudSvg('<rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 10h16M8 3v4M16 3v4" stroke="currentColor" stroke-width="2"/><rect x="8" y="13" width="3" height="3" fill="currentColor"/>');
const HUD_CLOCK = hudSvg('<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v5l3.5 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>');
const HUD_CAFE = hudSvg('<path d="M4 11h16l-1.2 8H5.2z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 11l9-7 9 7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 19v-5h4v5" fill="none" stroke="currentColor" stroke-width="2"/>');
const HUD_MONEY = hudSvg('<circle cx="9" cy="14" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="15" cy="10" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 7.5v5M13.4 9c.4-.5 1-.8 1.6-.8 1 0 1.6.5 1.6 1.2s-.6 1.2-2 1.4c-1.3.2-2 .7-2 1.5 0 .8.7 1.3 1.8 1.3.7 0 1.3-.3 1.6-.8" fill="none" stroke="currentColor" stroke-width="1.6"/>');
const HUD_REP = hudSvg('<path d="M12 3.4l2.2 5.1 5.5.6-4.1 3.7 1.2 5.5L12 15.8 7.2 18.3l1.2-5.5L4.3 9.1l5.5-.6z" fill="currentColor"/>');
const HUD_GUEST = hudSvg('<circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5.5 19c.8-3.4 3.2-5 6.5-5s5.7 1.6 6.5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>');
const HUD_PC = hudSvg('<rect x="3" y="5" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 21h8M12 17v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>');
const HUD_ALERT = hudSvg('<path d="M12 4l9 16H3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.1" fill="currentColor"/>');
const HUD_HOME = hudSvg('<path d="M4 11l8-7 8 7v9H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 20v-6h4v6" fill="none" stroke="currentColor" stroke-width="2"/>');

function hudSvg(inner) {
  return `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">${inner}</svg>`;
}

function speedIcon(count) {
  const width = 5;
  const gap = 2;
  const total = count * width + (count - 1) * gap;
  const start = (24 - total) / 2;
  let marks = '';
  for (let i = 0; i < count; i += 1) {
    const x = start + i * (width + gap);
    marks += `<path d="M${x} 6 L${x + width} 12 L${x} 18 Z" fill="currentColor"/>`;
  }
  return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">${marks}</svg>`;
}

function saveIcon(slot) {
  return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 3h11l3 3v15H5V3z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 3h8v6H8z" fill="currentColor"/><text x="12" y="19" text-anchor="middle" font-size="8" font-family="Be Vietnam Pro, sans-serif" font-weight="700" fill="currentColor">${slot}</text></svg>`;
}

function paintMenu(node, view, session, saves, refreshSaves) {
  const sheet = el('div', 'sheet');
  sheet.append(el('h1', '', 'Internet Café Tycoon'));
  sheet.append(el('p', 'muted', 'Mở tiệm net, giữ khách vui vẻ, lo luôn cả nhà. Chơi bằng chuột. Nhạc nền bật sau lần bấm đầu tiên.'));
  const actions = el('div', 'actions');
  const start = button('Trò chơi mới', () => session.openFounding());
  start.classList.add('btn-go');
  actions.append(start);
  const newest = latestSave(saves);
  const cont = button('Tiếp tục', async () => {
    if (newest?.slot == null) return;
    await session.load(newest.slot);
  });
  cont.disabled = !newest;
  actions.append(cont);
  sheet.append(actions);

  const list = el('div', 'save-slots');
  list.append(el('div', 'muted', 'Ô lưu state'));
  const bySlot = new Map(saves.map((record) => [record.slot, record]));
  for (const slot of SAVE_SLOTS) {
    list.append(saveSlotRow(bySlot.get(slot), slot, session, refreshSaves));
  }
  sheet.append(list);
  sheet.append(button('Làm mới danh sách', refreshSaves));
  node.replaceChildren(sheet);
  void view;
}

const SAVE_SLOTS = [0, 1, 2, 3];

function saveSlotRow(record, slot, session, refreshSaves) {
  const row = el('div', `save-slot${record ? '' : ' empty'}`);
  const meta = el('div', 'save-slot-meta');
  const actions = el('div', 'save-slot-actions');
  meta.append(el('strong', 'save-slot-title', slotLabel(slot)));
  if (!record) {
    meta.append(el('span', 'save-slot-sub muted', 'Trống'));
    row.append(meta);
    const load = button('Tải', () => {});
    load.disabled = true;
    const remove = button('Xóa', () => {});
    remove.disabled = true;
    actions.append(load, remove);
    row.append(actions);
    return row;
  }
  const cafeName = record.summary?.cafeName || 'Tiệm';
  const who = record.summary?.playerName ? ` · ${record.summary.playerName}` : '';
  const day = record.summary?.day ?? '?';
  const clock = record.summary?.time != null ? ` · ${formatClock(record.summary.time)}` : '';
  const money = record.summary?.money != null ? formatMoney(record.summary.money) : '';
  const when = formatSavedAt(record.savedAt);
  meta.append(el('span', 'save-slot-sub', `${cafeName}${who}`));
  meta.append(el('span', 'save-slot-sub muted', `Ngày ${day}${clock}${money ? ` · ${money}` : ''}`));
  if (when) meta.append(el('span', 'save-slot-time', `Lưu lúc ${when}`));
  row.append(meta);
  actions.append(button('Tải', async () => { await session.load(record.slot); }));
  const remove = button('Xóa', async () => {
    const label = slotLabel(record.slot);
    if (!window.confirm(`Xóa ${label}? Không lấy lại được.`)) return;
    const result = await session.deleteSave(record.slot);
    if (result.ok) await refreshSaves();
  });
  remove.classList.add('btn-danger');
  actions.append(remove);
  row.append(actions);
  return row;
}

const CAFE_NAMES = [
  'NET LAG ÍT',
  'NET THẦN TỐC',
  'NET CÓ BA',
  'NET TÍ TỞ',
  'NET BẤT BẠI',
  'NET KHÔNG NGỦ',
  'NET VỀ KHUYA',
  'NET ÔNG CHÚ'
];

function paintNaming(node, session) {
  const card = el('div', 'founding-card');
  const title = el('h1', 'pixel-title', 'TẠO CHỦ QUÁN');
  title.prepend(el('i', 'pixel-mark'));
  card.append(title);

  card.append(fieldLabel('TÊN NGƯỜI CHƠI', 'nhà và khách gọi bạn thế này'));
  const playerInput = textField('Ví dụ: Minh Trí', 16);
  card.append(playerInput);
  card.append(el('p', 'founding-note', 'Tên này theo bạn suốt ván. Nhà với khách sẽ gọi như vậy.'));

  const banner = el('div', 'name-banner', 'NET LAG ÍT');
  card.append(banner);

  card.append(fieldLabel('TÊN TIỆM'));
  const cafeInput = textField('Tên tiệm', 22);
  cafeInput.value = 'NET LAG ÍT';
  const dice = button('Đổi', () => applyCafeName(cafeInput, banner, pickCafeName()));
  dice.classList.add('dice');
  dice.setAttribute('aria-label', 'Tên tiệm ngẫu nhiên');
  const nameRow = el('div', 'name-row');
  nameRow.append(cafeInput, dice);
  card.append(nameRow);

  const chips = el('div', 'chips');
  for (const name of CAFE_NAMES.slice(1, 5)) {
    const chip = button(name, () => applyCafeName(cafeInput, banner, name));
    chip.classList.add('chip');
    chips.append(chip);
  }
  card.append(chips);

  const error = el('div', 'error founding-error');
  card.append(error);

  const cancel = button('Hủy', () => session.cancelFounding());
  cancel.classList.add('btn-ghost');
  const go = button('KHAI TRƯƠNG!', () => {
    const result = session.foundCafe({
      playerName: playerInput.value,
      cafeName: cafeInput.value
    });
    error.textContent = result.ok ? '' : result.message;
  });
  go.classList.add('btn-go');
  go.prepend(el('span', 'go-check', '✓'));
  const actions = el('div', 'founding-actions');
  actions.append(cancel, go);
  card.append(actions);

  cafeInput.addEventListener('input', () => {
    banner.textContent = cafeInput.value.trim() || 'TÊN TIỆM';
  });
  playerInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') cafeInput.focus();
  });
  cafeInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') go.click();
  });

  node.replaceChildren(card);
  requestAnimationFrame(() => playerInput.focus());
}

function applyCafeName(input, banner, name) {
  input.value = name;
  banner.textContent = name;
  input.focus();
}

function pickCafeName() {
  return CAFE_NAMES[Math.floor(Math.random() * CAFE_NAMES.length)];
}

function fieldLabel(kicker, hint) {
  const label = el('label', 'field-label');
  label.append(el('span', 'field-kicker', kicker));
  if (hint) label.append(el('span', 'field-hint', hint));
  return label;
}

function textField(placeholder, maxLength) {
  const input = el('input', 'field-input');
  input.type = 'text';
  input.maxLength = maxLength;
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  return input;
}

function paintDrawer(node, view, session) {
  node.replaceChildren();
  const head = el('div', 'drawer-head');
  const close = button('Đóng', () => session.closeDrawer());
  close.classList.add('drawer-close');
  close.setAttribute('aria-label', 'Đóng bảng quản lý');
  head.append(close);
  const nav = el('nav', 'nav');
  nav.setAttribute('aria-label', 'Mục quản lý');
  for (const [id, label, icon] of PANELS) {
    const item = navButton(label, NAV_ICONS[icon], () => session.setPanel(id), view.panel === id);
    if (id === 'family' && view.family.alert) {
      item.classList.add('has-alert');
      item.setAttribute('aria-label', `${label}, cần lo`);
    }
    nav.append(item);
  }
  const body = el('div', 'drawer-body');
  const error = el('div', 'error', view.lastError);
  if (!view.lastError) error.hidden = true;
  body.append(error);
  if (view.panel === 'overview') body.append(overview(view, session));
  if (view.panel === 'computer') body.append(computerPanel(view, session));
  if (view.panel === 'customer') body.append(customerPanel(view, session));
  if (view.panel === 'shop') body.append(shopPanel(view, session));
  if (view.panel === 'staff') body.append(staffPanel(view, session));
  if (view.panel === 'facility') body.append(facilityPanel(view, session));
  if (view.panel === 'rooms') body.append(roomsPanel(view, session));
  if (view.panel === 'finance') body.append(financePanel(view, session));
  if (view.panel === 'family') body.append(familyPanel(view, session));
  if (view.panel === 'journal') body.append(journalPanel(view));
  node.append(head, nav, body);
}

function navButton(label, svg, onClick, active) {
  const node = el('button', `nav-item${active ? ' active' : ''}`);
  node.type = 'button';
  if (active) node.setAttribute('aria-current', 'page');
  const icon = el('span', 'nav-ico');
  icon.innerHTML = svg;
  node.append(icon, el('span', 'nav-label', label));
  node.addEventListener('click', onClick);
  return node;
}

function overview(view, session) {
  const box = el('div');
  box.append(el('h2', '', view.cafeName));
  box.append(el('p', 'muted', `${view.playerName} · ${view.open ? 'Cửa đang mở' : 'Cửa đang đóng'}`));
  box.append(row('Máy hoạt động', `${view.activeComputers}`));
  box.append(row('Máy trống', `${view.freeComputers}`));
  box.append(row('Doanh thu hôm nay', view.report.revenueLabel));
  box.append(row('Chi phí hôm nay', view.report.expenseLabel));
  box.append(row('Nợ', view.debtLabel));
  if (view.debt > 0) box.append(button('Trả 500.000đ', () => session.repay(500000)));
  if (view.nextSlot) box.append(button(`Mua máy mới (${view.newComputerCost})`, () => session.buyComputer()));
  const locked = view.rooms.filter((room) => !room.unlocked);
  if (locked.length) {
    box.append(el('p', 'muted', `Chưa mở: ${locked.map((room) => `${room.name} ${room.costLabel}`).join(' · ')}. Bấm ô xám trên sàn để xem giá.`));
  }
  box.append(el('p', 'muted', 'Bấm máy, khách, cửa, quầy hoặc phòng đang khóa.'));
  return box;
}

function computerPanel(view, session) {
  const box = el('div');
  const selected = view.computers.find((pc) => pc.id === view.selection?.id) ?? view.computers[0];
  if (!selected) return box;
  box.append(el('h2', '', selected.id.toUpperCase()));
  box.append(row('Hạng', selected.tierName));
  box.append(row('Trạng thái', view.statusLabel[selected.status] || selected.status));
  box.append(row('Giá giờ', formatMoney(selected.price)));
  box.append(row('Tình trạng', `${Math.round(selected.condition)}%`));
  box.append(row('Sạch', `${Math.round(selected.cleanliness)}%`));
  box.append(el('p', 'muted', selected.specs));
  if (selected.occupantName) box.append(row('Khách', selected.occupantName));
  const actions = el('div', 'actions');
  if (selected.status === 'locked') {
    const room = view.rooms.find((item) => item.id === selected.room);
    actions.append(button(room ? `Mở ${room.name} (${room.costLabel})` : 'Mở phòng', () => {
      if (room) session.unlockRoom(room.id);
    }));
  } else if (selected.status === 'disabled') actions.append(button('Mua máy này', () => session.buyComputer()));
  else {
    const tierIndex = view.tiers.findIndex((tier) => tier.id === selected.tier);
    const next = view.tiers[tierIndex + 1];
    if (next) actions.append(button(`Nâng lên ${next.name} (${formatMoney(next.upgradeCost)})`, () => session.upgrade(selected.id)));
    actions.append(button('Sửa', () => session.repair(selected.id)));
    actions.append(button('Vệ sinh', () => session.clean(selected.id)));
  }
  box.append(actions);
  return box;
}

const CUSTOMER_STATE = {
  searching: 'Đang tìm máy',
  moving: 'Đang vào chỗ',
  waiting: 'Ngồi chờ mở máy',
  playing: 'Đang chơi',
  payment: 'Đang trả tiền',
  incident: 'Đang chờ bạn xử lý',
  leaving: 'Đang ra về',
  exiting: 'Đang ra về'
};

function customerPanel(view, session) {
  const box = el('div');
  const customer = view.customers.find((item) => item.id === view.selection?.id);
  box.append(el('h2', '', customer ? customer.name : 'Khách'));
  if (!customer) {
    box.append(el('p', 'muted', 'Bấm vào một khách trên sàn quán.'));
    return box;
  }
  box.append(row('Loại', customer.label));
  box.append(row('Đang làm gì', CUSTOMER_STATE[customer.state] || customer.state));
  box.append(row('Hài lòng', `${customer.satisfaction}`));
  if (customer.visits) box.append(row('Đã ghé', `${customer.visits} lần`));
  if (customer.state === 'waiting') {
    const request = el('p', 'request', `Muốn thuê ${customer.requestLabel}.`);
    box.append(request);
    box.append(row('Tiền giờ khoảng', customer.quoteLabel));
    if (view.staffAssist) {
      box.append(el('p', 'muted', 'Nhân viên sẽ tự mở máy, không cần bấm chấm than.'));
    } else {
      const start = button('Mở máy', () => session.startMachine(customer.id));
      start.classList.add('btn-go');
      box.append(start);
    }
  } else {
    box.append(row('Đã ngồi', `${customer.sessionMinutes} / ${customer.plannedMinutes} phút`));
    box.append(row('Hóa đơn', customer.billLabel));
  }
  if (customer.state === 'incident') box.append(el('p', 'muted', 'Khách này đang làm khó. Xử lý trong hộp thoại nhé.'));
  if (customer.speech) box.append(el('p', 'speech-quote', `“${customer.speech}”`));
  return box;
}

function shopPanel(view, session) {
  const box = el('div');
  box.append(el('h2', '', 'Quầy hàng'));
  for (const item of view.items) {
    const line = el('div', 'block');
    line.append(row(item.name, `Kho ${view.stock[item.id] ?? 0}/${view.stockLimit}`));
    line.append(row('Giá nhập', formatMoney(item.cost)));
    line.append(row('Giá bán', formatMoney(item.salePrice)));
    line.append(button('Nhập 1', () => session.buyItem(item.id)));
    box.append(line);
  }
  return box;
}

function staffPanel(view, session) {
  const box = el('div');
  box.append(el('h2', '', 'Nhân viên'));
  box.append(el('p', 'muted', 'Lương 25.000đ/giờ khi quán mở. Có nhân viên thì tự mở máy cho khách, không cần bấm chấm than.'));
  for (const member of view.staff) {
    const line = el('div', 'block');
    line.append(row(member.name, member.wageLabel || formatMoney(member.salary)));
    line.append(el('p', 'muted', member.blurb));
    if (member.hired) line.append(button('Cho nghỉ', () => session.fireStaff(member.role)));
    else line.append(button(`Thuê ${member.name.toLowerCase()}`, () => session.hireStaff(member.role)));
    box.append(line);
  }
  const guard = el('div', 'block');
  guard.append(el('strong', '', 'Bảo vệ'));
  if (!view.guard) {
    guard.append(el('p', 'muted', 'Lương 80.000đ mỗi ngày. Khách toan chuồn thì ông giữ lại.'));
    guard.append(button('Thuê bảo vệ', () => session.hireGuard()));
  } else {
    guard.append(row('Lương', formatMoney(view.guard.salary)));
    guard.append(button('Cho nghỉ', () => session.fireGuard()));
  }
  box.append(guard);
  return box;
}

function facilityPanel(view, session) {
  const box = el('div');
  box.append(el('h2', '', 'Cơ sở'));
  box.append(el('p', 'muted', 'Máy lạnh, mạng và điện. Nâng trước khi quán nóng, lag hay sập nguồn.'));
  for (const facility of view.facilities) {
    const line = el('div', 'block');
    line.append(row(facilityLabel(facility.id), facility.name));
    line.append(el('p', 'muted', facility.detail));
    if (facility.nextName) {
      line.append(el('p', 'muted', `Lên ${facility.nextName}: ${facility.nextDetail}`));
      line.append(button(`Nâng cấp (${facility.nextCost})`, () => session.upgradeFacility(facility.id)));
    } else {
      line.append(el('p', 'muted', 'Đã nâng hết mức.'));
    }
    box.append(line);
  }
  return box;
}

function facilityLabel(id) {
  if (id === 'cooling') return 'Máy lạnh';
  if (id === 'network') return 'Mạng';
  return 'Điện';
}

function roomsPanel(view, session) {
  const box = el('div');
  box.append(el('h2', '', 'Phòng'));
  box.append(el('p', 'muted', 'Phòng chưa mở thì xám, có ổ khóa. Bấm phòng trên sàn để xem giá.'));
  const selectedId = view.selection?.type === 'room' ? view.selection.id : null;
  const ordered = [...view.rooms].sort((a, b) => Number(b.id === selectedId) - Number(a.id === selectedId));
  for (const room of ordered) {
    const line = el('div', 'block');
    line.append(row(room.name, room.unlocked ? 'Đã mở' : room.costLabel));
    line.append(el('p', 'muted', room.effect));
    if (!room.unlocked) line.append(button(`Mở ${room.name}`, () => session.unlockRoom(room.id)));
    box.append(line);
  }
  box.append(el('h2', '', 'Xếp đồ'));
  box.append(el('p', 'muted', view.build
    ? 'Bấm ô sàn trống để đặt. Bấm món đã có rồi bấm ô khác để dời.'
    : 'Bật xếp đồ, chọn món, rồi bấm sàn. Đồ trong kho đặt lại không mất tiền.'));
  box.append(button(view.build ? 'Xong' : 'Bật xếp đồ', () => session.toggleBuild(), view.build));
  for (const item of view.catalog) {
    const label = item.owned > 0 ? `${item.name} · sẵn ${item.owned}` : `${item.name} · ${item.costLabel}`;
    box.append(button(label, () => session.armFurniture(item.id), view.build && view.buildType === item.id));
  }
  const selected = view.selection?.type === 'furniture'
    ? view.placed.find((piece) => piece.id === view.selection.id)
    : null;
  if (selected) {
    const spec = view.catalog.find((item) => item.id === selected.type);
    box.append(el('p', 'muted', `Đang chọn ${spec?.name ?? 'món'} ở ô ${selected.x}, ${selected.y}.`));
    box.append(button('Cất vào kho', () => session.stashFurniture()));
  }
  return box;
}

function financePanel(view, session) {
  const box = el('div');
  box.append(el('h2', '', 'Giá giờ chơi'));
  for (const tier of view.tiers) {
    const line = el('div', 'row');
    line.append(el('span', '', tier.name));
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '2000';
    input.max = '40000';
    input.step = '500';
    input.value = String(view.prices[tier.id]);
    input.addEventListener('change', () => session.setPrice(tier.id, Number(input.value)));
    line.append(input);
    box.append(line);
  }
  box.append(el('p', 'muted', 'Giá từ 2.000đ đến 40.000đ mỗi giờ. Cao quá khách ngại, đứng dậy về.'));
  box.append(el('h2', '', 'Đồ ăn và nước'));
  for (const item of view.items) {
    const line = el('div', 'row');
    line.append(el('span', '', item.name));
    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(item.cost);
    input.max = String(item.cost * 5);
    input.step = '1000';
    input.value = String(item.salePrice);
    input.addEventListener('change', () => session.setItemPrice(item.id, Number(input.value)));
    line.append(input);
    box.append(line);
  }
  box.append(el('p', 'muted', 'Giá món từ giá nhập đến gấp 5. Khách hết tiền thì thôi, không mua.'));
  return box;
}

function familyPanel(view, session) {
  const box = el('div');
  box.append(el('h2', '', 'Gia đình'));
  box.append(row('Thức ăn', `${view.family.food} suất`));
  box.append(row('Thuốc', `${view.family.medicine}`));
  box.append(row('Sưởi hôm nay', view.family.heatPaid ? 'Đã trả' : 'Chưa trả'));
  const food = el('label', 'row');
  const foodInput = document.createElement('input');
  foodInput.type = 'checkbox';
  foodInput.checked = view.family.autoPayFood;
  foodInput.addEventListener('change', () => session.setAutoPay('food', foodInput.checked));
  food.append(foodInput, el('span', '', 'Tự mua thức ăn'));
  const heat = el('label', 'row');
  const heatInput = document.createElement('input');
  heatInput.type = 'checkbox';
  heatInput.checked = view.family.autoPayHeat;
  heatInput.addEventListener('change', () => session.setAutoPay('heat', heatInput.checked));
  heat.append(heatInput, el('span', '', 'Tự trả tiền sưởi'));
  box.append(food, heat);
  box.append(button('Mua 3 suất ăn', () => session.buyFood()));
  box.append(button('Mua thuốc', () => session.buyMedicine(1)));
  for (const member of view.family.members) {
    const card = el('div', 'family-card person');
    const img = document.createElement('img');
    img.className = 'portrait';
    img.alt = member.name;
    if (view.portraits[member.id]) img.src = view.portraits[member.id];
    const info = el('div');
    info.append(el('strong', '', member.name));
    const status = el('div');
    status.append(pip(member.status), document.createTextNode(` ${member.statusLabel}`));
    info.append(status);
    info.append(el('div', 'muted', `Đói ${member.hunger} · Lạnh ${member.cold} · Máu ${member.health}`));
    card.append(img, info);
    box.append(card);
  }
  return box;
}

function journalPanel(view) {
  const box = el('div');
  box.append(el('h2', '', 'Nhật ký'));
  if (!view.journal.length) box.append(el('p', 'muted', 'Chưa có quyết định nào.'));
  for (const entry of view.journal) {
    const line = el('div', 'block');
    const tone = entry.tone === 'beneficial' ? 'Tin vui' : entry.tone === 'adverse' ? 'Rắc rối' : '';
    line.append(row(`Ngày ${entry.day}${tone ? ` · ${tone}` : ''}`, entry.title || entry.id));
    line.append(el('p', 'muted', entry.choiceLabel || entry.choiceId));
    box.append(line);
  }
  return box;
}

function paintModal(node, view, session) {
  node.replaceChildren();
  if (view.guide.open) {
    node.append(guideSheet(view, session));
    return;
  }
  if (view.activeEvent && view.screen !== 'menu') {
    const sheet = el('div', 'sheet');
    if (view.activeEvent.tone) sheet.classList.add(`tone-${view.activeEvent.tone}`);
    if (view.activeEvent.kicker) {
      sheet.append(el('p', `event-kicker ${view.activeEvent.tone}`, view.activeEvent.kicker));
    }
    sheet.append(el('h2', '', view.activeEvent.title));
    sheet.append(el('p', 'dialog-copy', view.activeEvent.description));
    if (view.lastError) sheet.append(el('div', 'error', view.lastError));
    for (const choice of view.activeEvent.choices) {
      const choiceButton = button(choice.label, () => session.choose(choice.id, view.activeEvent.instanceId));
      choiceButton.classList.add('choice');
      sheet.append(choiceButton);
    }
    node.append(sheet);
    return;
  }
  if (view.screen === 'report' || view.screen === 'ending') {
    const sheet = el('div', 'sheet');
    const title = view.ending === 'family'
      ? 'Nhà không trụ nổi nữa'
      : view.ending === 'collapse'
        ? 'Tiệm sập vì nợ'
        : view.ending === 'balanced'
          ? 'Tạm ổn, sống được'
          : `Sổ ngày ${view.day}`;
    sheet.append(el('h2', '', title));
    sheet.append(row('Doanh thu', view.report.revenueLabel));
    sheet.append(row('Chi phí', view.report.expenseLabel));
    sheet.append(row('Lãi', view.report.profitLabel));
    sheet.append(row('Thiếu, ghi nợ', view.report.shortfallLabel));
    if (view.dayEvents.adverse || view.dayEvents.beneficial) {
      sheet.append(row('Trong ngày', `${view.dayEvents.adverse} rắc rối · ${view.dayEvents.beneficial} tin vui`));
    }
    const ledger = el('div', 'ledger');
    for (const line of view.report.lines.slice(-8)) {
      const tone = line.type === 'revenue' ? 'earn' : line.type === 'debt' ? 'alert' : 'spend';
      const entry = row(line.description, `${line.type === 'revenue' ? '+' : '−'}${formatMoney(line.amount)}`);
      entry.classList.add(tone);
      ledger.append(entry);
    }
    sheet.append(ledger);
    if (view.ending === 'balanced') {
      sheet.append(el('p', 'muted', 'Tiệm với nhà đang đứng được. Có thể chơi tiếp, không hạn ngày.'));
      sheet.append(button('Chơi tiếp', () => session.continueDay()));
    } else if (view.ending) {
      sheet.append(button('Về menu', () => session.acceptEnding()));
    } else {
      sheet.append(button('Sang ngày mới', () => session.continueDay()));
    }
    node.append(sheet);
  }
}

function guideSheet(view, session) {
  const sheet = el('div', 'guide-sheet');
  const title = el('h2', 'guide-title', 'HƯỚNG DẪN');
  title.prepend(el('i', 'pixel-mark'));
  sheet.append(title);
  sheet.append(el('p', 'guide-lead', 'Quán gặp gì thì làm theo từng việc. Mở bảng này thì đồng hồ dừng.'));
  const progress = el('div', 'guide-progress');
  const fill = el('span');
  fill.style.width = `${Math.round(view.guide.progress * 100)}%`;
  progress.append(fill);
  sheet.append(progress);
  const list = el('div', 'guide-list');
  for (const card of view.guide.cards) {
    const rowCard = el('article', `guide-card ${card.status}`);
    rowCard.append(el('div', 'guide-icon', card.icon));
    const copy = el('div');
    copy.append(el('h3', '', card.title));
    copy.append(el('p', '', card.body));
    const actions = el('div', 'guide-row');
    const action = button(card.action, () => session.followLesson(card.id));
    action.classList.add('pill-go');
    actions.append(action, el('span', `guide-status ${card.status}`, card.statusLabel));
    copy.append(actions);
    rowCard.append(copy);
    list.append(rowCard);
  }
  sheet.append(list);
  const close = button('Đóng', () => session.closeGuide());
  close.classList.add('btn-go', 'guide-close');
  sheet.append(close);
  return sheet;
}

function paintToasts(node, session) {
  pruneNotes(session.ui);
  const notes = session.ui.notes;
  const keep = new Set(notes.map((note) => note.id));
  for (const child of [...node.children]) {
    if (!keep.has(child.dataset.note)) child.remove();
  }
  const seen = new Set([...node.children].map((child) => child.dataset.note));
  for (const note of notes) {
    if (seen.has(note.id)) continue;
    const toast = el('div', `toast ${note.kind || 'info'}`);
    toast.dataset.note = note.id;
    toast.append(el('i', 'toast-pip'), el('span', '', note.text));
    node.append(toast);
  }
  for (const [index, note] of notes.entries()) {
    const child = node.querySelector(`[data-note="${CSS.escape(note.id)}"]`);
    if (child && node.children[index] !== child) node.insertBefore(child, node.children[index] ?? null);
  }
}

function drawerSignature(view) {
  if (view.screen === 'menu' || view.screen === 'naming') return 'hidden';
  return JSON.stringify({
    panel: view.panel,
    selection: view.selection,
    open: view.open,
    computers: view.computers.map((pc) => [pc.id, pc.status, pc.tier, Math.round(pc.condition), pc.occupantId]),
    guard: Boolean(view.guard),
    staff: view.staff.map((member) => member.hired).join(''),
    facilities: view.facilities.map((facility) => facility.level).join(''),
    stock: view.stock,
    stockLimit: view.stockLimit,
    rooms: view.rooms.map((room) => room.unlocked),
    build: view.build,
    buildType: view.buildType,
    bag: view.bag,
    placed: view.placed.map((piece) => [piece.id, piece.type, piece.x, piece.y]),
    prices: view.prices,
    itemPrices: view.items.map((item) => item.salePrice).join(','),
    family: [view.family.food, view.family.medicine, view.family.heatPaid, view.family.autoPayFood, view.family.autoPayHeat, view.family.alert, view.family.members.map((m) => m.status).join()],
    portraits: Object.keys(view.portraits).length,
    debt: view.debt > 0,
    journal: view.journal.map((entry) => entry.choiceId).join(),
    guests: view.customers.map((customer) => [customer.id, customer.state, customer.sessionMinutes, customer.speech].join(':')).join('|'),
    error: view.lastError
  });
}

function modalSignature(view) {
  if (view.screen === 'menu' || view.screen === 'naming') return '';
  if (view.guide.open) {
    return `guide-${view.guide.cards.map((card) => card.status).join('')}`;
  }
  if (view.activeEvent) return `event-${view.activeEvent.instanceId}-${view.lastError}`;
  if (view.screen === 'report' || view.screen === 'ending') {
    return `day-${view.screen}-${view.day}-${view.ending}-${view.report.lines.length}`;
  }
  return '';
}

function stat(label, value, tone = 'calm', icon = '') {
  const node = el('div', `stat tone-${tone}`);
  node.title = label;
  node.setAttribute('aria-label', `${label}: ${value}`);
  if (icon) {
    const mark = el('i', 'stat-icon');
    mark.innerHTML = icon;
    node.append(mark);
  }
  node.append(el('b', '', value));
  return node;
}

function row(label, value) {
  const node = el('div', 'row');
  node.append(el('span', '', label), el('span', '', value));
  return node;
}

function attachButtonFeel(root) {
  root.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const target = event.target.closest('button');
    if (!target || target.disabled) return;
    const pop = el('span', 'btn-pop');
    const tone = getComputedStyle(target).getPropertyValue('--press').trim();
    if (tone && tone !== 'transparent') pop.style.setProperty('--pop', tone);
    pop.style.left = `${event.clientX}px`;
    pop.style.top = `${event.clientY}px`;
    root.append(pop);
    pop.addEventListener('animationend', () => pop.remove());
  });
}

function button(label, onClick, active = false, disabled = false) {
  const node = el('button', active ? 'active' : '', label);
  node.type = 'button';
  node.disabled = disabled;
  node.addEventListener('click', onClick);
  return node;
}

function iconButton(label, svg, onClick, active = false, disabled = false) {
  const node = el('button', `dock-btn${active ? ' active' : ''}`);
  node.type = 'button';
  node.disabled = disabled;
  node.title = label;
  node.setAttribute('aria-label', label);
  node.innerHTML = svg;
  node.addEventListener('click', onClick);
  return node;
}

function pip(status) {
  const node = el('i', `pip ${status === 'healthy' ? 'ok' : status === 'hungry' ? 'hunger' : status === 'cold' ? 'cold' : status === 'deceased' || status === 'sick' || status === 'very_sick' ? 'bad' : ''}`);
  return node;
}

function syncSpeechLayer(layer, session) {
  const keep = new Set();
  const canvas = document.querySelector('#game-root canvas');
  const camera = cafeCamera(session);
  const playing = session.ui.screen === 'playing' && canvas && camera;
  if (playing) {
    const host = layer.getBoundingClientRect();
    const box = canvas.getBoundingClientRect();
    for (const customer of session.state.cafe.customers) {
      const text = customer.speech?.text;
      if (!text) continue;
      keep.add(customer.id);
      let node = layer.querySelector(`[data-speech="${customer.id}"]`);
      if (!node) {
        node = el('div', 'world-bubble');
        node.dataset.speech = customer.id;
        layer.append(node);
      }
      if (node.textContent !== text) node.textContent = text;
      const marker = customer.state === 'playing' || customer.state === 'waiting' || customer.state === 'incident';
      const worldX = customer.x * TILE_SIZE + TILE_SIZE / 2;
      const worldY = customer.y * TILE_SIZE + TILE_SIZE / 2 - (marker ? 68 : 44);
      const anchor = speechAnchor(worldX, worldY, camera, box, host);
      node.style.left = `${anchor.left}px`;
      node.style.top = `${anchor.top}px`;
    }
  }
  for (const node of [...layer.children]) {
    if (!keep.has(node.dataset.speech)) node.remove();
  }
}

function cafeCamera(session) {
  const camera = session.game?.scene?.getScene?.('Cafe')?.cameras?.main;
  if (camera?.width > 0 && camera.height > 0) return camera;
  return null;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
