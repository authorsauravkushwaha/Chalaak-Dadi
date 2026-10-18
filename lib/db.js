// Database layer.
//
// Storage backends, in priority order:
//   1. PostgreSQL — used when a connection string is present in any of the
//      env var names below (Neon direct + Vercel/Neon integrations use
//      different names, so we accept all of them). Tables auto-create.
//      THIS is the only persistent backend on Vercel.
//   2. Demo store — a JSON file locally (data/store.json, override with
//      STORE_PATH) or /tmp + process memory on Vercel. On Vercel this is
//      EPHEMERAL by platform design: serverless instances are recycled, so
//      records can reset to the 3 seed cases. That is expected without a
//      database — set a DATABASE_URL (see docs/PERSISTENCE.md) for
//      permanent data. /api/health and /api/stats report which mode is live
//      so this is never a silent surprise.
//
// Secrets stay server-side: this file is never imported by browser code.
import { SCENARIOS } from "./scenarios.js";
import { extractEntities, generateComplaint } from "./intel.js";

export const DB_ENV_NAMES = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL_UNPOOLED",
  "NEON_DATABASE_URL",
];

export function resolveDatabaseUrl(env = process.env) {
  for (const name of DB_ENV_NAMES) {
    const value = env[name]?.trim();
    if (value) return { name, url: value };
  }
  return null;
}

const dbConfig = resolveDatabaseUrl();
const usePg = !!dbConfig;
const id = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export function storageInfo() {
  if (usePg)
    return {
      mode: "postgres",
      persistent: true,
      envVar: dbConfig.name,
      storage: "PostgreSQL (persistent)",
      detail: `Persistent PostgreSQL connected via ${dbConfig.name}. Data survives redeploys and restarts.`,
    };
  const onVercel = !!process.env.VERCEL;
  return {
    mode: "ephemeral",
    persistent: false,
    envVar: null,
    storage: onVercel ? "Ephemeral demo store (add DATABASE_URL for persistent PostgreSQL)" : "Local demo store (set DATABASE_URL for PostgreSQL)",
    detail: onVercel
      ? "No database configured: data lives in temporary server memory / /tmp on Vercel and may reset to the 3 seed cases when instances recycle. Add a free Neon database and set DATABASE_URL (README §4 / docs/PERSISTENCE.md) for permanent data."
      : "No database configured: data is kept in a local JSON file (data/store.json). Set DATABASE_URL for PostgreSQL.",
  };
}

