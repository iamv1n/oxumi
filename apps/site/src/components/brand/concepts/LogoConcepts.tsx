"use client";

import { useState } from "react";
import styled from "styled-components";
import { darkPalette, lightPalette, type Palette } from "@oxumi/ui/design/tokens";
import { type } from "@oxumi/ui/design/typography";
import { activeConcept, recommendedConcept } from "@oxumi/ui/brand/active";
import Lockup from "@oxumi/ui/brand/Lockup";
import Logo from "@oxumi/ui/brand/Logo";
import ConceptLockup from "@oxumi/ui/brand/concepts/ConceptLockup";
import { bolt, concepts } from "@oxumi/ui/brand/concepts";
import Mark, { type Paint } from "@oxumi/ui/brand/concepts/Mark";
import { CRITERIA, type Concept, type WordmarkSpec } from "@oxumi/ui/brand/concepts/types";
import WordmarkArt from "@oxumi/ui/brand/concepts/WordmarkArt";

// The comparison page: every concept at every size, on both canvases, in
// every tone, as a lockup, an app icon and a favicon, with its case for and
// against. The swatches are painted from the concrete palettes, so both
// canvases show whatever theme the page itself is in.

const SIZES = [16, 24, 32, 64] as const;

const gradientOf = (p: Palette): Paint => ({ type: "gradient", stops: [p.accent, p.pink, p.violet] });
const solidOf = (p: Palette): Paint => ({ type: "flat", color: p.accentLine });
const monoOf = (p: Palette): Paint => ({ type: "flat", color: p.fg });

const Page = styled.main`
  min-height: 100vh;
  padding: ${({ theme }) => theme.space(10)} ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(20)};
  background: ${({ theme }) => theme.color.canvas};
  color: ${({ theme }) => theme.color.fg};

  ${({ theme }) => theme.media.md} {
    padding-inline: ${({ theme }) => theme.space(6)};
  }
`;

const Intro = styled.header`
  max-width: 62rem;
  margin: 0 auto ${({ theme }) => theme.space(10)};

  p.eyebrow {
    ${type("overline")}
    color: ${({ theme }) => theme.color.accentText};
  }
  h1 {
    ${type("display")}
    margin-top: ${({ theme }) => theme.space(3)};
  }
  p.lede {
    ${type("lede")}
    max-width: 46rem;
    margin-top: ${({ theme }) => theme.space(4)};
    color: ${({ theme }) => theme.color.fgMuted};
    text-wrap: pretty;
  }
`;

// Five columns on a wide screen; a horizontal strip that scrolls on a narrow one.
const Grid = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(264px, 1fr);
  gap: ${({ theme }) => theme.space(3)};
  max-width: 1720px;
  margin-inline: auto;
  padding-bottom: ${({ theme }) => theme.space(3)};
  overflow-x: auto;
  scroll-snap-type: x proximity;
`;

const Card = styled.article<{ $pick: boolean }>`
  display: flex;
  flex-direction: column;
  min-width: 0;
  scroll-snap-align: start;
  border: 1px solid ${({ theme, $pick }) => ($pick ? theme.color.accentLine : theme.color.line)};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};
  box-shadow: ${({ theme, $pick }) => ($pick ? theme.shadow.focus : "none")};
`;

const CardHead = styled.div`
  padding: ${({ theme }) => theme.space(4)};
  min-height: 9.5rem;

  .row {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(2)};
  }
  .number {
    ${type("code")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  h2 {
    ${type("title")}
    font-family: ${({ theme }) => theme.font.display};
    font-weight: 400;
    font-size: 1.75rem;
  }
  p {
    ${type("body")}
    margin-top: ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.color.fgMuted};
    text-wrap: pretty;
  }
`;

const Badge = styled.span`
  ${type("overline")}
  margin-left: auto;
  padding: ${({ theme }) => theme.space(0.5)} ${({ theme }) => theme.space(2)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.accentFg};
  letter-spacing: 0.08em;
`;

// A swatch of one canvas. Its colours are literal palette values.
const Canvas = styled.div<{ $p: Palette }>`
  display: grid;
  align-content: start;
  gap: ${({ theme }) => theme.space(5)};
  padding: ${({ theme }) => theme.space(5)} ${({ theme }) => theme.space(4)};
  border-top: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ $p }) => $p.canvas};
  color: ${({ $p }) => $p.fg};

  .caption {
    ${type("caption")}
    font-family: ${({ theme }) => theme.font.mono};
    color: ${({ $p }) => $p.fgSubtle};
  }
