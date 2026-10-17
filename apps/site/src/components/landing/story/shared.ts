"use client";

import { useSyncExternalStore } from "react";
import styled from "styled-components";

// A token colour at reduced strength, for tints and glows.
export const tint = (colour: string, percent: number) =>
  `color-mix(in srgb, ${colour} ${percent}%, transparent)`;

export const SrOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`;

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const query = matchMedia(QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => matchMedia(QUERY).matches,
    () => false,
  );
}