/* ---------------- PostgreSQL backend ---------------- */
// The pool is cached on globalThis: in dev / serverless hot paths a module
// can be re-evaluated, and creating a fresh pool per evaluation leaks Neon
// connections until the database refuses new ones.
async function pg() {
  if (globalThis.__ChalaakDadiPoolReady) return globalThis.__ChalaakDadiPoolReady;
  const ready = (async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: dbConfig.url,
      ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on("error", (err) => console.error("[db] idle pool client error:", err.message));
    globalThis.__ChalaakDadiPool = pool;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calls (id TEXT PRIMARY KEY, started_at TIMESTAMPTZ NOT NULL DEFAULT now(), ended_at TIMESTAMPTZ, duration_sec INTEGER NOT NULL DEFAULT 0, category TEXT NOT NULL DEFAULT 'Other / Unknown', risk_score INTEGER NOT NULL DEFAULT 0, transcript TEXT NOT NULL DEFAULT '', summary TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'live', source TEXT NOT NULL DEFAULT 'demo', caller TEXT NOT NULL DEFAULT '', client_event_id TEXT UNIQUE);
      CREATE TABLE IF NOT EXISTS entities (id TEXT PRIMARY KEY, call_id TEXT NOT NULL REFERENCES calls(id) ON DELETE CASCADE, type TEXT NOT NULL, value TEXT NOT NULL, confidence REAL NOT NULL DEFAULT 0.8, evidence TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (call_id, type, value));
      CREATE TABLE IF NOT EXISTS Audit (id TEXT PRIMARY KEY, event_type TEXT NOT NULL, call_id TEXT, detail TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, call_id TEXT NOT NULL REFERENCES calls(id) ON DELETE CASCADE, title TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Draft — Unsubmitted', created_at TIMESTAMPTZ NOT NULL DEFAULT now());
      CREATE INDEX IF NOT EXISTS idx_entities_call ON entities(call_id);
      CREATE INDEX IF NOT EXISTS idx_audit_call ON Audit(call_id);
      CREATE INDEX IF NOT EXISTS idx_reports_call ON reports(call_id);`);
    await seedPgIfEmpty(pool);
    return pool;
  })();
  // If setup fails (DB briefly unreachable, wrong URL) do not cache the
  // rejection forever — the next request must be able to retry.
  ready.catch(() => {
    if (globalThis.__ChalaakDadiPoolReady === ready) delete globalThis.__ChalaakDadiPoolReady;
    globalThis.__ChalaakDadiPool?.end?.().catch(() => {});
    delete globalThis.__ChalaakDadiPool;
  });
  globalThis.__ChalaakDadiPoolReady = ready;
  return ready;
}

async function seedPgIfEmpty(pool) {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM calls");
  if (rows[0].c > 0) return;
  for (const s of seededCalls()) {
    await pool.query(
      "INSERT INTO calls (id,started_at,ended_at,duration_sec,category,risk_score,transcript,summary,status,source,caller) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ended','demo',$9) ON CONFLICT (id) DO NOTHING",
      [s.id, s.started_at, s.ended_at, s.duration_sec, s.category, s.risk_score, s.transcript, s.summary, s.caller]
    );
    for (const e of s.entities)
      await pool.query("INSERT INTO entities (id,call_id,type,value,confidence,evidence) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING", [e.id, s.id, e.type, e.value, e.confidence, e.evidence]);
    await pool.query("INSERT INTO Audit (id,event_type,call_id,detail) VALUES ($1,'CALL_SEEDED',$2,'Fictional demo record seeded') ON CONFLICT (id) DO NOTHING", [`aud_seed_${slug(s.id)}`, s.id]);
  }
}

/* ---------------- JSON / in-memory demo backend ---------------- */
// State is cached on globalThis (survives module re-evaluation in one
// instance) and writes are serialised + atomic (tmp file then rename,
// directories created recursively) so concurrent requests cannot corrupt
// or half-write the store. If the file is unreadable/corrupt we preserve a
// .corrupt copy best-effort and re-seed instead of crashing every request.
function storeFile() {
  if (process.env.STORE_PATH) return process.env.STORE_PATH;
  return process.env.VERCEL ? "/tmp/Chalaak-Dadi-store.json" : `${process.cwd()}/data/store.json`;
}

function emptySeededData() {
  const data = { calls: [], entities: [], Audit: [], reports: [] };
  for (const s of seededCalls()) {
    const { entities, ...call } = s;
    data.calls.push(call);
    data.entities.push(...entities);
    data.Audit.push({ id: `aud_seed_${slug(s.id)}`, event_type: "CALL_SEEDED", call_id: s.id, detail: "Fictional demo record seeded", created_at: s.started_at });
  }
  return data;
}

function validShape(d) {
  return !!d && ["calls", "entities", "Audit", "reports"].every((k) => Array.isArray(d[k]));
}

async function store() {
  // Cache the initialisation *promise* so concurrent first requests share
  // one load/seed instead of racing two stores into existence.
  if (globalThis.__ChalaakDadiStoreReady) return globalThis.__ChalaakDadiStoreReady;
  const ready = (async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const file = storeFile();
    let data = null;
    try {
      const parsed = JSON.parse(await fs.readFile(file, "utf8"));
      if (validShape(parsed)) data = parsed;
      else throw new Error("store file has unexpected shape");
    } catch (err) {
      if (err.code !== "ENOENT") {
        try { await fs.copyFile(file, `${file}.corrupt-${Date.now()}`); } catch { /* read-only host: in-memory recovery below still works */ }
        console.error("[db] demo store unreadable, re-seeding:", err.message);
      }
      data = emptySeededData();
    }
    const state = { fs, path, file, data, writeQueue: Promise.resolve() };
    globalThis.__ChalaakDadiStore = state;
    await save(state).catch(() => {});
    return state;
  })();
  ready.catch(() => { if (globalThis.__ChalaakDadiStoreReady === ready) delete globalThis.__ChalaakDadiStoreReady; });
  globalThis.__ChalaakDadiStoreReady = ready;
  return ready;
}

function save(state) {
  // Serialise writes; every caller awaits the queue tail. The in-memory copy
  // is already updated, so a failed disk write (read-only host) never fails
  // the request — data simply lives for this instance's lifetime.
  state.writeQueue = state.writeQueue.then(async () => {
    const tmp = `${state.file}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await state.fs.mkdir(state.path.dirname(state.file), { recursive: true });
      await state.fs.writeFile(tmp, JSON.stringify(state.data, null, 1));
      await state.fs.rename(tmp, state.file);
    } catch {
      try { await state.fs.unlink(tmp); } catch { /* nothing to clean */ }
    }
  });
  return state.writeQueue;
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
      // Deterministic ids: reseeding (cold start / new instance) can never
      // duplicate seed rows in either backend.
      entities: [...seen.values()].map((e) => ({ id: `ent_seed_${slug(s.id)}_${slug(e.type)}_${slug(e.value)}`, call_id: `call_demo_${s.id}`, ...e, created_at: start.toISOString() })),
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
    transcript: typeof input.transcript === "string" ? input.transcript : "", summary: typeof input.summary === "string" ? input.summary : "", status: "live",
    source: input.source || "live", caller: typeof input.caller === "string" ? input.caller : "", client_event_id: input.client_event_id || null,
  };
  if (usePg) {
    const p = await pg();
    if (call.client_event_id) {
      const dup = await p.query("SELECT * FROM calls WHERE client_event_id=$1", [call.client_event_id]);
      if (dup.rows[0]) return { call: dup.rows[0], duplicate: true };
    }
    await p.query("INSERT INTO calls (id,started_at,category,risk_score,transcript,summary,status,source,caller,client_event_id) VALUES ($1,$2,$3,$4,$5,$6,'live',$7,$8,$9)",
      [call.id, call.started_at, call.category, call.risk_score, call.transcript, call.summary, call.source, call.caller, call.client_event_id]);
  } else {
    const s = await store();
    if (call.client_event_id) {
      const dup = s.data.calls.find((c) => c.client_event_id === call.client_event_id);
      if (dup) return { call: dup, duplicate: true };
    }
    s.data.calls.push(call);
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
    entity.id = r.rows[0].id; entity.created_at = r.rows[0].created_at;
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
  const current = await getCall(callId);
  if (!current) return null;
  const alreadyEnded = current.status === "ended";
  const ended = current.ended_at && alreadyEnded ? current.ended_at : new Date().toISOString();
  // Idempotent re-end: keep the original duration unless a new explicit
  // duration is supplied (previously every re-end silently grew it).
  const duration = patch.duration_sec != null && Number.isFinite(Number(patch.duration_sec))
    ? Math.round(Number(patch.duration_sec))
    : alreadyEnded ? Number(current.duration_sec) || 0 : Math.max(0, Math.round((Date.now() - new Date(current.started_at)) / 1000));
  if (usePg) {
    const p = await pg();
    await p.query("UPDATE calls SET status='ended', ended_at=$2, duration_sec=$3, transcript=COALESCE(NULLIF($4,''),transcript), summary=COALESCE(NULLIF($5,''),summary), category=COALESCE(NULLIF($6,''),category), risk_score=GREATEST(risk_score,$7) WHERE id=$1",
      [callId, ended, duration, patch.transcript || "", patch.summary || "", patch.category || "", Number(patch.risk_score) || 0]);
  } else {
    const s = await store();
    const c = s.data.calls.find((x) => x.id === callId);
    if (!c) return null;
    c.status = "ended"; c.ended_at = ended; c.duration_sec = duration;
    if (patch.transcript) c.transcript = patch.transcript;
    if (patch.summary) c.summary = patch.summary;
    if (patch.category) c.category = patch.category;
    if (patch.risk_score) c.risk_score = Math.max(Number(c.risk_score) || 0, Number(patch.risk_score));
    await save(s);
  }
  if (!alreadyEnded) await addAudit("CALL_ENDED", callId, "Call ended");
  return getCall(callId);
}

