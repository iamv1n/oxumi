"use client";

import type { CallState, FieldValue, Outcome } from "@oxumi/flow-core";
import { useEffect, useRef, useState } from "react";
import {
  getJson,
  type Health,
  type LoadedFlow,
  type ServerEvent,
  WS_URL,
} from "@/lib/api";
import { CallAudio } from "@/lib/audio";

type Mode = "voice" | "text";

interface Line {
  id: number;
  role: "agent" | "caller";
  text: string;
  turn?: number;
  interrupted?: boolean;
}

interface Timing {
  turn: number;
  llmMs: number | null;
  audioMs: number | null;
  interrupted: boolean;
}

interface CallView {
  status: "connecting" | "live" | "ended";
  mode: Mode;
  lines: Line[];
  hearing: string;
  state: CallState | null;
  timings: Timing[];
  result: { outcome: Outcome; fields: Record<string, FieldValue> } | null;
  error: string | null;
}

const NODE_LABEL = {
  start: "Start",
  say: "Say",
  ask: "Ask",
  branch: "Branch",
  end: "End",
} as const;

function reduce(view: CallView, event: ServerEvent): CallView {
  switch (event.type) {
    case "ready":
      return { ...view, status: "live" };
    case "transcript":
      if (!event.final) return { ...view, hearing: event.text };
      return {
        ...view,
        hearing: "",
        lines: [
          ...view.lines,
          { id: view.lines.length, role: "caller", text: event.text },
        ],
      };
    case "agent_text": {
      const last = view.lines.at(-1);
      if (last?.role === "agent" && last.turn === event.turn) {
        return {
          ...view,
          lines: [
            ...view.lines.slice(0, -1),
            { ...last, text: last.text + event.delta },
          ],
        };
      }
      return {
        ...view,
        lines: [
          ...view.lines,
          {
            id: view.lines.length,
            role: "agent",
            text: event.delta,
            turn: event.turn,
          },
        ],
      };
    }
    case "turn":
      return {
        ...view,
        timings: [...view.timings, event],
        lines: view.lines.map((line) =>
          line.turn === event.turn
            ? { ...line, interrupted: event.interrupted }
            : line,
        ),
      };
    case "state":
      return { ...view, state: event.state };
    case "ended":
      return { ...view, status: "ended", hearing: "", result: event };
    case "error":
      return { ...view, error: event.message };
    default:
      return view;
  }
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)]!;
}

