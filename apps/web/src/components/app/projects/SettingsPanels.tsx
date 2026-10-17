"use client";

import { DeleteOutlined, DownOutlined, WarningOutlined } from "@ant-design/icons";
import { Alert, App, Button, Form, Input, Modal, Skeleton, Tag } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useId, useState } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import {
  ApiError,
  deleteProject,
  type Health,
  type Project,
  updateProject,
  useHealth,
} from "@/lib/api";
import { ProviderName } from "@/components/app/integrations/logos/ProviderLogo";
import { routes } from "@/lib/routes";
import { Panel } from "../kit";
import { plural } from "./format";
import { useStoredFlag } from "../shell/useStoredFlag";
import { LoadError } from "./LoadError";

// The three sections of a project's settings page.

const LABEL_WIDTH = "152px";

// Spread onto an antd Form inside `Fields` for the label/control grid. The
// column widths live in the `Fields` CSS so they can change by breakpoint.
export const FIELD_LAYOUT = {
  layout: "horizontal",
  labelAlign: "left",
  labelWrap: true,
  colon: false,
  requiredMark: false,
} as const;

const Section = styled(Panel)<{ $danger?: boolean }>`
  padding: 0;
  border-color: ${({ theme, $danger }) => ($danger ? theme.color.dangerSoft : theme.color.line)};
  overflow: hidden;

  > h2 {
    margin: 0;
  }
`;

