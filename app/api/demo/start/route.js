import { createCall } from "../../../../lib/db.js";
import { SCENARIOS } from "../../../../lib/scenarios.js";
import { json, fail } from "../../../../lib/server.js";
export const dynamic = "force-dynamic";
// DEMO ONLY: starts a simulated call. Creates source="demo" records; no real telephony is involved.
export async function POST(req) {
  try {
    const { scenarioId } = await req.json().catch(() => ({}));
    const s = SCENARIOS.find((x) => x.id === scenarioId) || SCENARIOS[0];
    const { call } = await createCall({ category: s.category, risk_score: 0, summary: "", caller: s.caller, source: "demo" });
    return json({ call, scenario: { id: s.id, title: s.title, category: s.category, risk: s.risk, summary: s.summary, lines: s.lines } }, 201);
  } catch (e) { return fail("Could not start demo: " + e.message, 500); }
}
