import { createReport } from "../../../../../lib/db.js";
import { json, fail } from "../../../../../lib/server.js";
import { rateLimit, rateLimitResponse, LIMITERS } from "../../../../../lib/ratelimit.js";
export const dynamic = "force-dynamic";
// POST /api/calls/:id/report — generate (and save) an unsubmitted complaint draft
export async function POST(req, { params }) {
  try {
  const limit = rateLimit(req, "report-write", LIMITERS.write);
  if (!limit.ok) return rateLimitResponse(limit);

    const { id } = await params;
    const report = await createReport(id);
    if (!report) return fail("Call not found.", 404);
    return json({ report }, 201);
  } catch (e) { return fail("Could not generate report: " + e.message, 500); }
}
