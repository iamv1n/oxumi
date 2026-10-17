import type { Metadata } from "next";
import BrandPage from "@/components/brand/kit/BrandPage";

export const metadata: Metadata = {
  title: "Brand · Oxumi",
  description: "The Oxumi logo, colours and guidelines, with files to copy and download.",
};

export default function Brand() {
  return <BrandPage />;
}