const SectionToggle = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  width: 100%;
  min-height: ${({ theme }) => theme.space(10)};
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(4)};
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.color.fg};
  text-align: left;
  cursor: pointer;
  transition: background ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &:hover {
    background: ${({ theme }) => theme.color.hover};
  }
  /* The section clips its corners, so the ring is drawn inside. */
  &:focus-visible {
    box-shadow: inset ${({ theme }) => theme.shadow.focus};
  }

  /* Title, then its description or summary: stacked on narrow screens, on
     one line from the sm breakpoint. */
  .text {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }
  .title {
    ${type("label")}
    flex: none;
    font-weight: 600;
  }
  .sub {
    ${type("caption")}
    min-width: 0;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  .sub.summary {
    color: ${({ theme }) => theme.color.fgMuted};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chevron {
    flex: none;
    color: ${({ theme }) => theme.color.fgSubtle};
    font-size: 10px;
    transform: rotate(${({ $open }) => ($open ? "180deg" : "0deg")});
    transition: transform ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
  }

  ${({ theme }) => theme.media.sm} {
    .text {
      flex-direction: row;
      align-items: baseline;
      gap: ${({ theme }) => theme.space(3)};
    }
    .sub {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
`;

// Animates between zero and the content's natural height without measuring.
const Collapse = styled.div<{ $open: boolean; $animate: boolean }>`
  display: grid;
  grid-template-rows: ${({ $open }) => ($open ? "1fr" : "0fr")};
  transition: ${({ theme, $animate }) =>
    $animate ? `grid-template-rows ${theme.motion.base} ${theme.motion.ease}` : "none"};

  > div {
    min-height: 0;
    overflow: hidden;
  }
  /* On the inner wrapper: a border on the clipped row would still show at zero height. */
  > div > div {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
`;

export const SectionBody = styled.div`
  padding: ${({ theme }) => theme.space(4)};
`;

export const SectionFoot = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(4)};
  border-top: 1px solid ${({ theme }) => theme.color.line};

  .hint {
    ${type("caption")}
    flex: 1 0 100%;
    color: ${({ theme }) => theme.color.fgSubtle};
  }

  ${({ theme }) => theme.media.sm} {
    .hint {
      flex: 0 1 auto;
      margin-right: auto;
    }
  }
`;

// Where a section's open/closed state is remembered. Exported so a section
// nav can open the section it links to.
export const sectionOpenKey = (scope: string, id: string) => `oxumi:${scope}-open:${id}`;

export function SettingsSection({
  id,
  scope = "settings",
  title,
  description,
  summary,
  defaultOpen = true,
  danger,
  children,
}: {
  // The page the section belongs to; part of its stored-state key, its
  // element id (`<scope>-<id>`, for in-page links) and its guide target.
  scope?: string;
  // Names the section for the remembered state and the page guide.
  id: string;
  title: string;
  // Shown under the title while the section is open.
  description?: ReactNode;
  // One line of current values, shown instead while it is collapsed.
  summary: ReactNode;
  defaultOpen?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useStoredFlag(sectionOpenKey(scope, id), defaultOpen);
  // Off until the first click, so a remembered state does not animate on load.
  const [animate, setAnimate] = useState(false);
  const buttonId = useId();
  const regionId = useId();
  const sub = open ? description : summary;

  return (
    <Section $danger={danger} id={`${scope}-${id}`} data-tour={`${scope}-${id}`}>
      <h2>
        <SectionToggle
          type="button"
          id={buttonId}
          $open={open}
          aria-expanded={open}
          aria-controls={regionId}
          onClick={() => {
            setAnimate(true);
            setOpen(!open);
          }}
        >
          <span className="text">
            <span className="title">{title}</span>
            {sub && <span className={open ? "sub" : "sub summary"}>{sub}</span>}
          </span>
          <DownOutlined className="chevron" aria-hidden />
        </SectionToggle>
      </h2>
      <Collapse $open={open} $animate={animate}>
        <div id={regionId} role="region" aria-labelledby={buttonId} inert={!open}>
          <div>{children}</div>
        </div>
      </Collapse>
    </Section>
  );
}

// ---- General --------------------------------------------------------------

interface GeneralValues {
  name: string;
  description: string;
}

// A form body as an aligned grid: labels in one column, controls in the
// next. Pair it with FIELD_LAYOUT on the antd Form. On phones antd stacks
// each label above its control.
export const Fields = styled(SectionBody)`
  max-width: 640px;

  .ant-form-item {
    margin-bottom: ${({ theme }) => theme.space(3)};
  }
  .ant-form-item:last-child {
    margin-bottom: 0;
  }
  && .ant-form-item-label > label {
    ${type("label")}
    height: auto;
    padding-bottom: ${({ theme }) => theme.space(1)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
  /* Below the sm breakpoint each label sits above its control. */
  .ant-form-item-row {
    flex-direction: column;
  }
  && .ant-form-item-label {
    flex: none;
    padding: 0;
    text-align: left;
  }
  && .ant-form-item-control {
    flex: none;
    width: 100%;
  }
  .ant-form-item-extra,
  .ant-form-item-explain {
    ${type("caption")}
    margin-top: ${({ theme }) => theme.space(1)};
  }
  /* Rows that are not form items line up with the controls column. */
  .aligned {
    display: grid;
    gap: ${({ theme }) => theme.space(1)} 0;
    margin-bottom: ${({ theme }) => theme.space(3)};
  }
  .aligned > dt,
  .aligned > .key {
    ${type("label")}
    color: ${({ theme }) => theme.color.fgMuted};
  }

  ${({ theme }) => theme.media.sm} {
    .ant-form-item-row {
      flex-direction: row;
    }
    && .ant-form-item-label {
      flex: 0 0 ${LABEL_WIDTH};
    }
    && .ant-form-item-label > label {
      height: ${({ theme }) => theme.space(8)};
      padding-bottom: 0;
    }
    && .ant-form-item-control {
      flex: 1 1 0;
      width: auto;
    }
    .aligned {
      grid-template-columns: ${LABEL_WIDTH} minmax(0, 1fr);
      align-items: center;
    }
    .offset {
      margin-left: ${LABEL_WIDTH};
    }
  }
`;

export function GeneralSettings({ project }: { project: Project }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<GeneralValues>();
  const [saving, setSaving] = useState(false);
  const values = Form.useWatch([], form);

  // Follow the saved project, e.g. after a rename elsewhere.
  useEffect(() => {
    form.setFieldsValue({ name: project.name, description: project.description });
  }, [form, project.name, project.description]);

  const dirty =
    values !== undefined &&
    ((values.name ?? "").trim() !== project.name ||
      (values.description ?? "").trim() !== project.description);

  const save = async (next: GeneralValues) => {
    setSaving(true);
    try {
      await updateProject(project.id, {
        name: next.name.trim(),
        description: (next.description ?? "").trim(),
      });
      message.success("Project saved");
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Could not save the project.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection
      id="general"
      title="General"
      description="The name and description shown across the console."
      summary={
        <>
          {dirty && "Unsaved changes · "}
          {project.name} · {project.description || "No description"}
        </>
      }
    >
      <Form<GeneralValues>
        form={form}
        {...FIELD_LAYOUT}
        initialValues={{ name: project.name, description: project.description }}
        onFinish={save}
      >
        <Fields>
          <Form.Item
            name="name"
            label="Project name"
            rules={[
              { required: true, whitespace: true, message: "A project needs a name" },
              { max: 80, message: "Keep the name under 80 characters" },
            ]}
          >
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ max: 240, message: "Keep the description under 240 characters" }]}
          >
            <Input.TextArea
              placeholder="What these calls are for"
              autoSize={{ minRows: 2, maxRows: 4 }}
              maxLength={240}
            />
          </Form.Item>
        </Fields>
        <SectionFoot>
          <span className="hint" role="status">
            {dirty ? "Unsaved changes" : "Everything is saved"}
          </span>
          <Button disabled={!dirty || saving} onClick={() => form.resetFields()}>
            Discard
          </Button>
          <Button type="primary" htmlType="submit" loading={saving} disabled={!dirty}>
            Save changes
          </Button>
        </SectionFoot>
      </Form>
    </SettingsSection>
  );
}

// ---- Models ---------------------------------------------------------------

const Providers = styled.ul`
  > li {
    display: grid;
    gap: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(4)};
    padding: ${({ theme }) => theme.space(2.5)} ${({ theme }) => theme.space(4)};
  }
  > li + li {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }

  ${({ theme }) => theme.media.sm} {
    > li {
      grid-template-columns: ${LABEL_WIDTH} ${({ theme }) => theme.space(28)} minmax(0, 1fr);
      align-items: baseline;
    }
  }

  strong {
    ${type("label")}
    color: ${({ theme }) => theme.color.fg};
  }
  .ant-tag {
    justify-self: start;
    margin: 0;
  }
  .note {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const Models = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space(1.5)};

  li {
    ${type("caption")}
    padding: 1px ${({ theme }) => theme.space(2)};
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: ${({ theme }) => theme.radius.small};
    color: ${({ theme }) => theme.color.fg};
    white-space: nowrap;
  }
  li[data-default="true"] {
    border-color: ${({ theme }) => theme.color.lineStrong};
  }
  li span {
    margin-left: ${({ theme }) => theme.space(1.5)};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Callout = styled.p`
  ${type("caption")}
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(4)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.warningSoft};
  color: ${({ theme }) => theme.color.fg};

  a {
    color: ${({ theme }) => theme.color.accentText};
    font-weight: 500;
  }
  a:hover {
    color: ${({ theme }) => theme.color.accentTextHover};
  }
`;

function ModelsBody({ health, projectId }: { health: Health; projectId: string }) {
  const ready = health.providers.filter((p) => p.available).length;
  return (
    <>
      {ready === 0 && (
        <Callout role="status">
          <span>
            <WarningOutlined aria-hidden /> No language model is connected, so agents cannot take
            calls yet.
          </span>
          <Link href={routes.integrations(projectId)}>Add a key in Integrations</Link>
        </Callout>
      )}
      <Providers>
        {health.providers.map((provider) => (
          <li key={provider.id}>
            <strong>
              <ProviderName provider={provider.id} label={provider.label} />
            </strong>
            <Tag color={provider.available ? "success" : "default"} variant="filled">
              {provider.available ? "Available" : "Not connected"}
            </Tag>
            {provider.models.length > 0 && provider.available ? (
              <Models aria-label={`${provider.label} models`}>
                {provider.models.map((model) => (
                  <li
                    key={model.ref}
                    data-default={model.ref === health.defaultModel}
                    title={model.ref}
                  >
                    {model.label}
                    {model.ref === health.defaultModel && <span>default</span>}
                  </li>
                ))}
              </Models>
            ) : (
              <p className="note">
                {provider.note ??
                  (provider.available ? "No models listed." : "Add an API key under Integrations")}
                {!provider.available && provider.models.length > 0 && (
                  <> to use {plural(provider.models.length, "model")}.</>
                )}
              </p>
            )}
          </li>
        ))}
        {health.speech.map((speech) => (
          <li key={speech.id}>
            <strong>
              <ProviderName provider={speech.id} label={speech.label} size={16} />
            </strong>
            <Tag color={speech.available ? "success" : "default"} variant="filled">
              {speech.available ? "Available" : "Not connected"}
            </Tag>
            <p className="note">
              Speech.{" "}
              {speech.available
                ? speech.voiceSet
                  ? "Voice calls use its default voice unless an agent sets its own."
                  : "Connected; no default voice is set yet."
                : "Add an API key under Integrations for voice calls."}
            </p>
          </li>
        ))}
      </Providers>
    </>
  );
}

// "Anthropic available · 3 models · text calls only"
function modelsSummary(health: Health): string {
  const ready = health.providers.filter((p) => p.available);
  const models = ready.reduce((sum, p) => sum + p.models.length, 0);
  const providers =
    ready.length === 0
      ? "No provider configured"
      : `${ready.map((p) => p.label).join(", ")} available · ${plural(models, "model")}`;
  return `${providers} · ${health.voice ? "voice calls on" : "text calls only"}`;
}

export function ModelsSettings({ projectId }: { projectId: string }) {
  const { data, error, mutate } = useHealth(projectId);
  return (
    <SettingsSection
      id="models"
      title="Models"
      summary={error && !data ? "Could not load providers" : data ? modelsSummary(data) : "Loading…"}
      description="Read-only. What this project's connected keys make available to its agents."
    >
      {error && !data ? (
        <SectionBody>
          <LoadError compact error={error} what="model providers" onRetry={() => void mutate()} />
        </SectionBody>
      ) : !data ? (
        <SectionBody aria-busy>
          <Skeleton active title={false} paragraph={{ rows: 3 }} />
        </SectionBody>
      ) : (
        <ModelsBody health={data} projectId={projectId} />
      )}
    </SettingsSection>
  );
}

// ---- Danger zone ----------------------------------------------------------

const DangerRow = styled(SectionBody)`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  padding-block: ${({ theme }) => theme.space(3)};

  div {
    flex: 1;
    min-width: min(100%, 260px);
  }
  h3 {
    ${type("label")}
    color: ${({ theme }) => theme.color.fg};
  }
  p {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const Confirm = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(4)};
  padding-top: ${({ theme }) => theme.space(2)};

  p {
    color: ${({ theme }) => theme.color.fgMuted};
  }
  strong {
    color: ${({ theme }) => theme.color.fg};
    font-weight: 600;
  }
  label {
    ${type("label")}
    display: block;
    margin-bottom: ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.color.fg};
    user-select: text;
  }
`;

export function DangerZone({ project }: { project: Project }) {
  const router = useRouter();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = typed.trim() === project.name.trim();

  const close = () => {
    if (deleting) return;
    setOpen(false);
    setTyped("");
    setError(null);
  };

  const remove = async () => {
    if (!matches) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteProject(project.id);
      message.success(`Project "${project.name}" deleted`);
      router.replace(routes.projects);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the project.");
      setDeleting(false);
    }
  };

  return (
    <SettingsSection
      id="danger"
      title="Danger zone"
      description="Actions here cannot be undone."
      summary="Delete this project"
      defaultOpen={false}
      danger
    >
      <DangerRow>
        <div>
          <h3>Delete this project</h3>
          <p>Permanently removes the project, its agents and flows, and all call history.</p>
        </div>
        <Button danger icon={<DeleteOutlined />} onClick={() => setOpen(true)}>
          Delete project
        </Button>
      </DangerRow>
      <Modal
        title="Delete project?"
        open={open}
        onCancel={close}
        onOk={() => void remove()}
        okText="Delete project"
        okButtonProps={{ danger: true, disabled: !matches }}
        confirmLoading={deleting}
        destroyOnHidden
        width={480}
      >
        <Confirm>
          <p>
            This deletes <strong>{project.name}</strong> with all of its agents, flows and call
            history. It cannot be undone.
          </p>
          {error && <Alert type="error" showIcon title={error} />}
          <div>
            <label htmlFor="confirm-project-name">
              Type <strong>{project.name}</strong> to confirm
            </label>
            <Input
              id="confirm-project-name"
              autoFocus
              autoComplete="off"
              value={typed}
              disabled={deleting}
              onChange={(event) => setTyped(event.target.value)}
              onPressEnter={() => void remove()}
              status={typed && !matches ? "warning" : undefined}
            />
          </div>
        </Confirm>
      </Modal>
    </SettingsSection>
  );
}
