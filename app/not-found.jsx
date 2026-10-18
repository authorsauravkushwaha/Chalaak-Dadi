import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <h1>🔍 Page not found</h1>
      <p className="sub">This page doesn&apos;t exist — the call may have been moved, or the link is mistyped.</p>
      <div className="rowflex">
        <Link className="btn" href="/">← Back to Dashboard</Link>
        <Link className="btn ghost" href="/live">🔴 Live Intelligence</Link>
      </div>
    </>
  );
}
