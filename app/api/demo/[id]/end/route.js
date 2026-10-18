import { getCall, endCall } from "../../../../../lib/db.js";
import { json, fail, readJson } from "../../../../../lib/server.js";
import { validateEndInput } from "../../../../../lib/intel.js";
export const dynamic = "force-dynamic";
export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const call = await getCall(id);
    if (!call) return fail("Call not found.", 404);
    if (call.source !== "demo") return fail("Demo endpoint only works on demo calls.", 403);
    const { body, response } = await readJson(req); if (response) return response;
    const errors = validateEndInput(body);
    if (errors.length) return fail(errors.join("; "));
    return json({ call: await endCall(id, body) });
  } catch (e) { return fail("Could not end demo: " + e.message, 500); }
}
