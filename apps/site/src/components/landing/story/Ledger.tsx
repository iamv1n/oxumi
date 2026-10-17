"use client";

import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import {
  LanguageSwitch,
  type Localized,
  useExampleLanguage,
  useLocalized,
} from "@/components/landing/language";
import { tint } from "./shared";

// "Said, stored": what a caller says on the left, what gets written down on
// the right. The spoken side follows the visitor's example language; the
// stored side never changes.

const LINES: { said: Localized; field: string; value: string }[] = [
  {
    said: { en: "It will be around midnight", hi: "बारह बज जाएँगे", hinglish: "Barah baj jayenge" },
    field: "revised_eta",
    value: '"around midnight"',
  },
  {
    said: { en: "Wednesday, please", hi: "बुधवार को रख दीजिए", hinglish: "Budhvaar ko rakh dijiye" },
    field: "new_day",
    value: "wednesday",
  },
  {
    said: { en: "A refund, please", hi: "रिफ़ंड कर दीजिए", hinglish: "Refund kar do" },
    field: "resolution",
    value: "refund",
  },
  {
    said: { en: "90 at most", hi: "ज़्यादा से ज़्यादा नब्बे", hinglish: "Max 90 tak" },
    field: "budget_max",
    value: "9000000",
  },
];

export default function Ledger() {
  const { language } = useExampleLanguage();
  const say = useLocalized();

  return (
    <Box aria-label="Examples of spoken answers and the values stored for them">
      <Pick>
        <LanguageSwitch />
      </Pick>
      <Head>
        <span>Said</span>
        <span>Stored</span>
      </Head>
      {LINES.map((line) => (
        <Line key={line.field}>
          <Said $hindi={language === "hi"}>“{say(line.said)}”</Said>
          <Thread aria-hidden="true" />
          <Stored>
            <span>{line.field}</span>
            {line.value}
          </Stored>
        </Line>
      ))}
    </Box>
  );
}

const Pick = styled.div`
  margin-bottom: ${({ theme }) => theme.space(6)};
`;

const Box = styled.div`
  width: 100%;
  max-width: 44rem;
`;

const Head = styled.div`
  ${type("overline")}
  display: flex;
  justify-content: space-between;
  padding-bottom: ${({ theme }) => theme.space(3)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

const Line = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  padding-block: ${({ theme }) => theme.space(3)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
`;

const Said = styled.span<{ $hindi: boolean }>`
  ${type("title")}
  min-width: 0;
  font-family: ${({ theme, $hindi }) => ($hindi ? theme.font.hindi : theme.font.display)};
  font-weight: 400;
  font-style: ${({ $hindi }) => ($hindi ? "normal" : "italic")};
  color: ${({ theme }) => theme.color.fg};
`;

// The line a spoken answer travels along on its way to a field.
const Thread = styled.span`
  position: relative;
  flex: 1;
  min-width: ${({ theme }) => theme.space(6)};
  height: 1px;
  background: linear-gradient(
    90deg,
    ${({ theme }) => tint(theme.color.accent, 0)},
    ${({ theme }) => theme.color.accent}
  );

  &::after {
    content: "";
    position: absolute;
    top: 50%;
    right: 0;
    width: ${({ theme }) => theme.space(1.5)};
    height: ${({ theme }) => theme.space(1.5)};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.accent};
    transform: translateY(-50%);
  }
`;

const Stored = styled.span`
  ${type("code")}
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: flex-end;
  color: ${({ theme }) => theme.color.accentTextHover};

  span {
    ${type("caption")}
    font-family: ${({ theme }) => theme.font.mono};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;
