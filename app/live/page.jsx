"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/client.js";
import { SCENARIOS } from "../../lib/scenarios.js";
import { extractEntities, formatDuration } from "../../lib/intel.js";

export default function Live() {
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
        { t: new Date(), text: `Simulation started · ${selectedScenario.title}` },
        { t: new Date(), text: "Scripted transcript playback is ready · no audio or telephony is connected" },
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
            setTimeline((current) => [...current, { t: new Date(), text: `Pattern match detected · ${entity.type}` }]);

            const write = api(`/api/demo/${createdCall.id}/entity`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(entity),
            }).then(({ duplicate }) => {
              updateAlert(eventId, { saveStatus: "saved", duplicate });
              setTimeline((current) => [...current, {
                t: new Date(),
                text: duplicate ? `${entity.type} already exists on this call record` : `${entity.type} saved to the call record`,
              }]);
            }).catch((saveError) => {
              updateAlert(eventId, { saveStatus: "error", saveError: saveError.message });
              setError(`Could not save ${entity.type} to this call record: ${saveError.message}`);
              setTimeline((current) => [...current, { t: new Date(), text: `${entity.type} could not be saved` }]);
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
        : `Partial simulated transcript: ${shownRef.current.length} of ${scenario?.lines.length || 0} scripted lines played before the demonstration ended. The full scenario summary is omitted because the entire script was not played.`;
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
      setMsg("Simulation ended. The played transcript and successfully saved indicators are attached to this call record.");
      setTimeline((current) => [...current, { t: new Date(), text: "Simulation ended · call record saved" }]);
    } catch (endError) {
      setError(endError.message);
    }
    setBusy(false);
  }

  return (
    <div className="page-stack live-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow"><span className="eyebrow-mark" />Interactive demonstration</p>
          <h1>Live Intelligence</h1>
          <p className="page-lede">Watch a fictional conversation play line by line. Indicators are pattern-matched from the script and saved to the demo call record.</p>
        </div>
        <span className="pill demo page-heading-badge">SIMULATION · NO REAL CALL</span>
      </section>

      <div className="notice notice-warning simulation-notice"><span><b>Simulation only.</b> The caller, Dadi dialogue, values, and elapsed time are fictional. No voice agent, audio, or telephony provider is connected.</span></div>
      {error && <div className="notice notice-error" role="alert"><span><b>Action needs attention.</b> {error}</span></div>}
      {msg && <div className="notice notice-success" role="status"><span><b>{msg}</b> {call && <Link href={`/calls/${call.id}`}>Review this call <span aria-hidden="true">→</span></Link>}</span></div>}
      {scriptDone && <div className="notice notice-info" role="status"><span><b>Script playback complete.</b> End the simulation to save its final duration and record, or keep reviewing the captured indicators.</span></div>}

      <section className="stage-overview card" aria-label="Simulation controls and engagement timer">
        <div className="stage-copy">
          <p className="eyebrow">Demo control</p>
          <h2>Choose a scenario</h2>
          <p>Select a fictional script to see how the transcript and extracted indicators appear together.</p>
          <label className="field-label" htmlFor="scenario-select">Fictional scenario</label>
          <select id="scenario-select" value={scenarioId} onChange={(event) => setScenarioId(event.target.value)} disabled={running || busy}>
            {SCENARIOS.map((item) => <option key={item.id} value={item.id}>{item.title} — {item.titleHi}</option>)}
          </select>
          <div className="rowflex stage-actions">
            <button className="btn btn-primary" onClick={start} disabled={busy || running}><span aria-hidden="true">▶</span> Start demo call</button>
            <button className="btn btn-danger" onClick={end} disabled={busy || !running}><span aria-hidden="true">■</span> End demo</button>
            {call?.status === "ended" && <Link className="btn btn-outline" href={`/calls/${call.id}`}>Open saved call <span aria-hidden="true">→</span></Link>}
          </div>
        </div>

        <div className={`stage-clock ${running ? "stage-clock-running" : ""}`}>
          <div className="clock-heading"><span>Simulated engagement timer</span><span className={`pill ${running ? "in-progress" : "neutral"}`}>{running ? "RUNNING · SIMULATED" : call?.status === "ended" ? "ENDED" : "READY"}</span></div>
          <div className="timer" aria-live="off">{formatDuration(seconds)}</div>
          <p>Elapsed in this browser demonstration · not a real call duration</p>
          <div className="playback-row"><span>Script playback</span><b>{shown.length} / {scenario?.lines.length || SCENARIOS.find((item) => item.id === scenarioId)?.lines.length || 0} lines</b></div>
          <div className="playback-track" role="progressbar" aria-label="Script playback progress" aria-valuemin={0} aria-valuemax={scenario?.lines.length || SCENARIOS.find((item) => item.id === scenarioId)?.lines.length || 0} aria-valuenow={shown.length}>
            <i style={{ width: `${scenario?.lines.length ? (shown.length / scenario.lines.length) * 100 : 0}%` }} />
          </div>
        </div>
      </section>

      <section className="live-grid" aria-label="Simulation output">
        <article className="card transcript-card">
          <div className="card-heading-row transcript-heading">
            <div><p className="eyebrow">Conversation stream</p><h2>Scripted transcript</h2></div>
            <span className="pill demo">FICTIONAL</span>
          </div>
          <div className="chat">
            {shown.length === 0 && <div className="transcript-empty"><span className="empty-mark" aria-hidden="true">···</span><p>No transcript lines played yet.</p><span>Start the demo to reveal the fictional dialogue one line at a time.</span></div>}
            {shown.map((line, index) => (
              <div key={`${index}-${line.speaker}`} className={`bubble ${line.speaker === "Dadi" ? "dadi" : "caller"}`}>
                <small>{line.speaker === "Dadi" ? "Dadi · scripted response" : "Fictional caller"}</small>
                <span>{line.text}</span>
              </div>
            ))}
            <div ref={chatEnd} aria-hidden="true" />
          </div>
        </article>

        <aside className="signal-column">
          <article className="card latest-signal-card" aria-live="polite" aria-atomic="true">
            <div className="card-heading-row">
              <div><p className="eyebrow">Most recent match</p><h2>Indicator alert</h2></div>
              <span className="signal-mark" aria-hidden="true">!</span>
            </div>
            {latestAlert ? (
              <div key={latestAlert.eventId} className="signal-alert">
                <div className="signal-alert-top"><span className="signal-alert-label">INDICATOR CAPTURED</span><span className="pill demo">FICTIONAL VALUE</span></div>
                <span className="signal-type">{latestAlert.type.replaceAll("_", " ")}</span>
                <code className="signal-value">{latestAlert.value}</code>
                <div className={`save-state save-${latestAlert.saveStatus}`}>
                  <span className="save-state-dot" />
                  {latestAlert.saveStatus === "saving" && "Saving to this call record…"}
                  {latestAlert.saveStatus === "saved" && (latestAlert.duplicate ? "Already present on this call record" : "Saved to this call record")}
                  {latestAlert.saveStatus === "error" && `Not saved · ${latestAlert.saveError}`}
                </div>
              </div>
            ) : (
              <div className="signal-placeholder"><span className="placeholder-ring" aria-hidden="true">!</span><p>Waiting for a scripted indicator</p><small>When a pattern is matched, its fictional type and value appear here.</small></div>
            )}
          </article>

          <article className="card captured-card">
            <div className="card-heading-row">
              <div><p className="eyebrow">This session</p><h2>Detected indicators</h2></div>
              <span className="session-count">{savedCount}<small> / {alerts.length} saved</small></span>
            </div>
            {alerts.length === 0 ? <p className="empty-inline">No indicators detected yet.</p> : (
              <div className="alert-list">
                {alerts.map((alert) => (
                  <div className="session-alert" key={alert.eventId}>
                    <div><b>{alert.type.replaceAll("_", " ")}</b><code>{alert.value}</code></div>
                    <span className={`mini-status mini-${alert.saveStatus}`}>{alert.saveStatus === "saved" ? "SAVED" : alert.saveStatus === "saving" ? "SAVING" : "NOT SAVED"}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="risk-footnote">Values are demo-only. Verification is required; a match is not proof of wrongdoing.</p>
          </article>
        </aside>
      </section>

      <section className="card timeline-card">
        <div className="card-heading-row">
          <div><p className="eyebrow">Session events</p><h2>Activity timeline</h2></div>
          <span className="subtle-label">{timeline.length} {timeline.length === 1 ? "event" : "events"}</span>
        </div>
        {timeline.length === 0 ? <p className="empty-inline">Events will be recorded here when the simulation starts.</p> : (
          <ol className="timeline">
            {timeline.map((event, index) => <li key={`${event.t.getTime()}-${index}`}><time dateTime={event.t.toISOString()}>{event.t.toLocaleTimeString("en-IN")}</time><span>{event.text}</span></li>)}
          </ol>
        )}
      </section>
    </div>
  );
}
