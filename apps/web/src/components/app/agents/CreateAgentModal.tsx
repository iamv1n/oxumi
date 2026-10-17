"use client";

import {
  CheckCircleFilled,
  FileAddOutlined,
  ProfileOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Alert, App, Button, Form, Input, Modal, Skeleton } from "antd";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, useRef, useState } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { createAgent, generateFlow, type Template, updateAgent, useTemplates } from "@/lib/api";
import { routes } from "@/lib/routes";

interface Values {
  name: string;
  description?: string;
  // What the call should do, when the flow is written by AI.
  brief?: string;
}

const BLANK = "";
const AI = "__ai__";

const Choices = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: 1fr 1fr;
  }
`;

const Choice = styled.button<{ $selected: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(4)};
  border: 1px solid
    ${({ theme, $selected }) => ($selected ? theme.color.accentLine : theme.color.lineStrong)};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme, $selected }) =>
    $selected ? theme.color.accentSoft : theme.color.surface};
  color: ${({ theme }) => theme.color.fg};
  text-align: left;
  cursor: pointer;
  transition:
    border-color ${({ theme }) => theme.motion.fast},
    background ${({ theme }) => theme.motion.fast};

  &:hover {
    border-color: ${({ theme, $selected }) =>
      $selected ? theme.color.accentLine : theme.color.fgSubtle};
  }

  .head {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(2)};
    padding-right: ${({ theme }) => theme.space(6)};
    ${type("label")}
    font-weight: 600;
  }
  .head .anticon {
    color: ${({ theme, $selected }) => ($selected ? theme.color.accentText : theme.color.fgSubtle)};
    font-size: 16px;
  }
  .check {
    position: absolute;
    top: ${({ theme }) => theme.space(4)};
    right: ${({ theme }) => theme.space(4)};
    color: ${({ theme }) => theme.color.accentText};
    font-size: 16px;
    opacity: ${({ $selected }) => ($selected ? 1 : 0)};
  }
  .desc {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
  .meta {
    ${type("caption")}
    margin-top: auto;
    padding-top: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  .meta b {
    font-weight: 500;
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const Label = styled.div`
  ${type("label")}
  margin-bottom: ${({ theme }) => theme.space(2)};
  color: ${({ theme }) => theme.color.fg};
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space(2)};
  margin-top: ${({ theme }) => theme.space(6)};
