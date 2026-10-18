import Navigation from "./navigation.jsx";
import Footer from "./footer.jsx";
import { t } from "../../lib/i18n.js";

/**
 * Shared chrome for the console pages (dashboard / live / reports / calls /
 * about): top bar, centered main column, footer. The landing page composes
 * its own hero-first layout instead.
 */
export default function ConsoleShell({ lang, children }) {
  return (
    <div className="console-shell" lang={lang}>
      <Navigation lang={lang} labels={{ ...t(lang, "nav"), tagline: t(lang, "brand.tagline") }} />
      <main>{children}</main>
      <Footer lang={lang} />
    </div>
  );
}
