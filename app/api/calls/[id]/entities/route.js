import { getCall, addEntity } from "../../../../../lib/db.js";
import { json, fail, checkIngestSecret, readJson } from "../../../../../lib/server.js";
import { validateEntityInput } from "../../../../../lib/intel.js";
export const dynamic = "force-dynamic";
// POST /api/calls/:id/entities (protected) body: {type, value, confidence, evidence}
export async function POST(req, { params }) {
  const denied = checkIngestSecret(req); if (denied) return denied;
  try {
    const { id } = await params;
    if (!(await getCall(id))) return fail("Call not found.", 404);
    const { body, response } = await readJson(req); if (response) return response;
    const errors = validateEntityInput(body);
    if (errors.length) return fail(errors.join("; "));
    const { entity, duplicate } = await addEntity(id, body);
    return json({ entity, duplicate, note: duplicate ? "Duplicate entity ignored." : "Entity added." }, duplicate ? 200 : 201);
  } catch (e) { return fail("Could not add entity: " + e.message, 500); }
}
