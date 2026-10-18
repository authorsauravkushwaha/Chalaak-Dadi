import { test, before } from "node:test";
import assert from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Point the demo store at a throwaway file BEFORE importing the db layer,
// and make sure no real database env leaks into this test process.
for (const name of ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL_NON_POOLING", "DATABASE_URL_UNPOOLED", "NEON_DATABASE_URL"]) delete process.env[name];
process.env.STORE_PATH = join(mkdtempSync(join(tmpdir(), "Chalaak-Dadi-test-")), "store.json");

let db;
before(async () => { db = await import("../lib/db.js"); });

test("demo store seeds exactly the 3 fictional cases", async () => {
  const calls = await db.listCalls();
  assert.equal(calls.length, 3);
  assert.ok(calls.every((c) => c.source === "demo" && c.status === "ended"));
  assert.ok(calls.every((c) => c.entities.length > 0));
});

test("health reports the ephemeral (non-persistent) demo store honestly", async () => {
  const h = await db.health();
  assert.equal(h.ok, true);
  assert.equal(h.mode, "ephemeral");
  assert.equal(h.persistent, false);
});

test("create → entity (idempotent) → end (idempotent) → report flow", async () => {
  const { call, duplicate } = await db.createCall({ category: "Digital Arrest", caller: "+91 90000 00000 (fictional)", client_event_id: "test-event-1", source: "demo" });
  assert.equal(duplicate, false);

  const again = await db.createCall({ category: "Digital Arrest", client_event_id: "test-event-1", source: "demo" });
  assert.equal(again.duplicate, true);
  assert.equal(again.call.id, call.id);

  const first = await db.addEntity(call.id, { type: "UPI_ID", value: "demo@fakeupi", confidence: 0.9, evidence: "test line" });
  assert.equal(first.duplicate, false);
  const dupEntity = await db.addEntity(call.id, { type: "UPI_ID", value: "DEMO@fakeupi", confidence: 0.9, evidence: "test line" });
  assert.equal(dupEntity.duplicate, true);

  const ended = await db.endCall(call.id, { duration_sec: 42, transcript: "Caller: test", summary: "test summary", risk_score: 88 });
  assert.equal(ended.status, "ended");
  assert.equal(ended.duration_sec, 42);
  const reEnded = await db.endCall(call.id, {});
  assert.equal(reEnded.duration_sec, 42, "re-ending must not grow the duration");

  const report = await db.createReport(call.id);
  assert.match(report.body, /NOT SUBMITTED/);
  assert.equal((await db.listReports()).some((r) => r.id === report.id), true);
  const reviewed = await db.updateReportStatus(report.id, "Reviewed");
  assert.equal(reviewed.status, "Reviewed");
  assert.equal(await db.updateReportStatus(report.id, "Hacked"), null);

  const Audit = await db.listAudit(call.id);
  const types = Audit.map((a) => a.event_type);
  assert.equal(types.filter((t) => t === "CALL_CREATED").length, 1, "exactly one CALL_CREATED audit row");
  assert.ok(types.includes("ENTITY_ADDED") && types.includes("CALL_ENDED") && types.includes("REPORT_GENERATED"));
});
