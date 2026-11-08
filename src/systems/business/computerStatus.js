export function isOutOfService(pc) {
  return pc?.status === 'disabled' || pc?.status === 'locked';
}
