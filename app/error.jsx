"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="center-screen" style={{ minHeight: "80vh" }} lang="en">
      <div>
        <div className="error-code">!</div>
        <h1>Something went wrong</h1>
        <p>An error occurred while rendering this page. Your data is safe — please try again.</p>
        <div className="rowflex" style={{ justifyContent: "center" }}>
          <button className="btn btn-primary" onClick={reset}>↺ Retry</button>
          <Link className="btn btn-outline" href="/en">Go home</Link>
        </div>
      </div>
    </div>
  );
}
