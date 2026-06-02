export function getThrottleTtlMs(): number {
  const raw = Number(process.env.THROTTLE_TTL_MS ?? 60_000);
  return Number.isFinite(raw) && raw > 0 ? raw : 60_000;
}

export function getThrottleLimit(): number {
  const raw = Number(process.env.THROTTLE_LIMIT ?? 200);
  return Number.isFinite(raw) && raw > 0 ? raw : 200;
}
