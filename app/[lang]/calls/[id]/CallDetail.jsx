"use client";

import { useState } from "react";
import Link from "next/link";
import { api, copyText, downloadText } from "../../../../lib/client.js";
import { WHY_FLAGGED, formatDuration, riskLevel } from "../../../../lib/intel.js";
import { t } from "../../../../lib/i18n.js";
import ConsoleShell from "../../../components/ConsoleShell.jsx";
import Reveal from "../../../components/scroll/Reveal.jsx";

const LOCALES = { en: "en-IN", hi: "hi-IN", pa: "pa-IN" };

export default function CallDetail({ lang, call: initialCall, audit }) {
  const [call, setCall] = useState(initialCall);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const tr = (key) => t(lang, key);
  const risk = riskLevel(call.risk_score);

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const { report } = await api(`/api/calls/${call.id}/report`, { method: "POST" });
      setDraft(report);
      setMsg(tr("callDetail.generated"));
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  return (
    <ConsoleShell lang={lang}>
      <div className="page-stack">
        <Reveal as="section" className="page-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-mark" />{tr("callDetail.kicker")}</p>
            <h1>{tr("callDetail.title")} <span className="muted num" style={{ fontSize: "0.55em" }}>{call.id}</span></h1>
            <p className="page-lede">
              <Link className="text-link" href={`/${lang}/console`}>← {tr("callDetail.back")}</Link>
            </p>
          </div>
          <span className="pill demo page-heading-badge">{call.source === "demo" ? tr("callDetail.demoBadge") : tr("callDetail.ingestBadge")}</span>
        </Reveal>

        {msg && <div className="notice notice-success" role="status"><span><b>✔</b> {msg}</span></div>}
        {error && <div className="notice notice-error" role="alert"><span><b>⚠</b> {error}</span></div>}

        <Reveal as="section" className="card">
          <dl className="kv-list">
            <div className="kv"><dt>{tr("callDetail.started")}</dt><dd>{new Date(call.started_at).toLocaleString(LOCALES[lang])}</dd></div>
            <div className="kv"><dt>{tr("callDetail.status")}</dt><dd><span className={`pill ${call.status === "live" ? "in-progress" : "ended"}`}>{call.status === "live" ? "●" : "■"} {call.status}</span></dd></div>
            <div className="kv"><dt>{tr("callDetail.duration")}</dt><dd className="num">{formatDuration(call.duration_sec)}</dd></div>
            <div className="kv"><dt>{tr("callDetail.caller")}</dt><dd>{call.caller || "—"}</dd></div>
            <div className="kv"><dt>{tr("consoleNav.th.category")}</dt><dd>{call.category}</dd></div>
            <div className="kv"><dt>{tr("callDetail.risk")}</dt><dd><span className="risk-value num" style={{ "--risk-color": risk.color }}>{call.risk_score}</span> <span className="small muted">{risk.label}</span></dd></div>
          </dl>
        </Reveal>

        <div className="detail-grid">
          <Reveal as="section" className="card">
            <div className="card-heading-row">
              <div><p className="eyebrow">{tr("callDetail.transcriptTitle")}</p><h2>{tr("live.transcript")}</h2></div>
              <span className="pill demo">{tr("common.fictional")}</span>
            </div>
            {call.transcript ? (
              <pre className="report" style={{ maxHeight: 420 }}>{call.transcript}</pre>
            ) : <p className="empty-inline">{tr("callDetail.transcriptEmpty")}</p>}
          </Reveal>

          <Reveal as="section" className="card" delay={80}>
            <div className="card-heading-row">
              <div><p className="eyebrow">{tr("callDetail.entTitle")}</p><h2>{tr("consoleNav.entTitle")}</h2></div>
              <span className="session-count num">{call.entities.length}</span>
            </div>
            {call.entities.length === 0 ? <p className="empty-inline">{tr("callDetail.entEmpty")}</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {call.entities.map((entity) => (
                  <div className="entity-card" key={entity.id}>
                    <div className="entity-card-top">
                      <span className="signal-type">{entity.type.replaceAll("_", " ")}</span>
                      <span className="confidence-chip num">{Math.round(entity.confidence * 100)}% {tr("callDetail.confidence")}</span>
                    </div>
                    <code>{entity.value}</code>
                    <p className="why-line"><b>{tr("callDetail.why")}:</b> {WHY_FLAGGED[entity.type] || "—"}</p>
                  </div>
                ))}
              </div>
            )}
          </Reveal>
        </div>

        <Reveal as="section" className="card">
          <div className="card-heading-row">
            <div><p className="eyebrow">{tr("callDetail.draftKicker")}</p><h2>{tr("callDetail.draftTitle")}</h2></div>
            <span className="pill demo">{tr("common.unsubmitted")}</span>
          </div>
          <div className="rowflex" style={{ marginBottom: 14 }}>
            <button className="btn btn-primary" onClick={generate} disabled={busy}>
              <span aria-hidden="true">✎</span> {draft ? tr("callDetail.regenerate") : tr("callDetail.generate")}
            </button>
            {draft && (
              <>
                <button className="btn btn-outline" onClick={() => copyText(draft.body, setMsg)}>{tr("callDetail.copy")}</button>
                <button className="btn btn-outline" onClick={() => downloadText(`Chalaak-Dadi-${draft.id}.txt`, draft.body)}>{tr("callDetail.download")}</button>
                <Link className="btn btn-outline" href={`/${lang}/reports`}>{tr("nav.reports")} →</Link>
              </>
            )}
          </div>
          {draft ? <pre className="report">{draft.body}</pre> : <p className="empty-inline">{tr("callDetail.draftKicker")}</p>}
        </Reveal>

        <Reveal as="section" className="card">
          <div className="card-heading-row">
            <div><p className="eyebrow">{tr("callDetail.kicker")}</p><h2>{tr("callDetail.auditTitle")}</h2></div>
          </div>
          {audit.length === 0 ? <p className="empty-inline">{tr("callDetail.auditEmpty")}</p> : (
            <ol className="timeline">
              {audit.map((event) => (
                <li key={event.id}>
                  <time dateTime={event.created_at}>{new Date(event.created_at).toLocaleTimeString("en-IN")}</time>
                  <span><b>{event.event_type}</b>{event.detail ? ` · ${event.detail}` : ""}</span>
                </li>
              ))}
            </ol>
          )}
        </Reveal>
      </div>
    </ConsoleShell>
  );
}
