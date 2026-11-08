import { isOutOfService } from '../business/computerStatus.js';

const FLOOR_ROLES = ['cleaner', 'cashier', 'server'];

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
    salary: spec.salary,
    post: { ...spec.post }
  });
  return { ok: true };
}

export function fireStaff(ctx, role) {
  if (!FLOOR_ROLES.includes(role)) return { ok: false, reason: 'role' };
  ctx.state.cafe.employees = ctx.state.cafe.employees.filter((employee) => employee.role !== role);
  return { ok: true };
}

export function applyCleaner(state) {
  if (!state.cafe.employees.some((employee) => employee.role === 'cleaner')) return;
  for (const pc of state.cafe.computers) {
    if (isOutOfService(pc)) continue;
    pc.cleanliness = Math.min(100, pc.cleanliness + 18);
  }
}