export async function addAudit(event_type, call_id, detail = "") {
  const row = { id: id("aud"), event_type, call_id, detail, created_at: new Date().toISOString() };
  if (usePg) {
    const p = await pg();
    await p.query("INSERT INTO Audit (id,event_type,call_id,detail) VALUES ($1,$2,$3,$4)", [row.id, event_type, call_id, detail]);
  } else {
    const s = await store();
    s.data.Audit.push(row);
    await save(s);
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
  if (usePg) { const p = await pg(); const r = await p.query("UPDATE reports SET status=$2 WHERE id=$1 RETURNING *", [reportId, status]); return r.rows[0] || null; }
  const s = await store(); const r = s.data.reports.find((x) => x.id === reportId); if (!r) return null; r.status = status; await save(s); return r;
}

export async function stats() {
  const calls = await listCalls();
  const info = storageInfo();
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
    storage: info.storage,
    storageMode: info.mode,
    persistent: info.persistent,
    storageDetail: info.detail,
  };
}

/** Liveness + storage check for /api/health. Never leaks connection strings. */
export async function health() {
  const info = storageInfo();
  const checkedAt = new Date().toISOString();
  try {
    if (usePg) {
      const p = await pg();
      await p.query("SELECT 1");
      const { rows } = await p.query("SELECT COUNT(*)::int AS c FROM calls");
      return { ok: true, status: "ok", checkedAt, ...info, calls: rows[0].c };
    }
    const { data } = await store();
    return { ok: true, status: "ok", checkedAt, ...info, calls: data.calls.length };
  } catch (err) {
    const message = String(err?.message || err).replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]");
    return { ok: false, status: "error", checkedAt, ...info, error: message };
  }
}
