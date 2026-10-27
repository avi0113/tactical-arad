import { DomainError } from "../domain";
import { ACTION_STATUSES, EVENT_STATUSES, PRIORITIES } from "../types";
import type { ActionStatus, ActionStep, EventAction, EventStatus, OpsEvent, Priority, TaskTemplate } from "../types";

export type Fields = Record<string, string>;

type Fallback = {
  id: string;
  createdAt: string;
  updatedAt: string;
};

const TASK_STEPS = "שלבי המשימה";
const ACTION_STEPS = "שלבי הפעולה";

function text(fields: Fields, key: string): string {
  return fields[key]?.trim() ?? "";
}

function readEnum<T extends string>(value: string, allowed: readonly T[], fallback: T, label: string): T {
  if (!value) return fallback;
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new DomainError(`${label} לא מוכר ב-SharePoint: ${value}`);
}

function readDate(value: string, fallback: string, label: string): string {
  if (!value) return fallback;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) throw new DomainError(`${label} לא תקין ב-SharePoint`);
  return new Date(parsed).toISOString();
}

function readMinutes(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new DomainError("משך משוער לא תקין ב-SharePoint");
  return parsed;
}

function readJson(value: string, label: string): unknown {
  if (!value) return [];
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new DomainError(`${label} נשמרו ב-SharePoint בפורמט לא תקין`);
  }
}

function readStringList(value: string, label: string): string[] {
  const parsed = readJson(value, label);
  if (!Array.isArray(parsed)) throw new DomainError(`${label} נשמרו ב-SharePoint בפורמט לא תקין`);
  return parsed.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

function readActionSteps(value: string): ActionStep[] {
  const parsed = readJson(value, ACTION_STEPS);
  if (!Array.isArray(parsed)) throw new DomainError(`${ACTION_STEPS} נשמרו ב-SharePoint בפורמט לא תקין`);
  return parsed.map((item, index) => {
    if (!item || typeof item !== "object") throw new DomainError("שלב לא תקין ב-SharePoint");
    const record = item as Record<string, unknown>;
    const stepText = typeof record.text === "string" ? record.text.trim() : "";
    if (!stepText) throw new DomainError("שלב ריק ב-SharePoint");
    const id = typeof record.id === "string" && record.id.trim() ? record.id : `step-${index + 1}`;
    return { id, text: stepText, done: Boolean(record.done) };
  });
}

export function templateToFields(template: TaskTemplate): Fields {
  return {
    Title: template.title,
    OpsAppId: template.id,
    OpsBody: template.description,
    OpsCategory: template.category,
    OpsPriority: template.priority,
    OpsMinutes: template.estimatedMinutes == null ? "" : String(template.estimatedMinutes),
    OpsRole: template.defaultRole,
    OpsSteps: JSON.stringify(template.steps),
    OpsCreatedAt: template.createdAt,
    OpsUpdatedAt: template.updatedAt,
  };
}

export function fieldsToTemplate(fields: Fields, fallback: Fallback): TaskTemplate {
  const title = text(fields, "Title") || "ללא שם";
  return {
    id: text(fields, "OpsAppId") || fallback.id,
    title,
    description: fields.OpsBody?.trim() ?? "",
    category: text(fields, "OpsCategory") || "כללי",
    priority: readEnum(text(fields, "OpsPriority"), PRIORITIES, "medium", `עדיפות של «${title}»`),
    estimatedMinutes: readMinutes(text(fields, "OpsMinutes")),
    defaultRole: text(fields, "OpsRole"),
    steps: readStringList(fields.OpsSteps ?? "", TASK_STEPS),
    createdAt: readDate(text(fields, "OpsCreatedAt"), fallback.createdAt, `תאריך יצירה של «${title}»`),
    updatedAt: readDate(text(fields, "OpsUpdatedAt"), fallback.updatedAt, `תאריך עדכון של «${title}»`),
  };
}

export function eventToFields(event: OpsEvent): Fields {
  return {
    Title: event.title,
    OpsAppId: event.id,
    OpsBody: event.description,
    OpsEventType: event.eventType,
    OpsStatus: event.status,
    OpsSeverity: event.severity,
    OpsLocation: event.location,
    OpsCommander: event.commander,
    OpsStartedAt: event.startedAt,
    OpsCreatedAt: event.createdAt,
    OpsUpdatedAt: event.updatedAt,
  };
}

export function fieldsToEvent(fields: Fields, fallback: Fallback): Omit<OpsEvent, "actions"> {
  const title = text(fields, "Title") || "ללא שם";
  const createdAt = readDate(text(fields, "OpsCreatedAt"), fallback.createdAt, `תאריך יצירה של «${title}»`);
  return {
    id: text(fields, "OpsAppId") || fallback.id,
    title,
    description: fields.OpsBody?.trim() ?? "",
    eventType: text(fields, "OpsEventType") || "אחר",
    status: readEnum(text(fields, "OpsStatus"), EVENT_STATUSES, "open", `סטטוס של «${title}»`),
    severity: readEnum(text(fields, "OpsSeverity"), PRIORITIES, "medium", `חומרה של «${title}»`),
    location: text(fields, "OpsLocation"),
    commander: text(fields, "OpsCommander"),
    startedAt: readDate(text(fields, "OpsStartedAt"), createdAt, `התחלה של «${title}»`),
    createdAt,
    updatedAt: readDate(text(fields, "OpsUpdatedAt"), fallback.updatedAt, `תאריך עדכון של «${title}»`),
  };
}

export function actionToFields(eventId: string, action: EventAction): Fields {
  return {
    Title: action.title,
    OpsAppId: action.id,
    OpsEventId: eventId,
    OpsTemplateId: action.templateId ?? "",
    OpsBody: action.description,
    OpsCategory: action.category,
    OpsPriority: action.priority,
    OpsStatus: action.status,
    OpsAssignee: action.assignee,
    OpsMinutes: action.estimatedMinutes == null ? "" : String(action.estimatedMinutes),
    OpsSteps: JSON.stringify(action.steps),
    OpsNotes: action.notes,
    OpsOrder: String(action.order),
    OpsCompletedAt: action.completedAt ?? "",
    OpsCreatedAt: action.createdAt,
    OpsUpdatedAt: action.updatedAt,
  };
}

export function fieldsToAction(fields: Fields, fallback: Fallback): { eventId: string; action: EventAction } {
  const title = text(fields, "Title") || "ללא שם";
  const eventId = text(fields, "OpsEventId");
  if (!eventId) throw new DomainError(`הפעולה «${title}» לא משויכת לאירוע ב-SharePoint`);
  const order = text(fields, "OpsOrder");
  const parsedOrder = order ? Number(order) : 0;
  if (!Number.isInteger(parsedOrder)) throw new DomainError(`סדר הפעולה «${title}» לא תקין ב-SharePoint`);
  const completedAt = text(fields, "OpsCompletedAt");
  const status = readEnum(text(fields, "OpsStatus"), ACTION_STATUSES, "pending", `סטטוס של «${title}»`);
  return {
    eventId,
    action: {
      id: text(fields, "OpsAppId") || fallback.id,
      templateId: text(fields, "OpsTemplateId") || null,
      title,
      description: fields.OpsBody?.trim() ?? "",
      category: text(fields, "OpsCategory") || "כללי",
      priority: readEnum(text(fields, "OpsPriority"), PRIORITIES, "medium", `עדיפות של «${title}»`),
      status,
      assignee: text(fields, "OpsAssignee"),
      estimatedMinutes: readMinutes(text(fields, "OpsMinutes")),
      steps: readActionSteps(fields.OpsSteps ?? ""),
      notes: fields.OpsNotes?.trim() ?? "",
      order: parsedOrder,
      createdAt: readDate(text(fields, "OpsCreatedAt"), fallback.createdAt, `תאריך יצירה של «${title}»`),
      updatedAt: readDate(text(fields, "OpsUpdatedAt"), fallback.updatedAt, `תאריך עדכון של «${title}»`),
      completedAt: completedAt ? readDate(completedAt, "", `השלמה של «${title}»`) || null : null,
    },
  };
}

export function sameFields(left: Fields, right: Fields): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if ((left[key] ?? "") !== (right[key] ?? "")) return false;
  }
  return true;
}