`;

const Hero = styled.div`
  display: grid;
  place-items: center;
  height: 176px;
`;

const Row = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(2)};

  figure {
    display: grid;
    justify-items: center;
    gap: ${({ theme }) => theme.space(2)};
    margin: 0;
  }
`;

const LockupRow = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(4)};
  justify-items: start;
`;

// The mark beside "Oxumi" exactly as the site nav sets it today.
const NavText = styled.span`
  ${type("heading")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2.5)};
  letter-spacing: ${({ theme }) => theme.text.title.tracking};
`;

const Icons = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(4)};
  padding: ${({ theme }) => theme.space(5)} ${({ theme }) => theme.space(4)};
  border-top: 1px solid ${({ theme }) => theme.color.line};

  .tiles {
    display: flex;
    align-items: flex-end;
    gap: ${({ theme }) => theme.space(3)};
  }
  .caption {
    ${type("caption")}
    font-family: ${({ theme }) => theme.font.mono};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const TileBox = styled.span<{ $size: number; $p: Palette }>`
  display: inline-grid;
  place-items: center;
  flex: none;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: ${({ $size }) => Math.round($size * 0.225)}px;
  background: ${({ $p }) => $p.canvas};
  box-shadow: inset 0 0 0 1px ${({ $p }) => $p.line};
`;

// The app icon: the mark on a rounded tile of the canvas colour.
function Tile({ concept, size, palette }: { concept: Concept; size: number; palette: Palette }) {
  if (concept.mark.own) {
    // The real app icon file: its own navy tile and glow, whatever the canvas.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/preview/logos/icon?concept=${concept.id}&size=${Math.min(512, size * 2)}&tile=1`}
        width={size}
        height={size}
        alt=""
        style={{ flex: "none", borderRadius: Math.round(size * 0.225) }}
      />
    );
  }
  return (
    <TileBox $size={size} $p={palette}>
      <Mark concept={concept} size={Math.round(size * 0.66)} paint={gradientOf(palette)} />
    </TileBox>
  );
}

// A browser tab strip, light or dark, with the favicon at its real 16px.
const Tabs = styled.div<{ $dark: boolean }>`
  display: flex;
  align-items: flex-end;
  height: 38px;
  padding: 6px 8px 0;
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ $dark }) => ($dark ? "#1f2023" : "#dfe1e5")};
  overflow: hidden;

  .tab {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    height: 32px;
    padding: 0 10px;
    border-radius: 8px 8px 0 0;
    font: 12px/1 ${({ theme }) => theme.font.sans};
    color: ${({ $dark }) => ($dark ? "#e8eaed" : "#3c4043")};
    white-space: nowrap;
  }
  .tab.current {
    background: ${({ $dark }) => ($dark ? "#35363a" : "#ffffff")};
  }
  .tab span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

function TabStrip({ concept, dark }: { concept: Concept; dark: boolean }) {
  return (
    <Tabs $dark={dark} data-shot="tabs">
      <div className="tab current">
        {/* The real favicon file, as a browser would draw it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/preview/logos/icon?concept=${concept.id}&size=32`} width={16} height={16} alt="" />
        <span>Oxumi</span>
      </div>
      <div className="tab">
        <Tile concept={concept} size={16} palette={darkPalette} />
        <span>Flows</span>
      </div>
    </Tabs>
  );
}

