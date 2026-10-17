"use client";

import { ArrowRightOutlined } from "@ant-design/icons";
import styled from "styled-components";
import { PRODUCT } from "../data";
import MiniFlow from "./MiniFlow";
import { Column, Grid, Minor, Numeral, type PanelProps, Row, Title } from "./parts";

const Layout = styled(Grid)`
  grid-template-columns: ${({ theme }) => theme.space(84)} minmax(0, 1fr);
  align-items: start;
`;

const More = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin-top: ${({ theme }) => theme.space(2)};
  padding-top: ${({ theme }) => theme.space(2)};
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;

// Product: the three parts of the page as steps, beside the flow they describe.
export default function ProductPanel({ onNavigate }: PanelProps) {
  return (
    <Layout>
      <Column>
        <Title>How a call is made</Title>
        {PRODUCT.steps.map((step, order) => (
          <Row key={step.href} href={step.href} onClick={onNavigate}>
            <Numeral>0{order + 1}</Numeral>
            <strong>{step.title}</strong>
            <small>{step.note}</small>
          </Row>
        ))}
        <More>
          <Minor href={PRODUCT.overview.href} onClick={onNavigate}>
            Product overview <ArrowRightOutlined />
          </Minor>
          {PRODUCT.more.map((item) => (
            <Minor key={item.href} href={item.href} onClick={onNavigate}>
              {item.title}
            </Minor>
          ))}
        </More>
      </Column>
      <MiniFlow />
    </Layout>
  );
}
