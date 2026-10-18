"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// WebGL is heavy — load it only after the page is interactive, client-side.
const Scene3D = dynamic(() => import("./Scene3D.jsx"), { ssr: false });

export default function HeroCanvas() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Respect data-saver + reduced motion; delay until the browser is idle.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const load = () => setReady(true);
    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(load, { timeout: 1800 });
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(load, 900);
    return () => clearTimeout(t);
  }, []);

  return <div className={`hero-canvas${ready ? " ready" : ""}`}>{ready && <Scene3D />}</div>;
}
