// Database layer.
// • If DATABASE_URL is set  -> PostgreSQL (tables auto-created from db/schema.sql logic below).
// • If not set              -> local JSON file store (data/store.json) so the demo runs anywhere.
// Secrets stay server-side: this file is never imported by browser code.
import { SCENARIOS } from "./scenarios.js";
import { extractEntities, generateComplaint } from "./intel.js";

const usePg = !!process.env.DATABASE_URL;
let pool = null;
const id = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/* ---------------- PostgreSQL backend ---------------- */
async function pg() {
  if (!pool) {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false } });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calls (id TEXT PRIMARY KEY, started_at TIMESTAMPTZ NOT NULL DEFAULT now(), ended_at TIMESTAMPTZ, duration_sec INTEGER NOT NULL DEFAULT 0, category TEXT NOT NULL DEFAULT 'Other / Unknown', risk_score INTEGER NOT NULL DEFAULT 0, transcript TEXT NOT NULL DEFAULT '', summary TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'live', source TEXT NOT NULL DEFAULT 'demo', caller TEXT NOT NULL DEFAULT '', client_event_id TEXT UNIQUE);
      CREATE TABLE IF NOT EXISTS entities (id TEXT PRIMARY KEY, call_id TEXT NOT NULL REFERENCES calls(id) ON DELETE CASCADE, type TEXT NOT NULL, value TEXT NOT NULL, confidence REAL NOT NULL DEFAULT 0.8, evidence TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (call_id, type, value));
      CREATE TABLE IF NOT EXISTS Audit (id TEXT PRIMARY KEY, event_type TEXT NOT NULL, call_id TEXT, detail TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, call_id TEXT NOT NULL REFERENCES calls(id) ON DELETE CASCADE, title TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Draft — Unsubmitted', created_at TIMESTAMPTZ NOT NULL DEFAULT now());`);
    await seedPgIfEmpty();
  }
  return pool;
}
async function seedPgIfEmpty() {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM calls");
  if (rows[0].c > 0) return;
  for (const s of seededCalls()) {
    await pool.query(
      "INSERT INTO calls (id,started_at,ended_at,duration_sec,category,risk_score,transcript,summary,status,source,caller) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ended','demo',$9) ON CONFLICT (id) DO NOTHING",
      [s.id, s.started_at, s.ended_at, s.duration_sec, s.category, s.risk_score, s.transcript, s.summary, s.caller]
    );
    for (const e of s.entities)
      await pool.query("INSERT INTO entities (id,call_id,type,value,confidence,evidence) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING", [e.id, s.id, e.type, e.value, e.confidence, e.evidence]);
    await pool.query("INSERT INTO Audit (id,event_type,call_id,detail) VALUES ($1,'CALL_SEEDED',$2,'Fictional demo record seeded')", [id("aud"), s.id]);
  }
}

/* ---------------- JSON file backend ---------------- */
async function store() {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const file = path.join(process.cwd(), "data", "store.json");
  try {
    return { fs, file, data: JSON.parse(await fs.readFile(file, "utf8")) };
  } catch {
    const data = { calls: [], entities: [], Audit: [], reports: [] };
    for (const s of seededCalls()) {
      data.calls.push({ ...s, entities: undefined });
      data.entities.push(...s.entities);
      data.Audit.push({ id: id("aud"), event_type: "CALL_SEEDED", call_id: s.id, detail: "Fictional demo record seeded", created_at: s.started_at });
    }
    await save({ fs, file, data });
    return { fs, file, data };
  }
}
async function save({ fs, file, data }) {
  const path = await import("node:path");
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 1));
}

/* ---------------- Seed builder (3 fictional cases) ---------------- */
function seededCalls() {
  return SCENARIOS.map((s, i) => {
    const start = new Date(Date.now() - (i + 1) * 5 * 3600 * 1000);
    const duration = 300 + i * 95;
    const transcript = s.lines.map((l) => `${l.speaker}: ${l.text}`).join("\n");
    const seen = new Map();
    for (const l of s.lines) for (const e of extractEntities(l.text)) seen.set(e.type + e.value, e);
    return {
      id: `call_demo_${s.id}`, started_at: start.toISOString(), ended_at: new Date(start.getTime() + duration * 1000).toISOString(),
      duration_sec: duration, category: s.category, risk_score: s.risk, transcript, summary: s.summary,
      status: "ended", source: "demo", caller: s.caller,
      entities: [...seen.values()].map((e) => ({ id: id("ent"), call_id: `call_demo_${s.id}`, ...e, created_at: start.toISOString() })),
    };
  });
}

