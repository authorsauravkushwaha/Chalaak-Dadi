import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Chalaak Dadi — Scam Intelligence Console | SK Nexora",
  description: "AI-powered scam intelligence & financial fraud awareness prototype. Team SK Nexora, Srijan Setu 2026.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link className="brand" href="/">
            <span className="logo">👵</span>
            <span><b>Chalaak Dadi</b><small>Scam Intelligence Console</small></span>
          </Link>
          <span className="demobadge">🟠 DEMO MODE — Simulated Data</span>
          <nav className="main">
            <Link href="/">Dashboard</Link>
            <Link href="/live">🔴 Live Intelligence</Link>
            <Link href="/reports">Reports</Link>
            <Link href="/about">About &amp; Methodology</Link>
          </nav>
        </header>
        <main className="wrap">{children}</main>
        <footer>
          Chalaak Dadi — built by <b>Team SK Nexora</b> for <b>Srijan Setu 2026</b> · All demo records use entirely fictional data ·
          Extracted details are indicators (संकेत) requiring verification, never proof of guilt · In a real emergency call <b>1930</b> or visit cybercrime.gov.in
        </footer>
      </body>
    </html>
  );
}
