"use client";

import { type KeyboardEvent, useState } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import type { BillingReport } from "@/lib/api";
import { dayLabel, formatMoney, plural } from "./format";

type Day = BillingReport["byDay"][number];

const PLOT_HEIGHT = 160;

// A round amount at or above `value`, for the top of the axis.
function niceMax(value: number): number {
  if (value <= 1) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= value) ?? 10;
  return step * power;
}

// Axis labels stay short: "₹250", "₹1.5".
const axis = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(3)};
  margin-bottom: ${({ theme }) => theme.space(4)};

  h2 {
    ${type("heading")}
    color: ${({ theme }) => theme.color.fg};
  }
`;

const Readout = styled.p`
  ${type("caption")}
  color: ${({ theme }) => theme.color.fgMuted};
  font-variant-numeric: tabular-nums;

  b {
    color: ${({ theme }) => theme.color.fg};
    font-weight: 500;
  }
`;

const Plot = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0 ${({ theme }) => theme.space(2)};

  .y {
    ${type("caption")}
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: ${PLOT_HEIGHT}px;
    /* Centre each label on its gridline. */
    margin-block: -0.5em;
    color: ${({ theme }) => theme.color.fgSubtle};
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
`;

const Bars = styled.div<{ $count: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $count }) => $count}, minmax(0, 1fr));
  height: ${PLOT_HEIGHT}px;
  border-bottom: 1px solid ${({ theme }) => theme.color.lineStrong};
  border-radius: 2px;
  /* Gridlines at the top and at half height. */
  background:
    linear-gradient(${({ theme }) => theme.color.line}, ${({ theme }) => theme.color.line}) top /
      100% 1px no-repeat,
    linear-gradient(${({ theme }) => theme.color.line}, ${({ theme }) => theme.color.line}) center /
      100% 1px no-repeat;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.accentLine};
    outline-offset: 4px;
  }
`;

const Column = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 100%;
  padding-inline: 12%;
  background: ${({ theme, $active }) => ($active ? theme.color.hover : "transparent")};

  span {
    width: 100%;
    max-width: ${({ theme }) => theme.space(6)};
    min-height: 2px;
    border-radius: 2px 2px 0 0;
    background: ${({ theme, $active }) => ($active ? theme.color.accentHover : theme.color.accent)};
  }
  /* A day without spend still has a mark, so gaps read as zero. */
  span.none {
    min-height: 1px;
    height: 1px;
    border-radius: 0;
    background: ${({ theme }) => theme.color.lineStrong};
  }
`;

const XAxis = styled.div<{ $count: number }>`
  ${type("caption")}
  grid-column: 2;
  display: grid;
  grid-template-columns: repeat(${({ $count }) => $count}, minmax(0, 1fr));
  margin-top: ${({ theme }) => theme.space(1.5)};
  color: ${({ theme }) => theme.color.fgSubtle};

  span {
    grid-row: 1;
    justify-self: center;
    white-space: nowrap;
  }
  span:first-child {
    justify-self: start;
  }
  span:last-child {
    justify-self: end;
  }
  /* Phones have room for the two ends only. */
  span:not(:first-child):not(:last-child) {
    display: none;
  }
  ${({ theme }) => theme.media.sm} {
    span:not(:first-child):not(:last-child) {
      display: inline;
    }
  }
`;

// Spend per day of the month. Hover a bar, or focus the chart and use the
// arrow keys, to read a day's amount.
export function SpendChart({ days }: { days: Day[] }) {
  const peak = Math.max(0, ...days.map((day) => day.cost));
  const max = niceMax(peak);
  const [picked, setPicked] = useState<number | null>(null);
  const last = days.length - 1;
  const active = Math.min(picked ?? last, last);
  const day = days[active];

  if (!day) return null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const move: Record<string, number> = {
      ArrowLeft: active - 1,
      ArrowRight: active + 1,
      Home: 0,
      End: last,
    };
    const next = move[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setPicked(Math.min(last, Math.max(0, next)));
  };

  const busiest = days.reduce((best, d) => (d.cost > best.cost ? d : best), days[0]!);
  const summary =
    peak === 0
      ? `Spend per day from ${dayLabel(days[0]!.date)} to ${dayLabel(days[last]!.date)}: nothing spent.`
      : `Spend per day from ${dayLabel(days[0]!.date)} to ${dayLabel(days[last]!.date)}. Highest on ${dayLabel(busiest.date)} at ${formatMoney(busiest.cost)}. Use the left and right arrow keys to read each day.`;

  // About six evenly spaced labels, always including the last day.
  const every = Math.max(1, Math.ceil(days.length / 6));
  const ticks = days
    .map((d, i) => ({ i, text: dayLabel(d.date) }))
    .filter(({ i }) => i === last || (i % every === 0 && last - i >= every / 2));

  return (
    <>
      <Head>
        <h2>Spend per day</h2>
        <Readout role="status" aria-live="polite">
          <b>{dayLabel(day.date)}</b> · {formatMoney(day.cost)} · {plural(day.calls, "call")}
        </Readout>
      </Head>
      <Plot>
        <div className="y" aria-hidden>
          <span>{axis(max)}</span>
          <span>{axis(max / 2)}</span>
          <span>₹0</span>
        </div>
        <Bars
          $count={days.length}
          tabIndex={0}
          role="img"
          aria-label={summary}
          onKeyDown={onKeyDown}
          onMouseLeave={() => setPicked(null)}
        >
          {days.map((d, i) => (
            <Column key={d.date} $active={i === active} onMouseEnter={() => setPicked(i)}>
              {d.cost === 0 ? (
                <span className="none" />
              ) : (
                <span style={{ height: `${(d.cost / max) * 100}%` }} />
              )}
            </Column>
          ))}
        </Bars>
        <XAxis $count={days.length} aria-hidden>
          {ticks.map(({ i, text }) => (
            <span key={i} style={{ gridColumn: i + 1 }}>
              {text}
            </span>
          ))}
        </XAxis>
      </Plot>
    </>
  );
}
