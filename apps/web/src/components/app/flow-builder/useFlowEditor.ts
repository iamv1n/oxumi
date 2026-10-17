"use client";

import type { DraftFlow, NodeLayout } from "@oxumi/flow-core";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { type AgentDetail, updateAgent } from "@/lib/api";
import { completeLayout } from "./layout";
import { type Doc, stableJson } from "./model";

// The builder's document state: the current Doc, its undo history, and the
// debounced save that writes it back to the agent.

const SAVE_DELAY_MS = 800;
// Edits with the same key inside this window fold into one undo step, so
// typing a sentence is undone as a sentence.
const COALESCE_MS = 1200;
const HISTORY_LIMIT = 100;

interface History {
  past: Doc[];
  present: Doc;
  future: Doc[];
  // Bumped on every change to `present` that should be saved.
  revision: number;
  lastKey: string | null;
  lastAt: number;
}

type Action =
  | { type: "apply"; fn: (doc: Doc) => Doc; key?: string; at: number }
  | { type: "undo" }
  | { type: "redo" }
  // Swaps the document without touching history or marking it unsaved.
  | { type: "rebase"; doc: Doc }
  | { type: "reset"; doc: Doc };

function reducer(state: History, action: Action): History {
  switch (action.type) {
    case "apply": {
      const present = action.fn(state.present);
      if (present === state.present) return state;
      const fold =
        action.key !== undefined &&
        action.key === state.lastKey &&
        action.at - state.lastAt < COALESCE_MS &&
        state.past.length > 0;
      return {
        past: fold ? state.past : [...state.past, state.present].slice(-HISTORY_LIMIT),
        present,
        future: [],
        revision: state.revision + 1,
        lastKey: action.key ?? null,
        lastAt: action.at,
      };
    }
    case "undo": {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        revision: state.revision + 1,
        lastKey: null,
        lastAt: 0,
      };
    }
    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
        revision: state.revision + 1,
        lastKey: null,
        lastAt: 0,
      };
    }
    case "rebase":
      return { ...state, present: action.doc };
    case "reset":
      return { past: [], present: action.doc, future: [], revision: 0, lastKey: null, lastAt: 0 };
  }
}

function docFrom(agent: AgentDetail): { doc: Doc; generated: boolean } {
  const { nodes, start } = agent.flow;
  const { layout, generated } = completeLayout(nodes, start, agent.layout ?? {});
  return { doc: { nodes, start, layout }, generated };
}

const serverJson = (flow: DraftFlow, layout: NodeLayout) =>
  stableJson({ nodes: flow.nodes, start: flow.start, layout });

export type SaveStatus = "saved" | "unsaved" | "saving" | "error";

export interface FlowEditor {
  doc: Doc;
  // True while the layout is one we computed and the user has not touched.
  layoutGenerated: boolean;
  apply: (fn: (doc: Doc) => Doc, key?: string) => void;
  // Replaces the layout without an undo step or a save.
  rebaseLayout: (layout: NodeLayout) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  status: SaveStatus;
  saveError: string | null;
  saveNow: () => void;
}

export function useFlowEditor(agent: AgentDetail): FlowEditor {
  const [initial] = useState(() => docFrom(agent));
  const [state, dispatch] = useReducer(reducer, initial.doc, (doc) =>
    reducer({} as History, { type: "reset", doc }),
  );
  const [generated, setGenerated] = useState(initial.generated);

  // What has been written: the revision last saved, and the save in flight.
  const [savedRevision, setSavedRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<{ revision: number; message: string } | null>(null);

  const latest = useRef({ state, agent, savedRevision, saving });
  useEffect(() => {
    latest.current = { state, agent, savedRevision, saving };
  });
  // The server's copy as we last saw it, to tell an outside change from an
  // echo of our own save.
  const known = useRef(serverJson(agent.flow, agent.layout ?? {}));

  const save = useCallback(async () => {
    const { state: current, agent: server } = latest.current;
    const { nodes, start } = current.present;
    const ids = new Set(nodes.map((n) => n.id));
    const layout: NodeLayout = {};
    for (const [id, pos] of Object.entries(current.present.layout)) {
      // Two decimals: a node is placed by its handle, which can sit on a half pixel.
      if (ids.has(id)) layout[id] = { x: Math.round(pos.x), y: Math.round(pos.y * 100) / 100 };
    }
    setSaving(true);
    try {
      // Other tabs own the rest of the flow, so start from the latest copy.
      const saved = await updateAgent(server.id, {
        flow: { ...server.flow, nodes, start },
        layout,
      });
      known.current = serverJson(saved.flow, saved.layout ?? {});
      setSavedRevision(current.revision);
      setFailure(null);
    } catch (error) {
      setFailure({
        revision: current.revision,
        message: error instanceof Error ? error.message : "Could not save.",
      });
    } finally {
      setSaving(false);
    }
  }, []);

  const dirty = state.revision !== savedRevision;
  const failed = failure !== null && failure.revision === state.revision;

  // Autosave: a while after the last change, unless a save is already running
  // (it re-arms when that one finishes) or this revision has already failed.
  useEffect(() => {
    if (!dirty || saving || failed) return;
    const timer = setTimeout(save, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [dirty, saving, failed, state.revision, save]);

  // Leaving the page with changes pending: write them now.
  useEffect(
    () => () => {
      const current = latest.current;
      if (current.state.revision !== current.savedRevision && !current.saving) void save();
    },
    [save],
  );
  useEffect(() => {
    if (!dirty && !saving) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saving]);

  // The agent changed on the server (edited elsewhere). Take it only when
  // there is nothing local to lose; otherwise our next save wins.
  useEffect(() => {
    const json = serverJson(agent.flow, agent.layout ?? {});
    if (json === known.current) return;
    const current = latest.current;
    if (current.state.revision !== current.savedRevision || current.saving) return;
    known.current = json;
    const next = docFrom(agent);
    dispatch({ type: "reset", doc: next.doc });
    setGenerated(next.generated);
    setSavedRevision(0);
    setFailure(null);
  }, [agent]);

  const apply = useCallback((fn: (doc: Doc) => Doc, key?: string) => {
    dispatch({ type: "apply", fn, key, at: Date.now() });
  }, []);
  const rebaseLayout = useCallback((layout: NodeLayout) => {
    dispatch({ type: "rebase", doc: { ...latest.current.state.present, layout } });
  }, []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);

  return {
    doc: state.present,
    layoutGenerated: generated && state.revision === 0,
    apply,
    rebaseLayout,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    status: saving ? "saving" : failed ? "error" : dirty ? "unsaved" : "saved",
    saveError: failed ? failure.message : null,
    saveNow: () => void save(),
  };
}
