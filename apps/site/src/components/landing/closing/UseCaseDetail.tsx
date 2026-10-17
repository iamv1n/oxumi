import UseCaseDetailView from "./UseCaseDetailView";

// The in-depth page for one use case. This file stays a server module so the
// route can read USE_CASE_SLUGS; the page itself is drawn by the client view.
export const USE_CASE_SLUGS = ["clinics", "fleets", "real-estate", "support"] as const;
export type UseCaseSlug = (typeof USE_CASE_SLUGS)[number];

export default function UseCaseDetail({ slug }: { slug: UseCaseSlug }) {
  return <UseCaseDetailView slug={slug} />;
}
