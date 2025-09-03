const buckets = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const rec = buckets.get(key);
  if (!rec || rec.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (rec.count >= limit) return { ok: false, remaining: 0 };
  rec.count += 1;
  return { ok: true, remaining: Math.max(0, limit - rec.count) };
}
