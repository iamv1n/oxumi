"use client";

import {
  DeleteOutlined,
  ExclamationCircleFilled,
  PlusOutlined,
  WarningFilled,
} from "@ant-design/icons";
import type { Field } from "@oxumi/flow-core";
import { Alert, App, Button, Checkbox, Input, Popover, Select, Tooltip } from "antd";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Disclosure, useSections } from "@/components/app/agents/Disclosure";
import { SaveBar } from "@/components/app/agents/SaveBar";
import {
  dataIssues,
  fieldUsage,
  IDENT,
  toIdent,
  type Usage,
  USAGE_VERB,
  variableUsage,
} from "@/components/app/agents/usage";
import { NODE_KIND } from "@/components/app/kit";
import { type } from "@oxumi/ui/design/typography";
import { type AgentDetail, updateAgent } from "@/lib/api";

type FieldType = Field["type"];

interface VariableRow {
  key: string;
  // The saved name, or null for a row added in this session.
  original: string | null;
  name: string;
  description: string;
  example: string;
}
interface FieldRow {
  key: string;
  original: string | null;
  name: string;
  type: FieldType;
  description: string;
  required: boolean;
  options: string[];
}
interface Draft {
  base: string;
  variables: VariableRow[];
  fields: FieldRow[];
}

const TYPES: { value: FieldType; label: string; hint: string }[] = [
  { value: "string", label: "Text", hint: "Free text, as the person said it" },
  { value: "number", label: "Number", hint: "A quantity or amount" },
  { value: "boolean", label: "Yes / No", hint: "A yes-or-no answer" },
  { value: "enum", label: "Choice", hint: "One of a fixed list of options" },
];

let seq = 0;
const uid = () => `row-${++seq}`;

// The saved shape of each list, used both to save and to detect changes.
const cleanVariables = (rows: Pick<VariableRow, "name" | "description" | "example">[]) =>
  rows.map((row) => ({
    name: row.name.trim(),
    description: row.description.trim(),
    ...(row.example.trim() ? { example: row.example.trim() } : {}),
  }));
const cleanFields = (
  rows: Pick<FieldRow, "name" | "type" | "description" | "required" | "options">[],
) =>
  rows.map((row) => ({
    name: row.name.trim(),
    type: row.type,
    description: row.description.trim(),
    ...(row.type === "enum" ? { options: row.options } : {}),
    required: row.required,
  }));

function fromAgent(agent: AgentDetail): Omit<Draft, "base"> {
  return {
    variables: (agent.flow.variables ?? []).map((v) => ({
      key: uid(),
      original: v.name,
      name: v.name,
      description: v.description ?? "",
      example: v.example ?? "",
    })),
    fields: (agent.flow.fields ?? []).map((f) => ({
      key: uid(),
      original: f.name,
      name: f.name,
      type: f.type,
      description: f.description ?? "",
      required: f.required ?? true,
      options: f.options ?? [],
    })),
  };
}

const fingerprint = (draft: Pick<Draft, "variables" | "fields">) =>
  JSON.stringify([cleanVariables(draft.variables), cleanFields(draft.fields)]);

function nameError(name: string, all: string[], other: string[], kind: string): string | null {
  const value = name.trim();
  if (!value) return "Name is required";
  if (!IDENT.test(value)) return "Use lower_snake_case, starting with a letter";
  if (all.filter((n) => n.trim() === value).length > 1) return `Another ${kind} has this name`;
  if (other.some((n) => n.trim() === value))
    return kind === "field" ? "A variable has this name" : "A field has this name";
  return null;
}

// ---- Layout ---------------------------------------------------------------

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(6)};
`;

const Intro = styled.p`
  ${type("label")}
  font-weight: 400;
  max-width: 46rem;
  padding: ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(6)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.fgMuted};
  max-width: none;

  code {
    ${type("code")}
    font-size: 0.75rem;
    padding: 0 ${({ theme }) => theme.space(1)};
    border-radius: 4px;
    background: ${({ theme }) => theme.color.hover};
    color: ${({ theme }) => theme.color.fg};
  }
