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
    api(`/api/calls/${id}`).then(setData).catch((loadError) => setError(loadError.message));
  }, [id]);

  if (!data && error) return <div className="page-stack"><div className="notice notice-error" role="alert">{error}</div><Link className="btn btn-outline" href="/">Back to dashboard</Link></div>;
  if (!data) return <div className="skeleton">Loading call record…</div>;

  const { call, Audit } = data;
  const risk = riskLevel(call.risk_score);
  const preview = report || generateComplaint(call, call.entities);
  const isDemo = call.source === "demo";

  async function makeReport() {
    setBusy(true);
    setMsg("");
    try {
      const { report: savedReport } = await api(`/api/calls/${id}/report`, { method: "POST" });
      setReport(savedReport.body);
      setMsg("Complaint draft generated and saved under Reports. It is unsubmitted; nothing was sent to an authority.");
      setError("");
    } catch (reportError) {
      setError(reportError.message);
    }
    setBusy(false);
  }

  return (
    <div className="page-stack call-detail-page">
      <div className="detail-topline">
        <Link href="/" className="text-link">← Dashboard</Link>
        <div className="detail-statuses">
          <span className={`pill ${call.status === "live" ? "in-progress" : "ended"}`}>{call.status === "live" ? "IN PROGRESS" : "ENDED"}</span>
          {isDemo && <span className="pill demo">SIMULATED RECORD</span>}
        </div>
      </div>

      <section className="page-heading">
        <div><p className="eyebrow">Call record review</p><h1>{call.category}</h1><p className="detail-meta mono">{call.id}</p></div>
      </section>

      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {msg && <div className="notice notice-success" role="status">{msg}</div>}

      <div className="grid g4 detail-stats">
        <article className="card"><div className="statnum detail-category">{call.category}</div><div className="statlbl">Recorded category</div></article>
        <article className="card">
          <div className="statnum" style={{ color: risk.color }}>{call.risk_score}<span className="risk-denominator">/100</span></div>
          <div className="statlbl">Stored risk · {risk.label}</div>
          <div className="bar risk-bar"><i style={{ width: `${call.risk_score}%`, background: risk.color }} /></div>
        </article>
        <article className="card"><div className="statnum">{formatDuration(call.duration_sec)}</div><div className="statlbl">{isDemo ? "Simulated duration" : "Recorded duration"}</div></article>
        <article className="card"><div className="statnum detail-date">{new Date(call.started_at).toLocaleString("en-IN")}</div><div className="statlbl">Started · {call.caller || "Unknown caller"}</div></article>
      </div>
      <p className="risk-footnote">{isDemo ? "Demo risk scores are illustrative scenario values, not validated assessments. A partial script may carry the full scenario score." : "A stored score is not an independently verified assessment."}</p>

      <section className="grid g2 detail-content-grid">
        <article className="card detail-transcript-card">
          <div className="card-heading-row"><div><p className="eyebrow">Recorded conversation</p><h2>Summary &amp; transcript</h2></div>{isDemo && <span className="pill demo">FICTIONAL</span>}</div>
          <p className="detail-summary">{call.summary || <span className="muted">No summary recorded for this call yet.</span>}</p>
          <h3 className="detail-subheading">Transcript</h3>
          {call.transcript ? (
            <div className="detail-transcript">
              {call.transcript.split("\n").map((line, index) => {
                const match = line.match(/^(Dadi|Caller):\s*(.*)$/);
                const isDadi = match?.[1] === "Dadi";
                return (
                  <div key={index} className={`bubble ${isDadi ? "dadi" : "caller"}`}>
                    <small>{isDadi ? "Dadi · scripted response" : isDemo ? "Fictional caller" : match?.[1] || "Transcript entry"}</small>
                    <span>{match?.[2] || line}</span>
                  </div>
                );
              })}
            </div>
          ) : <p className="empty-inline">No transcript lines were recorded.</p>}
        </article>

        <div className="detail-side-column">
          <article className="card">
            <div className="card-heading-row"><div><p className="eyebrow">Pattern matches</p><h2>Captured indicators</h2></div><span className="subtle-label">{call.entities.length} saved</span></div>
            {call.entities.length === 0 && <p className="empty-inline">No indicators were extracted from this call.</p>}
            {call.entities.map((entity) => (
              <div className="alertitem" key={entity.id}>
                <b>{entity.type.replaceAll("_", " ")}</b><span className="mono"> · {entity.value}</span><span className="confidence-note">{Math.round(entity.confidence * 100)}% pattern confidence</span>
                <p>{WHY_FLAGGED[entity.type] || "Flagged by the configured extraction rules."}</p>
                {entity.evidence && <small>Evidence: “{entity.evidence}”</small>}
              </div>
            ))}
            <p className="risk-footnote">Indicators require independent verification; a pattern match is not proof that any person committed a crime.</p>
          </article>

          <article className="card audit-card">
            <div className="card-heading-row"><div><p className="eyebrow">Record history</p><h2>Audit timeline</h2></div></div>
            {Audit.length === 0 ? <p className="empty-inline">No audit events recorded.</p> : (
              <ul className="timeline">
                {Audit.map((event) => <li key={event.id}><time dateTime={new Date(event.created_at).toISOString()}>{new Date(event.created_at).toLocaleString("en-IN")}</time><span>{event.event_type}{event.detail && <> · {event.detail}</>}</span></li>)}
              </ul>
            )}
          </article>
        </div>
      </section>

      <section className="card draft-section">
        <div className="section-heading"><div><p className="eyebrow">Human review required</p><h2>Complaint draft preview</h2></div><span className="pill demo">UNSUBMITTED DRAFT</span></div>
        <p className="muted">Generated from the evidence recorded above. This system has not contacted police, frozen an account, verified criminal activity, or filed anything.</p>
        <pre className="report">{preview}</pre>
        <div className="rowflex draft-actions">
          <button className="btn" onClick={makeReport} disabled={busy}>{busy ? "Generating…" : "Generate & save draft"}</button>
          <button className="btn btn-outline" onClick={() => copyText(preview, setMsg)}>Copy report</button>
          <button className="btn btn-outline" onClick={() => downloadText(`Chalaak-Dadi-complaint-${call.id}.txt`, preview)}>Download .txt</button>
          <a className="btn btn-green" href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">Open official portal <span aria-hidden="true">↗</span></a>
        </div>
      </section>
    </div>
  );
}
