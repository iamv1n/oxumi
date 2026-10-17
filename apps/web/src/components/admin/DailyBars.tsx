"use client";

import { Tooltip } from "antd";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";

// One measure per day as thin bars: a small multiple, so several sit side by
// side without sharing an axis. Hover a day for its value.

const HEIGHT = 72;

const Figure = styled.figure`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
  min-width: 0;
  margin: 0;
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};

  figcaption {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: ${({ theme }) => theme.space(2)};
  }
  figcaption span {
    ${type("overline")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  figcaption strong {
    ${type("heading")}
    color: ${({ theme }) => theme.color.fg};
    font-variant-numeric: tabular-nums;
  }
  .axis {
    ${type("caption")}
    display: flex;
    justify-content: space-between;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Bars = styled.div<{ $count: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $count }) => $count}, minmax(0, 1fr));
  align-items: end;
  gap: 2px;
  height: ${HEIGHT}px;
  border-bottom: 1px solid ${({ theme }) => theme.color.lineStrong};
`;

// The hit target is the full column; the mark is only as tall as its value.
const Day = styled.div`
  display: flex;
  align-items: flex-end;
  height: 100%;

  i {
    width: 100%;
    min-height: 0;
    border-radius: 4px 4px 0 0;
    background: ${({ theme }) => theme.color.accent};
    opacity: 0.85;
  }
  &:hover i {
    opacity: 1;
  }
`;

const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

export function DailyBars({
  label,
  days,
}: {
  label: string;
  days: { date: string; value: number }[];
}) {
  const total = days.reduce((sum, day) => sum + day.value, 0);
  const max = Math.max(1, ...days.map((day) => day.value));
  return (
    <Figure>
      <figcaption>
        <span>{label}</span>
        <strong>{total.toLocaleString()}</strong>
      </figcaption>
      <Bars
        $count={days.length}
        role="img"
        aria-label={`${label}: ${total.toLocaleString()} over the last ${days.length} days, at most ${max.toLocaleString()} in a day.`}
      >
        {days.map((day) => (
          <Tooltip key={day.date} title={`${dayLabel(day.date)}: ${day.value.toLocaleString()}`}>
            <Day>
              <i style={{ height: day.value ? `max(2px, ${(day.value / max) * 100}%)` : 0 }} />
            </Day>
          </Tooltip>
        ))}
      </Bars>
      {days.length > 0 && (
        <div className="axis" aria-hidden>
          <span>{dayLabel(days[0]!.date)}</span>
          <span>{dayLabel(days[days.length - 1]!.date)}</span>
        </div>
      )}
    </Figure>
  );
}
