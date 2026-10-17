// The shape of one call in one language, as the timeline engine plays it.
// The calls themselves, in three languages, live in ./calls.

export type NodeKind = "start" | "say" | "ask" | "branch" | "end";
export type FieldType = "string" | "number" | "boolean" | "enum";

export interface Step {
  id: string;
  kind: NodeKind;
  label: string;
}

export interface Field {
  name: string;
  type: FieldType;
  // The step that asks for this field.
  step: string;
}

export interface Capture {
  field: string;
  value: string;
  // Inclusive word range in the line that the value was taken from.
  from: number;
  to: number;
  // Set when the proposed value fails the field's check; the step is re-asked.
  reject?: string;
}

export interface Beat {
  role: "agent" | "caller";
  step: string;
  text: string;
  captures?: Capture[];
  // Step the engine moves to once the answer is validated (branch nodes).
  route?: string;
  // Agent line cut short because the caller started talking.
  cut?: boolean;
  // Engine note shown just above this line.
  note?: string;
}

export interface Scenario {
  id: string;
  title: string;
  caller: string;
  outcome: string;
  steps: Step[];
  fields: Field[];
  beats: Beat[];
}
