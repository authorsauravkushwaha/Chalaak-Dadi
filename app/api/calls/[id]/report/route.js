import { createReport } from "../../../../../lib/db.js";
import { json, fail } from "../../../../../lib/server.js";
export const dynamic = "force-dynamic";
// POST /api/calls/:id/report — generate (and save) an unsubmitted complaint draft
export async function POST(_req, { params }) {
  try {
    const { id } = await params;
    const report = await createReport(id);
    if (!report) return fail("Call not found.", 404);
    return json({ report }, 201);
  } catch (e) { return fail("Could not generate report: " + e.message, 500); }
}
