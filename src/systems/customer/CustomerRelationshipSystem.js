export function relationshipKey(customer) {
  return String(customer.name || '').trim().toLowerCase();
}

export function recordVisit(state, customer) {
  const key = relationshipKey(customer);
  if (!key) return;
  const current = state.cafe.relationships[key] ?? {
    name: customer.name,
    archetype: customer.archetype,
    visits: 0,
    spent: 0,
    loyalty: 0
  };
  current.visits += 1;
  current.spent += customer.billPaid || 0;
  current.archetype = customer.archetype;
  if (customer.satisfaction >= 60) current.loyalty += 1;
  else current.loyalty = Math.max(0, current.loyalty - 1);
  state.cafe.relationships[key] = current;
  const ids = Object.keys(state.cafe.relationships);
  while (ids.length > 40) {
    delete state.cafe.relationships[ids.shift()];
  }
}
