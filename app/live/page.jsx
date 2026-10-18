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
  const [shown, setShown] = useState([]);       // transcript lines revealed so far
  const [alerts, setAlerts] = useState([]);      // entity alerts
  const [timeline, setTimeline] = useState([]);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const timers = useRef([]);
  const shownRef = useRef([]);        // synchronous mirror of `shown` (state updates are async)
  const secondsRef = useRef(0);
  const entityWrites = useRef([]);    // in-flight entity POSTs, flushed before ending the call
  const running = !!call && call.status === "live";
  const scriptDone = running && scenario && shown.length >= scenario.lines.length;

  const clearTimers = () => { timers.current.forEach(clearInterval); timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => clearTimers(), []);

  async function start() {
    setBusy(true); setError(""); setMsg(""); clearTimers();
    setShown([]); setAlerts([]); setTimeline([]); setSeconds(0);
    shownRef.current = []; secondsRef.current = 0; entityWrites.current = [];
    try {
      const { call: c, scenario: s } = await api("/api/demo/start", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenarioId }),
      });
      setCall(c); setScenario(s);
      setTimeline([{ t: new Date(), text: `📞 Simulated incoming call connected — ${s.title}` }, { t: new Date(), text: "👵 Dadi voice agent engaged (Demo Adapter — no real telephony)" }]);
      // engagement timer
      timers.current.push(setInterval(() => { secondsRef.current += 1; setSeconds(secondsRef.current); }, 1000));
      // stream the simulated transcript; save each discovered entity to the database
      s.lines.forEach((line, i) => {
        timers.current.push(setTimeout(() => {
          shownRef.current = [...shownRef.current, line];
          setShown(shownRef.current);
          for (const e of extractEntities(line.text)) {
            setAlerts((prev) => prev.some((a) => a.type === e.type && a.value.toLowerCase() === e.value.toLowerCase()) ? prev : [...prev, { ...e, at: new Date() }]);
            setTimeline((prev) => [...prev, { t: new Date(), text: `🚨 Indicator captured: ${e.type} = ${e.value}` }]);
            entityWrites.current.push(
              api(`/api/demo/${c.id}/entity`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(e) }).catch(() => {})
            );
          }
        }, 1400 + i * 2300));
      });
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  async function end() {
    if (!call) return;
    setBusy(true);
    clearTimers();
    try {
      // Wait for entity writes to land first, otherwise the saved record
      // could miss indicators that were already shown on screen.
      await Promise.allSettled(entityWrites.current);
      // Honest record: save only the lines that were actually revealed.
      // (Previously the *full* script was stored even if the user ended
      // the demo after two lines.)
      const transcript = shownRef.current.map((l) => `${l.speaker}: ${l.text}`).join("\n");
      const { call: ended } = await api(`/api/demo/${call.id}/end`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration_sec: secondsRef.current, transcript, summary: scenario.summary, category: scenario.category, risk_score: scenario.risk }),
      });
      setCall(ended);
      setMsg("✅ Demo call ended and saved to the database. Open the call detail to generate a complaint draft.");
      setTimeline((prev) => [...prev, { t: new Date(), text: "🏁 Call ended — record saved for review" }]);
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  return (
    <>
      <h1>🔴 Live Intelligence</h1>
      <p className="sub">Watch Dadi keep a suspected scammer busy while the console extracts fraud indicators in real time.</p>
      <div className="warn">🟠 <b>DEMO MODE:</b> This is a <b>simulated</b> call using entirely fictional data. The voice agent below is a clearly-labelled <b>Demo Adapter</b> — no real phone call, telephony provider or live AI voice is connected in this prototype.</div>
      {error && <div className="err">⚠️ {error}</div>}
      {msg && <div className="ok">{msg} {call && <Link href={`/calls/${call.id}`}>View this call →</Link>}</div>}
      {scriptDone && <div className="ok">📜 The full scripted conversation has played out. Press <b>⏹ End Demo</b> to save the record, then draft the complaint.</div>}

      <div className="grid g3">
        <div className="card">
          <h2>👵 Dadi Voice Agent</h2>
          <div className="micwrap">
            <div className={`mic ${running ? "on" : ""}`}>🎙️</div>
            <b>{running ? "Dadi is talking… चालाकी चल रही है" : "Agent idle"}</b>
            <span className="small muted">Demo Adapter · Hindi/Hinglish persona · Real voice/telephony integration is a future step (see About)</span>
          </div>
          <div className="timer">{formatDuration(seconds)}</div>
          <p className="small muted" style={{ textAlign: "center" }}>Engagement timer — every second here is a second the scammer is <b>not</b> calling a real victim {running && <span className="pill demo">SIMULATED</span>}</p>
          <label>Choose a fictional scenario</label>
          <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)} disabled={running} style={{ width: "100%", margin: "6px 0 12px" }}>
            {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.title} — {s.titleHi}</option>)}
          </select>
          <div className="rowflex">
            <button className="btn green" onClick={start} disabled={busy || running}>▶ Start Demo Call</button>
            <button className="btn danger" onClick={end} disabled={busy || !running}>⏹ End Demo</button>
          </div>
          {call && call.status === "ended" && <p style={{ marginTop: 12 }}><Link className="btn" href={`/calls/${call.id}`}>📄 Open Call &amp; Draft Complaint</Link></p>}
        </div>

        <div className="card">
          <h2>💬 {running || shown.length ? "Simulated transcript" : "Transcript"}</h2>
          <div className="chat">
            {shown.length === 0 && <p className="muted small">No conversation yet. Press <b>Start Demo Call</b> — the fictional transcript will stream here line by line, exactly as a live transcript would.</p>}
            {shown.map((l, i) => (
              <div key={i} className={`bubble ${l.speaker === "Dadi" ? "dadi" : "caller"}`}><small>{l.speaker === "Dadi" ? "👵 Dadi (AI Agent)" : "📞 Suspected Scammer (Fictional)"}</small>{l.text}</div>
            ))}
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h2>🚨 New entity alerts</h2>
            {alerts.length === 0 && <p className="muted small">No indicators captured yet in this session.</p>}
            {alerts.map((a, i) => <div key={i} className="alertitem"><b>{a.type}</b> · <span className="mono">{a.value}</span><br /><span className="muted">{Math.round(a.confidence * 100)}% confidence · saved to database · आरोप — verification required</span></div>)}
          </div>
          <div className="card">
            <h2>🕐 Event timeline</h2>
            {timeline.length === 0 ? <p className="muted small">Events will appear here.</p> : (
              <ul className="timeline">{timeline.map((t, i) => <li key={i}><b>{t.t.toLocaleTimeString("en-IN")}</b> — {t.text}</li>)}</ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
