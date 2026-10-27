import type { ActionStatus, EventStatus, Priority } from "./types";

export const CATEGORIES = [
  "פיקוד ושליטה",
  "ביטחון",
  "חירום והצלה",
  "רפואה",
  "אוכלוסייה",
  "הסברה",
  "תשתיות",
  "לוגיסטיקה",
] as const;

export const EVENT_TYPES = ["חירום", "ביטחון", "תשתית", "אוכלוסייה", "תרגיל", "אחר"] as const;

export const priorityLabel: Record<Priority, string> = {
  low: "נמוכה",
  medium: "בינונית",
  high: "גבוהה",
  critical: "קריטית",
};

export const eventStatusLabel: Record<EventStatus, string> = {
  open: "פתוח",
  in_progress: "בביצוע",
  completed: "הושלם",
  cancelled: "בוטל",
};

export const actionStatusLabel: Record<ActionStatus, string> = {
  pending: "ממתינה",
  in_progress: "בביצוע",
  done: "הושלמה",
  blocked: "חסומה",
};

export const priorityRank: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const eventStatusRank: Record<EventStatus, number> = {
  in_progress: 0,
  open: 1,
  completed: 2,
  cancelled: 3,
};
