"use client";

import { PHONE_NUMBER } from "@oxumi/flow-core";
import { App, Alert, Form, Input, InputNumber, Select, Switch } from "antd";
import Link from "next/link";
import { useParams } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Disclosure, useSections } from "@/components/app/agents/Disclosure";
import { type Language, LanguageOrder } from "@/components/app/agents/LanguageOrder";
import { SaveBar } from "@/components/app/agents/SaveBar";
import { LoadError, PageSkeleton } from "@/components/app/agents/states";
import {
  cleanNumber,
  describeTelephony,
  TelephonySection,
} from "@/components/app/agents/TelephonySection";
import { ProviderName } from "@/components/app/integrations/logos/ProviderLogo";
import { modelLabel, Page, PageHeader } from "@/components/app/kit";
import { type Guide, usePageGuide } from "@/components/onboarding/OnboardingProvider";
import { type } from "@oxumi/ui/design/typography";
import {
  type AgentDetail,
  type Health,
  updateAgent,
  useAgent,
  useCredentials,
  useHealth,
} from "@/lib/api";
import { routes } from "@/lib/routes";

interface Values {
  description: string;
  persona: string;
  languages: Language[];
  voiceId: string;
  // Speech provider id, or "" for the project's default.
  speech: string;
  model: string;
  // Telephony provider id, or "" for the project's default.
  telephony: string;
  // The number this agent calls from, or "" for the provider's default.
  phoneNumber: string;
  maxAttempts: number;
  maxDurationSec: number;
  // Answers side questions from the project's knowledge base.
  knowledge: boolean;
  // Where a caller who asks for a person is sent, or "" for nowhere.
  handoff: string;
}

const fromAgent = (agent: AgentDetail): Values => ({
  description: agent.description ?? "",
  persona: agent.flow.settings.persona ?? "",
  languages: agent.flow.settings.languages ?? [],
  voiceId: agent.flow.settings.voiceId ?? "",
  speech: agent.speech ?? "",
  model: agent.model ?? "",
  telephony: agent.telephony ?? "",
  phoneNumber: agent.phoneNumber ?? "",
  maxAttempts: agent.flow.settings.maxAttempts ?? 2,
  maxDurationSec: agent.flow.settings.maxDurationSec ?? 300,
  knowledge: agent.knowledge ?? true,
  handoff: agent.flow.settings.handoff?.to ?? "",
});

// What is compared to decide whether the form differs from the saved agent.
const fingerprint = (v: Partial<Values> | undefined): string =>
  JSON.stringify([
    (v?.description ?? "").trim(),
    (v?.persona ?? "").trim(),
    v?.languages ?? [],
    (v?.voiceId ?? "").trim(),
    v?.speech ?? "",
    v?.model ?? "",
    v?.telephony ?? "",
    cleanNumber(v?.phoneNumber ?? ""),
    v?.maxAttempts ?? null,
    v?.maxDurationSec ?? null,
    v?.knowledge ?? null,
    (v?.handoff ?? "").trim(),
  ]);

type SectionId =
  | "identity"
  | "persona"
  | "voice"
  | "telephony"
  | "model"
  | "knowledge"
  | "handoff"
  | "limits";

const SECTIONS: { id: SectionId; title: string; fields: (keyof Values)[] }[] = [
  { id: "identity", title: "Identity", fields: ["description"] },
  { id: "persona", title: "Persona", fields: ["persona"] },
  { id: "voice", title: "Voice & language", fields: ["languages", "speech", "voiceId"] },
  { id: "telephony", title: "Telephony", fields: ["telephony", "phoneNumber"] },
  { id: "model", title: "Model", fields: ["model"] },
  { id: "knowledge", title: "Knowledge", fields: ["knowledge"] },
  { id: "handoff", title: "Hand-off", fields: ["handoff"] },
  { id: "limits", title: "Limits", fields: ["maxAttempts", "maxDurationSec"] },
];
const DEFAULT_OPEN: Record<SectionId, boolean> = {
  identity: true,
  persona: true,
  voice: true,
  telephony: false,
  model: false,
  knowledge: false,
  handoff: false,
  limits: false,
};
const LANGUAGE_NAME: Record<Language, string> = { hi: "Hindi", en: "English" };

