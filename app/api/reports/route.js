import { listReports, updateReportStatus } from "../../../lib/db.js";
import { json, fail } from "../../../lib/server.js";
export const dynamic = "force-dynamic";
export async function GET(req) {
  try { return json({ reports: await listReports(new URL(req.url).searchParams.get("q") || "") }); }
  catch (e) { return fail("Could not load reports: " + e.message, 500); }
}
export async function PATCH(req) {
  try {
    const { id, status } = await req.json();
    const report = await updateReportStatus(id, status);
    if (!report) return fail("Report not found or invalid status.", 404);
    return json({ report });
  } catch (e) { return fail("Could not update report: " + e.message, 500); }
}
