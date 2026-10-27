import Link from "next/link";
import { actionStatusLabel } from "@/lib/constants";
import { demo } from "@/lib/seed";
import { actionProgress, attentionActions, isLiveEvent, nextOpenAction, sortEvents } from "@/lib/stats";
import { EventStatusPill, PageIntro, PriorityPill, ProgressBar } from "@/components/ui";

export function DashboardView() {
  const live = sortEvents(demo.events.filter(isLiveEvent));
  const openActions = demo.events
    .filter(isLiveEvent)
    .reduce((sum, event) => sum + event.actions.filter((action) => action.status !== "done").length, 0);
  const blocked = demo.events.reduce((sum, event) => sum + event.actions.filter((action) => action.status === "blocked").length, 0);
  const attention = attentionActions(demo);

  return (
    <div>
      <PageIntro
        kicker="חדר מצב"
        title="מה פתוח עכשיו"
        text="תצוגה של אירועי דוגמה והפעולות שעדיין מופיעות בהם. אי אפשר לערוך או לשמור בשלב זה."
      />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="אירועים פעילים" value={live.length} />
        <Stat label="פעולות שטרם הושלמו" value={openActions} />
        <Stat label="פעולות חסומות" value={blocked} />
        <Stat label="משימות במאגר" value={demo.templates.length} />
      </section>
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
        <section>
          <h2 className="mb-3 text-sm font-medium text-ink-500">אירועים פעילים</h2>
          <div className="space-y-3">
            {live.map((event) => {
              const progress = actionProgress(event.actions);
              const next = nextOpenAction(event);
              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="block rounded-3xl bg-white p-4 shadow-card ring-1 ring-sand-200 transition hover:ring-clay-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold leading-snug">{event.title}</h3>
                      <p className="mt-1 text-sm text-ink-500">
                        {event.location || "ללא מיקום"}
                        {event.commander ? ` · ${event.commander}` : ""}
                      </p>
                    </div>
                    <EventStatusPill value={event.status} />
                  </div>
                  <div className="mt-4">
                    <ProgressBar value={progress.done} max={progress.total} />
                    <p className="mt-2 text-sm text-ink-700">
                      {progress.done} מתוך {progress.total} פעולות הושלמו
                      {next ? ` · הבאה: ${next.title}` : ""}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-sm font-medium text-ink-500">דורש טיפול</h2>
          <div className="space-y-2">
            {attention.map(({ event, action }) => (
              <Link
                key={`${event.id}-${action.id}`}
                href={`/events/${event.id}`}
                className="block rounded-2xl bg-white p-3 ring-1 ring-sand-200 hover:ring-clay-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{action.title}</span>
                  <PriorityPill value={action.priority} />
                </div>
                <p className="mt-1 text-xs text-ink-500">
                  {event.title} · {actionStatusLabel[action.status]}
                  {action.status === "blocked" && action.notes ? ` · ${action.notes}` : ""}
                </p>
              </Link>
            ))}
          </div>
          <Link href="/templates" className="mt-4 block text-sm font-medium text-clay-700">
            למאגר המשימות ({demo.templates.length})
          </Link>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-white px-4 py-3 shadow-card ring-1 ring-sand-200">
      <div className="text-sm text-ink-500">{label}</div>
      <div className="mt-1 font-display text-4xl tabular-nums leading-none">{value}</div>
    </div>
  );
}
