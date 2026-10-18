import { health } from "../../../lib/db.js";
import { json } from "../../../lib/server.js";
export const dynamic = "force-dynamic";
// GET /api/health — liveness + storage check. Safe to expose: it reports
// only which storage MODE is active (never connection strings or secrets),
// so a deployed site can be verified in one click after setting DATABASE_URL.
export async function GET() {
  const result = await health();
  return json(result, result.ok ? 200 : 503);
}
