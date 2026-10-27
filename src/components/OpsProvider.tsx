"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Db } from "@/lib/types";

export type ApiState = Db & { resultId?: string | null };

type OpsContextValue = {
  state: Db | null;
  error: string | null;
  pending: boolean;
  clearError: () => void;
  reload: () => Promise<void>;
  mutate: (url: string, method: string, body?: unknown) => Promise<ApiState>;
};

const OpsContext = createContext<OpsContextValue | null>(null);

function messageOf(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === "Failed to fetch") return "אין חיבור לשרת";
    return error.message;
  }
  return "הפעולה נכשלה";
}

export function OpsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Db | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const reload = useCallback(async () => {
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as Partial<ApiState> & { error?: string };
      if (!response.ok || !data.templates || !data.events) {
        throw new Error(data.error || "טעינת הנתונים נכשלה");
      }
      setState({ templates: data.templates, events: data.events });
      setError(null);
    } catch (error) {
      setError(messageOf(error));
      throw error;
    }
  }, []);

  useEffect(() => {
    let active = true;
    reload().catch((error: unknown) => {
      if (active) setError(messageOf(error));
    });
    return () => {
      active = false;
    };
  }, [reload]);

  const mutate = useCallback(async (url: string, method: string, body?: unknown) => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as Partial<ApiState> & { error?: string };
      if (!response.ok || !data.templates || !data.events) {
        throw new Error(data.error || "הפעולה נכשלה");
      }
      setState({ templates: data.templates, events: data.events });
      return data as ApiState;
    } catch (error) {
      const message = messageOf(error);
      setError(message);
      throw new Error(message);
    } finally {
      setPending(false);
    }
  }, []);

  const value = useMemo<OpsContextValue>(
    () => ({
      state,
      error,
      pending,
      clearError: () => setError(null),
      reload,
      mutate,
    }),
    [state, error, pending, reload, mutate],
  );

  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>;
}

export function useOps() {
  const context = useContext(OpsContext);
  if (!context) throw new Error("useOps נקרא מחוץ לספק הנתונים");
  return context;
}