const Notes = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(4)};
  padding: ${({ theme }) => theme.space(5)} ${({ theme }) => theme.space(4)};
  border-top: 1px solid ${({ theme }) => theme.color.line};

  h3 {
    ${type("overline")}
    margin-bottom: ${({ theme }) => theme.space(1.5)};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  p,
  li {
    ${type("body")}
    color: ${({ theme }) => theme.color.fgMuted};
    text-wrap: pretty;
  }
  ul {
    display: grid;
    gap: ${({ theme }) => theme.space(1.5)};
    padding-left: ${({ theme }) => theme.space(4)};
    list-style: disc;
  }
`;

function CanvasBlock({ concept, palette, name }: { concept: Concept; palette: Palette; name: string }) {
  return (
    <Canvas $p={palette}>
      <Hero data-shot="hero">
        <Mark concept={concept} size={160} paint={gradientOf(palette)} label={`${concept.name} mark on ${name}`} />
      </Hero>
      <Row data-shot="sizes">
        {SIZES.map((size) => (
          <figure key={size}>
            <Mark concept={concept} size={size} paint={gradientOf(palette)} />
            <figcaption className="caption">{size}</figcaption>
          </figure>
        ))}
      </Row>
      <Row>
        <figure>
          <Mark concept={concept} size={40} paint={gradientOf(palette)} />
          <figcaption className="caption">{concept.mark.own ? "colour" : "gradient"}</figcaption>
        </figure>
        <figure>
          <Mark concept={concept} size={40} paint={solidOf(palette)} />
          <figcaption className="caption">{concept.mark.own ? "theme accent" : "solid"}</figcaption>
        </figure>
        <figure>
          <Mark concept={concept} size={40} paint={monoOf(palette)} />
          <figcaption className="caption">one colour</figcaption>
        </figure>
      </Row>
      <LockupRow data-shot="lockups">
        <ConceptLockup concept={concept} size={44} paint={gradientOf(palette)} ink={palette.fg} />
        <ConceptLockup concept={concept} size={26} paint={gradientOf(palette)} ink={palette.fg} />
        <ConceptLockup concept={concept} size={26} paint={monoOf(palette)} ink={palette.fg} />
        <span className="caption">lockup: 44, nav size 26, one colour</span>
        <NavText>
          <Mark concept={concept} size={24} paint={gradientOf(palette)} />
          Oxumi
        </NavText>
        <span className="caption">beside the nav&apos;s current text</span>
      </LockupRow>
    </Canvas>
  );
}

// The chosen mark: both canvases side by side, icons and notes beside them.
const Chosen = styled.section`
  display: grid;
  max-width: 1720px;
  margin-inline: auto;
  border: 1px solid ${({ theme }) => theme.color.lineStrong};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};
  overflow: hidden;

  .canvases {
    display: grid;
  }
  .canvases > * {
    border-top: 0;
  }
  .side > :first-child {
    border-top: 0;
  }
  .live {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${({ theme }) => theme.space(6)} ${({ theme }) => theme.space(8)};
    padding: ${({ theme }) => theme.space(4)} 0 ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.color.fgMuted};
  }

  ${({ theme }) => theme.media.sm} {
    .canvases {
      grid-template-columns: 1fr 1fr;
    }
  }
  ${({ theme }) => theme.media.lg} {
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    .side {
      border-left: 1px solid ${({ theme }) => theme.color.line};
    }
  }
