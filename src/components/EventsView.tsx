import Link from "next/link";
import { demo } from "@/lib/seed";
import { actionProgress, sortEvents } from "@/lib/stats";
import { formatWhen } from "@/lib/time";
import { EventStatusPill, PageIntro, PriorityPill, ProgressBar } from "@/components/ui";

export function EventsView() {
  const events = sortEvents(demo.events);

  return (
    <div>
      <PageIntro
        kicker="אירועים"
        title="כל האירועים"
        text="לכל אירוע מוצגת רשימת הפעולות שלו. זו דוגמה קבועה, בלי יצירה או מחיקה."
      />
      <div className="space-y-3">
        {events.map((event) => {
          const progress = actionProgress(event.actions);
          return (
            <article key={event.id} className="rounded-3xl bg-white p-4 shadow-card ring-1 ring-sand-200">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/events/${event.id}`} className="text-lg font-semibold hover:text-clay-700">
                    {event.title}
                  </Link>
                  <p className="mt-1 text-sm text-ink-500">
                    {event.eventType}
                    {event.location ? ` · ${event.location}` : ""}
                    {event.commander ? ` · ${event.commander}` : ""}
                    {" · "}
                    {formatWhen(event.startedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <PriorityPill value={event.severity} />
                  <EventStatusPill value={event.status} />
                </div>
              </div>
              <div className="mt-4">
                <ProgressBar value={progress.done} max={progress.total} />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-ink-700">
                    {progress.done} מתוך {progress.total} פעולות הושלמו
                    {progress.blocked ? ` · ${progress.blocked} חסומות` : ""}
                  </p>
                  <Link href={`/events/${event.id}`} className="rounded-lg bg-ink-900 px-3 py-2 text-sm text-sand-50">
                    לרשימת הפעולות
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
