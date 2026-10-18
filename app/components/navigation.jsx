"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LANGS, LANG_META } from "../../lib/i18n.js";

/**
 * Top bar: brand, desktop nav, trilingual language switcher (cookie-backed so
 * middleware can redirect "/" to the last language), mobile burger menu.
 */
export default function Navigation({ lang, labels }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // pathname for /hi/console/xyz -> base "/console"
  const base = pathname.replace(/^\/(en|hi|pa)(\/|$)/, "/").replace(/\/$/, "") || "/";

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.classList.toggle("nav-open", open);
    return () => document.body.classList.remove("nav-open");
  }, [open]);

  const items = [
    { href: `${langPath(lang)}`, label: labels.home, match: (p) => p === langPath(lang) },
    { href: `${langPath(lang)}/console`, label: labels.console, match: (p) => p.startsWith(`${langPath(lang)}/console`) },
    { href: `${langPath(lang)}/live`, label: labels.live, match: (p) => p.startsWith(`${langPath(lang)}/live`) },
    { href: `${langPath(lang)}/reports`, label: labels.reports, match: (p) => p.startsWith(`${langPath(lang)}/reports`) },
    { href: `${langPath(lang)}/about`, label: labels.about, match: (p) => p.startsWith(`${langPath(lang)}/about`) },
  ];

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link className="brand" href={langPath(lang)} aria-label="Chalaak Dadi">
          <span className="brand-mark" aria-hidden="true"><span>D</span><i /></span>
          <span className="brand-copy"><b>Chalaak Dadi</b><small>{labels.tagline}</small></span>
        </Link>

        <nav className="main-nav" aria-label="Main navigation">
          {items.map(({ href, label, match }) => (
            <Link key={href} href={href} className={match(pathname) ? "active" : undefined} aria-current={match(pathname) ? "page" : undefined}>
              {label}
            </Link>
          ))}
        </nav>

        <LangSwitch lang={lang} label={labels.langLabel} />
        <Link className="btn btn-small btn-primary nav-cta" href={`${langPath(lang)}/live`}>{labels.cta}</Link>

        <button className="nav-burger" aria-expanded={open} aria-label="Menu" onClick={() => setOpen((v) => !v)}>
          {open ? "✕" : "☰"}
        </button>
      </div>

      <div className={`mobile-nav${open ? " open" : ""}`}>
        {items.map(({ href, label, match }) => (
          <Link key={href} href={href} className={match(pathname) ? "active" : undefined}>{label}</Link>
        ))}
        <div style={{ marginTop: 26 }}>
          <LangSwitch lang={lang} label={labels.langLabel} />
        </div>
      </div>
    </header>
  );
}

function langPath(lang) {
  return `/${lang}`;
}

function LangSwitch({ lang, label }) {
  const idx = LANGS.indexOf(lang);
  return (
    <div className="lang-switch" role="group" aria-label={label} style={{ "--i": idx }}>
      <span className="lang-thumb" style={{ transform: `translateX(${idx * 100}%)` }} aria-hidden="true" />
      {LANGS.map((code) => (
        <Link
          key={code}
          href={`/${code}`}
          hrefLang={code}
          aria-current={code === lang ? "true" : undefined}
          onClick={() => {
            document.cookie = `${LANG_COOKIE}=${code};path=/;max-age=31536000;samesite=lax`;
          }}
          title={LANG_META[code].name}
        >
          {LANG_META[code].native}
        </Link>
      ))}
    </div>
  );
}
