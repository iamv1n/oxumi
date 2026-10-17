import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  applyTurn,
  handoffSummary,
  resumeAfterTransfer,
  validateFlow,
  describeState,
  type Flow,
  parseFlow,
  startCall,
} from "../src";

const FLOWS_DIR = path.resolve(__dirname, "../../../flows");
const load = (id: string): Flow =>
  parseFlow(JSON.parse(readFileSync(path.join(FLOWS_DIR, `${id}.json`), "utf8")))
    .flow;
const driver = load("driver-status-check");

test("every shipped flow validates without errors or warnings", () => {
  for (const file of readdirSync(FLOWS_DIR)) {
    const raw = JSON.parse(readFileSync(path.join(FLOWS_DIR, file), "utf8"));
    assert.deepEqual(parseFlow(raw).issues, [], file);
  }
});

test("validation reports broken references and dead nodes", () => {
  const broken = structuredClone(driver) as Flow;
  broken.nodes = broken.nodes.filter((n) => n.id !== "ask_help");
  const { issues } = parseFlow(broken);
  assert.ok(issues.some((i) => i.message.includes('missing node "ask_help"')));
  assert.ok(issues.some((i) => i.message.includes('"check_help" is unreachable')));
});

test("on-time trip with no issue completes on the short path", () => {
  let state = startCall(driver);
  assert.equal(state.nodeId, "ask_location");
  state = applyTurn(driver, state, { current_location: "Adilabad toll" }).state;
  assert.equal(state.nodeId, "ask_schedule");
  state = applyTurn(driver, state, { on_schedule: true }).state;
  assert.equal(state.nodeId, "ask_help");
  state = applyTurn(driver, state, { needs_help: "no" }).state;
  assert.equal(state.ended, true);
  assert.equal(state.outcome, "completed");
  assert.ok(!state.path.includes("ask_delay"));
});

test("a delay routes through the delay step, and early answers are kept", () => {
  let state = startCall(driver);
  // The driver volunteers everything about the delay in one breath.
  state = applyTurn(driver, state, {
    current_location: "Kamareddy",
    on_schedule: false,
    delay_reason: "Traffic",
  }).state;
  assert.equal(state.nodeId, "ask_delay");
  assert.equal(state.fields.delay_reason, "traffic");
  state = applyTurn(driver, state, { revised_eta: "around midnight" }).state;
  assert.equal(state.nodeId, "ask_help");
});

test("invalid values are rejected and the step is retried, then skipped", () => {
  let state = startCall(driver);
  state = applyTurn(driver, state, { current_location: "Nagpur" }).state;
  const first = applyTurn(driver, state, { on_schedule: "maybe" });
  assert.deepEqual(first.rejected, [
    { field: "on_schedule", reason: "expected yes or no" },
  ]);
  assert.equal(first.state.nodeId, "ask_schedule");
  const second = applyTurn(driver, first.state, {});
  assert.equal(second.state.nodeId, "ask_help");
  const done = applyTurn(driver, second.state, { needs_help: false }).state;
  assert.equal(done.outcome, "partial");
});

test("a caller signal ends the call with the matching outcome", () => {
  const { state } = applyTurn(driver, startCall(driver), {}, "callback_later");
  assert.equal(state.ended, true);
  assert.equal(state.outcome, "callback_requested");
});

test("the turn brief names the current step and what follows each branch", () => {
  let state = startCall(driver);
  state = applyTurn(driver, state, { current_location: "Nagpur" }).state;
  const brief = describeState(driver, state, { planned_eta: "9 pm" });
  assert.match(brief, /Current step "ask_schedule" \(attempt 1 of 2\)/);
  assert.match(brief, /The planned arrival is 9 pm/);
  assert.match(brief, /If on_schedule is false:/);
  assert.match(brief, /delay_reason \(one of: traffic/);
});

test("a draft with an undrawn connection is reported plainly, not as a schema error", async () => {
  const { checkFlow, blankFlow } = await import("../src");
  const draft = blankFlow("Feedback call");
  assert.deepEqual(checkFlow(draft).issues, []);
  assert.ok(checkFlow(draft).flow);

  (draft.nodes[1] as { next: string }).next = "";
  const check = checkFlow(draft);
  assert.equal(check.flow, null);
  assert.deepEqual(check.issues, [
    { level: "error", message: '"ask_question" is not connected to a next step.' },
  ]);
});

// A short flow that hands the caller to a person when they want a callback.
const withTransfer = (): Flow =>
  parseFlow({
    id: "transfer-test",
    name: "Transfer test",
    settings: { persona: "A polite assistant.", languages: ["en"], handoff: { to: "{{desk}}" } },
    variables: [{ name: "desk" }],
    fields: [
      { name: "wants_person", type: "boolean", description: "Wants to talk to staff" },
      { name: "note", type: "string", description: "Anything else" },
    ],
    start: "hello",
    nodes: [
      { id: "hello", type: "start", say: "Hello.", next: "ask_person" },
      { id: "ask_person", type: "ask", fields: ["wants_person"], next: "route" },
      {
        id: "route",
        type: "branch",
        branches: [{ when: { field: "wants_person", op: "eq", value: true }, next: "to_desk" }],
        default: "ask_note",
      },
      { id: "to_desk", type: "transfer", say: "Connecting you now.", to: "+919876543210", next: "ask_note" },
      { id: "ask_note", type: "ask", fields: ["note"], next: "bye" },
      { id: "bye", type: "end", say: "Goodbye." },
    ],
  }).flow;

test("a transfer step ends the flow as transferred, and can resume if it fails", () => {
  const flow = withTransfer();
  assert.deepEqual(validateFlow(flow), []);
  let state = applyTurn(flow, startCall(flow), { wants_person: true }).state;
  assert.equal(state.ended, true);
  assert.equal(state.outcome, "transferred");
  assert.deepEqual(state.transfer, { to: "+919876543210", reason: "step", resumeAt: "ask_note" });
  assert.match(describeState(flow, state, {}), /put through to a person/);

  state = resumeAfterTransfer(flow, state);
  assert.equal(state.ended, false);
  assert.equal(state.transfer, undefined);
  assert.equal(state.nodeId, "ask_note");
});

test("asking for a person uses the hand-off number, and is ignored without one", () => {
  const flow = withTransfer();
  const asked = applyTurn(flow, startCall(flow), {}, "human").state;
  assert.equal(asked.outcome, "transferred");
  assert.deepEqual(asked.transfer, { to: "{{desk}}", reason: "requested", resumeAt: "ask_person" });
  assert.match(handoffSummary(flow, asked, { desk: "+911" }), /asked to speak to a person/);
  assert.equal(resumeAfterTransfer(flow, asked).nodeId, "ask_person");

  const plain = structuredClone(flow);
  delete plain.settings.handoff;
  const ignored = applyTurn(plain, startCall(plain), {}, "human").state;
  assert.equal(ignored.ended, false);
  assert.equal(ignored.nodeId, "ask_person");
});

test("transfer targets must be a number or a declared variable", () => {
  const flow = withTransfer();
  const bad = structuredClone(flow);
  const node = bad.nodes.find((n) => n.type === "transfer")!;
  if (node.type === "transfer") node.to = "reception";
  bad.settings.handoff = { to: "{{nobody}}" };
  const messages = validateFlow(bad).map((issue) => issue.message).join("\n");
  assert.match(messages, /must transfer to a number/);
  assert.match(messages, /undeclared variable "nobody"/);
});
