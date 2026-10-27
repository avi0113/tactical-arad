"use client";

import { useState } from "react";
import { CATEGORIES, EVENT_TYPES, actionStatusLabel, eventStatusLabel, priorityLabel } from "@/lib/constants";
import { fromJerusalemInput, toDatetimeLocal } from "@/lib/time";
import type { ActionInput, ActionStatus, EventInput, EventStatus, OpsEvent, Priority, TaskTemplate, TemplateInput } from "@/lib/types";
import { ACTION_STATUSES, EVENT_STATUSES, PRIORITIES } from "@/lib/types";
import { Button, Field, inputClass } from "@/components/ui";

function minutesValue(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function stepLines(value: string): string[] {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

export function TemplateForm({
  initial,
  categories,
  submitLabel,
  onSubmit,
}: {
  initial?: TaskTemplate;
  categories: string[];
  submitLabel: string;
  onSubmit: (input: TemplateInput) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0]);
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "medium");
  const [defaultRole, setDefaultRole] = useState(initial?.defaultRole ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState(initial?.estimatedMinutes ? String(initial.estimatedMinutes) : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [stepsText, setStepsText] = useState(initial?.steps.join("\n") ?? "");
  const [saving, setSaving] = useState(false);
  const options = Array.from(new Set([...CATEGORIES, ...categories, category]));

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setSaving(true);
        void onSubmit({
          title,
          description,
          category,
          priority,
          estimatedMinutes: minutesValue(estimatedMinutes),
          defaultRole,
          steps: stepLines(stepsText),
        }).finally(() => setSaving(false));
      }}
    >
      <Field label="שם המשימה">
        <input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={140} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="קטגוריה">
          <input className={inputClass} list="template-categories" value={category} onChange={(event) => setCategory(event.target.value)} maxLength={80} />
          <datalist id="template-categories">
            {options.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </Field>
        <Field label="עדיפות">
          <select className={inputClass} value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
            {PRIORITIES.map((item) => (
              <option key={item} value={item}>
                {priorityLabel[item]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="תפקיד מוצע">
          <input className={inputClass} value={defaultRole} onChange={(event) => setDefaultRole(event.target.value)} maxLength={80} />
        </Field>
        <Field label="משך משוער בדקות">
          <input
            className={inputClass}
            inputMode="numeric"
            value={estimatedMinutes}
            onChange={(event) => setEstimatedMinutes(event.target.value)}
            placeholder="לא חובה"
          />
        </Field>
      </div>
      <Field label="תיאור">
        <textarea className={`${inputClass} min-h-24`} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} />
      </Field>
      <Field label="שלבי ביצוע">
        <textarea
          className={`${inputClass} min-h-28`}
          value={stepsText}
          onChange={(event) => setStepsText(event.target.value)}
          placeholder={"שורה לכל שלב"}
        />
      </Field>
      <p className="text-xs leading-5 text-ink-500">שמירה מעדכנת רק את המשימה במאגר. פעולות שכבר נוספו לאירועים לא ישתנו.</p>
      <Button type="submit" disabled={saving}>
        {submitLabel}
      </Button>
    </form>
  );
}

export function EventForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: OpsEvent;
  submitLabel: string;
  onSubmit: (input: EventInput) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [eventType, setEventType] = useState(initial?.eventType ?? EVENT_TYPES[0]);
  const [status, setStatus] = useState<EventStatus>(initial?.status ?? "open");
  const [severity, setSeverity] = useState<Priority>(initial?.severity ?? "medium");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [commander, setCommander] = useState(initial?.commander ?? "");
  const [startedAt, setStartedAt] = useState(initial ? toDatetimeLocal(initial.startedAt) : toDatetimeLocal(new Date().toISOString()));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        let iso = "";
        try {
          iso = fromJerusalemInput(startedAt);
        } catch {
          setFormError("מועד ההתחלה לא תקין");
          return;
        }
        setFormError(null);
        setSaving(true);
        void onSubmit({
          title,
          description,
          eventType,
          status,
          severity,
          location,
          commander,
          startedAt: iso,
        }).finally(() => setSaving(false));
      }}
    >
      <Field label="שם האירוע">
        <input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={140} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="סוג">
          <select className={inputClass} value={eventType} onChange={(event) => setEventType(event.target.value)}>
            {EVENT_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="סטטוס">
          <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value as EventStatus)}>
            {EVENT_STATUSES.map((item) => (
              <option key={item} value={item}>
                {eventStatusLabel[item]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="חומרה">
          <select className={inputClass} value={severity} onChange={(event) => setSeverity(event.target.value as Priority)}>
            {PRIORITIES.map((item) => (
              <option key={item} value={item}>
                {priorityLabel[item]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="התחלה">
          <input className={inputClass} type="datetime-local" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} required />
        </Field>
        <Field label="מיקום">
          <input className={inputClass} value={location} onChange={(event) => setLocation(event.target.value)} maxLength={160} />
        </Field>
        <Field label="אחראי אירוע">
          <input className={inputClass} value={commander} onChange={(event) => setCommander(event.target.value)} maxLength={80} />
        </Field>
      </div>
      <Field label="תיאור">
        <textarea className={`${inputClass} min-h-24`} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} />
      </Field>
      {formError ? <p className="text-sm text-rose-800">{formError}</p> : null}
      <Button type="submit" disabled={saving}>
        {submitLabel}
      </Button>
    </form>
  );
}

export function ActionForm({
  initial,
  categories,
  submitLabel,
  onSubmit,
}: {
  initial?: ActionInput;
  categories: string[];
  submitLabel: string;
  onSubmit: (input: ActionInput) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [status, setStatus] = useState<ActionStatus>(initial?.status ?? "pending");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "medium");
  const [category, setCategory] = useState(initial?.category ?? "כללי");
  const [assignee, setAssignee] = useState(initial?.assignee ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState(initial?.estimatedMinutes ? String(initial.estimatedMinutes) : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [steps, setSteps] = useState(initial?.steps ?? []);
  const [saving, setSaving] = useState(false);
  const options = Array.from(new Set([...CATEGORIES, ...categories, category].filter(Boolean)));

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setSaving(true);
        void onSubmit({
          title,
          description,
          category,
          priority,
          status,
          assignee,
          estimatedMinutes: minutesValue(estimatedMinutes),
          notes,
          steps: steps.filter((step) => step.text.trim()),
        }).finally(() => setSaving(false));
      }}
    >
      <Field label="שם הפעולה">
        <input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={140} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="סטטוס">
          <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value as ActionStatus)}>
            {ACTION_STATUSES.map((item) => (
              <option key={item} value={item}>
                {actionStatusLabel[item]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="עדיפות">
          <select className={inputClass} value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
            {PRIORITIES.map((item) => (
              <option key={item} value={item}>
                {priorityLabel[item]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="קטגוריה">
          <input className={inputClass} list="action-categories" value={category} onChange={(event) => setCategory(event.target.value)} maxLength={80} />
          <datalist id="action-categories">
            {options.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </Field>
        <Field label="אחראי">
          <input className={inputClass} value={assignee} onChange={(event) => setAssignee(event.target.value)} maxLength={80} />
        </Field>
        <Field label="משך משוער בדקות">
          <input className={inputClass} inputMode="numeric" value={estimatedMinutes} onChange={(event) => setEstimatedMinutes(event.target.value)} />
        </Field>
      </div>
      <Field label="תיאור">
        <textarea className={`${inputClass} min-h-20`} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} />
      </Field>
      <Field label="הערות לביצוע">
        <textarea className={`${inputClass} min-h-16`} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} />
      </Field>
      <div>
        <div className="mb-1.5 text-sm font-medium text-ink-700">שלבי ביצוע</div>
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={step.done}
                onChange={(event) =>
                  setSteps((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, done: event.target.checked } : item)))
                }
                aria-label="השלב הושלם"
              />
              <input
                className={inputClass}
                value={step.text}
                maxLength={200}
                onChange={(event) =>
                  setSteps((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, text: event.target.value } : item)))
                }
              />
              <button
                type="button"
                className="shrink-0 text-sm text-ink-500 hover:text-rose-800"
                onClick={() => setSteps((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              >
                הסרה
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-2 text-sm font-medium text-clay-700"
          onClick={() => setSteps((current) => [...current, { id: crypto.randomUUID(), text: "", done: false }])}
        >
          הוספת שלב
        </button>
      </div>
      <Button type="submit" disabled={saving}>
        {submitLabel}
      </Button>
    </form>
  );
}
