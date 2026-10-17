"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

// Which parts of the console are open. A viewing preference, remembered per
// browser; it is not part of the call's state.
export interface ConsoleLayout {
  setup: boolean;
  live: boolean;
  flow: boolean;
  fields: boolean;
  latency: boolean;
}
export type LayoutKey = keyof ConsoleLayout;

const KEY = "oxumi:test-console-layout";
const DEFAULT: ConsoleLayout = { setup: true, live: true, flow: true, fields: true, latency: true };

const listeners = new Set<() => void>();
// Used when storage is unavailable (private mode), so toggles still work.
let memory: string | null = null;

function read(): string {
  if (memory !== null) return memory;
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function write(raw: string): void {
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    memory = raw;
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Keep several open tabs in step.
  const onStorage = (event: StorageEvent) => event.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function parse(raw: string): ConsoleLayout {
  if (!raw) return DEFAULT;
  try {
    const saved = JSON.parse(raw) as Partial<Record<LayoutKey, unknown>>;
    const layout = { ...DEFAULT };
    for (const key of Object.keys(DEFAULT) as LayoutKey[])
      if (typeof saved[key] === "boolean") layout[key] = saved[key];
    return layout;
  } catch {
    return DEFAULT;
  }
}

export function useConsoleLayout(): [ConsoleLayout, (key: LayoutKey, open: boolean) => void] {
  // The server renders the default; the saved layout applies after hydration.
  const raw = useSyncExternalStore(subscribe, read, () => "");
  const layout = useMemo(() => parse(raw), [raw]);
  const set = useCallback(
    (key: LayoutKey, open: boolean) => write(JSON.stringify({ ...parse(read()), [key]: open })),
    [],
  );
  return [layout, set];
}
