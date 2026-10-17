"use client";

import { css } from "styled-components";

// Geometry and motion the pieces of the site nav agree on.

// Height of the bar, in 4px steps and in pixels (the surface is clipped in px).
export const BAR_STEPS = 13;
export const BAR_PX = BAR_STEPS * 4;
// The tallest a dropdown panel may be. The surface is this much taller than
// the bar and clipped back to whatever is showing.
export const PANEL_MAX = 480;
// How long the surface takes to change shape, and everything that moves with it.
export const MORPH = "460ms";

export const focusRing = css`
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.accentLine};
    outline-offset: 2px;
    box-shadow: none;
  }
`;
