"use client";

import Link from "next/link";

export default function Error({ error, reset }) {
  return (
    <div className="page-stack error-page">
      <section className="card error-panel">
        <p className="eyebrow">Unexpected application error</p>
        <h1>We couldn&apos;t load this view.</h1>
        <p className="page-lede">{error?.message || "An unexpected error occurred while loading this page."}</p>
        <div className="rowflex">
          <button className="btn" onClick={() => reset()}>Try again</button>
          <Link className="btn btn-outline" href="/">Back to dashboard</Link>
        </div>
      </section>
    </div>
  );
}
