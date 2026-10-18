# 👵 Chalaak Dadi — चतुर दादੀ — ਚਤੁਰ ਦਾਦੀ
### Scam Intelligence Console · The nation's shield against cyber fraud

**Team SK Nexora · Srijan Setu 2026**

A **scroll-driven 3D website** in **three languages** — English (main), हिन्दी and ਪੰਜਾਬੀ —
that opens up the scam playbook hitting every Indian family, and carries a full
database-backed intelligence console beneath it. A sweet, Hindi-speaking "Dadi"
(grandmother) persona keeps a suspected scam caller busy talking, while the console
captures the UPI IDs, phone numbers and bank details he reveals, and prepares a
**clearly-unsubmitted complaint draft** for human review.

> 🟠 **Demo honesty:** every value in this build is simulated with entirely fictional data.
> No real calls are made, no police are contacted, no accounts are frozen, nothing is filed.

---

## 1) The experience

| Layer | What you get |
|---|---|
| **Language gate** | First-visit welcome in all three languages; choice remembered (cookie + localStorage), middleware then serves `/{lang}/…` routes automatically |
| **Rolling 3D hero** | Three.js scene — drifting glass shards, particle field, glowing shield core — with pointer parallax and scroll-linked motion; lazily loaded, pauses off-screen, static under reduced-motion |
| **Scrollytelling** | Sticky 4-step "how Dadi fights back" section driven by scroll progress; animated stat counters; 3D-tilt scam cards; emergency 1930 band |
| **The console** | `/[lang]/console` dashboard, `/[lang]/live` scripted simulation, `/[lang]/calls/:id` evidence review + complaint drafts, `/[lang]/reports`, `/[lang]/about` — all fully translated |

Official 2024 numbers shown on the landing page (Ministry of Home Affairs, Lok Sabha):
**₹22,845.73 crore** lost to cyber fraud (+206% YoY), **36.37 lakh** fraud incidents,
**22.68 lakh** NCRP complaints, **₹1,935.5 crore** digital-arrest losses.

## 2) Built for 1,000 simultaneous users — measured, not promised

`npm run load-test` spawns **1,000 simulated citizens** (distinct IPs, real browsing
cadence, dashboard polling, live demo calls) against a production build. Result on a
2-core sandbox:

```
5xx errors .................. 0        Network errors ..... 0
Data-integrity failures ..... 0        Throughput ......... ~390 req/s
Latency p50 / p95 ........... 3–4 ms / 0.7–0.9 s
```

How it holds: **static prerendered landing pages** (CDN-served, origin untouched),
**single-flight TTL caching** for hot reads, **SQL-side filtering/pagination/aggregation**
with full indexing, **per-IP token-bucket rate limiting**, and a **coalesced atomic
demo-store writer**. Full architecture + the Redis upgrade path:
**[docs/SCALE.md](docs/SCALE.md)**.

## 3) How to preview & test (beginner steps)

You need [Node.js](https://nodejs.org) 18+. Then, in this folder:

```bash
npm install      # one time
npm run build    # production build
npm start        # serve on http://localhost:3000
```

Open **http://localhost:3000** — you'll be greeted by the language gate, then the 3D
scroll story. Scroll to the bottom (or use the nav) to enter the console:

1. **Dashboard `/en/console`** (or `/hi`, `/pa`) — saved records, live stats, filters,
   debounced search, 8-second auto-refresh.
2. **Live `/en/live`** — pick a fictional scenario → ▶ Start Demo Call → watch the
   transcript stream and indicator alerts save to a real database record.
3. **Call detail** — see *why* each value was flagged → Generate & Save Draft → Copy/Download.
4. **Reports** — search drafts, preview, mark Reviewed. Never auto-submitted.
5. **Load proof** — `npm run load-test` (needs `npm start` running in another terminal).

Run the automatic tests any time with `npm test`.

## 4) Important files

| File / folder | What it does |
|---|---|
| `app/[lang]/page.jsx` | The scroll-driven 3D landing story (per-language, prerendered) |
| `app/components/three/Scene3D.jsx` | WebGL scene (shards, particles, shield core) |
| `app/components/scroll/*` | Reveal-on-scroll, CountUp, TiltCard, sticky scrollytelling, language gate |
| `lib/i18n.js` | Full trilingual dictionary + `t(lang, key)` with English fallback |
| `middleware.js` | Language negotiation: cookie → Accept-Language → `/en` |
| `lib/cache.js` | Single-flight TTL cache for hot reads |
| `lib/ratelimit.js` | Per-IP token-bucket rate limiters |
| `lib/db.js` | PostgreSQL (indexed, paginated, aggregated) or coalescing JSON demo store |
| `lib/intel.js` | Extraction rules, validation, complaint-draft writer |
| `lib/scenarios.js` | The 3 fictional scripts (Digital Arrest, Parcel/Customs, SIM-KYC) |
| `tests/load-test.mjs` | The 1,000-user concurrency proof |
| `tests/db.test.js`, `tests/intel.test.js`, `tests/scale.test.js` | Unit tests (store, extraction, cache & limiter) |
| `docs/SCALE.md` | The full scaling architecture |
| `docs/API.md`, `docs/PERSISTENCE.md`, `docs/INTEGRATIONS.md` | API contract, Neon setup, n8n/Appwrite notes |

## 5) Deploy (beginner-friendly, free tiers)

1. Push to GitHub → **vercel.com → New Project → Import**. It auto-detects Next.js.
2. Add a free PostgreSQL at **neon.tech** and set `DATABASE_URL` in Vercel env vars
   (also accepted: `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `NEON_DATABASE_URL`, …).
   Tables and indexes are created automatically on first use.
3. Set `INGEST_SECRET` (e.g. `openssl rand -hex 32`) to enable the ingestion API.
4. Verify `https://<your-app>.vercel.app/api/health` → `"mode":"postgres","persistent":true`.
5. Open the site in all three languages. Done.

Secrets live only in environment variables — never in code, never in chat. See `.env.example`.

## 6) Three-minute judge checklist

- [ ] Language gate → switch हिन्दी / ਪੰਜਾਬੀ / English — every page follows
- [ ] Scroll the landing: 3D hero reacts, stats count up, cards tilt, 4 steps pin & morph
- [ ] Emergency band calls **1930** (real helpline) — clearly separated from the demo
- [ ] `/en/console` → search "customs", filter a category, wait 8 s — no duplicates
- [ ] `/en/live` → Start Demo → alerts save → End → record on dashboard
- [ ] Call page → draft → Copy/Download → Reports → mark Reviewed
- [ ] `curl -X POST localhost:3000/api/calls -d '{}'` (no secret) → rejected; malformed JSON → 400, never 500
- [ ] `npm run load-test` → 0 errors, 0 lost writes

---
*Built with Next.js + Three.js + PostgreSQL. Fictional data only. Extracted details are
indicators (संकेत) requiring official verification — never proof of guilt.
In a real fraud emergency: call **1930** or visit **cybercrime.gov.in**.*
