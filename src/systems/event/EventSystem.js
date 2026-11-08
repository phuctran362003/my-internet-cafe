import { GameEvents } from '../../core/EventBus.js';
import { fillTemplate, formatMoney } from '../../utils/format.js';
import { decide } from './DecisionSystem.js';

const RANK = { urgent: 0, high: 1, normal: 2 };

export function createEventSystem(ctx) {
  function syncPause() {
    ctx.state.meta.pauseReasons.event = ctx.state.narrative.queue.some((event) => event.pause && !event.resolved);
  }

  return {
    enqueue(event) {
      ctx.state.narrative.queue.push(event);
      ctx.state.narrative.queue.sort((a, b) => (RANK[a.priority] ?? 9) - (RANK[b.priority] ?? 9));
      syncPause();
      if (event.category === 'family') ctx.bus.emit(GameEvents.FAMILY_EVENT_TRIGGERED, { id: event.id });
      if (event.category === 'security') ctx.bus.emit(GameEvents.INCIDENT_CREATED, { id: event.instanceId });
      return event;
    },
    active() {
      return ctx.state.narrative.queue.find((event) => !event.resolved) ?? null;
    },
    hasBlocking() {
      return ctx.state.narrative.queue.some((event) => event.pause && !event.resolved);
    },
    choose(choiceId, instanceId) {
      const result = decide(ctx, choiceId, instanceId);
      syncPause();
      if (result.ok && result.event?.category === 'security') {
        ctx.bus.emit(GameEvents.INCIDENT_RESOLVED, { id: result.event.instanceId });
      }
      return result;
    },
    syncPause
  };
}

export function visibleChoices(event, state) {
  const hasGuard = state.cafe.employees.some((employee) => employee.role === 'guard');
  return event.choices.filter((choice) => {
    if (choice.hidden) return false;
    if (choice.requires === 'guard' && !hasGuard) return false;
    return true;
  });
}

export function instantiateEvent(def, { instanceId, context = {}, vars = {} }) {
  return {
    instanceId,
    id: def.id,
    category: def.category,
    priority: def.priority || 'normal',
    pause: def.pause !== false,
    title: fillTemplate(def.dialog.title, vars),
    description: fillTemplate(def.dialog.description, vars),
    choices: def.choices.map((choice) => ({
      ...choice,
      effects: choice.effects.map((effect) => ({ ...effect }))
    })),
    context,
    resolved: false,
    ageMinutes: 0
  };
}

export function evaluateFamilyEvents(ctx, before) {
  if (!before) return;
  for (const def of ctx.data.familyEvents) {
    if (!familyMatch(def, ctx.state, before)) continue;
    const memberId = def.conditions.memberId ?? null;
    const queued = ctx.state.narrative.queue.some((event) => event.id === def.id && (event.context.memberId ?? null) === memberId);
    const doneToday = ctx.state.narrative.eventHistory.some((event) => (
      event.id === def.id && event.day === ctx.state.meta.currentDay && (event.memberId ?? null) === memberId
    ));
    if (queued || doneToday) continue;
    ctx.events.enqueue(instantiateEvent(def, {
      instanceId: `fam_${def.id}_${ctx.state.meta.currentDay}_${memberId ?? 'all'}`,
      context: { memberId },
      vars: {}
    }));
  }
}

function familyMatch(def, state, before) {
  if (def.trigger === 'health_status_changed') {
    const member = state.family.members.find((item) => item.id === def.conditions.memberId);
    const prev = before.find((item) => item.id === def.conditions.memberId);
    return Boolean(member && prev && member.status === def.conditions.status && prev.status !== member.status);
  }
  if (def.trigger === 'resource_shortage') return state.family.shortage[def.conditions.resource] === true;
  return false;
}

export function formatBill(amount) {
  return formatMoney(amount);
}
