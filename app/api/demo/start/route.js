import { createCall } from "../../../../lib/db.js";
import { SCENARIOS } from "../../../../lib/scenarios.js";
import { json, fail, readJson } from "../../../../lib/server.js";
import { rateLimit, rateLimitResponse, LIMITERS } from "../../../../lib/ratelimit.js";
export const dynamic = "force-dynamic";
// DEMO ONLY: starts a simulated call. Creates source="demo" records; no real telephony is involved.
export async function POST(req) {
  try {
  const limit = rateLimit(req, "demo-start", LIMITERS.demoStart);
  if (!limit.ok) return rateLimitResponse(limit);

    const { body, response } = await readJson(req); if (response) return response;
    const { scenarioId } = body;
    if (scenarioId != null && typeof scenarioId !== "string") return fail("scenarioId must be a string.");
    const s = scenarioId ? SCENARIOS.find((x) => x.id === scenarioId) : SCENARIOS[0];
    if (!s) return fail(`Unknown scenarioId. Expected one of: ${SCENARIOS.map((x) => x.id).join(", ")}`);
    const { call } = await createCall({ category: s.category, risk_score: 0, summary: "", caller: s.caller, source: "demo" });
    return json({ call, scenario: { id: s.id, title: s.title, category: s.category, risk: s.risk, summary: s.summary, lines: s.lines } }, 201);
  } catch (e) { return fail("Could not start demo: " + e.message, 500); }
}
