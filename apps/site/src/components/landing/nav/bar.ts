"use client";

import Link from "next/link";
import styled, { createGlobalStyle, css, keyframes } from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { BAR_PX, BAR_STEPS, focusRing, MORPH } from "./styles";

// The bar itself: brand, links and actions in one row, over the surface.
//
// The row is laid out once, at its full width. Condensing does not re-lay it
// out: the surface is clipped in from both sides and the brand and actions
// slide in by the same distance (--nav-shift), so the whole change is
// transforms, opacity and a clip.

// The room the nav takes at the top of the viewport, for anything that sticks
// or scrolls beneath it: the slim bar's height on the docs, the bar plus its
// top gap everywhere else.
export const NavHeight = createGlobalStyle<{ $docs: boolean }>`
  :root {
    --site-nav-height: ${({ theme, $docs }) => theme.space($docs ? BAR_STEPS : BAR_STEPS + 3)};
  }
`;

const drop = keyframes`
  from { transform: translateY(-110%); }
  to { transform: none; }
`;

const move = css`
  transition: transform ${MORPH} ${({ theme }) => theme.motion.ease};
`;

// Marks the top of the page: the bar condenses once this has scrolled away.
export const Sentinel = styled.span`
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: ${({ theme }) => theme.space(6)};
  pointer-events: none;
`;

export const Bar = styled.header`
  position: fixed;
  inset: 0 0 auto;
  z-index: 30;
  padding-top: ${({ theme }) => theme.space(3)};
  pointer-events: none;
  animation: ${drop} 700ms ${({ theme }) => theme.motion.ease} both;

  /* Widths are measured against the bar, not the viewport, so a scrollbar
     never throws the capsule off centre. */
  container-type: inline-size;
  --nav-full: 100vw;
  @supports (width: 1cqw) {
    --nav-full: 100cqw;
  }
  --nav-gutter: ${({ theme }) => theme.space(3)};
  --nav-wide: min(var(--nav-full) - 2 * var(--nav-gutter), ${({ theme }) => theme.layout.content});
  --nav-compact: min(var(--nav-full) - 2 * var(--nav-gutter), ${({ theme }) => theme.space(236)});
  --nav-shift: calc((var(--nav-wide) - var(--nav-compact)) / 2);
  /* How far the bar hangs below its condensed position at the top of a page. */
  --nav-drop: ${({ theme }) => theme.space(1)};

  ${({ theme }) => theme.media.sm} {
    --nav-gutter: ${({ theme }) => theme.space(4)};
    --nav-drop: ${({ theme }) => theme.space(2)};
  }

  &[data-sheet="true"] {
    z-index: 1102;
  }

  /* Over dense reference pages: a solid, slim, full-width strip that content
     scrolls beneath cleanly, instead of a floating capsule. */
  &[data-docs="true"] {
    height: var(--site-nav-height);
    padding: 0 var(--nav-gutter);
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
    background: ${({ theme }) => theme.color.canvas};
    pointer-events: auto;
    animation: none;
    --nav-shift: 0px;

    ${({ theme }) => theme.media.md} {
      padding-inline: ${({ theme }) => theme.layout.gutter};
    }
  }
`;

export const Row = styled.nav`
  position: relative;
  /* Its own stacking context, so the surface can sit behind the row. */
  isolation: isolate;
  display: grid;
  /* Links sit dead centre while there is room; when there is not, each side
     keeps its full width and the links simply move off centre. Nothing in
     the nav ever wraps or shrinks. */
  grid-template-columns: minmax(max-content, 1fr) auto minmax(max-content, 1fr);
  column-gap: ${({ theme }) => theme.space(3)};
  align-items: center;
  width: var(--nav-wide);
  height: ${BAR_PX}px;
  margin-inline: auto;
  padding-inline: ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(2)};
  white-space: nowrap;
  pointer-events: auto;
  transform: translateY(var(--nav-drop));
  ${move}

  &[data-compact="true"],
  &[data-docs="true"] {
    transform: none;
  }
  &[data-docs="true"] {
    width: 100%;
    padding-inline: 0;
  }
`;

// The hairline along the bar's lower edge. With a panel open it divides bar
// from panel; once the page has scrolled, it fills with how far.
const grow = keyframes`
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
`;