`;

const Archive = styled.header`
  max-width: 62rem;
  margin: ${({ theme }) => theme.space(16)} auto ${({ theme }) => theme.space(6)};

  h2 {
    ${type("display")}
    font-size: clamp(2rem, 4vw, 3rem);
  }
  p {
    ${type("lede")}
    margin-top: ${({ theme }) => theme.space(3)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
  code {
    ${type("code")}
    padding: 1px ${({ theme }) => theme.space(1.5)};
    border-radius: ${({ theme }) => theme.radius.small};
    background: ${({ theme }) => theme.color.raised};
    color: ${({ theme }) => theme.color.fg};
  }
`;

const Verdict = styled.section`
  max-width: 62rem;
  margin: ${({ theme }) => theme.space(14)} auto 0;

  h2 {
    ${type("display")}
    font-size: clamp(2rem, 4vw, 3rem);
  }
  > p {
    ${type("lede")}
    margin-top: ${({ theme }) => theme.space(4)};
    color: ${({ theme }) => theme.color.fgMuted};
    text-wrap: pretty;
  }
  ol {
    display: grid;
    gap: ${({ theme }) => theme.space(3)};
    margin-top: ${({ theme }) => theme.space(6)};
    padding-left: ${({ theme }) => theme.space(5)};
    list-style: decimal;
  }
  li {
    ${type("body")}
    font-size: ${({ theme }) => theme.text.heading.size};
    line-height: ${({ theme }) => theme.text.heading.line};
    color: ${({ theme }) => theme.color.fgMuted};
    text-wrap: pretty;
  }
  li strong {
    color: ${({ theme }) => theme.color.fg};
    font-weight: 600;
  }
  code {
    ${type("code")}
    padding: 1px ${({ theme }) => theme.space(1.5)};
    border-radius: ${({ theme }) => theme.radius.small};
    background: ${({ theme }) => theme.color.raised};
    color: ${({ theme }) => theme.color.fg};
  }
`;

const Stage = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(6)};
  margin-top: ${({ theme }) => theme.space(8)};
  padding: ${({ theme }) => theme.space(8)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${darkPalette.canvas};

  button {
    ${type("label")}
    margin-left: auto;
    padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
    border: 1px solid ${darkPalette.lineStrong};
    border-radius: ${({ theme }) => theme.radius.control};
    background: transparent;
    color: ${darkPalette.fg};
    cursor: pointer;
  }
`;

const Study = styled.div`
  margin-top: ${({ theme }) => theme.space(10)};

  h3 {
    ${type("title")}
  }
  .swatch {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: ${({ theme }) => theme.space(8)} ${({ theme }) => theme.space(10)};
    margin-top: ${({ theme }) => theme.space(4)};
    padding: ${({ theme }) => theme.space(7)};
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: ${({ theme }) => theme.radius.card};
  }
  .swatch + .swatch {
    margin-top: ${({ theme }) => theme.space(2)};
  }
  .swatch.live {
    align-items: center;
    background: ${({ theme }) => theme.color.surface};
    color: ${({ theme }) => theme.color.fgMuted};
  }
  figure {
    display: grid;
    gap: ${({ theme }) => theme.space(3)};
    margin: 0;
  }
  .pair {
    display: inline-flex;
    align-items: center;
    gap: 14px;
  }
  figcaption {
    ${type("caption")}
    font-family: ${({ theme }) => theme.font.mono};
  }
  > p {
    ${type("body")}
    font-size: ${({ theme }) => theme.text.heading.size};
    line-height: ${({ theme }) => theme.text.heading.line};
    max-width: 46rem;
    margin-top: ${({ theme }) => theme.space(4)};
    color: ${({ theme }) => theme.color.fgMuted};
    text-wrap: pretty;
  }
`;

const WORDMARKS: ReadonlyArray<readonly [string, WordmarkSpec]> = [
  ["drawn, lowercase (chosen)", { kind: "drawn", weight: 4.2, x: "cross", joined: false }],
  ["Geist semibold, lowercase", { kind: "text", face: "sans", text: "oxumi", weight: 600, em: 2.02, tracking: "-0.035em", shift: -0.045 }],
  ["Instrument Serif, capitalised", { kind: "text", face: "serif", text: "Oxumi", weight: 400, em: 2.9, tracking: "-0.01em", shift: -0.03 }],
];

const Scores = styled.div`
  margin-top: ${({ theme }) => theme.space(8)};
  overflow-x: auto;

  table {
    width: 100%;
    min-width: 640px;
    border-collapse: collapse;
  }
  th,
  td {
    ${type("label")}
    padding: ${({ theme }) => theme.space(2.5)} ${({ theme }) => theme.space(3)};
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  th {
    color: ${({ theme }) => theme.color.fgSubtle};
    font-weight: 500;
  }
  th:first-child,
  td:first-child {
    text-align: left;
    color: ${({ theme }) => theme.color.fg};
  }
  td {
    color: ${({ theme }) => theme.color.fgMuted};
  }
  tr[data-pick="true"] td {
    color: ${({ theme }) => theme.color.fg};
    background: ${({ theme }) => theme.color.accentSoft};
  }
  td:last-child {
    font-weight: 600;
    color: ${({ theme }) => theme.color.fg};
  }
`;

const total = (concept: Concept) => CRITERIA.reduce((sum, [key]) => sum + (concept.scores?.[key] ?? 0), 0);

export default function LogoConcepts() {
  const [take, setTake] = useState(0);
  const pick = recommendedConcept;

  return (
    <Page>
      <Intro>
        <p className="eyebrow">Oxumi identity</p>
        <h1>The Oxumi logo</h1>
        <p className="lede">
          The mark the owner chose, rebuilt as SVG from their brand board: at 16 to 160 pixels, on the dark and the
          light canvas, in colour and in one colour, beside its wordmark, as an app icon and in a browser tab. The five
          earlier explorations are kept below as an archive.
          {activeConcept.id === bolt.id ? "" : ` The product is currently set to ${activeConcept.name}.`}
        </p>
      </Intro>

      <Chosen aria-label="The chosen mark">
        <div className="canvases">
          <CanvasBlock concept={bolt} palette={darkPalette} name="dark" />
          <CanvasBlock concept={bolt} palette={lightPalette} name="light" />
        </div>
        <div className="side">
          <Icons>
            <div className="tiles" data-shot="tiles">
              <Tile concept={bolt} size={96} palette={darkPalette} />
              <Tile concept={bolt} size={48} palette={darkPalette} />
              <Tile concept={bolt} size={32} palette={darkPalette} />
              <Tile concept={bolt} size={16} palette={darkPalette} />
            </div>
            <span className="caption">app icon 96, 48, 32 and 16</span>
            <TabStrip concept={bolt} dark={false} />
            <TabStrip concept={bolt} dark />
            <span className="caption">tab 1: the favicon file · tab 2: the app icon</span>
          </Icons>
          <Notes>
            <div>
              <h3>Live components, this page&apos;s theme</h3>
              <div className="live" data-shot="live">
                <Lockup size={72} tagline />
                <Lockup size={32} />
                <Lockup size={32} tone="mono" />
                <Logo size={32} />
                <Logo size={16} tone="mono" />
              </div>
            </div>
            <div>
              <h3>How it is built</h3>
              <p>{bolt.rationale}</p>
            </div>
            <div>
              <h3>Wordmark</h3>
              <p>{bolt.wordmarkWhy}</p>
            </div>
            <div>
              <h3>Not as on the board</h3>
              <ul>
                {bolt.weaknesses.map((weakness) => (
                  <li key={weakness}>{weakness}</li>
                ))}
              </ul>
            </div>
          </Notes>
        </div>
      </Chosen>

      <Archive>
        <h2>Archive: five earlier explorations</h2>
        <p>
          Drawn before the owner supplied their own mark. None is in use; any of them can be tried by changing{" "}
          <code>activeConcept</code> in <code>packages/ui/brand/active.ts</code>.
        </p>
      </Archive>

      <Grid>
        {concepts.map((concept, index) => (
          <Card key={concept.id} $pick={concept.id === pick.id} aria-labelledby={`concept-${concept.id}`}>
            <CardHead>
              <div className="row">
                <span className="number">{index + 1}</span>
                <h2 id={`concept-${concept.id}`}>{concept.name}</h2>
                {concept.id === pick.id && <Badge>Was recommended</Badge>}
              </div>
              <p>{concept.idea}</p>
            </CardHead>

            <CanvasBlock concept={concept} palette={darkPalette} name="dark" />
            <CanvasBlock concept={concept} palette={lightPalette} name="light" />

            <Icons>
              <div className="tiles" data-shot="tiles">
                <Tile concept={concept} size={72} palette={darkPalette} />
                <Tile concept={concept} size={72} palette={lightPalette} />
                <Tile concept={concept} size={32} palette={darkPalette} />
                <Tile concept={concept} size={16} palette={darkPalette} />
              </div>
              <span className="caption">app icon 72, favicon 32 and 16</span>
              <TabStrip concept={concept} dark={false} />
              <TabStrip concept={concept} dark />
              <span className="caption">tab 1: the favicon file · tab 2: on a tile</span>
            </Icons>

            <Notes>
              <div>
                <h3>Why</h3>
                <p>{concept.rationale}</p>
              </div>
              <div>
                <h3>Weaknesses</h3>
                <ul>
                  {concept.weaknesses.map((weakness) => (
                    <li key={weakness}>{weakness}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Wordmark</h3>
                <p>{concept.wordmarkWhy}</p>
              </div>
              <div>
                <h3>Motion</h3>
                <p>{concept.motion}</p>
              </div>
            </Notes>
          </Card>
        ))}
      </Grid>

      <Verdict data-shot="verdict">
        <h2>
          Among the five, the recommendation was {concepts.indexOf(pick) + 1}, {pick.name}
        </h2>
        <p>{pick.rationale}</p>

        <Stage data-shot="stage">
          <ConceptLockup
            key={take}
            concept={pick}
            size={72}
            paint={gradientOf(darkPalette)}
            ink={darkPalette.fg}
            animated
          />
          <button type="button" onClick={() => setTake((n) => n + 1)}>
            Replay entrance
          </button>
        </Stage>

        <Study>
          <h3>The wordmark, three ways</h3>
          {[darkPalette, lightPalette].map((palette) => (
            <div key={palette.canvas} className="swatch" style={{ background: palette.canvas, color: palette.fg }}>
              {WORDMARKS.map(([name, spec]) => (
                <figure key={name}>
                  <span className="pair">
                    <Mark concept={pick} size={40} paint={gradientOf(palette)} />
                    <WordmarkArt spec={spec} xHeight={20} />
                  </span>
                  <figcaption style={{ color: palette.fgSubtle }}>{name}</figcaption>
                </figure>
              ))}
            </div>
          ))}
          <p>
            Lowercase and drawn is the choice. The name is five x-height letters, three of them round, so in lowercase
            it sets as one even band with a single dot above it; drawn from the mark&apos;s own circle and flat-cut
            stroke, it needs no font to load and cannot be mistaken for body text. Geist is correct but anonymous: it
            is how every developer tool signs its name. Instrument Serif is the brand&apos;s display voice and stays
            for headlines, but at nav size its hairlines thin out beside a mark this heavy.
          </p>
        </Study>

        <Scores>
          <table>
            <thead>
              <tr>
                <th scope="col">Concept</th>
                {CRITERIA.map(([key, label]) => (
                  <th key={key} scope="col">
                    {label}
                  </th>
                ))}
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {concepts.map((concept, index) => (
                <tr key={concept.id} data-pick={concept.id === pick.id}>
                  <td>
                    {index + 1}. {concept.name}
                  </td>
                  {CRITERIA.map(([key]) => (
                    <td key={key}>{concept.scores?.[key]}</td>
                  ))}
                  <td>{total(concept)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scores>

        <ol>
          <li>
            <strong>It survives the tab.</strong> Two heavy arcs and nothing else. At 16 pixels it is still plainly
            the same mark; Crossing and Circuit turn to texture there, and that is where this product is seen most.
          </li>
          <li>
            <strong>One move, four meanings.</strong> A wave (a voice), the sea (umi), the letter O, and two halves that
            part and rejoin (a caller and a callee, a branch and its merge). Nothing was added to make any of them.
          </li>
          <li>
            <strong>It is calm.</strong> Flat cuts and one weight read as precise; the rounded form keeps it from being
            cold. Crossing is the harder, more industrial alternative.
          </li>
          <li>
            <strong>It works with nothing.</strong> One colour, no gradient, no wordmark: still complete. And it has a
            natural motion, the wave closing into the letter.
          </li>
          <li>
            <strong>Where it is weakest.</strong> A split circle is not a new device, and it does not say X. If the
            initials matter more than the wave, choose 2, Crossing. If the word should lead, 5, Ligature, has the best
            lettering; its joined u-m could also be paired with the Tide mark.
          </li>
          <li>
            <strong>To switch:</strong> the live logo is one line, <code>activeConcept</code> in{" "}
            <code>packages/ui/brand/active.ts</code>. Point it at another concept and every logo, lockup and
            icon in the product follows.
          </li>
        </ol>
      </Verdict>
    </Page>
  );
}
