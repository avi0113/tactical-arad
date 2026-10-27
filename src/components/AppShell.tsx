"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { ConfirmDialog } from "@/components/ui";
import { useOps } from "@/components/OpsProvider";

const LINKS = [
  { href: "/", label: "לוח בקרה" },
  { href: "/events", label: "אירועים" },
  { href: "/templates", label: "מאגר משימות" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { error, clearError, pending, mutate, state, reload } = useOps();
  const [resetOpen, setResetOpen] = useState(false);

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
          משימה במאגר ופעולה באירוע הן רשומות נפרדות. עריכה של אחת לא משנה את השנייה.
        </p>
        <button
          type="button"
          onClick={() => setResetOpen(true)}
          className="mt-4 text-xs text-ink-500 underline-offset-2 hover:underline"
        >
          שחזור נתוני דוגמה
        </button>
      </aside>
      <div className="min-w-0">
        {pending ? <div className="mb-3 h-0.5 overflow-hidden rounded-full bg-sand-200"><div className="h-full w-1/3 animate-pulse bg-clay-700" /></div> : null}
        {error ? (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-950 ring-1 ring-rose-200">
            <span>{error}</span>
            <button type="button" onClick={() => (state ? clearError() : void reload().catch(() => undefined))} className="shrink-0 font-medium">
              {state ? "סגירה" : "נסו שוב"}
            </button>
          </div>
        ) : null}
        <main>{children}</main>
      </div>
      {resetOpen ? (
        <ConfirmDialog
          title="שחזור נתוני דוגמה"
          body="הפעולה תמחק את האירועים ואת המשימות שנשמרו במערכת הזו, ותחזיר את המאגר ואת האירועים לדוגמה."
          confirmLabel="שחזור"
          onClose={() => setResetOpen(false)}
          onConfirm={() => {
            setResetOpen(false);
            void mutate("/api/reset", "POST").catch(() => undefined);
          }}
        />
      ) : null}
    </div>
  );
}
