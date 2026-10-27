"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/", label: "לוח בקרה" },
  { href: "/events", label: "אירועים" },
  { href: "/templates", label: "מאגר משימות" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-6 px-4 py-5 md:grid-cols-[13.5rem_minmax(0,1fr)] md:gap-10 md:px-6 md:py-8">
      <aside className="md:sticky md:top-8 md:self-start">
        <div className="mb-5">
          <div className="font-display text-4xl leading-none">ערד</div>
          <p className="mt-1 text-sm text-ink-500">ניהול משימות מבצעיות</p>
        </div>
        <nav className="flex gap-2 overflow-x-auto md:flex-col">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-2 text-sm",
                  active ? "bg-ink-900 text-sand-50" : "text-ink-700 hover:bg-white",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <p className="mt-6 hidden text-xs leading-5 text-ink-500 md:block">
          תצוגה לדוגמה בלבד. אין שמירה ואין חיבור למאגר נתונים.
        </p>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