export const Rule = styled.span`
  position: absolute;
  top: ${BAR_PX - 1}px;
  left: 50%;
  width: var(--nav-wide);
  height: 1px;
  margin-left: calc(var(--nav-wide) / -2);
  pointer-events: none;
  --s: 0px;
  clip-path: inset(0 calc(var(--s) + ${({ theme }) => theme.radius.island}));
  transition: clip-path ${MORPH} ${({ theme }) => theme.motion.ease};

  [data-compact="true"] > & {
    --s: var(--nav-shift);
  }
  [data-docs="true"] > & {
    display: none;
  }

  b,
  i {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
  }
  b {
    background: ${({ theme }) => theme.color.line};
  }
  [data-open="true"] > & b {
    opacity: 1;
  }
  i {
    display: none;
    background: ${({ theme }) => theme.color.accentLine};
    transform-origin: 0 50%;
  }
  @supports (animation-timeline: scroll()) {
    i {
      display: block;
      animation: ${grow} linear both;
      animation-timeline: scroll(root block);
    }
    [data-compact="true"] > & i {
      opacity: 1;
    }
  }
`;

export const Brand = styled(Link)`
  ${focusRing}
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-self: start;
  padding-right: ${({ theme }) => theme.space(2)};
  border-radius: ${({ theme }) => theme.radius.control};
  color: ${({ theme }) => theme.color.fg};
  ${move}

  [data-compact="true"] > & {
    transform: translateX(var(--nav-shift));
  }

  /* The symbol only, not the lettering beside it. */
  svg:first-child {
    transition: transform ${({ theme }) => theme.motion.slow} ${({ theme }) => theme.motion.ease};
  }
  &:hover svg:first-child {
    transform: translateX(2px);
  }
`;

export const Links = styled.ul`
  display: none;
  align-items: center;
  height: 100%;

  ${({ theme }) => theme.media.md} {
    display: flex;
  }
`;

// A link in the bar, or the button that opens a panel. As tall as the bar,
// so the pointer can travel down into a panel without leaving it.
const item = css`
  ${type("label")}
  position: relative;
  display: flex;
  align-items: center;
  height: ${BAR_PX}px;
  padding: 0;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.color.fgMuted};
  cursor: pointer;
  transition:
    color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    transform ${MORPH} ${({ theme }) => theme.motion.ease};

  /* Condensed, the links sit midway between brand and actions rather than
     midway along the bar (--nav-links-shift is measured by SiteNav). */
  [data-compact="true"] & {
    transform: translateX(var(--nav-links-shift, 0px));
  }

  /* The visible face, which the highlight sits behind. */
  > span {
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(1.5)};
    padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3.5)};
    border-radius: ${({ theme }) => theme.radius.card};
  }
  .anticon {
    color: ${({ theme }) => theme.color.fgSubtle};
    font-size: 8px;
    transition: transform ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
  }
  &[aria-expanded="true"] .anticon {
    transform: rotate(180deg);
  }

  /* A bead under the link for the page you are on. */
  &::after {
    content: "";
    position: absolute;
    bottom: ${({ theme }) => theme.space(2.5)};
    left: 50%;
    width: ${({ theme }) => theme.space(1)};
    height: ${({ theme }) => theme.space(1)};
    margin-left: -${({ theme }) => theme.space(0.5)};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.accent};
    transform: scale(0);
    transition: transform ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
  }
  &:hover,
  &[aria-expanded="true"],
  &[aria-current] {
    color: ${({ theme }) => theme.color.fg};
  }
  &[aria-current]::after {
    transform: none;
  }
  &:focus-visible {
    outline: none;
    box-shadow: none;
  }
  &:focus-visible > span {
    outline: 2px solid ${({ theme }) => theme.color.accentLine};
    outline-offset: -1px;
  }
`;

export const NavLink = styled(Link)`
  ${item}
`;

export const Trigger = styled.button`
  ${item}
`;

