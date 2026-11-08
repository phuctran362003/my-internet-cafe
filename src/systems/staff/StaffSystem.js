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
    wagePerHour: spec.wagePerHour ?? ctx.data.economy.wagePerHour ?? 25000,
    workedMinutes: 0,
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
  if (ctx.state.cafe.open) accrueWorkTime(ctx, minutes);
  assistWaitingCustomers(ctx, minutes);
}

export function settleHourlyWages(ctx) {
  const rate = ctx.data.economy.wagePerHour ?? 25000;
  for (const employee of ctx.state.cafe.employees) {
    if (!FLOOR_ROLES.includes(employee.role)) continue;
    const worked = employee.workedMinutes ?? 0;
    const hours = worked > 0 ? Math.ceil(worked / 60) : 0;
    if (hours > 0) {
      ctx.economy.payObligation(
        hours * (employee.wagePerHour ?? rate),
        'wages',
        `Lương ${employee.name} (${hours} giờ)`
      );
    }
    employee.workedMinutes = 0;
  }
}

export function applyCleaner(state) {
  if (!state.cafe.employees.some((employee) => employee.role === 'cleaner')) return;
  for (const pc of state.cafe.computers) {
    if (isOutOfService(pc)) continue;
    pc.cleanliness = Math.min(100, pc.cleanliness + 18);
  }
}

function accrueWorkTime(ctx, minutes) {
  for (const employee of ctx.state.cafe.employees) {
    if (!FLOOR_ROLES.includes(employee.role)) continue;
    employee.workedMinutes = (employee.workedMinutes ?? 0) + minutes;
  }
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
