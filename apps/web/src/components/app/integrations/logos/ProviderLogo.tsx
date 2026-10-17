"use client";

import styled from "styled-components";
import geminiMark from "./gemini.svg";
import { MARKS } from "./marks";

// A provider's own logo. Marks published in black and white follow the text
// colour; coloured ones keep their colours. Decorative: always shown beside
// the provider's name, so it is hidden from assistive technology.

const Box = styled.span<{ $size: number }>`
  display: inline-grid;
  place-items: center;
  flex: none;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  color: ${({ theme }) => theme.color.fg};

  svg,
  img {
    display: block;
    width: 100%;
    height: 100%;
  }
`;

// The logo on a neutral square, for lists and headers.
const TileBox = styled.span<{ $size: number }>`
  display: inline-grid;
  place-items: center;
  flex: none;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => theme.color.raised};
`;

const Letter = styled.span`
  font-weight: 600;
  line-height: 1;
`;

export function ProviderLogo({
  provider,
  size = 20,
  label,
}: {
  provider: string;
  size?: number;
  // Used only for a provider with no logo here, as a letter.
  label?: string;
}) {
  if (provider === "gemini") {
    return (
      <Box $size={size} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- a local 28 KB SVG; next/image adds nothing */}
        <img src={geminiMark.src} alt="" width={size} height={size} />
      </Box>
    );
  }
  const mark = MARKS[provider];
  if (!mark) {
    return (
      <Box $size={size} aria-hidden>
        <Letter style={{ fontSize: Math.round(size * 0.6) }}>
          {(label ?? provider).charAt(0).toUpperCase()}
        </Letter>
      </Box>
    );
  }
  return (
    <Box $size={size} aria-hidden>
      <svg viewBox="0 0 24 24" fill={mark.fill} focusable="false">
        <g transform={mark.transform}>
          {mark.paths.map((path, index) => (
            <path
              key={index}
              d={path.d}
              fill={path.fill}
              fillRule={path.evenOdd ? "evenodd" : undefined}
              clipRule={path.evenOdd ? "evenodd" : undefined}
            />
          ))}
        </g>
      </svg>
    </Box>
  );
}

export function ProviderTile({
  provider,
  label,
  size = 28,
}: {
  provider: string;
  label?: string;
  size?: number;
}) {
  return (
    <TileBox $size={size}>
      <ProviderLogo provider={provider} label={label} size={Math.round(size * 0.68)} />
    </TileBox>
  );
}

const Named = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  vertical-align: bottom;
`;

// A provider's name with its logo in front, for menus and lists elsewhere.
export function ProviderName({
  provider,
  label,
  size = 14,
}: {
  provider: string;
  label: string;
  size?: number;
}) {
  return (
    <Named>
      <ProviderLogo provider={provider} label={label} size={size} />
      {label}
    </Named>
  );
}
