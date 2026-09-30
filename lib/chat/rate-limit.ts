import { createHash } from "node:crypto";

export type RateLimitConfig = {
  perMinute: number;
  perDay: number;
  siteDaily: number;
};
export type RateLimitResult =
  | { ok: true }
  | { ok: false; scope: "visitor" | "site"; retryAfter: number };
/** Increments a fixed-window counter and reports how many seconds remain in the window. */
export type Counter = (
  key: string,
  windowSeconds: number,
) => Promise<{ count: number; resetIn: number }>;

export const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  perMinute: 8,
  perDay: 60,
  siteDaily: 1500,
};
const MINUTE = 60;
const DAY = 86_400;

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
export function rateLimitConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): RateLimitConfig {
  return {
    perMinute: positiveInt(
      env.CHAT_RATE_LIMIT_PER_MINUTE,
      DEFAULT_RATE_LIMITS.perMinute,
    ),
    perDay: positiveInt(env.CHAT_RATE_LIMIT_PER_DAY, DEFAULT_RATE_LIMITS.perDay),
    siteDaily: positiveInt(env.CHAT_DAILY_BUDGET, DEFAULT_RATE_LIMITS.siteDaily),
  };
}

/** Per-process counter. Enough to stop a naive loop; not shared across serverless instances. */
export function memoryCounter(now: () => number = Date.now): Counter {
  const windows = new Map<string, { count: number; resetAt: number }>();
  return async (key, windowSeconds) => {
    const time = now();
    if (windows.size > 5_000) {
      for (const [stale, entry] of windows)
        if (entry.resetAt <= time) windows.delete(stale);
    }
    let entry = windows.get(key);
    if (!entry || entry.resetAt <= time) {
      entry = { count: 0, resetAt: time + windowSeconds * 1000 };
      windows.set(key, entry);
    }
    entry.count++;
    return {
      count: entry.count,
      resetIn: Math.max(1, Math.ceil((entry.resetAt - time) / 1000)),
    };
  };
}

/** Shared counter over Upstash's REST API, so limits hold across serverless instances. */
export function upstashCounter(
  url: string,
  token: string,
  fetcher: typeof fetch = fetch,
): Counter {
  return async (key, windowSeconds) => {
    const response = await fetcher(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(windowSeconds), "NX"],
        ["TTL", key],
      ]),
      signal: AbortSignal.timeout(1_500),
    });
    if (!response.ok) throw new Error(`Rate limit store returned ${response.status}`);
    const [incr, , ttl] = (await response.json()) as { result?: number }[];
    if (typeof incr?.result !== "number")
      throw new Error("Rate limit store returned an unexpected reply");
    return {
      count: incr.result,
      resetIn:
        typeof ttl?.result === "number" && ttl.result > 0
          ? ttl.result
          : windowSeconds,
    };
  };
}

/** Identifies a visitor without keeping their address: a truncated hash of the platform-reported IP. */
export function visitorId(req: Request): string {
  const forwarded =
    req.headers.get("x-vercel-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0] ??
    "unknown";
  return createHash("sha256").update(forwarded.trim()).digest("hex").slice(0, 16);
}

export function createRateLimiter({
  config = rateLimitConfigFromEnv(),
  counter = defaultCounter(),
  fallback = memoryCounter(),
}: {
  config?: RateLimitConfig;
  counter?: Counter;
  fallback?: Counter;
} = {}) {
  // A store outage must not turn the limiter off, so fall back to the local counter.
  const count: Counter = async (key, windowSeconds) => {
    try {
      return await counter(key, windowSeconds);
    } catch (error) {
      console.error("[profile-chat] Rate limit store unavailable", {
        type: error instanceof Error ? error.name : "UnknownError",
      });
      return fallback(key, windowSeconds);
    }
  };
  return {
    async check(req: Request): Promise<RateLimitResult> {
      const visitor = visitorId(req);
      const minute = await count(`chat:m:${visitor}`, MINUTE);
      if (minute.count > config.perMinute)
        return { ok: false, scope: "visitor", retryAfter: minute.resetIn };
      const day = await count(`chat:d:${visitor}`, DAY);
      if (day.count > config.perDay)
        return { ok: false, scope: "visitor", retryAfter: day.resetIn };
      const site = await count("chat:site:d", DAY);
      if (site.count > config.siteDaily)
        return { ok: false, scope: "site", retryAfter: site.resetIn };
      return { ok: true };
    },
  };
}
export type RateLimiter = ReturnType<typeof createRateLimiter>;

function defaultCounter(): Counter {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? upstashCounter(url, token) : memoryCounter();
}

export function rateLimitMessage(result: Extract<RateLimitResult, { ok: false }>) {
  return result.scope === "site"
    ? "AI Arthur has hit today's conversation budget. Please try again tomorrow, or contact Arthur directly."
    : "That's a lot of questions in a short time. Please wait a moment and try again, or contact Arthur directly.";
}
