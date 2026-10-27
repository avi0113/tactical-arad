"use client";

import { useMemo, useState } from "react";
import { priorityLabel } from "@/lib/constants";
import { categoryOrder } from "@/lib/stats";
import type { OpsEvent, TaskTemplate } from "@/lib/types";
import { Button, inputClass } from "@/components/ui";

export function TemplatePicker({
  templates,
  event,
  onClose,
  onAdd,
}: {
  templates: TaskTemplate[];
  event: OpsEvent;
  onClose: () => void;
  onAdd: (templateIds: string[]) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("הכל");
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const categories = ["הכל", ...categoryOrder(templates)];
  const visible = useMemo(() => {
    const needle = query.trim();
    return templates.filter((template) => {
      if (category !== "הכל" && template.category !== category) return false;
      if (!needle) return true;
      return `${template.title} ${template.description} ${template.defaultRole} ${template.category}`.includes(needle);
    });
  }, [templates, query, category]);

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-start bg-ink-900/40" onMouseDown={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col bg-sand-50 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="border-b border-sand-200 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl">הוספה מהמאגר</h2>
              <p className="mt-1 text-sm text-ink-500">כל משימה שתיבחר תיכנס לאירוע כפעולה נפרדת.</p>
            </div>
            <button type="button" onClick={onClose} className="text-sm text-ink-500">
              סגור
            </button>
          </div>
          <input
            className={`${inputClass} mt-4`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="חיפוש משימה"
            autoFocus
          />
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${
                  category === item ? "bg-ink-900 text-sand-50" : "bg-white text-ink-700 ring-1 ring-sand-300"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {visible.length === 0 ? <p className="text-sm text-ink-500">אין משימות תואמות.</p> : null}
          {visible.map((template) => {
            const used = event.actions.filter((action) => action.templateId === template.id).length;
            const checked = selected.includes(template.id);
            return (
              <label key={template.id} className="flex cursor-pointer gap-3 rounded-2xl bg-white p-3 ring-1 ring-sand-200">
                <input type="checkbox" className="mt-1" checked={checked} onChange={() => toggle(template.id)} />
                <span className="min-w-0">
                  <span className="block font-medium">{template.title}</span>
                  <span className="mt-1 block text-xs text-ink-500">
                    {template.category} · {priorityLabel[template.priority]}
                    {template.steps.length ? ` · ${template.steps.length} שלבים` : ""}
                    {used ? ` · כבר באירוע (${used})` : ""}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <div className="border-t border-sand-200 px-5 py-4">
          <p className="mb-3 text-xs leading-5 text-ink-500">אחרי ההוספה אפשר לערוך כל פעולה באירוע בלי לשנות את המאגר.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={selected.length === 0 || saving}
              onClick={() => {
                setSaving(true);
                void onAdd(selected).finally(() => setSaving(false));
              }}
            >
              הוספה לאירוע ({selected.length})
            </Button>
            <Button
              variant="secondary"
              onClick={() => setSelected(visible.map((template) => template.id))}
              disabled={visible.length === 0}
            >
              סימון המוצגות
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