`;

const humanize = (name: string) => name.replace(/_/g, " ");

function collects(template: Template): string {
  const names = template.flow.fields.map((f) => humanize(f.name));
  const shown = names.slice(0, 4).join(", ");
  return names.length > 4 ? `${shown} and ${names.length - 4} more` : shown;
}

export function CreateAgentModal({
  projectId,
  open,
  onClose,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [form] = Form.useForm<Values>();
  const templates = useTemplates();
  const [templateId, setTemplateId] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const group = useRef<HTMLDivElement>(null);

  const { message } = App.useApp();
  const [step, setStep] = useState<string | null>(null);
  const options = [AI, BLANK, ...(templates.data ?? []).map((t) => t.flow.id)];

  const close = () => {
    if (saving) return;
    onClose();
  };

  const reset = () => {
    form.resetFields();
    setTemplateId(BLANK);
    setError(null);
    setStep(null);
  };

  const choose = (id: string) => {
    setTemplateId(id);
    // Offer the template's name and description while the user has typed none.
    const template = templates.data?.find((t) => t.flow.id === id);
    if (!template) return;
    if (!form.isFieldTouched("name")) form.setFieldValue("name", template.flow.name);
    if (!form.isFieldTouched("description"))
      form.setFieldValue("description", template.flow.description);
  };

  // Arrow keys move the selection, as in a native radio group.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const index = (options.indexOf(templateId) + step + options.length) % options.length;
    choose(options[index]!);
    group.current?.querySelectorAll<HTMLButtonElement>("[role=radio]")[index]?.focus();
  };

  const submit = async (values: Values) => {
    setSaving(true);
    setError(null);
    if (templateId === AI) return void submitWithAi(values);
    try {
      const agent = await createAgent(projectId, {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        templateId: templateId || undefined,
      });
      router.push(routes.agent(projectId, agent.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the agent.");
      setSaving(false);
    }
  };

  // Writes the flow first, so a failed attempt leaves no half-made agent.
  const submitWithAi = async (values: Values) => {
    const name = values.name.trim();
    try {
      setStep("Writing the flow… this takes 10 to 60 seconds");
      const proposal = await generateFlow(projectId, { prompt: values.brief!.trim(), name });
      setStep("Creating the agent…");
      const agent = await createAgent(projectId, {
        name,
        description: values.description?.trim() || undefined,
      });
      await updateAgent(agent.id, { flow: proposal.flow, layout: {} });
      if (proposal.valid) message.success(proposal.summary || "Flow written.");
      else message.warning("Flow written, with a few issues to fix in the builder.");
      router.push(routes.agent(projectId, agent.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the agent.");
      setStep(null);
      setSaving(false);
    }
  };

  return (
    <Modal
      title="New agent"
      open={open}
      onCancel={close}
      afterOpenChange={(visible) => !visible && reset()}
      footer={null}
      width={640}
      destroyOnHidden
      mask={{ closable: !saving }}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={submit}
        disabled={saving}
        style={{ marginTop: 20 }}
      >
        <Form.Item
          name="name"
          label="Name"
          rules={[
            { required: true, whitespace: true, message: "Give the agent a name" },
            { max: 80, message: "Keep the name under 80 characters" },
          ]}
        >
          <Input placeholder="e.g. Driver check-in" autoFocus autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="description"
          label="Description"
          extra="Optional. One line on what this call is for."
          rules={[{ max: 240, message: "Keep the description under 240 characters" }]}
        >
          <Input placeholder="Calls a driver mid-trip and records location and schedule" />
        </Form.Item>

        <Label id="start-from-label">Start from</Label>
        <Choices
          ref={group}
          role="radiogroup"
          aria-labelledby="start-from-label"
          onKeyDown={onKeyDown}
        >
          <Choice
            type="button"
            role="radio"
            aria-checked={templateId === AI}
            tabIndex={templateId === AI ? 0 : -1}
            $selected={templateId === AI}
            onClick={() => choose(AI)}
            disabled={saving}
          >
            <CheckCircleFilled className="check" />
            <span className="head">
              <ThunderboltOutlined /> Describe it to AI
            </span>
            <span className="desc">
              Say who you&apos;re calling and what to find out. AI writes the whole flow.
            </span>
            <span className="meta">
              <b>Uses</b> this project&apos;s language model
            </span>
          </Choice>
          <Choice
            type="button"
            role="radio"
            aria-checked={templateId === BLANK}
            tabIndex={templateId === BLANK ? 0 : -1}
            $selected={templateId === BLANK}
            onClick={() => choose(BLANK)}
            disabled={saving}
          >
            <CheckCircleFilled className="check" />
            <span className="head">
              <FileAddOutlined /> Blank flow
            </span>
            <span className="desc">
              A greeting, one question and a goodbye. Build the rest yourself.
            </span>
            <span className="meta">
              <b>Collects</b> one answer · 3 steps
            </span>
          </Choice>
          {templates.isLoading && (
            <Skeleton.Node active style={{ width: "100%", height: 132 }} />
          )}
          {templates.data?.map((template) => {
            const id = template.flow.id;
            return (
              <Choice
                key={id}
                type="button"
                role="radio"
                aria-checked={templateId === id}
                tabIndex={templateId === id ? 0 : -1}
                $selected={templateId === id}
                onClick={() => choose(id)}
                disabled={saving}
              >
                <CheckCircleFilled className="check" />
                <span className="head">
                  <ProfileOutlined /> {template.flow.name}
                </span>
                <span className="desc">{template.flow.description}</span>
                <span className="meta">
                  <b>Collects</b> {collects(template)} · {template.flow.nodes.length} steps
                </span>
              </Choice>
            );
          })}
        </Choices>
        {templates.error && (
          <Alert
            style={{ marginTop: 12 }}
            type="warning"
            showIcon
            title="Templates could not be loaded"
            description="You can still start from a blank flow."
            action={
              <Button size="small" onClick={() => templates.mutate()}>
                Retry
              </Button>
            }
          />
        )}
        {templateId === AI && (
          <Form.Item
            name="brief"
            label="What should the call do?"
            style={{ marginTop: 16 }}
            rules={[
              { required: true, whitespace: true, message: "Describe the call" },
              { max: 4000, message: "Keep it under 4,000 characters" },
            ]}
          >
            <Input.TextArea
              autoSize={{ minRows: 4, maxRows: 10 }}
              placeholder="e.g. Call customers who ordered from FreshKart to confirm the delivery address and a morning, afternoon or evening slot. If they want to cancel, ask why. If someone else answers, ask when to call back."
            />
          </Form.Item>
        )}
        {step && <Alert style={{ marginTop: 16 }} type="info" showIcon title={step} />}
        {error && (
          <Alert style={{ marginTop: 16 }} type="error" showIcon title={error} />
        )}

        <Footer>
          <Button onClick={close}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            {templateId === AI ? "Write flow and create" : "Create agent"}
          </Button>
        </Footer>
      </Form>
    </Modal>
  );
}
