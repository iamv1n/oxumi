"use client";

import { useCallback, useSyncExternalStore } from "react";

// A boolean remembered in localStorage and shared by every component (and
// browser tab) that reads the same key.

const listeners = new Set<() => void>();
// Holds values the browser refused to store (private mode, full storage), so
// a toggle still works for the rest of the visit.
const memory = new Map<string, boolean>();

function read(key: string, fallback: boolean): boolean {
  const held = memory.get(key);
  if (held !== undefined) return held;
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : stored === "1";
  } catch {
    return fallback;
  }
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key) memory.delete(event.key);
    onChange();
  };
  listeners.add(onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStoredFlag(
  key: string,
  fallback: boolean,
  // What the server rendered, when it knows better than `fallback`.
  serverValue: boolean = fallback,
): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => serverValue,
  );
  const set = useCallback(
    (next: boolean) => {
      try {
        localStorage.setItem(key, next ? "1" : "0");
        memory.delete(key);
      } catch {
        memory.set(key, next);
      }
      listeners.forEach((notify) => notify());
    },
    [key],
  );
  return [value, set];
}

// Whether a media query matches; false while rendering on the server.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
