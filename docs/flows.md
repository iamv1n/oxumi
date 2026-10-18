# Flow format

A flow describes one kind of call: what the agent says, what it must find out, and where the conversation goes depending on the answers. The builder edits flows on a canvas; underneath, a flow is a JSON document defined by `FlowSchema` in [`packages/flow-core/src/schema.ts`](../packages/flow-core/src/schema.ts). The template flows in [`flows/`](../flows) are complete examples.

The engine runs the flow and the language model only does the talking. The model is told what the current step needs and records what it hears, but only the engine moves the call to the next step, and only with values that fit the field definitions.

## Top level

| Key | Meaning |
|---|---|
| `id`, `name`, `description` | Identity. An agent's `id` and `name` come from the agent itself |
| `settings.persona` | Who the agent is and what it must never do. Goes at the top of the system prompt |
| `settings.languages` | `["hi", "en"]`, `["en"]` or `["hi"]`. The first is the language the call opens in |
| `settings.maxAttempts` | How many times an Ask step asks before moving on (default 2) |
| `settings.maxDurationSec` | Hard limit on call length (default 300, minimum 30) |
| `settings.handoff.to` | Optional. Where a caller who asks for a person is transferred: `+919876543210` or `{{variable}}` |
| `variables` | Facts known before the call, filled in per call: a customer's name, an order id, an appointment time |
| `fields` | What the call collects. Each becomes a typed value in the result |
| `start` | The id of the Start step |
| `nodes` | The steps |

## Variables

Variables are written as `{{name}}` in any line or guidance and filled in when a call is placed. Every variable must be declared; give each a description and a realistic `example`, which the test console uses as its default value.

```json
{ "name": "patient_name", "description": "Patient's name", "example": "Sunita Sharma" }
```

## Fields

| Key | Meaning |
|---|---|
| `name` | `lower_snake_case`, unique |
| `type` | `string`, `number`, `boolean` or `enum` |
| `options` | For `enum`: the allowed values, e.g. `["confirm", "reschedule", "cancel"]` |
| `description` | What counts as an answer. The model reads it to judge what the caller said, so be precise |
| `required` | Default `true`. An Ask step is done when its required fields are collected |

## Steps

| Type | Keys | What it does |
|---|---|---|
| `start` | `say`, `next` | Opens the call. Exactly one, referenced by `start` |
| `say` | `say`, `next` | Says a line and moves on |
| `ask` | `fields`, `guidance`, `maxAttempts?`, `next` | Collects one or more fields in conversation. `guidance` says how to ask and what not to promise |
| `branch` | `branches[]`, `default` | Goes to the first branch whose condition holds, otherwise to `default` |
| `transfer` | `say`, `to`, `next` | Hands the call to a person at `to`. If nobody can take it (a test call, a provider without transfer, no answer), the call continues at `next` |
| `end` | `say`, `outcome` | Says goodbye and ends the call with an outcome |

Lines in `say` give the meaning to convey. The agent says them in the caller's language and its own words, except the opening, which is spoken as written (translated once if the call opens in Hindi).

### Conditions

```json
{ "field": "decision", "op": "eq", "value": "reschedule" }
```

| `op` | Holds when |
|---|---|
| `eq` / `neq` | The field equals, or does not equal, `value` |
| `in` | The field is one of `value` (an array) |
| `known` | The caller gave any answer for the field |

### Attempts

An Ask step that is still missing required fields after a caller's reply counts one attempt. When `maxAttempts` (on the step, or `settings.maxAttempts`) is reached, the step is marked skipped and the call moves on. The call's outcome then reflects what was collected.

## Outcomes

Every call ends with one outcome.

| Outcome | Set by |
|---|---|
| `completed` | An End step (its default outcome) |
| `partial` | The call stopped (hang-up, time limit) after some fields were collected |
| `callback_requested` | The caller asked to be called another time (`signal: callback_later`), or an End step |
| `wrong_person` | Not the intended person (`signal: wrong_person`), or an End step |
| `opted_out` | The caller does not want these calls (`signal: opt_out`). On phone calls the number is added to the project's do-not-call list, unless that is switched off under Compliance |
| `transferred` | The call was handed to a person |
| `failed` | Nothing useful was collected, a network recording or voicemail answered (`signal: not_reached`), or the call could not run |

## Validation

The builder and the API run the same checks (`checkFlow` and `validateFlow`). An agent with errors cannot take calls; warnings are shown but do not block.

