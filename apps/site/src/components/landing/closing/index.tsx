"use client";

import FinalCta from "./FinalCta";
import HomeLanguages from "./HomeLanguages";
import HomeUseCases from "./HomeUseCases";
import HomeWhy from "./HomeWhy";
import SiteFooter from "./SiteFooter";

// The closing sections as they appear on the home page, for /preview/closing.
export default function ClosingBlock() {
  return (
    <>
      <HomeLanguages />
      <HomeUseCases />
      <HomeWhy />
      <FinalCta />
      <SiteFooter />
    </>
  );
}
