import { notFound } from "next/navigation";
import FinalCta from "@/components/landing/closing/FinalCta";
import UseCaseDetail, {
  USE_CASE_SLUGS,
  type UseCaseSlug,
} from "@/components/landing/closing/UseCaseDetail";

export function generateStaticParams() {
  return USE_CASE_SLUGS.map((slug) => ({ slug }));
}

// One page per use case, each telling that industry's story in depth.
export default async function UseCasePage({
  params,
}: PageProps<"/use-cases/[slug]">) {
  const { slug } = await params;
  if (!USE_CASE_SLUGS.includes(slug as UseCaseSlug)) notFound();
  return (
    <>
      <UseCaseDetail slug={slug as UseCaseSlug} />
      <FinalCta compact />
    </>
  );
}
