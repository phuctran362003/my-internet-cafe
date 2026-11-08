export function recordVisit(state, customer) {
  const current = state.cafe.relationships[customer.id] ?? {
    name: customer.name,
    archetype: customer.archetype,
    visits: 0,
    spent: 0,
    loyalty: 0
  };
  current.visits += 1;
  current.spent += customer.billPaid || 0;
  if (customer.archetype === 'regular') current.loyalty += 1;
  state.cafe.relationships[customer.id] = current;
  const ids = Object.keys(state.cafe.relationships);
  while (ids.length > 40) {
    delete state.cafe.relationships[ids.shift()];
  }
}
