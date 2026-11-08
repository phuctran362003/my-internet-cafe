export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function vnd(value) {
  return Math.round(Number(value) || 0);
}
