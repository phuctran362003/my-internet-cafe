import { applyEffects } from './EffectExecutor.js';

export function decide(ctx, choiceId, instanceId) {
  const queue = ctx.state.narrative.queue;
  const current = queue.find((event) => !event.resolved && (!instanceId || event.instanceId === instanceId));
  if (!current) return { ok: false, reason: 'no_event' };
  const choice = current.choices.find((item) => item.id === choiceId);
  if (!choice) return { ok: false, reason: 'bad_choice' };
  if (choice.requires === 'guard' && !ctx.state.cafe.employees.some((employee) => employee.role === 'guard')) {
    return { ok: false, reason: 'guard' };
  }
  const result = applyEffects(choice.effects, { ...ctx, event: current });
  if (!result.ok) return result;
  current.resolved = true;
  ctx.state.narrative.queue = queue.filter((event) => event.instanceId !== current.instanceId);
  ctx.state.narrative.completedEvents.push({
    id: current.id,
    choiceId,
    day: ctx.state.meta.currentDay
  });
  ctx.state.narrative.eventHistory.push({
    id: current.id,
    choiceId,
    day: ctx.state.meta.currentDay,
    memberId: current.context?.memberId ?? null
  });
  return { ok: true, event: current };
}
