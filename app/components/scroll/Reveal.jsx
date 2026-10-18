"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reveal — fades/slides children in the first time they enter the viewport.
 * Uses one shared IntersectionObserver via the data attribute convention:
 * any element with [data-reveal] anywhere is picked up automatically.
 */
export default function Reveal({ as: Tag = "div", variant = "up", delay = 0, className = "", children, ...rest }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const variantClass = variant === "up" ? "" : ` reveal-${variant}`;
  return (
    <Tag ref={ref} className={`reveal${variantClass} ${className}`.trim()} style={{ "--reveal-delay": `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
}
