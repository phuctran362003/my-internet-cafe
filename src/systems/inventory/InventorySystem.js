export function addStock(state, itemId, qty) {
  state.cafe.inventory[itemId] = (state.cafe.inventory[itemId] ?? 0) + qty;
}

export function consumeStock(state, itemId, qty = 1) {
  const have = state.cafe.inventory[itemId] ?? 0;
  if (have < qty) return false;
  state.cafe.inventory[itemId] = have - qty;
  return true;
}

export function stockLimit(state) {
  return state.cafe.rooms?.storage ? 24 : 10;
}

export function buyCafeItem(ctx, itemId, qty = 1) {
  const item = ctx.data.items.find((entry) => entry.id === itemId);
  if (!item || qty < 1) return { ok: false, reason: 'item' };
  const have = ctx.state.cafe.inventory[itemId] ?? 0;
  if (have + qty > stockLimit(ctx.state)) return { ok: false, reason: 'full' };
  const paid = ctx.economy.debit(item.cost * qty, 'stock', `Nhập ${item.name}`);
  if (!paid) return { ok: false, reason: 'money' };
  addStock(ctx.state, itemId, qty);
  return { ok: true };
}