const GUIDE: Guide = {
  id: "agent-config",
  steps: [
    {
      target: '[data-tour="agent-tabs"]',
      title: "Everything about one agent",
      description:
        "Flow is the conversation itself. Configuration is how the agent behaves. Data is what it knows and what it must find out. Test lets you try a call, and Calls keeps the history.",
      placement: "bottom",
    },
    {
      target: '[data-tour="config-persona"]',
      title: "Persona",
      description:
        "The standing brief for every call: who the agent is, who it is calling and the tone to take. Write it the way you would brief a new colleague.",
    },
    {
      target: '[data-tour="config-voice"]',
      title: "Languages, in order",
      description:
        "The call opens in the first language. If the person switches to another one that is ticked, the agent follows them.",
    },
    {
      target: '[data-tour="config-telephony"]',
      title: "Telephony",
      description:
        "Which phone service this agent rings people through, and the number it calls from. It also shows what is still missing before this agent can make real phone calls.",
    },
    {
      target: '[data-tour="config-model"]',
      title: "Model",
      description:
        "The AI that runs the conversation. Faster models reply sooner; larger ones cope better with complicated flows. Server default is a safe choice.",
    },
    {
      target: '[data-tour="config-limits"]',
      title: "Limits",
      description:
        "How many times a question is repeated before moving on, and the longest a call may last. These stop a call from going round in circles.",
    },
    {
      target: '[data-tour="save-bar"]',
      title: "Save or reset",
      description:
        "Nothing changes for callers until you save. Reset puts the form back to what was last saved.",
      placement: "top",
    },
  ],
};

const Layout = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(8)};
  align-items: start;

  ${({ theme }) => theme.media.lg} {
    grid-template-columns: 184px minmax(0, 1fr);
  }
`;

// A short anchor list: where you are in the form, and where the errors are.
const MiniNav = styled.nav`
  display: none;

  ${({ theme }) => theme.media.lg} {
    position: sticky;
    top: ${({ theme }) => theme.space(8)};
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.space(0.5)};
  }

  p {
    ${type("overline")}
    margin-bottom: ${({ theme }) => theme.space(2)};
    padding-left: ${({ theme }) => theme.space(3)};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const NavItem = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(2)};
  ${type("label")}
  font-weight: 400;
  height: 32px;
  padding-inline: ${({ theme }) => theme.space(3)};
  border: 0;
  border-left: 2px solid
    ${({ theme, $open }) => ($open ? theme.color.lineStrong : theme.color.line)};
  background: none;
  color: ${({ theme, $open }) => ($open ? theme.color.fg : theme.color.fgMuted)};
  text-align: left;
  cursor: pointer;
  transition:
    color ${({ theme }) => theme.motion.fast},
    border-color ${({ theme }) => theme.motion.fast};

  &:hover {
    border-left-color: ${({ theme }) => theme.color.accentLine};
    color: ${({ theme }) => theme.color.fg};
  }
  i {
    flex: none;
    width: 6px;
    height: 6px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.danger};
  }
`;

const Sections = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(3)};
  min-width: 0;
`;

const SectionBody = styled.div`
  max-width: 640px;

  > p.intro {
    ${type("label")}
    font-weight: 400;
    margin-bottom: ${({ theme }) => theme.space(5)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
  > .ant-form-item:last-child {
    margin-bottom: 0;
  }
`;

const Tips = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(1.5)};
  margin: -${({ theme }) => theme.space(2)} 0 ${({ theme }) => theme.space(5)};
  ${type("caption")}
  color: ${({ theme }) => theme.color.fgSubtle};

  li {
    position: relative;
    padding-left: ${({ theme }) => theme.space(3)};
  }
  li::before {
    content: "";
    position: absolute;
    top: 7px;
    left: 0;
    width: 4px;
    height: 4px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.fgFaint};
  }
