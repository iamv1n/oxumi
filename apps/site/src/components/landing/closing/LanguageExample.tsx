"use client";

import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { LanguageSwitch } from "../language";
import LanguageDemo from "./LanguageDemo";
import { Stage, StageNote } from "./shared";

// The language principle, shown: pick a language and the same exchange is
// spoken that way, while the stored value stays as it was.

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(4)};
  margin-bottom: ${({ theme }) => theme.space(5)};

  > span {
    ${type("overline")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

export default function LanguageExample() {
  return (
    <Stage aria-label="Example of the same exchange in English, Hindi and Hinglish">
      <Head>
        <span>The caller speaks</span>
        <LanguageSwitch />
      </Head>
      <LanguageDemo />
      <StageNote>
        <b>Example</b>
        An illustrative exchange. Switching here changes every example call on the site.
      </StageNote>
    </Stage>
  );
}
