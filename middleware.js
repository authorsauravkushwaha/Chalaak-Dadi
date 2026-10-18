import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { LANGS, DEFAULT_LANG, LANG_COOKIE } from "./lib/i18n.js";

/**
 * Route-based language negotiation.
 *   /            -> redirect to the best language route (/en, /hi, /pa)
 *   /console/... -> /en/console/... (cookie preferred, then Accept-Language)
 * Only page routes are redirected; /api, /_next and files pass through.
 */
export function middleware(req) {
  const { pathname, search } = req.nextUrl;

  const seg = pathname.split("/")[1];
  if (LANGS.includes(seg)) return NextResponse.next();

  const cookieLang = req.cookies.get(LANG_COOKIE)?.value;
  const pref =
    (cookieLang && LANGS.includes(cookieLang) && cookieLang) ||
    negotiate(req.headers.get("accept-language")) ||
    DEFAULT_LANG;

  const url = req.nextUrl.clone();
  url.pathname = `/${pref}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

/** Pick the first supported language out of an Accept-Language header. */
function negotiate(header) {
  if (!header) return null;
  const wanted = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.trim().toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of wanted) {
    if (tag.startsWith("hi")) return "hi";
    if (tag.startsWith("pa")) return "pa";
    if (tag.startsWith("en")) return "en";
    if (tag.startsWith("zh") || tag.startsWith("es") || tag.startsWith("fr")) continue;
  }
  return null;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