// A panel's content, hung under the bar across the surface's full width.
// Laid out even while hidden, so its height is known before it opens.
export const Panel = styled.div`
  position: absolute;
  top: ${BAR_PX}px;
  left: 50%;
  width: var(--nav-wide);
  margin-left: calc(var(--nav-wide) / -2);
  padding-inline: 0;
  white-space: normal;
  opacity: 0;
  visibility: hidden;
  /* Hidden panels wait to the side they will arrive from (--away). */
  transform: var(--away);
  /* Cut to the surface while it is still growing to this panel's height. */
  clip-path: inset(0 0 var(--cut) 0);
  transition:
    opacity ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    transform ${MORPH} ${({ theme }) => theme.motion.ease},
    clip-path ${MORPH} ${({ theme }) => theme.motion.ease},
    visibility 0s linear ${({ theme }) => theme.motion.fast};

  [data-compact="true"] & {
    padding-inline: var(--nav-shift);
  }
  &[data-open="true"] {
    opacity: 1;
    visibility: visible;
    transform: none;
    transition-duration: ${({ theme }) => theme.motion.base}, ${MORPH}, ${MORPH}, 0s;
    transition-delay: 60ms, 0s, 0s, 0s;
  }
  ${({ theme }) => theme.media.reducedMotion} {
    transform: none;
  }
`;

export const Actions = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  grid-column: 3;
  justify-self: end;
  gap: ${({ theme }) => theme.space(1)};
  ${move}

  [data-compact="true"] > & {
    transform: translateX(calc(var(--nav-shift) * -1));
  }
  > * {
    flex: none;
  }
`;

// Opens the quick navigator.
export const Find = styled.button`
  ${focusRing}
  display: none;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  height: ${({ theme }) => theme.space(8.5)};
  padding-inline: ${({ theme }) => theme.space(2.5)};
  border: 0;
  border-radius: ${({ theme }) => theme.radius.card};
  background: transparent;
  color: ${({ theme }) => theme.color.fgMuted};
  cursor: pointer;
  transition:
    color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    background ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  kbd {
    display: none;
    color: ${({ theme }) => theme.color.fgSubtle};
    font-family: ${({ theme }) => theme.font.mono};
    font-size: 11px;
    line-height: 1;
  }
  &:hover {
    background: ${({ theme }) => theme.color.hover};
    color: ${({ theme }) => theme.color.fg};
  }
  ${({ theme }) => theme.media.sm} {
    display: inline-flex;
  }
  ${({ theme }) => theme.media.lg} {
    kbd {
      display: inline;
    }
  }
`;

export const SignIn = styled(Link)`
  ${type("label")}
  ${focusRing}
  display: none;
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  border-radius: ${({ theme }) => theme.radius.card};
  color: ${({ theme }) => theme.color.fgMuted};
  transition: color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &:hover {
    color: ${({ theme }) => theme.color.fg};
  }
  ${({ theme }) => theme.media.sm} {
    display: block;
  }
`;

export const GetStarted = styled(Link)`
  ${type("label")}
  ${focusRing}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  height: ${({ theme }) => theme.space(9)};
  padding-inline: ${({ theme }) => theme.space(3.5)};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.fg};
  color: ${({ theme }) => theme.color.canvas};
  font-weight: ${({ theme }) => theme.text.heading.weight};
  transition:
    background ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    transform ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  .anticon {
    font-size: 11px;
    transition: transform ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
  }
  &:hover {
    background: ${({ theme }) => theme.color.accent};
    color: ${({ theme }) => theme.color.accentFg};
  }
  &:hover .anticon {
    transform: translateX(2px);
  }
  &:active {
    transform: scale(0.97);
  }
`;

// Two bars that cross into a close mark.
export const Toggle = styled.button`
  ${focusRing}
  position: relative;
  width: ${({ theme }) => theme.space(9)};
  height: ${({ theme }) => theme.space(9)};
  margin-left: ${({ theme }) => theme.space(1)};
  padding: 0;
  border: 1px solid ${({ theme }) => theme.color.lineStrong};
  border-radius: ${({ theme }) => theme.radius.card};
  background: transparent;
  color: ${({ theme }) => theme.color.fg};
  cursor: pointer;

  i {
    position: absolute;
    top: 50%;
    left: 50%;
    width: ${({ theme }) => theme.space(4)};
    height: 1.5px;
    margin: -0.75px 0 0 -${({ theme }) => theme.space(2)};
    border-radius: 1px;
    background: currentColor;
    transition: transform ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
  }
  i:first-child {
    transform: translateY(-3px);
  }
  i:last-child {
    transform: translateY(3px);
  }
  &[aria-expanded="true"] {
    background: ${({ theme }) => theme.color.hover};
  }
  &[aria-expanded="true"] i:first-child {
    transform: rotate(45deg);
  }
  &[aria-expanded="true"] i:last-child {
    transform: rotate(-45deg);
  }

  ${({ theme }) => theme.media.md} {
    display: none;
  }
`;
