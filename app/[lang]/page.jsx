import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { LANGS, LANG_META, t } from "../../lib/i18n.js";
import Navigation from "../components/navigation.jsx";
import Footer from "../components/footer.jsx";
import HeroCanvas from "../components/three/HeroCanvas.jsx";
import Reveal from "../components/scroll/Reveal.jsx";
import CountUp from "../components/scroll/CountUp.jsx";
import TiltCard from "../components/scroll/TiltCard.jsx";
import DadiScroll from "../components/scroll/DadiScroll.jsx";
import LanguageGate from "../components/scroll/LanguageGate.jsx";

export const dynamicParams = false;
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const title = {
    en: "Chalaak Dadi — Scam Intelligence Console | The nation's shield against cyber fraud",
    hi: "चतुर दादी — स्कैम इंटेलिजेंस कंसोल | साइबर ठगी के खिलाफ देश का कवच",
    pa: "ਚਤੁਰ ਦਾਦੀ — ਸਕੈਮ ਇੰਟੈਲੀਜੈਂਸ ਕੰਸੋਲ | ਸਾਈਬਰ ਠੱਗੀ ਵਿਰੁੱਧ ਦੇਸ਼ ਦਾ ਕਵਚ",
  }[lang];
  const description = t(lang, "hero.lede");
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}`,
      languages: { en: "/en", hi: "/hi", pa: "/pa", "x-default": "/en" },
    },
    openGraph: { title, description, images: ["/dadi-hero.jpg"] },
  };
}

/* Inline icons (no icon library — zero extra payload) */
const Icon = {
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
  ),
  warn: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 2 .6 3 .7a2 2 0 0 1 1.6 2z" /></svg>
  ),
  radar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /><path d="M12 2v4" /></svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m7 13 3-3 4 4 5-6" /></svg>
  ),
  doc: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h8" /></svg>
  ),
  globe: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
  ),
};

export default async function Landing({ params }) {
  const { lang } = await params;
  if (!LANGS.includes(lang)) notFound();
  const meta = LANG_META[lang];

  const dadiSteps = [1, 2, 3, 4].map((n) => ({
    tag: t(lang, `dadi.step${n}.tag`),
    title: t(lang, `dadi.step${n}.title`),
    body: t(lang, `dadi.step${n}.body`),
  }));
  const scamKeys = ["c1", "c2", "c3", "c4", "c5", "c6"];
  const crisisStats = [1, 2, 3, 4].map((n) => ({
    label: t(lang, `crisis.s${n}.label`),
    value: t(lang, `crisis.s${n}.value`),
    note: t(lang, `crisis.s${n}.note`),
  }));

  return (
    <div className="landing" lang={lang}>
      <Navigation lang={lang} labels={{ ...t(lang, "nav"), tagline: t(lang, "brand.tagline") }} />
      <LanguageGate currentLang={lang} />

      <main id="main">
        {/* ================= HERO ================= */}
        <section className="hero" aria-label={t(lang, "hero.titleA")}>
          <div className="hero-bg" />
          <div className="hero-grid-lines" />
          <HeroCanvas />

          <div className="hero-inner">
            <div className="hero-copy">
              <span className="hero-badge"><i aria-hidden="true" />{t(lang, "hero.badge")}</span>
              <p className="eyebrow"><span className="eyebrow-mark" />{t(lang, "hero.eyebrow")}</p>
              <h1>
                {t(lang, "hero.titleA")}<br />
                <em>{t(lang, "hero.titleEm")}</em>
              </h1>
              <p className="hero-lede">{t(lang, "hero.lede")}</p>
              <div className="hero-actions">
                <a className="btn btn-primary btn-big" href="#crisis">{t(lang, "hero.ctaPrimary")} <span aria-hidden="true">↓</span></a>
                <Link className="btn btn-outline btn-big" href={`/${lang}/console`}>{t(lang, "hero.ctaSecondary")}</Link>
              </div>
              <div className="hero-chips">
                {[t(lang, "hero.chip1"), t(lang, "hero.chip2"), t(lang, "hero.chip3")].map((chip) => (
                  <span className="hero-chip" key={chip}>{Icon.check}{chip}</span>
                ))}
              </div>
            </div>

            <Reveal variant="right" className="hero-figure" delay={150}>
              <div className="figure-halo" aria-hidden="true" />
              <Image src="/dadi-hero.jpg" alt="" width={1024} height={1536} priority fetchPriority="high" sizes="(max-width: 900px) 0px, 400px" />
              <div className="figure-tag figure-tag-1">
                <b>{t(lang, "dadi.step1.tag")}</b>
                <small>{t(lang, "dadi.step1.title")}</small>
              </div>
              <div className="figure-tag figure-tag-2">
                <b>UPI · OTP · IFSC</b>
                <small>{t(lang, "dadi.step3.tag")}</small>
              </div>
            </Reveal>
          </div>

          <div className="scroll-cue" aria-hidden="true">
            <span>{t(lang, "hero.scrollCue")}</span>
            <span className="cue-track" />
          </div>
        </section>

        {/* ================= CRISIS STATS ================= */}
        <section className="section crisis-band" id="crisis" aria-labelledby="crisis-title">
          <div className="wrap">
            <Reveal>
              <p className="section-kicker">{t(lang, "crisis.kicker")}</p>
              <h2 id="crisis-title">{t(lang, "crisis.title")}</h2>
              <p className="section-lede">{t(lang, "crisis.lede")}</p>
            </Reveal>
            <div className="stat-grid">
              <Reveal className="stat-cell" delay={0}>
                <div className="stat-label">{crisisStats[0].label}</div>
                <div className="stat-value">
                  <CountUp value={22845.73} decimals={2} prefix="₹" suffix="" />
                  <span className="unit"> {lang === "en" ? "crore" : crisisStats[0].value.split(" ").slice(1).join(" ")}</span>
                </div>
                <p className="stat-note">{crisisStats[0].note}</p>
              </Reveal>
              <Reveal className="stat-cell" delay={90}>
                <div className="stat-label">{crisisStats[1].label}</div>
                <div className="stat-value">
                  <CountUp value={36.37} decimals={2} suffix="" />
                  <span className="unit"> {lang === "en" ? "lakh" : crisisStats[1].value.split(" ").slice(1).join(" ")}</span>
                </div>
                <p className="stat-note">{crisisStats[1].note}</p>
              </Reveal>
              <Reveal className="stat-cell" delay={180}>
                <div className="stat-label">{crisisStats[2].label}</div>
                <div className="stat-value">
                  <CountUp value={22.68} decimals={2} suffix="" />
                  <span className="unit"> {lang === "en" ? "lakh" : crisisStats[2].value.split(" ").slice(1).join(" ")}</span>
                </div>
                <p className="stat-note">{crisisStats[2].note}</p>
              </Reveal>
              <Reveal className="stat-cell" delay={270}>
                <div className="stat-label">{crisisStats[3].label}</div>
                <div className="stat-value">
                  <CountUp value={1935.5} decimals={1} prefix="₹" suffix="" />
                  <span className="unit"> {lang === "en" ? "crore" : crisisStats[3].value.split(" ").slice(1).join(" ")}</span>
                </div>
                <p className="stat-note">{crisisStats[3].note}</p>
              </Reveal>
            </div>
            <Reveal><p className="stat-source">{t(lang, "crisis.source")}</p></Reveal>
          </div>
        </section>

        {/* ================= PLAYBOOK ================= */}
        <section className="section" aria-labelledby="playbook-title">
          <div className="wrap">
            <Reveal>
              <p className="section-kicker">{t(lang, "playbook.kicker")}</p>
              <h2 id="playbook-title">{t(lang, "playbook.title")}</h2>
              <p className="section-lede">{t(lang, "playbook.lede")}</p>
            </Reveal>
            <div className="playbook-grid">
              {scamKeys.map((key, i) => (
                <Reveal key={key} delay={i * 70} variant="zoom">
                  <TiltCard className="scam-card">
                    <span className="scam-index num" aria-hidden="true">{`0${i + 1}`}</span>
                    <div className="scam-name">{Icon.warn}{t(lang, `playbook.card.${key}.name`)}</div>
                    <p className="scam-hook">{t(lang, `playbook.card.${key}.hook`)}</p>
                    <p className="scam-flags">{Icon.check}<span>{t(lang, `playbook.card.${key}.flags`)}</span></p>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ================= DADI SCROLLYTELLING ================= */}
        <DadiScroll
          kicker={t(lang, "dadi.kicker")}
          title={t(lang, "dadi.title")}
          lede={t(lang, "dadi.lede")}
          steps={dadiSteps}
        />

        {/* ================= EMERGENCY ================= */}
        <section className="emergency-band" aria-labelledby="sos-title">
          <div className="emergency-inner">
            <Reveal variant="left" className="emergency-copy">
              <p className="section-kicker" style={{ color: "#ffb3b3" }}>SOS</p>
              <h2 id="sos-title">{t(lang, "emergency.title")}</h2>
              <p>{t(lang, "emergency.body")}</p>
            </Reveal>
            <Reveal variant="right" className="emergency-actions" delay={120}>
              <a className="btn btn-call" href="tel:1930">{Icon.phone}{t(lang, "emergency.call")}</a>
              <a className="btn btn-outline" href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">{t(lang, "emergency.portal")} <span aria-hidden="true">↗</span></a>
              <span className="emergency-hint">{t(lang, "emergency.hint")}</span>
            </Reveal>
          </div>
        </section>

        {/* ================= CONSOLE PREVIEW ================= */}
        <section className="section console-preview" aria-labelledby="preview-title">
          <div className="wrap">
            <Reveal>
              <p className="section-kicker">{t(lang, "console.kicker")}</p>
              <h2 id="preview-title">{t(lang, "console.title")}</h2>
              <p className="section-lede">{t(lang, "console.lede")}</p>
            </Reveal>
            <div className="preview-grid">
              {[["b1", Icon.chart], ["b2", Icon.radar], ["b3", Icon.doc], ["b4", Icon.globe]].map(([key, icon], i) => (
                <Reveal key={key} delay={i * 80}>
                  <TiltCard className="preview-card" max={5}>
                    <div className="preview-icon" aria-hidden="true">{icon}</div>
                    <h3>{t(lang, `console.${key}.title`)}</h3>
                    <p>{t(lang, `console.${key}.body`)}</p>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
            <Reveal className="preview-cta" delay={200}>
              <Link className="btn btn-primary btn-big" href={`/${lang}/console`}>{t(lang, "console.cta")} <span aria-hidden="true">→</span></Link>
              <a className="text-link" href="#top" onClick={undefined}>{t(lang, "console.secondary")}</a>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer lang={lang} />
    </div>
  );
}
