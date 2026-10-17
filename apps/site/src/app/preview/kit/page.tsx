"use client";

import { ThunderboltOutlined } from "@ant-design/icons";
import { Button, Input, Space, Tag } from "antd";
import {
  Container,
  Eyebrow,
  Glass,
  GradientText,
  Heading,
  Lede,
  Reveal,
  Section,
} from "@/components/landing/kit";

// Smoke test for the design foundation: tokens, Ant Design theme, landing kit.
export default function KitPreview() {
  return (
    <Section>
      <Container>
        <Reveal>
          <Eyebrow>Foundation check</Eyebrow>
          <Heading>
            Tokens drive <GradientText><em>everything.</em></GradientText>
          </Heading>
          <Lede>Ant Design, styled-components and global CSS all read one registry.</Lede>
        </Reveal>
        <Glass style={{ marginTop: 32, padding: 24 }}>
          <Space wrap>
            <Button type="primary" icon={<ThunderboltOutlined />}>Primary</Button>
            <Button>Default</Button>
            <Button danger>Danger</Button>
            <Input placeholder="Input" style={{ width: 200 }} />
            <Tag color="success">completed</Tag>
          </Space>
        </Glass>
      </Container>
    </Section>
  );
}