`;

const Pair = styled.div`
  display: grid;
  gap: 0 ${({ theme }) => theme.space(5)};

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: 1fr 1fr;
  }
`;

const GroupLabel = styled.span`
  .note {
    margin-left: ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.color.warning};
  }
`;

function providerOf(health: Health, ref: string) {
  return health.providers.find(
    (p) => p.models.some((m) => m.ref === ref) || ref.startsWith(`${p.id}:`),
  );
}

function modelOptions(health: Health | undefined, current: string) {
  const options: {
    label: ReactNode;
    title?: string;
    value?: string;
    disabled?: boolean;
    options?: { label: string; value: string; disabled?: boolean }[];
  }[] = [
    {
      value: "",
      label: health
        ? `Server default (${modelLabel(health.defaultModel) || "not set"})`
        : "Server default",
    },
  ];
  let known = current === "";
  for (const provider of health?.providers ?? []) {
    if (provider.models.some((m) => m.ref === current)) known = true;
    options.push({
      label: (
        <GroupLabel>
          <ProviderName provider={provider.id} label={provider.label} />
          {!provider.available && (
            <span className="note">Unavailable{provider.note ? ` · ${provider.note}` : ""}</span>
          )}
        </GroupLabel>
      ),
      title: provider.label,
      options: provider.models.length
        ? provider.models.map((m) => ({
            value: m.ref,
            label: m.label,
            disabled: !provider.available && m.ref !== current,
          }))
        : [{ value: `__none:${provider.id}`, label: "No models listed", disabled: true }],
    });
  }
  if (!known) {
    options.push({
      label: "Currently saved",
      title: "Currently saved",
      options: [{ value: current, label: `${modelLabel(current)} (not in the server's list)` }],
    });
  }
  return options;
}

function durationHint(seconds: number | null | undefined): string {
  if (!seconds || seconds < 60) return "The call is ended politely when this runs out.";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `About ${minutes} min${rest ? ` ${rest} s` : ""}. The call is ended politely when this runs out.`;
}

// A hand-off target is a number in international format or one {{variable}}
// the flow declares. Empty means there is none.
function checkHandoff(value: string | undefined, variables: string[]): Promise<void> {
  const text = (value ?? "").trim();
  if (!text) return Promise.resolve();
  const variable = /^\{\{\s*([a-z][a-z0-9_]*)\s*\}\}$/.exec(text);
  if (variable) {
    return variables.includes(variable[1]!)
      ? Promise.resolve()
      : Promise.reject(new Error(`The flow has no variable called "${variable[1]}"`));
  }
  return PHONE_NUMBER.test(text.replace(/[\s()-]/g, ""))
    ? Promise.resolve()
    : Promise.reject(new Error("Use international format, such as +919876543210, or a {{variable}}"));
}

