import { listCalls, countCalls } from "../../../lib/db.js";
import { json, fail, checkIngestSecret, readJson } from "../../../lib/server.js";
import { validateCallInput } from "../../../lib/intel.js";
import { cached } from "../../../lib/cache.js";
import { rateLimit, rateLimitResponse, rateHeaders, LIMITERS } from "../../../lib/ratelimit.js";

export const dynamic = "force-dynamic";

// GET /api/calls?q=&category=&status=&limit=&offset=
// Burst-protected and micro-cached: 1,000 users polling the same filters
// share one database round-trip per 2-second window per instance.
export async function GET(req) {
  const limit = rateLimit(req, "calls-read", LIMITERS.read);
  if (!limit.ok) return rateLimitResponse(limit);
  try {
    const p = new URL(req.url).searchParams;
    const query = {
      q: (p.get("q") || "").slice(0, 120),
      category: p.get("category") || "",
      status: p.get("status") || "",
      limit: p.get("limit") || undefined,
      offset: p.get("offset") || undefined,
    };
    const [calls, total] = await Promise.all([
      cached("calls", query, 2_000, () => listCalls(query)),
      cached("calls-count", { q: query.q, category: query.category, status: query.status }, 2_000, () => countCalls(query)),
    ]);
    return json({ calls, total, limit: Number(query.limit) || 200, offset: Number(query.offset) || 0 }, 200, rateHeaders(limit));
  } catch (e) { return fail("Could not load calls: " + e.message, 500); }
}

// POST /api/calls  (protected: x-ingest-secret) body: {category, risk_score, transcript, summary, caller, client_event_id}
export async function POST(req) {
  const denied = checkIngestSecret(req); if (denied) return denied;
  const limit = rateLimit(req, "calls-ingest", LIMITERS.ingest);
  if (!limit.ok) return rateLimitResponse(limit);
  try {
    const { body, response } = await readJson(req); if (response) return response;
    const errors = validateCallInput(body);
    if (errors.length) return fail(errors.join("; "));
    const { call, duplicate } = await createCall({ ...body, source: "live" });
    return json({ call, duplicate, note: duplicate ? "Duplicate client_event_id ignored (idempotent)." : "Call created." }, duplicate ? 200 : 201);
  } catch (e) { return fail("Could not create call: " + e.message, 500); }
}
