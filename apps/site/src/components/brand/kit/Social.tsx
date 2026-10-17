"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import type { Colorway } from "@oxumi/ui/brand/kit/colorways";
import { downloadPng, downloadSvg, svgDataUrl } from "./export";
import { displayFontCss, exposeToBuildScript, withFonts } from "./fonts";
import { renderSocial, SOCIAL_FORMATS, SOCIAL_STYLES, type SocialFormat, type SocialStyle } from "./socialFormats";
import { Action, CopyButton } from "./ui";

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(6)};
  margin-bottom: ${({ theme }) => theme.space(6)};

  .set {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${({ theme }) => theme.space(1.5)};
  }
  .title {
    ${type("overline")}
    margin-right: ${({ theme }) => theme.space(1.5)};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  label {
    ${type("label")}
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.color.fgMuted};
    cursor: pointer;
  }
  input {
    accent-color: ${({ theme }) => theme.color.accentLine};
  }
  ${({ theme }) => theme.media.md} {
    label {
      margin-left: auto;
    }
  }
`;

const Grid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(7)} ${({ theme }) => theme.space(3)};
  align-items: start;

  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
`;

const Tile = styled.figure<{ $span: number }>`
  margin: 0;
  min-width: 0;

  ${({ theme }) => theme.media.md} {
    grid-column: span ${({ $span }) => $span};
  }

  .art {
    position: relative;
    border-radius: ${({ theme }) => theme.radius.card};
    box-shadow: 0 0 0 1px ${({ theme }) => theme.color.line};
    overflow: hidden;
  }
  .art img {
    display: block;
    width: 100%;
    height: auto;
  }
  /* The safe area: shown on the page, never part of the file. */
  .safe {
    position: absolute;
    border: 1px dashed rgba(255, 255, 255, 0.7);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
    pointer-events: none;
  }
  .circle {
    position: absolute;
    right: ${({ theme }) => theme.space(2)};
    bottom: ${({ theme }) => theme.space(2)};
    width: 30%;
    border-radius: 50%;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.color.surface};
    overflow: hidden;
  }
  figcaption {
    display: grid;
    gap: ${({ theme }) => theme.space(1)};
    margin-top: ${({ theme }) => theme.space(3)};
  }
  h3 {
    ${type("label")}
    font-weight: 600;
    color: ${({ theme }) => theme.color.fg};
  }
  h3 span {
    font-weight: 400;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  p {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
  p code {
    font-family: ${({ theme }) => theme.font.mono};
    color: ${({ theme }) => theme.color.fg};
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.space(1.5)};
    margin-top: ${({ theme }) => theme.space(2)};
  }
`;

function SocialTile({
  format,
  style,
  cw,
  guides,
  headline,
  fonts,
}: {
  format: SocialFormat;
  style: SocialStyle;
  cw: Colorway;
  guides: boolean;
  headline: boolean;
  fonts: string;
}) {
  // The preview is the file: the same SVG, fonts embedded, that is exported.
  const art = useMemo(() => {
    const rendered = renderSocial(format, style, cw, { headline });
    return { ...rendered, svg: withFonts(rendered.svg, fonts) };
  }, [format, style, cw, headline, fonts]);
  const name = `oxumi-${format.id}-${style}${art.textPx ? "-headline" : ""}-${cw.id}`;
  const src = svgDataUrl(art.svg);
  const { safe, w, h } = format;
  const percent = (value: number, of: number) => `${(value / of) * 100}%`;
  return (
    <Tile $span={format.span} data-social={format.id} data-social-size={`${w}x${h}`} data-text-px={art.textPx ? Math.round(art.textPx) : undefined}>
      <div className="art">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={w} height={h} alt={`${format.where} ${format.label.toLowerCase()} with the Oxumi logo`} />
        {guides && (
          <span
            className="safe"
            style={{
              left: percent(safe.x, w),
              top: percent(safe.y, h),
              width: percent(safe.w, w),
              height: percent(safe.h, h),
              borderRadius: format.id === "avatar" ? "50%" : 0,
            }}
          />
        )}
        {format.id === "avatar" && (
          <span className="circle">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} width={w} height={h} alt="" />
          </span>
        )}
      </div>
      <figcaption>
        <h3>
          {format.label} <span>· {format.where}</span>
        </h3>
        <p>
          <code>
            {w} × {h}
          </code>{" "}
          · {format.safeNote}
          {art.textPx ? ` · headline ${Math.round(art.textPx)} px` : headline ? " · logo only at this size" : ""}
        </p>
        <div className="actions">
          <Action type="button" onClick={() => void downloadPng(art.svg, name, w, h)} aria-label={`Download ${format.where} ${format.label} as PNG, ${w} by ${h} pixels`}>
            PNG {w}×{h}
          </Action>
          <Action type="button" onClick={() => downloadSvg(art.svg, name)} aria-label={`Download ${format.where} ${format.label} as SVG`}>
            SVG
          </Action>
          <CopyButton text={art.svg} label={`Copy ${format.where} ${format.label} as SVG`}>
            Copy SVG
          </CopyButton>
        </div>
      </figcaption>
    </Tile>
  );
}

export default function Social({ cw }: { cw: Colorway }) {
  const [style, setStyle] = useState<SocialStyle>("glow");
  const [headline, setHeadline] = useState(false);
  const [guides, setGuides] = useState(false);
  const [fonts, setFonts] = useState("");
  useEffect(() => {
    exposeToBuildScript();
    let live = true;
    // Wait for the display face itself, so its @font-face rule is in the page.
    void window.document.fonts.ready.then(displayFontCss).then((css) => live && setFonts(css));
    return () => {
      live = false;
    };
  }, []);
  return (
    <>
      <Controls>
        <div className="set" role="group" aria-label="Content">
          <span className="title">Content</span>
          <Action type="button" $strong={!headline} aria-pressed={!headline} onClick={() => setHeadline(false)}>
            Logo only
          </Action>
          <Action type="button" $strong={headline} aria-pressed={headline} onClick={() => setHeadline(true)}>
            Logo + headline
          </Action>
        </div>
        <div className="set" role="group" aria-label="Background">
          <span className="title">Background</span>
          {SOCIAL_STYLES.map((option) => (
            <Action key={option.id} type="button" $strong={option.id === style} aria-pressed={option.id === style} onClick={() => setStyle(option.id)} title={option.note}>
              {option.label}
            </Action>
          ))}
        </div>
        <label>
          <input type="checkbox" checked={guides} onChange={(event) => setGuides(event.target.checked)} />
          Show safe areas
        </label>
      </Controls>
      <Grid>
        {SOCIAL_FORMATS.map((format) => (
          <SocialTile key={format.id} format={format} style={style} cw={cw} guides={guides} headline={headline} fonts={fonts} />
        ))}
      </Grid>
    </>
  );
}
