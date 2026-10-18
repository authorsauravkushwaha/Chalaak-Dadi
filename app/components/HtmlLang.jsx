"use client";

import { useEffect } from "react";

/** Keeps <html lang> + font class in sync with the active route language. */
export default function HtmlLang({ lang }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