`;

const VARIABLE_COLUMNS = "minmax(0, 200px) minmax(0, 1fr) minmax(0, 220px) 104px 32px";
const FIELD_COLUMNS = "minmax(0, 200px) 128px minmax(0, 1fr) 92px 104px 32px";

const Labels = styled.div<{ $columns: string }>`
  display: none;

  ${({ theme }) => theme.media.md} {
    display: grid;
    grid-template-columns: ${({ $columns }) => $columns};
    gap: ${({ theme }) => theme.space(3)};
    padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(6)};
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
    ${type("caption")}
    font-weight: 500;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Row = styled.li<{ $columns: string }>`
  display: grid;
  /* Narrow: inputs stack; the small controls share the last line. */
  grid-template-columns: auto 1fr auto;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(6)};

  .cell {
    grid-column: 1 / -1;
  }
  .cell.center {
    grid-column: auto;
  }
  .cell.end {
    grid-column: -2 / -1;
  }

  & + & {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
  ${({ theme }) => theme.media.md} {
    grid-template-columns: ${({ $columns }) => $columns};
    align-items: start;
    padding-block: ${({ theme }) => theme.space(3)};

    .cell,
    .cell.center,
    .cell.end {
      grid-column: auto;
    }
  }

  .ident input,
  input.ident {
    font-family: ${({ theme }) => theme.font.mono};
    font-size: ${({ theme }) => theme.text.code.size};
  }
  .cell {
    min-width: 0;
  }
  .center {
    display: flex;
    align-items: center;
    min-height: 36px;
  }
  .end {
    justify-content: flex-end;
  }
  .options {
    margin-top: ${({ theme }) => theme.space(2)};
  }
  /* On narrow screens each control carries its own label. */
  .cell > label.mobile {
    display: block;
    margin-bottom: ${({ theme }) => theme.space(1)};
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  ${({ theme }) => theme.media.md} {
    .cell > label.mobile,
    .mobile-only {
      display: none;
    }
  }
`;

const TypeOption = styled.div`
  display: flex;
  flex-direction: column;
  padding-block: ${({ theme }) => theme.space(0.5)};

  small {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
    white-space: normal;
  }
`;

const Hint = styled.p<{ $tone: "error" | "warning" }>`
  ${type("caption")}
  margin-top: ${({ theme }) => theme.space(1)};
  color: ${({ theme, $tone }) => ($tone === "error" ? theme.color.danger : theme.color.warning)};
`;

const EmptyRow = styled.div`
  padding: ${({ theme }) => theme.space(8)} ${({ theme }) => theme.space(6)};
  text-align: center;

  strong {
    ${type("label")}
    display: block;
    color: ${({ theme }) => theme.color.fg};
  }
  p {
    ${type("label")}
    font-weight: 400;
    max-width: 30rem;
    margin: ${({ theme }) => theme.space(1)} auto ${({ theme }) => theme.space(4)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const UsageChip = styled.button<{ $tone: "used" | "unused" | "new" }>`
  ${type("caption")}
  padding: ${({ theme }) => theme.space(0.5)} ${({ theme }) => theme.space(2)};
  border: 1px solid
    ${({ theme, $tone }) => ($tone === "used" ? theme.color.lineStrong : "transparent")};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: none;
  color: ${({ theme, $tone }) =>
    $tone === "used"
      ? theme.color.fg
      : $tone === "new"
        ? theme.color.accentText
        : theme.color.fgSubtle};
  cursor: ${({ $tone }) => ($tone === "used" ? "pointer" : "default")};
  white-space: nowrap;

  &:hover {
    border-color: ${({ theme, $tone }) => ($tone === "used" ? theme.color.fgSubtle : "transparent")};
  }
`;

const UsageList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
  min-width: 220px;

  li {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(2)};
    ${type("label")}
    font-weight: 400;
  }
  code {
    ${type("code")}
    color: ${({ theme }) => theme.color.fg};
  }
  .how {
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const KindIcon = styled.span<{ $color: string }>`
  display: inline-grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  color: ${({ $color }) => $color};
  font-size: 13px;
