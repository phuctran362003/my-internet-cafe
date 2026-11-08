import { CHARACTER_VARIANTS, COMPUTER_STATES, COMPUTER_TIERS } from '../assets/layout.js';

const DIR_COL = { down: 0, left: 2, right: 4, up: 6 };

export function characterFrame(customer, now) {
  const lookId = customer.look || customer.archetype;
  const row = Math.max(0, CHARACTER_VARIANTS.findIndex((variant) => variant.id === lookId));
  let col = DIR_COL[customer.facing] ?? 0;
  const moving = customer.state === 'moving' || customer.state === 'leaving';
  if (customer.state === 'playing' || customer.state === 'payment' || customer.state === 'waiting') col = 8;
  else if (moving && Math.floor(now / 160) % 2 === 1) col += 1;
  return row * 9 + col;
}

export function computerFrame(pc) {
  const row = Math.max(0, COMPUTER_TIERS.indexOf(pc.tier));
  const col = pc.status === 'occupied'
    ? COMPUTER_STATES.indexOf('occupied')
    : pc.status === 'broken'
      ? COMPUTER_STATES.indexOf('broken')
      : pc.status === 'disabled' || pc.status === 'locked' || pc.status === 'maintenance'
        ? COMPUTER_STATES.indexOf('maintenance')
        : 0;
  return row * COMPUTER_STATES.length + col;
}
