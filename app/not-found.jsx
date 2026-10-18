import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-stack error-page">
      <section className="card error-panel">
        <p className="eyebrow">404 · Page not found</p>
        <h1>This view isn&apos;t here.</h1>
        <p className="page-lede">The page may have moved, or the link may be mistyped.</p>
        <div className="rowflex">
          <Link className="btn" href="/">Back to dashboard</Link>
          <Link className="btn btn-outline" href="/live">Open Live Intelligence</Link>
        </div>
      </section>
    </div>
  );
}
