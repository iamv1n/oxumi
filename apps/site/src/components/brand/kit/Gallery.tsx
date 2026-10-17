"use client";

import { useMemo } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { brandColor, colorways, type Colorway } from "@oxumi/ui/brand/kit/colorways";
import { DESIGNS, renderDesign, type DesignId } from "@oxumi/ui/brand/kit/compose";
import { downloadPng, downloadSvg, svgDataUrl } from "./export";
import { Action, CopyButton } from "./ui";

export const PNG_SIZES = [512, 1024, 2048] as const;

const Bar = styled.div`
  position: sticky;
  /* Below the site nav, which publishes its own height. */
  top: calc(var(--site-nav-height, ${({ theme }) => theme.space(16)}) + ${({ theme }) => theme.space(3)});
  z-index: 5;
  display: grid;
  gap: ${({ theme }) => theme.space(3)};
  margin-bottom: ${({ theme }) => theme.space(5)};
  padding: ${({ theme }) => theme.space(3)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: color-mix(in srgb, ${({ theme }) => theme.color.surface} 88%, transparent);
  backdrop-filter: blur(14px);

  .group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${({ theme }) => theme.space(1.5)};
  }
  .title {
    ${type("overline")}
    width: 5.5rem;
    flex: none;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Chip = styled.button<{ $on: boolean }>`
  ${type("label")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  min-height: 32px;
  padding: 0 ${({ theme }) => theme.space(3)} 0 ${({ theme }) => theme.space(1.5)};
  border: 1px solid ${({ theme, $on }) => ($on ? theme.color.fg : theme.color.line)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $on }) => ($on ? theme.color.raised : "transparent")};
  color: ${({ theme, $on }) => ($on ? theme.color.fg : theme.color.fgMuted)};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.color.fg};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadow.focus};
  }
  i {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px ${({ theme }) => theme.color.lineStrong};
  }
  small {
    ${type("caption")}
    color: ${({ theme }) => theme.color.accentText};
  }
`;

const Size = styled(Chip)`
  padding-inline: ${({ theme }) => theme.space(3)};
  font-variant-numeric: tabular-nums;
`;

// A chip's swatch: the colourway's ground with its two mark colours across it.
const swatch = (cw: Colorway) =>
  `linear-gradient(135deg, ${cw.upper[0]} 0 38%, ${cw.lower[0]} 38% 68%, ${cw.bg ?? cw.tile} 68%)`;

export function ColorwayBar({
  value,
  onChange,
  size,
  onSize,
}: {
  value: string;
  onChange: (id: string) => void;
  size?: number;
  onSize?: (size: number) => void;
}) {
  const groups = [
    ["Brand", colorways.filter((c) => !c.alternate)],
    ["Alternate", colorways.filter((c) => c.alternate)],
  ] as const;
  return (
    <Bar>
      {groups.map(([title, list]) => (
        <div className="group" key={title} role="group" aria-label={`${title} colourways`}>
          <span className="title">{title}</span>
          {list.map((cw, index) => (
            <Chip key={cw.id} type="button" $on={cw.id === value} aria-pressed={cw.id === value} onClick={() => onChange(cw.id)}>
              <i style={{ background: swatch(cw) }} />
              {cw.label}
              {title === "Brand" && index === 0 && <small>Primary</small>}
            </Chip>
          ))}
        </div>
      ))}
      {onSize && (
        <div className="group" role="group" aria-label="PNG size">
          <span className="title">PNG size</span>
          {PNG_SIZES.map((px) => (
            <Size key={px} type="button" $on={px === size} aria-pressed={px === size} onClick={() => onSize(px)}>
              {px}
            </Size>
          ))}
        </div>
      )}
    </Bar>
  );
}

const Grid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  ${({ theme }) => theme.media.lg} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const Tile = styled.article`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};
  overflow: hidden;

  .stage {
    position: relative;
    height: 180px;
  }
  .stage img {
    position: absolute;
    inset: ${({ theme }) => theme.space(6)};
    width: calc(100% - ${({ theme }) => theme.space(12)});
    height: calc(100% - ${({ theme }) => theme.space(12)});
    object-fit: contain;
  }
  /* A file with its own ground already carries its clear space. */
  .stage[data-fill="true"] img {
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: ${({ theme }) => theme.space(1.5)};
    padding: ${({ theme }) => theme.space(4)};
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
  h3 {
    ${type("heading")}
    color: ${({ theme }) => theme.color.fg};
  }
  p {
    ${type("body")}
    flex: 1;
    color: ${({ theme }) => theme.color.fgMuted};
    text-wrap: pretty;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.space(1.5)};
    margin-top: ${({ theme }) => theme.space(2)};
  }
`;

// What a transparent file is shown on. A file with its own ground sits on
// that same colour, so the tile reads as one surface.
export const stageColor = (cw: Colorway, ownTile = false) =>
  ownTile ? undefined : (cw.bg ?? (cw.backdrop === "dark" ? brandColor.navy : "#f3f4f8"));

function DesignTile({ design, cw, size }: { design: (typeof DESIGNS)[number]; cw: Colorway; size: number }) {
  const id: DesignId = design.id;
  const ownTile = id === "app-icon" || id === "avatar";
  const art = useMemo(() => renderDesign(id, cw), [id, cw]);
  const name = `oxumi-${id}-${cw.id}`;
  // The chosen size is the longest side.
  const scale = size / Math.max(art.width, art.height);
  const width = Math.round(art.width * scale);
  const height = Math.round(art.height * scale);
  return (
    <Tile data-design={id}>
      <div className="stage" data-fill={Boolean(cw.bg) && !ownTile} style={{ background: stageColor(cw, ownTile) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={svgDataUrl(art.svg)} alt={`Oxumi ${design.label.toLowerCase()}, ${cw.label.toLowerCase()}`} />
      </div>
      <div className="body">
        <h3>{design.label}</h3>
        <p>{design.use}</p>
        <div className="actions">
          <CopyButton text={art.svg} label={`Copy ${design.label} as SVG`}>
            Copy SVG
          </CopyButton>
          <Action type="button" onClick={() => downloadSvg(art.svg, name)} aria-label={`Download ${design.label} as SVG`}>
            SVG
          </Action>
          <Action
            type="button"
            onClick={() => void downloadPng(renderDesign(id, cw, { px: width }).svg, name, width, height)}
            aria-label={`Download ${design.label} as PNG, ${width} by ${height} pixels`}
          >
            PNG {width}×{height}
          </Action>
        </div>
      </div>
    </Tile>
  );
}

export default function Gallery({ cw, size }: { cw: Colorway; size: number }) {
  return (
    <Grid>
      {DESIGNS.map((design) => (
        <DesignTile key={design.id} design={design} cw={cw} size={size} />
      ))}
    </Grid>
  );
}
