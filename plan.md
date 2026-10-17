# PRD: Voice agent platform with a visual flow designer

Name: **Oxumi**. Status: draft v1, 12 Oct 2026.

## 1. Summary

A platform where a non-engineer designs a phone conversation as a flow in a web UI, and an AI voice agent then makes or takes that call in Hindi, English or a mix of both, and returns a structured result.

The same engine serves any business that makes repetitive calls: a clinic confirming OPD appointments, a fleet manager checking on drivers, a real-estate broker qualifying leads, a support desk handling first-line queries. The use case lives in the flow, not in the code.

## 2. Problem

Small and mid-sized businesses in India run on phone calls that follow a script: confirm, remind, ask five questions, write the answers into a sheet. People do this by hand, so calls are missed, answers are recorded inconsistently and nothing is measurable.

Existing options fall short in one of three ways:

- **IVR ("press 1 for…")** is rigid and callers dislike it.
- **Hosted voice-agent platforms** are prompt-driven: the owner writes one long prompt and hopes the agent follows it. There is no guarantee which questions get asked or what data comes back.
- **Custom builds** need an engineering team, and most handle Hindi and code-switching poorly.

## 3. Who it is for

| User | What they do in the product |
|---|---|
| **Flow designer** (clinic manager, ops lead, broker, support lead) | Builds and tests flows, starts calls or campaigns, reads results |
| **Callee** (patient, driver, lead, customer) | Answers the phone and talks; never sees the product |
| **Developer** (optional) | Connects results to other systems through webhooks and the API |

### Launch use cases (shipped as templates)

| Template | Direction | The agent collects |
|---|---|---|
| OPD appointment confirmation | Outbound | Confirmed / reschedule / cancel, preferred new slot, reason |
| Truck driver status check | Outbound | Current location, ETA, on time or delayed, delay reason, issues |
| Real-estate lead qualification | Outbound | Budget, locality, property type, timeline, site-visit slot |
| Customer support triage | Inbound (later) | Issue category, order or account reference, urgency, callback consent |

## 4. Goals and non-goals

**Goals for v1**

1. A flow designer usable without writing code or prompts.
2. Calls that feel natural: fast replies, interruptible, Hindi/English/Hinglish.
3. Every call ends in a validated structured result, not just a transcript.
4. One runtime for browser test calls and real phone calls.
5. Every call is traceable: transcript, recording, per-stage latency.

**Non-goals for v1**

- Voice cloning or custom voice training.
- Languages beyond Hindi and English (the design must not block adding them).
- WhatsApp, SMS or chat channels.
- A marketplace, billing or multi-region hosting.
- Fully open-ended agents with no flow.

## 5. Success metrics

| Metric | Target for v1 |
|---|---|
| Time from caller finishing to agent's first audio | p50 under 800 ms, p95 under 1.5 s |
| Flow completion rate on answered calls | Over 70% on the four templates |
| Field extraction accuracy on simulated calls | Over 95% of fields correct |
| Time for a new user to build and test a first flow | Under 15 minutes |
| Concurrent calls on one node | 50 without breaching the latency target |

These targets are starting assumptions; they get re-set after the first measured runs in milestone 1.

## 6. Core concepts

- **Workspace**: one business, its members, phone numbers, API keys.
- **Flow**: a versioned graph of nodes that describes one kind of call. Has a draft and a published version.
- **Variables**: inputs known before the call (driver name, trip ID, appointment time). Filled per call or per CSV row.
- **Fields**: the outputs the call must produce (ETA, delay reason). Each has a type, allowed values and required/optional.
- **Call**: one run of a published flow against one person on one channel.
- **Campaign**: a flow run against a list of contacts with a schedule and retry rules.
- **Result**: the collected fields plus an outcome (completed, partial, no answer, wrong number, callback requested, transferred).

## 7. Product requirements

### 7.1 Flow designer

A canvas where nodes are dragged, connected and configured in a side panel.

| Node | Purpose |
|---|---|
| Start | Greeting and AI disclosure; picks the opening language |
| Say | Speak a line, with variables filled in |
| Ask | Collect one or more fields; the agent rephrases and re-asks until valid or a retry limit is hit |
| Branch | Route on a field or variable value (delayed → ask reason) |
| Action | Call a webhook or API mid-call and use the response (look up a free slot) |
| Transfer | Hand off to a human number with a spoken summary |
| End | Closing line and call outcome |

Requirements:

- Flow-level settings: persona, voice, languages allowed, max call length, what to do on silence or abuse.
- Ask nodes take plain-language guidance ("accept a city or a highway landmark"), not a prompt.
- Validation before publish: unreachable nodes, fields never collected, branches with no default.
- Test call from the designer in the browser, showing live transcript, the current node highlighted, fields filling in and per-turn latency.
- Draft and published versions; a running campaign stays on the version it started with.
- Start from one of the four templates.

### 7.2 Call runtime

