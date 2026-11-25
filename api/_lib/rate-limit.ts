interface Entry {
  fails: number;
  windowStart: number;
  lockedUntil: number;
}

export interface Limits {
  maxFails: number;
  windowMs: number;
  lockMs: number;
}

// In-memory and per server instance: a best-effort brake, not a global guarantee on serverless hosting.
const entries = new Map<string, Entry>();

export function retryAfterSeconds(key: string, now = Date.now()) {
  const entry = entries.get(key);
  if (!entry || entry.lockedUntil <= now) return 0;
  return Math.ceil((entry.lockedUntil - now) / 1000);
}

export function recordFailure(key: string, limits: Limits, now = Date.now()) {
  let entry = entries.get(key);
  if (!entry || now - entry.windowStart > limits.windowMs) {
    entry = { fails: 0, windowStart: now, lockedUntil: 0 };
    entries.set(key, entry);
  }
  entry.fails += 1;
  if (entry.fails >= limits.maxFails) entry.lockedUntil = now + limits.lockMs;
  if (entries.size > 5000) for (const [k, e] of entries) if (e.lockedUntil < now) entries.delete(k);
}

export function clearFailures(key: string) {
  entries.delete(key);
}

export function resetRateLimits() {
  entries.clear();
}
