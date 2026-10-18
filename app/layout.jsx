import "./globals.css";
import Link from "next/link";
import Navigation from "./components/navigation.jsx";

export const metadata = {
  title: "Chalaak Dadi — Cybersecurity Intelligence Console",
  description: "An honest, interactive scam-awareness simulation by Team SK Nexora. Fictional scenarios, transparent indicators, and records for human review.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <Link className="brand" href="/" aria-label="Chalaak Dadi dashboard">
              <span className="brand-mark" aria-hidden="true"><span>D</span><i /></span>
              <span className="brand-copy"><b>Chalaak Dadi</b><small>Cybersecurity intelligence</small></span>
            </Link>
            <div className="workspace-status"><span className="status-dot" />Simulation workspace</div>
            <Navigation />
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="site-footer">
          <p><b>Chalaak Dadi</b> · Team SK Nexora · Srijan Setu 2026</p>
          <p>Prototype only. No real calls are made or reports filed. Extracted indicators need human verification and are not proof of guilt.</p>
          <p>In a real cyber-fraud emergency in India, call <a href="tel:1930">1930</a> or visit <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">cybercrime.gov.in</a>.</p>
        </footer>
      </body>
    </html>
  );
}
