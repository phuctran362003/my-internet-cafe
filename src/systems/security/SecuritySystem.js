import { setFlag } from '../event/NarrativeFlagSystem.js';

export function activeIncidents(state) {
  return state.cafe.incidents.filter((incident) => !incident.resolved);
}

export function tickSecurity(ctx, minutes) {
  const guard = ctx.state.cafe.employees.find((employee) => employee.role === 'guard');
  for (const incident of ctx.state.cafe.incidents) {
    if (incident.resolved) continue;
    incident.ageMinutes += minutes;
    const queued = ctx.state.narrative.queue.find((event) => event.instanceId === incident.instanceId);
    if (queued) queued.ageMinutes = incident.ageMinutes;
    if (incident.kind && incident.kind !== 'skip_payment') continue;
    if (!guard || incident.ageMinutes < guard.reactionMinutes) continue;
    ctx.events.choose('guard_auto', incident.instanceId);
  }
}

export function hireGuard(ctx) {
  if (ctx.state.cafe.employees.some((employee) => employee.role === 'guard')) return { ok: false, reason: 'hired' };
  const guard = ctx.data.staff.guard;
  ctx.state.cafe.employees.push({
    id: guard.id,
    name: guard.name,
    role: guard.role,
    level: guard.level,
    salary: guard.salary,
    reactionMinutes: guard.reactionMinutes,
    post: { ...guard.post }
  });
  setFlag(ctx.state, 'security_guard_hired', true);
  return { ok: true };
}

export function fireGuard(ctx) {
  ctx.state.cafe.employees = ctx.state.cafe.employees.filter((employee) => employee.role !== 'guard');
  return { ok: true };
}
