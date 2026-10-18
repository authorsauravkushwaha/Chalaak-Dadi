"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/client.js";
import { CATEGORIES, formatDuration, riskLevel } from "../../../lib/intel.js";
import { t } from "../../../lib/i18n.js";
import ConsoleShell from "../../components/ConsoleShell.jsx";
import Reveal from "../../components/scroll/Reveal.jsx";
import CountUp from "../../components/scroll/CountUp.jsx";

export default function Dashboard({ params }) {
  const { lang } = use(params);
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
    const timeout = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timeout);
  }, [q]);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    try {
      const qs = new URLSearchParams({ q: debouncedQ, category, status, limit: "200" });
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
  const tr = (key) => t(lang, key);

  return (
    <ConsoleShell lang={lang}>
      <div className="page-stack">
        <Reveal as="section" className="page-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-mark" />{tr("consoleNav.recordsKicker")}</p>
            <h1>{tr("consoleNav.dashboardTitle")}</h1>
            <p className="page-lede">{tr("consoleNav.dashboardLede")}</p>
          </div>
          <span className="pill demo page-heading-badge">{tr("common.simulation")}</span>
        </Reveal>

        {error && (
          <div className="notice notice-error" role="alert">
            <span><b>⚠</b> {error}</span>
            <button className="btn btn-small btn-outline" onClick={load}>{tr("common.retry")}</button>
          </div>
        )}

        {stats && !stats.persistent && (
          <div className="notice notice-warning"><span><b>⏳</b> {stats.storageDetail}</span><a href="/api/health" target="_blank" rel="noreferrer">/api/health ↗</a></div>
        )}
        {stats && stats.persistent && (
          <div className="notice notice-success"><span><b>✔</b> {stats.storageDetail}</span></div>
        )}

        <section className="section-block" aria-label={tr("consoleNav.savedRecords")}>
          {loading && !stats ? <div className="skeleton">{tr("consoleNav.loading")}</div> : stats && (
            <div className="grid g4">
              <Reveal className="card metric-card">
                <div className="metric-icon" aria-hidden="true">#</div>
                <div className="statnum"><CountUp value={stats.totalCalls} /></div>
                <div className="statlbl">{tr("consoleNav.metric1")}</div>
                <p className="metric-note">{tr("consoleNav.metric1Note")}</p>
              </Reveal>
              <Reveal className="card metric-card" delay={70}>
                <div className="metric-icon metric-icon-mint" aria-hidden="true">◷</div>
                <div className="statnum">{formatDuration(stats.totalEngagementSec)}</div>
                <div className="statlbl">{tr("consoleNav.metric2")}</div>
                <p className="metric-note">{tr("consoleNav.metric2Note")}</p>
              </Reveal>
              <Reveal className="card metric-card" delay={140}>
                <div className="metric-icon" aria-hidden="true">@</div>
                <div className="statnum stat-accent"><CountUp value={stats.upiCount} /></div>
                <div className="statlbl">{tr("consoleNav.metric3")}</div>
                <p className="metric-note">{tr("consoleNav.metric3Note")}</p>
              </Reveal>
              <Reveal className="card metric-card" delay={210}>
                <div className="metric-icon metric-icon-coral" aria-hidden="true">⌁</div>
                <div className="statnum stat-coral"><CountUp value={stats.bankIndicators} /></div>
                <div className="statlbl">{tr("consoleNav.metric4")}</div>
                <p className="metric-note">{tr("consoleNav.metric4Note")}</p>
              </Reveal>
            </div>
          )}
          {stats && <p className="data-note">{tr("consoleNav.dataNote")}</p>}
        </section>

        {stats && (
          <section className="grid g2" aria-label={tr("consoleNav.catTitle")}>
            <Reveal className="card">
              <div className="card-heading-row">
                <div><p className="eyebrow">{tr("consoleNav.catShare")}</p><h2>{tr("consoleNav.catTitle")}</h2></div>
                <span className="subtle-label">{tr("consoleNav.savedRecords")}</span>
              </div>
              {Object.keys(stats.byCategory).length === 0 ? <p className="empty-inline">{tr("consoleNav.empty")}</p> : (
                <div className="category-list">
                  {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
                    const share = totalCalls ? (count / totalCalls) * 100 : 0;
                    return (
                      <div className="category-row" key={cat}>
                        <div className="category-meta"><span>{cat}</span><b><span className="num">{count}</span><small>{` · ${Math.round(share)}%`}</small></b></div>
                        <div className="bar" role="img" aria-label={`${cat}: ${count}`}><i style={{ width: `${share}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="risk-summary">
                <div className="risk-summary-label"><span>{tr("consoleNav.avgRisk")}</span><small>{tr("consoleNav.avgRiskNote")}</small></div>
                {stats.totalCalls ? (
                  <div className="risk-score-wrap" style={{ "--risk-color": averageRisk.color }}>
                    <b className="num">{stats.avgRisk}</b><span>/100 · {averageRisk.label}</span>
                  </div>
                ) : <b className="muted">—</b>}
              </div>
            </Reveal>

            <Reveal className="card" delay={90}>
              <div className="card-heading-row">
                <div><p className="eyebrow">{tr("consoleNav.entKicker")}</p><h2>{tr("consoleNav.entTitle")}</h2></div>
                <span className="subtle-label">{recentEntities.length} / 8</span>
              </div>
              {recentEntities.length === 0 ? <p className="empty-inline">{tr("consoleNav.empty")}</p> : (
                <div className="recent-entity-list">
                  {recentEntities.map((entity) => (
                    <div className="recent-entity" key={entity.id}>
                      <span className="entity-type">{entity.type.replaceAll("_", " ")}</span>
                      <code>{entity.value}</code>
                      <span className="confidence num">{Math.round(entity.confidence * 100)}% {tr("consoleNav.match")}</span>
                      <small>{entity.call_category}</small>
                    </div>
                  ))}
                </div>
              )}
            </Reveal>
          </section>
        )}

        <Reveal as="section" className="card records-card" delay={60}>
          <div className="section-heading records-heading">
            <div><p className="eyebrow">{tr("consoleNav.recordsKicker")}</p><h2>{tr("consoleNav.recordsTitle")}</h2></div>
            <label className="refresh-toggle"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> {tr("consoleNav.autoRefresh")}</label>
          </div>
          <div className="records-toolbar">
            <label className="sr-only" htmlFor="call-search">{tr("consoleNav.th.call")}</label>
            <input id="call-search" placeholder={tr("consoleNav.searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} />
            <label className="sr-only" htmlFor="category-filter">{tr("consoleNav.th.category")}</label>
            <select id="category-filter" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">{tr("consoleNav.allCategories")}</option>
              {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <label className="sr-only" htmlFor="status-filter">{tr("consoleNav.th.status")}</label>
            <select id="status-filter" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{tr("consoleNav.anyStatus")}</option>
              <option value="live">{tr("consoleNav.inProgress")}</option>
              <option value="ended">{tr("consoleNav.ended")}</option>
            </select>
            <Link className="btn btn-primary" href={`/${lang}/live`}><span aria-hidden="true">▶</span> {tr("consoleNav.startDemo")}</Link>
          </div>

          {loading ? <div className="skeleton">{tr("consoleNav.loading")}</div> : calls.length === 0 ? (
            <div className="skeleton">{tr("consoleNav.empty")}</div>
          ) : (
            <div className="table-shell">
              <table>
                <thead><tr>
                  <th>{tr("consoleNav.th.call")}</th><th>{tr("consoleNav.th.category")}</th><th>{tr("consoleNav.th.risk")}</th>
                  <th>{tr("consoleNav.th.duration")}</th><th>{tr("consoleNav.th.indicators")}</th><th>{tr("consoleNav.th.status")}</th>
                  <th><span className="sr-only">—</span></th>
                </tr></thead>
                <tbody>
                  {calls.map((call) => {
                    const risk = riskLevel(call.risk_score);
                    return (
                      <tr key={call.id}>
                        <td><b>{new Date(call.started_at).toLocaleString(LANG_META_LOCALE[lang])}</b><br /><span className="muted small">{call.caller || "—"}</span></td>
                        <td>{call.category}</td>
                        <td><span className="risk-value num" style={{ "--risk-color": risk.color }}>{call.risk_score}</span><span className="risk-row-label">{risk.label}</span></td>
                        <td>{formatDuration(call.duration_sec)}<br /><span className="pill demo table-source">{call.source === "demo" ? tr("consoleNav.demoBadge") : tr("consoleNav.ingestBadge")}</span></td>
                        <td>{call.entities.length ? (
                          <div className="table-entities">
                            {call.entities.slice(0, 3).map((entity) => <span key={entity.id} className="chip mono">{entity.value}</span>)}
                            {call.entities.length > 3 && <span className="muted">+{call.entities.length - 3} {tr("consoleNav.more")}</span>}
                          </div>
                        ) : <span className="muted">{tr("consoleNav.noneRecorded")}</span>}</td>
                        <td><span className={`pill ${call.status === "live" ? "in-progress" : "ended"}`}>{call.status === "live" ? tr("consoleNav.inProgress") : tr("consoleNav.ended")}</span></td>
                        <td><Link className="btn btn-small btn-outline" href={`/${lang}/calls/${call.id}`}>{tr("consoleNav.review")} <span aria-hidden="true">→</span></Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Reveal>
      </div>
    </ConsoleShell>
  );
}

const LANG_META_LOCALE = { en: "en-IN", hi: "hi-IN", pa: "pa-IN" };