`;

const IssueList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(1.5)};

  li {
    display: flex;
    gap: ${({ theme }) => theme.space(2)};
  }
  .anticon {
    margin-top: 4px;
  }
  .error {
    color: ${({ theme }) => theme.color.danger};
  }
  .warning {
    color: ${({ theme }) => theme.color.warning};
  }
`;

function UsageSteps({ usages }: { usages: Usage[] }) {
  return (
    <UsageList>
      {usages.map((usage) => {
        const kind = NODE_KIND[usage.kind];
        return (
          <li key={`${usage.nodeId}-${usage.how}`}>
            <KindIcon $color={kind.color} title={kind.label}>
              {kind.icon}
            </KindIcon>
            <code>{usage.nodeId}</code>
            <span className="how">{USAGE_VERB[usage.how]}</span>
          </li>
        );
      })}
    </UsageList>
  );
}

function UsageCell({
  original,
  usages,
  unusedLabel,
  unusedHint,
}: {
  original: string | null;
  usages: Usage[];
  unusedLabel: string;
  unusedHint: string;
}) {
  if (original === null)
    return (
      <Tooltip title="Added here; not saved yet">
        <UsageChip as="span" $tone="new">
          New
        </UsageChip>
      </Tooltip>
    );
  if (usages.length === 0)
    return (
      <Tooltip title={unusedHint}>
        <UsageChip as="span" $tone="unused" tabIndex={0}>
          {unusedLabel}
        </UsageChip>
      </Tooltip>
    );
  const steps = new Set(usages.map((u) => u.nodeId)).size;
  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      title={`Used by ${steps} ${steps === 1 ? "step" : "steps"} in the flow`}
      content={<UsageSteps usages={usages} />}
    >
      <UsageChip type="button" $tone="used">
        {steps} {steps === 1 ? "step" : "steps"}
      </UsageChip>
    </Popover>
  );
}

function Cell({
  label,
  className,
  tour,
  children,
}: {
  label?: string;
  className?: string;
  tour?: string;
  children: ReactNode;
}) {
  return (
    <div className={`cell ${className ?? ""}`} data-tour={tour}>
      {label && <label className="mobile">{label}</label>}
      {children}
    </div>
  );
}

// ---- Editor ---------------------------------------------------------------

