# API Reference (all bodies are JSON; errors return {"error": "..."})

| Method & path | Auth | Purpose |
|---|---|---|
| GET /api/health | – | Liveness + storage mode (`postgres` persistent / `ephemeral` demo), call count. Never leaks secrets — safe to open in a browser to verify a deployment |
| GET /api/stats | – | Totals, category chart data, latest entities, and storage fields (`storageMode`, `persistent`, `storageDetail`) |
| GET /api/calls?q=&category=&status= | – | List calls (with entities) |
| GET /api/calls/:id | – | One call + audit timeline |
| POST /api/calls | x-ingest-secret | Create live call. Body: {category, risk_score, transcript, summary, caller, client_event_id} — duplicate client_event_id is ignored |
| POST /api/calls/:id/entities | x-ingest-secret | Add entity {type, value, confidence, evidence} — duplicates ignored |
| POST /api/calls/:id/end | x-ingest-secret | End call {duration_sec?, transcript?, summary?, category?, risk_score?} — re-ending is idempotent |
| POST /api/calls/:id/report | – | Generate + save unsubmitted complaint draft |
| GET /api/reports?q= · PATCH /api/reports {id,status} | – | Search reports · mark Reviewed / Draft — Unsubmitted |
| POST /api/demo/start {scenarioId} | demo-only | Start simulated call, returns script. Unknown scenarioId → 400 |
| POST /api/demo/:id/entity · /end | demo-only | Only works on source="demo" calls; entity on an ended call → 409 |

## Status codes

- `200` success (including idempotent duplicates, flagged with `"duplicate": true`)
- `201` created
- `400` invalid JSON body, unknown scenario, or failed field validation (message explains which field)
- `401` missing/wrong `x-ingest-secret` · `403` demo endpoint used on a non-demo call
- `404` call/report not found · `409` entity added to an already-ended demo call
- `503` ingestion disabled (`INGEST_SECRET` unset/placeholder), or `/api/health` reporting a database error

Malformed JSON is always a `400`, never a `500`.

Example:
```bash
curl -X POST localhost:3000/api/calls -H "x-ingest-secret: $INGEST_SECRET" -H "Content-Type: application/json" -d '{"category":"Digital Arrest","risk_score":80,"caller":"+91 90000 00000 (fictional)"}'
```

Verify a deployment's storage in one click:
```bash
curl https://<your-app>.vercel.app/api/health
# {"ok":true,"mode":"postgres","persistent":true,...}  -> data is permanent
# {"ok":true,"mode":"ephemeral","persistent":false,...} -> demo data may reset (see docs/PERSISTENCE.md)
```

An n8n workflow that drives this API from a webhook is included at
`examples/n8n/Chalaak-Dadi-ingest.workflow.json` (see `docs/INTEGRATIONS.md`).
