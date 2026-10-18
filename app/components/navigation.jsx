"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/live", label: "Live Intelligence" },
  { href: "/reports", label: "Reports" },
  { href: "/about", label: "About & Methodology" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="main-nav" aria-label="Main navigation">
      {ITEMS.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
