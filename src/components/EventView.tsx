import Link from "next/link";
import { actionStatusLabel } from "@/lib/constants";
import { demo } from "@/lib/seed";
import { actionProgress, actionSignature, orderedActions, templateSignature } from "@/lib/stats";
import { formatMinutes, formatWhen } from "@/lib/time";
import type { EventAction, TaskTemplate } from "@/lib/types";
import { ActionStatusPill, PageIntro, PriorityPill, ProgressBar } from "@/components/ui";

export function EventView({ eventId }: { eventId: string }) {
  const event = demo.events.find((item) => item.id === eventId);
  if (!event) {
    return (
      <div>
        <PageIntro title="האירוע לא נמצא" text="אין אירוע כזה בנתוני הדוגמה." />
        <Link href="/events" className="text-sm font-medium text-clay-700">
          חזרה לאירועים
        </Link>
      </div>
    );
  }

  const actions = orderedActions(event);
  const progress = actionProgress(actions);

  return (
    <div>
      <Link href="/events" className="text-sm text-ink-500 hover:text-ink-900">
        כל האירועים
      </Link>
      <header className="mt-3 rounded-3xl bg-white p-5 shadow-card ring-1 ring-sand-200">
        <p className="text-sm font-medium text-clay-700">{event.eventType}</p>
        <h1 className="mt-1 font-display text-4xl leading-tight">{event.title}</h1>
        {event.description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-700">{event.description}</p> : null}
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="מיקום" value={event.location || "לא צוין"} />
          <Meta label="אחראי" value={event.commander || "לא צוין"} />
          <Meta label="התחלה" value={formatWhen(event.startedAt)} />
          <Meta label="סטטוס" value={event.status === "in_progress" ? "בביצוע" : event.status === "open" ? "פתוח" : event.status === "completed" ? "הושלם" : "בוטל"} />
        </dl>
      </header>
      <section className="mt-6">
        <h2 className="font-display text-3xl">פעולות נדרשות לביצוע</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-700">
          הרשימה שייכת לאירוע הזה. כשהנוסח שונה מהמשימה במאגר, זה מסומן על הפעולה. בתצוגה הזו אי אפשר לסמן ביצוע או לערוך.
        </p>
        <div className="mb-4 mt-4 rounded-3xl bg-white px-4 py-3 ring-1 ring-sand-200">
          <ProgressBar value={progress.done} max={progress.total} />
          <p className="mt-2 text-sm text-ink-700">
            {progress.done} מתוך {progress.total} הושלמו · {progress.pending} ממתינות · {progress.active} בביצוע · {progress.blocked} חסומות
          </p>
        </div>
        <div className="space-y-3">
          {actions.map((action) => (
            <ActionCard key={action.id} action={action} templates={demo.templates} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-500">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function ActionCard({ action, templates }: { action: EventAction; templates: TaskTemplate[] }) {
  const origin = action.templateId ? templates.find((template) => template.id === action.templateId) : undefined;
  const diverged = origin ? templateSignature(origin) !== actionSignature(action) : false;

  return (
    <article
      className={`rounded-3xl bg-white p-4 shadow-card ring-1 ${action.status === "blocked" ? "ring-rose-300" : "ring-sand-200"} ${
        action.status === "done" ? "opacity-75" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-snug">{action.title}</h3>
          <p className="mt-2 text-xs text-ink-500">
            {origin ? `עותק של «${origin.title}»${diverged ? " · שונה מהנוסח שבמאגר" : ""}` : "פעולה של האירוע"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PriorityPill value={action.priority} />
          <ActionStatusPill value={action.status} />
        </div>
      </div>
      {action.description ? <p className="mt-3 text-sm leading-6 text-ink-700">{action.description}</p> : null}
      {action.notes ? (
        <p className={`mt-3 rounded-2xl px-3 py-2 text-sm leading-6 ${action.status === "blocked" ? "bg-rose-50 text-rose-950" : "bg-sand-100 text-ink-700"}`}>
          {action.notes}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-ink-500">
        {action.category || "כללי"}
        {" · "}
        {action.assignee ? `אחראי: ${action.assignee}` : "ללא אחראי"}
        {" · "}
        {formatMinutes(action.estimatedMinutes)}
        {action.completedAt ? ` · הושלמה ${formatWhen(action.completedAt)}` : ""}
        {" · "}
        {actionStatusLabel[action.status]}
      </p>
      {action.steps.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {action.steps.map((step) => (
            <li key={step.id} className="flex items-start gap-2 text-sm">
              <span className={step.done ? "text-pine-800" : "text-ink-500"} aria-hidden>
                {step.done ? "✓" : "○"}
              </span>
              <span className={step.done ? "text-ink-500 line-through" : "text-ink-900"}>{step.text}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
