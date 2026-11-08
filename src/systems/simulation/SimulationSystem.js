import { GameEvents } from '../../core/EventBus.js';
import { isSimulationPaused } from '../../state/createInitialState.js';
import { applyBusinessExpenses } from '../business/ExpenseSystem.js';
import { priceOf } from '../business/PricingSystem.js';
import { applyComputerWear } from '../business/UpgradeSystem.js';
import { applyCleaner, settleHourlyWages, tickStaff } from '../staff/StaffSystem.js';
import { tickCustomers } from '../customer/CustomerAI.js';
import { tickBanter } from '../customer/CustomerBanterSystem.js';
import { tickSpawn } from '../customer/CustomerSpawnSystem.js';
import { evaluateFamilyEvents } from '../event/EventSystem.js';
import { tickRandomEvents } from '../event/RandomEventSystem.js';
import { settleFamilyDay } from '../family/FamilySurvival.js';
import { tickSecurity } from '../security/SecuritySystem.js';
import { createTimeSystem } from './TimeSystem.js';

export function createSimulation(ctx) {
  const time = createTimeSystem(ctx);
  return {
    update(deltaMs) {
      const state = ctx.state;
      if (!state.meta.started || state.meta.dayEnded) return;
      if (state.meta.pendingDayEnd) {
        if (state.cafe.open) state.cafe.open = false;
        return;
      }
      if (isSimulationPaused(state)) {
        if (state.meta.pauseReasons.event && !state.meta.pauseReasons.user && !state.meta.pauseReasons.guide) {
          const minutes = (deltaMs / 1000) * ctx.data.simulation.gameMinutesPerRealSecond * state.meta.speed;
          tickSecurity(ctx, minutes);
        }
        return;
      }

      const stepMs = ctx.data.simulation.stepMs;
      const maxSteps = ctx.data.simulation.maxStepsPerFrame;
      let remaining = deltaMs;
      let steps = 0;
      while (
        remaining > 0
        && steps < maxSteps
        && !state.meta.pendingDayEnd
        && !isSimulationPaused(state)
      ) {
        const slice = Math.min(stepMs, remaining);
        const minutes = time.advance(slice);
        if (minutes > 0) {
          tickSpawn(ctx, minutes);
          tickCustomers(ctx, minutes);
          tickStaff(ctx, minutes);
          tickBanter(ctx, minutes);
          tickSecurity(ctx, minutes);
          tickRandomEvents(ctx, minutes);
        }
        remaining -= slice;
        steps += 1;
      }
      if (state.meta.pendingDayEnd && state.cafe.open) state.cafe.open = false;
    }
  };
}

export function requestEndDay(state) {
  if (!state.meta.started || state.meta.dayEnded || state.meta.pendingDayEnd) return { ok: false };
  state.meta.pendingDayEnd = true;
  return { ok: true };
}

export function finishDay(ctx) {
  const state = ctx.state;
  if (state.meta.dayEnded || state.meta.processedDay === state.meta.currentDay) return { ok: false };
  state.meta.processedDay = state.meta.currentDay;
  closeCustomers(ctx);
  settleHourlyWages(ctx);
  applyBusinessExpenses(ctx);
  const family = settleFamilyDay(ctx);
  evaluateFamilyEvents(ctx, family.before);
  applyComputerWear(state, ctx.bus);
  applyCleaner(state);
  ctx.ui.guideOpen = false;
  for (const pc of state.cafe.computers) pc.dailyMinutes = 0;
  checkEndings(ctx);
  state.meta.dayEnded = true;
  state.meta.pendingDayEnd = false;
  state.meta.pauseReasons.user = false;
  ctx.ui.screen = state.meta.ending ? 'ending' : 'report';
  ctx.bus.emit(GameEvents.DAY_ENDED, { day: state.meta.currentDay, ending: state.meta.ending });
  return { ok: true };
}

export function continueNextDay(ctx) {
  const state = ctx.state;
  if (!state.meta.dayEnded) return { ok: false, reason: 'day' };
  if (ctx.events.hasBlocking()) return { ok: false, reason: 'event' };
  if (state.meta.ending === 'family' || state.meta.ending === 'collapse') return { ok: false, reason: 'ending' };
  if (state.meta.ending === 'balanced') state.meta.sandbox = true;
  state.meta.currentDay += 1;
  state.meta.currentTime = ctx.data.simulation.dayStartMinute;
  state.meta.dayEnded = false;
  state.meta.pendingDayEnd = false;
  state.meta.ending = null;
  state.economy.dailyRevenue = 0;
  state.economy.dailyExpenses = 0;
  state.family.shortage = { food: false, heat: false };
  ctx.ui.screen = 'playing';
  ctx.bus.emit(GameEvents.DAY_STARTED, { day: state.meta.currentDay });
  return { ok: true };
}

function closeCustomers(ctx) {
  for (const customer of ctx.state.cafe.customers) {
    if (customer.paid || customer.state === 'incident' || customer.sessionMinutes <= 0) continue;
    const pc = ctx.state.cafe.computers.find((item) => item.id === customer.targetComputerId);
    const price = priceOf(ctx.state, pc?.tier || 'basic');
    const bill = Math.round((customer.sessionMinutes * price) / 60);
    const paid = Math.min(customer.money, Math.max(0, bill));
    if (paid > 0) ctx.economy.credit(paid, 'computer_usage', `${customer.name} chốt giờ cuối ngày`);
    customer.paid = true;
    customer.billPaid = paid;
  }
  ctx.state.cafe.customers = [];
  for (const pc of ctx.state.cafe.computers) {
    pc.occupantId = null;
    if (pc.status === 'occupied') pc.status = 'available';
  }
}

function checkEndings(ctx) {
  const state = ctx.state;
  const members = state.family.members;
  const player = members.find((member) => member.id === 'player');
  const wife = members.find((member) => member.id === 'wife');
  const child = members.find((member) => member.id === 'child');
  if (player?.status === 'deceased' || (wife?.status === 'deceased' && child?.status === 'deceased')) {
    state.meta.ending = 'family';
    ctx.ui.screen = 'ending';
    return;
  }
  if (state.economy.debt >= ctx.data.economy.collapseDebt) {
    state.meta.ending = 'collapse';
    ctx.ui.screen = 'ending';
    return;
  }
  const goal = ctx.data.economy.success;
  const stable = members.every((member) => member.status === 'healthy');
  if (
    !state.meta.sandbox
    && !state.meta.successOffered
    && state.meta.currentDay >= goal.day
    && state.player.money >= goal.money
    && state.cafe.reputation >= goal.reputation
    && stable
  ) {
    state.meta.ending = 'balanced';
    state.meta.successOffered = true;
    ctx.ui.screen = 'ending';
  }
}