/* ---------------- Public API used by route handlers ---------------- */
export async function listCalls({ q = "", category = "", status = "" } = {}) {
  let calls, entities;
  if (usePg) {
    const p = await pg();
    calls = (await p.query("SELECT * FROM calls ORDER BY started_at DESC")).rows;
    entities = (await p.query("SELECT * FROM entities ORDER BY created_at ASC")).rows;
  } else {
    const { data } = await store();
    calls = [...data.calls].sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
    entities = data.entities;
  }
  return calls
    .map((c) => ({ ...c, entities: entities.filter((e) => e.call_id === c.id) }))
    .filter((c) => (!category || c.category === category) && (!status || c.status === status) &&
      (!q || (c.summary + c.category + c.caller + c.id).toLowerCase().includes(q.toLowerCase())));
}

export async function getCall(callId) {
  const all = await listCalls();
  return all.find((c) => c.id === callId) || null;
}

export async function createCall(input) {
  const call = {
    id: id("call"), started_at: new Date().toISOString(), ended_at: null, duration_sec: 0,
    category: input.category || "Other / Unknown", risk_score: Number(input.risk_score) || 0,
    transcript: input.transcript || "", summary: input.summary || "", status: "live",
    source: input.source || "live", caller: input.caller || "", client_event_id: input.client_event_id || null,
  };
  if (usePg) {
    const p = await pg();
    if (call.client_event_id) {
      const dup = await p.query("SELECT * FROM calls WHERE client_event_id=$1", [call.client_event_id]);
      if (dup.rows[0]) return { call: dup.rows[0], duplicate: true };
    }
    await p.query("INSERT INTO calls (id,category,risk_score,transcript,summary,status,source,caller,client_event_id) VALUES ($1,$2,$3,$4,$5,'live',$6,$7,$8)",
      [call.id, call.category, call.risk_score, call.transcript, call.summary, call.source, call.caller, call.client_event_id]);
  } else {
    const s = await store();
    if (call.client_event_id) {
      const dup = s.data.calls.find((c) => c.client_event_id === call.client_event_id);
      if (dup) return { call: dup, duplicate: true };
    }
    s.data.calls.push(call);
    s.data.Audit.push({ id: id("aud"), event_type: "CALL_CREATED", call_id: call.id, detail: `source=${call.source}`, created_at: call.started_at });
    await save(s);
  }
  await addAudit("CALL_CREATED", call.id, `source=${call.source}`);
  return { call, duplicate: false };
}

export async function addEntity(callId, e) {
  const entity = { id: id("ent"), call_id: callId, type: e.type, value: String(e.value).trim(), confidence: Number(e.confidence ?? 0.8), evidence: String(e.evidence || "").slice(0, 300), created_at: new Date().toISOString() };
  if (usePg) {
    const p = await pg();
    const r = await p.query("INSERT INTO entities (id,call_id,type,value,confidence,evidence) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (call_id,type,value) DO NOTHING RETURNING *",
      [entity.id, callId, entity.type, entity.value, entity.confidence, entity.evidence]);
    if (!r.rows[0]) return { entity: null, duplicate: true };
  } else {
    const s = await store();
    if (s.data.entities.some((x) => x.call_id === callId && x.type === entity.type && x.value.toLowerCase() === entity.value.toLowerCase()))
      return { entity: null, duplicate: true };
    s.data.entities.push(entity);
    await save(s);
  }
  await addAudit("ENTITY_ADDED", callId, `${entity.type}: ${entity.value}`);
  return { entity, duplicate: false };
}

export async function endCall(callId, patch = {}) {
  const ended = new Date().toISOString();
  if (usePg) {
    const p = await pg();
    const cur = await p.query("SELECT * FROM calls WHERE id=$1", [callId]);
    if (!cur.rows[0]) return null;
    const dur = patch.duration_sec ?? Math.max(0, Math.round((Date.now() - new Date(cur.rows[0].started_at)) / 1000));
    await p.query("UPDATE calls SET status='ended', ended_at=$2, duration_sec=$3, transcript=COALESCE(NULLIF($4,''),transcript), summary=COALESCE(NULLIF($5,''),summary), category=COALESCE(NULLIF($6,''),category), risk_score=GREATEST(risk_score,$7) WHERE id=$1",
      [callId, ended, dur, patch.transcript || "", patch.summary || "", patch.category || "", Number(patch.risk_score) || 0]);
  } else {
    const s = await store();
    const c = s.data.calls.find((x) => x.id === callId);
    if (!c) return null;
    c.status = "ended"; c.ended_at = ended;
    c.duration_sec = patch.duration_sec ?? Math.max(0, Math.round((Date.now() - new Date(c.started_at)) / 1000));
    if (patch.transcript) c.transcript = patch.transcript;
    if (patch.summary) c.summary = patch.summary;
    if (patch.category) c.category = patch.category;
    if (patch.risk_score) c.risk_score = Math.max(c.risk_score, Number(patch.risk_score));
    await save(s);
  }
  await addAudit("CALL_ENDED", callId, "Call ended");
  return getCall(callId);
}

