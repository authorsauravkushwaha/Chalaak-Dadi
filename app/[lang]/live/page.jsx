"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/client.js";
import { SCENARIOS } from "../../../lib/scenarios.js";
import { extractEntities, formatDuration } from "../../../lib/intel.js";
import { t } from "../../../lib/i18n.js";
import ConsoleShell from "../../components/ConsoleShell.jsx";
import Reveal from "../../components/scroll/Reveal.jsx";

export default function Live({ params }) {
  const { lang } = use(params);
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [call, setCall] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [shown, setShown] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [latestAlert, setLatestAlert] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const timers = useRef([]);
  const chatEnd = useRef(null);
  const shownRef = useRef([]);
  const secondsRef = useRef(0);
  const startedAtRef = useRef(0);
  const entityWrites = useRef([]);
  const seenEntities = useRef(new Set());
  const alertSequence = useRef(0);
  const running = !!call && call.status === "live";
  const scriptDone = running && scenario && shown.length >= scenario.lines.length;
  const savedCount = alerts.filter((alert) => alert.saveStatus === "saved").length;
  const tr = (key) => t(lang, key);

  const clearTimers = () => {
    timers.current.forEach(clearInterval);
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => () => clearTimers(), []);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [shown.length]);

  function updateAlert(eventId, patch) {
    setAlerts((current) => current.map((alert) => alert.eventId === eventId ? { ...alert, ...patch } : alert));
    setLatestAlert((current) => current?.eventId === eventId ? { ...current, ...patch } : current);
  }

  async function start() {
    setBusy(true);
    setError("");
    setMsg("");
    clearTimers();
    setShown([]);
    setAlerts([]);
    setLatestAlert(null);
    setTimeline([]);
    setSeconds(0);
    shownRef.current = [];
    secondsRef.current = 0;
    startedAtRef.current = 0;
    entityWrites.current = [];
    seenEntities.current = new Set();

    try {
      const { call: createdCall, scenario: selectedScenario } = await api("/api/demo/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId }),
      });
      setCall(createdCall);
      setScenario(selectedScenario);
      setTimeline([
        { t: new Date(), text: `${tr("live.title")} · ${selectedScenario.title}` },
      ]);

      startedAtRef.current = Date.now();
      timers.current.push(setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        secondsRef.current = elapsed;
        setSeconds(elapsed);
      }, 1000));

      selectedScenario.lines.forEach((line, index) => {
        timers.current.push(setTimeout(() => {
          shownRef.current = [...shownRef.current, line];
          setShown(shownRef.current);

          for (const entity of extractEntities(line.text)) {
            const dedupeKey = `${entity.type}:${entity.value.toLowerCase()}`;
            if (seenEntities.current.has(dedupeKey)) continue;
            seenEntities.current.add(dedupeKey);

            const eventId = `${dedupeKey}:${alertSequence.current++}`;
            const pendingAlert = { ...entity, eventId, saveStatus: "saving", at: new Date() };
            setAlerts((current) => [pendingAlert, ...current]);
            setLatestAlert(pendingAlert);
            setTimeline((current) => [...current, { t: new Date(), text: `${entity.type}` }]);

            const write = api(`/api/demo/${createdCall.id}/entity`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(entity),
            }).then(({ duplicate }) => {
              updateAlert(eventId, { saveStatus: "saved", duplicate });
            }).catch((saveError) => {
              updateAlert(eventId, { saveStatus: "error", saveError: saveError.message });
            });
            entityWrites.current.push(write);
          }
        }, 1400 + index * 2300));
      });
    } catch (startError) {
      setError(startError.message);
    }
    setBusy(false);
  }

  async function end() {
    if (!call) return;
    setBusy(true);
    clearTimers();
    if (startedAtRef.current) {
      secondsRef.current = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setSeconds(secondsRef.current);
    }
    try {
      await Promise.allSettled(entityWrites.current);
      const transcript = shownRef.current.map((line) => `${line.speaker}: ${line.text}`).join("\n");
      const completedScript = scenario && shownRef.current.length >= scenario.lines.length;
      const summary = completedScript
        ? scenario.summary
        : `Partial simulated transcript: ${shownRef.current.length} of ${scenario?.lines.length || 0} scripted lines played before the demonstration ended.`;
      const { call: endedCall } = await api(`/api/demo/${call.id}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration_sec: secondsRef.current,
          transcript,
          summary,
          category: scenario.category,
          risk_score: scenario.risk,
        }),
      });
      setCall(endedCall);
      setMsg(tr("live.endedMsg"));
    } catch (endError) {
      setError(endError.message);
    }
    setBusy(false);
  }

  const selectedScenarioLines = scenario?.lines.length || SCENARIOS.find((item) => item.id === scenarioId)?.lines.length || 0;

  return (
    <ConsoleShell lang={lang}>
      <div className="page-stack">
        <Reveal as="section" className="page-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-mark" />{tr("common.simulation")}</p>
            <h1>{tr("live.title")}</h1>
            <p className="page-lede">{tr("live.lede")}</p>
          </div>
          <span className="pill demo page-heading-badge">{tr("live.demoBadge")}</span>
        </Reveal>

        <div className="notice notice-warning"><span><b>⚠</b> {tr("live.simOnly")}</span></div>
        {error && <div className="notice notice-error" role="alert"><span><b>⚠</b> {error}</span></div>}
        {msg && (
          <div className="notice notice-success" role="status">
            <span><b>✔</b> {msg} {call && <Link href={`/${lang}/calls/${call.id}`}>{tr("live.reviewCall")} →</Link>}</span>
          </div>
        )}
        {scriptDone && <div className="notice notice-info" role="status"><span><b>✔</b> {tr("live.scriptDone")}</span></div>}

        <Reveal as="section" className="stage-overview card">
          <div className="stage-copy">
            <p className="eyebrow">{tr("live.chooseScenario")}</p>
            <h2>{tr("live.scenarioLabel")}</h2>
            <label className="field-label" htmlFor="scenario-select">{tr("live.scenarioLabel")}</label>
            <select id="scenario-select" value={scenarioId} onChange={(event) => setScenarioId(event.target.value)} disabled={running || busy}>
              {SCENARIOS.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
            <div className="rowflex stage-actions">
              <button className="btn btn-primary" onClick={start} disabled={busy || running}><span aria-hidden="true">▶</span> {tr("live.start")}</button>
              <button className="btn btn-danger" onClick={end} disabled={busy || !running}><span aria-hidden="true">■</span> {tr("live.end")}</button>
              {call?.status === "ended" && <Link className="btn btn-outline" href={`/${lang}/calls/${call.id}`}>{tr("live.openSaved")} <span aria-hidden="true">→</span></Link>}
            </div>
          </div>

          <div className={`stage-clock ${running ? "stage-clock-running" : ""}`}>
            <div className="clock-heading"><span>{tr("live.timerLabel")}</span><span className={`pill ${running ? "in-progress" : "neutral"}`}>{running ? tr("live.running") : call?.status === "ended" ? tr("live.statusEnded") : tr("live.ready")}</span></div>
            <div className="timer num" aria-live="off">{formatDuration(seconds)}</div>
            <p>{tr("live.elapsedNote")}</p>
            <div className="playback-row"><span>{tr("live.playback")}</span><b className="num">{shown.length} / {selectedScenarioLines} {tr("live.lines")}</b></div>
            <div className="playback-track" role="progressbar" aria-label={tr("live.playback")} aria-valuemin={0} aria-valuemax={selectedScenarioLines} aria-valuenow={shown.length}>
              <i style={{ width: `${selectedScenarioLines ? (shown.length / selectedScenarioLines) * 100 : 0}%` }} />
            </div>
          </div>
        </Reveal>

        <section className="live-grid">
          <Reveal as="article" className="card transcript-card">
            <div className="card-heading-row">
              <div><p className="eyebrow">{tr("live.transcriptKicker")}</p><h2>{tr("live.transcript")}</h2></div>
              <span className="pill demo">{tr("common.fictional")}</span>
            </div>
            <div className="chat">
              {shown.length === 0 && <div className="transcript-empty"><span className="empty-mark" aria-hidden="true">···</span><p>{tr("live.emptyTranscript")}</p></div>}
              {shown.map((line, index) => (
                <div key={`${index}-${line.speaker}`} className={`bubble ${line.speaker === "Dadi" ? "dadi" : "caller"}`}>
                  <small>{line.speaker === "Dadi" ? tr("live.dadiLine") : tr("live.callerLine")}</small>
                  <span>{line.text}</span>
                </div>
              ))}
              <div ref={chatEnd} aria-hidden="true" />
            </div>
          </Reveal>

          <aside className="signal-column">
            <Reveal as="article" className="card" aria-live="polite">
              <div className="card-heading-row">
                <div><p className="eyebrow">{tr("live.latest")}</p><h2>{tr("live.alertTitle")}</h2></div>
                <span className="signal-mark" aria-hidden="true">!</span>
              </div>
              {latestAlert ? (
                <div key={latestAlert.eventId} className="signal-alert">
                  <div className="signal-alert-top"><span className="signal-alert-label">{tr("live.captured")}</span><span className="pill demo">{tr("live.fictionalValue")}</span></div>
                  <span className="signal-type">{latestAlert.type.replaceAll("_", " ")}</span>
                  <code className="signal-value">{latestAlert.value}</code>
                  <div className={`save-state save-${latestAlert.saveStatus}`}>
                    <span className="save-state-dot" />
                    {latestAlert.saveStatus === "saving" && tr("live.saving")}
                    {latestAlert.saveStatus === "saved" && (latestAlert.duplicate ? tr("live.savedDup") : tr("live.savedOk"))}
                    {latestAlert.saveStatus === "error" && `${tr("live.saveFail")} · ${latestAlert.saveError}`}
                  </div>
                </div>
              ) : (
                <div className="signal-placeholder">
                  <span className="placeholder-ring" aria-hidden="true">!</span>
                  <p>{tr("live.waiting")}</p>
                  <small>{tr("live.waitingHint")}</small>
                </div>
              )}
            </Reveal>

            <Reveal as="article" className="card" delay={90}>
              <div className="card-heading-row">
                <div><p className="eyebrow">{tr("live.session")}</p><h2>{tr("live.detected")}</h2></div>
                <span className="session-count num">{savedCount}<small> / {alerts.length} {tr("live.saved")}</small></span>
              </div>
              {alerts.length === 0 ? <p className="empty-inline">{tr("live.waitingHint")}</p> : (
                <div className="alert-list">
                  {alerts.map((alert) => (
                    <div className="session-alert" key={alert.eventId}>
                      <div><b>{alert.type.replaceAll("_", " ")}</b><code>{alert.value}</code></div>
                      <span className={`mini-status mini-${alert.saveStatus}`}>{alert.saveStatus === "saved" ? "✓" : alert.saveStatus === "saving" ? "…" : "✕"}</span>
                    </div>
                  ))}
                </div>
              )}
            </Reveal>
          </aside>
        </section>

        <Reveal as="section" className="card timeline-card">
          <div className="card-heading-row">
            <div><p className="eyebrow">{tr("live.session")}</p><h2>{tr("live.timeline")}</h2></div>
            <span className="subtle-label num">{timeline.length} {tr("live.events")}</span>
          </div>
          {timeline.length === 0 ? <p className="empty-inline">{tr("live.emptyTimeline")}</p> : (
            <ol className="timeline">
              {timeline.map((event, index) => (
                <li key={`${event.t.getTime()}-${index}`}>
                  <time dateTime={event.t.toISOString()}>{event.t.toLocaleTimeString("en-IN")}</time>
                  <span>{event.text}</span>
                </li>
              ))}
            </ol>
          )}
        </Reveal>
      </div>
    </ConsoleShell>
  );
}
