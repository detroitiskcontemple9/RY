"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/donations", label: "Donations" },
  { href: "/admin/pledges", label: "Pledges" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto text-sm -mx-1">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md px-2.5 py-1.5 whitespace-nowrap ${active ? "bg-white/15 font-semibold" : "text-white/75 hover:text-white"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
