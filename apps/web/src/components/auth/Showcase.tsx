"use client";

import { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { type } from "@oxumi/ui/design/typography";

// What the product does, in one glance: something a person says on a call,
// and the structured answer it becomes. Cycles through a few industries.
const EXAMPLES = [
  {
    who: "Clinic · appointment confirmation",
    said: "I can't make it tomorrow. Could you move me to Saturday morning?",
    hindi: false,
    fields: [
      ["decision", "reschedule"],
      ["preferred_slot", "Saturday morning"],
    ],
  },
  {
    who: "Fleet · driver check-in",
    said: "Just crossed the Adilabad toll. It'll be around midnight now.",
    hindi: false,
    fields: [
      ["current_location", "Adilabad toll"],
      ["revised_eta", "around midnight"],
    ],
  },
  {
    who: "Real estate · lead qualification",
    said: "Budget around eighty lakh, Baner side, in two months.",
    hindi: false,
    fields: [
      ["budget", "80 lakh"],
      ["locality", "Baner"],
      ["timeline", "2 months"],
    ],
  },
  {
    who: "Support · first-line triage",
    said: "My refund still hasn't come through. The order was last Monday.",
    hindi: false,
    fields: [
      ["issue_category", "refund"],
      ["urgency", "high"],
    ],
  },
] as const;

const INTERVAL_MS = 4800;

const rise = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
`;
const land = keyframes`
  from { opacity: 0; transform: translateX(-8px) scale(0.96); }
  to { opacity: 1; transform: none; }
`;
const wave = keyframes`
  from { height: 4px; }
  to { height: 16px; }
`;

const Card = styled.figure`
  position: relative;
  z-index: 1;
  max-width: 30rem;
  padding: ${({ theme }) => theme.space(6)};
  border: 1px solid ${({ theme }) => theme.color.lineStrong};
  border-radius: ${({ theme }) => theme.radius.panel};
  background: color-mix(in srgb, ${({ theme }) => theme.color.surface} 72%, transparent);
  backdrop-filter: blur(20px);
  box-shadow: ${({ theme }) => theme.shadow.pop};
`;

const Who = styled.p`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  ${type("overline")}
  color: ${({ theme }) => theme.color.fgSubtle};

  .bars {
    display: flex;
    align-items: center;
    gap: 2px;
    height: 16px;
  }
  .bars i {
    width: 2px;
    border-radius: 2px;
    background: ${({ theme }) => theme.color.accentLine};
    animation: ${wave} 0.6s ease-in-out infinite alternate;
  }
  .bars i:nth-child(2) { animation-delay: 0.15s; }
  .bars i:nth-child(3) { animation-delay: 0.3s; }
  .bars i:nth-child(4) { animation-delay: 0.45s; }
`;

const Said = styled.blockquote<{ $hindi: boolean }>`
  margin: ${({ theme }) => theme.space(4)} 0 0;
  /* Room for two lines, so the card keeps its height between examples. */
  min-height: 3.5rem;
  font-family: ${({ theme, $hindi }) => ($hindi ? theme.font.hindi : theme.font.sans)};
  font-size: 1.1875rem;
  line-height: 1.75rem;
  color: ${({ theme }) => theme.color.fg};
  animation: ${rise} 0.5s ${({ theme }) => theme.motion.ease} both;

  &::before { content: "“"; color: ${({ theme }) => theme.color.fgSubtle}; }
  &::after { content: "”"; color: ${({ theme }) => theme.color.fgSubtle}; }
`;

const Arrow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  margin: ${({ theme }) => theme.space(5)} 0 ${({ theme }) => theme.space(4)};
  ${type("caption")}
  color: ${({ theme }) => theme.color.fgSubtle};

  &::before,
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: ${({ theme }) => theme.color.line};
  }
`;

const Fields = styled.dl`
  display: grid;
  align-content: start;
  gap: ${({ theme }) => theme.space(2)};
  /* Three rows tall, the most any example has. */
  min-height: 9rem;

  div {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: ${({ theme }) => theme.space(4)};
    padding: ${({ theme }) => theme.space(2.5)} ${({ theme }) => theme.space(3.5)};
    border-radius: ${({ theme }) => theme.radius.control};
    background: ${({ theme }) => theme.color.accentSoft};
    animation: ${land} 0.45s ${({ theme }) => theme.motion.ease} both;
  }
  dt {
    ${type("code")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
  dd {
    ${type("label")}
    color: ${({ theme }) => theme.color.accentText};
  }
`;

const Foot = styled.figcaption`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.space(5)};
  ${type("caption")}
  color: ${({ theme }) => theme.color.fgFaint};
`;

const Dots = styled.span`
  display: flex;
  gap: ${({ theme }) => theme.space(1.5)};

  i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ theme }) => theme.color.lineStrong};
    transition: background ${({ theme }) => theme.motion.base}, width ${({ theme }) => theme.motion.base};
  }
  i[data-on="true"] {
    width: 18px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.accentLine};
  }
`;

export default function Showcase() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % EXAMPLES.length),
      INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, []);

  const example = EXAMPLES[index]!;
  return (
    <Card aria-label="Example of a spoken answer becoming structured data">
      <Who>
        <span className="bars" aria-hidden>
          <i /><i /><i /><i />
        </span>
        {example.who}
      </Who>
      {/* Keyed so each example replays its entrance. */}
      <Said key={`said-${index}`} $hindi={example.hindi}>
        {example.said}
      </Said>
      <Arrow>becomes</Arrow>
      <Fields key={`fields-${index}`}>
        {example.fields.map(([name, value], i) => (
          <div key={name} style={{ animationDelay: `${600 + i * 220}ms` }}>
            <dt>{name}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </Fields>
      <Foot>
        Illustrative examples
        <Dots aria-hidden>
          {EXAMPLES.map((_, i) => (
            <i key={i} data-on={i === index} />
          ))}
        </Dots>
      </Foot>
    </Card>
  );
}
