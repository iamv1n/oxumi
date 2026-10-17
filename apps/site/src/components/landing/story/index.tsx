"use client";

import HomeDemo from "./HomeDemo";
import HomeHow from "./HomeHow";
import ProductFlow from "./ProductFlow";

// Preview only: the story sections stacked. The site renders them on their
// own pages (HomeDemo and HomeHow on /, ProductFlow on /product).
export default function StoryBlock() {
  return (
    <>
      <HomeDemo />
      <HomeHow />
      <ProductFlow />
    </>
  );
}
