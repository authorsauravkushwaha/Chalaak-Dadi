import { LANGS, LANG_META } from "../../lib/i18n.js";
import HtmlLang from "../components/HtmlLang.jsx";

export const dynamicParams = false;
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return {
    title: {
      default: LANG_META[lang] ? `Chalaak Dadi — ${LANG_META[lang].name}` : "Chalaak Dadi",
      template: "%s · Chalaak Dadi",
    },
  };
}

export default async function LangLayout({ children, params }) {
  const { lang } = await params;
  return (
    <>
      <HtmlLang lang={lang} />
      {children}
    </>
  );
}
