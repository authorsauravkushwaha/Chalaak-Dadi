import { endCall } from "../../../../../lib/db.js";
import { json, fail, checkIngestSecret } from "../../../../../lib/server.js";
export const dynamic = "force-dynamic";
// POST /api/calls/:id/end (protected) body: {duration_sec?, transcript?, summary?, category?, risk_score?}
export async function POST(req, { params }) {
  const denied = checkIngestSecret(req); if (denied) return denied;
  try {
    const { id } = await params;
    const call = await endCall(id, await req.json().catch(() => ({})));
    if (!call) return fail("Call not found.", 404);
    return json({ call });
  } catch (e) { return fail("Could not end call: " + e.message, 500); }
}
