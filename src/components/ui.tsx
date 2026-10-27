"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { actionStatusLabel, eventStatusLabel, priorityLabel } from "@/lib/constants";
import type { ActionStatus, EventStatus, Priority } from "@/lib/types";

export const inputClass =
  "w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-clay-700 focus:ring-2 focus:ring-clay-700/15";

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const styles = {
    primary: "bg-clay-700 text-sand-50 hover:bg-clay-600",
    secondary: "bg-white text-ink-900 ring-1 ring-sand-300 hover:bg-sand-50",
    ghost: "text-ink-700 hover:bg-sand-200/80",
    danger: "bg-rose-800 text-white hover:bg-rose-900",
  }[variant];
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        styles,
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>
      {children}
    </label>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-0 sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-sand-50 p-5 shadow-xl sm:rounded-3xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg",
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl leading-tight">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-ink-500 hover:bg-sand-200">
            סגור
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm leading-6 text-ink-700">{body}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          ביטול
        </Button>
      </div>
    </Modal>
  );
}

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

export function LoadingBlock() {
  return <p className="py-16 text-center text-sm text-ink-500">טוען את הנתונים…</p>;
}

export function PageIntro({
  kicker,
  title,
  text,
  action,
}: {
  kicker?: string;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {kicker ? <p className="mb-1 text-sm font-medium text-clay-700">{kicker}</p> : null}
        <h1 className="font-display text-4xl leading-none">{title}</h1>
        {text ? <p className="mt-3 text-sm leading-6 text-ink-700">{text}</p> : null}
      </div>
      {action}
    </div>
  );
}