function ConfigForm({ agent }: { agent: AgentDetail }) {
  const { message } = App.useApp();
  const health = useHealth();
  const credentials = useCredentials(agent.projectId);
  const [form] = Form.useForm<Values>();
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const initial = useMemo(() => fromAgent(agent), [agent]);
  const baseline = fingerprint(initial);
  const values = Form.useWatch([], form) as Partial<Values> | undefined;
  const dirty = values !== undefined && fingerprint(values) !== baseline;

  // When the agent changes elsewhere (another tab saved), follow it, unless
  // there are edits here that would be lost.
  const shown = useRef(baseline);
  useEffect(() => {
    if (shown.current === baseline) return;
    if (fingerprint(form.getFieldsValue(true)) === shown.current) form.setFieldsValue(initial);
    shown.current = baseline;
  }, [baseline, form, initial]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const sections = useSections(`oxumi:sections:${agent.id}:config`, DEFAULT_OPEN);
  const [errors, setErrors] = useState<Partial<Record<SectionId, number>>>({});

  // How many invalid fields each section holds, so a closed one can say so.
  const refreshErrors = useCallback(() => {
    const invalid = new Set(
      form
        .getFieldsError()
        .filter((field) => field.errors.length > 0)
        .map((field) => String(field.name[0])),
    );
    const next: Partial<Record<SectionId, number>> = {};
    for (const section of SECTIONS) {
      const count = section.fields.filter((name) => invalid.has(name)).length;
      if (count) next[section.id] = count;
    }
    setErrors((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
    return next;
  }, [form]);

  const jump = (id: SectionId) => {
    sections.reveal([id]);
    document
      .getElementById(`section-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const reset = () => {
    form.resetFields();
    form.setFieldsValue(initial);
    setErrors({});
    setFailure(null);
  };

  const save = async () => {
    let next: Values;
    try {
      next = await form.validateFields();
    } catch (info) {
      const first = (info as { errorFields?: { name: (string | number)[] }[] }).errorFields?.[0];
      // Open whatever hides a problem, then go to the first one.
      sections.reveal(Object.keys(refreshErrors()));
      if (first)
        setTimeout(() => form.scrollToField(first.name, { block: "center", focus: true }), 320);
      message.error("Fix the highlighted fields before saving.");
      return;
    }
    setSaving(true);
    setFailure(null);
    try {
      const voiceId = next.voiceId.trim();
      // Only the settings change; the rest of the latest flow is kept as it is.
      const { voiceId: _previous, handoff: _handoff, ...settings } = agent.flow.settings;
      void _previous;
      void _handoff;
      const handoff = next.handoff.trim();
      await updateAgent(agent.id, {
        model: next.model,
        speech: next.speech,
        telephony: next.telephony,
        phoneNumber: cleanNumber(next.phoneNumber),
        knowledge: next.knowledge,
        description: next.description.trim(),
        flow: {
          ...agent.flow,
          settings: {
            ...settings,
            persona: next.persona.trim(),
            languages: next.languages,
            maxAttempts: next.maxAttempts,
            maxDurationSec: next.maxDurationSec,
            ...(voiceId ? { voiceId } : {}),
            ...(handoff ? { handoff: { to: handoff } } : {}),
          },
        },
      });
      message.success("Configuration saved");
    } catch (err) {
      const text = err instanceof Error ? err.message : "Could not save the configuration.";
      // A refusal about the number belongs on the number field.
      if (/calling number/i.test(text)) {
        form.setFields([{ name: "phoneNumber", errors: [text] }]);
        sections.reveal(["telephony"]);
        refreshErrors();
      }
      setFailure(text);
      message.error("Configuration was not saved");
    } finally {
      setSaving(false);
    }
  };

  const model = values?.model ?? initial.model;
  const effective = model || health.data?.defaultModel || "";
  const provider = health.data && effective ? providerOf(health.data, effective) : undefined;
  const languages = values?.languages ?? initial.languages;
  const speech = values?.speech ?? initial.speech;
  const integrationsHref = routes.integrations(agent.projectId);
  const phone = describeTelephony(
    health.data,
    credentials.data,
    values?.telephony ?? initial.telephony,
    values?.phoneNumber ?? initial.phoneNumber,
  );

  const variables = agent.flow.variables.map((v) => v.name);
  const title = (id: SectionId) => SECTIONS.find((section) => section.id === id)!.title;
  const current = { ...initial, ...values };
  const clip = (text: string, fallback: string) => {
    const line = text.trim().replace(/\s+/g, " ");
    return line ? (line.length > 90 ? `${line.slice(0, 90)}…` : line) : fallback;
  };
  const minutes = Math.floor((current.maxDurationSec ?? 0) / 60);
  const seconds = (current.maxDurationSec ?? 0) % 60;
  const summary: Record<SectionId, string> = {
    identity: clip(current.description ?? "", "No description"),
    persona: clip(current.persona ?? "", "Not written yet"),
    voice: `${languages.map((code) => LANGUAGE_NAME[code]).join(", ") || "No language"} · ${
      current.voiceId?.trim() ? "custom voice" : "default voice"
    }`,
    telephony: phone.summary,
    model: model
      ? modelLabel(model)
      : `Server default${health.data?.defaultModel ? ` (${modelLabel(health.data.defaultModel)})` : ""}`,
    knowledge: current.knowledge
      ? "Answers side questions from the knowledge base"
      : "Sticks to the flow",
    handoff: current.handoff?.trim()
      ? `Asking for a person transfers to ${current.handoff.trim()}`
      : "Off",
    limits: `${current.maxAttempts ?? "?"} ${current.maxAttempts === 1 ? "attempt" : "attempts"} per step · ${
      minutes ? `${minutes} min` : ""
    }${minutes && seconds ? " " : ""}${seconds || !minutes ? `${seconds} s` : ""} max`,
  };

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark={false}
      initialValues={initial}
      disabled={saving}
      onFinish={save}
      onFieldsChange={refreshErrors}
    >
      <Layout>
        <MiniNav aria-label="Sections">
          <p>On this page</p>
          {SECTIONS.map((section) => (
            <NavItem
              key={section.id}
              type="button"
              $open={sections.open[section.id] ?? false}
              onClick={() => jump(section.id)}
            >
              {section.title}
              {(errors[section.id] ?? 0) > 0 && <i aria-label="Has errors" />}
            </NavItem>
          ))}
        </MiniNav>
      <Sections>
        <Disclosure
          id="identity"
          title={title("identity")}
          summary={summary.identity}
          errors={errors.identity ?? 0}
          open={sections.open.identity ?? false}
          onToggle={() => sections.toggle("identity")}
          data-tour="config-identity"
        >
          <SectionBody>
            <p className="intro">Shown in the agents list so teammates know what this call is for.</p>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ max: 240, message: "Keep the description under 240 characters" }]}
          >
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="Calls a driver mid-trip and records location, schedule and any issue."
              showCount
              maxLength={240}
            />
          </Form.Item>
          </SectionBody>
        </Disclosure>

        <Disclosure
          id="persona"
          title={title("persona")}
          summary={summary.persona}
          errors={errors.persona ?? 0}
          open={sections.open.persona ?? false}
          onToggle={() => sections.toggle("persona")}
          data-tour="config-persona"
        >
          <SectionBody>
            <p className="intro">The standing brief the agent follows on every step of the call. Cover:</p>
            <Tips>
            <li>Who the agent is and on whose behalf it calls</li>
            <li>Who picks up, and what state they are likely in</li>
            <li>Tone and pace: brief, warm, formal, patient</li>
            <li>Anything it must never do or promise</li>
          </Tips>
          <Form.Item
            name="persona"
            label="Persona"
            extra="Write it as instructions to the agent. Keep step-specific wording in the flow."
            rules={[
              { required: true, whitespace: true, message: "Describe who the agent is" },
              { max: 2000, message: "Keep the persona under 2000 characters" },
            ]}
          >
            <Input.TextArea
              autoSize={{ minRows: 5, maxRows: 14 }}
              placeholder="You are a dispatch assistant checking in with a truck driver who is on the road. Drivers are busy and often on noisy highways, so be brief, warm and patient."
            />
          </Form.Item>
          </SectionBody>
        </Disclosure>

        <Disclosure
          id="voice"
          title={title("voice")}
          summary={summary.voice}
          errors={errors.voice ?? 0}
          open={sections.open.voice ?? false}
          onToggle={() => sections.toggle("voice")}
          data-tour="config-voice"
        >
          <SectionBody>
            <p className="intro">The agent opens in the first language and follows the caller into any other that is ticked.</p>
          <Form.Item
            name="languages"
            label="Languages"
            extra={
              languages.length > 1
                ? "Order matters: the call opens in the first language."
                : "With one language, the agent stays in it even if the caller switches."
            }
            rules={[
              {
                validator: (_, list: Language[]) =>
                  list?.length
                    ? Promise.resolve()
                    : Promise.reject(new Error("Choose at least one language")),
              },
            ]}
          >
            <LanguageOrder />
          </Form.Item>
          <Form.Item
            name="speech"
            label="Speech provider"
            extra={
              health.data && !health.data.voice ? (
                <>
                  No speech provider is connected, so only text calls work for now.{" "}
                  <Link href={integrationsHref}>Add a key in Integrations</Link>.
                </>
              ) : (
                "Which service this agent listens and speaks with on voice calls."
              )
            }
          >
            <Select
              options={[
                { value: "", label: "Project default" },
                ...(health.data?.speech ?? []).map((s) => ({
                  value: s.id,
                  label: s.available
                    ? s.label
                    : `${s.label} (Not connected — add a key in Integrations)`,
                  disabled: !s.available && s.id !== speech,
                })),
                ...(speech && health.data && !health.data.speech.some((s) => s.id === speech)
                  ? [{ value: speech, label: `${speech} (no longer offered)` }]
                  : []),
              ]}
              loading={health.isLoading}
            />
          </Form.Item>
          <Form.Item
            name="voiceId"
            label="Voice"
            extra={
              speech === "sarvam"
                ? "Optional. A Sarvam speaker name such as shubh. Leave empty to use the default speaker set in Integrations."
                : speech === "elevenlabs"
                  ? "Optional. An ElevenLabs voice ID. Leave empty to use the default voice set in Integrations."
                  : "Optional. An ElevenLabs voice ID or a Sarvam speaker name, depending on the speech provider. Leave empty to use the default set in Integrations."
            }
            rules={[{ max: 120, message: "That does not look like a voice ID" }]}
          >
            <Input placeholder="Provider default" autoComplete="off" spellCheck={false} allowClear />
          </Form.Item>
          </SectionBody>
        </Disclosure>

        <Disclosure
          id="telephony"
          title={title("telephony")}
          summary={summary.telephony}
          errors={errors.telephony ?? 0}
          open={sections.open.telephony ?? false}
          onToggle={() => sections.toggle("telephony")}
          data-tour="config-telephony"
        >
          <SectionBody>
            <p className="intro">
              How this agent places real phone calls: which provider rings the person, and the
              number they see.
            </p>
            <TelephonySection
              agent={agent}
              health={health.data}
              state={phone}
              telephony={values?.telephony ?? initial.telephony}
              modelReady={Boolean(provider?.available)}
            />
          </SectionBody>
        </Disclosure>

        <Disclosure
          id="model"
          title={title("model")}
          summary={summary.model}
          errors={errors.model ?? 0}
          open={sections.open.model ?? false}
          onToggle={() => sections.toggle("model")}
          data-tour="config-model"
        >
          <SectionBody>
            <p className="intro">The AI model that runs the conversation. Faster models answer sooner; larger ones follow complex flows better.</p>
          <Form.Item
            name="model"
            label="Model"
            extra={
              health.error
                ? "The model list could not be loaded; the saved choice is kept."
                : "Server default follows the platform's default model. Models come from the providers connected in Integrations."
            }
          >
            <Select
              options={modelOptions(health.data, model)}
              loading={health.isLoading}
              showSearch={{ optionFilterProp: "label" }}
              popupMatchSelectWidth
            />
          </Form.Item>
          {provider && !provider.available && (
            <Alert
              type="warning"
              showIcon
              title={
                <>
                  {provider.label} is not connected, so calls with this model will fail.{" "}
                  <Link href={integrationsHref}>Add a {provider.label} key in Integrations</Link> to
                  enable it.
                </>
              }
            />
          )}
          </SectionBody>
        </Disclosure>

        <Disclosure
          id="knowledge"
          title={title("knowledge")}
          summary={summary.knowledge}
          errors={errors.knowledge ?? 0}
          open={sections.open.knowledge ?? false}
          onToggle={() => sections.toggle("knowledge")}
          data-tour="config-knowledge"
        >
          <SectionBody>
            <p className="intro">
              When a caller asks something off the flow, the agent can answer from the project&apos;s
              knowledge base, then carry on.
            </p>
            <Form.Item
              name="knowledge"
              label="Answer side questions from the knowledge base"
              valuePropName="checked"
              extra={
                <>
                  It only uses what is in the knowledge base and says when it does not know.{" "}
                  <Link href={routes.knowledge(agent.projectId)}>Manage the knowledge base</Link>.
                </>
              }
            >
              <Switch />
            </Form.Item>
          </SectionBody>
        </Disclosure>

        <Disclosure
          id="handoff"
          title={title("handoff")}
          summary={summary.handoff}
          errors={errors.handoff ?? 0}
          open={sections.open.handoff ?? false}
          onToggle={() => sections.toggle("handoff")}
          data-tour="config-handoff"
        >
          <SectionBody>
            <p className="intro">
              When this is set, a caller who asks for a person at any point is put through to it.
              Without it, the agent says it will pass the request on and carries on with the call.
            </p>
            <Form.Item
              name="handoff"
              label="Hand-off number"
              extra={
                <>
                  Optional. A number in international format, such as +919876543210, or a
                  variable that holds one
                  {variables.length > 0 &&
                    ` (${variables.map((name) => `{{${name}}}`).join(", ")})`}
                  . Transfers only happen on phone calls; a test call shows what would happen.
                </>
              }
              rules={[{ validator: (_, value: string) => checkHandoff(value, variables) }]}
            >
              <Input
                placeholder="+919876543210"
                autoComplete="off"
                spellCheck={false}
                allowClear
              />
            </Form.Item>
          </SectionBody>
        </Disclosure>

        <Disclosure
          id="limits"
          title={title("limits")}
          summary={summary.limits}
          errors={errors.limits ?? 0}
          open={sections.open.limits ?? false}
          onToggle={() => sections.toggle("limits")}
          data-tour="config-limits"
        >
          <SectionBody>
            <p className="intro">Guard rails that stop a call from looping or running long.</p>
          <Pair>
            <Form.Item
              name="maxAttempts"
              label="Attempts per step"
              extra="How many times a question is asked before moving on. A step can override this."
              rules={[
                { required: true, message: "Enter a number of attempts" },
                { type: "integer", min: 1, max: 10, message: "Use a whole number from 1 to 10" },
              ]}
            >
              <InputNumber min={1} max={10} precision={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="maxDurationSec"
              label="Maximum call duration"
              extra={durationHint(values?.maxDurationSec)}
              rules={[
                { required: true, message: "Enter a duration" },
                {
                  type: "integer",
                  min: 30,
                  max: 3600,
                  message: "Use a whole number of seconds from 30 to 3600",
                },
              ]}
            >
              <InputNumber
                min={30}
                max={3600}
                step={30}
                precision={0}
                suffix="seconds"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Pair>
          </SectionBody>
        </Disclosure>
      </Sections>
      </Layout>

      {failure && (
        <Alert
          style={{ marginTop: 16 }}
          type="error"
          showIcon
          closable
          onClose={() => setFailure(null)}
          title="Configuration was not saved"
          description={failure}
        />
      )}
      <SaveBar dirty={dirty} saving={saving} onReset={reset} onSave={save} />
    </Form>
  );
}

export default function AgentConfigPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const agent = useAgent(agentId);
  usePageGuide(GUIDE);

  return (
    <Page>
      {agent.data ? (
        <>
          <PageHeader
            title="Configuration"
            description="How this agent behaves on every call, whatever the flow."
          />
          <ConfigForm agent={agent.data} />
        </>
      ) : agent.error ? (
        <LoadError
          title="Configuration could not be loaded"
          error={agent.error}
          onRetry={() => agent.mutate()}
        />
      ) : (
        <PageSkeleton panels={1} rows={10} />
      )}
    </Page>
  );
}
