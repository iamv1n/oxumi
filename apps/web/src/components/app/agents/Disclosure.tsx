"use client";

import { ExclamationCircleFilled, RightOutlined } from "@ant-design/icons";
import { type ReactNode, useCallback, useState } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";

// Collapsible, titled sections for long forms. A closed section shows a
// one-line summary of what it holds, and says so when something inside it
// needs fixing. Which sections are open is remembered per storage key.

type OpenState = Record<string, boolean>;

function read(key: string, defaults: OpenState): OpenState {
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? "{}") as OpenState;
    const state = { ...defaults };
    for (const id of Object.keys(defaults))
      if (typeof stored[id] === "boolean") state[id] = stored[id];
    return state;
  } catch {
    return defaults;
  }
}

// Only call from components that render on the client after data has loaded;
// the first render reads localStorage.
export function useSections(storageKey: string, defaults: OpenState) {
  const [open, setOpen] = useState<OpenState>(() => read(storageKey, defaults));

  const update = useCallback(
    (change: (current: OpenState) => OpenState) =>
      setOpen((current) => {
        const next = change(current);
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // Private mode or full storage: the choice lasts for this visit only.
        }
        return next;
      }),
    [storageKey],
  );

  const toggle = useCallback(
    (id: string) => update((current) => ({ ...current, [id]: !current[id] })),
    [update],
  );
  // Opens the given sections and leaves the others as they are.
  const reveal = useCallback(
    (ids: string[]) =>
      update((current) =>
        ids.every((id) => current[id])
          ? current
          : { ...current, ...Object.fromEntries(ids.map((id) => [id, true])) },
      ),
    [update],
  );

  return { open, toggle, reveal };
}

const Box = styled.section<{ $error: boolean }>`
  border: 1px solid
    ${({ theme, $error }) => ($error ? theme.color.danger : theme.color.line)};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};
  scroll-margin-top: ${({ theme }) => theme.space(6)};
  transition: border-color ${({ theme }) => theme.motion.fast};
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  padding-right: ${({ theme }) => theme.space(4)};
`;

const Toggle = styled.button<{ $open: boolean }>`
  display: flex;
  flex: 1;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  min-width: 0;
  min-height: 56px;
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(2)}
    ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(5)};
  border: 0;
  border-radius: ${({ theme }) => theme.radius.card};
  background: none;
  color: ${({ theme }) => theme.color.fg};
  text-align: left;
  cursor: pointer;

  .chevron {
    flex: none;
    color: ${({ theme }) => theme.color.fgSubtle};
    font-size: 11px;
    transform: rotate(${({ $open }) => ($open ? "90deg" : "0deg")});
    transition:
      transform ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease},
      color ${({ theme }) => theme.motion.fast};
  }
  &:hover .chevron {
    color: ${({ theme }) => theme.color.fg};
  }
  h2 {
    display: flex;
    flex: none;
    align-items: center;
    gap: ${({ theme }) => theme.space(2)};
    ${type("label")}
    font-size: ${({ theme }) => theme.text.body.size};
    font-weight: 600;
  }
  h2 small {
    ${type("caption")}
    padding: 0 ${({ theme }) => theme.space(2)};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.hover};
    color: ${({ theme }) => theme.color.fgMuted};
    font-variant-numeric: tabular-nums;
  }
  .summary {
    ${type("label")}
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: ${({ theme }) => theme.color.fgSubtle};
    font-weight: 400;
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: ${({ $open }) => ($open ? 0 : 1)};
    transition: opacity ${({ theme }) => theme.motion.fast};
  }
  /* Too narrow for a useful summary: let the title have the row. */
  .summary {
    display: none;
  }
  ${({ theme }) => theme.media.sm} {
    .summary {
      display: block;
    }
  }
`;

const ErrorPill = styled.span`
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  ${type("caption")}
  font-weight: 500;
  padding: ${({ theme }) => theme.space(0.5)} ${({ theme }) => theme.space(2)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.dangerSoft};
  color: ${({ theme }) => theme.color.danger};
  white-space: nowrap;
`;

// Animates height without measuring: a one-row grid going from 0fr to 1fr.
const Reveal = styled.div<{ $open: boolean }>`
  display: grid;
  grid-template-rows: ${({ $open }) => ($open ? "1fr" : "0fr")};
  transition: grid-template-rows ${({ theme }) => theme.motion.base}
    ${({ theme }) => theme.motion.ease};

  > div {
    min-height: 0;
    overflow: hidden;
    visibility: ${({ $open }) => ($open ? "visible" : "hidden")};
    transition: visibility ${({ theme }) => theme.motion.base};
  }
`;

const Content = styled.div<{ $flush: boolean }>`
  padding: ${({ theme, $flush }) =>
    $flush ? 0 : `${theme.space(1)} ${theme.space(5)} ${theme.space(6)} ${theme.space(11)}`};
  border-top: ${({ theme, $flush }) => ($flush ? `1px solid ${theme.color.line}` : "0")};

  ${({ theme }) => theme.media.reducedMotion} {
    transition: none;
  }
`;

export function Disclosure({
  id,
  title,
  count,
  summary,
  errors = 0,
  open,
  onToggle,
  actions,
  flush = false,
  children,
  ...rest
}: {
  id: string;
  title: string;
  // Shown as a small counter beside the title.
  count?: number;
  // One line describing the current values; shown while closed.
  summary?: ReactNode;
  // Number of invalid controls inside.
  errors?: number;
  open: boolean;
  onToggle: () => void;
  // Controls that stay in the header, such as an Add button.
  actions?: ReactNode;
  // Content runs edge to edge (for tables and lists).
  flush?: boolean;
  children: ReactNode;
  "data-tour"?: string;
}) {
  return (
    <Box id={`section-${id}`} $error={errors > 0 && !open} aria-labelledby={`section-${id}-title`} {...rest}>
      <Head>
        <Toggle
          type="button"
          $open={open}
          aria-expanded={open}
          aria-controls={`section-${id}-body`}
          onClick={onToggle}
        >
          <RightOutlined className="chevron" aria-hidden />
          <h2 id={`section-${id}-title`}>
            {title}
            {count !== undefined && <small>{count}</small>}
          </h2>
          <span className="summary" aria-hidden={open}>
            {summary}
          </span>
        </Toggle>
        {errors > 0 && (
          <ErrorPill role="status">
            <ExclamationCircleFilled /> {errors} to fix
          </ErrorPill>
        )}
        {actions}
      </Head>
      <Reveal $open={open}>
        <div id={`section-${id}-body`} inert={!open}>
          <Content $flush={flush}>{children}</Content>
        </div>
      </Reveal>
    </Box>
  );
}
