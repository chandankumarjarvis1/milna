"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/explore", label: "Explore" },
  { href: "/talk", label: "Talk" },
  { href: "/cafes", label: "Cafes" },
  { href: "/me", label: "Me" },
];

export default function Nav({ pendingRequests }: { pendingRequests: number }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-ink/15 bg-paper/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-2xl">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center py-3 text-sm font-semibold ${
                  active ? "text-ink" : "text-ink/55"
                }`}
              >
                {t.label}
                {t.href === "/talk" && pendingRequests > 0 ? (
                  <span className="absolute right-[22%] top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-xs text-white">
                    {pendingRequests}
                  </span>
                ) : null}
                <span
                  className={`mt-1 h-1 w-6 rounded-full ${active ? "bg-marigold" : "bg-transparent"}`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
