import { bolt } from "./bolt";
import { capture } from "./capture";
import { circuit } from "./circuit";
import { crossing } from "./crossing";
import { ligature } from "./ligature";
import { tide } from "./tide";
import type { Concept, ConceptId } from "./types";

// The five explorations, in the order the comparison page shows them.
export const concepts: readonly Concept[] = [tide, crossing, circuit, capture, ligature];

export const conceptById: Readonly<Record<ConceptId, Concept>> = { bolt, tide, crossing, circuit, capture, ligature };

export { bolt, capture, circuit, crossing, ligature, tide };
export type { Concept, ConceptId };
