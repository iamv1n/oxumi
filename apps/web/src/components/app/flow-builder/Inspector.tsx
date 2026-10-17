"use client";

import {
  ArrowDownOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  CheckCircleFilled,
  CloseOutlined,
  DeleteOutlined,
  ExclamationCircleFilled,
  PlusOutlined,
  RightOutlined,
  WarningFilled,
} from "@ant-design/icons";
import {
  type Condition,
  type Field,
  type FlowNode,
  OUTCOMES,
  type Outcome,
  PHONE_NUMBER,
} from "@oxumi/flow-core";
import { Button, Input, InputNumber, Popconfirm, Segmented, Select, Tooltip } from "antd";
import type { TextAreaRef } from "antd/es/input/TextArea";
import { type ReactNode, useId, useRef, useState } from "react";
import styled from "styled-components";
import { NODE_KIND, Overline } from "@/components/app/kit";
import { font } from "@oxumi/ui/design/tokens";
import { type } from "@oxumi/ui/design/typography";
import {
  defaultCondition,
  defaultValue,
  type Doc,
  type NodeIssue,
  OP_LABEL,
  OUTCOME_LABEL,
  renameError,
  updateNode,
} from "./model";

export interface Link {
  source: string;
  handle: string;
  target: string;
  label?: string;
}
type Apply = (fn: (doc: Doc) => Doc, key?: string) => void;
type Variable = { name: string; description: string; example?: string };
type Narrow<K extends FlowNode["type"]> = Extract<FlowNode, { type: K }>;

// ---- Layout ---------------------------------------------------------------

const PANEL_WIDTH = "320px";

// The slot animates between the panel's width and nothing; the panel inside
// keeps its width so its content does not reflow on the way.
const Slot = styled.div<{ $open: boolean }>`
  width: ${({ $open }) => ($open ? PANEL_WIDTH : "0px")};
  min-height: 0;
  overflow: hidden;
  transition: width ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
`;

const Aside = styled.aside`
  display: flex;
  flex-direction: column;
  width: ${PANEL_WIDTH};
  height: 100%;
  min-height: 0;
  border-left: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
`;

const SectionBox = styled.section`
  display: flex;
  flex-direction: column;
  margin: 0 -${({ theme }) => theme.space(4)};
  border-top: 1px solid ${({ theme }) => theme.color.line};

  > button {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(2)};
    width: 100%;
    padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
    border: 0;
    background: none;
    color: ${({ theme }) => theme.color.fg};
    ${type("label")}
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }
  > button:hover {
    background: ${({ theme }) => theme.color.hover};
  }
  > button .anticon {
    font-size: 10px;
    color: ${({ theme }) => theme.color.fgSubtle};
    transition: transform ${({ theme }) => theme.motion.fast};
  }
  > button[aria-expanded="true"] .anticon {
    transform: rotate(90deg);
  }
  > button small {
    flex: 1;
    min-width: 0;
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  > div {
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.space(4)};
    padding: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(4)}
      ${({ theme }) => theme.space(4)};
  }
`;

const Sections = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: -${({ theme }) => theme.space(4)};
`;

// Which sections are folded, shared by every step of the same kind.
type Folds = { closed: Record<string, boolean>; toggle: (key: string) => void };

function Section({
  id,
  title,
  summary,
  folds,
  children,
}: {
  id: string;
  title: string;
  // Shown beside the title while the section is folded.
  summary?: string;
  folds: Folds;
  children: ReactNode;
}) {
  const open = !folds.closed[id];
  const bodyId = useId();
  return (
    <SectionBox>
      <button type="button" aria-expanded={open} aria-controls={bodyId} onClick={() => folds.toggle(id)}>
        <RightOutlined />
        {title}
        {!open && summary && <small>{summary}</small>}
      </button>
      {open && <div id={bodyId}>{children}</div>}
    </SectionBox>
  );
}

const Head = styled.header<{ $tone?: string }>`
  --tone: ${({ $tone, theme }) => $tone ?? theme.color.fgMuted};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(4)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};

  .icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: ${({ theme }) => theme.radius.control};
    background: color-mix(in srgb, var(--tone) 16%, transparent);
    color: var(--tone);
    font-size: 18px;
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  h2 {
    ${type("heading")}
    color: ${({ theme }) => theme.color.fg};
  }
  p {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Scroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(5)};
  padding: ${({ theme }) => theme.space(4)};
`;

const Foot = styled.footer`
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  border-top: 1px solid ${({ theme }) => theme.color.line};
  ${type("caption")}
  color: ${({ theme }) => theme.color.fgSubtle};
