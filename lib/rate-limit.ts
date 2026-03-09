type Entry = {
  count: number;
  expiresAt: number;
};

const store = new Map<string, Entry>();

export function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 10 * 60 * 1000
): { allowed: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.expiresAt <= now) {
    store.set(key, {
      count: 1,
      expiresAt: now + windowMs,
    });

    return {
      allowed: true,
      remaining: limit - 1,
      retryAfter: 0,
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((existing.expiresAt - now) / 1000),
    };
  }

  existing.count += 1;
  store.set(key, existing);

  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfter: 0,
  };
}