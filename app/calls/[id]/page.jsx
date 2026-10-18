"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, copyText, downloadText } from "../../../lib/client.js";
import { WHY_FLAGGED, formatDuration, generateComplaint, riskLevel } from "../../../lib/intel.js";

export default function CallDetail({ params }) {
  const { id } = use(params);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [report, setReport] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/api/calls/${id}`).then(setData).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <><div className="err">⚠️ {error}</div><Link className="btn ghost" href="/">← Back to Dashboard</Link></>;
  if (!data) return <div className="skeleton">Loading call…</div>;
  const { call, Audit } = data;
  const r = riskLevel(call.risk_score);
  const preview = report || generateComplaint(call, call.entities);

  async function makeReport() {
    setBusy(true); setMsg("");
    try {
      const { report: rep } = await api(`/api/calls/${id}/report`, { method: "POST" });
      setReport(rep.body);
      setMsg("✅ Complaint draft generated and saved under Reports. It is UNSUBMITTED — nothing has been sent to any authority.");
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  return (
    <>
      <Link href="/" className="small">← Dashboard</Link>
      <div className="spread" style={{ marginTop: 8 }}>
        <h1>📞 Call Detail</h1>
        <span>
          <span className={`pill ${call.status}`} style={{ marginRight: 8 }}>{call.status.toUpperCase()}</span>
          {call.source === "demo" && <span className="pill demo">DEMO / SIMULATED</span>}
        </span>
      </div>
      <p className="sub mono small">{call.id}</p>
      {msg && <div className="ok">{msg}</div>}

      <div className="grid g4" style={{ marginTop: 14 }}>
        <div className="card"><div className="statnum" style={{ fontSize: 22 }}>{call.category}</div><div className="statlbl">Scam category</div></div>
        <div className="card"><div className="statnum" style={{ color: r.color }}>{call.risk_score}/100</div><div className="statlbl">Risk score — {r.label}</div><div className="bar" style={{ marginTop: 8 }}><i style={{ width: `${call.risk_score}%`, background: r.color }} /></div></div>
        <div className="card"><div className="statnum">{formatDuration(call.duration_sec)}</div><div className="statlbl">Duration {call.source === "demo" && "(simulated)"}</div></div>
        <div className="card"><div className="statnum" style={{ fontSize: 20 }}>{new Date(call.started_at).toLocaleString("en-IN")}</div><div className="statlbl">Started · Caller: {call.caller || "Unknown"}</div></div>
      </div>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>📝 Summary</h2>
          <p>{call.summary || <span className="muted">No summary recorded for this call yet.</span>}</p>
          <h2 style={{ marginTop: 20 }}>💬 Transcript {call.source === "demo" && <span className="pill demo">SIMULATED</span>}</h2>
          {call.transcript ? call.transcript.split("\n").map((line, i) => (
            <div key={i} className={`bubble ${line.startsWith("Dadi") ? "dadi" : "caller"}`} style={{ marginBottom: 8 }}>{line}</div>
          )) : <p className="muted">No transcript stored.</p>}
        </div>

        <div>
          <div className="card">
            <h2>🚨 Extracted entities — why each was flagged</h2>
            {call.entities.length === 0 && <p className="muted">No indicators were extracted from this call.</p>}
            {call.entities.map((e) => (
              <div key={e.id} className="alertitem">
                <b>{e.type}</b> · <span className="mono">{e.value}</span> <span className="muted">({Math.round(e.confidence * 100)}% confidence)</span>
                <br /><span className="small">{WHY_FLAGGED[e.type] || "Flagged by the extraction rules."}</span>
                {e.evidence && <><br /><span className="small muted">Evidence: “{e.evidence}”</span></>}
              </div>
            ))}
            <p className="small muted">⚖️ These are <b>indicators / आरोप</b> for verification — not proof that any person committed a crime.</p>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h2>🕐 Audit timeline</h2>
            {Audit.length === 0 ? <p className="muted small">No Audit recorded.</p> : (
              <ul className="timeline">{Audit.map((a) => <li key={a.id}><b>{new Date(a.created_at).toLocaleString("en-IN")}</b> — {a.event_type} {a.detail && <span>· {a.detail}</span>}</li>)}</ul>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="spread"><h2 style={{ margin: 0 }}>📄 Complaint draft preview</h2><span className="pill demo">UNSUBMITTED DRAFT</span></div>
        <p className="small muted">Generated only from evidence recorded above. This system has <b>not</b> contacted police, frozen any account, verified criminal activity, or filed anything.</p>
        <pre className="report">{preview}</pre>
        <div className="rowflex">
          <button className="btn" onClick={makeReport} disabled={busy}>{busy ? "Generating…" : "⚙️ Generate & Save Draft"}</button>
          <button className="btn ghost" onClick={() => copyText(preview, setMsg)}>📋 Copy Report</button>
          <button className="btn ghost" onClick={() => downloadText(`Chalaak-Dadi-complaint-${call.id}.txt`, preview)}>⬇️ Download Report (.txt)</button>
          <a className="btn green" href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">🌐 Open Official Portal (cybercrime.gov.in)</a>
        </div>
      </div>
    </>
  );
}
