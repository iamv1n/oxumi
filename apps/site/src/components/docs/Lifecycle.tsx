"use client";

import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";

// The life of a phone call, as the API reports it: your request, the three
// statuses a call moves through, and the webhook that carries the result.

const STAGES = [
  { label: "POST /v1/calls", note: "You ask for a call", tone: "you" },
  { label: "ringing", note: "202 returned", tone: "status" },
  { label: "in_progress", note: "The agent runs the flow", tone: "status" },
  { label: "ended", note: "Outcome and fields stored", tone: "status" },
  { label: "call.completed", note: "Posted to your webhook", tone: "you" },
] as const;

export default function Lifecycle() {
  return (
    <Track aria-label="Call lifecycle: request, ringing, in progress, ended, webhook">
      {STAGES.map((stage, i) => (
        <Stage key={stage.label}>
          <Dot $tone={stage.tone} $last={i === STAGES.length - 1} />
          <Label $tone={stage.tone}>{stage.label}</Label>
          <Note>{stage.note}</Note>
        </Stage>
      ))}
    </Track>
  );
}

const Track = styled.ol`
  display: grid;
  max-width: none;
  padding: ${({ theme }) => theme.space(3.5)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
`;

const Stage = styled.li`
  position: relative;
  container-type: inline-size;
  padding: 0 0 ${({ theme }) => theme.space(5)} ${({ theme }) => theme.space(7)};

  &:last-child {
    padding-bottom: 0;
  }
  ${({ theme }) => theme.media.sm} {
    padding: ${({ theme }) => theme.space(5)} ${({ theme }) => theme.space(2)} 0 0;
  }
`;

const Dot = styled.span<{ $tone: "you" | "status"; $last: boolean }>`
  position: absolute;
  top: ${({ theme }) => theme.space(1.5)};
  left: 0;
  width: ${({ theme }) => theme.space(2.5)};
  height: ${({ theme }) => theme.space(2.5)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $tone }) => ($tone === "you" ? theme.color.accentLine : theme.color.info)};

  /* The line to the next stage: down on phones, across from sm up. */
  &::after {
    content: "";
    position: absolute;
    top: ${({ theme }) => theme.space(3.5)};
    left: ${({ theme }) => theme.space(1.125)};
    display: ${({ $last }) => ($last ? "none" : "block")};
    width: 1px;
    height: ${({ theme }) => theme.space(12)};
    background: ${({ theme }) => theme.color.lineStrong};
  }
  ${({ theme }) => theme.media.sm} {
    top: 0;

    &::after {
      top: ${({ theme }) => theme.space(1.125)};
      left: ${({ theme }) => theme.space(3.5)};
      width: calc(100cqw - ${({ theme }) => theme.space(4.5)});
      height: 1px;
    }
  }
`;

const Label = styled.p<{ $tone: "you" | "status" }>`
  ${type("caption")}
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.text.overline.size};
  font-weight: 600;
  color: ${({ theme, $tone }) => ($tone === "you" ? theme.color.accentText : theme.color.fg)};
  overflow-wrap: anywhere;
`;

const Note = styled.p`
  ${type("caption")}
  margin-top: ${({ theme }) => theme.space(1)};
  color: ${({ theme }) => theme.color.fgMuted};
  text-wrap: pretty;
`;
