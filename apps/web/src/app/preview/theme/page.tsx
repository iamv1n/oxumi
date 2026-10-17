"use client";

import { BellOutlined, ThunderboltOutlined } from "@ant-design/icons";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Input,
  Pagination,
  Radio,
  Segmented,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  Tour,
} from "antd";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef } from "react";
import styled from "styled-components";
import { NODE_KIND, OutcomeTag, Page, PageHeader, Panel, PanelTitle, ReadyTag } from "@/components/app/kit";
import { ThemeChoices, ThemeMenu, ThemeToggle } from "@oxumi/ui/theme/ThemeSwitch";
import { type } from "@oxumi/ui/design/typography";

// Visual check for light and dark mode: every surface, text and status token,
// and the Ant Design components that read the theme, on one page.
//   /preview/theme           the page
//   /preview/theme?tour=1    with the guide's popover open
//   /preview/theme?tip=1     with a tooltip open

const Grid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(4)};

  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Swatches = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: ${({ theme }) => theme.space(2)};
`;

const Swatch = styled.div<{ $bg: string; $fg?: string }>`
  ${type("caption")}
  display: flex;
  align-items: flex-end;
  height: ${({ theme }) => theme.space(14)};
  padding: ${({ theme }) => theme.space(2)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ $bg }) => $bg};
  color: ${({ $fg, theme }) => $fg ?? theme.color.fg};
`;

const Lines = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(1)};

  p {
    ${type("body")}
  }
`;

const Text = styled.p<{ $color: string }>`
  color: ${({ $color }) => $color};
`;

const Floating = styled.div`
  padding: ${({ theme }) => theme.space(3)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.elevated};
  box-shadow: ${({ theme }) => theme.shadow.pop};
`;

const Kind = styled.span<{ $tone: string }>`
  ${type("label")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(2.5)};
  border: 1px solid color-mix(in srgb, ${({ $tone }) => $tone} 40%, transparent);
  border-radius: ${({ theme }) => theme.radius.control};
  background: color-mix(in srgb, ${({ $tone }) => $tone} 14%, transparent);
  color: ${({ $tone }) => $tone};
`;

const SURFACES = ["canvas", "surface", "raised", "overlay", "elevated"] as const;
const TEXTS = ["fg", "fgMuted", "fgSubtle", "fgFaint", "accentText", "success", "warning", "danger", "info", "pink", "violet"] as const;
const STATUSES = ["accent", "success", "warning", "danger", "info"] as const;
const OUTCOMES = ["completed", "partial", "callback_requested", "wrong_person", "opted_out", "failed", null] as const;

export default function ThemePreview() {
  return (
    <Suspense>
      <Preview />
    </Suspense>
  );
}

