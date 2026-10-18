import { notFound } from "next/navigation";
import { LANGS, t } from "../../../lib/i18n.js";
import ConsoleShell from "../../components/ConsoleShell.jsx";
import Reveal from "../../components/scroll/Reveal.jsx";

export const dynamicParams = false;

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return { title: t(lang, "about.title") };
}

export default async function About({ params }) {
  const { lang } = await params;
  if (!LANGS.includes(lang)) notFound();
  const tr = (key) => t(lang, key);

  const sections = [
    { title: tr("about.s1Title"), body: <p>{tr("about.s1Body")}</p> },
    {
      title: tr("about.s2Title"),
      body: (
        <ol>
          <li>{tr("about.s2i1")}</li>
          <li>{tr("about.s2i2")}</li>
          <li>{tr("about.s2i3")}</li>
          <li>{tr("about.s2i4")}</li>
        </ol>
      ),
    },
    {
      title: tr("about.s3Title"),
      body: (
        <ul>
          <li>{tr("about.s3i1")}</li>
          <li>{tr("about.s3i2")}</li>
          <li>{tr("about.s3i3")}</li>
          <li>{tr("about.s3i4")}</li>
          <li>{tr("about.s3i5")}</li>
        </ul>
      ),
    },
    {
      title: tr("about.s4Title"),
      body: (
        <ul>
          <li>{tr("about.s4i1")}</li>
          <li>{tr("about.s4i2")}</li>
          <li>{tr("about.s4i3")}</li>
          <li>{tr("about.s4i4")}</li>
        </ul>
      ),
    },
  ];

  return (
    <ConsoleShell lang={lang}>
      <div className="page-stack">
        <Reveal as="section" className="page-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-mark" />{tr("about.kicker")}</p>
            <h1>{tr("about.title")}</h1>
            <p className="page-lede">{tr("about.lede")}</p>
          </div>
          <span className="pill demo page-heading-badge">{tr("common.prototypeBadge")}</span>
        </Reveal>

        <Reveal as="section" className="about-banner card">
          <div>
            <p className="eyebrow">{tr("about.bannerKicker")}</p>
            <h2>{tr("about.bannerTitle")}</h2>
            <p>{tr("about.bannerBody")}</p>
          </div>
        </Reveal>

        <div className="methodology-grid">
          {sections.map((section, index) => (
            <Reveal as="section" className="card methodology-card" key={section.title} delay={index * 80}>
              <div className="methodology-number num">0{index + 1}</div>
              <h2>{section.title}</h2>
              {section.body}
            </Reveal>
          ))}
        </div>

        <Reveal as="section" className="card help-card">
          <div>
            <p className="eyebrow">{tr("about.helpKicker")}</p>
            <h2>{tr("about.helpTitle")}</h2>
            <p>{tr("about.helpBody")}</p>
          </div>
          <div className="rowflex">
            <a className="btn btn-call" href="tel:1930">📞 1930</a>
            <a className="btn btn-outline" href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">{tr("emergency.portal")} <span aria-hidden="true">↗</span></a>
          </div>
        </Reveal>

        <p className="about-credit">{tr("about.credit")}</p>
      </div>
    </ConsoleShell>
  );
}
