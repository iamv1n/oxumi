"use client";

import { PlusOutlined } from "@ant-design/icons";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { Container, Reveal, Section } from "../kit";
import { SectionHeader } from "../structure";

// What the rest of /product does not already answer. Every answer describes
// the product as built; nothing here is a measurement or a customer claim.

const QUESTIONS: [question: string, answer: string][] = [
  [
    "Do I need an engineer to build a flow?",
    "No. You draw the conversation with drag-and-drop nodes, then set the agent's persona, languages, voice and model.",
  ],
  [
    "Which models can run it?",
    "Anthropic, OpenAI or Gemini. You choose per agent, and the flow behaves the same whichever one is doing the talking.",
  ],
  [
    "What do I get when a call ends?",
    "The answers your flow asked for, as validated fields. The call history keeps the transcript and the timing of every reply beside them.",
  ],
  [
    "Who is using it today?",
    "Nobody we can quote. This is an early build with no customers yet, so there are no logos or numbers on this site. Judge it on your own flow.",
  ],
];

const List = styled.div`
  max-width: 48rem;
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;

const Item = styled.details`
  border-bottom: 1px solid ${({ theme }) => theme.color.line};

  summary {
    ${type("lede")}
    font-weight: ${({ theme }) => theme.text.title.weight};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ theme }) => theme.space(4)};
    padding-block: ${({ theme }) => theme.space(5)};
    border-radius: ${({ theme }) => theme.radius.control};
    color: ${({ theme }) => theme.color.fg};
    cursor: pointer;
    list-style: none;
    transition: color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary:hover {
    color: ${({ theme }) => theme.color.accentText};
  }
  summary .anticon {
    flex: none;
    color: ${({ theme }) => theme.color.fgSubtle};
    transition: transform ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
  }
  &[open] summary .anticon {
    color: ${({ theme }) => theme.color.accentText};
    transform: rotate(45deg);
  }
  p {
    ${type("lede")}
    max-width: 38rem;
    padding-bottom: ${({ theme }) => theme.space(6)};
    color: ${({ theme }) => theme.color.fgMuted};
    text-wrap: pretty;
  }
`;

export default function ProductQuestions() {
  return (
    <Section id="questions">
      <Container>
        <Reveal>
          <SectionHeader
            eyebrow="Straight answers"
            title={
              <>
                Ask the <em>hard</em> ones.
              </>
            }
          />
        </Reveal>
        <Reveal>
          <List>
            {QUESTIONS.map(([question, answer], i) => (
              <Item key={question} open={i === 0} name="product-questions">
                <summary>
                  {question}
                  <PlusOutlined aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </Item>
            ))}
          </List>
        </Reveal>
      </Container>
    </Section>
  );
}
