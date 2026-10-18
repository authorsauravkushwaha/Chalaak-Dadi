"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LANG_COOKIE, LANGS, LANG_META } from "../../../lib/i18n.js";

const LS_KEY = "cd_lang_seen";

/**
 * LanguageGate — a first-visit, full-screen welcome that lets every visitor
 * pick English / हिन्दी / ਪੰਜਾਬੀ. The choice is stored (cookie + localStorage)
 * and never shown again in that browser. Skippable, dismissible, honest.
 */
export default function LanguageGate({ currentLang }) {
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = window.localStorage.getItem(LS_KEY) === "1" || document.cookie.includes(`${LANG_COOKIE}=`);
    } catch {
      seen = false;
    }
    if (!seen) {
      const t = setTimeout(() => setShow(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    document.body.classList.toggle("nav-open", show);
    return () => document.body.classList.remove("nav-open");
  }, [show]);

  function choose(code) {
    try {
      window.localStorage.setItem(LS_KEY, "1");
      document.cookie = `${LANG_COOKIE}=${code};path=/;max-age=31536000;samesite=lax`;
    } catch {
      /* storage blocked — navigation still works */
    }
    setShow(false);
    if (code !== currentLang) router.push(`/${code}`);
  }

  if (!show) return null;

  return (
    <div className="gate-overlay" role="dialog" aria-modal="true" aria-label="Choose your language">
      <div className="gate-card">
        <span className="gate-glow" aria-hidden="true" />
        <img src="/dadi-hero.png" alt="" className="gate-dadi" aria-hidden="true" />
        <p className="gate-eyebrow">Chalaak Dadi · चतुर दादी · ਚਤੁਰ ਦਾਦੀ</p>
        <h2 className="gate-title">
          <span lang="en">Choose your language</span>
          <span lang="hi">अपनी भाषा चुनें</span>
          <span lang="pa">ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ</span>
        </h2>
        <div className="gate-options">
          {LANGS.map((code) => (
            <button key={code} className="gate-option" onClick={() => choose(code)} lang={code}>
              <span className="gate-option-native">{LANG_META[code].native}</span>
              <span className="gate-option-sub">{LANG_META[code].name}</span>
            </button>
          ))}
        </div>
        <button className="gate-skip" onClick={() => choose(currentLang)}>
          Continue in {LANG_META[currentLang].name} →
        </button>
      </div>
    </div>
  );
}
