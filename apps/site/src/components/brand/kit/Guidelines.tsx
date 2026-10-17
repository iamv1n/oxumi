"use client";

import { useMemo, type CSSProperties } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { BOLT, bolt } from "@oxumi/ui/brand/concepts/bolt";
import { colorwayById, type Colorway } from "@oxumi/ui/brand/kit/colorways";
import { Ids, lockupPiece, markPiece, renderDesign } from "@oxumi/ui/brand/kit/compose";
import { svgDataUrl } from "./export";
import { stageColor } from "./Gallery";

const Two = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(8)};
  align-items: center;

  ${({ theme }) => theme.media.md} {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
    gap: ${({ theme }) => theme.space(12)};
  }
`;

const Panel = styled.div`
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  overflow: hidden;

  svg,
  img {
    display: block;
    width: 100%;
    height: auto;
  }
`;

const Facts = styled.dl`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(5)};

  dt {
    ${type("code")}
    color: ${({ theme }) => theme.color.fg};
    white-space: nowrap;
  }
  dd {
    ${type("body")}
    color: ${({ theme }) => theme.color.fgMuted};
    text-wrap: pretty;
  }
`;

const r2 = (v: number) => String(Math.round(v * 100) / 100);

// The mark on its construction lines, as on the board's grid panel: two
// 45 degree parallelograms, the circles their corners are cut from, and the
// gap between them.
export function Construction() {
  const { h, side, dx, dy, outer, inner } = BOLT;
  const { x1: x, y1: y } = bolt.mark.gradient;
  const reach = (r: number) => r * Math.tan(Math.PI / 8);
  const line = "rgba(160, 176, 255, 0.34)";
  const strong = "rgba(190, 202, 255, 0.85)";
  const circles = [
    [x + h + reach(outer), y + outer, outer],
    [x + side - reach(inner), y + h - inner, inner],
    [x + dx + h + reach(inner), y + dy + inner, inner],
    [x + dx + side - reach(outer), y + dy + h - outer, outer],
  ];
  const rows = [y, y + h, y + dy, y + dy + h];
  const diagonals = [x, x + side, x + dx, x + dx + side];
  return (
    <Panel style={{ background: "#020716" }}>
      <svg viewBox="-6 -4 44 40" role="img" aria-label="Construction of the mark: two 45 degree parallelograms with circular corners">
        <g stroke={line} strokeWidth={0.12} strokeDasharray="0.5 0.5" fill="none">
          {rows.map((row) => (
            <path key={row} d={`M-6 ${row}H38`} />
          ))}
          {diagonals.map((start) => (
            <path key={start} d={`M${start - 6} ${rows[3] + 6 - (start === diagonals[2] || start === diagonals[3] ? 0 : dy)}l${h + 12} ${-(h + 12)}`} />
          ))}
          {circles.map(([cx, cy, r], index) => (
            <circle key={index} cx={cx} cy={cy} r={r} />
          ))}
        </g>
        {bolt.mark.shapes.map((shape, index) => (
          <path key={index} d={shape.d} fill="rgba(70, 100, 255, 0.34)" stroke={strong} strokeWidth={0.16} />
        ))}
        <g fill={strong} fontSize={1.15} fontFamily="var(--font-geist-mono), monospace">
          <text x={x - 5.4} y={y + h / 2 + 0.4}>h</text>
          <text x={x + h + 2.2} y={y - 0.9}>0.67 h</text>
          <text x={x + 2.3} y={y + h - 0.7}>45°</text>
          <text x={circles[0][0] - 1.6} y={circles[0][1] + 0.5}>0.4 h</text>
          <text x={circles[2][0] - 1.9} y={circles[2][1] + 0.4} fontSize={0.95}>0.24 h</text>
          <text x={x + side + h / 2 + 1.2} y={y + h / 2 + 3.6}>0.26 h</text>
        </g>
        <path d={`M${x - 3.6} ${y}V${y + h}`} stroke={strong} strokeWidth={0.12} />
        <path d={`M${x + h} ${y - 0.6}H${x + h + side}`} stroke={strong} strokeWidth={0.12} />
      </svg>
    </Panel>
  );
}

export function ConstructionFacts() {
  const { h, side, dx, dy, outer, inner } = BOLT;
  return (
    <Facts>
      <dt>2 shapes</dt>
      <dd>Identical. The lower one is the upper one turned half round.</dd>
      <dt>45°</dt>
      <dd>The slant of both, leaning forward.</dd>
      <dt>h : {r2(side / h)} h</dt>
      <dd>Height of a shape to the length of its top and bottom edges.</dd>
      <dt>{r2(dx / h)} h, {r2(dy / h)} h</dt>
      <dd>How far the lower shape sits to the right of and below the upper one.</dd>
      <dt>{r2((dx + dy - side) / Math.SQRT2 / h)} h</dt>
      <dd>The gap between them, measured square to the slant. It never closes.</dd>
      <dt>{r2(outer / h)} h, {r2(inner / h)} h</dt>
      <dd>Corner radii: the wide outer sweep, and the tighter corner that faces the gap. The other two corners are sharp.</dd>
    </Facts>
  );
}

// The lockup inside its clear space.
export function ClearSpace({ cw }: { cw: Colorway }) {
  const art = useMemo(() => {
    const ids = new Ids();
    const piece = lockupPiece(cw, ids);
    const unit = markPiece(cw, new Ids()).h / 2;
    const w = piece.w + 4 * unit;
    const h = piece.h + 4 * unit;
    const guide = cw.backdrop === "dark" ? "rgba(255,255,255,0.5)" : "rgba(10,16,36,0.5)";
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 10}" height="${h * 10}"><defs>${piece.defs}</defs>` +
      `<rect x="${unit}" y="${unit}" width="${w - 2 * unit}" height="${h - 2 * unit}" fill="none" stroke="${guide}" stroke-width="0.25" stroke-dasharray="1 1"/>` +
      `<rect x="${2 * unit}" y="${2 * unit}" width="${piece.w}" height="${piece.h}" fill="none" stroke="${guide}" stroke-width="0.15"/>` +
      `<path d="M${w / 2} ${unit}V${2 * unit}M${unit} ${h / 2}H${2 * unit}" stroke="${guide}" stroke-width="0.25"/>` +
      `<g transform="translate(${2 * unit} ${2 * unit})">${piece.body}</g></svg>`
    );
  }, [cw]);
  return (
    <Panel style={{ background: stageColor(cw) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={svgDataUrl(art)} alt="The lockup with half the mark's height kept clear on every side" />
    </Panel>
  );
}

const Sizes = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};

  div {
    display: grid;
    grid-template-columns: 172px minmax(0, 1fr);
    align-items: center;
    gap: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(4)};
    padding: ${({ theme }) => theme.space(4)};
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: ${({ theme }) => theme.radius.card};
    background: ${({ theme }) => theme.color.surface};
  }
  .sample {
    display: flex;
    align-items: center;
    grid-row: span 2;
  }
  h3 {
    align-self: end;
  }
  p {
    align-self: start;
  }
  h3 {
    ${type("label")}
    font-weight: 600;
    color: ${({ theme }) => theme.color.fg};
  }
  p {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
  p b {
    font-family: ${({ theme }) => theme.font.mono};
    font-weight: 500;
    color: ${({ theme }) => theme.color.fg};
  }
`;

// The smallest each design should be shown, drawn at exactly that size.
export function MinimumSizes({ cw }: { cw: Colorway }) {
  // Samples sit on the page's own surface, so use letters that read on it.
  const shown = cw.bg ? colorwayById(cw.backdrop === "dark" ? "clear-dark" : "clear-light") : cw;
  const samples = [
    { design: "mark", height: 16, title: "Mark", size: "16 px · 4 mm", note: "Below this, use nothing smaller: the gap must stay open." },
    { design: "lockup", height: 20, title: "Lockup", size: "20 px tall · 6 mm", note: "About 51 px wide. Letters are 10 px tall here." },
    { design: "tagline", height: 52, title: "With tagline", size: "52 px tall · 14 mm", note: "About 164 px wide; the tagline's capitals are 8 px. Under 140 px wide, drop the tagline." },
  ] as const;
  return (
    <Sizes>
      {samples.map((sample) => {
        const art = renderDesign(sample.design, shown);
        const scale = sample.height / (markPiece(shown, new Ids()).h + 1);
        return (
          <div key={sample.design}>
            <span className="sample" data-ground={shown.backdrop}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={svgDataUrl(art.svg)} width={Math.round(art.width * scale)} height={Math.round(art.height * scale)} alt="" />
            </span>
            <h3>{sample.title}</h3>
            <p>
              <b>{sample.size}</b>
              <br />
              {sample.note}
            </p>
          </div>
        );
      })}
    </Sizes>
  );
}

const Donts = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space(3)};

  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  figure {
    margin: 0;
  }
  .stage {
    position: relative;
    display: grid;
    place-items: center;
    height: 132px;
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: ${({ theme }) => theme.radius.card};
    overflow: hidden;
  }
  .stage img {
    width: 56%;
    height: auto;
  }
  .crowd {
    ${type("title")}
    font-family: ${({ theme }) => theme.font.display};
    font-weight: 400;
    margin-left: 2px;
    white-space: nowrap;
  }
  figcaption {
    ${type("body")}
    display: flex;
    gap: ${({ theme }) => theme.space(2)};
    margin-top: ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
  figcaption b {
    flex: none;
    color: ${({ theme }) => theme.color.danger};
    font-weight: 600;
  }
`;

// Misuse, rendered live from the real lockup so each mistake is the real thing.
export function DoNot({ cw }: { cw: Colorway }) {
  const src = svgDataUrl(renderDesign("lockup", cw.bg ? colorwayById(cw.backdrop === "dark" ? "clear-dark" : "clear-light") : cw).svg);
  const ground = stageColor(cw);
  const dark = cw.backdrop === "dark";
  const cases: { label: string; style?: CSSProperties; stage?: CSSProperties; extra?: string }[] = [
    { label: "Recolour it, or swap the two blues.", style: { filter: "hue-rotate(150deg) saturate(1.4)" } },
    { label: "Stretch or squash it.", style: { transform: "scaleX(1.5)", width: "42%" } },
    { label: "Rotate or tilt it.", style: { transform: "rotate(-14deg)" } },
    { label: "Add shadows, outlines or glows of your own.", style: { filter: `drop-shadow(0 0 3px #ff3df2) drop-shadow(4px 5px 0 ${dark ? "#ffffff" : "#000000"})` } },
    { label: "Crowd it. Keep the clear space.", style: { width: "44%" }, extra: "Partners!" },
    {
      label: "Place it on a busy or low-contrast ground.",
      stage: { background: "repeating-linear-gradient(135deg, #2b66ff 0 14px, #7ea9ff 14px 28px, #ffb347 28px 42px)" },
    },
  ];
  return (
    <Donts>
      {cases.map((item) => (
        <figure key={item.label}>
          <div className="stage" style={{ background: ground, ...item.stage, ...(item.extra ? { display: "flex", justifyContent: "center", alignItems: "center" } : {}) }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" style={item.style} />
            {item.extra && (
              <span className="crowd" style={{ color: dark ? "#fff" : "#0a1024" }}>
                {item.extra}
              </span>
            )}
          </div>
          <figcaption>
            <b aria-hidden>✕</b>
            <span>
              <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Do not: </span>
              {item.label}
            </span>
          </figcaption>
        </figure>
      ))}
    </Donts>
  );
}

export { Two };
