import { cn } from "@/lib/cn";
import { actionStatusLabel, eventStatusLabel, priorityLabel } from "@/lib/constants";
import type { ActionStatus, EventStatus, Priority } from "@/lib/types";

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", className)}>
      {children}
    </span>
  );
}

const priorityTone: Record<Priority, string> = {
  critical: "bg-rose-100 text-rose-950",
  high: "bg-orange-100 text-orange-950",
  medium: "bg-sand-200 text-ink-700",
  low: "bg-white text-ink-500 ring-1 ring-sand-300",
};

const eventTone: Record<EventStatus, string> = {
  open: "bg-sky-100 text-sky-950",
  in_progress: "bg-amber-100 text-amber-950",
  completed: "bg-lime-100 text-lime-950",
  cancelled: "bg-sand-200 text-ink-500",
};

const actionTone: Record<ActionStatus, string> = {
  pending: "bg-sand-200 text-ink-700",
  in_progress: "bg-amber-100 text-amber-950",
  done: "bg-lime-100 text-lime-950",
  blocked: "bg-rose-100 text-rose-950",
};

export function PriorityPill({ value }: { value: Priority }) {
  return <Pill className={priorityTone[value]}>{priorityLabel[value]}</Pill>;
}

export function EventStatusPill({ value }: { value: EventStatus }) {
  return <Pill className={eventTone[value]}>{eventStatusLabel[value]}</Pill>;
}

export function ActionStatusPill({ value }: { value: ActionStatus }) {
  return <Pill className={actionTone[value]}>{actionStatusLabel[value]}</Pill>;
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const percent = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand-200">
        <div className="h-full rounded-full bg-pine-700" style={{ width: `${percent}%` }} />
      </div>
      <span className="w-10 text-end text-xs tabular-nums text-ink-500">{percent}%</span>
    </div>
  );
}

export function PageIntro({ kicker, title, text }: { kicker?: string; title: string; text?: string }) {
  return (
    <div className="mb-6 max-w-2xl">
      {kicker ? <p className="mb-1 text-sm font-medium text-clay-700">{kicker}</p> : null}
      <h1 className="font-display text-4xl leading-none">{title}</h1>
      {text ? <p className="mt-3 text-sm leading-6 text-ink-700">{text}</p> : null}
    </div>
  );
}
