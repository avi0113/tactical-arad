import { randomUUID } from "node:crypto";
import { ACTION_STATUSES, EVENT_STATUSES, PRIORITIES } from "./types";
import type {
  ActionInput,
  ActionStep,
  Db,
  EventAction,
  EventInput,
  OpsEvent,
  TaskTemplate,
  TemplateInput,
} from "./types";

export class DomainError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "DomainError";
    this.status = status;
  }
}

export function newId(): string {
  return randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DomainError("בקשה לא תקינה");
  }
  return value as Record<string, unknown>;
}

function requireText(value: unknown, label: string, max: number): string {
  if (typeof value !== "string") throw new DomainError(`${label} הוא שדה חובה`);
  const text = value.trim();
  if (!text) throw new DomainError(`${label} הוא שדה חובה`);
  if (text.length > max) throw new DomainError(`${label} ארוך מדי`);
  return text;
}

function optionalText(value: unknown, label: string, max: number): string {
  if (value == null) return "";
  if (typeof value !== "string") throw new DomainError(`${label} לא תקין`);
  const text = value.trim();
  if (text.length > max) throw new DomainError(`${label} ארוך מדי`);
  return text;
}

function parseEnum<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  throw new DomainError(`${label} לא תקין`);
}

function parseMinutes(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10080) {
    throw new DomainError("משך משוער חייב להיות מספר דקות שלם בין 1 ל־10080");
  }
  return parsed;
}

function parseStepLines(value: unknown): string[] {
  if (!Array.isArray(value)) throw new DomainError("שלבי הביצוע לא תקינים");
  if (value.length > 40) throw new DomainError("אפשר לשמור עד 40 שלבים");
  const steps = value.map((item) => {
    if (typeof item !== "string") throw new DomainError("שלב לא תקין");
    return item.trim();
  }).filter(Boolean);
  if (steps.some((step) => step.length > 200)) throw new DomainError("שלב ארוך מדי");
  return steps;
}

function parseActionSteps(value: unknown): ActionStep[] {
  if (!Array.isArray(value)) throw new DomainError("שלבי הביצוע לא תקינים");
  if (value.length > 40) throw new DomainError("אפשר לשמור עד 40 שלבים");
  const seen = new Set<string>();
  const steps: ActionStep[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") throw new DomainError("שלב לא תקין");
    const record = item as Record<string, unknown>;
    const text = typeof record.text === "string" ? record.text.trim() : "";
    if (!text) continue;
    if (text.length > 200) throw new DomainError("שלב ארוך מדי");
    let id = typeof record.id === "string" && record.id.trim() && record.id.length <= 80 ? record.id : newId();
    if (seen.has(id)) id = newId();
    seen.add(id);
    steps.push({ id, text, done: Boolean(record.done) });
  }
  return steps;
}

function parseIso(value: unknown, label: string): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new DomainError(`${label} לא תקין`);
  }
  return new Date(value).toISOString();
}

function mustTemplate(db: Db, id: string): TaskTemplate {
  const template = db.templates.find((item) => item.id === id);
  if (!template) throw new DomainError("המשימה לא נמצאת במאגר", 404);
  return template;
}

function mustEvent(db: Db, id: string): OpsEvent {
  const event = db.events.find((item) => item.id === id);
  if (!event) throw new DomainError("האירוע לא נמצא", 404);
  return event;
}

function mustAction(event: OpsEvent, id: string): EventAction {
  const action = event.actions.find((item) => item.id === id);
  if (!action) throw new DomainError("הפעולה לא נמצאת באירוע", 404);
  return action;
}

function sortActions(event: OpsEvent) {
  event.actions.sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
  event.actions.forEach((action, index) => {
    action.order = index;
  });
}

function touchEvent(event: OpsEvent, now: string) {
  event.updatedAt = now;
}

function parseTemplateInput(body: unknown): TemplateInput {
  const record = asRecord(body);
  return {
    title: requireText(record.title, "שם המשימה", 140),
    description: optionalText(record.description, "תיאור", 4000),
    category: optionalText(record.category, "קטגוריה", 80) || "כללי",
    priority: parseEnum(record.priority, PRIORITIES, "עדיפות"),
    estimatedMinutes: parseMinutes(record.estimatedMinutes),
    defaultRole: optionalText(record.defaultRole, "תפקיד מוצע", 80),
    steps: parseStepLines(record.steps ?? []),
  };
}

