"use client";

import Mark, { type Paint } from "./Mark";
import WordmarkArt from "./WordmarkArt";
import type { Concept } from "./types";

// The lowercase letters stand this tall beside a mark of height 1.
export const X_HEIGHT_RATIO = 0.5;
export const LOCKUP_GAP_RATIO = 0.34;

export const lockupOf = (concept: Concept) => concept.lockup ?? { xHeight: X_HEIGHT_RATIO, gap: LOCKUP_GAP_RATIO };

// A concept's horizontal lockup: mark, then its own wordmark.
export default function ConceptLockup({
  concept,
  size,
  paint,
  ink,
  animated,
}: {
  concept: Concept;
  // Height of the mark in pixels.
  size: number;
  paint: Paint;
  // Colour of the letters.
  ink: string;
  animated?: boolean;
}) {
  return (
    <span
      role="img"
      aria-label="Oxumi"
      style={{ display: "inline-flex", alignItems: "center", gap: size * lockupOf(concept).gap, color: ink }}
    >
      <Mark concept={concept} size={size} paint={paint} animated={animated} />
      <WordmarkArt spec={concept.wordmark} xHeight={size * lockupOf(concept).xHeight} plain={paint.type === "flat"} />
    </span>
  );
}
