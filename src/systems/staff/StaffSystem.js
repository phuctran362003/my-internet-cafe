import { startMachine } from '../customer/CustomerAI.js';
import { isOutOfService } from '../business/computerStatus.js';

export const FLOOR_ROLES = ['cleaner', 'cashier', 'server'];
const STAFF_START_DELAY = 2;

export function hasFloorStaff(state) {
  return state.cafe.employees.some((employee) => FLOOR_ROLES.includes(employee.role));
}

export function hireStaff(ctx, role) {
  if (!FLOOR_ROLES.includes(role)) return { ok: false, reason: 'role' };
  if (ctx.state.cafe.employees.some((employee) => employee.role === role)) {
    return { ok: false, reason: 'hired' };
  }
  const spec = ctx.data.staff[role];
  if (!spec) return { ok: false, reason: 'role' };
  ctx.state.cafe.employees.push({
    id: spec.id,
    name: spec.name,
    role: spec.role,
    look: spec.look,
    salary: staffDailySalary(ctx, spec),
    post: { ...spec.post }
  });
  return { ok: true };
}

export function fireStaff(ctx, role) {
  if (!FLOOR_ROLES.includes(role)) return { ok: false, reason: 'role' };
  ctx.state.cafe.employees = ctx.state.cafe.employees.filter((employee) => employee.role !== role);
  return { ok: true };
}

export function tickStaff(ctx, minutes) {
  if (minutes <= 0) return;
  assistWaitingCustomers(ctx, minutes);
}

export function applyCleaner(state) {
  if (!state.cafe.employees.some((employee) => employee.role === 'cleaner')) return;
  for (const pc of state.cafe.computers) {
    if (isOutOfService(pc)) continue;
    pc.cleanliness = Math.min(100, pc.cleanliness + 18);
  }
}

/** Flat daily pay for floor staff (legacy hourly saves fall back to economy rate). */
export function staffDailySalary(ctx, spec = null) {
  return spec?.salary
    ?? ctx.data.economy.staffDailyWage
    ?? ctx.data.economy.wagePerHour
    ?? 150000;
}

function assistWaitingCustomers(ctx, minutes) {
  if (!hasFloorStaff(ctx.state)) return;
  for (const customer of ctx.state.cafe.customers) {
    if (customer.state !== 'waiting') continue;
    customer.staffAssistIn = (customer.staffAssistIn ?? STAFF_START_DELAY) - minutes;
    if (customer.staffAssistIn > 0) continue;
    startMachine(ctx, customer.id);
  }
}
