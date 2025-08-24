export function minMax(value, min, max, type = 'benefit') {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const clamped = Math.max(lo, Math.min(hi, value));
  const denom = hi - lo;
  if (denom === 0) return 0;
  const r = (clamped - lo) / denom;
  return type === 'benefit' ? r : 1 - r;
}