export async function addAudit(event_type, call_id, detail = "") {
  const row = { id: id("aud"), event_type, call_id, detail, created_at: new Date().toISOString() };
  if (usePg) {
    const p = await pg();
    await p.query("INSERT INTO Audit (id,event_type,call_id,detail) VALUES ($1,$2,$3,$4)", [row.id, event_type, call_id, detail]);
  } else {
    const s = await store();
    if (!s.data.Audit.some((a) => a.event_type === event_type && a.call_id === call_id && a.detail === detail && Date.now() - new Date(a.created_at) < 2000)) {
      s.data.Audit.push(row); await save(s);
    }
  }
  return row;
}

export async function listAudit(callId) {
  if (usePg) { const p = await pg(); return (await p.query("SELECT * FROM Audit WHERE call_id=$1 ORDER BY created_at ASC", [callId])).rows; }
  const { data } = await store();
  return data.Audit.filter((a) => a.call_id === callId).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

export async function createReport(callId) {
  const call = await getCall(callId);
  if (!call) return null;
  const report = {
    id: id("rep"), call_id: callId, title: `Complaint Draft — ${call.category} — ${new Date(call.started_at).toLocaleDateString("en-IN")}`,
    body: generateComplaint(call, call.entities), status: "Draft — Unsubmitted", created_at: new Date().toISOString(),
  };
  if (usePg) { const p = await pg(); await p.query("INSERT INTO reports (id,call_id,title,body,status) VALUES ($1,$2,$3,$4,$5)", [report.id, report.call_id, report.title, report.body, report.status]); }
  else { const s = await store(); s.data.reports.push(report); await save(s); }
  await addAudit("REPORT_GENERATED", callId, report.title);
  return report;
}

export async function listReports(q = "") {
  let reports;
  if (usePg) { const p = await pg(); reports = (await p.query("SELECT * FROM reports ORDER BY created_at DESC")).rows; }
  else { const { data } = await store(); reports = [...data.reports].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); }
  return reports.filter((r) => !q || (r.title + r.body).toLowerCase().includes(q.toLowerCase()));
}

export async function updateReportStatus(reportId, status) {
  if (!["Draft — Unsubmitted", "Reviewed"].includes(status)) return null;
  if (usePg) { const p = await pg(); await p.query("UPDATE reports SET status=$2 WHERE id=$1", [reportId, status]); return (await p.query("SELECT * FROM reports WHERE id=$1", [reportId])).rows[0] || null; }
  const s = await store(); const r = s.data.reports.find((x) => x.id === reportId); if (!r) return null; r.status = status; await save(s); return r;
}

export async function stats() {
  const calls = await listCalls();
  const entities = calls.flatMap((c) => c.entities.map((e) => ({ ...e, call_category: c.category })));
  const byCategory = {};
  for (const c of calls) byCategory[c.category] = (byCategory[c.category] || 0) + 1;
  return {
    totalCalls: calls.length,
    liveCalls: calls.filter((c) => c.status === "live").length,
    totalEngagementSec: calls.reduce((a, c) => a + (Number(c.duration_sec) || 0), 0),
    simulated: !usePg || calls.every((c) => c.source === "demo"),
    upiCount: entities.filter((e) => e.type === "UPI_ID").length,
    bankIndicators: entities.filter((e) => ["BANK_ACCOUNT", "IFSC"].includes(e.type)).length,
    totalEntities: entities.length,
    avgRisk: calls.length ? Math.round(calls.reduce((a, c) => a + (Number(c.risk_score) || 0), 0) / calls.length) : 0,
    byCategory,
    recentEntities: [...entities].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8),
    storage: usePg ? "PostgreSQL" : "Local demo store (set DATABASE_URL for PostgreSQL)",
  };
}
