"use client";
import Link from "next/link";

export default function Error({ error, reset }) {
  return (
    <>
      <h1>⚠️ Something went wrong</h1>
      <p className="sub">{error?.message || "An unexpected error occurred while loading this page."}</p>
      <div className="rowflex">
        <button className="btn" onClick={() => reset()}>↻ Try again</button>
        <Link className="btn ghost" href="/">← Back to Dashboard</Link>
      </div>
    </>
  );
}
