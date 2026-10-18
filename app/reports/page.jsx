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
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    try { const d = await api(`/api/reports?q=${encodeURIComponent(debouncedQ)}`); setReports(d.reports); setError(""); }
    catch (e) { setError(e.message); }
    setLoading(false);
  }, [debouncedQ]);
  useEffect(() => { load(); }, [load]);

  async function toggleStatus(r) {
    const next = r.status === "Reviewed" ? "Draft — Unsubmitted" : "Reviewed";
    try { await api("/api/reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, status: next }) }); setMsg(`✅ Status updated to "${next}".`); load(); }
    catch (e) { setError(e.message); }
  }

  return (
    <>
      <h1>📄 Reports — Complaint Drafts</h1>
      <p className="sub">Every draft here is <b>unsubmitted</b> until a human reviews it and files it on the official portal. Nothing on this page has been sent to police or any bank.</p>
      <div className="warn">⚠️ <b>Before importing or using any real transcript:</b> remove personal data of real victims, confirm you have consent/lawful basis, and verify every indicator. This prototype stores fictional demo data by default.</div>
      {error && <div className="err">⚠️ {error}</div>}
      {msg && <div className="ok">{msg}</div>}

      <div className="rowflex" style={{ margin: "16px 0" }}>
        <input placeholder="🔍 Search reports…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: "1 1 260px" }} />
        <a className="btn green" href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">🌐 Open Official Portal</a>
        <Link className="btn ghost" href="/">← Dashboard</Link>
      </div>

      {loading ? <div className="skeleton">Loading reports…</div> : reports.length === 0 ? (
        <div className="skeleton">No reports found{q && <> for “{q}”</>}.<br /><span className="small">Open any call from the Dashboard and press <b>Generate &amp; Save Draft</b> to create the first one.</span></div>
      ) : reports.map((r) => (
        <div className="card" key={r.id} style={{ marginBottom: 14 }}>
          <div className="spread">
            <div><b>{r.title}</b><br /><span className="small muted">{new Date(r.created_at).toLocaleString("en-IN")} · <Link href={`/calls/${r.call_id}`}>View source call →</Link></span></div>
            <span className={`pill ${r.status === "Reviewed" ? "live" : "demo"}`}>{r.status.toUpperCase()}</span>
          </div>
          <div className="rowflex" style={{ marginTop: 12 }}>
            <button className="btn sm ghost" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? "Hide" : "👁 Preview"}</button>
            <button className="btn sm ghost" onClick={() => copyText(r.body, setMsg)}>📋 Copy Report</button>
            <button className="btn sm ghost" onClick={() => downloadText(`Chalaak-Dadi-${r.id}.txt`, r.body)}>⬇️ Download</button>
            <button className="btn sm" onClick={() => toggleStatus(r)}>{r.status === "Reviewed" ? "↩ Mark Unsubmitted" : "✓ Mark Reviewed"}</button>
          </div>
          {open === r.id && <pre className="report" style={{ marginTop: 12 }}>{r.body}</pre>}
        </div>
      ))}
    </>
  );
}