export type ColumnSpec = {
  name: string;
  displayName: string;
  multiline?: boolean;
};

const identityColumns: ColumnSpec[] = [
  { name: "OpsAppId", displayName: "מזהה" },
  { name: "OpsCreatedAt", displayName: "נוצר" },
  { name: "OpsUpdatedAt", displayName: "עודכן" },
];

export const TASK_COLUMNS: ColumnSpec[] = [
  ...identityColumns,
  { name: "OpsBody", displayName: "תיאור", multiline: true },
  { name: "OpsCategory", displayName: "קטגוריה" },
  { name: "OpsPriority", displayName: "עדיפות" },
  { name: "OpsMinutes", displayName: "דקות משוערות" },
  { name: "OpsRole", displayName: "תפקיד מוצע" },
  { name: "OpsSteps", displayName: "שלבים", multiline: true },
];

export const EVENT_COLUMNS: ColumnSpec[] = [
  ...identityColumns,
  { name: "OpsBody", displayName: "תיאור", multiline: true },
  { name: "OpsEventType", displayName: "סוג אירוע" },
  { name: "OpsStatus", displayName: "סטטוס" },
  { name: "OpsSeverity", displayName: "חומרה" },
  { name: "OpsLocation", displayName: "מיקום" },
  { name: "OpsCommander", displayName: "אחראי" },
  { name: "OpsStartedAt", displayName: "התחלה" },
];

export const ACTION_COLUMNS: ColumnSpec[] = [
  ...identityColumns,
  { name: "OpsEventId", displayName: "מזהה אירוע" },
  { name: "OpsTemplateId", displayName: "מזהה משימת מקור" },
  { name: "OpsBody", displayName: "תיאור", multiline: true },
  { name: "OpsCategory", displayName: "קטגוריה" },
  { name: "OpsPriority", displayName: "עדיפות" },
  { name: "OpsStatus", displayName: "סטטוס" },
  { name: "OpsAssignee", displayName: "אחראי" },
  { name: "OpsMinutes", displayName: "דקות משוערות" },
  { name: "OpsSteps", displayName: "שלבים", multiline: true },
  { name: "OpsNotes", displayName: "הערות", multiline: true },
  { name: "OpsOrder", displayName: "סדר" },
  { name: "OpsCompletedAt", displayName: "הושלם" },
];

export const META_COLUMNS: ColumnSpec[] = [
  { name: "OpsAppId", displayName: "מזהה" },
  { name: "OpsMeta", displayName: "ערך" },
];

export function columnDefinition(spec: ColumnSpec): Record<string, unknown> {
  if (spec.multiline) {
    return {
      name: spec.name,
      displayName: spec.displayName,
      text: {
        allowMultipleLines: true,
        appendChangesToExistingText: false,
        linesForEditing: 6,
        textType: "plain",
      },
    };
  }
  return {
    name: spec.name,
    displayName: spec.displayName,
    text: { allowMultipleLines: false, maxLength: 255 },
  };
}