function Preview() {
  const anchor = useRef<HTMLButtonElement>(null);
  const query = useSearchParams();

  return (
    <Page>
      <PageHeader
        title="Theme check"
        description="Tokens and Ant Design components in the current mode."
        actions={
          <Space>
            <ThemeToggle />
            <ThemeMenu />
          </Space>
        }
      />
      <Grid>
        <Panel>
          <PanelTitle>Surfaces</PanelTitle>
          <Swatches>
            {SURFACES.map((name) => (
              <Swatch key={name} $bg={`var(--cf-${name})`}>
                {name}
              </Swatch>
            ))}
            <Swatch $bg="var(--cf-accent)" $fg="var(--cf-accent-fg)">
              accent / accentFg
            </Swatch>
          </Swatches>
        </Panel>

        <Panel>
          <PanelTitle>Text</PanelTitle>
          <Lines>
            {TEXTS.map((name) => (
              <Text key={name} $color={`var(--cf-${name.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`)})`}>
                {name}: the agent hands back clean, validated data.
              </Text>
            ))}
          </Lines>
        </Panel>

        <Panel>
          <PanelTitle>Soft status backgrounds</PanelTitle>
          <Swatches>
            {STATUSES.map((name) => (
              <Swatch
                key={name}
                $bg={`var(--cf-${name}-soft)`}
                $fg={`var(--cf-${name === "accent" ? "accent-text" : name})`}
              >
                {name}
              </Swatch>
            ))}
          </Swatches>
        </Panel>

        <Panel>
          <PanelTitle>Flow node kinds</PanelTitle>
          <Space wrap>
            {Object.entries(NODE_KIND).map(([kind, look]) => (
              <Kind key={kind} $tone={look.color}>
                {look.icon}
                {look.label}
              </Kind>
            ))}
          </Space>
        </Panel>

        <Panel>
          <PanelTitle>Alerts</PanelTitle>
          <Space orientation="vertical" style={{ width: "100%" }}>
            <Alert type="success" showIcon title="Success" description="The flow is ready to take calls." />
            <Alert type="info" showIcon title="Info" description="Text calls only until a speech provider is connected." />
            <Alert type="warning" showIcon title="Warning" description="Nobody answered." />
            <Alert type="error" showIcon title="Error" description="The call could not be placed." />
          </Space>
        </Panel>

        <Panel>
          <PanelTitle>Tags and badges</PanelTitle>
          <Space wrap>
            {OUTCOMES.map((outcome) => (
              <OutcomeTag key={outcome ?? "in_progress"} outcome={outcome} />
            ))}
            <ReadyTag ready />
            <ReadyTag ready={false} />
          </Space>
          <Space wrap style={{ marginTop: 12 }}>
            <Tag color="success">success</Tag>
            <Tag color="warning">warning</Tag>
            <Tag color="processing">processing</Tag>
            <Tag color="error">error</Tag>
            <Tag>default</Tag>
            <Tag color="success" variant="solid">solid</Tag>
            <Tag color="error" variant="solid">solid</Tag>
            <Badge count={5}>
              <Button shape="circle" icon={<BellOutlined />} aria-label="Notifications" />
            </Badge>
            <Badge status="processing" text="Processing" />
            <Badge status="success" text="Success" />
          </Space>
        </Panel>

        <Panel>
          <PanelTitle>Controls</PanelTitle>
          <Space wrap>
            <Button type="primary" icon={<ThunderboltOutlined />}>Primary</Button>
            <Button ref={anchor}>Default</Button>
            <Button danger>Danger</Button>
            <Button type="primary" danger>Delete</Button>
            <Button type="link">Link</Button>
            <Button type="text">Text</Button>
            <Button disabled>Disabled</Button>
            <Tooltip title="Tooltips are dark in both modes" open={query.has("tip") || undefined}>
              <Button>Tooltip</Button>
            </Tooltip>
          </Space>
          <Space wrap style={{ marginTop: 12 }}>
            <Input placeholder="Input" style={{ width: 160 }} />
            <Input defaultValue="Invalid" status="error" style={{ width: 120 }} />
            <Select defaultValue="a" style={{ width: 140 }} options={[{ value: "a", label: "Select" }]} />
            <Checkbox defaultChecked>Checked</Checkbox>
            <Checkbox>Unchecked</Checkbox>
            <Radio.Group defaultValue="a" options={[{ value: "a", label: "One" }, { value: "b", label: "Two" }]} />
            <Switch defaultChecked aria-label="On" />
            <Switch aria-label="Off" />
            <Segmented options={["Light", "Dark", "System"]} />
          </Space>
          <Tabs
            style={{ marginTop: 12 }}
            items={[
              { key: "1", label: "Selected", children: null },
              { key: "2", label: "Other", children: null },
            ]}
          />
          <Pagination size="small" total={50} defaultCurrent={2} />
        </Panel>

        <Panel>
          <PanelTitle>Appearance and elevation</PanelTitle>
          <ThemeChoices />
          <Floating style={{ marginTop: 16 }}>Floating surface: elevated with the pop shadow.</Floating>
        </Panel>
      </Grid>
      <Tour
        open={query.has("tour")}
        steps={[{ title: "A guide step", description: "The primary button carries the accent and its own text colour.", target: () => anchor.current! }, { title: "Next", description: "Second step." }]}
      />
    </Page>
  );
}
