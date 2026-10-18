import { stats } from "../../../lib/db.js";
import { json, fail } from "../../../lib/server.js";
export const dynamic = "force-dynamic";
export async function GET() { try { return json(await stats()); } catch (e) { return fail("Could not load statistics: " + e.message, 500); } }
