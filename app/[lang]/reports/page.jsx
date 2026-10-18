"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, copyText, downloadText } from "../../../lib/client.js";
import { t } from "../../../lib/i18n.js";
import ConsoleShell from "../../components/ConsoleShell.jsx";
import Reveal from "../../components/scroll/Reveal.jsx";

const LOCALES = { en: "en-IN", hi: "hi-IN", pa: "pa-IN" };

export default function Reports({ params }) {
  const { lang } = use(params);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [open, setOpen] = useState(null);
  const tr = (key) => t(lang, key);

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
      setMsg(`✓ ${nextStatus}`);
      load();
    } catch (statusError) {
      setError(statusError.message);
    }
  }

  return (
    <ConsoleShell lang={lang}>
      <div className="page-stack">
        <Reveal as="section" className="page-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-mark" />{tr("reports.kicker")}</p>
            <h1>{tr("reports.title")}</h1>
            <p className="page-lede">{tr("reports.lede")}</p>
          </div>
          <span className="pill demo page-heading-badge">{tr("common.unsubmitted")}</span>
        </Reveal>

        <div className="notice notice-warning"><span><b>⚠</b> {tr("reports.warning")}</span></div>
        {error && (
          <div className="notice notice-error" role="alert">
            <span><b>⚠</b> {error}</span>
            <button className="btn btn-small btn-outline" onClick={load}>{tr("common.retry")}</button>
          </div>
        )}
        {msg && <div className="notice notice-success" role="status">{msg}</div>}

        <Reveal as="section" className="card">
          <div className="spread" style={{ marginBottom: 16 }}>
            <div>
              <p className="eyebrow">{tr("reports.kicker")}</p>
              <h2 className="section-heading-h" style={{ fontFamily: "var(--font-display)", margin: 0 }}>
                {loading ? tr("reports.draftsLoading") : <><span className="num">{reports.length}</span> {tr("reports.drafts")}</>}
              </h2>
            </div>
            <div className="rowflex">
              <label className="sr-only" htmlFor="report-search">{tr("reports.searchPlaceholder")}</label>
              <input id="report-search" placeholder={tr("reports.searchPlaceholder")} value={q} onChange={(event) => setQ(event.target.value)} />
              <a className="btn btn-outline" href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">{tr("reports.official")} <span aria-hidden="true">↗</span></a>
            </div>
          </div>

          {loading ? <div className="skeleton">{tr("reports.draftsLoading")}</div> : reports.length === 0 ? (
            <div className="skeleton">{tr("reports.empty")}<br /><span className="small">{tr("reports.emptyHint")}</span></div>
          ) : (
            <div className="report-list">
              {reports.map((report, i) => (
                <Reveal as="article" className="card report-card" key={report.id} delay={Math.min(i * 60, 240)}>
                  <div className="spread report-card-heading">
                    <div>
                      <h3>{report.title}</h3>
                      <span className="small muted">
                        {tr("reports.created")} {new Date(report.created_at).toLocaleString(LOCALES[lang])} ·{" "}
                        <Link href={`/${lang}/calls/${report.call_id}`}>{tr("reports.sourceCall")} →</Link>
                      </span>
                    </div>
                    <span className={`pill ${report.status === "Reviewed" ? "reviewed" : "demo"}`}>
                      {report.status === "Reviewed" ? tr("reports.reviewed") : tr("reports.unsubmitted")}
                    </span>
                  </div>
                  <div className="rowflex report-actions">
                    <button className="btn btn-small btn-outline" onClick={() => setOpen(open === report.id ? null : report.id)}>
                      {open === report.id ? tr("reports.hide") : tr("reports.preview")}
                    </button>
                    <button className="btn btn-small btn-outline" onClick={() => copyText(report.body, setMsg)}>{tr("reports.copy")}</button>
                    <button className="btn btn-small btn-outline" onClick={() => downloadText(`Chalaak-Dadi-${report.id}.txt`, report.body)}>{tr("reports.download")}</button>
                    <button className="btn btn-small" onClick={() => toggleStatus(report)}>
                      {report.status === "Reviewed" ? tr("reports.markUnsubmitted") : tr("reports.markReviewed")}
                    </button>
                  </div>
                  {open === report.id && <pre className="report">{report.body}</pre>}
                </Reveal>
              ))}
            </div>
          )}
        </Reveal>
      </div>
    </ConsoleShell>
  );
}
