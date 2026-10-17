"use client";

import { StopOutlined } from "@ant-design/icons";
import type { FlowNode } from "@oxumi/flow-core";
import styled from "styled-components";
import { formatMs, NODE_KIND } from "@/components/app/kit";
import { type } from "@oxumi/ui/design/typography";
import type { Turn } from "@/lib/api";

const DEVANAGARI = /[ऀ-ॿ]/;
export const isHindi = (text: string) => DEVANAGARI.test(text);

const List = styled.ol`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(6)};
`;

const TurnItem = styled.li`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
`;

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  ${type("caption")}
  color: ${({ theme }) => theme.color.fgSubtle};
  font-variant-numeric: tabular-nums;

  .turn {
    font-weight: 500;
    color: ${({ theme }) => theme.color.fgMuted};
  }
  .latency {
    margin-left: auto;
  }
`;

const Step = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  padding: 1px ${({ theme }) => theme.space(2)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.pill};
  font-family: ${({ theme }) => theme.font.mono};
  color: ${({ theme }) => theme.color.fgMuted};

  .anticon {
    color: ${({ $color }) => $color};
    font-size: 11px;
  }
`;

const Line = styled.div<{ $who: "caller" | "agent" }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $who }) => ($who === "caller" ? "flex-end" : "flex-start")};
  gap: ${({ theme }) => theme.space(1)};

  .who {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Bubble = styled.p<{ $who: "caller" | "agent"; $hindi: boolean; $cut: boolean }>`
  max-width: min(100%, 34rem);
  padding: ${({ theme }) => theme.space(2.5)} ${({ theme }) => theme.space(3.5)};
  border: 1px solid
    ${({ theme, $who }) => ($who === "caller" ? "transparent" : theme.color.line)};
  border-radius: ${({ theme }) => theme.radius.card};
  border-bottom-left-radius: ${({ theme, $who }) =>
    $who === "agent" ? "4px" : theme.radius.card};
  border-bottom-right-radius: ${({ theme, $who }) =>
    $who === "caller" ? "4px" : theme.radius.card};
  background: ${({ theme, $who }) =>
    $who === "caller" ? theme.color.accentSoft : theme.color.raised};
  color: ${({ theme, $cut }) => ($cut ? theme.color.fgMuted : theme.color.fg)};
  font-family: ${({ theme, $hindi }) => ($hindi ? theme.font.hindi : theme.font.sans)};
  font-size: ${({ theme, $hindi }) => ($hindi ? "0.9375rem" : theme.text.body.size)};
  line-height: ${({ $hindi }) => ($hindi ? "1.7" : "1.375rem")};
  overflow-wrap: anywhere;
`;

const Cut = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  ${type("caption")}
  color: ${({ theme }) => theme.color.warning};
`;

// The conversation, turn by turn: what the caller said (if anything), then
// the agent's reply, labelled with the flow step it was on.
export function Transcript({
  turns,
  nodeKinds,
}: {
  turns: Turn[];
  nodeKinds: Map<string, FlowNode["type"]>;
}) {
  return (
    <List>
      {turns.map((turn) => {
        const kind = nodeKinds.get(turn.nodeId);
        const look = kind ? NODE_KIND[kind] : undefined;
        const latency = [
          turn.llmMs !== null ? `text ${formatMs(turn.llmMs)}` : null,
          turn.audioMs !== null ? `audio ${formatMs(turn.audioMs)}` : null,
        ].filter(Boolean);
        return (
          <TurnItem key={turn.id} id={`turn-${turn.index + 1}`}>
            <Meta>
              <span className="turn">Turn {turn.index + 1}</span>
              <Step
                $color={look?.color ?? "currentColor"}
                title={look ? `${look.label} step` : "This step is no longer in the flow"}
              >
                {look?.icon}
                {turn.nodeId}
              </Step>
              {latency.length > 0 && <span className="latency">{latency.join(" · ")}</span>}
            </Meta>
            {turn.callerText && (
              <Line $who="caller">
                <span className="who">Caller</span>
                <Bubble
                  $who="caller"
                  $hindi={isHindi(turn.callerText)}
                  $cut={false}
                  lang={isHindi(turn.callerText) ? "hi" : undefined}
                >
                  {turn.callerText}
                </Bubble>
              </Line>
            )}
            <Line $who="agent">
              <span className="who">Agent</span>
              <Bubble
                $who="agent"
                $hindi={isHindi(turn.agentText)}
                $cut={turn.interrupted}
                lang={isHindi(turn.agentText) ? "hi" : undefined}
              >
                {turn.agentText}
              </Bubble>
              {turn.interrupted && (
                <Cut>
                  <StopOutlined /> Interrupted by the caller
                </Cut>
              )}
            </Line>
          </TurnItem>
        );
      })}
    </List>
  );
}
