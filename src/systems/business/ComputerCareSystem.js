import { GameEvents } from '../../core/EventBus.js';
import { formatMoney } from '../../utils/format.js';
import { isOutOfService } from './computerStatus.js';
import { instantiateEvent } from '../event/EventSystem.js';

export const DIRTY_THRESHOLD = 35;

export function markComputerBroken(ctx, pc) {
  if (!pc || isOutOfService(pc)) return false;
  const alreadyBroken = pc.status === 'broken';
  pc.status = 'broken';
  pc.occupantId = null;
  if (!alreadyBroken) ctx.bus?.emit(GameEvents.COMPUTER_BROKEN, { id: pc.id });
  openBrokenComputerIncident(ctx, pc);
  return true;
}

export function checkComputerCareNeeds(ctx) {
  for (const pc of ctx.state.cafe.computers) {
    if (isOutOfService(pc)) continue;
    if (pc.status === 'broken') openBrokenComputerIncident(ctx, pc);
    else if (pc.cleanliness <= DIRTY_THRESHOLD) openDirtyComputerIncident(ctx, pc);
  }
}

export function openBrokenComputerIncident(ctx, pc) {
  return openCareIncident(ctx, pc, 'computer_broken', {
    pcId: pc.id.toUpperCase(),
    repairCost: formatMoney(ctx.data.economy.repairCost)
  });
}

export function openDirtyComputerIncident(ctx, pc) {
  if (pc.status === 'broken' || isOutOfService(pc)) return null;
  if (pc.cleanliness > DIRTY_THRESHOLD) return null;
  return openCareIncident(ctx, pc, 'computer_filthy', {
    pcId: pc.id.toUpperCase(),
    cleanCost: formatMoney(ctx.data.economy.cleanCost),
    cleanliness: `${Math.round(pc.cleanliness)}%`
  });
}

function openCareIncident(ctx, pc, incidentId, vars) {
  if (!pc || hasOpenCareIncident(ctx.state, pc.id, incidentId)) return null;
  const template = ctx.data.incidents.find((item) => item.id === incidentId);
  if (!template || !ctx.events) return null;

  ctx.state.meta.incidentSeq += 1;
  const instanceId = `inc_${ctx.state.meta.currentDay}_${ctx.state.meta.incidentSeq}`;
  const event = instantiateEvent(template, {
    instanceId,
    context: { computerId: pc.id, care: incidentId },
    vars
  });
  ctx.state.cafe.incidents.push({
    instanceId,
    customerId: null,
    computerId: pc.id,
    kind: incidentId,
    bill: 0,
    ageMinutes: 0,
    resolved: false
  });
  if (ctx.ui) {
    ctx.ui.selection = { type: 'computer', id: pc.id };
    ctx.ui.panel = 'computer';
    ctx.ui.drawerOpen = true;
  }
  ctx.events.enqueue(event);
  return event;
}

function hasOpenCareIncident(state, computerId, incidentId) {
  if (state.cafe.incidents.some((incident) => (
    !incident.resolved && incident.computerId === computerId && incident.kind === incidentId
  ))) return true;
  return state.narrative.queue.some((event) => (
    !event.resolved && event.id === incidentId && event.context?.computerId === computerId
  ));
}
