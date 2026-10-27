import { eventStatusRank, priorityRank } from "./constants";
import type { Db, EventAction, OpsEvent, TaskTemplate } from "./types";

export function orderedActions(event: OpsEvent): EventAction[] {
  return [...event.actions].sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

export function actionProgress(actions: EventAction[]) {
  const total = actions.length;
  const done = actions.filter((action) => action.status === "done").length;
  const blocked = actions.filter((action) => action.status === "blocked").length;
  const active = actions.filter((action) => action.status === "in_progress").length;
  const pending = actions.filter((action) => action.status === "pending").length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const remainingMinutes = actions
    .filter((action) => action.status !== "done")
    .reduce((sum, action) => sum + (action.estimatedMinutes ?? 0), 0);
  return { total, done, blocked, active, pending, percent, remainingMinutes };
}

export function isLiveEvent(event: OpsEvent): boolean {
  return event.status === "open" || event.status === "in_progress";
}

export function nextOpenAction(event: OpsEvent): EventAction | undefined {
  return orderedActions(event).find((action) => action.status !== "done");
}

export function sortEvents(events: OpsEvent[]): OpsEvent[] {
  return [...events].sort((a, b) => {
    const byStatus = eventStatusRank[a.status] - eventStatusRank[b.status];
    if (byStatus !== 0) return byStatus;
    return b.startedAt.localeCompare(a.startedAt);
  });
}

export function templateUsageCount(events: OpsEvent[], templateId: string): number {
  return events.filter((event) => event.actions.some((action) => action.templateId === templateId)).length;
}

export function attentionActions(db: Db): Array<{ event: OpsEvent; action: EventAction }> {
  const rows: Array<{ event: OpsEvent; action: EventAction }> = [];
  for (const event of db.events) {
    if (!isLiveEvent(event)) continue;
    for (const action of orderedActions(event)) {
      if (action.status === "blocked" || (action.status !== "done" && (action.priority === "critical" || action.priority === "high"))) {
        rows.push({ event, action });
      }
    }
  }
  return rows
    .sort((a, b) => {
      const blocked = Number(b.action.status === "blocked") - Number(a.action.status === "blocked");
      if (blocked !== 0) return blocked;
      return priorityRank[a.action.priority] - priorityRank[b.action.priority];
    })
    .slice(0, 6);
}

export function categoryOrder(templates: TaskTemplate[]): string[] {
  const present = new Set(templates.map((template) => template.category));
  const preferred = [
    "פיקוד ושליטה",
    "ביטחון",
    "חירום והצלה",
    "רפואה",
    "אוכלוסייה",
    "הסברה",
    "תשתיות",
    "לוגיסטיקה",
  ];
  const ordered = preferred.filter((category) => present.has(category));
  const extras = [...present].filter((category) => !preferred.includes(category)).sort((a, b) => a.localeCompare(b, "he"));
  return [...ordered, ...extras];
}

export function actionSignature(action: { title: string; description: string; steps: { text: string }[] }): string {
  return JSON.stringify({
    title: action.title,
    description: action.description,
    steps: action.steps.map((step) => step.text),
  });
}

export function templateSignature(template: TaskTemplate): string {
  return JSON.stringify({
    title: template.title,
    description: template.description,
    steps: template.steps,
  });
}