export default function CallConsole() {
  const [flows, setFlows] = useState<LoadedFlow[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [flowId, setFlowId] = useState("");
  const [model, setModel] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [call, setCall] = useState<CallView | null>(null);
  const [draft, setDraft] = useState("");
  const socket = useRef<WebSocket | null>(null);
  const audio = useRef<CallAudio | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([getJson<LoadedFlow[]>("/flows"), getJson<Health>("/health")])
      .then(([list, status]) => {
        setFlows(list);
        setHealth(status);
        setModel(status.defaultModel);
        if (list[0]) selectFlow(list[0]);
      })
      .catch(() =>
        setLoadError("Cannot reach the API on port 4000. Is it running?"),
      );
    return () => {
      socket.current?.close();
      audio.current?.stop();
    };
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [call?.lines.length, call?.hearing]);

  function selectFlow({ flow }: LoadedFlow) {
    setFlowId(flow.id);
    setVariables(
      Object.fromEntries(flow.variables.map((v) => [v.name, v.example ?? ""])),
    );
  }

  const selected = flows.find((f) => f.flow.id === flowId);
  const active = call !== null && call.status !== "ended";

  async function startCall(mode: Mode) {
    setCall({
      status: "connecting",
      mode,
      lines: [],
      hearing: "",
      state: null,
      timings: [],
      result: null,
      error: null,
    });
    const ws = (socket.current = new WebSocket(WS_URL));
    ws.binaryType = "arraybuffer";
    const player = mode === "voice" ? (audio.current = new CallAudio()) : null;

    ws.onopen = () =>
      ws.send(JSON.stringify({ type: "start", flowId, mode, model, variables }));
    ws.onmessage = async ({ data }) => {
      if (typeof data !== "string") return player?.play(data as ArrayBuffer);
      const event = JSON.parse(data) as ServerEvent;
      if (event.type === "ready" && player) {
        try {
          await player.start(
            (pcm) => ws.readyState === WebSocket.OPEN && ws.send(pcm),
            (turn) => ws.send(JSON.stringify({ type: "playback_done", turn })),
          );
        } catch {
          setCall((v) => v && { ...v, error: "Microphone access was denied." });
          return ws.close();
        }
      }
      if (event.type === "agent_audio_end") player?.mark(event.turn);
      if (event.type === "clear") player?.clear();
      setCall((view) => view && reduce(view, event));
    };
    ws.onclose = () => {
      // Let the goodbye finish playing before the audio graph is torn down.
      setTimeout(() => player?.stop(), 4000);
      setCall((view) => view && { ...view, status: "ended", hearing: "" });
    };
  }

  function sendText(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !active) return;
    socket.current?.send(JSON.stringify({ type: "text", text }));
    setDraft("");
  }

  const llmP50 = median(
    (call?.timings ?? []).flatMap((t) => (t.llmMs === null ? [] : [t.llmMs])),
  );
  const audioP50 = median(
    (call?.timings ?? []).flatMap((t) => (t.audioMs === null ? [] : [t.audioMs])),
  );

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-zinc-800 px-5">
        <span className="font-semibold tracking-tight text-zinc-100">Oxumi</span>
        <span className="text-xs text-zinc-500">test console</span>
        {health && (
          <div className="ml-auto flex gap-2 text-xs">
            <span
              className={`rounded px-2 py-1 ${
                health.voice && health.voiceIdSet
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-amber-500/15 text-amber-300"
              }`}
            >
              {health.voice && health.voiceIdSet
                ? "Voice ready"
                : "Voice not configured"}
            </span>
          </div>
        )}
      </header>

      {loadError ? (
        <p className="p-8 text-sm text-red-400">{loadError}</p>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[18rem_1fr_22rem]">
          {/* Setup */}
          <aside className="flex flex-col gap-4 overflow-y-auto border-r border-zinc-800 p-4">
            <label className="text-xs font-medium text-zinc-400">
              Flow
              <select
                value={flowId}
                disabled={active}
                onChange={(e) =>
                  selectFlow(flows.find((f) => f.flow.id === e.target.value)!)
                }
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
              >
                {flows.map(({ flow }) => (
                  <option key={flow.id} value={flow.id}>
                    {flow.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-zinc-400">
              Model
              <select
                value={model}
                disabled={active}
                onChange={(e) => setModel(e.target.value)}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
              >
                {health?.providers.map((provider) => (
                  <optgroup
                    key={provider.id}
                    label={
                      provider.note
                        ? `${provider.label} · ${provider.note}`
                        : provider.label
                    }
                  >
                    {provider.models.map((option) => (
                      <option
                        key={option.ref}
                        value={option.ref}
                        disabled={!provider.available}
                      >
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            {selected && (
              <>
                <p className="text-xs leading-relaxed text-zinc-500">
                  {selected.flow.description}
                </p>
                {selected.issues.map((issue) => (
                  <p
                    key={issue.message}
                    className={`text-xs ${issue.level === "error" ? "text-red-400" : "text-amber-400"}`}
                  >
                    {issue.message}
                  </p>
                ))}
                {selected.flow.variables.map((v) => (
                  <label key={v.name} className="text-xs font-medium text-zinc-400">
                    {v.description || v.name}
                    <input
                      value={variables[v.name] ?? ""}
                      disabled={active}
                      onChange={(e) =>
                        setVariables({ ...variables, [v.name]: e.target.value })
                      }
                      className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
                    />
                  </label>
                ))}
              </>
            )}
            <div className="mt-auto flex flex-col gap-2">
              {active ? (
                <button
                  onClick={() => socket.current?.close()}
                  className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500"
                >
                  Hang up
                </button>
              ) : (
                <>
                  <button
                    onClick={() => startCall("voice")}
                    disabled={!selected || !health?.voice || !health.voiceIdSet}
                    className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Start voice call
                  </button>
                  <button
                    onClick={() => startCall("text")}
                    disabled={!selected}
                    className="rounded border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
                  >
                    Start text call
                  </button>
                </>
              )}
            </div>
          </aside>

          {/* Conversation */}
          <main className="flex min-h-0 flex-col">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-6">
              {!call && (
                <p className="text-sm text-zinc-500">
                  Pick a flow and start a call. You play the person being called.
                </p>
              )}
              {call?.lines.map((line) => (
                <div
                  key={line.id}
                  className={`flex ${line.role === "caller" ? "justify-end" : ""}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                      line.role === "caller"
                        ? "bg-emerald-600/20 text-emerald-100"
                        : "bg-zinc-800 text-zinc-100"
                    }`}
                  >
                    {line.text}
                    {line.interrupted && (
                      <span className="ml-2 text-xs text-amber-400">
                        interrupted
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {call?.hearing && (
                <p className="text-right text-sm text-zinc-500 italic">
                  {call.hearing}…
                </p>
              )}
              {call?.error && (
                <p className="text-sm text-red-400">{call.error}</p>
              )}
              {call?.status === "ended" && (
                <p className="pt-2 text-center text-xs text-zinc-500">
                  Call ended
                  {call.result ? ` · outcome: ${call.result.outcome}` : ""}
                </p>
              )}
              <div ref={bottom} />
            </div>
            {call?.mode === "text" && active && (
              <form
                onSubmit={sendText}
                className="flex gap-2 border-t border-zinc-800 p-4"
              >
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Reply as the person being called…"
                  className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                />
                <button className="rounded bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-500">
                  Send
                </button>
              </form>
            )}
            {call?.mode === "voice" && active && (
              <p className="border-t border-zinc-800 p-4 text-center text-xs text-zinc-500">
                {call.status === "connecting"
                  ? "Connecting…"
                  : "Listening. Speak in Hindi or English; you can interrupt."}
              </p>
            )}
          </main>

          {/* Flow progress, result, latency */}
          <aside className="space-y-6 overflow-y-auto border-l border-zinc-800 p-4">
            <section>
              <h2 className="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">
                Flow
              </h2>
              <ol className="space-y-1">
                {selected?.flow.nodes.map((node) => {
                  const current =
                    call?.state?.nodeId === node.id && call.status !== "ended";
                  const visited = call?.state?.path.includes(node.id);
                  return (
                    <li
                      key={node.id}
                      className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${
                        current
                          ? "bg-emerald-500/15 text-emerald-200"
                          : visited
                            ? "text-zinc-300"
                            : "text-zinc-600"
                      }`}
                    >
                      <span className="w-12 shrink-0 text-[10px] font-semibold uppercase opacity-70">
                        {NODE_LABEL[node.type]}
                      </span>
                      <span className="truncate font-mono text-xs">{node.id}</span>
                      {visited && !current && <span className="ml-auto">✓</span>}
                    </li>
                  );
                })}
              </ol>
            </section>

            <section>
              <h2 className="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">
                Collected
              </h2>
              <dl className="space-y-1.5 text-sm">
                {selected?.flow.fields.map((field) => {
                  const value = (call?.result?.fields ?? call?.state?.fields)?.[
                    field.name
                  ];
                  return (
                    <div key={field.name} className="flex justify-between gap-3">
                      <dt className="font-mono text-xs text-zinc-500">
                        {field.name}
                      </dt>
                      <dd
                        className={
                          value === undefined ? "text-zinc-700" : "text-zinc-100"
                        }
                      >
                        {value === undefined ? "—" : String(value)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>

            <section>
              <h2 className="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">
                Latency (ms)
              </h2>
              <table className="w-full text-right text-xs tabular-nums">
                <thead className="text-zinc-500">
                  <tr>
                    <th className="text-left font-normal">Turn</th>
                    <th className="font-normal">First text</th>
                    <th className="font-normal">First audio</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-300">
                  {call?.timings.map((t) => (
                    <tr key={t.turn}>
                      <td className="text-left">{t.turn}</td>
                      <td>{t.llmMs ?? "—"}</td>
                      <td>{t.audioMs ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
                {llmP50 !== null && (
                  <tfoot className="border-t border-zinc-800 text-zinc-100">
                    <tr>
                      <td className="pt-1 text-left">Median</td>
                      <td className="pt-1">{llmP50}</td>
                      <td className="pt-1">{audioP50 ?? "—"}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
                Measured on the server from the moment the caller&apos;s speech
                is final.
              </p>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
