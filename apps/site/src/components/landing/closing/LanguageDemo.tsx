"use client";

import { CheckOutlined } from "@ant-design/icons";
import styled, { keyframes } from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { type Localized, useExampleLanguage } from "../language";
import { mix } from "./shared";

// One question and one answer, said three ways, landing as the same stored
// value. The speech follows the visitor's chosen example language; the field
// beneath it never changes.

const QUESTION: Localized = {
  en: "Which day works better for you?",
  hi: "आपके लिए कौन सा दिन ठीक रहेगा?",
  hinglish: "Aapke liye kaunsa din better rahega?",
};
const ANSWER: Localized = {
  en: "Thursday evening, after six.",
  hi: "गुरुवार शाम, छह बजे के बाद।",
  hinglish: "Thursday evening, six ke baad.",
};

const swap = keyframes`
  from { opacity: 0; transform: translateY(6px); filter: blur(4px); }
  to { opacity: 1; transform: none; filter: none; }
`;

const Box = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(2)};
`;

const Line = styled.p<{ $caller?: boolean; $hindi: boolean }>`
  ${type("heading")}
  font-family: ${({ $hindi, theme }) => ($hindi ? theme.font.hindi : theme.font.sans)};
  font-weight: ${({ theme }) => theme.text.body.weight};
  justify-self: ${({ $caller }) => ($caller ? "end" : "start")};
  max-width: 92%;
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(4)};
  border: 1px solid ${({ $caller, theme }) => ($caller ? mix(theme.color.accent, 35) : theme.color.line)};
  border-radius: ${({ theme }) => theme.radius.card};
  ${({ $caller, theme }) =>
    $caller
      ? `border-bottom-right-radius: ${theme.space(1)};`
      : `border-bottom-left-radius: ${theme.space(1)};`}
  background: ${({ $caller, theme }) => ($caller ? theme.color.accentSoft : theme.color.raised)};
  color: ${({ theme }) => theme.color.fg};

  small {
    ${type("overline")}
    display: block;
    font-family: ${({ theme }) => theme.font.sans};
    color: ${({ $caller, theme }) => ($caller ? theme.color.accentText : theme.color.fgSubtle)};
  }
  span {
    display: block;
    animation: ${swap} ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease} backwards;
  }
`;

const Stored = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(4)};
  margin-top: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  border: 1px dashed ${({ theme }) => theme.color.lineStrong};
  border-radius: ${({ theme }) => theme.radius.card};

  dt {
    ${type("caption")}
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
  dt b {
    color: ${({ theme }) => theme.color.fg};
    font-weight: ${({ theme }) => theme.text.label.weight};
  }
  dt .anticon {
    color: ${({ theme }) => theme.color.success};
  }
  dd {
    ${type("code")}
    margin-left: auto;
    color: ${({ theme }) => theme.color.fg};
  }
`;

export default function LanguageDemo() {
  const { language } = useExampleLanguage();
  const hindi = language === "hi";

  return (
    <Box>
      <Line $hindi={hindi} lang={hindi ? "hi" : undefined}>
        <small>Agent</small>
        <span key={language}>{QUESTION[language]}</span>
      </Line>
      <Line $caller $hindi={hindi} lang={hindi ? "hi" : undefined}>
        <small>Caller</small>
        <span key={language}>{ANSWER[language]}</span>
      </Line>
      <dl>
        <Stored>
          <dt>
            <CheckOutlined aria-hidden="true" />
            <span>
              Stored as <b>Preferred slot</b>, in every language
            </span>
          </dt>
          <dd>Thu, after 6 pm</dd>
        </Stored>
      </dl>
    </Box>
  );
}
