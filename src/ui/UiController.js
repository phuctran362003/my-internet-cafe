import '../styles/interface.css';

import { buildView } from '../state/buildView.js';
import { formatMoney } from '../utils/format.js';

const PANELS = [
  ['overview', 'Tiệm'],
  ['computer', 'Máy'],
  ['customer', 'Khách'],
  ['shop', 'Quầy'],
  ['staff', 'Nhân sự'],
  ['facility', 'Cơ sở'],
  ['rooms', 'Phòng'],
  ['finance', 'Giá'],
  ['family', 'Gia đình'],
  ['journal', 'Nhật ký']
];

export function mountUi(session, root) {
  root.replaceChildren();
  const menu = el('div', 'menu');
  const hud = el('div', 'hud');
  const guidebar = el('div', 'guidebar');
  const drawer = el('aside', 'drawer');
  const dock = el('div', 'dock');
  const modal = el('div', 'modal');
  const toasts = el('div', 'toasts');
  root.append(menu, hud, guidebar, drawer, dock, modal, toasts);

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
    paintToasts(toasts, view);
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
    stat('Ngày', view.date, 'calm'),
    stat('Giờ', `${view.clock} ${view.period}`, 'calm'),
    stat('Tiệm', view.cafeName, 'cafe'),
    stat('Tiền', view.money, 'money'),
    stat('Uy tín', String(view.reputation), view.reputation >= 50 ? 'good' : 'warn'),
    stat('Khách', String(view.customerCount), view.customerCount ? 'good' : 'calm'),
    stat('Máy trống', String(view.freeComputers), view.freeComputers ? 'good' : 'warn'),
    stat('Sự cố', String(view.incidents), view.incidents ? 'alert' : 'good')
  );
}

function houseStat(view, session) {
  const node = el('button', `stat tone-${view.family.alert ? 'alert' : 'good'}`);
  node.type = 'button';
  node.append(el('span', '', 'Nhà'), el('b', '', view.family.alert ? 'Cần lo' : 'Ổn'));
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
  return [view.userPaused, view.speed, view.open, view.dayEnded, view.music, view.build].join('|');
}

function paintDock(node, view, session) {
  node.replaceChildren();
  if (view.screen === 'menu' || view.screen === 'naming') return;
  node.append(
    iconButton(view.userPaused ? 'Tiếp tục' : 'Tạm dừng', view.userPaused ? PLAY_ICON : PAUSE_ICON, () => session.togglePause()),
    iconButton('Tốc độ x1', speedIcon(1), () => session.setSpeed(1), view.speed === 1),
    iconButton('Tốc độ x2', speedIcon(2), () => session.setSpeed(2), view.speed === 2),
    iconButton('Tốc độ x3', speedIcon(3), () => session.setSpeed(3), view.speed === 3),
    iconButton(view.open ? 'Đóng cửa' : 'Mở cửa', view.open ? DOOR_OPEN_ICON : DOOR_SHUT_ICON, () => session.toggleDoor(), !view.open),
    iconButton(view.music ? 'Tắt nhạc' : 'Bật nhạc', view.music ? MUSIC_ICON : MUSIC_OFF_ICON, () => session.toggleMusic(), view.music),
    iconButton(view.build ? 'Xong xếp đồ' : 'Xếp đồ', CHAIR_ICON, () => session.toggleBuild(), view.build),
    iconButton('Kết thúc ngày', MOON_ICON, () => session.endDay(), false, view.dayEnded),
    iconButton('Lưu ô 1', saveIcon(1), () => session.save(1)),
    iconButton('Lưu ô 2', saveIcon(2), () => session.save(2)),
    iconButton('Lưu ô 3', saveIcon(3), () => session.save(3))
  );
}

