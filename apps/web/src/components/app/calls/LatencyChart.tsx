"use client";

import styled from "styled-components";
import { formatMs } from "@/components/app/kit";
import { type } from "@oxumi/ui/design/typography";
import type { Turn } from "@/lib/api";

type Series = "text" | "audio";

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

const Medians = styled.dl`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space(3)};
  margin-bottom: ${({ theme }) => theme.space(5)};

  div {
    padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: ${({ theme }) => theme.radius.control};
  }
  dt {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(2)};
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
  dd {
    ${type("heading")}
    margin-top: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.fg};
    font-variant-numeric: tabular-nums;
  }
  dd small {
    ${type("caption")}
    margin-left: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Swatch = styled.i<{ $series: Series }>`
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: ${({ theme, $series }) =>
    $series === "text" ? theme.color.info : theme.color.accent};
`;

const Rows = styled.ol`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(3)};
`;

const Row = styled.li`
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: ${({ theme }) => theme.space(2)};
  align-items: center;

  .index {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
  .bars {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .none {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgFaint};
  }
`;

const BarLine = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 62px;
  gap: ${({ theme }) => theme.space(2)};
  align-items: center;

  .value {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgMuted};
    font-variant-numeric: tabular-nums;
    text-align: right;
    white-space: nowrap;
  }
  .value.slow {
    color: ${({ theme }) => theme.color.warning};
    font-weight: 500;
  }
`;

const Track = styled.div`
  position: relative;
  height: 8px;
  border-radius: 2px;
  background: ${({ theme }) => theme.color.hover};
`;

const Fill = styled.div<{ $series: Series }>`
  height: 100%;
  min-width: 2px;
  border-radius: 2px;
  background: ${({ theme, $series }) =>
    $series === "text" ? theme.color.info : theme.color.accent};
`;

// Marks the series median on every track, so a slow turn stands out.
const Mark = styled.span`
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 1px;
  background: ${({ theme }) => theme.color.fg};
  opacity: 0.55;
`;

const Note = styled.p`
  ${type("caption")}
  margin-top: ${({ theme }) => theme.space(4)};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

// How long the caller waited on each turn: time to the first text from the
// model, and to the first audio they could hear.
export function LatencyChart({ turns }: { turns: Turn[] }) {
  const text = turns.flatMap((t) => (t.llmMs === null ? [] : [t.llmMs]));
  const audio = turns.flatMap((t) => (t.audioMs === null ? [] : [t.audioMs]));
  const medians: Record<Series, number | null> = { text: median(text), audio: median(audio) };
  const max = Math.max(1, ...text, ...audio);
  const hasAudio = audio.length > 0;

  const bar = (series: Series, ms: number | null) => {
    if (ms === null) return null;
    const mid = medians[series];
    const slow = mid !== null && ms > mid * 1.75 && ms - mid > 300;
    return (
      <BarLine>
        <Track>
          <Fill $series={series} style={{ width: `${(ms / max) * 100}%` }} />
          {mid !== null && <Mark style={{ left: `${(mid / max) * 100}%` }} />}
        </Track>
        <span className={slow ? "value slow" : "value"}>{formatMs(ms)}</span>
      </BarLine>
    );
  };

  return (
    <div>
      <Medians>
        <div>
          <dt>
            <Swatch $series="text" /> First text
          </dt>
          <dd>
            {medians.text === null ? "—" : medians.text}
            {medians.text !== null && <small>ms median</small>}
          </dd>
        </div>
        <div>
          <dt>
            <Swatch $series="audio" /> First audio
          </dt>
          <dd>
            {medians.audio === null ? "—" : medians.audio}
            {medians.audio !== null && <small>ms median</small>}
          </dd>
        </div>
      </Medians>
      <Rows aria-label="Latency per turn">
        {turns.map((turn) => (
          <Row
            key={turn.id}
            aria-label={`Turn ${turn.index + 1}: first text ${formatMs(turn.llmMs)}, first audio ${formatMs(turn.audioMs)}`}
          >
            <span className="index" aria-hidden>
              {turn.index + 1}
            </span>
            <div className="bars" aria-hidden>
              {turn.llmMs === null && turn.audioMs === null ? (
                <span className="none">Not measured</span>
              ) : (
                <>
                  {bar("text", turn.llmMs)}
                  {bar("audio", turn.audioMs)}
                </>
              )}
            </div>
          </Row>
        ))}
      </Rows>
      <Note>
        Measured from the caller finishing to the first reply. The line on each bar is the median
        for this call.
        {!hasAudio && " This was a text call, so there is no audio timing."}
      </Note>
    </div>
  );
}
