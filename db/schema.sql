-- Chalaak Dadi — PostgreSQL schema (used automatically when DATABASE_URL is set)
CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Other / Unknown',
  risk_score INTEGER NOT NULL DEFAULT 0,
  transcript TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'live',           -- live | ended
  source TEXT NOT NULL DEFAULT 'demo',           -- demo | live
  caller TEXT NOT NULL DEFAULT '',
  client_event_id TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.8,
  evidence TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (call_id, type, value)
);
CREATE TABLE IF NOT EXISTS Audit (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  call_id TEXT,
  detail TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft — Unsubmitted',  -- Draft — Unsubmitted | Reviewed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_entities_call ON entities(call_id);
CREATE INDEX IF NOT EXISTS idx_audit_call ON Audit(call_id);
