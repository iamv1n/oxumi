"use client";

import styled from "styled-components";
import { logoColor } from "@oxumi/ui/design/logo";
import { BRAND_LABELS, DEFAULT_BRAND } from "@oxumi/ui/design/palettes";
import { type } from "@oxumi/ui/design/typography";
import { brandColor } from "@oxumi/ui/brand/kit/colorways";
import { CopyButton } from "./ui";

const rgb = (hex: string) => {
  const v = parseInt(hex.slice(1), 16);
  return `rgb(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255})`;
};

// The brand's own colours, as on the owner's board.
export const BRAND_COLORS = [
  { name: "Deep navy", role: "The ground. App icon, banners, dark lockups.", hex: brandColor.navy },
  { name: "Oxumi blue", role: "The lower shape. The single blue when only one is allowed.", hex: logoColor.lowerFrom },
  { name: "Electric blue", role: "Where the lower shape's gradient ends.", hex: logoColor.lowerTo },
  { name: "Periwinkle", role: "The upper shape.", hex: logoColor.upperTo },
  { name: "Sky periwinkle", role: "Where the upper shape's gradient starts.", hex: logoColor.upperFrom },
  { name: "Dot", role: "The dot of the i.", hex: logoColor.dot },
  { name: "White", role: "Letters on dark. The one-colour logo on dark.", hex: brandColor.white },
  { name: "Ink", role: "Letters on light.", hex: brandColor.ink },
] as const;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space(3)};

  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const Swatch = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};
  overflow: hidden;

  .chip {
    height: 72px;
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
  }
  .body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: ${({ theme }) => theme.space(1)};
    padding: ${({ theme }) => theme.space(3)};
  }
  h3 {
    ${type("label")}
    font-weight: 600;
    color: ${({ theme }) => theme.color.fg};
  }
  p {
    ${type("caption")}
    flex: 1;
    color: ${({ theme }) => theme.color.fgMuted};
    text-wrap: pretty;
  }
  .values {
    display: flex;
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.space(1.5)};
    margin-top: ${({ theme }) => theme.space(2)};
  }
  .values button {
    font-family: ${({ theme }) => theme.font.mono};
    font-size: 0.75rem;
  }
`;

const Note = styled.p`
  ${type("body")}
  max-width: 44rem;
  margin-top: ${({ theme }) => theme.space(5)};
  padding-left: ${({ theme }) => theme.space(4)};
  border-left: 2px solid ${({ theme }) => theme.color.lineStrong};
  color: ${({ theme }) => theme.color.fgMuted};
  text-wrap: pretty;
`;

export default function Palette() {
  return (
    <>
      <Grid>
        {BRAND_COLORS.map((c) => (
          <Swatch key={c.name}>
            <div className="chip" style={{ background: c.hex }} />
            <div className="body">
              <h3>{c.name}</h3>
              <p>{c.role}</p>
              <div className="values">
                <CopyButton text={c.hex} label={`Copy ${c.name} hex ${c.hex}`}>
                  {c.hex}
                </CopyButton>
                <CopyButton text={rgb(c.hex)} label={`Copy ${c.name} as RGB`}>
                  {rgb(c.hex).replace("rgb", "").replace(/[()]/g, "")}
                </CopyButton>
              </div>
            </div>
          </Swatch>
        ))}
      </Grid>
      <Note>
        These are the logo&apos;s colours and nothing else&apos;s. The product&apos;s interface has its own themes
        ({BRAND_LABELS[DEFAULT_BRAND].name} is the default), and this page is drawn in whichever you have chosen. The
        logo does not change with them: it stays blue.
      </Note>
    </>
  );
}
