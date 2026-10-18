"use client";

import { useRef } from "react";

/**
 * TiltCard — 3D perspective tilt that follows the cursor, plus a soft
 * light-glow that tracks the pointer. Disabled for touch and reduced motion.
 */
export default function TiltCard({ className = "", children, max = 7, ...rest }) {
  const ref = useRef(null);
  const frame = useRef(0);

  function onMove(e) {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (e.pointerType === "touch") return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.transform = `rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg) translateY(-4px)`;
      el.style.setProperty("--mx", `${px * 100}%`);
      el.style.setProperty("--my", `${py * 100}%`);
    });
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.style.transform = "";
  }

  return (
    <div
      ref={ref}
      className={`tilt ${className}`.trim()}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ transition: "transform 0.25s cubic-bezier(0.2,0.6,0.2,1.2)", transformStyle: "preserve-3d" }}
      {...rest}
    >
      {children}
    </div>
  );
}
