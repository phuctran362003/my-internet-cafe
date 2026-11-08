import { createGameSession } from '../src/core/GameSession.js';
import { createMemoryStorage } from '../src/systems/save/SaveSystem.js';
import { loadGameData } from '../src/data/loadGameData.js';
import { createEventBus } from '../src/core/EventBus.js';
import { createInitialState } from '../src/state/createInitialState.js';
import { createEconomySystem } from '../src/systems/economy/EconomySystem.js';
import { createEventSystem } from '../src/systems/event/EventSystem.js';

export function testSession(seed = 1) {
  return createGameSession({
    data: loadGameData(),
    storage: createMemoryStorage(),
    seed
  });
}

export function bareContext(rng = () => 0.9) {
  const data = loadGameData();
  const state = createInitialState(data, 1);
  const bus = createEventBus();
  const ui = { screen: 'playing', notes: [], portraits: {}, panel: 'overview', selection: null, lastError: '' };
  const ctx = { state, data, bus, ui, rng };
  ctx.economy = createEconomySystem({ state, bus });
  ctx.events = createEventSystem(ctx);
  state.meta.started = true;
  return ctx;
}

export function sampleCustomer(over = {}) {
  return {
    id: 'c1',
    name: 'An',
    archetype: 'student',
    label: 'Học sinh',
    preferredTiers: ['basic'],
    priceSensitivity: 0.4,
    skipChance: 0,
    foodChance: 0,
    state: 'playing',
    x: 7,
    y: 3,
    facing: 'up',
    path: [],
    pathIndex: 0,
    targetComputerId: 'pc1',
    sessionMinutes: 60,
    plannedMinutes: 60,
    money: 50000,
    patienceLeft: 10,
    satisfaction: 70,
    bill: 0,
    billPaid: 0,
    paid: false,
    ordered: true,
    incidentId: null,
    ...over
  };
}

export function playUntilDayEnd(session) {
  session.closeGuide();
  for (let i = 0; i < 900 && !session.state.meta.dayEnded; i += 1) {
    const event = session.state.narrative.queue.find((item) => !item.resolved);
    if (event) resolveForTest(session, event);
    if (session.state.meta.pendingDayEnd) {
      session.confirmEndDay();
      break;
    }
    session.update(3000);
  }
  if (session.state.meta.pendingDayEnd && !session.state.meta.dayEnded) {
    session.confirmEndDay();
  }
}

function resolveForTest(session, event) {
  const preferred = ['delay', 'ignore', 'skip', 'later', 'accept_loss', 'demand_payment'];
  const ordered = [
    ...event.choices.filter((item) => preferred.includes(item.id)),
    ...event.choices.filter((item) => !item.requires && !preferred.includes(item.id))
  ];
  for (const choice of ordered) {
    if (session.choose(choice.id, event.instanceId).ok) return;
  }
}
