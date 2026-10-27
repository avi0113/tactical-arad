"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { eventStatusLabel } from "@/lib/constants";
import { actionProgress, sortEvents } from "@/lib/stats";
import { formatWhen } from "@/lib/time";
import type { EventInput, EventStatus } from "@/lib/types";
import { EVENT_STATUSES } from "@/lib/types";
import { useOps } from "@/components/OpsProvider";
import { EventForm } from "@/components/forms";
import { ConfirmDialog, EventStatusPill, LoadingBlock, Modal, PageIntro, PriorityPill, ProgressBar, inputClass } from "@/components/ui";

export function EventsView() {
  const { state, mutate } = useOps();
  const router = useRouter();
  const params = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | EventStatus>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "אירועים · ערד";
  }, []);

  useEffect(() => {
    if (params.get("new") === "1") setCreating(true);
  }, [params]);

  const events = useMemo(() => {
    if (!state) return [];
    const needle = query.trim();
    return sortEvents(state.events).filter((event) => {
      if (status !== "all" && event.status !== status) return false;
      if (!needle) return true;
      return `${event.title} ${event.location} ${event.commander} ${event.description}`.includes(needle);
    });
  }, [state, query, status]);

  if (!state) return <LoadingBlock />;

  async function createEvent(input: EventInput) {
    const created = await mutate("/api/events", "POST", input);
    if (created.resultId) router.push(`/events/${created.resultId}`);
  }

  const doomed = state.events.find((event) => event.id === deleteId);

  return (
    <div>
      <PageIntro
        kicker="אירועים"
        title="כל האירועים"
        text="לכל אירוע יש רשימת פעולות משלו: מהמאגר, או פעולות שנכתבות במיוחד עבורו."
        action={
          <button type="button" onClick={() => setCreating(true)} className="rounded-lg bg-clay-700 px-3 py-2 text-sm font-medium text-sand-50 hover:bg-clay-600">
            אירוע חדש
          </button>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input className={inputClass} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש לפי שם, מיקום או אחראי" />
        <select className={`${inputClass} sm:max-w-48`} value={status} onChange={(event) => setStatus(event.target.value as "all" | EventStatus)}>
          <option value="all">כל הסטטוסים</option>
          {EVENT_STATUSES.map((item) => (
            <option key={item} value={item}>
              {eventStatusLabel[item]}
            </option>
          ))}
        </select>
      </div>
      {events.length === 0 ? (
        <div className="rounded-3xl bg-white px-5 py-10 text-sm text-ink-500 ring-1 ring-sand-200">אין אירועים תואמים.</div>
      ) : (
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
                      {progress.total === 0 ? "עדיין אין פעולות לאירוע" : `${progress.done} מתוך ${progress.total} פעולות הושלמו`}
                      {progress.blocked ? ` · ${progress.blocked} חסומות` : ""}
                    </p>
                    <div className="flex gap-2">
                      <Link href={`/events/${event.id}`} className="rounded-lg bg-ink-900 px-3 py-2 text-sm text-sand-50">
                        לרשימת הפעולות
                      </Link>
                      <button type="button" onClick={() => setDeleteId(event.id)} className="rounded-lg px-3 py-2 text-sm text-rose-800 hover:bg-rose-50">
                        מחיקה
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {creating ? (
        <Modal title="אירוע חדש" onClose={() => setCreating(false)} wide>
          <EventForm
            submitLabel="פתיחת האירוע"
            onSubmit={async (input) => {
              await createEvent(input);
              setCreating(false);
            }}
          />
        </Modal>
      ) : null}
      {doomed ? (
        <ConfirmDialog
          title="מחיקת אירוע"
          body={`למחוק את «${doomed.title}» יחד עם רשימת הפעולות שלו? המאגר לא יושפע.`}
          confirmLabel="מחיקה"
          onClose={() => setDeleteId(null)}
          onConfirm={() => {
            const id = doomed.id;
            setDeleteId(null);
            void mutate(`/api/events/${id}`, "DELETE").catch(() => undefined);
          }}
        />
      ) : null}
    </div>
  );
}
