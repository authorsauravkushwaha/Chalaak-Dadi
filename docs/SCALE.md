# Scale & Reliability — built for 1,000+ simultaneous users

This document explains exactly how Chalaak Dadi stays fast and error-free under
heavy concurrent load, what was measured, and what to change when India's
traffic grows another order of magnitude.

## 1. What was measured (proof, not promises)

`tests/load-test.mjs` simulates **1,000 simultaneous citizens**, each with
their own client IP, on realistic browsing behaviour: landing page → console →
8-second dashboard polling → searches → reports → live demo calls.

```
Concurrent users ............ 1000
Simulated requests .......... ~19,600 in 45 s (~390 req/s)
5xx errors .................. 0
Network errors .............. 0
429 shed .................... spike-phase only (rate limiter working)
Data-integrity failures ..... 0   (903 demo calls created under load, all verified)
Latency p50 / p95 ........... 3–4 ms / 0.7–0.9 s
```

Run it yourself against a production build:

```bash
npm run build && npm start        # terminal 1
npm run load-test                  # terminal 2
```

Environment knobs: `LOAD_USERS`, `LOAD_SECONDS`, `LOAD_INFLIGHT`, `BASE_URL`.

## 2. The four load-bearing decisions

### 2.1 The landing page is static — the story never touches the server twice
`/en`, `/hi`, `/pa` (and about) are **prerendered at build time** and served
from the CDN edge. 10 lakh people opening the site read the same cached HTML —
the origin never sees them. The WebGL scene loads lazily via
`requestIdleCallback` in a separate ~150 kB chunk, so it can never block first
paint, and it pauses rendering whenever the hero scrolls out of view.

### 2.2 Reads are cached and single-flighted (`lib/cache.js`)
The dashboard polls `/api/stats` and `/api/calls` every 8 s. Without
deduplication, 1,000 users' polls land as 1,000 identical queries per tick.
The cache collapses them: the first caller runs the loader, the other 999
await the same in-flight promise, and everyone after that within the TTL
(2–3 s) is served from memory. Staleness is imperceptible against the 8 s
polling cadence. Failed loads are never cached.

### 2.3 The database does the work (`lib/db.js`)
- `/api/calls` filters + paginates **in SQL** (`LIMIT/OFFSET`, max 500) and
  aggregates each call's entities with a single `json_agg` join — it never
  loads the whole table into JavaScript.
- `/api/stats` is five SQL aggregates (`COUNT/SUM/AVG/GROUP BY`), not a table
  scan.
- Search uses `LIKE` over trigram-indexed columns (`pg_trgm`).
- Indexes ship for every filter/sort column (`started_at DESC`, `status`,
  `category`, `entities.type`, `created_at`).
- The pool is tuned (`max 10` per instance, 8 s statement timeout, recycled
  clients) so one stuck query can never pile up connections.

### 2.4 Abuse is shed before it reaches the database (`lib/ratelimit.js`)
Per-IP token buckets with honest, generous limits (reads 40/min, stats
20/min, demo starts 8/min...). A normal dashboard user needs ~8 requests per
minute — an order of magnitude below the limits. Floods get `429` +
`Retry-After` instead of a slow database.

## 3. Honest scope & the Redis upgrade path

The cache and rate limiter live in **one server instance's memory**. On a
single deployment (VM, Docker, one Vercel region) that is a global guarantee.
On multi-instance serverless each instance enforces its own share — bursts are
still blunted, but quotas are per-instance. When you outgrow that:

1. Swap `lib/ratelimit.js`'s bucket for an Upstash/Redis `INCR`+`EXPIRE`
   (the module's interface — `rateLimit(req, name, opts)` — stays identical).
2. Swap `lib/cache.js` for Redis `GET/SET` with the same keys.
3. Set `DATABASE_URL` to a pooled Postgres (Neon pooler/Supabase PgBouncer)
   and raise `PGPOOL_MAX` if needed.

Nothing else in the codebase needs to change; every API route depends only on
the two modules' public functions.

## 4. Demo-store durability (no DATABASE_URL)

Without Postgres, records live in memory and mirror to `data/store.json`
(`/tmp` on Vercel) through a **coalesced, chunked, atomic writer**: a burst of
writes collapses into one disk flush (~40 ms), written element-by-element with
event-loop yields, then atomically renamed. The mirror keeps the newest 400
calls / 4,000 rows; in-memory data is never truncated. This is what allowed
the demo mode to survive the same 1,000-user test with zero errors.

## 5. Server checklist for a national launch

- [ ] `DATABASE_URL` set (pooled Postgres) — persistent, indexed, SQL-side pagination
- [ ] `INGEST_SECRET` set (long random) — ingestion API enabled
- [ ] Node process `ulimit -n ≥ 8192` (sockets + files)
- [ ] CDN in front (Vercel does this automatically; static routes are free)
- [ ] `/api/health` monitored — reports storage mode, never leaks secrets
- [ ] Optional: `PGPOOL_MAX` raised for dedicated database instances
