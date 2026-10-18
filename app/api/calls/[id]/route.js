import { getCall, listAudit } from "../../../../lib/db.js";
import { json, fail } from "../../../../lib/server.js";
import { rateLimit, rateLimitResponse, LIMITERS } from "../../../../lib/ratelimit.js";
export const dynamic = "force-dynamic";
export async function GET(req, { params }) {
  try {
  const limit = rateLimit(req, "calls-id-read", LIMITERS.read);
  if (!limit.ok) return rateLimitResponse(limit);

    const { id } = await params;
    const call = await getCall(id);
    if (!call) return fail("Call not found.", 404);
    return json({ call, Audit: await listAudit(id) });
  } catch (e) { return fail("Could not load call: " + e.message, 500); }
}
