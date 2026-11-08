export function copyInto(target, source) {
  for (const key of Object.keys(target)) delete target[key];
  const clone = structuredClone(source);
  for (const [key, value] of Object.entries(clone)) target[key] = value;
  return target;
}
