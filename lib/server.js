import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

// Ingestion endpoints require header:  x-ingest-secret: <INGEST_SECRET>
// If INGEST_SECRET is not configured (or is still the .env.example
// placeholder), ingestion stays DISABLED (secure default) — the built-in
// /api/demo/* endpoints still power the clearly-labelled demo.
const PLACEHOLDER_SECRETS = new Set(["change-me-to-a-long-random-value", "change-me", "changeme"]);

export function ingestSecretConfigured() {
  const secret = process.env.INGEST_SECRET?.trim();
  return !!secret && secret.length >= 8 && !PLACEHOLDER_SECRETS.has(secret);
}

function secretsMatch(given, expected) {
  if (!given) return false;
  const a = Buffer.from(String(given));
  const b = Buffer.from(String(expected));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function checkIngestSecret(req) {
  if (!ingestSecretConfigured())
    return NextResponse.json(
      { error: "Ingestion is disabled: INGEST_SECRET is not set (or is still the placeholder) on the server. See README → Configure secrets." },
      { status: 503 }
    );
  if (!secretsMatch(req.headers.get("x-ingest-secret"), process.env.INGEST_SECRET.trim()))
    return NextResponse.json({ error: "Unauthorized: missing or wrong x-ingest-secret header." }, { status: 401 });
  return null;
}

/**
 * Parse a JSON request body without turning a client mistake into a 500.
 * Returns { body } on success or { response } (a ready 400) on failure.
 * An empty body yields {} so optional-body endpoints keep working.
 */
export async function readJson(req) {
  const text = await req.text().catch(() => "");
  if (!text.trim()) return { body: {} };
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body))
      return { response: NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 }) };
    return { body };
  } catch {
    return { response: NextResponse.json({ error: "Request body is not valid JSON." }, { status: 400 }) };
  }
}

export const json = (data, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export const fail = (message, status = 400) => NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