const PAUSE_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/></svg>';
const PLAY_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
const DOOR_OPEN_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 20V5h10v15" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14 8l6 2v10l-6 2V8z" fill="currentColor"/><circle cx="17.5" cy="13" r="1" fill="#3a2a1c"/></svg>';
const DOOR_SHUT_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="6" y="3" width="12" height="18" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/></svg>';
const MOON_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 3a8 8 0 1 0 6 13 6.5 6.5 0 1 1-6-13z" fill="currentColor"/></svg>';
const MUSIC_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 17V6l10-2v11" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="7" cy="17" r="2.4" fill="currentColor"/><circle cx="17" cy="15" r="2.4" fill="currentColor"/></svg>';
const MUSIC_OFF_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 17V6l10-2v11" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="7" cy="17" r="2.4" fill="currentColor"/><circle cx="17" cy="15" r="2.4" fill="currentColor"/><path d="M4 4l16 16" stroke="currentColor" stroke-width="2"/></svg>';
const CHAIR_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M7 11V4h10v7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 11h14v4H5z" fill="currentColor"/><path d="M7 15v5M17 15v5" stroke="currentColor" stroke-width="2"/></svg>';

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
  sheet.append(el('p', 'muted', 'Quản lý tiệm net, giữ khách trả tiền, và lo cho gia đình. Điều khiển bằng chuột. Nhạc nền bật sau lần bấm đầu tiên.'));
  const actions = el('div', 'actions');
  const start = button('Trò chơi mới', () => session.openFounding());
  start.classList.add('btn-go');
  actions.append(start);
  const autosave = saves.find((record) => record.slot === 0);
  const cont = button('Tiếp tục', async () => {
    const slot = autosave ? 0 : saves[0]?.slot;
    if (slot == null) return;
    await session.load(slot);
  });
  cont.disabled = saves.length === 0;
  actions.append(cont);
  sheet.append(actions);
  if (saves.length) {
    const list = el('div', 'block');
    list.append(el('div', 'muted', 'Bản lưu'));
    for (const record of saves) {
      const line = el('div', 'row');
      const cafeName = record.summary?.cafeName;
      const who = record.summary?.playerName ? ` · ${record.summary.playerName}` : '';
      const title = cafeName ? `${cafeName}${who}` : (record.summary?.label || 'Ô');
      line.append(el('span', '', `${title} · ngày ${record.summary?.day}`));
      line.append(button('Tải', async () => { await session.load(record.slot); }));
      list.append(line);
    }
    sheet.append(list);
  }
  sheet.append(button('Làm mới danh sách', refreshSaves));
  node.replaceChildren(sheet);
  void view;
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

  card.append(fieldLabel('TÊN NGƯỜI CHƠI', 'hiện trên biển tiệm'));
  const playerInput = textField('Ví dụ: Minh Trí', 16);
  card.append(playerInput);
  card.append(el('p', 'founding-note', 'Chủ quán mang tên này suốt ván chơi. Gia đình và khách sẽ gọi bạn như vậy.'));

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
  const tabs = el('div', 'tabs');
  for (const [id, label] of PANELS) {
    tabs.append(button(label, () => session.setPanel(id), view.panel === id));
  }
  node.append(tabs);
  node.append(el('div', 'error', view.lastError));
  if (view.panel === 'overview') node.append(overview(view, session));
  if (view.panel === 'computer') node.append(computerPanel(view, session));
  if (view.panel === 'customer') node.append(customerPanel(view));
  if (view.panel === 'shop') node.append(shopPanel(view, session));
  if (view.panel === 'staff') node.append(staffPanel(view, session));
  if (view.panel === 'facility') node.append(facilityPanel(view, session));
  if (view.panel === 'rooms') node.append(roomsPanel(view, session));
  if (view.panel === 'finance') node.append(financePanel(view, session));
  if (view.panel === 'family') node.append(familyPanel(view, session));
  if (view.panel === 'journal') node.append(journalPanel(view));
}