- **Errors:** a missing or wrong start step, an unconnected output, a link to a step that does not exist, an Ask for an undeclared field, a branch on an unknown field, a condition without a value, an `enum` field without options, an undeclared `{{variable}}`, a transfer target that is not a number or a single variable, or no reachable End step.
- **Warnings:** an unreachable step, or a field that is never asked for.

## Example: appointment confirmation

From [`flows/opd-appointment-confirmation.json`](../flows/opd-appointment-confirmation.json):

```json
{
  "id": "opd-appointment-confirmation",
  "name": "OPD appointment confirmation",
  "settings": {
    "persona": "You are the front-desk assistant of a clinic, calling a patient about an upcoming appointment. Be polite and unhurried. You only handle scheduling: never give medical advice.",
    "languages": ["hi", "en"],
    "maxAttempts": 2,
    "maxDurationSec": 180
  },
  "variables": [
    { "name": "patient_name", "description": "Patient's name", "example": "Sunita Sharma" },
    { "name": "clinic", "description": "Clinic name", "example": "Aarogya Clinic" },
    { "name": "doctor", "description": "Doctor's name", "example": "Dr. Mehta" },
    { "name": "appointment_time", "description": "Appointment date and time", "example": "tomorrow at 11 am" }
  ],
  "fields": [
    { "name": "decision", "type": "enum", "options": ["confirm", "reschedule", "cancel"], "description": "What the patient wants to do with the appointment" },
    { "name": "preferred_slot", "type": "string", "description": "Day and time the patient would prefer instead, as they said it" },
    { "name": "cancel_reason", "type": "string", "description": "Why the patient is cancelling, if they are willing to say", "required": false }
  ],
  "start": "greeting",
  "nodes": [
    { "id": "greeting", "type": "start", "say": "Namaste {{patient_name}} ji, this is the automated assistant from {{clinic}}, calling about your appointment with {{doctor}} {{appointment_time}}.", "next": "ask_decision" },
    { "id": "ask_decision", "type": "ask", "fields": ["decision"], "guidance": "Ask whether they will come at that time, or would like to change or cancel it.", "next": "route" },
    { "id": "route", "type": "branch", "branches": [
      { "when": { "field": "decision", "op": "eq", "value": "reschedule" }, "next": "ask_slot" },
      { "when": { "field": "decision", "op": "eq", "value": "cancel" }, "next": "ask_reason" }
    ], "default": "confirmed" },
    { "id": "ask_slot", "type": "ask", "fields": ["preferred_slot"], "guidance": "Ask which day and time suits them. Do not promise the slot; the clinic will confirm it.", "next": "rescheduled" },
    { "id": "ask_reason", "type": "ask", "fields": ["cancel_reason"], "guidance": "Ask once, gently, if they would like to share the reason. Accept a refusal.", "maxAttempts": 1, "next": "cancelled" },
    { "id": "confirmed", "type": "end", "say": "Thank you, your appointment is confirmed. Please arrive ten minutes early.", "outcome": "completed" },
    { "id": "rescheduled", "type": "end", "say": "Thank you, the clinic will confirm your new time by message.", "outcome": "completed" },
    { "id": "cancelled", "type": "end", "say": "Your appointment has been cancelled. Take care.", "outcome": "completed" }
  ]
}
```

A patient who answers *"कल नहीं आ पाऊँगी, शनिवार सुबह कर दीजिए"* ("I can't come tomorrow, make it Saturday morning") ends the call with the result below. The enum is normalised to one of its options; the free-text field keeps the patient's words, as its description asks.

```json
{ "outcome": "completed", "fields": { "decision": "reschedule", "preferred_slot": "शनिवार सुबह" } }
```

## Writing good flows

- **Put one question in each Ask step** unless the answers naturally come together, like a date and a time.
- **Write precise field descriptions.** "Day and time they would prefer instead, as they said it" beats "slot".
- **Use guidance for tone and limits**: what not to promise, when to accept a refusal, how many follow-ups are acceptable.
- **Give each distinct ending its own End step** with the right outcome, so results are easy to filter.
- **Make the opening ask the first question** when it can ("…am I speaking with {{name}}?"). The agent then waits for the answer instead of adding a line of its own.
- **Or describe the call to AI.** "Build with AI" in the builder, or "Describe it to AI" when creating an agent, writes a complete, validated flow you can review and edit.
