import { AGENT_LIST, AGENT_LIST_TOTAL } from "./samples";

// Says so when the captured agent list was shortened for display.
export const AGENT_LIST_TITLE =
  AGENT_LIST_TOTAL > AGENT_LIST.length
    ? `Response · ${AGENT_LIST.length} of ${AGENT_LIST_TOTAL} agents shown`
    : "Response";
