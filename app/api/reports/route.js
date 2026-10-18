import { listReports, updateReportStatus } from "../../../lib/db.js";
import { json, fail, readJson } from "../../../lib/server.js";
import { cached } from "../../../lib/cache.js";
import { rateLimit, rateLimitResponse, rateHeaders, LIMITERS } from "../../../lib/ratelimit.js";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const limit = rateLimit(req, "reports-read", LIMITERS.read);
  if (!limit.ok) return rateLimitResponse(limit);
  try {
    const q = (new URL(req.url).searchParams.get("q") || "").slice(0, 120);
    const reports = await cached("reports", { q }, 2_000, () => listReports(q));
    return json({ reports }, 200, rateHeaders(limit));
  }
  catch (e) { return fail("Could not load reports: " + e.message, 500); }
}

export async function PATCH(req) {
  const limit = rateLimit(req, "reports-write", LIMITERS.write);
  if (!limit.ok) return rateLimitResponse(limit);
  try {
    const { body, response } = await readJson(req); if (response) return response;
    const { id, status } = body;
    if (!id || typeof id !== "string") return fail("Report id is required.");
    const report = await updateReportStatus(id, status);
    if (!report) return fail("Report not found or invalid status.", 404);
    return json({ report });
  } catch (e) { return fail("Could not update report: " + e.message, 500); }
}
