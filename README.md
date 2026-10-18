# 👵 Chalaak Dadi — Scam Intelligence Console

**Team SK Nexora · Srijan Setu 2026**

An AI-powered scam-intelligence & financial-fraud-awareness prototype. A sweet, Hindi-speaking
"Dadi" (grandmother) voice persona keeps a suspected scam caller busy talking — while the console
quietly captures the UPI IDs, phone numbers and bank details the caller reveals, shows them on a
live intelligence dashboard, and prepares a **clearly-unsubmitted complaint draft** for human review.

> 🟠 **Demo honesty:** everything in this build is simulated with entirely fictional data.
> No real calls are made, no police are contacted, no accounts are frozen, nothing is filed.

---

## 1) How to preview & test (beginner steps)

You need [Node.js](https://nodejs.org) 18+ installed. Then, in this folder:

```bash
npm install     # one time — downloads the libraries
npm run build   # checks everything compiles
npm start       # starts the app
```

Open **http://localhost:3000** in your browser. (For editing while developing, use `npm run dev` instead of build/start.)

**Try clicking in this order:**
1. **Dashboard `/`** — see 3 pre-loaded fictional scam calls, stats, category chart, latest captured UPI IDs. Try the search box and filters; the page auto-refreshes every 8 seconds.
2. **Live Intelligence `/live`** — pick a scenario → **▶ Start Demo Call**. Watch the fake transcript stream in, the timer count, and red entity alerts appear. Press **⏹ End Demo**, then **Open Call & Draft Complaint**.
3. **Call Detail** — read the transcript, see *why* each entity was flagged, then **Generate & Save Draft → Copy / Download** the complaint draft.
4. **Reports `/reports`** — search your drafts, preview, download, mark **Reviewed**.
5. **About** — the full story, limitations and future plan (great for judges).

Run the automatic tests any time with: `npm test`

## 2) Important files, in simple English

| File / folder | What it does |
|---|---|
| `app/page.jsx` | The Dashboard (home page) |
| `app/live/page.jsx` | Live demo console — timer, streaming transcript, alerts |
| `app/calls/[id]/page.jsx` | One call's full detail + complaint draft |
| `app/reports/page.jsx` | Searchable list of complaint drafts |
| `app/about/page.jsx` | Problem, methodology, limitations, privacy |
| `app/api/...` | The server-side API (create calls, add entities, end calls, stats, reports, demo) — see `docs/API.md` |
| `lib/db.js` | Talks to the database. Uses **PostgreSQL** if `DATABASE_URL` (or `POSTGRES_URL` etc.) is set, otherwise a local demo file so the app always runs |
| `app/api/health` | One-click deployment check: reports whether storage is persistent PostgreSQL or ephemeral demo mode |
| `docs/PERSISTENCE.md` | Why data resets on Vercel without a database, and the 5-minute Neon fix with troubleshooting |
| `docs/INTEGRATIONS.md` | How the suggested reference projects (n8n, Appwrite, Pentagi, MiroFish) relate — includes an importable n8n workflow in `examples/n8n/` |
| `lib/intel.js` | The "brain rules": finds UPI IDs / accounts / amounts in text, scoring, complaint-draft writer, input validation |
| `lib/scenarios.js` | The 3 fictional story-scripts (Digital Arrest, Parcel/Customs, SIM-KYC) |
| `db/schema.sql` | The PostgreSQL database design (calls, entities, Audit, reports) |
| `tests/intel.test.js` | Automatic tests proving the extraction & draft logic works |

## 3) What works / what is incomplete

✅ **Works:** full navigation; database-backed calls/entities/Audit/reports; 3 seeded fictional cases;
live simulated demo that saves real database records (only the lines actually played are saved);
dashboard filters + debounced search + race-safe auto-refresh; storage banner + `/api/health` showing
persistent-vs-ephemeral mode; protected ingestion API with timing-safe secret check and idempotency;
malformed JSON returns 400 (never 500); complaint draft copy/download; official-portal link;
responsive premium UI; expanded tests (extraction edge cases + full create→report DB flow),
GitHub Actions CI, and production build all pass.

⚠️ **Deliberately incomplete (labelled in-app as "Demo Adapter"):** real telephony and a real Hindi AI voice
(no provider connected), ML-based extraction (currently honest rule-based patterns), and user login/roles.
These plug into the same API contracts later — see the About page's future plan.

## 4) Deploy (beginner-friendly, free tiers)

> 💾 **One honest note on persistence:** without a database, demo data on Vercel lives in
> **temporary server memory** and may reset to the 3 seed cases when Vercel recycles an
> instance — perfectly fine for judging. For permanent data, do step 3–4 below
> (full guide + troubleshooting: [`docs/PERSISTENCE.md`](docs/PERSISTENCE.md)).

1. Push this repo to GitHub (already done if you're reading this there).
2. Go to **vercel.com → New Project → Import** this repository. Framework auto-detects as **Next.js**. Click Deploy — the app already works at this point using the built-in (ephemeral) demo store.
3. **(Recommended) Add real PostgreSQL:** create a free database at **neon.tech**, copy its connection string. (Vercel's built-in Neon integration also works — the app accepts `DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `DATABASE_URL_UNPOOLED` or `NEON_DATABASE_URL`.)
4. In Vercel → Project → Settings → Environment Variables, add `DATABASE_URL` (from Neon) and `INGEST_SECRET` (a long random value, e.g. `openssl rand -hex 32`). Apply to **Production** and **Redeploy** — env vars only take effect on a new deployment. Tables are created automatically on first use.
5. **Verify:** open `https://<your-app>.vercel.app/api/health` — it must say `"mode":"postgres","persistent":true`. If it says `"ephemeral"`, the variable isn't reaching the app yet (wrong environment or missing redeploy — see `docs/PERSISTENCE.md`).
6. Open your `*.vercel.app` link and repeat the click-tour above.

## 5) Configure secrets safely

- Secrets live **only** in environment variables (`.env.local` locally, Vercel dashboard when deployed) — see `.env.example`. They are never in code, never in the browser, and `.env*` files are git-ignored. **Never paste them into GitHub.**
- `INGEST_SECRET`: required in the header `x-ingest-secret` for the live-ingestion API. If it is not set, too short, or still the example placeholder, ingestion safely stays **disabled** (the demo still works). The check uses a timing-safe comparison.
- Rotate any secret immediately if it is ever shared by mistake.

## 6) Hackathon judge test-checklist (3 minutes)

- [ ] Dashboard loads with 3 fictional calls; note the **DEMO / SIMULATED** labels
- [ ] Search "customs" / filter a category — list updates; wait 8s — auto-refresh adds **no duplicates**
- [ ] `/live` → Start Demo → alerts capture a UPI ID → End Demo → record appears on Dashboard
- [ ] Open the call → each entity explains *why* it was flagged → Generate draft → Copy & Download work
- [ ] Reports page → draft is marked **Unsubmitted** → mark Reviewed → Open Official Portal goes to cybercrime.gov.in
- [ ] API safety: `curl -X POST localhost:3000/api/calls -d '{}'` (no secret) is rejected; malformed JSON returns 400, not 500
- [ ] Storage honesty: `/api/health` and the Dashboard banner state whether data is persistent or ephemeral
- [ ] Resize to mobile width — layout still reads clearly

---
*Built with Next.js + PostgreSQL. Fictional data only. Extracted details are indicators (संकेत) requiring official verification — never proof of guilt. In a real fraud emergency: call **1930** or visit **cybercrime.gov.in**.*
