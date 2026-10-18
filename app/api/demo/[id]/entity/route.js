import { getCall, addEntity } from "../../../../../lib/db.js";
import { json, fail, readJson } from "../../../../../lib/server.js";
import { validateEntityInput } from "../../../../../lib/intel.js";
import { rateLimit, rateLimitResponse, LIMITERS } from "../../../../../lib/ratelimit.js";
export const dynamic = "force-dynamic";
// DEMO ONLY: attaches an extracted indicator to a demo call (refuses non-demo calls).
export async function POST(req, { params }) {
  try {
  const limit = rateLimit(req, "demo-entity", LIMITERS.demoWrite);
  if (!limit.ok) return rateLimitResponse(limit);

    const { id } = await params;
    const call = await getCall(id);
    if (!call) return fail("Call not found.", 404);
    if (call.source !== "demo") return fail("Demo endpoint only works on demo calls. Use the protected ingestion API for live calls.", 403);
    if (call.status === "ended") return fail("Call has already ended; entities can no longer be added.", 409);
    const { body, response } = await readJson(req); if (response) return response;
    const errors = validateEntityInput(body);
    if (errors.length) return fail(errors.join("; "));
    const { entity, duplicate } = await addEntity(id, body);
    return json({ entity, duplicate }, duplicate ? 200 : 201);
  } catch (e) { return fail("Could not add demo entity: " + e.message, 500); }
}