function overview(view, session) {
  const box = el('div');
  box.append(el('h2', '', view.cafeName));
  box.append(el('p', 'muted', `${view.playerName} · ${view.open ? 'Tiệm đang mở' : 'Tiệm đang đóng'}`));
  box.append(row('Máy hoạt động', `${view.activeComputers}`));
  box.append(row('Máy trống', `${view.freeComputers}`));
  box.append(row('Doanh thu hôm nay', view.report.revenueLabel));
  box.append(row('Chi phí hôm nay', view.report.expenseLabel));
  box.append(row('Nợ', view.debtLabel));
  if (view.debt > 0) box.append(button('Trả 500.000đ', () => session.repay(500000)));
  if (view.nextSlot) box.append(button(`Mua máy mới (${view.newComputerCost})`, () => session.buyComputer()));
  const locked = view.rooms.filter((room) => !room.unlocked);
  if (locked.length) {
    box.append(el('p', 'muted', `Đang khóa: ${locked.map((room) => `${room.name} ${room.costLabel}`).join(' · ')}. Click ô xám để xem giá.`));
  }
  box.append(el('p', 'muted', 'Click máy, khách, cửa, quầy hoặc phòng đang khóa.'));
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

function customerPanel(view) {
  const box = el('div');
  const customer = view.customers.find((item) => item.id === view.selection?.id);
  box.append(el('h2', '', customer ? customer.name : 'Khách'));
  if (!customer) {
    box.append(el('p', 'muted', 'Click một khách trên bản đồ.'));
    return box;
  }
  box.append(row('Loại', customer.label));
  box.append(row('Việc đang làm', CUSTOMER_STATE[customer.state] || customer.state));
  box.append(row('Hài lòng', `${customer.satisfaction}`));
  if (customer.visits) box.append(row('Lần ghé', String(customer.visits)));
  if (customer.state === 'waiting') {
    const request = el('p', 'request', `Muốn thuê ${customer.requestLabel}.`);
    box.append(request);
    box.append(row('Tiền giờ khoảng', customer.quoteLabel));
    const start = button('Mở máy', () => session.startMachine(customer.id));
    start.classList.add('btn-go');
    box.append(start);
  } else {
    box.append(row('Đã ngồi', `${customer.sessionMinutes} / ${customer.plannedMinutes} phút`));
    box.append(row('Hóa đơn', customer.billLabel));
  }
  if (customer.state === 'incident') box.append(el('p', 'muted', 'Khách này đang có sự cố. Chọn cách xử lý trong hộp thoại.'));
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
  box.append(el('p', 'muted', 'Lao công, thu ngân và phục vụ giúp quán tự chạy. Lương trả cuối ngày.'));
  for (const member of view.staff) {
    const line = el('div', 'block');
    line.append(row(member.name, formatMoney(member.salary)));
    line.append(el('p', 'muted', member.blurb));
    if (member.hired) line.append(button('Cho nghỉ', () => session.fireStaff(member.role)));
    else line.append(button(`Thuê ${member.name.toLowerCase()}`, () => session.hireStaff(member.role)));
    box.append(line);
  }
  const guard = el('div', 'block');
  guard.append(el('strong', '', 'Bảo vệ'));
  if (!view.guard) {
    guard.append(el('p', 'muted', 'Lương 80.000đ mỗi ngày, tự xử lý khách quỵt tiền sau một lúc.'));
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
  box.append(el('p', 'muted', 'Máy lạnh, mạng và điện. Nâng trước khi quán nóng, lag hoặc quá tải.'));
  for (const facility of view.facilities) {
    const line = el('div', 'block');
    line.append(row(facilityLabel(facility.id), facility.name));
    line.append(el('p', 'muted', facility.detail));
    if (facility.nextName) {
      line.append(el('p', 'muted', `Lên ${facility.nextName}: ${facility.nextDetail}`));
      line.append(button(`Nâng cấp (${facility.nextCost})`, () => session.upgradeFacility(facility.id)));
    } else {
      line.append(el('p', 'muted', 'Đã ở mức cao nhất.'));
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
  box.append(el('p', 'muted', 'Phòng chưa mở thì xám và có ổ khóa. Click phòng trên bản đồ để xem giá.'));
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
    ? 'Click ô sàn trống để đặt. Click món đã có để chọn, rồi click ô khác để dời.'
    : 'Bật xếp đồ, chọn món, rồi click sàn. Món cất trong kho đặt lại không mất tiền.'));
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
  box.append(el('p', 'muted', 'Giá từ 2.000đ đến 40.000đ mỗi giờ. Giá cao khiến khách nhạy cảm bỏ đi.'));
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
  box.append(el('p', 'muted', 'Giá món từ giá nhập đến gấp 5 lần. Khách hết tiền thì không mua.'));
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
    const tone = entry.tone === 'beneficial' ? 'Có lợi' : entry.tone === 'adverse' ? 'Bất lợi' : '';
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
      ? 'Gia đình không còn trụ được'
      : view.ending === 'collapse'
        ? 'Tiệm sập vì nợ'
        : view.ending === 'balanced'
          ? 'Một cuộc sống tạm ổn'
          : `Báo cáo ngày ${view.day}`;
    sheet.append(el('h2', '', title));
    sheet.append(row('Doanh thu', view.report.revenueLabel));
    sheet.append(row('Chi phí', view.report.expenseLabel));
    sheet.append(row('Lãi', view.report.profitLabel));
    sheet.append(row('Thiếu hụt ghi nợ', view.report.shortfallLabel));
    if (view.dayEvents.adverse || view.dayEvents.beneficial) {
      sheet.append(row('Trong ngày', `${view.dayEvents.adverse} bất lợi · ${view.dayEvents.beneficial} có lợi`));
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
      sheet.append(el('p', 'muted', 'Tiệm và gia đình đang đứng vững. Có thể chơi tiếp dạng sandbox.'));
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
  sheet.append(el('p', 'guide-lead', 'Làm theo từng việc khi quán gặp. Thời gian dừng lại lúc bảng này mở.'));
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
  const close = button('ĐÓNG', () => session.closeGuide());
  close.classList.add('btn-go', 'guide-close');
  sheet.append(close);
  return sheet;
}

function paintToasts(node, view) {
  node.replaceChildren(...view.notes.map((note) => {
    const toast = el('div', `toast ${note.kind || 'info'}`);
    toast.append(el('i', 'toast-pip'), el('span', '', note.text));
    return toast;
  }));
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
    guests: view.customers.map((customer) => [customer.id, customer.state, customer.sessionMinutes].join(':')).join('|'),
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

function stat(label, value, tone = 'calm') {
  const node = el('div', `stat tone-${tone}`);
  node.append(el('span', '', label), el('b', '', value));
  return node;
}

function row(label, value) {
  const node = el('div', 'row');
  node.append(el('span', '', label), el('span', '', value));
  return node;
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

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
