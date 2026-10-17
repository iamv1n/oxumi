"use client";

import { useMemo } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import type { Colorway } from "@oxumi/ui/brand/kit/colorways";
import { renderDesign } from "@oxumi/ui/brand/kit/compose";
import { svgDataUrl } from "./export";
import { stageColor } from "./Gallery";
import { taglinePaths } from "@oxumi/ui/brand/kit/tagline";
import { BRAND_DESCRIPTOR, BRAND_LINE, TAGLINE } from "@oxumi/ui/design/logo";

const Faces = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};

  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  article {
    padding: ${({ theme }) => theme.space(5)};
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: ${({ theme }) => theme.radius.card};
    background: ${({ theme }) => theme.color.surface};
  }
  .specimen {
    min-height: 5.5rem;
    color: ${({ theme }) => theme.color.fg};
  }
  h3 {
    ${type("label")}
    font-weight: 600;
    margin-top: ${({ theme }) => theme.space(4)};
    color: ${({ theme }) => theme.color.fg};
  }
  p {
    ${type("body")}
    margin-top: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.fgMuted};
    text-wrap: pretty;
  }
`;

// The typefaces the site loads (app/layout.tsx) and where the type scale in
// @oxumi/ui/design/tokens puts each one.
export function Typefaces() {
  return (
    <Faces>
      <article>
        <div className="specimen" style={{ fontFamily: "var(--font-instrument-serif), Georgia, serif", fontSize: "2.5rem", lineHeight: 1.05 }}>
          Design the call. <em>The agent makes it.</em>
        </div>
        <h3>Instrument Serif</h3>
        <p>Display. Page titles and section headings, regular weight only, with the italic for the half of a line that answers the other.</p>
      </article>
      <article>
        <div className="specimen" style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif", fontSize: "1.125rem", lineHeight: 1.55 }}>
          Draw a phone conversation as a flow. A voice agent makes the call and returns every answer as validated data.
        </div>
        <h3>Geist</h3>
        <p>Everything else: body, labels, buttons, the interface. 400 for reading, 500 and 600 for labels and headings.</p>
      </article>
      <article>
        <div className="specimen" style={{ fontFamily: "var(--font-geist-mono), ui-monospace, monospace", fontSize: "0.9375rem", lineHeight: 1.6 }}>
          {`{ "decision": "reschedule",`}
          <br />
          {`  "preferred_slot": "Saturday morning" }`}
        </div>
        <h3>Geist Mono</h3>
        <p>Code, field names, values and anything a developer will copy.</p>
      </article>
      <article>
        <div className="specimen" style={{ fontFamily: "var(--font-noto-devanagari), var(--font-geist-sans), sans-serif", fontSize: "1.375rem", lineHeight: 1.5 }}>
          क्या मैं शनिवार सुबह आ सकता हूँ?
        </div>
        <h3>Noto Sans Devanagari</h3>
        <p>Hindi. Geist has no Devanagari, so Hindi text falls through to this face at 400 and 500.</p>
      </article>
    </Faces>
  );
}

const Rules = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(8)};

  ${({ theme }) => theme.media.md} {
    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
    gap: ${({ theme }) => theme.space(12)};
  }

  .trial {
    display: grid;
    gap: ${({ theme }) => theme.space(7)};
    padding: ${({ theme }) => theme.space(8)} ${({ theme }) => theme.space(6)};
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: ${({ theme }) => theme.radius.card};
  }
  .trial img {
    display: block;
    width: 100%;
    height: auto;
  }
  .trial .alone {
    width: 86%;
    margin-inline: auto;
    opacity: 0.86;
  }
  .trial + p,
  li {
    ${type("body")}
    font-size: ${({ theme }) => theme.text.heading.size};
    line-height: ${({ theme }) => theme.text.heading.line};
    color: ${({ theme }) => theme.color.fgMuted};
    text-wrap: pretty;
  }
  .trial + p {
    margin-top: ${({ theme }) => theme.space(4)};
  }
  ul {
    display: grid;
    gap: ${({ theme }) => theme.space(4)};
  }
  li strong {
    display: block;
    color: ${({ theme }) => theme.color.fg};
    font-weight: 600;
  }
  .pair {
    display: grid;
    gap: ${({ theme }) => theme.space(1)};
    margin-top: ${({ theme }) => theme.space(2)};
    padding-left: ${({ theme }) => theme.space(4)};
    border-left: 2px solid ${({ theme }) => theme.color.lineStrong};
  }
  .pair s {
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

export function Voice({ cw }: { cw: Colorway }) {
  // The tagline in place under the wordmark, and by itself, drawn the way
  // the logo files draw it.
  const lockup = useMemo(() => svgDataUrl(renderDesign("tagline", cw).svg), [cw]);
  const alone = useMemo(() => {
    const cap = 10;
    const { d, stroke } = taglinePaths(TAGLINE, 132, cap);
    return svgDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 132 10" width="1056" height="80" fill="none"><path d="${d}" stroke="${cw.bg ? cw.ink : cw.backdrop === "dark" ? "#ffffff" : "#0a1024"}" stroke-width="${stroke}" stroke-linejoin="round"/></svg>`,
    );
  }, [cw]);
  return (
    <Rules>
      <div>
        <div className="trial" style={{ background: stageColor(cw) }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lockup} alt={`The Oxumi lockup with the tagline: ${TAGLINE}`} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="alone" src={alone} alt="" />
        </div>
        <p>
          The tagline, on trial: &ldquo;{TAGLINE}&rdquo;. One line of drawn capitals under the wordmark, exactly as wide
          as it is, with their height three tenths of the letters&apos;. It appears only where the lockup is at least
          140 pixels wide. Headlines are separate: banners and pages use the site&apos;s own, &ldquo;{BRAND_LINE}
          &rdquo;, in the display serif, or the descriptor: &ldquo;{BRAND_DESCRIPTOR}&rdquo;
        </p>
      </div>
      <ul>
        <li>
          <strong>Say what happens.</strong>
          Name the thing and what it does, in the order it happens.
          <span className="pair">
            <span>A voice agent makes the call and returns the answers.</span>
            <s>Revolutionise customer engagement with conversational AI.</s>
          </span>
        </li>
        <li>
          <strong>Use the number.</strong>
          A figure, a field name or an example beats an adjective.
          <span className="pair">
            <span>Median first audio: 742 ms after the caller stops.</span>
            <s>Blazing-fast, human-like responses.</s>
          </span>
        </li>
        <li>
          <strong>Keep it level.</strong>
          Short sentences, no exclamation marks, no promises the product has not kept. If something is an early build,
          say so.
        </li>
      </ul>
    </Rules>
  );
}
