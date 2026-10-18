import { getCall, listAudit } from "../../../../lib/db.js";
import { json, fail } from "../../../../lib/server.js";
export const dynamic = "force-dynamic";
export async function GET(_req, { params }) {
  try {
    const { id } = await params;
    const call = await getCall(id);
    if (!call) return fail("Call not found.", 404);
    return json({ call, Audit: await listAudit(id) });
  } catch (e) { return fail("Could not load call: " + e.message, 500); }
}
