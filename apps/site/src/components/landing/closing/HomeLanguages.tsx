"use client";

import { useLayoutEffect, useRef } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { Container, Reveal, Section } from "../kit";
import { EXAMPLE_LANGUAGES, useExampleLanguage } from "../language";
import LanguageDemo from "./LanguageDemo";

// Home: a small band, not a section. The site is in English; this is where a
// visitor picks the language of the example calls and sees that three ways of
// speaking land as the same data.

const GOO = "home-languages-goo";
const BLEED = 16; // px of room around the options for the blur

const Band = styled(Section)`
  padding-block: ${({ theme }) => theme.space(8)};

  ${({ theme }) => theme.media.md} {
    padding-block: ${({ theme }) => theme.space(10)};
  }
`;

const Panel = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(6)};
  padding: ${({ theme }) => theme.space(6)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.panel};
  background: ${({ theme }) => theme.color.surface};

  ${({ theme }) => theme.media.md} {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
    gap: ${({ theme }) => theme.space(12)};
    align-items: center;
    padding: ${({ theme }) => theme.space(8)} ${({ theme }) => theme.space(10)};
  }

  h2 {
    font-family: ${({ theme }) => theme.font.display};
    font-size: calc(${({ theme }) => theme.text.display.size} * 0.62);
    line-height: ${({ theme }) => theme.text.display.line};
    font-weight: ${({ theme }) => theme.text.display.weight};
    color: ${({ theme }) => theme.color.fg};
    text-wrap: balance;
  }
  h2 + p {
    ${type("body")}
    font-size: ${({ theme }) => theme.text.heading.size};
    line-height: ${({ theme }) => theme.text.heading.line};
    max-width: 30rem;
    margin-top: ${({ theme }) => theme.space(3)};
    color: ${({ theme }) => theme.color.fgMuted};
    text-wrap: pretty;
  }
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(4)};
  margin-top: ${({ theme }) => theme.space(5)};

  > span {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Switch = styled.div`
  position: relative;
  display: inline-flex;
  padding: ${({ theme }) => theme.space(1)};
  border: 1px solid ${({ theme }) => theme.color.lineStrong};
  border-radius: ${({ theme }) => theme.radius.pill};
`;

// Only the highlight blobs live in this layer, so the filter never touches text.
const Goo = styled.div`
  position: absolute;
  inset: -${BLEED}px;
  filter: url(#${GOO});
  pointer-events: none;

  i {
    position: absolute;
    top: 0;
    left: 0;
    width: var(--bw, 0);
    height: var(--bh, 0);
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.accent};
    transform: translate(var(--bx, 0), var(--by, 0));
    transition:
      transform 380ms ${({ theme }) => theme.motion.ease},
      width 380ms ${({ theme }) => theme.motion.ease};
  }
  i + i {
    transition-duration: 720ms;
  }
`;

const Option = styled.button<{ $on: boolean }>`
  ${type("label")}
  position: relative;
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(4)};
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: none;
  color: ${({ $on, theme }) => ($on ? theme.color.accentFg : theme.color.fgMuted)};
  cursor: pointer;
  transition: color ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};

  &:hover {
    color: ${({ $on, theme }) => ($on ? theme.color.accentFg : theme.color.fg)};
  }
`;

const Defs = styled.svg`
  position: absolute;
  width: 0;
  height: 0;
`;

export default function HomeLanguages() {
  const { language, setLanguage } = useExampleLanguage();
  const host = useRef<HTMLDivElement>(null);
  const options = useRef<Partial<Record<string, HTMLButtonElement | null>>>({});

  // Slide the highlight under the chosen option.
  useLayoutEffect(() => {
    const el = host.current!;
    const place = () => {
      const option = options.current[language];
      if (!option) return;
      el.style.setProperty("--bx", `${option.offsetLeft + BLEED}px`);
      el.style.setProperty("--by", `${option.offsetTop + BLEED}px`);
      el.style.setProperty("--bw", `${option.offsetWidth}px`);
      el.style.setProperty("--bh", `${option.offsetHeight}px`);
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(el);
    return () => observer.disconnect();
  }, [language]);

  return (
    <Band id="languages" aria-labelledby="languages-heading">
      <Container>
        <Reveal>
          <Panel>
            <div>
              <h2 id="languages-heading">Your callers choose the language.</h2>
              <p>
                Agents speak English, Hindi and Hinglish today, and follow the caller turn by
                turn. Pick one to hear every example on this site that way.
              </p>
              <Row>
                <Switch ref={host} role="radiogroup" aria-label="Language of the example calls">
                  <Goo aria-hidden="true">
                    <i />
                    <i />
                  </Goo>
                  {EXAMPLE_LANGUAGES.map((option) => (
                    <Option
                      key={option.id}
                      ref={(el) => {
                        options.current[option.id] = el;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={language === option.id}
                      $on={language === option.id}
                      onClick={() => setLanguage(option.id)}
                    >
                      {option.label}
                    </Option>
                  ))}
                </Switch>
                <span>More coming</span>
              </Row>
            </div>
            <LanguageDemo />
          </Panel>
        </Reveal>
      </Container>

      <Defs aria-hidden="true" focusable="false">
        <filter id={GOO}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
          <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" />
        </filter>
      </Defs>
    </Band>
  );
}
