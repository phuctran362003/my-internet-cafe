export function tierById(data, id) {
  return data.tiers.find((tier) => tier.id === id);
}

export function nextTier(data, id) {
  const index = data.tiers.findIndex((tier) => tier.id === id);
  if (index < 0) return null;
  const family = data.tiers[index].family ?? 'pc';
  for (let i = index + 1; i < data.tiers.length; i += 1) {
    if ((data.tiers[i].family ?? 'pc') === family) return data.tiers[i];
  }
  return null;
}

export function slotBuyCost(data, pc) {
  if (pc?.tier === 'console') return data.economy.newConsoleCost ?? data.economy.newComputerCost;
  return data.economy.newComputerCost;
}

export function setPrice(state, data, tierId, price) {
  const value = Math.round(Number(price));
  if (!state.cafe.prices[tierId] && state.cafe.prices[tierId] !== 0) return { ok: false, reason: 'tier' };
  if (value < data.economy.priceMin || value > data.economy.priceMax) return { ok: false, reason: 'range' };
  state.cafe.prices[tierId] = value;
  return { ok: true, price: value };
}

export function priceOf(state, tierId) {
  return state.cafe.prices[tierId] ?? 0;
}

/** Hourly rate, billed per minute but never less than one hour once the customer has sat down. */
export function usageBill(sessionMinutes, pricePerHour) {
  const minutes = Math.max(0, Number(sessionMinutes) || 0);
  const rate = Math.max(0, Number(pricePerHour) || 0);
  if (minutes <= 0 || rate <= 0) return 0;
  return Math.max(rate, Math.round((minutes * rate) / 60));
}

export function itemPrice(state, item) {
  return state.cafe.itemPrices?.[item.id] ?? item.salePrice;
}

export function setItemPrice(state, data, itemId, price) {
  const item = data.items.find((entry) => entry.id === itemId);
  if (!item) return { ok: false, reason: 'item' };
  const value = Math.round(Number(price));
  const min = item.cost;
  const max = item.cost * 5;
  if (value < min || value > max) return { ok: false, reason: 'range' };
  state.cafe.itemPrices = state.cafe.itemPrices ?? {};
  state.cafe.itemPrices[itemId] = value;
  return { ok: true, price: value };
}
