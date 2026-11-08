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
  const saves = { list: [] };

  const refreshSaves = async () => {
    saves.list = await session.listSaves();
    menuKey = '';
  };

  const paint = () => {
    const view = buildView(session);
    paintHud(hud, view);
    const nextGuide = view.guide.showBar ? 'on' : '';
    if (nextGuide !== guideKey) {
      guideKey = nextGuide;
      paintGuideBar(guidebar, view, session);
    }
    guidebar.hidden = !view.guide.showBar;
    paintDock(dock, view, session);
    paintToasts(toasts, view);
    const nextMenu = view.screen === 'menu'
      ? `menu-${saves.list.length}`
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

function paintGuideBar(node, view, session) {
  if (!view.guide.showBar) {
    node.replaceChildren();
    return;
  }
  const open = button('Học lại hướng dẫn', () => session.openGuide());
  open.classList.add('guide-reopen');
  node.replaceChildren(open);
}

function paintDock(node, view, session) {
  node.replaceChildren();
  if (view.screen === 'menu') return;
  node.append(
    button(view.userPaused ? 'Tiếp tục' : 'Tạm dừng', () => session.togglePause()),
    button('x1', () => session.setSpeed(1), view.speed === 1),
    button('x2', () => session.setSpeed(2), view.speed === 2),
    button('x3', () => session.setSpeed(3), view.speed === 3),
    button(view.open ? 'Đóng cửa' : 'Mở cửa', () => session.toggleDoor()),
    button('Kết thúc ngày', () => session.endDay(), false, view.dayEnded),
    button('Lưu ô 1', () => session.save(1)),
    button('Lưu ô 2', () => session.save(2)),
    button('Lưu ô 3', () => session.save(3))
  );
}

function paintMenu(node, view, session, saves, refreshSaves) {
  const sheet = el('div', 'sheet');
  sheet.append(el('h1', '', 'Internet Café Tycoon'));
  sheet.append(el('p', 'muted', 'Quản lý tiệm net, giữ khách trả tiền, và lo cho gia đình. Điều khiển bằng chuột.'));
  sheet.append(el('p', 'placeholder-note', 'Hình ảnh đang là placeholder thống nhất (cafe-pixel-v1), chưa phải artwork cuối.'));
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
  box.append(el('p', 'muted', 'Kéo chuột để nhìn quanh. Lăn chuột để phóng to. Click máy, khách, cửa hoặc quầy.'));
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
  if (selected.status === 'disabled') actions.append(button('Mua máy này', () => session.buyComputer()));
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
  box.append(row('Việc đang làm', customer.state));
  box.append(row('Hài lòng', `${customer.satisfaction}`));
  box.append(row('Đã ngồi', `${customer.sessionMinutes} / ${customer.plannedMinutes} phút`));
  box.append(row('Hóa đơn', customer.billLabel));
  if (customer.state === 'incident') box.append(el('p', 'muted', 'Khách này đang có sự cố. Chọn cách xử lý trong hộp thoại.'));
  return box;
}

function shopPanel(view, session) {
  const box = el('div');
  box.append(el('h2', '', 'Quầy hàng'));
  for (const item of view.items) {
    const line = el('div', 'block');
    line.append(row(item.name, `Kho ${view.stock[item.id] ?? 0}`));
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
    box.append(row(`Ngày ${entry.day}`, `${entry.id} · ${entry.choiceId}`));
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
    prices: view.prices,
    itemPrices: view.items.map((item) => item.salePrice).join(','),
    family: [view.family.food, view.family.medicine, view.family.heatPaid, view.family.autoPayFood, view.family.autoPayHeat, view.family.members.map((m) => m.status).join()],
    portraits: Object.keys(view.portraits).length,
    debt: view.debt > 0,
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
