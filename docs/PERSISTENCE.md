# Persistence — why data resets on Vercel, and how to make it permanent

## The honest short version

| Setup | Where data lives | Survives redeploy / restart? |
|---|---|---|
| **No database configured (default demo)** | Temporary server memory + `/tmp` on Vercel (`data/store.json` on your own machine) | ❌ **No, not on Vercel.** When Vercel recycles a serverless instance, the store re-seeds to the **3 fictional seed cases**. Anything added during judging/demo can disappear. This is a platform limit, not an app bug — serverless filesystems are ephemeral by design. |
| **`DATABASE_URL` set (Neon PostgreSQL)** | Managed PostgreSQL | ✅ **Yes.** Calls, entities, Audit and reports are stored in real tables (`db/schema.sql`, auto-created on first use) and survive redeploys, restarts and scaling. |

Check which mode a deployment is in at any time — no login needed, and it never leaks secrets:

```
https://<your-app>.vercel.app/api/health
```

```json
{ "ok": true, "mode": "postgres", "persistent": true, "envVar": "DATABASE_URL", "calls": 3 }
```

`mode: "ephemeral"` + `persistent: false` means the database variable is **not** reaching the app (see troubleshooting below). The Dashboard also shows a storage banner with the same information.

## Make it permanent (free, ~5 minutes)

### Option A — Neon directly (recommended)

1. Go to [neon.tech](https://neon.tech) → sign up → **New Project** (pick a region near your users, e.g. Mumbai/Singapore).
2. Open the project → **Connect** → copy the full connection string (`postgresql://user:pass@host/db?sslmode=require`).
3. Go to **Vercel → your project → Settings → Environment Variables** → add:
   - Name: `DATABASE_URL`, Value: the Neon string. Apply to **Production** (and Preview if you want it there too).
4. **Redeploy** (Deployments → ⋯ → Redeploy). Environment variables only apply to new deployments.
5. Open `https://<your-app>.vercel.app/api/health` — it must say `"mode": "postgres"`, `"persistent": true`.
6. Start a demo call on `/live`, end it, then wait / redeploy — the record is still there. Done.

### Option B — Vercel's Neon integration

Vercel → project → **Storage / Marketplace → Neon → Connect**. This injects variables named `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, etc. instead of `DATABASE_URL`. **This app accepts all of them** (`DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `DATABASE_URL_UNPOOLED`, `NEON_DATABASE_URL`), so the integration works without renaming anything. Redeploy, then verify with `/api/health` (it tells you which variable name was picked up).

## Troubleshooting resets

| Symptom | Likely cause | Fix |
|---|---|---|
| `/api/health` says `ephemeral` after adding the variable | Variable added to the wrong environment (e.g. only Development), or no redeploy happened after adding it | Add it to **Production**, then redeploy |
| `/api/health` returns 503 with a database error | Wrong/expired connection string, or the Neon project is paused/deleted | Re-copy the string from Neon → Connect; check the project exists |
| Health says `postgres` but old demo data is gone | Expected once: switching backends starts from the seeded PostgreSQL tables; ephemeral data was never copied anywhere | Nothing to recover — re-run the demo; everything from now on persists |
| Locally, data resets between runs | `data/store.json` was deleted, or `STORE_PATH` points somewhere else | Check `data/store.json` exists; it is git-ignored by design |
| Judges see only 3 seed cases | Deployment has no database — perfectly fine for judging | Optionally follow Option A above before judging if you want their test records to persist |

## Notes for developers

- The PostgreSQL pool is cached on `globalThis` with a small pool size (`max: 3`) so serverless invocations don't exhaust Neon's connection limit, and a failed setup is **not** cached — the next request retries.
- Seed rows use deterministic IDs, so reseeding on any instance can never duplicate the 3 fictional cases.
- The local JSON store writes atomically (temp file + rename, directories created recursively) with serialised writes; a corrupt store file is preserved as `*.corrupt-<timestamp>` and re-seeded instead of crashing every request.
- An Appwrite/self-hosted alternative was evaluated and deliberately not made the default — see `docs/INTEGRATIONS.md`.
