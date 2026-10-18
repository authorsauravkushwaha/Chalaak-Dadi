import { getCall, endCall } from "../../../../../lib/db.js";
import { json, fail, checkIngestSecret, readJson } from "../../../../../lib/server.js";
import { validateEndInput } from "../../../../../lib/intel.js";
export const dynamic = "force-dynamic";
// POST /api/calls/:id/end (protected) body: {duration_sec?, transcript?, summary?, category?, risk_score?}
export async function POST(req, { params }) {
  const denied = checkIngestSecret(req); if (denied) return denied;
  try {
    const { id } = await params;
    if (!(await getCall(id))) return fail("Call not found.", 404);
    const { body, response } = await readJson(req); if (response) return response;
    const errors = validateEndInput(body);
    if (errors.length) return fail(errors.join("; "));
    const call = await endCall(id, body);
    if (!call) return fail("Call not found.", 404);
    return json({ call });
  } catch (e) { return fail("Could not end call: " + e.message, 500); }
}
