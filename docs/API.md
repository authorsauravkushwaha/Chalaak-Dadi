# API Reference (all bodies are JSON; errors return {"error": "..."})

| Method & path | Auth | Purpose |
|---|---|---|
| GET /api/stats | – | Totals, category chart data, latest entities |
| GET /api/calls?q=&category=&status= | – | List calls (with entities) |
| GET /api/calls/:id | – | One call + audit timeline |
| POST /api/calls | x-ingest-secret | Create live call. Body: {category, risk_score, transcript, summary, caller, client_event_id} — duplicate client_event_id is ignored |
| POST /api/calls/:id/entities | x-ingest-secret | Add entity {type, value, confidence, evidence} — duplicates ignored |
| POST /api/calls/:id/end | x-ingest-secret | End call {duration_sec?, transcript?, summary?, category?, risk_score?} |
| POST /api/calls/:id/report | – | Generate + save unsubmitted complaint draft |
| GET /api/reports?q= · PATCH /api/reports {id,status} | – | Search reports · mark Reviewed / Draft — Unsubmitted |
| POST /api/demo/start {scenarioId} | demo-only | Start simulated call, returns script |
| POST /api/demo/:id/entity · /end | demo-only | Only works on source="demo" calls |

Example:
curl -X POST localhost:3000/api/calls -H "x-ingest-secret: $INGEST_SECRET" -H "Content-Type: application/json" -d '{"category":"Digital Arrest","risk_score":80,"caller":"+91 90000 00000 (fictional)"}'
