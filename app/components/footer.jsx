import Link from "next/link";
import { t } from "../../lib/i18n.js";

export default function Footer({ lang }) {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link className="brand" href={`/${lang}`} aria-label="Chalaak Dadi">
            <span className="brand-mark" aria-hidden="true"><span>D</span><i /></span>
            <span className="brand-copy"><b>Chalaak Dadi</b><small>SK Nexora</small></span>
          </Link>
          <p>{t(lang, "footer.blurb")}</p>
          <p style={{ color: "var(--saffron-soft)" }}>
            {t(lang, "footer.emergency")} <a href="tel:1930" className="text-link">1930</a> ·{" "}
            <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer" className="text-link">cybercrime.gov.in</a>
          </p>
        </div>

        <div className="footer-links">
          <b>{t(lang, "nav.home")}</b>
          <Link href={`/${lang}`}>{t(lang, "console.secondary")}</Link>
          <Link href={`/${lang}/console`}>{t(lang, "nav.console")}</Link>
          <Link href={`/${lang}/live`}>{t(lang, "nav.live")}</Link>
          <Link href={`/${lang}/reports`}>{t(lang, "nav.reports")}</Link>
          <Link href={`/${lang}/about`}>{t(lang, "nav.about")}</Link>
        </div>

        <div className="footer-sos">
          <a className="btn btn-call" href="tel:1930">📞 1930</a>
          <a className="btn btn-outline" href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">
            {t(lang, "emergency.portal")} <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
      <div className="footer-base">
        <div className="footer-base-inner">
          <span>© {new Date().getFullYear()} Chalaak Dadi · Team SK Nexora · Srijan Setu 2026. {t(lang, "footer.rights")}</span>
          <span>English · हिन्दी · ਪੰਜਾਬੀ</span>
        </div>
      </div>
    </footer>
  );
}