function parseEventInput(body: unknown, partial: boolean): Partial<EventInput> & Pick<EventInput, never> {
  const record = asRecord(body);
  const input: Partial<EventInput> = {};
  if (!partial || "title" in record) input.title = requireText(record.title, "שם האירוע", 140);
  if (!partial || "description" in record) input.description = optionalText(record.description, "תיאור", 4000);
  if (!partial || "eventType" in record) input.eventType = optionalText(record.eventType, "סוג אירוע", 40) || "אחר";
  if (!partial || "status" in record) input.status = parseEnum(record.status, EVENT_STATUSES, "סטטוס");
  if (!partial || "severity" in record) input.severity = parseEnum(record.severity, PRIORITIES, "חומרה");
  if (!partial || "location" in record) input.location = optionalText(record.location, "מיקום", 160);
  if (!partial || "commander" in record) input.commander = optionalText(record.commander, "אחראי אירוע", 80);
  if (!partial || "startedAt" in record) input.startedAt = parseIso(record.startedAt, "מועד התחלה");
  return input;
}

function parseActionInput(body: unknown, partial: boolean): Partial<ActionInput> {
  const record = asRecord(body);
  const input: Partial<ActionInput> = {};
  if (!partial || "title" in record) input.title = requireText(record.title, "שם הפעולה", 140);
  if ("description" in record || !partial) input.description = optionalText(record.description, "תיאור", 4000);
  if ("category" in record || !partial) input.category = optionalText(record.category, "קטגוריה", 80) || "כללי";
  if ("priority" in record || !partial) input.priority = parseEnum(record.priority, PRIORITIES, "עדיפות");
  if ("status" in record || !partial) input.status = parseEnum(record.status ?? "pending", ACTION_STATUSES, "סטטוס");
  if ("assignee" in record || !partial) input.assignee = optionalText(record.assignee, "אחראי", 80);
  if ("estimatedMinutes" in record || !partial) input.estimatedMinutes = parseMinutes(record.estimatedMinutes);
  if ("notes" in record || !partial) input.notes = optionalText(record.notes, "הערות", 2000);
  if ("steps" in record || !partial) input.steps = parseActionSteps(record.steps ?? []);
  return input;
}

function writeActionFields(action: EventAction, patch: Partial<ActionInput>, now: string) {
  if (patch.title !== undefined) action.title = patch.title;
  if (patch.description !== undefined) action.description = patch.description;
  if (patch.category !== undefined) action.category = patch.category;
  if (patch.priority !== undefined) action.priority = patch.priority;
  if (patch.assignee !== undefined) action.assignee = patch.assignee;
  if (patch.estimatedMinutes !== undefined) action.estimatedMinutes = patch.estimatedMinutes;
  if (patch.notes !== undefined) action.notes = patch.notes;
  if (patch.steps !== undefined) action.steps = patch.steps;
  if (patch.status !== undefined) {
    action.status = patch.status;
    action.completedAt = patch.status === "done" ? action.completedAt ?? now : null;
  }
  action.updatedAt = now;
}

/**
 * Copy a library task into an event. The result shares no nested data with the template,
 * so later edits on either side stay independent.
 */
