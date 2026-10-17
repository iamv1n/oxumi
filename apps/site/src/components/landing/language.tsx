"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";

// The site itself is written in English. What changes with this setting is
// the language of the EXAMPLE CALLS shown around the site, which is how a
// visitor sees that agents speak more than one language.

export const EXAMPLE_LANGUAGES = [
  { id: "en", label: "English" },
  { id: "hi", label: "Hindi" },
  { id: "hinglish", label: "Hinglish" },
] as const;

export type ExampleLanguage = (typeof EXAMPLE_LANGUAGES)[number]["id"];

// Example text in each language. Devanagari belongs only in `hi`.
export type Localized = Record<ExampleLanguage, string>;

const STORAGE_KEY = "oxumi:example-language";

interface LanguageContext {
  language: ExampleLanguage;
  setLanguage: (language: ExampleLanguage) => void;
}

const Context = createContext<LanguageContext>({
  language: "en",
  setLanguage: () => {},
});

export function ExampleLanguageProvider({ children }: { children: ReactNode }) {
  // English on the server and on first paint; a saved choice applies after.
  const [language, setCurrent] = useState<ExampleLanguage>("en");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (EXAMPLE_LANGUAGES.some((l) => l.id === saved)) {
      const id = setTimeout(() => setCurrent(saved as ExampleLanguage), 0);
      return () => clearTimeout(id);
    }
  }, []);

  const setLanguage = useCallback((next: ExampleLanguage) => {
    setCurrent(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode: the choice simply lasts for this visit.
    }
  }, []);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useExampleLanguage(): LanguageContext {
  return useContext(Context);
}

// Picks the current language's version of an example line.
export function useLocalized(): (text: Localized) => string {
  const { language } = useExampleLanguage();
  return useCallback((text: Localized) => text[language], [language]);
}

const Group = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1)};
  padding: ${({ theme }) => theme.space(1)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.surface};
`;

const Option = styled.button<{ $active: boolean }>`
  ${type("label")}
  padding: ${({ theme }) => theme.space(1.5)} ${({ theme }) => theme.space(3.5)};
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $active }) => ($active ? theme.color.accent : "transparent")};
  color: ${({ theme, $active }) => ($active ? theme.color.accentFg : theme.color.fgMuted)};
  cursor: pointer;
  transition:
    background ${({ theme }) => theme.motion.fast},
    color ${({ theme }) => theme.motion.fast};

  &:hover {
    color: ${({ theme, $active }) => ($active ? theme.color.accentFg : theme.color.fg)};
  }
`;

const Soon = styled.span`
  ${type("caption")}
  padding-inline: ${({ theme }) => theme.space(2.5)};
  color: ${({ theme }) => theme.color.fgSubtle};
  white-space: nowrap;
`;

// The standard control for choosing the example language. Sections may style
// their own, as long as they read and write the same context.
export function LanguageSwitch({ showSoon = true }: { showSoon?: boolean }) {
  const { language, setLanguage } = useExampleLanguage();
  return (
    <Group role="radiogroup" aria-label="Language of the example calls">
      {EXAMPLE_LANGUAGES.map((option) => (
        <Option
          key={option.id}
          type="button"
          role="radio"
          aria-checked={language === option.id}
          $active={language === option.id}
          onClick={() => setLanguage(option.id)}
        >
          {option.label}
        </Option>
      ))}
      {showSoon && <Soon>More coming</Soon>}
    </Group>
  );
}
