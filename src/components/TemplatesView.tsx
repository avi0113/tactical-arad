"use client";

import { useEffect, useMemo, useState } from "react";
import { priorityRank } from "@/lib/constants";
import { categoryOrder, templateUsageCount } from "@/lib/stats";
import { formatMinutes } from "@/lib/time";
import type { TaskTemplate, TemplateInput } from "@/lib/types";
import { useOps } from "@/components/OpsProvider";
import { TemplateForm } from "@/components/forms";
import { ConfirmDialog, LoadingBlock, Modal, PageIntro, PriorityPill, inputClass } from "@/components/ui";

export function TemplatesView() {
  const { state, mutate } = useOps();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TaskTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "מאגר משימות · ערד";
  }, []);

  const filtered = useMemo(() => {
    if (!state) return [];
    const needle = query.trim();
    if (!needle) return state.templates;
    return state.templates.filter((template) =>
      `${template.title} ${template.description} ${template.category} ${template.defaultRole} ${template.steps.join(" ")}`.includes(needle),
    );
  }, [state, query]);

  if (!state) return <LoadingBlock />;

  const groups = categoryOrder(filtered);
  const doomed = state.templates.find((template) => template.id === deleteId);
  const doomedUsage = doomed ? templateUsageCount(state.events, doomed.id) : 0;

  async function saveNew(input: TemplateInput) {
    await mutate("/api/templates", "POST", input);
    setCreating(false);
  }

  async function saveEdit(input: TemplateInput) {
    if (!editing) return;
    await mutate(`/api/templates/${editing.id}`, "PATCH", input);
    setEditing(null);
  }

  return (
    <div>
      <PageIntro
        kicker="מאגר"
        title="משימות מוכנות מראש"
        text="כל משימה נערכת בפני עצמה. כשמוסיפים אותה לאירוע נוצר עותק, והמשך העריכה במאגר לא משנה את מה שכבר נכנס לאירוע."
        action={
          <button type="button" onClick={() => setCreating(true)} className="rounded-lg bg-clay-700 px-3 py-2 text-sm font-medium text-sand-50 hover:bg-clay-600">
            משימה חדשה
          </button>
        }
      />
      <input className={`${inputClass} mb-6`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש במאגר" />
      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white px-5 py-10 text-sm text-ink-500 ring-1 ring-sand-200">אין משימות תואמות.</div>
      ) : (
        <div className="space-y-8">
          {groups.map((category) => {
            const items = filtered
              .filter((template) => template.category === category)
              .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.title.localeCompare(b.title, "he"));
            return (
              <section key={category}>
                <h2 className="mb-3 text-sm font-medium text-ink-500">{category}</h2>
                <div className="grid gap-3 lg:grid-cols-2">
                  {items.map((template) => {
                    const usage = templateUsageCount(state.events, template.id);
                    return (
                      <article key={template.id} className="flex flex-col rounded-3xl bg-white p-4 shadow-card ring-1 ring-sand-200">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-lg font-semibold leading-snug">{template.title}</h3>
                          <PriorityPill value={template.priority} />
                        </div>
                        {template.description ? <p className="mt-2 text-sm leading-6 text-ink-700">{template.description}</p> : null}
                        <p className="mt-3 text-xs text-ink-500">
                          {template.defaultRole || "ללא תפקיד מוצע"}
                          {" · "}
                          {formatMinutes(template.estimatedMinutes)}
                          {template.steps.length ? ` · ${template.steps.length} שלבים` : ""}
                        </p>
                        <p className="mt-1 text-xs text-ink-500">
                          {usage === 0 ? "לא שויכה עדיין לאירוע" : usage === 1 ? "מופיעה באירוע אחד, כעותק נפרד" : `מופיעה ב־${usage} אירועים, כעותקים נפרדים`}
                        </p>
                        {template.steps.length > 0 ? (
                          <ol className="mt-3 list-decimal space-y-1 ps-5 text-sm text-ink-700">
                            {template.steps.slice(0, 3).map((step) => (
                              <li key={step}>{step}</li>
                            ))}
                            {template.steps.length > 3 ? <li>ועוד {template.steps.length - 3}</li> : null}
                          </ol>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button type="button" onClick={() => setEditing(template)} className="rounded-lg bg-ink-900 px-3 py-1.5 text-sm text-sand-50">
                            עריכה
                          </button>
                          <button
                            type="button"
                            onClick={() => void mutate("/api/templates", "POST", { duplicateOf: template.id }).catch(() => undefined)}
                            className="rounded-lg px-3 py-1.5 text-sm text-ink-700 ring-1 ring-sand-300 hover:bg-sand-50"
                          >
                            שכפול
                          </button>
                          <button type="button" onClick={() => setDeleteId(template.id)} className="rounded-lg px-3 py-1.5 text-sm text-rose-800 hover:bg-rose-50">
                            מחיקה
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {creating ? (
        <Modal title="משימה חדשה" onClose={() => setCreating(false)} wide>
          <TemplateForm categories={state.templates.map((template) => template.category)} submitLabel="שמירה במאגר" onSubmit={saveNew} />
        </Modal>
      ) : null}
      {editing ? (
        <Modal title="עריכת משימה" onClose={() => setEditing(null)} wide>
          <TemplateForm
            key={editing.id}
            initial={editing}
            categories={state.templates.map((template) => template.category)}
            submitLabel="שמירת השינויים"
            onSubmit={saveEdit}
          />
        </Modal>
      ) : null}
      {doomed ? (
        <ConfirmDialog
          title="מחיקה מהמאגר"
          body={
            doomedUsage > 0
              ? `להסיר את «${doomed.title}» מהמאגר? הפעולות שכבר נמצאות ב־${doomedUsage === 1 ? "אירוע אחד" : `${doomedUsage} אירועים`} יישארו כמו שהן.`
              : `להסיר את «${doomed.title}» מהמאגר?`
          }
          confirmLabel="מחיקה"
          onClose={() => setDeleteId(null)}
          onConfirm={() => {
            const id = doomed.id;
            setDeleteId(null);
            void mutate(`/api/templates/${id}`, "DELETE").catch(() => undefined);
          }}
        />
      ) : null}
    </div>
  );
}
