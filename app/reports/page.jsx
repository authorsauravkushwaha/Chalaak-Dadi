"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, copyText, downloadText } from "../../lib/client.js";

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [open, setOpen] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const load = useCallback(async () => {
    try {
      const result = await api(`/api/reports?q=${encodeURIComponent(debouncedQ)}`);
      setReports(result.reports);
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    }
    setLoading(false);
  }, [debouncedQ]);

  useEffect(() => { load(); }, [load]);

  async function toggleStatus(report) {
    const nextStatus = report.status === "Reviewed" ? "Draft — Unsubmitted" : "Reviewed";
    try {
      await api("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: report.id, status: nextStatus }),
      });
      setMsg(`Status updated to “${nextStatus}”.`);
      load();
    } catch (statusError) {
      setError(statusError.message);
    }
  }

  return (
    <div className="page-stack reports-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow"><span className="eyebrow-mark" />Human review queue</p>
          <h1>Complaint drafts</h1>
          <p className="page-lede">Drafts are generated from recorded call details. They remain unsubmitted until a person reviews the content and chooses what to do next.</p>
        </div>
        <span className="pill demo page-heading-badge">NOT SUBMITTED</span>
      </section>

      <div className="notice notice-warning"><span><b>Review before use.</b> This prototype is intended for fictional demo data. Verify every indicator and remove personal information before using any real transcript.</span></div>
      {error && <div className="notice notice-error" role="alert"><span><b>Could not update reports.</b> {error}</span><button className="btn btn-small btn-outline" onClick={load}>Retry</button></div>}
      {msg && <div className="notice notice-success" role="status">{msg}</div>}

      <section className="card reports-list-card">
        <div className="reports-toolbar">
          <div><p className="eyebrow">Saved drafts</p><h2>{loading ? "Loading reports…" : `${reports.length} ${reports.length === 1 ? "draft" : "drafts"}`}</h2></div>
          <div className="rowflex reports-actions">
            <label className="sr-only" htmlFor="report-search">Search reports</label>
            <input id="report-search" placeholder="Search drafts…" value={q} onChange={(event) => setQ(event.target.value)} />
            <a className="btn btn-outline" href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">Open official portal <span aria-hidden="true">↗</span></a>
          </div>
        </div>

        {loading ? <div className="skeleton">Loading saved drafts…</div> : reports.length === 0 ? (
          <div className="skeleton">No reports found{q && <> for “{q}”</>}.<br /><span className="small">Open a call record and choose “Generate &amp; Save Draft” to create one.</span></div>
        ) : (
          <div className="report-list">
            {reports.map((report) => (
              <article className="card report-card" key={report.id}>
                <div className="spread report-card-heading">
                  <div><h3>{report.title}</h3><span className="small muted">Created {new Date(report.created_at).toLocaleString("en-IN")} · <Link href={`/calls/${report.call_id}`}>View source call <span aria-hidden="true">→</span></Link></span></div>
                  <span className={`pill ${report.status === "Reviewed" ? "reviewed" : "demo"}`}>{report.status === "Reviewed" ? "REVIEWED" : "UNSUBMITTED DRAFT"}</span>
                </div>
                <div className="rowflex report-actions">
                  <button className="btn btn-small btn-outline" onClick={() => setOpen(open === report.id ? null : report.id)}>{open === report.id ? "Hide preview" : "Preview draft"}</button>
                  <button className="btn btn-small btn-outline" onClick={() => copyText(report.body, setMsg)}>Copy</button>
                  <button className="btn btn-small btn-outline" onClick={() => downloadText(`Chalaak-Dadi-${report.id}.txt`, report.body)}>Download .txt</button>
                  <button className="btn btn-small" onClick={() => toggleStatus(report)}>{report.status === "Reviewed" ? "Mark unsubmitted" : "Mark reviewed"}</button>
                </div>
                {open === report.id && <pre className="report">{report.body}</pre>}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