`;

const FieldBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(1.5)};

  label,
  .label {
    ${type("label")}
    color: ${({ theme }) => theme.color.fg};
  }
  /* A label the section title already shows: kept for screen readers. */
  label.quiet {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .hint {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  .error {
    ${type("caption")}
    color: ${({ theme }) => theme.color.danger};
  }
  .ant-select,
  .ant-input-number {
    width: 100%;
  }
`;

const Inserts = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  ${type("caption")}
  color: ${({ theme }) => theme.color.fgSubtle};

  button {
    ${type("code")}
    font-size: 0.75rem;
    line-height: 1.25rem;
    padding: 0 ${({ theme }) => theme.space(1.5)};
    border: 1px solid ${({ theme }) => theme.color.lineStrong};
    border-radius: calc(${({ theme }) => theme.radius.control} / 2);
    background: ${({ theme }) => theme.color.raised};
    color: ${({ theme }) => theme.color.accentText};
    cursor: pointer;
    transition: border-color ${({ theme }) => theme.motion.fast};

    &:hover {
      border-color: ${({ theme }) => theme.color.accentLine};
    }
  }
`;

const IssueList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(1.5)};
`;

const IssueRow = styled.li<{ $level: "error" | "warning" }>`
  --mark: ${({ theme, $level }) =>
    $level === "error" ? theme.color.danger : theme.color.warning};

  > * {
    display: flex;
    align-items: flex-start;
    gap: ${({ theme }) => theme.space(2)};
    width: 100%;
    padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(2.5)};
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: ${({ theme }) => theme.radius.control};
    background: ${({ theme, $level }) =>
      $level === "error" ? theme.color.dangerSoft : theme.color.warningSoft};
    color: ${({ theme }) => theme.color.fg};
    ${type("label")}
    font-weight: 400;
    text-align: left;
  }
  button {
    cursor: pointer;
    transition: border-color ${({ theme }) => theme.motion.fast};
    &:hover {
      border-color: var(--mark);
    }
  }
  .anticon {
    flex: none;
    margin-top: 3px;
    color: var(--mark);
  }
`;

const Summary = styled.ul`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space(2)};

  li {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(2.5)};
    padding: ${({ theme }) => theme.space(2.5)};
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: ${({ theme }) => theme.radius.control};
    background: ${({ theme }) => theme.color.raised};
  }
  .icon {
    font-size: 16px;
  }
  small {
    display: block;
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  strong {
    ${type("label")}
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.color.fg};
  }
`;

const AllClear = styled.p`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(2.5)};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => theme.color.successSoft};
  color: ${({ theme }) => theme.color.success};
  ${type("label")}
`;

