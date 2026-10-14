"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Top bar with real tabs.
 *
 * The demo used to be reached by a "Try an incident" button, which framed it as an optional
 * trial rather than half the site. It is a destination, so it gets a tab.
 */

const TABS = [
  { href: "/", label: "Overview" },
  { href: "/incidents", label: "Incidents" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-8 px-5 sm:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 py-3.5 transition-opacity hover:opacity-80"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand">
            <span className="h-2 w-2 rounded-full bg-white" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            On-Call Support Agent
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {TABS.map((tab) => {
            const active =
              tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`relative px-3 py-3.5 text-sm font-medium transition-colors ${
                  active ? "text-ink" : "text-ink-3 hover:text-ink-2"
                }`}
              >
                {tab.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
