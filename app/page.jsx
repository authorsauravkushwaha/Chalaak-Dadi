"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "../lib/client.js";
import { CATEGORIES, formatDuration, riskLevel } from "../lib/intel.js";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [auto, setAuto] = useState(true);
  const timer = useRef(null);

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ q, category, status });
      const [s, c] = await Promise.all([api("/api/stats"), api(`/api/calls?${qs}`)]);
      setStats(s); setCalls(c.calls); setError("");
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [q, category, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!auto) return;
    timer.current = setInterval(load, 8000); // auto-refresh; server dedupes, so no duplicate records appear
    return () => clearInterval(timer.current);
  }, [auto, load]);

  const maxCat = stats ? Math.max(1, ...Object.values(stats.byCategory)) : 1;

  return (
    <>
      <h1>🛡️ Scam Intelligence Dashboard</h1>
      <p className="sub">Chalaak Dadi keeps suspected scammers talking to a sweet Hindi-speaking Dadi voice agent — while this console quietly captures UPI IDs, phone numbers and bank indicators for human review. <b>सावधान रहें, सतर्क रहें।</b></p>

      {error && <div className="err">⚠️ {error} <button className="btn sm ghost" onClick={load}>Retry</button></div>}

      {loading && !stats ? <div className="skeleton">Loading intelligence…</div> : stats && (
        <>
          <div className="grid g4" style={{ marginTop: 18 }}>
            <div className="card"><div className="statnum">{stats.totalCalls}</div><div className="statlbl">Total calls analyzed</div></div>
            <div className="card"><div className="statnum">{formatDuration(stats.totalEngagementSec)}</div><div className="statlbl">Scammer engagement time {stats.simulated && <span className="pill demo">SIMULATED</span>}</div><div className="small muted">Time scammers wasted on Dadi = time they could not scam someone else</div></div>
            <div className="card"><div className="statnum" style={{ color: "var(--saffron2)" }}>{stats.upiCount}</div><div className="statlbl">Suspicious UPI IDs captured</div></div>
            <div className="card"><div className="statnum" style={{ color: "var(--orange)" }}>{stats.bankIndicators}</div><div className="statlbl">Bank-account indicators</div></div>
          </div>

          <div className="grid g2" style={{ marginTop: 16 }}>
            <div className="card">
              <h2>📊 Scam categories</h2>
              {Object.keys(stats.byCategory).length === 0 && <p className="muted">No calls yet.</p>}
              {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, n]) => (
                <div key={cat} style={{ marginBottom: 10 }}>
                  <div className="spread small"><span>{cat}</span><b>{n}</b></div>
                  <div className="bar"><i style={{ width: `${(n / maxCat) * 100}%` }} /></div>
                </div>
              ))}
              <p className="small muted" style={{ marginTop: 10 }}>Average risk score: <b style={{ color: riskLevel(stats.avgRisk).color }}>{stats.avgRisk}/100 — {riskLevel(stats.avgRisk).label}</b> · Live now: <b>{stats.liveCalls}</b> · Storage: {stats.storage}</p>
            </div>
            <div className="card">
              <h2>🚨 Latest captured entities (संकेत)</h2>
              {stats.recentEntities.length === 0 && <p className="muted">No entities captured yet. Start a demo on the Live page.</p>}
              {stats.recentEntities.map((e) => (
                <div key={e.id} className="alertitem"><b>{e.type}</b> · <span className="mono">{e.value}</span> <span className="muted">({Math.round(e.confidence * 100)}%)</span><br /><span className="muted">{e.call_category}</span></div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="spread">
          <h2 style={{ margin: 0 }}>📞 Recent calls</h2>
          <label className="rowflex small"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} style={{ minWidth: 0 }} /> Auto-refresh (8s)</label>
        </div>
        <div className="rowflex" style={{ margin: "14px 0" }}>
          <input placeholder="🔍 Search summary, caller, category…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: "1 1 220px" }} />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Any status</option><option value="live">Live</option><option value="ended">Ended</option>
          </select>
          <Link className="btn" href="/live">▶ Start Live Demo</Link>
        </div>

        {loading ? <div className="skeleton">Loading calls…</div> : calls.length === 0 ? (
          <div className="skeleton">No calls match these filters.<br /><span className="small">Try clearing the search, or run a simulated call from the Live Intelligence page.</span></div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr><th>Call</th><th>Category</th><th>Risk</th><th>Duration</th><th>Entities</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {calls.map((c) => {
                  const r = riskLevel(c.risk_score);
                  return (
                    <tr key={c.id}>
                      <td><b>{new Date(c.started_at).toLocaleString("en-IN")}</b><br /><span className="muted small">{c.caller || "Unknown caller"}</span></td>
                      <td>{c.category}</td>
                      <td><span className="riskring" style={{ color: r.color, fontSize: 17 }}>{c.risk_score}</span> <span className="small" style={{ color: r.color }}>{r.label}</span></td>
                      <td>{formatDuration(c.duration_sec)}{c.source === "demo" && <> <span className="pill demo">SIMULATED</span></>}</td>
                      <td>{c.entities.length ? c.entities.slice(0, 3).map((e) => <span key={e.id} className="chip mono">{e.value}</span>) : <span className="muted">—</span>}{c.entities.length > 3 && <span className="muted"> +{c.entities.length - 3}</span>}</td>
                      <td><span className={`pill ${c.status}`}>{c.status.toUpperCase()}</span></td>
                      <td><Link className="btn sm ghost" href={`/calls/${c.id}`}>View →</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
