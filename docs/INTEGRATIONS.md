# Integrations & ideas borrowed from reference projects

The four repositories suggested as references were reviewed. **No code was
copied from any of them** — their licences range from Sustainable Use
(n8n) and BSD-3 (Appwrite) to MIT (Pentagi) and AGPL-3.0 (MiroFish), and
wholesale reuse would be inappropriate (AGPL especially) and impractical
(each is a large system of its own). Instead, this project interoperates
with / takes architectural inspiration from them in the ways below, all
implemented clean-room against this app's own API contracts.

## 1. n8n — workflow automation around the ingestion API
**What n8n is:** a workflow-automation platform (webhooks, schedules,
HTTP nodes, 400+ integrations).

**How it helps here, today:** this app already exposes a protected,
idempotent ingestion API (`POST /api/calls`, `/entities`, `/end` with an
`x-ingest-secret` header), which is exactly the surface a workflow tool
needs. An importable example workflow is included at
`examples/n8n/Chalaak-Dadi-ingest.workflow.json`:

- **Webhook trigger** → receives an event from a telephony/STT provider
  (or a manual "simulate call" form),
- **HTTP Request node** → creates the call in Chalaak Dadi with the secret header,
- a sample payload showing the `client_event_id` idempotency key so
  retried webhook deliveries never create duplicate records.

Import it via n8n → Workflows → Import from File, set the
`CHALAAK_DADI_URL` / secret values in the HTTP node, and activate.
Typical uses: forward new-call events to Slack/e-mail/Sheets, escalate
high-risk calls, or run scheduled digest reports — without changing this
codebase. (Run n8n under its own Sustainable Use licence terms.)

## 2. Appwrite — backend-as-a-service (evaluated, not default)
**What Appwrite is:** a self-hostable BaaS (database, auth, storage,
functions).

**Evaluation:** Appwrite could replace the persistence layer
(calls/entities/Audit/reports map naturally onto Appwrite collections, and
its auth would cover the planned analyst login). It was **not** made the
default because it adds a second always-on service to deploy, secure and
back up, whereas the current design needs only one env var
(`DATABASE_URL`) on top of Vercel + Neon — far fewer moving parts for a
hackathon deployment and for judges to reproduce. If the project later
needs auth + file storage for call recordings, Appwrite (or Supabase)
becomes the natural next step; the storage layer is isolated in
`lib/db.js` behind a small function surface precisely so a backend swap
touches one file.

## 3. Pentagi — multi-agent orchestration (architecture inspiration)
**What Pentagi is:** an autonomous multi-agent system (planner /
executor / adviser agents with tool use and a task graph).

**What we take from it:** the *pattern*, not the pentesting domain.
Chalaak Dadi's future voice pipeline maps onto the same separation:

- **Engager agent** — the Dadi persona (keeps the caller talking),
- **Extractor agent** — turns transcript turns into indicators,
- **Reviewer agent** — checks evidence quality before a human sees it,
- a human analyst as the final approver (this prototype never acts
  autonomously on an indicator).

Autonomous offensive tooling is explicitly **out of scope** for this
project; the agents above only ever process consented/demo
conversations and prepare drafts for human review.

## 4. MiroFish — swarm simulation for scenario testing (inspiration)
**What MiroFish is:** a multi-agent "swarm intelligence" simulation
engine for rehearsing scenarios with many simulated personas (AGPL-3.0 —
hence inspiration only, no code reuse).

**What we take from it:** the idea of *rehearsing with simulated
personas before facing reality*. Concretely, this app's scenario system
(`lib/scenarios.js` — scripted fictional scammer personas played against
the Dadi persona) is the seed of that: future work can generate many
persona variants (different scam scripts, languages, pressure tactics)
to measure how long the Dadi persona engages them and how reliably
indicators are extracted, entirely on fictional data, before any real
telephony is connected.

## Summary

| Reference | Relationship to this project | Code copied? |
|---|---|---|
| n8n | Interop: drives the ingestion API via webhook/HTTP workflow (example included) | No |
| Appwrite | Evaluated as an alternative backend; documented migration path | No |
| Pentagi | Multi-agent separation-of-duties pattern for the future pipeline | No |
| MiroFish | Simulated-persona rehearsal idea behind the scenario system | No |
