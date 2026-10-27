export const PRIORITIES = ["low", "medium", "high", "critical"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const EVENT_STATUSES = ["open", "in_progress", "completed", "cancelled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const ACTION_STATUSES = ["pending", "in_progress", "done", "blocked"] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  estimatedMinutes: number | null;
  defaultRole: string;
  steps: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ActionStep {
  id: string;
  text: string;
  done: boolean;
}

export interface EventAction {
  id: string;
  templateId: string | null;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: ActionStatus;
  assignee: string;
  estimatedMinutes: number | null;
  steps: ActionStep[];
  notes: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface OpsEvent {
  id: string;
  title: string;
  description: string;
  eventType: string;
  status: EventStatus;
  severity: Priority;
  location: string;
  commander: string;
  startedAt: string;
  createdAt: string;
  updatedAt: string;
  actions: EventAction[];
}

export interface Db {
  templates: TaskTemplate[];
  events: OpsEvent[];
}

export interface TemplateInput {
  title: string;
  description: string;
  category: string;
  priority: Priority;
  estimatedMinutes: number | null;
  defaultRole: string;
  steps: string[];
}

export interface EventInput {
  title: string;
  description: string;
  eventType: string;
  status: EventStatus;
  severity: Priority;
  location: string;
  commander: string;
  startedAt: string;
}

export interface ActionInput {
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: ActionStatus;
  assignee: string;
  estimatedMinutes: number | null;
  steps: ActionStep[];
  notes: string;
}
