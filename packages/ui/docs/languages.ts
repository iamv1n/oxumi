"use client";

import { useSyncExternalStore } from "react";
import type { CodeLanguage } from "./highlight";

// The nine languages every sample is written in, and the reader's choice
// among them. The choice is shared by every code block on the docs site and
// in the app, and remembered between visits.

export const SAMPLE_LANGUAGES = [
  { id: "curl", label: "cURL", mark: "sh", highlight: "bash" },
  { id: "javascript", label: "JavaScript", mark: "JS", highlight: "javascript" },
  { id: "typescript", label: "TypeScript", mark: "TS", highlight: "typescript" },
  { id: "python", label: "Python", mark: "Py", highlight: "python" },
  { id: "go", label: "Go", mark: "Go", highlight: "go" },
  { id: "php", label: "PHP", mark: "php", highlight: "php" },
  { id: "ruby", label: "Ruby", mark: "Rb", highlight: "ruby" },
  { id: "java", label: "Java", mark: "Jv", highlight: "java" },
  { id: "csharp", label: "C#", mark: "C#", highlight: "csharp" },
] as const satisfies readonly { id: string; label: string; mark: string; highlight: CodeLanguage }[];

export type SampleLanguage = (typeof SAMPLE_LANGUAGES)[number]["id"];

// One piece of code in every language.
export type Samples = Record<SampleLanguage, string>;

export const languageInfo = (id: SampleLanguage) =>
  SAMPLE_LANGUAGES.find((language) => language.id === id)!;

const KEY = "oxumi:sample-language";
const EVENT = "oxumi:sample-language";

function read(): SampleLanguage {
  try {
    const saved = localStorage.getItem(KEY);
    if (SAMPLE_LANGUAGES.some((l) => l.id === saved)) return saved as SampleLanguage;
  } catch {
    // Storage unavailable: fall through to the default.
  }
  return "curl";
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// [current language, set it]. cURL on the server and on first paint.
export function useSampleLanguage(): [SampleLanguage, (next: SampleLanguage) => void] {
  const language = useSyncExternalStore<SampleLanguage>(subscribe, read, () => "curl");
  const set = (next: SampleLanguage) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // The choice then lasts only until the page is left.
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return [language, set];
}
