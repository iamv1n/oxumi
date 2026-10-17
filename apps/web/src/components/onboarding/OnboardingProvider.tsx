"use client";

import { Tour, type TourProps } from "antd";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "@/lib/api";

// Onboarding as guided highlights. A new user gets ONE automatic tour, the
// welcome guide on the projects page, and never an unprompted one again.
// Every other page still declares a guide, but it only runs when the user
// asks for it with the Guide button in the top bar.

export interface GuideStep {
  // CSS selector of the element to spotlight, normally [data-tour="..."].
  // Omit for a centred card (used for a page's opening step).
  target?: string;
  title: string;
  description: ReactNode;
  placement?: NonNullable<TourProps["steps"]>[number]["placement"];
}

export interface Guide {
  id: string;
  // True for the single welcome tour that starts by itself, once per user.
  // Leave unset everywhere else: those guides run on request only.
  autoStart?: boolean;
  steps: GuideStep[];
}

interface OnboardingContext {
  register: (guide: Guide) => () => void;
  // Replays the current page's guide. False when the page has none.
  start: () => boolean;
  available: boolean;
}

const Context = createContext<OnboardingContext | null>(null);

const AUTO_START_DELAY_MS = 700;
const TARGET_WAIT_MS = 6000;

const storageKey = (userId: string) => `oxumi:guides-seen:${userId}`;

function readSeen(userId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId)) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function markSeen(userId: string, id: string): void {
  const seen = new Set(readSeen(userId)).add(id);
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify([...seen]));
  } catch {
    // Private mode or full storage: the guide simply shows again next time.
  }
}

const find = (selector: string) => document.querySelector<HTMLElement>(selector);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [steps, setSteps] = useState<GuideStep[]>([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const guideRef = useRef<Guide | null>(null);

  // Opens with only the steps whose targets are on screen right now, so a
  // guide never points at something a particular state of the page lacks.
  const launch = useCallback((target: Guide) => {
    const present = target.steps.filter((s) => !s.target || find(s.target));
    if (!present.length) return false;
    setSteps(present);
    setCurrent(0);
    setOpen(true);
    return true;
  }, []);

  const register = useCallback((next: Guide) => {
    guideRef.current = next;
    setGuide(next);
    return () => {
      if (guideRef.current?.id !== next.id) return;
      guideRef.current = null;
      setGuide(null);
      setOpen(false);
    };
  }, []);

  // The welcome tour: wait for the page's content to arrive, then begin.
  useEffect(() => {
    if (!guide?.autoStart || !user || readSeen(user.id).includes(guide.id)) return;
    const firstTarget = guide.steps.find((s) => s.target)?.target;
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const attempt = () => {
      if (guideRef.current?.id !== guide.id) return;
      const ready = !firstTarget || find(firstTarget);
      if (ready) {
        if (launch(guide)) markSeen(user.id, guide.id);
      } else if (Date.now() - startedAt < TARGET_WAIT_MS) {
        timer = setTimeout(attempt, 300);
      }
    };
    timer = setTimeout(attempt, AUTO_START_DELAY_MS);
    return () => clearTimeout(timer);
  }, [guide, user, launch]);

  const value = useMemo<OnboardingContext>(
    () => ({
      register,
      available: guide !== null,
      start: () => (guideRef.current ? launch(guideRef.current) : false),
    }),
    [register, guide, launch],
  );

  return (
    <Context.Provider value={value}>
      {children}
      <Tour
        open={open}
        current={current}
        onChange={setCurrent}
        onClose={() => setOpen(false)}
        onFinish={() => setOpen(false)}
        scrollIntoViewOptions={{ block: "center" }}
        steps={steps.map((step) => ({
          title: step.title,
          description: step.description,
          placement: step.placement,
          target: step.target ? () => find(step.target!)! : null,
        }))}
      />
    </Context.Provider>
  );
}

export function useOnboarding(): OnboardingContext {
  const context = useContext(Context);
  if (!context) throw new Error("useOnboarding needs an OnboardingProvider above it.");
  return context;
}

// Declares the guide for the page calling it. Define the guide as a
// module-level constant so its identity is stable between renders.
export function usePageGuide(guide: Guide): void {
  const { register } = useOnboarding();
  useEffect(() => register(guide), [register, guide]);
}
