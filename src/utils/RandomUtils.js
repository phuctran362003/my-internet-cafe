export function createRng(read, write) {
  return () => {
    let seed = read() >>> 0;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    write(seed);
    return seed / 4294967296;
  };
}

export function hashSeed(seed) {
  const text = String(seed);
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0 || 1;
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length) % list.length];
}

export function rangeInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}