export function DataEditor({ agent }: { agent: AgentDetail }) {
  const { message, modal } = App.useApp();
  const saved = useMemo(() => fingerprint(fromAgent(agent)), [agent]);
  const [draft, setDraft] = useState<Draft>(() => ({ base: saved, ...fromAgent(agent) }));
  const [saving, setSaving] = useState(false);
  const [strict, setStrict] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const sections = useSections(`oxumi:sections:${agent.id}:data`, {
    variables: true,
    fields: true,
  });

  // The agent changed elsewhere: follow it, unless edits here would be lost.
  if (draft.base !== saved) {
    const edited = fingerprint(draft) !== draft.base;
    setDraft(edited ? { ...draft, base: saved } : { base: saved, ...fromAgent(agent) });
  }

  const dirty = fingerprint(draft) !== saved;
  const usedFields = useMemo(() => fieldUsage(agent.flow), [agent.flow]);
  const usedVariables = useMemo(() => variableUsage(agent.flow), [agent.flow]);
  const issues = useMemo(() => dataIssues(agent.issues), [agent.issues]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const variableNames = draft.variables.map((v) => v.name);
  const fieldNames = draft.fields.map((f) => f.name);

  const patchVariable = (key: string, patch: Partial<VariableRow>) =>
    setDraft((d) => ({
      ...d,
      variables: d.variables.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    }));
  const patchField = (key: string, patch: Partial<FieldRow>) =>
    setDraft((d) => ({
      ...d,
      fields: d.fields.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    }));

  const focusLast = (list: string) =>
    setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>(`[data-list="${list}"] input.ident`);
      inputs[inputs.length - 1]?.focus();
    }, 60);

  const addVariable = () => {
    sections.reveal(["variables"]);
    setDraft((d) => ({
      ...d,
      variables: [
        ...d.variables,
        { key: uid(), original: null, name: "", description: "", example: "" },
      ],
    }));
    focusLast("variables");
  };
  const addField = () => {
    sections.reveal(["fields"]);
    setDraft((d) => ({
      ...d,
      fields: [
        ...d.fields,
        {
          key: uid(),
          original: null,
          name: "",
          type: "string",
          description: "",
          required: true,
          options: [],
        },
      ],
    }));
    focusLast("fields");
  };

  // Deleting something the flow still uses needs a second look.
  const confirmRemove = (
    kind: "field" | "variable",
    original: string | null,
    usages: Usage[],
    remove: () => void,
  ) => {
    if (original === null || usages.length === 0) return remove();
    modal.confirm({
      title: `"${original}" is still used in the flow`,
      icon: <ExclamationCircleFilled />,
      content: (
        <>
          <p style={{ marginBottom: 12 }}>
            {kind === "field"
              ? "These steps will point at a field that no longer exists, and the agent will stop taking calls until they are fixed in the Flow tab."
              : "These steps will mention a variable that no longer exists, and the agent will stop taking calls until they are fixed in the Flow tab."}
          </p>
          <UsageSteps usages={usages} />
        </>
      ),
      okText: `Remove ${kind}`,
      okButtonProps: { danger: true },
      cancelText: "Keep it",
      focusable: { autoFocusButton: "cancel" },
      onOk: remove,
    });
  };

  const variableErrors = draft.variables.map((row) =>
    nameError(row.name, variableNames, fieldNames, "variable"),
  );
  const fieldErrors = draft.fields.map((row) => ({
    name: nameError(row.name, fieldNames, variableNames, "field"),
    description: row.description.trim() ? null : "Say what to collect",
    options: row.type === "enum" && row.options.length === 0 ? "Add at least one option" : null,
  }));
  const invalid =
    draft.fields.length === 0 ||
    variableErrors.some(Boolean) ||
    fieldErrors.some((e) => e.name || e.description || e.options);

  // Problems currently shown in each list (a blank new row stays quiet until
  // a save is attempted), so a closed section can report them.
  const variableProblems = draft.variables.filter(
    (row, i) => variableErrors[i] && (strict || row.name.trim() !== ""),
  ).length;
  const fieldProblems =
    draft.fields.filter((row, i) => {
      const e = fieldErrors[i]!;
      return (e.name && (strict || row.name.trim() !== "")) || (strict && (e.description || e.options));
    }).length + (strict && draft.fields.length === 0 ? 1 : 0);
  const names = (list: string[], none: string) => {
    const shown = list.map((name) => name.trim()).filter(Boolean);
    return shown.length ? shown.join(", ") : none;
  };

  // Saved names the flow uses that this draft removes or renames.
  const broken = [
    ...[...usedFields].map(([name, usages]) => ({ kind: "field" as const, name, usages })),
    ...[...usedVariables].map(([name, usages]) => ({ kind: "variable" as const, name, usages })),
  ].filter(({ kind, name }) => {
    const rows = kind === "field" ? draft.fields : draft.variables;
    const wasSaved = (kind === "field" ? agent.flow.fields : agent.flow.variables)?.some(
      (item) => item.name === name,
    );
    return wasSaved && !rows.some((row) => row.name.trim() === name);
  });

  const persist = async () => {
    setSaving(true);
    setFailure(null);
    try {
      const next = await updateAgent(agent.id, {
        // Only variables and fields change; the rest of the latest flow is kept.
        flow: {
          ...agent.flow,
          variables: cleanVariables(draft.variables),
          fields: cleanFields(draft.fields),
        },
      });
      setDraft({ base: fingerprint(fromAgent(next)), ...fromAgent(next) });
      setStrict(false);
      message.success("Variables and fields saved");
    } catch (err) {
      setFailure(err instanceof Error ? err.message : "Could not save the data definition.");
      message.error("Changes were not saved");
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    if (invalid) {
      setStrict(true);
      sections.reveal([
        ...(variableErrors.some(Boolean) ? ["variables"] : []),
        ...(draft.fields.length === 0 || fieldErrors.some((e) => e.name || e.description || e.options)
          ? ["fields"]
          : []),
      ]);
      message.error(
        draft.fields.length === 0
          ? "An agent needs at least one field to collect."
          : "Fix the highlighted rows before saving.",
      );
      return;
    }
    if (broken.length === 0) return void persist();
    modal.confirm({
      title: "Save changes that break the flow?",
      icon: <ExclamationCircleFilled />,
      width: 480,
      content: (
        <>
          <p style={{ marginBottom: 12 }}>
            The flow still refers to {broken.length === 1 ? "a name" : "names"} you removed or
            renamed. The agent will need attention in the Flow tab before it can take calls.
          </p>
          {broken.map(({ kind, name, usages }) => (
            <div key={`${kind}-${name}`} style={{ marginBottom: 12 }}>
              <p style={{ marginBottom: 6 }}>
                {kind === "field" ? "Field" : "Variable"} <b>{name}</b>
              </p>
              <UsageSteps usages={usages} />
            </div>
          ))}
        </>
      ),
      okText: "Save anyway",
      okButtonProps: { danger: true },
      cancelText: "Go back",
      focusable: { autoFocusButton: "cancel" },
      onOk: persist,
    });
  };

  const reset = () => {
    setDraft({ base: saved, ...fromAgent(agent) });
    setStrict(false);
    setFailure(null);
  };

  // An empty new row stays quiet until a save is attempted.
  const show = (error: string | null, value: string) =>
    error && (strict || value.trim() !== "") ? error : null;

  return (
    <>
      <Stack>
        {issues.length > 0 && (
          <Alert
            type={issues.some((i) => i.level === "error") ? "error" : "warning"}
            title={
              issues.some((i) => i.level === "error")
                ? "The saved flow has data problems"
                : "Worth a look"
            }
            description={
              <IssueList>
                {issues.map((issue, i) => (
                  <li key={i}>
                    {issue.level === "error" ? (
                      <ExclamationCircleFilled className="error" />
                    ) : (
                      <WarningFilled className="warning" />
                    )}
                    <span>{issue.message}</span>
                  </li>
                ))}
              </IssueList>
            }
          />
        )}

        <Disclosure
          id="variables"
          title="Variables"
          count={draft.variables.length}
          summary={names(variableNames, "None yet")}
          errors={variableProblems}
          open={sections.open.variables ?? true}
          onToggle={() => sections.toggle("variables")}
          flush
          data-tour="data-variables"
          actions={
            <Button size="small" icon={<PlusOutlined />} onClick={addVariable} disabled={saving}>
              Add variable
            </Button>
          }
        >
          <div data-list="variables">
          <Intro>
            What is known before the call starts. Supply a value per call and write{" "}
            <code>{"{{name}}"}</code> in a step to have the agent say it.
          </Intro>
          {draft.variables.length === 0 ? (
            <EmptyRow>
              <strong>No variables</strong>
              <p>
                Every call will sound the same. Add one for anything that differs per person, such
                as a name, a route or an appointment time.
              </p>
            </EmptyRow>
          ) : (
            <>
              <Labels $columns={VARIABLE_COLUMNS} aria-hidden>
                <span>Name</span>
                <span>Description</span>
                <span>Example value</span>
                <span>In flow</span>
                <span />
              </Labels>
              <ul>
                {draft.variables.map((row, i) => {
                  const error = show(variableErrors[i] ?? null, row.name);
                  const usages = row.original ? (usedVariables.get(row.original) ?? []) : [];
                  const renamed =
                    row.original !== null && usages.length > 0 && row.name.trim() !== row.original;
                  return (
                    <Row key={row.key} $columns={VARIABLE_COLUMNS}>
                      <Cell label="Name">
                        <Input
                          className="ident"
                          value={row.name}
                          status={error ? "error" : renamed ? "warning" : undefined}
                          placeholder="driver_name"
                          aria-label="Variable name"
                          aria-invalid={Boolean(error)}
                          autoComplete="off"
                          spellCheck={false}
                          disabled={saving}
                          onChange={(e) => patchVariable(row.key, { name: toIdent(e.target.value) })}
                        />
                        {error ? (
                          <Hint $tone="error">{error}</Hint>
                        ) : (
                          renamed && (
                            <Hint $tone="warning">
                              The flow still says {`{{${row.original}}}`}
                            </Hint>
                          )
                        )}
                      </Cell>
                      <Cell label="Description">
                        <Input
                          value={row.description}
                          placeholder="What this value is"
                          aria-label={`Description of ${row.name || "variable"}`}
                          disabled={saving}
                          onChange={(e) => patchVariable(row.key, { description: e.target.value })}
                        />
                      </Cell>
                      <Cell label="Example value">
                        <Input
                          value={row.example}
                          placeholder="Ramesh"
                          aria-label={`Example for ${row.name || "variable"}`}
                          disabled={saving}
                          onChange={(e) => patchVariable(row.key, { example: e.target.value })}
                        />
                      </Cell>
                      <Cell className="center" tour={i === 0 ? "data-usage" : undefined}>
                        <UsageCell
                          original={row.original}
                          usages={usages}
                          unusedLabel="Not used"
                          unusedHint="No step mentions this variable yet"
                        />
                      </Cell>
                      <Cell className="center end">
                        <Tooltip title="Remove variable">
                          <Button
                            type="text"
                            icon={<DeleteOutlined />}
                            aria-label={`Remove variable ${row.name}`}
                            disabled={saving}
                            onClick={() =>
                              confirmRemove("variable", row.original, usages, () =>
                                setDraft((d) => ({
                                  ...d,
                                  variables: d.variables.filter((v) => v.key !== row.key),
                                })),
                              )
                            }
                          />
                        </Tooltip>
                      </Cell>
                    </Row>
                  );
                })}
              </ul>
            </>
          )}
          </div>
        </Disclosure>

        <Disclosure
          id="fields"
          title="Fields"
          count={draft.fields.length}
          summary={names(fieldNames, "None yet")}
          errors={fieldProblems}
          open={sections.open.fields ?? true}
          onToggle={() => sections.toggle("fields")}
          flush
          data-tour="data-fields"
          actions={
            <Button size="small" icon={<PlusOutlined />} onClick={addField} disabled={saving}>
              Add field
            </Button>
          }
        >
          <div data-list="fields">
          <Intro>
            The answers each call must bring back. Ask steps collect them, branch steps route on
            them, and the description tells the agent exactly what counts as an answer.
          </Intro>
          {draft.fields.length === 0 ? (
            <EmptyRow>
              <strong>No fields</strong>
              <p>
                A call with nothing to collect has no result. Add at least one field before
                saving.
              </p>
              <Button type="primary" icon={<PlusOutlined />} onClick={addField}>
                Add field
              </Button>
            </EmptyRow>
          ) : (
            <>
              <Labels $columns={FIELD_COLUMNS} aria-hidden>
                <span>Name</span>
                <span>Type</span>
                <span>What to collect</span>
                <span>Required</span>
                <span>In flow</span>
                <span />
              </Labels>
              <ul>
                {draft.fields.map((row, i) => {
                  const errors = fieldErrors[i]!;
                  const error = show(errors.name, row.name);
                  const usages = row.original ? (usedFields.get(row.original) ?? []) : [];
                  const renamed =
                    row.original !== null && usages.length > 0 && row.name.trim() !== row.original;
                  return (
                    <Row key={row.key} $columns={FIELD_COLUMNS}>
                      <Cell label="Name">
                        <Input
                          className="ident"
                          value={row.name}
                          status={error ? "error" : renamed ? "warning" : undefined}
                          placeholder="current_location"
                          aria-label="Field name"
                          aria-invalid={Boolean(error)}
                          autoComplete="off"
                          spellCheck={false}
                          disabled={saving}
                          onChange={(e) => patchField(row.key, { name: toIdent(e.target.value) })}
                        />
                        {error ? (
                          <Hint $tone="error">{error}</Hint>
                        ) : (
                          renamed && (
                            <Hint $tone="warning">The flow still uses {row.original}</Hint>
                          )
                        )}
                      </Cell>
                      <Cell label="Type">
                        <Select<FieldType>
                          data-tour={i === 0 ? "data-type" : undefined}
                          value={row.type}
                          style={{ width: "100%" }}
                          aria-label={`Type of ${row.name || "field"}`}
                          disabled={saving}
                          popupMatchSelectWidth={260}
                          optionLabelProp="label"
                          options={TYPES.map((t) => ({
                            value: t.value,
                            label: t.label,
                            hint: t.hint,
                          }))}
                          optionRender={(option) => (
                            <TypeOption>
                              <span>{option.label}</span>
                              <small>{(option.data as { hint: string }).hint}</small>
                            </TypeOption>
                          )}
                          onChange={(value) => patchField(row.key, { type: value })}
                        />
                      </Cell>
                      <Cell label="What to collect">
                        <Input
                          value={row.description}
                          status={strict && errors.description ? "error" : undefined}
                          placeholder="Where the truck is right now: a city, town or landmark"
                          aria-label={`Description of ${row.name || "field"}`}
                          disabled={saving}
                          onChange={(e) => patchField(row.key, { description: e.target.value })}
                        />
                        {strict && errors.description && (
                          <Hint $tone="error">{errors.description}</Hint>
                        )}
                        {row.type === "enum" && (
                          <div className="options">
                            <Select
                              mode="tags"
                              value={row.options}
                              style={{ width: "100%" }}
                              status={strict && errors.options ? "error" : undefined}
                              placeholder="Options: type one and press Enter"
                              aria-label={`Options for ${row.name || "field"}`}
                              tokenSeparators={[","]}
                              open={false}
                              suffixIcon={null}
                              disabled={saving}
                              onChange={(values: string[]) =>
                                patchField(row.key, {
                                  options: [
                                    ...new Set(values.map((v) => v.trim()).filter(Boolean)),
                                  ],
                                })
                              }
                            />
                            {strict && errors.options && (
                              <Hint $tone="error">{errors.options}</Hint>
                            )}
                          </div>
                        )}
                      </Cell>
                      <Cell className="center">
                        <Checkbox
                          checked={row.required}
                          disabled={saving}
                          onChange={(e) => patchField(row.key, { required: e.target.checked })}
                        >
                          <span className="mobile-only">Required</span>
                        </Checkbox>
                      </Cell>
                      <Cell className="center">
                        <UsageCell
                          original={row.original}
                          usages={usages}
                          unusedLabel="Not asked"
                          unusedHint="No ask step collects this field yet"
                        />
                      </Cell>
                      <Cell className="center end">
                        <Tooltip title="Remove field">
                          <Button
                            type="text"
                            icon={<DeleteOutlined />}
                            aria-label={`Remove field ${row.name}`}
                            disabled={saving}
                            onClick={() =>
                              confirmRemove("field", row.original, usages, () =>
                                setDraft((d) => ({
                                  ...d,
                                  fields: d.fields.filter((f) => f.key !== row.key),
                                })),
                              )
                            }
                          />
                        </Tooltip>
                      </Cell>
                    </Row>
                  );
                })}
              </ul>
            </>
          )}
          </div>
        </Disclosure>
      </Stack>

      {failure && (
        <Alert
          style={{ marginTop: 16 }}
          type="error"
          showIcon
          closable
          onClose={() => setFailure(null)}
          title="Changes were not saved"
          description={failure}
        />
      )}
      <SaveBar
        dirty={dirty}
        saving={saving}
        onReset={reset}
        onSave={save}
        note={
          dirty && broken.length > 0
            ? `Unsaved changes · ${broken.length} ${broken.length === 1 ? "change breaks" : "changes break"} the flow`
            : undefined
        }
      />
    </>
  );
}
