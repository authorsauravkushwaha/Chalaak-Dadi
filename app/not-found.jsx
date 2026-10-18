import Link from "next/link";

export const metadata = { title: "Page not found — Chalaak Dadi" };

export default function NotFound() {
  return (
    <div className="center-screen" lang="en">
      <div>
        <div className="error-code">404</div>
        <h1>Page not found</h1>
        <p>The page you&rsquo;re looking for doesn&rsquo;t exist. It may have moved, or the link may be wrong.</p>
        <div className="rowflex" style={{ justifyContent: "center" }}>
          <Link className="btn btn-primary" href="/en">Go home</Link>
          <Link className="btn btn-outline" href="/hi">हिन्दी</Link>
          <Link className="btn btn-outline" href="/pa">ਪੰਜਾਬੀ</Link>
        </div>
      </div>
    </div>
  );
}
