"use client";

import { LoadingOutlined, SendOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { App, Button, Drawer, Input, Segmented, Skeleton } from "antd";
import { type KeyboardEvent, useEffect, useState } from "react";
import styled from "styled-components";
import type { SaveStatus } from "@/components/app/flow-builder/useFlowEditor";
import { type } from "@oxumi/ui/design/typography";
import {
  type AgentDetail,
  ApiError,
  type FlowProposal,
  generateFlow,
  updateAgent,
} from "@/lib/api";
import { ProposalPreview } from "./ProposalPreview";

// Asks the project's language model to change this agent's flow, or to write
// a new one, shows the result step by step, and applies it on request. The
// builder picks the applied flow up like any change saved from elsewhere.

type Mode = "change" | "new";

const CHANGE_IDEAS = [
  "If they're busy, offer to call back and ask when",
  "Ask for their email address before saying goodbye",
  "Make every question shorter and friendlier",
  "If they ask for a person, end politely and mark it for a callback",
];
const NEW_IDEAS = [
  "Remind patients of tomorrow's appointment and confirm, reschedule or cancel",
  "Ask customers to rate their last delivery from 1 to 5 and why",
  "Check whether a lead is still interested and book a demo slot",
];

const Body = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(4)};
`;

const Ideas = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space(1.5)};

  button {
    ${type("caption")}
    padding: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(2.5)};
    border: 1px solid ${({ theme }) => theme.color.lineStrong};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: transparent;
    color: ${({ theme }) => theme.color.fgMuted};
    cursor: pointer;
  }
  button:hover {
    border-color: ${({ theme }) => theme.color.accentLine};
    color: ${({ theme }) => theme.color.fg};
  }
`;

const Hint = styled.p`
  ${type("caption")}
  color: ${({ theme }) => theme.color.fgSubtle};
`;

const Working = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};

  p {
    ${type("label")}
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const Refine = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space(2)};
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space(2)};
`;

const submitOnModEnter = (run: () => void) => (event: KeyboardEvent) => {
  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    run();
  }
};

function useElapsed(running: boolean): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    setSeconds(0);
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);
  return seconds;
}

export function AiFlowDrawer({
  agent,
  open,
  onClose,
  saveStatus,
  onSaveNow,
}: {
  agent: AgentDetail;
  open: boolean;
  onClose: () => void;
  // The builder's own save state: a flow is applied only once local edits
  // are on the server, so neither overwrites the other.
  saveStatus: SaveStatus;
  onSaveNow: () => void;
}) {
  const { message } = App.useApp();
  const [mode, setMode] = useState<Mode>("change");
  const [prompt, setPrompt] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [proposal, setProposal] = useState<FlowProposal | null>(null);
  const [working, setWorking] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const elapsed = useElapsed(working);

  useEffect(() => {
    if (open && saveStatus === "unsaved") onSaveNow();
  }, [open, saveStatus, onSaveNow]);

  const run = async (text: string, base: FlowProposal | null) => {
    if (!text.trim() || working) return;
    setWorking(true);
    setError(null);
    try {
      const next = await generateFlow(agent.projectId, {
        prompt: text.trim(),
        name: agent.name,
        ...(base ? { flow: base.flow } : mode === "change" ? { agentId: agent.id } : {}),
      });
      setProposal(next);
      setFollowUp("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not write the flow.");
    } finally {
      setWorking(false);
    }
  };

  const discard = () => {
    setProposal(null);
    setError(null);
  };

  const apply = async () => {
    if (!proposal) return;
    setApplying(true);
    const before = { flow: agent.flow, layout: agent.layout };
    try {
      // An empty layout has the builder place every step afresh.
      await updateAgent(agent.id, { flow: proposal.flow, layout: {} });
      onClose();
      setProposal(null);
      setPrompt("");
      message.success({
        content: (
          <span>
            Flow updated.{" "}
            <Button
              type="link"
              size="small"
              onClick={() =>
                void updateAgent(agent.id, before).then(
                  () => message.info("Restored the previous flow."),
                  () => message.error("Could not restore the previous flow."),
                )
              }
            >
              Undo
            </Button>
          </span>
        ),
        duration: 8,
      });
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Could not apply the flow.");
    } finally {
      setApplying(false);
    }
  };

  const waitingForSave = saveStatus !== "saved";
  const ideas = mode === "change" ? CHANGE_IDEAS : NEW_IDEAS;

  return (
    <Drawer
      title={
        <span>
          <ThunderboltOutlined /> Build with AI
        </span>
      }
      open={open}
      onClose={onClose}
      size={560}
      destroyOnHidden={false}
      extra={
        proposal && !working ? (
          <Actions>
            <Button onClick={discard}>Discard</Button>
            <Button
              type="primary"
              loading={applying}
              disabled={waitingForSave}
              onClick={() => void apply()}
            >
              Apply to agent
            </Button>
          </Actions>
        ) : null
      }
    >
      <Body>
        {!proposal && !working && (
          <>
            <Segmented<Mode>
              block
              value={mode}
              onChange={setMode}
              options={[
                { value: "change", label: "Change this flow" },
                { value: "new", label: "Write a new flow" },
              ]}
            />
            <Input.TextArea
              autoFocus
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={submitOnModEnter(() => void run(prompt, null))}
              autoSize={{ minRows: 4, maxRows: 12 }}
              maxLength={4000}
              placeholder={
                mode === "change"
                  ? "What should change? e.g. After confirming the slot, ask if they want an SMS reminder."
                  : "Describe the call: who you're calling, why, what to find out, and what to do in each case."
              }
              aria-label="Describe the flow"
            />
            <Ideas aria-label="Ideas">
              {ideas.map((idea) => (
                <button key={idea} type="button" onClick={() => setPrompt(idea)}>
                  {idea}
                </button>
              ))}
            </Ideas>
            {error && <Hint style={{ color: "var(--cf-danger)" }}>{error}</Hint>}
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              disabled={!prompt.trim()}
              onClick={() => void run(prompt, null)}
            >
              {mode === "change" ? "Propose changes" : "Write flow"}
            </Button>
            <Hint>
              Uses this project&apos;s language model. Nothing changes until you apply the result.
              {mode === "new" && " A new flow replaces the current one."}
            </Hint>
          </>
        )}

        {working && (
          <Working role="status">
            <p>
              <LoadingOutlined /> Writing the flow… {elapsed}s
              {elapsed > 20 && " (bigger flows take up to a minute)"}
            </p>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Working>
        )}

        {proposal && !working && (
          <>
            <Hint>
              {waitingForSave
                ? "Saving your edits to the canvas first…"
                : "Apply replaces this agent's flow. You can undo it right after."}
            </Hint>
            <ProposalPreview
              proposal={proposal}
              previous={mode === "change" ? agent.flow : undefined}
            />
            <Refine>
              <Input
                value={followUp}
                onChange={(event) => setFollowUp(event.target.value)}
                onPressEnter={() => void run(followUp, proposal)}
                placeholder="Ask for another change to this proposal"
                aria-label="Refine the proposal"
              />
              <Button
                icon={<SendOutlined />}
                disabled={!followUp.trim()}
                onClick={() => void run(followUp, proposal)}
                aria-label="Refine"
              />
            </Refine>
            {error && <Hint style={{ color: "var(--cf-danger)" }}>{error}</Hint>}
          </>
        )}
      </Body>
    </Drawer>
  );
}
