import { pick } from '../../utils/RandomUtils.js';

export function tickBanter(ctx, minutes) {
  const customers = ctx.state.cafe.customers;
  for (const customer of customers) tickSpeechClock(customer, minutes);
  for (const customer of customers) maybeSpeak(ctx, customer);
}

export function speakNow(ctx, customer, reason) {
  const line = chooseLine(ctx, customer, reason);
  if (!line) return false;
  if (visibleCount(ctx) >= maxVisible(ctx) && !customer.speech) return false;
  assignSpeech(ctx, customer, line);
  return true;
}

function tickSpeechClock(customer, minutes) {
  if (!customer.speech) {
    customer.banterIn = (customer.banterIn ?? 4) - minutes;
    return;
  }
  customer.speech.left -= minutes;
  if (customer.speech.left > 0) return;
  customer.speech = null;
  customer.banterIn = 4;
}

function maybeSpeak(ctx, customer) {
  if (customer.speech) return;
  const entered = customer.banterState !== customer.state;
  if (entered) {
    customer.banterState = customer.state;
    customer.banterIn = Math.min(customer.banterIn ?? 0, 0);
  }
  if ((customer.banterIn ?? 0) > 0) return;
  const spec = stateSpec(ctx, customer.state);
  if (!spec) {
    customer.banterIn = 12;
    return;
  }
  if (visibleCount(ctx) >= maxVisible(ctx)) {
    customer.banterIn = 3;
    return;
  }
  const chance = entered ? spec.onEnter : spec.chance;
  if (ctx.rng() > chance) {
    customer.banterIn = 6 + ctx.rng() * 14;
    return;
  }
  const line = chooseLine(ctx, customer, entered ? 'enter' : 'idle');
  if (!line) {
    customer.banterIn = 10;
    return;
  }
  assignSpeech(ctx, customer, line);
}

function chooseLine(ctx, customer, reason = 'idle') {
  const data = ctx.data.banter;
  const spec = stateSpec(ctx, customer.state);
  const voice = data.voices?.[customer.archetype];
  const voiceNow = [...(voice?.[customer.state] ?? []), ...(reason === 'idle' ? voice?.any ?? [] : [])];
  if (reason === 'enter') {
    if (voiceNow.length && ctx.rng() < 0.78) return distinctPick(ctx, customer, voiceNow);
    return distinctPick(ctx, customer, spec?.lines ?? voiceNow);
  }
  const bags = [];
  const pressure = ctx.cafePressure;
  if (pressure?.hot) bags.push(data.pressure.hot);
  if (pressure?.lag) bags.push(data.pressure.lag);
  if (pressure?.overloaded) bags.push(data.pressure.overloaded);
  if (bags.length && ctx.rng() < 0.4) return distinctPick(ctx, customer, bags.flat());
  if (voiceNow.length && ctx.rng() < 0.62) return distinctPick(ctx, customer, voiceNow);
  if (data.owner && ctx.rng() < 0.1) return distinctPick(ctx, customer, data.owner);
  return distinctPick(ctx, customer, spec?.lines ?? voiceNow);
}

function distinctPick(ctx, customer, lines) {
  const options = lines.filter((line) => line && line !== customer.lastBanter);
  const pool = options.length ? options : lines;
  if (!pool.length) return null;
  return pick(ctx.rng, pool);
}

function assignSpeech(ctx, customer, template) {
  const text = fill(template, {
    owner: ctx.state.player.name || 'chủ quán',
    name: customer.name,
    cafe: ctx.state.cafe.name
  });
  const hold = holdFor(ctx, text);
  customer.speech = { text, left: hold };
  customer.lastBanter = template;
  customer.banterIn = hold + 4;
}

function holdFor(ctx, text) {
  const data = ctx.data.banter;
  const fromLength = 7 + Math.ceil(text.length / 10);
  return Math.max(data.holdMin, Math.min(data.holdMax, fromLength));
}

function stateSpec(ctx, state) {
  return ctx.data.banter.states[state] ?? null;
}

function visibleCount(ctx) {
  return ctx.state.cafe.customers.filter((customer) => customer.speech?.left > 0).length;
}

function maxVisible(ctx) {
  return ctx.data.banter.maxVisible ?? 3;
}

function fill(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}
