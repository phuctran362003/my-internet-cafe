export function setFlag(state, key, value) {
  state.narrative.flags[key] = value;
}

export function hasFlag(state, key) {
  return Boolean(state.narrative.flags[key]);
}
