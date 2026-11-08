export function tierById(data, id) {
  return data.tiers.find((tier) => tier.id === id);
}

export function nextTier(data, id) {
  const index = data.tiers.findIndex((tier) => tier.id === id);
  if (index < 0 || index >= data.tiers.length - 1) return null;
  return data.tiers[index + 1];
}

export function setPrice(state, data, tierId, price) {
  const value = Math.round(Number(price));
  if (!state.cafe.prices[tierId] && state.cafe.prices[tierId] !== 0) return { ok: false, reason: 'tier' };
  if (value < data.economy.priceMin || value > data.economy.priceMax) return { ok: false, reason: 'range' };
  state.cafe.prices[tierId] = value;
  return { ok: true, price: value };
}

export function priceOf(state, tierId) {
  return state.cafe.prices[tierId];
}
