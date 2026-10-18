import { listCalls, createCall } from "../../../lib/db.js";
import { json, fail, checkIngestSecret } from "../../../lib/server.js";
import { validateCallInput } from "../../../lib/intel.js";
export const dynamic = "force-dynamic";
// GET /api/calls?q=&category=&status=
export async function GET(req) {
  try {
    const p = new URL(req.url).searchParams;
    return json({ calls: await listCalls({ q: p.get("q") || "", category: p.get("category") || "", status: p.get("status") || "" }) });
  } catch (e) { return fail("Could not load calls: " + e.message, 500); }
}
// POST /api/calls  (protected: x-ingest-secret) body: {category, risk_score, transcript, summary, caller, client_event_id}
export async function POST(req) {
  const denied = checkIngestSecret(req); if (denied) return denied;
  try {
    const body = await req.json();
    const errors = validateCallInput(body);
    if (errors.length) return fail(errors.join("; "));
    const { call, duplicate } = await createCall({ ...body, source: "live" });
    return json({ call, duplicate, note: duplicate ? "Duplicate client_event_id ignored (idempotent)." : "Call created." }, duplicate ? 200 : 201);
  } catch (e) { return fail("Could not create call: " + e.message, 500); }
}
