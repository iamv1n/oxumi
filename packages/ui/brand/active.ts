import { bolt } from "./concepts";
import type { Concept } from "./concepts";

// The live logo. Every Logo, Wordmark and Lockup in the product, and the
// favicon and app icons, are drawn from this one concept. `bolt` is the mark
// the owner chose. The five earlier explorations are still here: to try one,
// change `bolt` on this line (and in the import above) to tide, crossing,
// circuit, capture or ligature. Compare them at /preview/logos.
export const activeConcept: Concept = bolt;

// The exploration the designer recommended before the owner chose their own
// mark; still marked on the comparison page's archive.
export { tide as recommendedConcept } from "./concepts";