export function snapshotTemplate(
  template: TaskTemplate,
  order: number,
  now: string,
  makeId: () => string = newId,
): EventAction {
  return {
    id: makeId(),
    templateId: template.id,
    title: template.title,
    description: template.description,
    category: template.category,
    priority: template.priority,
    status: "pending",
    assignee: template.defaultRole,
    estimatedMinutes: template.estimatedMinutes,
    steps: template.steps.map((text) => ({ id: makeId(), text, done: false })),
    notes: "",
    order,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
}

export function insertTemplate(db: Db, input: TemplateInput, id = newId(), now = nowIso()): TaskTemplate {
  const template: TaskTemplate = {
    id,
    ...input,
    steps: [...input.steps],
    createdAt: now,
    updatedAt: now,
  };
  db.templates.unshift(template);
  return template;
}

export function applyTemplatePost(db: Db, body: unknown): string {
  const record = asRecord(body);
  if (typeof record.duplicateOf === "string") {
    const source = mustTemplate(db, record.duplicateOf);
    const copy = insertTemplate(db, {
      title: `${source.title} (עותק)`.slice(0, 140),
      description: source.description,
      category: source.category,
      priority: source.priority,
      estimatedMinutes: source.estimatedMinutes,
      defaultRole: source.defaultRole,
      steps: [...source.steps],
    });
    return copy.id;
  }
  if (record.fromEventAction) {
    const ref = asRecord(record.fromEventAction);
    const eventId = requireText(ref.eventId, "אירוע", 80);
    const actionId = requireText(ref.actionId, "פעולה", 80);
    return promoteAction(db, eventId, actionId);
  }
  return insertTemplate(db, parseTemplateInput(record)).id;
}

export function applyTemplatePatch(db: Db, id: string, body: unknown): string {
  const template = mustTemplate(db, id);
  const record = asRecord(body);
  const now = nowIso();
  if ("title" in record) template.title = requireText(record.title, "שם המשימה", 140);
  if ("description" in record) template.description = optionalText(record.description, "תיאור", 4000);
  if ("category" in record) template.category = optionalText(record.category, "קטגוריה", 80) || "כללי";
  if ("priority" in record) template.priority = parseEnum(record.priority, PRIORITIES, "עדיפות");
  if ("estimatedMinutes" in record) template.estimatedMinutes = parseMinutes(record.estimatedMinutes);
  if ("defaultRole" in record) template.defaultRole = optionalText(record.defaultRole, "תפקיד מוצע", 80);
  if ("steps" in record) template.steps = parseStepLines(record.steps);
  template.updatedAt = now;
  return template.id;
}

export function applyTemplateDelete(db: Db, id: string): null {
  const index = db.templates.findIndex((template) => template.id === id);
  if (index < 0) throw new DomainError("המשימה לא נמצאת במאגר", 404);
  db.templates.splice(index, 1);
  return null;
}

export function insertEvent(db: Db, input: EventInput, id = newId(), now = nowIso()): OpsEvent {
  const event: OpsEvent = {
    id,
    title: input.title,
    description: input.description,
    eventType: input.eventType,
    status: input.status,
    severity: input.severity,
    location: input.location,
    commander: input.commander,
    startedAt: input.startedAt,
    createdAt: now,
    updatedAt: now,
    actions: [],
  };
  db.events.unshift(event);
  return event;
}

export function applyEventPost(db: Db, body: unknown): string {
  const input = parseEventInput(body, false) as EventInput;
  return insertEvent(db, input).id;
}

export function applyEventPatch(db: Db, id: string, body: unknown): string {
  const event = mustEvent(db, id);
  const patch = parseEventInput(body, true);
  if (patch.title !== undefined) event.title = patch.title;
  if (patch.description !== undefined) event.description = patch.description;
  if (patch.eventType !== undefined) event.eventType = patch.eventType;
  if (patch.status !== undefined) event.status = patch.status;
  if (patch.severity !== undefined) event.severity = patch.severity;
  if (patch.location !== undefined) event.location = patch.location;
  if (patch.commander !== undefined) event.commander = patch.commander;
  if (patch.startedAt !== undefined) event.startedAt = patch.startedAt;
  touchEvent(event, nowIso());
  return event.id;
}

export function applyEventDelete(db: Db, id: string): null {
  const index = db.events.findIndex((event) => event.id === id);
  if (index < 0) throw new DomainError("האירוע לא נמצא", 404);
  db.events.splice(index, 1);
  return null;
}

export function addActionsFromTemplates(db: Db, eventId: string, templateIds: string[]): string {
  if (!Array.isArray(templateIds) || templateIds.length === 0) {
    throw new DomainError("לא נבחרו משימות מהמאגר");
  }
  if (templateIds.length > 40) throw new DomainError("אפשר להוסיף עד 40 פעולות בבת אחת");
  const event = mustEvent(db, eventId);
  const templates = templateIds.map((id) => {
    if (typeof id !== "string") throw new DomainError("משימה לא תקינה");
    return mustTemplate(db, id);
  });
  const now = nowIso();
  sortActions(event);
  for (const template of templates) {
    event.actions.push(snapshotTemplate(template, event.actions.length, now));
  }
  touchEvent(event, now);
  return event.id;
}

function addCustomAction(db: Db, eventId: string, body: unknown): string {
  const event = mustEvent(db, eventId);
  const input = parseActionInput(body, false) as ActionInput;
  const now = nowIso();
  sortActions(event);
  const action: EventAction = {
    id: newId(),
    templateId: null,
    title: input.title,
    description: input.description,
    category: input.category,
    priority: input.priority,
    status: input.status,
    assignee: input.assignee,
    estimatedMinutes: input.estimatedMinutes,
    steps: input.steps,
    notes: input.notes,
    order: event.actions.length,
    createdAt: now,
    updatedAt: now,
    completedAt: input.status === "done" ? now : null,
  };
  event.actions.push(action);
  touchEvent(event, now);
  return action.id;
}

export function duplicateAction(db: Db, eventId: string, actionId: string): string {
  const event = mustEvent(db, eventId);
  const source = mustAction(event, actionId);
  const now = nowIso();
  sortActions(event);
  const copy: EventAction = {
    ...source,
    id: newId(),
    title: `${source.title} (עותק)`.slice(0, 140),
    status: "pending",
    completedAt: null,
    steps: source.steps.map((step) => ({ id: newId(), text: step.text, done: false })),
    order: event.actions.length,
    createdAt: now,
    updatedAt: now,
  };
  event.actions.push(copy);
  touchEvent(event, now);
  return copy.id;
}

export function promoteAction(db: Db, eventId: string, actionId: string): string {
  const event = mustEvent(db, eventId);
  const action = mustAction(event, actionId);
  const template = insertTemplate(db, {
    title: action.title,
    description: action.description,
    category: action.category || "כללי",
    priority: action.priority,
    estimatedMinutes: action.estimatedMinutes,
    defaultRole: action.assignee,
    steps: action.steps.map((step) => step.text),
  });
  return template.id;
}

export function applyActionsPost(db: Db, eventId: string, body: unknown): string {
  const record = asRecord(body);
  if (Array.isArray(record.templateIds)) {
    return addActionsFromTemplates(db, eventId, record.templateIds as string[]);
  }
  if (typeof record.duplicateActionId === "string") {
    return duplicateAction(db, eventId, record.duplicateActionId);
  }
  if ("action" in record) {
    return addCustomAction(db, eventId, record.action);
  }
  throw new DomainError("בקשה לא תקינה");
}

export function applyActionPatch(db: Db, eventId: string, actionId: string, body: unknown): string {
  const event = mustEvent(db, eventId);
  const action = mustAction(event, actionId);
  const patch = parseActionInput(body, true);
  const now = nowIso();
  writeActionFields(action, patch, now);
  touchEvent(event, now);
  return action.id;
}

export function applyActionDelete(db: Db, eventId: string, actionId: string): null {
  const event = mustEvent(db, eventId);
  const index = event.actions.findIndex((action) => action.id === actionId);
  if (index < 0) throw new DomainError("הפעולה לא נמצאת באירוע", 404);
  event.actions.splice(index, 1);
  sortActions(event);
  touchEvent(event, nowIso());
  return null;
}

export function applyActionMove(db: Db, eventId: string, actionId: string, body: unknown): string {
  const record = asRecord(body);
  const direction = record.direction;
  if (direction !== "up" && direction !== "down") throw new DomainError("כיוון לא תקין");
  const event = mustEvent(db, eventId);
  sortActions(event);
  const index = event.actions.findIndex((action) => action.id === actionId);
  if (index < 0) throw new DomainError("הפעולה לא נמצאת באירוע", 404);
  const target = direction === "up" ? index - 1 : index + 1;
  if (target >= 0 && target < event.actions.length) {
    const [item] = event.actions.splice(index, 1);
    event.actions.splice(target, 0, item);
    event.actions.forEach((action, order) => {
      action.order = order;
    });
    touchEvent(event, nowIso());
  }
  return actionId;
}