const Rule = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(3)};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => theme.color.raised};

  .top {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(1)};
  }
  .top strong {
    flex: 1;
    ${type("overline")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  .pair {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
    gap: ${({ theme }) => theme.space(2)};
  }
  .go {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: ${({ theme }) => theme.space(2)};
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  .ant-select,
  .ant-input-number,
  .ant-segmented {
    width: 100%;
  }
`;

const Route = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  color: ${({ theme }) => theme.color.fgSubtle};

  button {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(2.5)};
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: ${({ theme }) => theme.radius.control};
    background: ${({ theme }) => theme.color.raised};
    color: ${({ theme }) => theme.color.fg};
    text-align: left;
    cursor: pointer;
    transition: border-color ${({ theme }) => theme.motion.fast};

    &:hover {
      border-color: ${({ theme }) => theme.color.lineStrong};
    }
  }
  small {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  code {
    ${type("code")}
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  em {
    grid-column: 1 / -1;
    ${type("caption")}
    font-style: normal;
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const Rules = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
`;

const OptionRow = styled.span<{ $tone?: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  max-width: 100%;

  .anticon {
    color: ${({ $tone }) => $tone ?? "inherit"};
  }
  code {
    ${type("code")}
    overflow: hidden;
    text-overflow: ellipsis;
  }
  small {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

function Labeled({
  label,
  quiet,
  hint,
  error,
  children,
}: {
  label: string;
  // Hide the label visually when a section title already says it.
  quiet?: boolean;
  hint?: ReactNode;
  error?: string | null;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <FieldBox style={quiet ? { position: "relative" } : undefined}>
      <label htmlFor={id} className={quiet ? "quiet" : undefined}>
        {label}
      </label>
      {children(id)}
      {error ? <span className="error">{error}</span> : hint && <span className="hint">{hint}</span>}
    </FieldBox>
  );
}

// ---- Shared controls ------------------------------------------------------

function IdField({
  doc,
  node,
  onRename,
}: {
  doc: Doc;
  node: FlowNode;
  onRename: (from: string, to: string) => void;
}) {
  const [draft, setDraft] = useState(node.id);
  const error = draft === node.id ? null : renameError(doc, node.id, draft);
  const commit = () => {
    if (error || draft === node.id) setDraft(node.id);
    else onRename(node.id, draft);
  };
  return (
    <Labeled
      label="Step id"
      error={error}
      hint="How other steps and call records refer to this step."
    >
      {(id) => (
        <Input
          id={id}
          value={draft}
          status={error ? "error" : undefined}
          spellCheck={false}
          autoComplete="off"
          style={{ fontFamily: font.mono }}
          onChange={(event) => setDraft(event.target.value.toLowerCase().replace(/[\s-]+/g, "_"))}
          onBlur={commit}
          onPressEnter={(event) => event.currentTarget.blur()}
          onKeyDown={(event) => {
            if (event.key === "Escape") setDraft(node.id);
          }}
        />
      )}
    </Labeled>
  );
}

// A text area with one-click {{variable}} insertion at the caret.
function SpokenField({
  label,
  hint,
  placeholder,
  value,
  variables,
  onChange,
}: {
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  variables: Variable[];
  onChange: (value: string) => void;
}) {
  const ref = useRef<TextAreaRef>(null);
  const insert = (name: string) => {
    const el = ref.current?.resizableTextArea?.textArea;
    const token = `{{${name}}}`;
    const from = el?.selectionStart ?? value.length;
    const to = el?.selectionEnd ?? value.length;
    onChange(value.slice(0, from) + token + value.slice(to));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(from + token.length, from + token.length);
    });
  };
  return (
    <Labeled label={label} hint={hint} quiet>
      {(id) => (
        <>
          <Input.TextArea
            id={id}
            ref={ref}
            value={value}
            placeholder={placeholder}
            autoSize={{ minRows: 3, maxRows: 10 }}
            onChange={(event) => onChange(event.target.value)}
          />
          {variables.length > 0 && (
            <Inserts aria-label="Insert a variable">
              Insert
              {variables.map((v) => (
                <Tooltip
                  key={v.name}
                  title={[v.description, v.example && `e.g. ${v.example}`].filter(Boolean).join(" · ")}
                >
                  <button type="button" onClick={() => insert(v.name)}>
                    {`{{${v.name}}}`}
                  </button>
                </Tooltip>
              ))}
            </Inserts>
          )}
        </>
      )}
    </Labeled>
  );
}

function TargetSelect({
  id,
  ariaLabel,
  doc,
  self,
  value,
  onChange,
}: {
  id?: string;
  ariaLabel?: string;
  doc: Doc;
  self: string;
  value: string;
  onChange: (target: string) => void;
}) {
  const known = doc.nodes.some((n) => n.id === value);
  return (
    <Select
      id={id}
      aria-label={ariaLabel}
      value={value || undefined}
      status={value && !known ? "error" : undefined}
      placeholder="Not connected"
      allowClear
      showSearch
      optionFilterProp="value"
      onChange={(target?: string) => onChange(target ?? "")}
      options={doc.nodes
        .filter((n) => n.id !== self && n.type !== "start")
        .map((n) => ({
          value: n.id,
          label: (
            <OptionRow $tone={NODE_KIND[n.type].color}>
              {NODE_KIND[n.type].icon}
              <code>{n.id}</code>
            </OptionRow>
          ),
        }))}
    />
  );
}

function NextField({
  doc,
  node,
  apply,
}: {
  doc: Doc;
  node: Narrow<"start" | "say" | "ask" | "transfer">;
  apply: Apply;
}) {
  return (
    <Labeled
      label="Then go to"
      quiet
      hint={
        node.type === "transfer"
          ? "Where the call carries on if the transfer cannot be made, for example when no one picks up."
          : "Or drag from the dot on the step's right edge."
      }
    >
      {(id) => (
        <TargetSelect
          id={id}
          doc={doc}
          self={node.id}
          value={node.next}
          onChange={(next) => apply((d) => updateNode<typeof node>(d, node.id, (n) => ({ ...n, next })))}
        />
      )}
    </Labeled>
  );
}

// ---- Transfer target ------------------------------------------------------

// What is wrong with a transfer target, or null when it is usable: a number
// in international format, or one {{variable}} the flow declares.
function transferTargetError(to: string, variables: Variable[]): string | null {
  const text = to.trim();
  if (!text) return "Add the number to transfer to.";
  const variable = /^\{\{\s*([a-z][a-z0-9_]*)\s*\}\}$/.exec(text);
  if (variable) {
    return variables.some((v) => v.name === variable[1])
      ? null
      : `The flow has no variable called "${variable[1]}".`;
  }
  if (text.includes("{{")) return "Use a number or a single {{variable}}, not both.";
  return PHONE_NUMBER.test(text.replace(/[\s()-]/g, ""))
    ? null
    : "Use international format: a plus sign, the country code, then the number.";
}

function TransferTarget({
  value,
  variables,
  onChange,
}: {
  value: string;
  variables: Variable[];
  onChange: (value: string) => void;
}) {
  // Only complain once something has been typed; an empty field has a hint.
  const error = value.trim() ? transferTargetError(value, variables) : null;
  return (
    <Labeled
      label="Number to transfer to"
      quiet
      error={error}
      hint="A number in international format, such as +919876543210, or a {{variable}} that holds one."
    >
      {(id) => (
        <>
          <Input
            id={id}
            value={value}
            placeholder="+919876543210"
            status={error ? "error" : undefined}
            spellCheck={false}
            autoComplete="off"
            style={{ fontFamily: font.mono }}
            onChange={(event) => onChange(event.target.value)}
          />
          {variables.length > 0 && (
            <Inserts aria-label="Use a variable">
              Use
              {variables.map((v) => (
                <Tooltip
                  key={v.name}
                  title={[v.description, v.example && `e.g. ${v.example}`].filter(Boolean).join(" · ")}
                >
                  <button type="button" onClick={() => onChange(`{{${v.name}}}`)}>
                    {`{{${v.name}}}`}
                  </button>
                </Tooltip>
              ))}
            </Inserts>
          )}
        </>
      )}
    </Labeled>
  );
}

// ---- Branch conditions ----------------------------------------------------

const opsFor = (field?: Field): Condition["op"][] =>
  field && (field.type === "boolean" || field.type === "number")
    ? ["eq", "neq", "known"]
    : ["eq", "neq", "in", "known"];

function ValueInput({
  field,
  when,
  onChange,
}: {
  field?: Field;
  when: Condition;
  onChange: (value: Condition["value"], typing?: boolean) => void;
}) {
  if (when.op === "known") return null;
  const label = "Value to compare with";
  if (when.op === "in") {
    const values = Array.isArray(when.value) ? when.value : [];
    return (
      <Select
        mode={field?.type === "enum" ? "multiple" : "tags"}
        aria-label={label}
        placeholder={field?.type === "enum" ? "Choose values" : "Type a value, press Enter"}
        value={values}
        options={field?.options?.map((o) => ({ value: o, label: o }))}
        onChange={(next: string[]) => onChange(next)}
      />
    );
  }
  switch (field?.type) {
    case "boolean":
      return (
        <Segmented
          block
          aria-label={label}
          value={when.value === false ? "false" : "true"}
          options={[
            { value: "true", label: "true" },
            { value: "false", label: "false" },
          ]}
          onChange={(next) => onChange(next === "true")}
        />
      );
    case "enum":
      return (
        <Select
          aria-label={label}
          placeholder="Choose a value"
          value={typeof when.value === "string" && when.value ? when.value : undefined}
          options={field.options?.map((o) => ({ value: o, label: o }))}
          onChange={(next: string) => onChange(next)}
        />
      );
    case "number":
      return (
        <InputNumber
          aria-label={label}
          placeholder="Number"
          value={typeof when.value === "number" ? when.value : null}
          onChange={(next) => onChange(next ?? undefined, true)}
        />
      );
    default:
      return (
        <Input
          aria-label={label}
          placeholder="Text to match"
          value={typeof when.value === "string" ? when.value : ""}
          onChange={(event) => onChange(event.target.value, true)}
        />
      );
  }
}

function BranchEditor({
  doc,
  node,
  fields,
  folds,
  apply,
}: {
  doc: Doc;
  node: Narrow<"branch">;
  fields: Field[];
  folds: Folds;
  apply: Apply;
}) {
  type Branch = Narrow<"branch">;
  const byName = new Map(fields.map((f) => [f.name, f]));
  const edit = (fn: (branches: Branch["branches"]) => Branch["branches"], key?: string) =>
    apply((d) => updateNode<Branch>(d, node.id, (n) => ({ ...n, branches: fn(n.branches) })), key);
  const setWhen = (index: number, when: Condition, key?: string) =>
    edit((all) => all.map((b, i) => (i === index ? { ...b, when } : b)), key);
  const move = (index: number, by: number) =>
    edit((all) => {
      const next = [...all];
      const [item] = next.splice(index, 1);
      next.splice(index + by, 0, item!);
      return next;
    });

  return (
    <Sections>
      <Section
        id="branch:conditions"
        title="Conditions"
        summary={`${node.branches.length} ${node.branches.length === 1 ? "condition" : "conditions"}`}
        folds={folds}
      >
      <FieldBox>
      <span className="hint">Checked from the top; the first one that is true is followed.</span>
      <Rules>
        {node.branches.map((branch, i) => {
          const field = byName.get(branch.when.field);
          const ops = opsFor(field);
          return (
            <Rule key={i} data-rule={i}>
              <div className="top">
                <strong>{i === 0 ? "If" : "Else if"}</strong>
                <Tooltip title="Move up">
                  <Button
                    size="small"
                    type="text"
                    icon={<ArrowUpOutlined />}
                    aria-label={`Move condition ${i + 1} up`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  />
                </Tooltip>
                <Tooltip title="Move down">
                  <Button
                    size="small"
                    type="text"
                    icon={<ArrowDownOutlined />}
                    aria-label={`Move condition ${i + 1} down`}
                    disabled={i === node.branches.length - 1}
                    onClick={() => move(i, 1)}
                  />
                </Tooltip>
                <Tooltip
                  title={node.branches.length === 1 ? "A branch needs one condition" : "Remove"}
                >
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label={`Remove condition ${i + 1}`}
                    disabled={node.branches.length === 1}
                    onClick={() => edit((all) => all.filter((_, j) => j !== i))}
                  />
                </Tooltip>
              </div>
              <div className="pair">
                <Select
                  aria-label="Field"
                  placeholder="Field"
                  status={branch.when.field && !field ? "error" : undefined}
                  value={branch.when.field || undefined}
                  showSearch
                  optionLabelProp="value"
                  popupMatchSelectWidth={260}
                  options={fields.map((f) => ({
                    value: f.name,
                    label: (
                      <OptionRow>
                        <code>{f.name}</code>
                        <small>{f.type}</small>
                      </OptionRow>
                    ),
                  }))}
                  onChange={(name: string) => {
                    const next = byName.get(name);
                    const op = opsFor(next).includes(branch.when.op) ? branch.when.op : "eq";
                    setWhen(i, { field: name, op, value: defaultValue(next, op) });
                  }}
                />
                <Select
                  aria-label="Operator"
                  value={branch.when.op}
                  options={ops.map((op) => ({ value: op, label: OP_LABEL[op] }))}
                  onChange={(op: Condition["op"]) => {
                    const scalar = (o: Condition["op"]) => o === "eq" || o === "neq";
                    const keep = scalar(op) && scalar(branch.when.op);
                    setWhen(i, {
                      field: branch.when.field,
                      op,
                      value: keep ? branch.when.value : defaultValue(field, op),
                    });
                  }}
                />
              </div>
              <ValueInput
                field={field}
                when={branch.when}
                onChange={(value, typing) =>
                  setWhen(
                    i,
                    { ...branch.when, value },
                    typing ? `value:${node.id}:${i}` : undefined,
                  )
                }
              />
              <div className="go">
                then go to
                <TargetSelect
                  ariaLabel={`Condition ${i + 1} goes to`}
                  doc={doc}
                  self={node.id}
                  value={branch.next}
                  onChange={(next) =>
                    edit((all) => all.map((b, j) => (j === i ? { ...b, next } : b)))
                  }
                />
              </div>
            </Rule>
          );
        })}
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() =>
            edit((all) => [
              ...all,
              {
                when: defaultCondition(
                  fields,
                  all.map((b) => b.when.field),
                ),
                next: "",
              },
            ])
          }
        >
          Add condition
        </Button>
      </Rules>
      </FieldBox>
      </Section>
      <Section
        id="branch:otherwise"
        title="Otherwise"
        summary={node.default ? `to ${node.default}` : "not connected"}
        folds={folds}
      >
        <FieldBox>
          <span className="hint">Where the call goes when no condition above is true.</span>
          <TargetSelect
            ariaLabel="Otherwise go to"
            doc={doc}
            self={node.id}
            value={node.default}
            onChange={(target) =>
              apply((d) => updateNode<Branch>(d, node.id, (n) => ({ ...n, default: target })))
            }
          />
        </FieldBox>
      </Section>
    </Sections>
  );
}

// ---- Per-kind forms -------------------------------------------------------

function NodeForm({
  doc,
  node,
  fields,
  variables,
  defaultAttempts,
  folds,
  apply,
}: {
  doc: Doc;
  node: FlowNode;
  fields: Field[];
  variables: Variable[];
  defaultAttempts: number;
  folds: Folds;
  apply: Apply;
}) {
  const next = (target: string) => (target ? `to ${target}` : "not connected");
  switch (node.type) {
    case "start":
    case "say":
      return (
        <Sections>
          <Section
            id="say:line"
            title={node.type === "start" ? "Opening line" : "What to say"}
            summary={node.say}
            folds={folds}
          >
          <SpokenField
            label={node.type === "start" ? "Opening line" : "What to say"}
            hint={
              node.type === "start"
                ? "The first thing the agent says when the call connects."
                : "The agent says this, then moves straight on."
            }
            placeholder="Write the line the agent should speak"
            value={node.say}
            variables={variables}
            onChange={(say) =>
              apply(
                (d) => updateNode<typeof node>(d, node.id, (n) => ({ ...n, say })),
                `say:${node.id}`,
              )
            }
          />
          </Section>
          <Section id="say:next" title="Next step" summary={next(node.next)} folds={folds}>
            <NextField doc={doc} node={node} apply={apply} />
          </Section>
        </Sections>
      );
    case "ask":
      return (
        <Sections>
          <Section
            id="ask:collect"
            title="What to collect"
            summary={node.fields.join(", ")}
            folds={folds}
          >
          <Labeled
            label="Fields to collect"
            quiet
            hint="The agent keeps the conversation here until it has these answers."
          >
            {(id) => (
              <Select
                id={id}
                mode="multiple"
                placeholder="Choose one or more fields"
                value={node.fields}
                optionLabelProp="value"
                options={fields.map((f) => ({
                  value: f.name,
                  label: (
                    <OptionRow>
                      <code>{f.name}</code>
                      <small>{f.description}</small>
                    </OptionRow>
                  ),
                }))}
                onChange={(next: string[]) =>
                  apply((d) => updateNode<typeof node>(d, node.id, (n) => ({ ...n, fields: next })))
                }
              />
            )}
          </Labeled>
          </Section>
          <Section id="ask:guidance" title="Guidance" summary={node.guidance} folds={folds}>
          <SpokenField
            label="Guidance"
            hint="Optional. How to ask, what counts as an answer, what to avoid."
            placeholder="e.g. A nearby town is enough. Do not ask for an exact address."
            value={node.guidance}
            variables={variables}
            onChange={(guidance) =>
              apply(
                (d) => updateNode<typeof node>(d, node.id, (n) => ({ ...n, guidance })),
                `guidance:${node.id}`,
              )
            }
          />
          </Section>
          <Section
            id="ask:advanced"
            title="Advanced"
            summary={`${node.maxAttempts ?? defaultAttempts} attempts`}
            folds={folds}
          >
          <Labeled
            label="Max attempts"
            hint="Optional. How many times to re-ask before moving on."
          >
            {(id) => (
              <InputNumber
                id={id}
                min={1}
                max={10}
                precision={0}
                placeholder={`Agent default (${defaultAttempts})`}
                value={node.maxAttempts ?? null}
                onChange={(value) =>
                  apply(
                    (d) =>
                      updateNode<typeof node>(d, node.id, (n) => {
                        const rest = { ...n };
                        delete rest.maxAttempts;
                        return value ? { ...rest, maxAttempts: value } : rest;
                      }),
                    `attempts:${node.id}`,
                  )
                }
              />
            )}
          </Labeled>
          </Section>
          <Section id="ask:next" title="Next step" summary={next(node.next)} folds={folds}>
            <NextField doc={doc} node={node} apply={apply} />
          </Section>
        </Sections>
      );
    case "branch":
      return <BranchEditor doc={doc} node={node} fields={fields} folds={folds} apply={apply} />;
    case "transfer":
      return (
        <Sections>
          <Section id="transfer:line" title="What to say first" summary={node.say} folds={folds}>
            <SpokenField
              label="What to say first"
              hint="The agent says this, then puts the caller through. The person who answers hears a short summary of the call before they are connected."
              placeholder="e.g. Let me put you through to a colleague. Please hold."
              value={node.say}
              variables={variables}
              onChange={(say) =>
                apply(
                  (d) => updateNode<typeof node>(d, node.id, (n) => ({ ...n, say })),
                  `say:${node.id}`,
                )
              }
            />
          </Section>
          <Section id="transfer:to" title="Transfer to" summary={node.to || "No number yet"} folds={folds}>
            <TransferTarget
              value={node.to}
              variables={variables}
              onChange={(to) =>
                apply(
                  (d) => updateNode<typeof node>(d, node.id, (n) => ({ ...n, to })),
                  `to:${node.id}`,
                )
              }
            />
          </Section>
          <Section
            id="transfer:next"
            title="If no one can take it"
            summary={next(node.next)}
            folds={folds}
          >
            <NextField doc={doc} node={node} apply={apply} />
          </Section>
        </Sections>
      );
    case "end":
      return (
        <Sections>
          <Section id="end:line" title="Closing line" summary={node.say} folds={folds}>
          <SpokenField
            label="Closing line"
            hint="The last thing the agent says before hanging up."
            placeholder="Write the goodbye"
            value={node.say}
            variables={variables}
            onChange={(say) =>
              apply(
                (d) => updateNode<typeof node>(d, node.id, (n) => ({ ...n, say })),
                `say:${node.id}`,
              )
            }
          />
          </Section>
          <Section
            id="end:outcome"
            title="Call outcome"
            summary={OUTCOME_LABEL[node.outcome]}
            folds={folds}
          >
          <Labeled label="Call outcome" quiet hint="Recorded on the call when it ends here.">
            {(id) => (
              <Select
                id={id}
                value={node.outcome}
                options={OUTCOMES.map((o) => ({ value: o, label: OUTCOME_LABEL[o] ?? o }))}
                onChange={(outcome: Outcome) =>
                  apply((d) => updateNode<typeof node>(d, node.id, (n) => ({ ...n, outcome })))
                }
              />
            )}
          </Labeled>
          </Section>
        </Sections>
      );
  }
}

function Issues({
  issues,
  onPick,
}: {
  issues: NodeIssue[];
  onPick?: (nodeId: string) => void;
}) {
  const sorted = [...issues].sort((a, b) => (a.level === b.level ? 0 : a.level === "error" ? -1 : 1));
  return (
    <IssueList>
      {sorted.map((issue, i) => {
        const icon = issue.level === "error" ? <ExclamationCircleFilled /> : <WarningFilled />;
        return (
          <IssueRow key={i} $level={issue.level}>
            {onPick && issue.nodeId ? (
              <button type="button" onClick={() => onPick(issue.nodeId!)}>
                {icon}
                <span>{issue.text}</span>
              </button>
            ) : (
              <div>
                {icon}
                <span>{issue.text}</span>
              </div>
            )}
          </IssueRow>
        );
      })}
    </IssueList>
  );
}

// ---- The panel ------------------------------------------------------------

interface PanelProps {
  doc: Doc;
  // Ids of the selected nodes that still exist.
  selected: string[];
  fields: Field[];
  variables: Variable[];
  defaultAttempts: number;
  issues: NodeIssue[];
  apply: Apply;
  onRename: (from: string, to: string) => void;
  onDelete: (ids: string[]) => void;
  onClose: () => void;
  onFocusNode: (id: string) => void;
  // The selected connections, when no step is selected.
  connections: Link[];
  onDisconnect: (links: Link[]) => void;
}

export function Inspector({ open, ...props }: { open: boolean } & PanelProps) {
  return (
    <Slot $open={open} inert={!open} aria-hidden={!open}>
      <Panel {...props} />
    </Slot>
  );
}

function Panel({
  doc,
  selected,
  fields,
  variables,
  defaultAttempts,
  issues,
  apply,
  onRename,
  onDelete,
  onClose,
  onFocusNode,
  connections,
  onDisconnect,
}: PanelProps) {
  const [closed, setClosed] = useState<Record<string, boolean>>({ "ask:advanced": true });
  const folds: Folds = {
    closed,
    toggle: (key) => setClosed((prev) => ({ ...prev, [key]: !prev[key] })),
  };
  const node = selected.length === 1 ? doc.nodes.find((n) => n.id === selected[0]) : undefined;

  if (node) {
    const kind = NODE_KIND[node.type];
    const mine = issues.filter((i) => i.nodeId === node.id);
    return (
      <Aside aria-label="Step settings">
        <Head $tone={kind.color}>
          <span className="icon">{kind.icon}</span>
          <div className="text">
            <h2>{kind.label} step</h2>
            <p>{kind.description}</p>
          </div>
          <Tooltip title="Close">
            <Button type="text" icon={<CloseOutlined />} aria-label="Close step settings" onClick={onClose} />
          </Tooltip>
        </Head>
        <Scroll>
          {mine.length > 0 && <Issues issues={mine} />}
          <IdField key={node.id} doc={doc} node={node} onRename={onRename} />
          <NodeForm
            doc={doc}
            node={node}
            fields={fields}
            variables={variables}
            defaultAttempts={defaultAttempts}
            folds={folds}
            apply={apply}
          />
        </Scroll>
        <Foot>
          {node.id === doc.start ? (
            "Every flow has exactly one start step, so it cannot be deleted."
          ) : (
            <Popconfirm
              title="Delete this step?"
              description="Connections to it are removed. You can undo this."
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => onDelete([node.id])}
            >
              <Button danger type="text" icon={<DeleteOutlined />}>
                Delete step
              </Button>
            </Popconfirm>
          )}
        </Foot>
      </Aside>
    );
  }

  if (selected.length > 1) {
    const deletable = selected.filter((id) => id !== doc.start);
    return (
      <Aside aria-label="Selection">
        <Head>
          <div className="text">
            <h2>{selected.length} steps selected</h2>
            <p>Drag to move them together, or select one to edit it.</p>
          </div>
          <Tooltip title="Clear selection">
            <Button type="text" icon={<CloseOutlined />} aria-label="Clear selection" onClick={onClose} />
          </Tooltip>
        </Head>
        <Scroll>
          <Button
            danger
            icon={<DeleteOutlined />}
            disabled={!deletable.length}
            onClick={() => onDelete(deletable)}
          >
            Delete {deletable.length} {deletable.length === 1 ? "step" : "steps"}
          </Button>
        </Scroll>
      </Aside>
    );
  }

  if (connections.length > 0) {
    const many = connections.length > 1;
    return (
      <Aside aria-label="Connection">
        <Head>
          <span className="icon">
            <ArrowRightOutlined />
          </span>
          <div className="text">
            <h2>{many ? `${connections.length} connections` : "Connection"}</h2>
            <p>Drag either end onto another step to re-route it.</p>
          </div>
          <Tooltip title="Close">
            <Button type="text" icon={<CloseOutlined />} aria-label="Clear selection" onClick={onClose} />
          </Tooltip>
        </Head>
        <Scroll>
          <Rules>
            {connections.map((link) => (
              <Route key={`${link.source}:${link.handle}`}>
                <button type="button" onClick={() => onFocusNode(link.source)}>
                  <small>From</small>
                  <code>{link.source}</code>
                </button>
                <ArrowRightOutlined />
                <button type="button" onClick={() => onFocusNode(link.target)}>
                  <small>To</small>
                  <code>{link.target}</code>
                </button>
                {link.label && <em>when {link.label}</em>}
              </Route>
            ))}
          </Rules>
          <Button danger icon={<DeleteOutlined />} onClick={() => onDisconnect(connections)}>
            Remove {many ? "connections" : "connection"}
          </Button>
        </Scroll>
      </Aside>
    );
  }

  const count = (kind: FlowNode["type"]) => doc.nodes.filter((n) => n.type === kind).length;
  const asked = new Set(doc.nodes.flatMap((n) => (n.type === "ask" ? n.fields : [])));
  const collected = fields.filter((f) => asked.has(f.name)).length;
  const errors = issues.filter((i) => i.level === "error").length;
  const warnings = issues.length - errors;
  return (
    <Aside aria-label="Flow summary">
      <Head>
        <div className="text">
          <h2>Flow</h2>
          <p>Select a step to edit it.</p>
        </div>
      </Head>
      <Scroll>
        <FieldBox>
          <Overline>Steps</Overline>
          <Summary>
            {(["say", "ask", "branch", "transfer", "end"] as const).map((kind) => (
              <li key={kind}>
                <span className="icon" style={{ color: NODE_KIND[kind].color }}>
                  {NODE_KIND[kind].icon}
                </span>
                <span>
                  <small>{NODE_KIND[kind].label}</small>
                  <strong>{count(kind)}</strong>
                </span>
              </li>
            ))}
          </Summary>
          <span className="hint">
            {doc.nodes.length} steps in all · {collected} of {fields.length} {fields.length === 1 ? "field" : "fields"} collected
            {variables.length > 0 && ` · ${variables.length} variables available`}
          </span>
        </FieldBox>
        <FieldBox>
          <Overline>
            {issues.length
              ? `Needs attention · ${[
                  errors && `${errors} ${errors === 1 ? "error" : "errors"}`,
                  warnings && `${warnings} ${warnings === 1 ? "warning" : "warnings"}`,
                ]
                  .filter(Boolean)
                  .join(", ")}`
              : "Validation"}
          </Overline>
          {issues.length ? (
            <Issues issues={issues} onPick={onFocusNode} />
          ) : (
            <AllClear>
              <CheckCircleFilled /> No issues. This flow is ready to take calls.
            </AllClear>
          )}
        </FieldBox>
      </Scroll>
    </Aside>
  );
}
