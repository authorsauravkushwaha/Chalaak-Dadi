"use client";

import { useEffect, useRef, useState } from "react";

/**
 * DadiScroll — the sticky "how Dadi fights back" scrollytelling.
 * A 400vh track pins a 100vh stage; scroll progress (rAF-throttled) drives
 * which of the four steps is shown and morphs the orb visual per step.
 */
export default function DadiScroll({ kicker, title, lede, steps }) {
  const trackRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const stepCount = steps.length;

  useEffect(() => {
    let raf = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function measure() {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      setProgress(reduced ? 0 : p);
    }
    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    }
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const idx = Math.min(stepCount - 1, Math.floor(progress * stepCount));
  const step = steps[idx];
  const stepProgress = (progress * stepCount) - idx;

  const orbStyles = [
    { "--orb-a": "rgba(245,166,35,0.9)", "--orb-b": "rgba(255,109,109,0.3)", borderRadius: "50% 50% 50% 50%" },
    { "--orb-a": "rgba(45,212,191,0.85)", "--orb-b": "rgba(139,124,246,0.35)", borderRadius: "42% 58% 55% 45% / 55% 42% 58% 45%" },
    { "--orb-a": "rgba(139,124,246,0.85)", "--orb-b": "rgba(245,166,35,0.3)", borderRadius: "58% 42% 45% 55% / 45% 58% 42% 55%" },
    { "--orb-a": "rgba(74,222,128,0.8)", "--orb-b": "rgba(45,212,191,0.4)", borderRadius: "50%" },
  ];

  return (
    <section className="dadi-scroll" ref={trackRef} style={{ height: `${stepCount * 110}vh` }} aria-label={title}>
      <div className="dadi-sticky">
        <div className="dadi-progress" aria-hidden="true">
          {steps.map((s, i) => (
            <i key={s.tag} className={i <= idx ? "on" : ""} />
          ))}
        </div>

        <div className="dadi-stage" aria-hidden="true">
          <div className="dadi-orb-ring" />
          <div
            className="dadi-orb"
            style={{
              ...orbStyles[idx % orbStyles.length],
              transform: `translate(-50%, -50%) scale(${0.82 + stepProgress * 0.22}) rotate(${progress * 140}deg)`,
            }}
          />
          <div className="dadi-orb-label num">{`0${idx + 1} / 0${stepCount}`}</div>
        </div>

        <div className="dadi-step">
          <p className="section-kicker">{kicker}</p>
          <h2 style={{ marginTop: 0 }}>{title}</h2>
          <p className="section-lede" style={{ marginBottom: 26 }}>{lede}</p>
          <div key={step.tag} style={{ animation: "bubbleIn 0.55s cubic-bezier(0.2,0.6,0.2,1.1)" }}>
            <span className="dadi-step-num num">{`0${idx + 1}`}</span>
            <div>
              <span className="dadi-step-tag">{step.tag}</span>
            </div>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
