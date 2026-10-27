"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { actionStatusLabel, eventStatusLabel, priorityLabel } from "@/lib/constants";
import { actionProgress, actionSignature, isLiveEvent, orderedActions, templateSignature } from "@/lib/stats";
import { formatMinutes, formatWhen } from "@/lib/time";
import type { ActionInput, ActionStatus, EventAction, EventInput, EventStatus, Priority, TaskTemplate } from "@/lib/types";
import { ACTION_STATUSES, EVENT_STATUSES, PRIORITIES } from "@/lib/types";
import { useOps } from "@/components/OpsProvider";
import { TemplatePicker } from "@/components/TemplatePicker";
import { ActionForm, EventForm } from "@/components/forms";
import { ActionStatusPill, ConfirmDialog, LoadingBlock, Modal, PriorityPill, ProgressBar, inputClass } from "@/components/ui";

const FILTERS: Array<{ id: "all" | ActionStatus; label: string }> = [
  { id: "all", label: "הכל" },
  { id: "pending", label: "ממתינות" },
  { id: "in_progress", label: "בביצוע" },
  { id: "blocked", label: "חסומות" },
  { id: "done", label: "הושלמו" },
];

export function EventView({ eventId }: { eventId: string }) {
  const { state, mutate, pending } = useOps();
  const router = useRouter();
  const [editingEvent, setEditingEvent] = useState(false);
  const [creatingAction, setCreatingAction] = useState(false);
  const [editingAction, setEditingAction] = useState<EventAction | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleteActionId, setDeleteActionId] = useState<string | null>(null);
  const [deleteEvent, setDeleteEvent] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [grouped, setGrouped] = useState(false);

  const event = state?.events.find((item) => item.id === eventId);

  useEffect(() => {
    document.title = event ? `${event.title} · ערד` : "אירוע · ערד";
  }, [event]);

  const ordered = useMemo(() => (event ? orderedActions(event) : []), [event]);
  const visible = useMemo(() => {
    const needle = query.trim();
    return ordered.filter((action) => {
      if (filter !== "all" && action.status !== filter) return false;
      if (!needle) return true;
      return `${action.title} ${action.description} ${action.assignee} ${action.notes} ${action.category}`.includes(needle);
    });
  }, [ordered, query, filter]);

  if (!state) return <LoadingBlock />;
  if (!event) {
    return (
      <div className="rounded-3xl bg-white px-5 py-10 ring-1 ring-sand-200">
        <h1 className="font-display text-3xl">האירוע לא נמצא</h1>
        <Link href="/events" className="mt-4 inline-block text-sm font-medium text-clay-700">
          חזרה לאירועים
        </Link>
      </div>
    );
  }

  const progress = actionProgress(event.actions);
  const flat = !grouped && filter === "all" && query.trim() === "";
  const groups = grouped ? groupVisible(visible) : [{ category: "הכל", actions: visible }];
  const doomed = event.actions.find((action) => action.id === deleteActionId);

  async function patchEvent(body: Partial<EventInput>) {
    await mutate(`/api/events/${eventId}`, "PATCH", body);
  }

  async function patchAction(actionId: string, body: Partial<ActionInput>) {
    await mutate(`/api/events/${eventId}/actions/${actionId}`, "PATCH", body);
  }

  return (
    <div>
      <Link href="/events" className="text-sm text-ink-500 hover:text-ink-900">
        כל האירועים
      </Link>
      <header className="mt-3 rounded-3xl bg-white p-5 shadow-card ring-1 ring-sand-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-clay-700">{event.eventType}</p>
            <h1 className="mt-1 font-display text-4xl leading-tight">{event.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setEditingEvent(true)} className="rounded-lg bg-ink-900 px-3 py-2 text-sm text-sand-50">
              עריכת פרטים
            </button>
            <button type="button" onClick={() => setDeleteEvent(true)} className="rounded-lg px-3 py-2 text-sm text-rose-800 hover:bg-rose-50">
              מחיקת אירוע
            </button>
          </div>
        </div>
        {event.description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-700">{event.description}</p> : null}
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="מיקום" value={event.location || "לא צוין"} />
          <Meta label="אחראי" value={event.commander || "לא צוין"} />
          <Meta label="התחלה" value={formatWhen(event.startedAt)} />
          <div>
            <dt className="text-ink-500">סטטוס וחומרה</dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              <select
                className="rounded-lg border border-sand-300 bg-white px-2 py-1 text-sm"
                value={event.status}
                disabled={pending}
                onChange={(change) => void patchEvent({ status: change.target.value as EventStatus }).catch(() => undefined)}
              >
                {EVENT_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {eventStatusLabel[item]}
                  </option>
                ))}
              </select>
              <select
                className="rounded-lg border border-sand-300 bg-white px-2 py-1 text-sm"
                value={event.severity}
                disabled={pending}
                onChange={(change) => void patchEvent({ severity: change.target.value as Priority }).catch(() => undefined)}
              >
                {PRIORITIES.map((item) => (
                  <option key={item} value={item}>
                    {priorityLabel[item]}
                  </option>
                ))}
              </select>
            </dd>
          </div>
        </dl>
      </header>

      <section className="mt-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl">פעולות נדרשות לביצוע</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-700">
              הרשימה שייכת לאירוע הזה בלבד. אפשר לערוך כל פעולה בנפרד: שינוי כאן לא מעדכן את המאגר, ושינוי במאגר לא מעדכן פעולה שכבר נוספה.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPickerOpen(true)} className="rounded-lg bg-clay-700 px-3 py-2 text-sm font-medium text-sand-50 hover:bg-clay-600">
              הוספה מהמאגר
            </button>
            <button type="button" onClick={() => setCreatingAction(true)} className="rounded-lg bg-white px-3 py-2 text-sm font-medium ring-1 ring-sand-300 hover:bg-sand-50">
              פעולה חדשה
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-3xl bg-white px-4 py-3 ring-1 ring-sand-200">
          <ProgressBar value={progress.done} max={progress.total} />
          <p className="mt-2 text-sm text-ink-700">
            {progress.total === 0
              ? "עדיין אין פעולות באירוע."
              : `${progress.done} מתוך ${progress.total} הושלמו · ${progress.pending} ממתינות · ${progress.active} בביצוע · ${progress.blocked} חסומות`}
            {progress.remainingMinutes ? ` · נותרו כ־${progress.remainingMinutes} דקות משוערות` : ""}
          </p>
          {progress.total > 0 && progress.done === progress.total && isLiveEvent(event) ? (
            <button
              type="button"
              className="mt-2 text-sm font-medium text-pine-800"
              onClick={() => void patchEvent({ status: "completed" }).catch(() => undefined)}
            >
              כל הפעולות הושלמו. סיום האירוע
            </button>
          ) : null}
        </div>

        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <input className={inputClass} value={query} onChange={(change) => setQuery(change.target.value)} placeholder="חיפוש בפעולות האירוע" />
          <div className="flex gap-2 overflow-x-auto">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${
                  filter === item.id ? "bg-ink-900 text-sand-50" : "bg-white text-ink-700 ring-1 ring-sand-300"
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setGrouped((value) => !value)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${
                grouped ? "bg-ink-900 text-sand-50" : "bg-white text-ink-700 ring-1 ring-sand-300"
              }`}
            >
              קיבוץ לפי קטגוריה
            </button>
          </div>
        </div>
        {!flat && event.actions.length > 1 ? (
          <p className="mb-3 text-xs text-ink-500">שינוי הסדר זמין כשהרשימה מוצגת במלואה, בלי סינון ובלי קיבוץ.</p>
        ) : null}

        {visible.length === 0 ? (
          <div className="rounded-3xl bg-white px-5 py-10 text-sm text-ink-500 ring-1 ring-sand-200">
            {event.actions.length === 0 ? "אפשר להתחיל מהמאגר, או לכתוב פעולה שקיימת רק באירוע הזה." : "אין פעולות תואמות לסינון."}
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.category}>
                {grouped ? <h3 className="mb-2 text-sm font-medium text-ink-500">{group.category}</h3> : null}
                <div className="space-y-3">
                  {group.actions.map((action) => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      templates={state.templates}
                      pending={pending}
                      canMove={flat}
                      isFirst={ordered[0]?.id === action.id}
                      isLast={ordered[ordered.length - 1]?.id === action.id}
                      onStatus={(status) => void patchAction(action.id, { status }).catch(() => undefined)}
                      onToggleStep={(stepId) => {
                        const steps = action.steps.map((step) => (step.id === stepId ? { ...step, done: !step.done } : step));
                        void patchAction(action.id, { steps }).catch(() => undefined);
                      }}
                      onEdit={() => setEditingAction(action)}
                      onDelete={() => setDeleteActionId(action.id)}
                      onDuplicate={() =>
                        void mutate(`/api/events/${eventId}/actions`, "POST", { duplicateActionId: action.id }).catch(() => undefined)
                      }
                      onPromote={() =>
                        void mutate("/api/templates", "POST", { fromEventAction: { eventId, actionId: action.id } }).catch(() => undefined)
                      }
                      onMove={(direction) =>
                        void mutate(`/api/events/${eventId}/actions/${action.id}/move`, "POST", { direction }).catch(() => undefined)
                      }
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      {pickerOpen ? (
        <TemplatePicker
          templates={state.templates}
          event={event}
          onClose={() => setPickerOpen(false)}
          onAdd={async (templateIds) => {
            await mutate(`/api/events/${eventId}/actions`, "POST", { templateIds });
            setPickerOpen(false);
          }}
        />
      ) : null}
      {creatingAction ? (
        <Modal title="פעולה חדשה באירוע" onClose={() => setCreatingAction(false)} wide>
          <ActionForm
            categories={state.templates.map((template) => template.category)}
            submitLabel="הוספה לרשימה"
            onSubmit={async (input) => {
              await mutate(`/api/events/${eventId}/actions`, "POST", { action: input });
              setCreatingAction(false);
            }}
          />
        </Modal>
      ) : null}
      {editingAction ? (
        <Modal title="עריכת פעולה" onClose={() => setEditingAction(null)} wide>
          <p className="mb-4 text-xs leading-5 text-ink-500">השינוי נשמר רק באירוע הזה.</p>
          <ActionForm
            key={editingAction.id}
            initial={editingAction}
            categories={[...state.templates.map((template) => template.category), editingAction.category]}
            submitLabel="שמירה"
            onSubmit={async (input) => {
              await patchAction(editingAction.id, input);
              setEditingAction(null);
            }}
          />
        </Modal>
      ) : null}
      {editingEvent ? (
        <Modal title="עריכת אירוע" onClose={() => setEditingEvent(false)} wide>
          <EventForm
            initial={event}
            submitLabel="שמירת פרטים"
            onSubmit={async (input) => {
              await patchEvent(input);
              setEditingEvent(false);
            }}
          />
        </Modal>
      ) : null}
      {doomed ? (
        <ConfirmDialog
          title="הסרת פעולה"
          body={`להסיר את «${doomed.title}» מרשימת האירוע? המשימה במאגר, אם יש כזו, לא תימחק.`}
          confirmLabel="הסרה"
          onClose={() => setDeleteActionId(null)}
          onConfirm={() => {
            const id = doomed.id;
            setDeleteActionId(null);
            void mutate(`/api/events/${eventId}/actions/${id}`, "DELETE").catch(() => undefined);
          }}
        />
      ) : null}
      {deleteEvent ? (
        <ConfirmDialog
          title="מחיקת אירוע"
          body="האירוע ורשימת הפעולות שלו יימחקו. המאגר יישאר כמו שהוא."
          confirmLabel="מחיקה"
          onClose={() => setDeleteEvent(false)}
          onConfirm={() => {
            setDeleteEvent(false);
            void mutate(`/api/events/${eventId}`, "DELETE")
              .then(() => router.push("/events"))
              .catch(() => undefined);
          }}
        />
      ) : null}
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

function groupVisible(actions: EventAction[]): Array<{ category: string; actions: EventAction[] }> {
  const groups: Array<{ category: string; actions: EventAction[] }> = [];
  for (const action of actions) {
    const category = action.category || "כללי";
    const existing = groups.find((group) => group.category === category);
    if (existing) existing.actions.push(action);
    else groups.push({ category, actions: [action] });
  }
  return groups;
}

function OriginNote({ action, templates }: { action: EventAction; templates: TaskTemplate[] }) {
  if (!action.templateId) return <p className="text-xs text-ink-500">פעולה של האירוע הזה, לא מהמאגר</p>;
  const origin = templates.find((template) => template.id === action.templateId);
  if (!origin) return <p className="text-xs text-ink-500">המשימה המקורית הוסרה מהמאגר. הפעולה באירוע נשמרה.</p>;
  const diverged = templateSignature(origin) !== actionSignature(action);
  return (
    <p className="text-xs text-ink-500">
      עותק עצמאי של «{origin.title}»
      {diverged ? " · שונה מהנוסח שבמאגר" : ""}
    </p>
  );
}

function ActionCard({
  action,
  templates,
  pending,
  canMove,
  isFirst,
  isLast,
  onStatus,
  onToggleStep,
  onEdit,
  onDelete,
  onDuplicate,
  onPromote,
  onMove,
}: {
  action: EventAction;
  templates: TaskTemplate[];
  pending: boolean;
  canMove: boolean;
  isFirst: boolean;
  isLast: boolean;
  onStatus: (status: ActionStatus) => void;
  onToggleStep: (stepId: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onPromote: () => void;
  onMove: (direction: "up" | "down") => void;
}) {
  return (
    <article
      className={`rounded-3xl bg-white p-4 shadow-card ring-1 ${
        action.status === "blocked" ? "ring-rose-300" : "ring-sand-200"
      } ${action.status === "done" ? "opacity-75" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-snug">{action.title}</h3>
          <div className="mt-2">
            <OriginNote action={action} templates={templates} />
          </div>
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
      </p>
      {action.steps.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {action.steps.map((step) => (
            <li key={step.id}>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={step.done}
                  disabled={pending}
                  onChange={() => onToggleStep(step.id)}
                />
                <span className={step.done ? "text-ink-500 line-through" : "text-ink-900"}>{step.text}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          className="rounded-lg border border-sand-300 bg-white px-2 py-1.5 text-sm"
          value={action.status}
          disabled={pending}
          aria-label="סטטוס הפעולה"
          onChange={(change) => onStatus(change.target.value as ActionStatus)}
        >
          {ACTION_STATUSES.map((item) => (
            <option key={item} value={item}>
              {actionStatusLabel[item]}
            </option>
          ))}
        </select>
        <button type="button" onClick={onEdit} className="rounded-lg bg-ink-900 px-3 py-1.5 text-sm text-sand-50">
          עריכה
        </button>
        <button type="button" onClick={onDuplicate} className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-sand-300">
          שכפול
        </button>
        <button type="button" onClick={onPromote} className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-sand-300">
          שמירה למאגר
        </button>
        {canMove ? (
          <>
            <button type="button" disabled={isFirst || pending} onClick={() => onMove("up")} className="rounded-lg px-2 py-1.5 text-sm text-ink-700 disabled:opacity-40">
              למעלה
            </button>
            <button type="button" disabled={isLast || pending} onClick={() => onMove("down")} className="rounded-lg px-2 py-1.5 text-sm text-ink-700 disabled:opacity-40">
              למטה
            </button>
          </>
        ) : null}
        <button type="button" onClick={onDelete} className="rounded-lg px-3 py-1.5 text-sm text-rose-800">
          הסרה
        </button>
      </div>
    </article>
  );
}
