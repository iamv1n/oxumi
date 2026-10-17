"use client";

import type { DefaultTheme } from "styled-components";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";

// How a project's calls ended: one proportional bar, then a row per outcome.

type Tone = (theme: DefaultTheme) => string;

// Display order: best outcome first, running calls last.
const OUTCOMES: { key: string; label: string; tone: Tone }[] = [
  { key: "completed", label: "Completed", tone: (t) => t.color.success },
  { key: "partial", label: "Partial", tone: (t) => t.color.warning },
  { key: "callback_requested", label: "Callback requested", tone: (t) => t.color.info },
  { key: "wrong_person", label: "Wrong person", tone: (t) => t.color.violet },
  { key: "opted_out", label: "Opted out", tone: (t) => t.color.pink },
  { key: "failed", label: "Failed", tone: (t) => t.color.danger },
  { key: "in_progress", label: "In progress", tone: (t) => t.color.fgSubtle },
];

const Bar = styled.div`
  display: flex;
  gap: 2px;
  height: ${({ theme }) => theme.space(2)};
  border-radius: ${({ theme }) => theme.radius.small};
  background: ${({ theme }) => theme.color.hover};
  overflow: hidden;
`;

const Segment = styled.span<{ $tone: Tone; $share: number }>`
  flex: ${({ $share }) => $share} 0 0;
  min-width: ${({ theme }) => theme.space(1.5)};
  background: ${({ theme, $tone }) => $tone(theme)};
`;

const Rows = styled.ul`
  display: flex;
  flex-direction: column;
  margin-top: ${({ theme }) => theme.space(2)};
`;

const Row = styled.li<{ $tone: Tone; $zero: boolean }>`
  ${type("label")}
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  height: ${({ theme }) => theme.space(7)};
  font-weight: 400;
  color: ${({ theme, $zero }) => ($zero ? theme.color.fgSubtle : theme.color.fg)};

  &::before {
    content: "";
    flex: none;
    width: ${({ theme }) => theme.space(2)};
    height: ${({ theme }) => theme.space(2)};
    border-radius: 2px;
    background: ${({ theme, $tone }) => $tone(theme)};
    opacity: ${({ $zero }) => ($zero ? 0.35 : 1)};
  }
  .label {
    flex: 1;
    min-width: 0;
  }
  .count {
    font-variant-numeric: tabular-nums;
    font-weight: ${({ $zero }) => ($zero ? 400 : 500)};
  }
  .share {
    width: ${({ theme }) => theme.space(10)};
    color: ${({ theme }) => theme.color.fgSubtle};
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
`;

const Note = styled.p`
  ${type("caption")}
  margin-top: ${({ theme }) => theme.space(3)};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

const titleCase = (key: string) =>
  key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");

export function OutcomeBreakdown({ outcomes }: { outcomes: Record<string, number> }) {
  // Known outcomes in a fixed order, then anything the API adds later.
  const known = new Set(OUTCOMES.map((o) => o.key));
  const rows = [
    ...OUTCOMES,
    ...Object.keys(outcomes)
      .filter((key) => !known.has(key))
      .map((key) => ({ key, label: titleCase(key), tone: ((t) => t.color.fgMuted) as Tone })),
  ].map((o) => ({ ...o, count: outcomes[o.key] ?? 0 }));

  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const share = (count: number) => {
    if (count === 0) return "";
    const percent = (count / total) * 100;
    return percent < 1 ? "<1%" : `${Math.round(percent)}%`;
  };
  const present = rows.filter((row) => row.count > 0);

  return (
    <div>
      <Bar
        role="img"
        aria-label={
          total === 0
            ? "No calls yet"
            : present.map((row) => `${row.label}: ${row.count}`).join(", ")
        }
      >
        {present.map((row) => (
          <Segment key={row.key} $tone={row.tone} $share={row.count} />
        ))}
      </Bar>
      <Rows>
        {rows.map((row) => (
          <Row key={row.key} $tone={row.tone} $zero={row.count === 0}>
            <span className="label">{row.label}</span>
            <span className="count">{row.count.toLocaleString()}</span>
            <span className="share">{share(row.count)}</span>
          </Row>
        ))}
      </Rows>
      {total === 0 && <Note>Outcomes appear here once this project has calls.</Note>}
    </div>
  );
}
