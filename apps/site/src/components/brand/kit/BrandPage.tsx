"use client";

import { useState } from "react";
import { PageIntro } from "@/components/landing/structure";
import { colorwayById, PRIMARY_COLORWAY } from "@oxumi/ui/brand/kit/colorways";
import Downloads from "./Downloads";
import Gallery, { ColorwayBar } from "./Gallery";
import { ClearSpace, Construction, ConstructionFacts, DoNot, MinimumSizes, Two } from "./Guidelines";
import Palette from "./Palette";
import Social from "./Social";
import { Block, BlockHead } from "./ui";
import { Typefaces, Voice } from "./Voice";

// The brand kit and guidelines. One colourway is chosen for the whole page;
// every tile shows, copies and downloads exactly that.
export default function BrandPage() {
  const [colorway, setColorway] = useState(PRIMARY_COLORWAY);
  const [size, setSize] = useState(1024);
  const cw = colorwayById(colorway);

  return (
    <>
      <PageIntro
        eyebrow="Brand"
        title="The Oxumi logo, ready to use."
        lede="Every version of the logo, in every colourway, to copy as SVG or download as PNG. Pick a colourway once and the whole page follows it."
      />

      <Block id="logo">
        <div>
          <BlockHead>
            <h2>Logo</h2>
            <p>
              Eight designs from the same two shapes and five letters. Blue on navy is the primary; use it unless the
              ground decides otherwise.
            </p>
          </BlockHead>
          <ColorwayBar value={colorway} onChange={setColorway} size={size} onSize={setSize} />
          <Gallery cw={cw} size={size} />
        </div>
      </Block>

      <Block id="social">
        <div>
          <BlockHead>
            <h2>Social and banners</h2>
            <p>
              Artwork at each platform&apos;s pixel size, in the colourway chosen above, with or without the headline.
              Everything stays inside the area a platform never crops or covers. Sizes are printed on each tile;
              platforms change them.
            </p>
          </BlockHead>
          <Social cw={cw} />
        </div>
      </Block>

      <Block id="construction">
        <div>
          <BlockHead>
            <h2>Construction</h2>
            <p>Two shapes, one angle, two radii. Everything is a multiple of the height of one shape, h.</p>
          </BlockHead>
          <Two>
            <Construction />
            <ConstructionFacts />
          </Two>
        </div>
      </Block>

      <Block id="space">
        <div>
          <BlockHead>
            <h2>Space and size</h2>
            <p>
              Keep half the mark&apos;s height clear on every side, of text, edges and other logos. Files with a ground
              already include it.
            </p>
          </BlockHead>
          <Two>
            <ClearSpace cw={cw} />
            <MinimumSizes cw={cw} />
          </Two>
        </div>
      </Block>

      <Block id="misuse">
        <div>
          <BlockHead>
            <h2>Leave it as it is</h2>
            <p>Use the files as they come. If none of them fits, pick another colourway or design before changing one.</p>
          </BlockHead>
          <DoNot cw={cw} />
        </div>
      </Block>

      <Block id="colour">
        <div>
          <BlockHead>
            <h2>Colour</h2>
            <p>Two blues, a navy to put them on, and white. Click a value to copy it.</p>
          </BlockHead>
          <Palette />
        </div>
      </Block>

      <Block id="type">
        <div>
          <BlockHead>
            <h2>Type</h2>
            <p>
              The wordmark is drawn, not typed: it is not a font and nothing else is set in it. The site uses four
              typefaces.
            </p>
          </BlockHead>
          <Typefaces />
        </div>
      </Block>

      <Block id="voice">
        <div>
          <BlockHead>
            <h2>Tagline and voice</h2>
            <p>Plain, concrete, level. The writing should sound like the product behaves.</p>
          </BlockHead>
          <Voice cw={cw} />
        </div>
      </Block>

      <Block id="downloads">
        <div>
          <BlockHead>
            <h2>Downloads</h2>
            <p>The same drawings as above, built ahead of time, for when you just want the files.</p>
          </BlockHead>
          <Downloads />
        </div>
      </Block>
    </>
  );
}
