// Per-IP rate limiting (token bucket, in-memory).
//
// Purpose: keep the console responsive for 1,000 honest concurrent users by
// shedding abusive bursts (scrapers, stuck pollers, scripted floods) BEFORE
// they reach the database. Honest dashboard polling (1 req / 8 s per user)
// is far below every limit configured here.
//
// Honest about scope: the bucket lives in one server instance's memory.
// On a single long-lived server (npm start / Docker) it is a global quota;
// on multi-instance serverless each instance enforces its own share — still
// enough to blunt floods, and swap-in points for Redis/Upstash are noted in
// docs/SCALE.md.

const BUCKETS = new Map(); // key -> { tokens, last, }
const MAX_BUCKETS = 5000;

function sweep(now) {
  if (BUCKETS.size < MAX_BUCKETS) return;
  for (const [key, bucket] of BUCKETS) {
    if (now - bucket.last > 120_000) BUCKETS.delete(key);
  }
  // Absolute cap: drop oldest insertions if a spoofed-IP flood still grows it.
  while (BUCKETS.size > MAX_BUCKETS) BUCKETS.delete(BUCKETS.keys().next().value);
}

/**
 * Consume one token for this request.
 * @param {Request} req
 * @param {string} name     limiter class (per-route config)
 * @param {object} opts     { capacity, refillPerSec }
 * @returns {{ ok: true, remaining: number } | { ok: false, retryAfter: number }}
 */
export function rateLimit(req, name, { capacity, refillPerSec }) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const key = `${name}:${ip}`;
  const now = Date.now();

  sweep(now);

  let bucket = BUCKETS.get(key);
  if (!bucket) {
    bucket = { tokens: capacity, last: now };
    BUCKETS.set(key, bucket);
  }

  const elapsedSec = (now - bucket.last) / 1000;
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSec * refillPerSec);
  bucket.last = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { ok: true, remaining: Math.floor(bucket.tokens) };
  }
  const retryAfter = Math.max(1, Math.ceil((1 - bucket.tokens) / refillPerSec));
  return { ok: false, retryAfter };
}

/** NextResponse helper — attach standard headers / a 429 response. */
export function rateLimitResponse(result) {
  return new Response(
    JSON.stringify({ error: "Too many requests — please slow down." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfter),
        "Cache-Control": "no-store",
      },
    }
  );
}

export function rateHeaders(result, headers = {}) {
  return {
    ...headers,
    "X-RateLimit-Remaining": String(result.remaining),
  };
}

// Named limiter classes (capacity = burst size, refillPerSec = sustained rate).
export const LIMITERS = {
  read: { capacity: 40, refillPerSec: 40 / 60 },      // ~40/min sustained, 40 burst
  stats: { capacity: 20, refillPerSec: 20 / 60 },      // ~20/min — dashboard polls every 8s
  write: { capacity: 30, refillPerSec: 30 / 60 },      // writes from the console
  demoStart: { capacity: 8, refillPerSec: 8 / 60 },    // demo starts are heavy
  demoWrite: { capacity: 120, refillPerSec: 2 },       // entity saves stream in bursts
  ingest: { capacity: 600, refillPerSec: 10 },         // machine ingestion (secret-gated anyway)
};