- Streaming pipeline: speech-to-text → flow engine and LLM → text-to-speech, with audio flowing before the full reply is generated.
- Turn-taking from voice activity detection; the caller can interrupt and the agent stops speaking at once.
- The flow engine, not the LLM, decides which node is active and when the call is complete. The LLM words the reply and extracts fields; extracted values are validated against the field definitions.
- Language follows the caller: replies in Hindi, English or mixed to match what was heard.
- Handles no answer, voicemail, "call me later", wrong person, silence and off-topic questions as explicit outcomes.
- Hard limits on call length and re-asks.

### 7.3 Channels

- **Browser** (milestone 1): microphone call from the web app. Used for testing and demos.
- **Outbound phone** (milestone 3): through Twilio first; provider kept behind an interface so an Indian carrier such as Exotel can be added.
- **Inbound phone** (later): a number mapped to a flow.

### 7.4 Results and integrations

- Call list with filters; per-call page with transcript, recording, fields, outcome and latency trace.
- CSV export of results.
- Webhook on call end with a signed payload.
- REST API: start a call, get a result, list calls.

### 7.5 Campaigns

- Upload a CSV, map columns to variables, pick a published flow.
- Calling window, concurrency cap, retry policy for no-answer and busy.
- Live progress and outcome breakdown.

### 7.6 Quality tooling

- **Latency trace** per turn: end of speech, transcript final, first LLM token, first audio.
- **Simulated callers**: an LLM plays personas (cooperative, distracted, Hindi-only, interrupts often) against a flow; results are scored against expected fields. Runs as a regression test before publishing.

## 8. Trust, safety and compliance

To confirm with proper legal advice before any real customer calls; treated here as product requirements, not legal conclusions.

- The agent says it is an automated assistant at the start of every call.
- Recording is disclosed; recording can be switched off per flow.
- Outbound calling respects consent, do-not-disturb registries, permitted hours and telemarketer registration rules in India.
- Health-related flows (OPD) collect the minimum needed and never give medical advice.
- Opt-out is honoured immediately and stored per number.
- Configurable retention for audio and transcripts; delete on request.
- Development and demos use synthetic contacts only. No employer or client data.

## 9. Technical approach

Decisions already made: TypeScript; ElevenLabs streaming speech-to-text and text-to-speech with our own orchestration; browser and phone on one pipeline; LLM behind an interface (Claude and OpenAI).

```
Browser (WebRTC/WebSocket) ─┐
                            ├─► Transport ─► Session ─► STT ─► Flow engine + LLM ─► TTS ─► Transport
Phone (Twilio media stream) ┘                   │
                                                └─► Trace, transcript, result ─► PostgreSQL ─► Webhooks/API
```

- **Transport** adapters normalise audio per channel (16 kHz PCM for browser, 8 kHz μ-law for telephony) so the session code is channel-agnostic.
- **Session** owns one call: turn state, interruption, cancellation, timers.
- **Flow engine** is deterministic and pure: given the flow, the state and newly extracted fields, it returns the next node. Fully unit-testable without audio or network.
- **Providers** (STT, TTS, LLM, telephony) sit behind interfaces, with fakes for tests.
- **Storage**: PostgreSQL for workspaces, flows, versions, calls, turns, results; object storage for recordings; Redis for campaign queues.
- **Web app**: Next.js, with a node-graph library for the canvas.

Exact ElevenLabs and Twilio message formats are to be verified against current docs at the start of milestone 1.

## 10. Milestones

| # | Milestone | Done when |
|---|---|---|
| 1 | Runtime in the browser | Driver status flow (defined in a file) completes a browser call in Hindi and English, with interruption and a latency trace stored |
| 2 | Flow designer | The same flow can be built, validated, published and test-called entirely from the UI; four templates available |
| 3 | Phone calls | A published flow places a real outbound call through Twilio and stores recording and result |
| 4 | Results and integrations | Call list, call detail page, CSV export, webhook, REST API |
| 5 | Quality tooling | Simulated callers score a flow; latency dashboard with p50/p95 |
| 6 | Campaigns | CSV upload, schedule, retries, live progress |
| 7 | Hardening | Auth and workspaces, opt-out list, retention settings, load test to 50 concurrent calls |

Milestones 1 to 3 are the demonstrable core. Milestone 5 produces the numbers worth quoting.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Latency over telephony is worse than in the browser | Measure from milestone 1; keep audio in the provider's native format; stream every stage |
| Hindi and code-switched speech is misheard, especially names and places | Pass variables and expected values as hints; confirm critical fields back to the caller |
| LLM drifts from the flow | Engine owns the state; LLM output is validated; simulated-caller regression tests |
| Per-minute cost makes small users unprofitable | Track cost per call from the start; cap call length |
| Regulatory exposure on outbound calls | Synthetic data only until section 8 is reviewed |
| Canvas builder absorbs all the time | Ship milestone 1 on file-defined flows first; the designer edits the same format |

## 12. Open questions

1. Is this open source, a hosted product, or both?
2. Inbound calls in v1 or after?
3. Which Indian telephony provider after Twilio?
4. Single user at first, or workspaces and roles from the start?
5. Does Action (mid-call webhook) belong in v1 or v2?
