import { stats } from "../../../lib/db.js";
import { json, fail } from "../../../lib/server.js";
import { rateLimit, rateLimitResponse, rateHeaders, LIMITERS } from "../../../lib/ratelimit.js";

export const dynamic = "force-dynamic";

// The stats payload itself is cached + single-flighted inside lib/db.js
// (3 s TTL); this limiter only sheds abusive per-IP bursts.
export async function GET(req) {
  const limit = rateLimit(req, "stats", LIMITERS.stats);
  if (!limit.ok) return rateLimitResponse(limit);
  try { return json(await stats(), 200, rateHeaders(limit)); }
  catch (e) { return fail("Could not load statistics: " + e.message, 500); }
}
