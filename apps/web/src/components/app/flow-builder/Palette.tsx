"use client";

import { HolderOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import type { DragEvent } from "react";
import styled from "styled-components";
import { NODE_KIND, Overline } from "@/components/app/kit";
import { type } from "@oxumi/ui/design/typography";
import { ADDABLE_KINDS, type AddableKind } from "./model";

export const PALETTE_MIME = "application/x-oxumi-node";

const Aside = styled.aside<{ $collapsed: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(3)};
  width: ${({ $collapsed }) => ($collapsed ? "60px" : "208px")};
  min-height: 0;
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(3)}
    ${({ theme }) => theme.space(4)};
  border-right: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  overflow-x: hidden;
  overflow-y: auto;
  transition: width ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.ease};
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 24px;
  padding-left: ${({ theme }) => theme.space(1)};
  white-space: nowrap;
`;

const Hint = styled.p`
  ${type("caption")}
  padding: 0 ${({ theme }) => theme.space(1)};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
`;

const Item = styled.button<{ $tone: string; $collapsed: boolean }>`
  --tone: ${({ $tone }) => $tone};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2.5)};
  width: 100%;
  padding: ${({ theme, $collapsed }) => ($collapsed ? "2px" : theme.space(2.5))};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => theme.color.raised};
  color: ${({ theme }) => theme.color.fg};
  text-align: left;
  cursor: grab;
  transition:
    border-color ${({ theme }) => theme.motion.fast},
    background ${({ theme }) => theme.motion.fast};

  &:hover {
    border-color: color-mix(in srgb, var(--tone) 55%, transparent);
    background: ${({ theme }) => theme.color.overlay};
  }
  &:active {
    cursor: grabbing;
  }

  .icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 30px;
    height: 30px;
    border-radius: calc(${({ theme }) => theme.radius.control} - 2px);
    background: color-mix(in srgb, var(--tone) 16%, transparent);
    color: var(--tone);
    font-size: 15px;
  }
  .text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  strong {
    ${type("label")}
  }
  small {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  .grip {
    flex: none;
    color: ${({ theme }) => theme.color.fgFaint};
  }
`;

const Note = styled.p`
  ${type("caption")}
  margin-top: auto;
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(1)} 0;
  border-top: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.fgSubtle};

  kbd {
    ${type("code")}
    font-size: 0.6875rem;
    padding: 0 ${({ theme }) => theme.space(1)};
    border: 1px solid ${({ theme }) => theme.color.lineStrong};
    border-radius: calc(${({ theme }) => theme.radius.control} / 2);
    color: ${({ theme }) => theme.color.fgMuted};
  }
  span {
    display: block;
    & + span {
      margin-top: ${({ theme }) => theme.space(1.5)};
    }
  }
`;

export function Palette({
  collapsed,
  branchTour,
  onAdd,
  onDragState,
}: {
  collapsed: boolean;
  // Whether the guide's Branch step should point here (no branch on screen).
  branchTour: boolean;
  onAdd: (kind: AddableKind) => void;
  onDragState: (dragging: boolean) => void;
}) {
  const start = (event: DragEvent, kind: AddableKind) => {
    event.dataTransfer.setData(PALETTE_MIME, kind);
    event.dataTransfer.effectAllowed = "copy";
    onDragState(true);
  };
  return (
    <Aside aria-label="Step palette" data-tour="builder-palette" $collapsed={collapsed}>
      <Head>
        <Overline>{collapsed ? "Add" : "Steps"}</Overline>
      </Head>
      {!collapsed && <Hint>Drag onto the canvas, or click to add.</Hint>}
      <List>
        {ADDABLE_KINDS.map((kind) => {
          const { label, color, icon, description } = NODE_KIND[kind];
          return (
            <li key={kind}>
              <Tooltip title={collapsed ? `${label}: ${description}` : ""} placement="right">
                <Item
                  type="button"
                  $tone={color}
                  $collapsed={collapsed}
                  draggable
                  data-kind={kind}
                  data-tour={kind === "branch" && branchTour ? "builder-branch" : undefined}
                  aria-label={`Add a ${label} step: ${description}`}
                  onDragStart={(event) => start(event, kind)}
                  onDragEnd={() => onDragState(false)}
                  onClick={() => onAdd(kind)}
                >
                  <span className="icon">{icon}</span>
                  {!collapsed && (
                    <>
                      <span className="text">
                        <strong>{label}</strong>
                        <small>{description}</small>
                      </span>
                      <HolderOutlined className="grip" />
                    </>
                  )}
                </Item>
              </Tooltip>
            </li>
          );
        })}
      </List>
      {!collapsed && (
        <Note>
          <span>Drag from the dot on a step&apos;s right edge to connect it to the next step.</span>
          <span>
            <kbd>Shift</kbd> + drag selects several. <kbd>Delete</kbd> removes the selection.
          </span>
        </Note>
      )}
    </Aside>
  );
}
