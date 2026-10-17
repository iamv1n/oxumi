import { ENDPOINTS, NAV } from "@/components/docs/nav";
import { SCENARIOS, USE_CASES } from "../closing/useCaseData";

// What the nav links to. The bar, the dropdown panels, the mobile sheet and
// the quick navigator all read from here, so they cannot drift apart.

export type MenuId = "product" | "use-cases" | "docs";

export const LINKS = [
  { href: "/product", label: "Product", menu: "product" },
  { href: "/use-cases", label: "Use cases", menu: "use-cases" },
  { href: "/docs", label: "Docs", menu: "docs" },
  { href: "/about", label: "About", menu: null },
] as const satisfies readonly { href: string; label: string; menu: MenuId | null }[];

export type Href = (typeof LINKS)[number]["href"];

export const MENUS: MenuId[] = ["product", "use-cases", "docs"];

export interface Item {
  href: string;
  title: string;
  note?: string;
}

// The sections of /product, in page order.
export const PRODUCT = {
  overview: { href: "/product", title: "Product", note: "From a drawing to a finished call." },
  steps: [
    { href: "/product#canvas", title: "The canvas", note: "The drawing is the program." },
    { href: "/product#steps", title: "Design. Call. Collect.", note: "Three steps from canvas to call." },
    { href: "/product#result", title: "What you get back", note: "Said any way. Stored one way." },
  ],
  more: [
    { href: "/product#principles", title: "Principles" },
    { href: "/product#questions", title: "Questions" },
  ],
} satisfies { overview: Item; steps: Item[]; more: Item[] };

export const USE_CASE_ITEMS = USE_CASES.map((useCase) => ({
  href: `/use-cases/${useCase.slug}`,
  title: useCase.sector,
  note: useCase.call,
  useCase,
}));

export const SCENARIO_ITEMS = SCENARIOS.map((scenario) => ({
  href: "/use-cases#more",
  title: scenario.label,
  note: scenario.line,
  scenario,
}));

// One line per docs page; the page titles come from the docs' own map.
const DOC_NOTES: Record<string, string> = {
  "/docs": "First call in five minutes.",
  "/docs/authentication": "API keys, statuses and rotation.",
  "/docs/placing-calls": "The request, variables and metadata.",
  "/docs/webhooks": "Signed results, retries and repeats.",
  "/docs/conversations": "The same flow over text.",
  "/docs/errors": "Error bodies and status codes.",
  "/docs/rate-limits": "The limit and its headers.",
  "/docs/reference": "Every endpoint and object.",
  "/docs/changelog": "How v1 is versioned.",
};

const docs = (group: (typeof NAV)[number]["group"]): Item[] =>
  NAV.filter((page) => page.group === group).map((page) => ({
    href: page.href,
    title: page.title,
    note: DOC_NOTES[page.href],
  }));

export const DOCS = {
  start: docs("Get started"),
  guides: [...docs("Guides"), ...docs("Reference")],
  endpoints: ENDPOINTS.map((endpoint) => ({
    href: `/docs/reference#${endpoint.id}`,
    title: endpoint.title,
    method: endpoint.method,
    path: endpoint.path,
  })),
};

// The link a path belongs to; a section stays current on its sub-pages.
export const activeLink = (pathname: string): Href | null =>
  LINKS.find(({ href }) => pathname === href || pathname.startsWith(`${href}/`))?.href ?? null;
