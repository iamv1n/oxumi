"use client";

import { css } from "styled-components";

// The "gooey" look: blur a layer of solid blobs, then threshold the alpha so
// nearby blobs fuse into one liquid shape. Apply `goo` only to layers that
// hold blobs; text always sits outside, so it stays crisp.
export const GOO_ID = "oxumi-goo";

export const goo = css`
  filter: url(#${GOO_ID});
`;

// Rendered once per page; zero-sized, it only hosts the filter definition.
export function GooFilter() {
  return (
    <svg width="0" height="0" aria-hidden focusable="false" style={{ position: "absolute" }}>
      <defs>
        <filter
          id={GOO_ID}
          x="-30%"
          y="-60%"
          width="160%"
          height="220%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11"
          />
        </filter>
      </defs>
    </svg>
  );
}
