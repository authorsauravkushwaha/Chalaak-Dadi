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
  const [debouncedQ, setDebouncedQ] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [auto, setAuto] = useState(true);
  const timer = useRef(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    try {
      const qs = new URLSearchParams({ q: debouncedQ, category, status });
      const [nextStats, result] = await Promise.all([api("/api/stats"), api(`/api/calls?${qs}`)]);
      if (seq !== requestSeq.current) return;
      setStats(nextStats);
      setCalls(result.calls);
      setError("");
    } catch (e) {
      if (seq === requestSeq.current) setError(e.message);
    }
    if (seq === requestSeq.current) setLoading(false);
  }, [debouncedQ, category, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!auto) return;
    timer.current = setInterval(load, 8000);
    return () => clearInterval(timer.current);
  }, [auto, load]);

  const totalCalls = stats?.totalCalls || 0;
  const averageRisk = stats ? riskLevel(stats.avgRisk) : null;
  const recentEntities = stats?.recentEntities || [];

  return (
    <div className="page-stack dashboard-page">
      <section className="dashboard-hero" aria-labelledby="dashboard-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-mark" />A clearer view of the scam playbook</p>
          <h1 id="dashboard-title">Scammers waste our elders' time. <em>Dadi wastes theirs.</em></h1>
          <p className="hero-lede">An interactive cybersecurity command center for a scripted scam-awareness demonstration. Follow the conversation, inspect the pattern-matched indicators, and review each fictional call record.</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href="/live"><span aria-hidden="true">▶</span> Run the simulation</Link>
            <a className="text-link" href="#records">Explore saved records <span aria-hidden="true">↓</span></a>
          </div>
          <p className="hero-footnote"><span className="footnote-dot" />Built-in scenario values are fictional. This prototype is not connected to telephony or police systems.</p>
        </div>

        <aside className="hero-console" aria-label="How the demonstration works">
          <div className="console-topline">
            <span className="eyebrow">Simulation flow</span>
            <span className="pill demo">NOT CONNECTED</span>
          </div>
          <div className="flow-list">
            <div className="flow-step"><span className="flow-number">01</span><span><b>Scripted conversation</b><small>Fictional caller · Dadi persona</small></span></div>
            <div className="flow-step"><span className="flow-number">02</span><span><b>Pattern-matched indicators</b><small>Values linked to this demo record</small></span></div>
            <div className="flow-step"><span className="flow-number">03</span><span><b>Human review</b><small>Indicators are not proof of guilt</small></span></div>
          </div>
          <Link className="console-link" href="/live">Open the demonstration <span aria-hidden="true">↗</span></Link>
        </aside>
      </section>

      {error && <div className="notice notice-error" role="alert"><span><b>Could not refresh records.</b> {error}</span><button className="btn btn-small btn-outline" onClick={load}>Retry</button></div>}

      {stats && !stats.persistent && (
        <div className="notice notice-warning"><span><b>Temporary storage.</b> {stats.storageDetail}</span><a href="/api/health" target="_blank" rel="noreferrer">Check storage status <span aria-hidden="true">↗</span></a></div>
      )}
      {stats && stats.persistent && (
        <div className="notice notice-success"><span><b>Persistent storage active.</b> {stats.storageDetail}</span></div>
      )}

      <section className="section-block" aria-labelledby="overview-title">
        <div className="section-heading">
          <div><p className="eyebrow">Saved records</p><h2 id="overview-title">Command overview</h2></div>
          {stats && <span className="pill neutral">SAVED RECORDS</span>}
        </div>

        {loading && !stats ? <div className="skeleton">Loading saved intelligence…</div> : stats && (
          <>
            <div className="grid g4 metric-grid">
              <article className="card metric-card">
                <div className="metric-icon metric-icon-amber" aria-hidden="true">#</div>
                <div className="statnum">{stats.totalCalls}</div>
                <div className="statlbl">Call records</div>
                <p className="metric-note">Saved records across all statuses</p>
              </article>
              <article className="card metric-card">
                <div className="metric-icon metric-icon-mint" aria-hidden="true">◷</div>
                <div className="statnum">{formatDuration(stats.totalEngagementSec)}</div>
                <div className="statlbl">Recorded engagement</div>
                <p className="metric-note">Sum of durations saved on call records</p>
              </article>
              <article className="card metric-card">
                <div className="metric-icon metric-icon-amber" aria-hidden="true">@</div>
                <div className="statnum stat-accent">{stats.upiCount}</div>
                <div className="statlbl">UPI indicators</div>
                <p className="metric-note">Captured entity rows, counted per call</p>
              </article>
              <article className="card metric-card">
                <div className="metric-icon metric-icon-coral" aria-hidden="true">⌁</div>
                <div className="statnum stat-coral">{stats.bankIndicators}</div>
                <div className="statlbl">Banking indicators</div>
                <p className="metric-note">Bank-account and IFSC entity rows</p>
              </article>
            </div>
            <p className="data-note">Indicators are records, not unique people or verified allegations. The same value on separate calls is counted once for each call.</p>
          </>
        )}
      </section>

      {stats && (
        <section className="grid g2 insight-grid" aria-label="Category and indicator insights">
          <article className="card insight-card">
            <div className="card-heading-row">
              <div><p className="eyebrow">Distribution</p><h2>Call categories</h2></div>
              <span className="subtle-label">Share of {stats.totalCalls} records</span>
            </div>
            {Object.keys(stats.byCategory).length === 0 ? <p className="empty-inline">No call records yet.</p> : (
              <div className="category-list">
                {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
                  const share = totalCalls ? (count / totalCalls) * 100 : 0;
                  return (
                    <div className="category-row" key={cat}>
                      <div className="category-meta"><span>{cat}</span><b>{count}<small>{` · ${Math.round(share)}%`}</small></b></div>
                      <div className="bar" role="img" aria-label={`${cat}: ${count} of ${stats.totalCalls} records`}><i style={{ width: `${share}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="risk-summary">
              <div className="risk-summary-label"><span>Average stored risk</span><small>Across all call records · current scores</small></div>
              {stats.totalCalls ? (
                <div className="risk-score-wrap" style={{ "--risk-color": averageRisk.color }}>
                  <b>{stats.avgRisk}</b><span>/100 · {averageRisk.label}</span>
                </div>
              ) : <b className="muted">—</b>}
            </div>
            <p className="risk-footnote">An in-progress record may still carry its current, unfinished score.</p>
          </article>

          <article className="card insight-card">
            <div className="card-heading-row">
              <div><p className="eyebrow">Latest saved entities</p><h2>Captured indicators</h2></div>
              <span className="subtle-label">{recentEntities.length} shown · up to 8</span>
            </div>
            {recentEntities.length === 0 ? <p className="empty-inline">No indicators recorded yet. Start a simulation to see scripted examples.</p> : (
              <div className="recent-entity-list">
                {recentEntities.map((entity) => (
                  <div className="recent-entity" key={entity.id}>
                    <span className="entity-type">{entity.type.replaceAll("_", " ")}</span>
                    <code>{entity.value}</code>
                    <span className="confidence">{Math.round(entity.confidence * 100)}% match</span>
                    <small>{entity.call_category}</small>
                  </div>
                ))}
              </div>
            )}
            <p className="risk-footnote">Pattern-matched indicators require independent verification.</p>
          </article>
        </section>
      )}

      <section className="card records-card" id="records" aria-labelledby="records-title">
        <div className="section-heading records-heading">
          <div><p className="eyebrow">Review the evidence</p><h2 id="records-title">Call records</h2></div>
          <label className="refresh-toggle"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto-refresh every 8 seconds</label>
        </div>
        <div className="records-toolbar">
          <label className="sr-only" htmlFor="call-search">Search call records</label>
          <input id="call-search" placeholder="Search summaries, callers, categories…" value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="sr-only" htmlFor="category-filter">Filter by category</label>
          <select id="category-filter" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <label className="sr-only" htmlFor="status-filter">Filter by record status</label>
          <select id="status-filter" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Any status</option><option value="live">In progress</option><option value="ended">Ended</option>
          </select>
          <Link className="btn btn-primary" href="/live"><span aria-hidden="true">▶</span> Start a demo</Link>
        </div>

        {loading ? <div className="skeleton">Loading call records…</div> : calls.length === 0 ? (
          <div className="skeleton">No call records match these filters.<br /><span className="small">Clear a filter or start a simulated call from Live Intelligence.</span></div>
        ) : (
          <div className="table-shell">
            <table>
              <thead><tr><th>Call record</th><th>Category</th><th>Risk</th><th>Duration</th><th>Indicators</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {calls.map((call) => {
                  const risk = riskLevel(call.risk_score);
                  return (
                    <tr key={call.id}>
                      <td><b>{new Date(call.started_at).toLocaleString("en-IN")}</b><br /><span className="muted small">{call.caller || "Unknown caller"}</span></td>
                      <td>{call.category}</td>
                      <td><span className="risk-value" style={{ "--risk-color": risk.color }}>{call.risk_score}</span><span className="risk-row-label">{risk.label}</span></td>
                      <td>{formatDuration(call.duration_sec)}<br /><span className="pill demo table-source">{call.source === "demo" ? "SIMULATED" : "INGESTED"}</span></td>
                      <td>{call.entities.length ? <div className="table-entities">{call.entities.slice(0, 3).map((entity) => <span key={entity.id} className="chip mono">{entity.value}</span>)}{call.entities.length > 3 && <span className="muted">+{call.entities.length - 3} more</span>}</div> : <span className="muted">None recorded</span>}</td>
                      <td><span className={`pill ${call.status === "live" ? "in-progress" : "ended"}`}>{call.status === "live" ? "IN PROGRESS" : "ENDED"}</span></td>
                      <td><Link className="btn btn-small btn-outline" href={`/calls/${call.id}`}>Review <span aria-hidden="true">→</span></Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
