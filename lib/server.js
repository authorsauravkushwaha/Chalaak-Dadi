import { NextResponse } from "next/server";

// Ingestion endpoints require header:  x-ingest-secret: <INGEST_SECRET>
// If INGEST_SECRET is not configured, ingestion stays DISABLED (secure default) —
// the built-in /api/demo/* endpoints still power the clearly-labelled demo.
export function checkIngestSecret(req) {
  const expected = process.env.INGEST_SECRET;
  if (!expected)
    return NextResponse.json(
      { error: "Ingestion is disabled: INGEST_SECRET is not set on the server. See README → Configure secrets." },
      { status: 503 }
    );
  if (req.headers.get("x-ingest-secret") !== expected)
    return NextResponse.json({ error: "Unauthorized: missing or wrong x-ingest-secret header." }, { status: 401 });
  return null;
}

export const json = (data, status = 200) => NextResponse.json(data, { status });
export const fail = (message, status = 400) => NextResponse.json({ error: message }, { status });
