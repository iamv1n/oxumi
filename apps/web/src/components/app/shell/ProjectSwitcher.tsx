"use client";

import {
  AppstoreOutlined,
  CheckOutlined,
  DownOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Input, Popover, Skeleton } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, useId, useMemo, useState } from "react";
import styled, { useTheme } from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { useProject, useProjects } from "@/lib/api";
import { routes } from "@/lib/routes";
import { CreateProjectModal } from "../projects/CreateProjectModal";

// The project picker in the top bar: search every project, jump to one, go
// back to the full list or start a new project.

const Trigger = styled.button<{ $open: boolean }>`
  ${type("label")}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  min-width: 0;
  max-width: min(46vw, 320px);
  height: ${({ theme }) => theme.space(8)};
  padding-inline: ${({ theme }) => theme.space(2.5)};
  border: 1px solid ${({ theme, $open }) => ($open ? theme.color.lineStrong : "transparent")};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme, $open }) => ($open ? theme.color.hover : "transparent")};
  color: ${({ theme }) => theme.color.fg};
  cursor: pointer;
  transition:
    background ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    border-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &:hover {
    background: ${({ theme }) => theme.color.hover};
    border-color: ${({ theme }) => theme.color.line};
  }

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .muted {
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  .caret {
    flex: none;
    font-size: 10px;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Glyph = styled.span<{ $small?: boolean }>`
  ${type("caption")}
  display: grid;
  place-items: center;
  flex: none;
  width: ${({ theme, $small }) => theme.space($small ? 5 : 6)};
  height: ${({ theme, $small }) => theme.space($small ? 5 : 6)};
  border-radius: ${({ theme }) => theme.radius.small};
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accentText};
  font-weight: 600;
  text-transform: uppercase;
`;

const Menu = styled.div`
  display: flex;
  flex-direction: column;
  width: min(360px, calc(100vw - ${({ theme }) => theme.space(22)}));
`;

const SearchRow = styled.div`
  padding: ${({ theme }) => theme.space(2)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
`;

const GroupLabel = styled.p`
  ${type("overline")}
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(3)}
    ${({ theme }) => theme.space(1)};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

const List = styled.ul`
  max-height: 296px;
  overflow-y: auto;
  padding: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(1.5)}
    ${({ theme }) => theme.space(2)};
`;

const Option = styled(Link)<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(1.5)} ${({ theme }) => theme.space(2)};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme, $active }) => ($active ? theme.color.hover : "transparent")};
  color: ${({ theme }) => theme.color.fg};

  &:hover {
    background: ${({ theme }) => theme.color.hover};
  }

  .text {
    flex: 1;
    min-width: 0;
  }
  .name {
    ${type("label")}
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meta {
    ${type("caption")}
    display: block;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  .check {
    flex: none;
    color: ${({ theme }) => theme.color.accentText};
  }
`;

const Note = styled.p`
  ${type("label")}
  padding: ${({ theme }) => theme.space(5)} ${({ theme }) => theme.space(4)};
  color: ${({ theme }) => theme.color.fgMuted};
  font-weight: 400;
  text-align: center;
`;

const Loading = styled.div`
  padding: ${({ theme }) => theme.space(4)};
`;

const Footer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space(1)};
  padding: ${({ theme }) => theme.space(1.5)};
  border-top: 1px solid ${({ theme }) => theme.color.line};

  a,
  button {
    ${type("label")}
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${({ theme }) => theme.space(2)};
    height: ${({ theme }) => theme.space(8)};
    border: 0;
    border-radius: ${({ theme }) => theme.radius.control};
    background: transparent;
    color: ${({ theme }) => theme.color.fgMuted};
    cursor: pointer;
  }
  a:hover,
  button:hover {
    background: ${({ theme }) => theme.color.hover};
    color: ${({ theme }) => theme.color.fg};
  }
  button {
    color: ${({ theme }) => theme.color.accentText};
  }
  button:hover {
    color: ${({ theme }) => theme.color.accentTextHover};
  }
`;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function ProjectSwitcher({ projectId }: { projectId: string }) {
  const router = useRouter();
  const theme = useTheme();
  const listId = useId();
  const { data: projects, error, isLoading } = useProjects();
  const { data: current, error: currentError } = useProject(projectId);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = projects ?? [];
    return q
      ? all.filter((p) => `${p.name} ${p.description}`.toLowerCase().includes(q))
      : all;
  }, [projects, query]);

  const change = (next: boolean) => {
    setOpen(next);
    if (next) {
      setQuery("");
      setActive(0);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!matches.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + matches.length) % matches.length);
    } else if (event.key === "Enter") {
      const target = matches[Math.min(active, matches.length - 1)];
      if (!target) return;
      event.preventDefault();
      change(false);
      router.push(routes.project(target.id));
    }
  };

  const name =
    current?.name ?? projects?.find((p) => p.id === projectId)?.name ?? null;
  const fallback = !currentError
    ? "Loading…"
    : currentError.status === 404
      ? "Unknown project"
      : "Project unavailable";

  const menu = (
    <Menu>
      <SearchRow>
        <Input
          autoFocus
          allowClear
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          prefix={<SearchOutlined />}
          placeholder="Search projects"
          aria-label="Search projects"
          aria-controls={listId}
        />
      </SearchRow>
      {isLoading && !projects ? (
        <Loading>
          <Skeleton active title={false} paragraph={{ rows: 3 }} />
        </Loading>
      ) : error && !projects ? (
        <Note role="alert">{error.message}</Note>
      ) : matches.length === 0 ? (
        <Note>
          {query.trim() ? `No project matches "${query.trim()}".` : "No projects yet."}
        </Note>
      ) : (
        <>
          <GroupLabel>{query.trim() ? plural(matches.length, "result") : "Projects"}</GroupLabel>
          <List id={listId}>
            {matches.map((project, index) => {
              const selected = project.id === projectId;
              return (
                <li key={project.id}>
                  <Option
                    href={routes.project(project.id)}
                    $active={index === active}
                    aria-current={selected ? "true" : undefined}
                    onClick={() => change(false)}
                    onMouseEnter={() => setActive(index)}
                  >
                    <Glyph aria-hidden>{project.name.trim().charAt(0) || "?"}</Glyph>
                    <span className="text">
                      <span className="name">{project.name}</span>
                      <span className="meta">
                        {plural(project.agentCount, "agent")} · {plural(project.callCount, "call")}
                      </span>
                    </span>
                    {selected && <CheckOutlined className="check" aria-label="Current project" />}
                  </Option>
                </li>
              );
            })}
          </List>
        </>
      )}
      <Footer>
        <Link href={routes.projects} onClick={() => change(false)}>
          <AppstoreOutlined aria-hidden />
          All projects
        </Link>
        <button
          type="button"
          onClick={() => {
            change(false);
            setCreating(true);
          }}
        >
          <PlusOutlined aria-hidden />
          New project
        </button>
      </Footer>
    </Menu>
  );

  return (
    <>
      <Popover
        open={open}
        onOpenChange={change}
        trigger="click"
        placement="bottomLeft"
        arrow={false}
        destroyOnHidden
        content={menu}
        styles={{
          container: {
            padding: 0,
            overflow: "hidden",
            border: `1px solid ${theme.color.lineStrong}`,
          },
        }}
      >
        <Trigger
          type="button"
          $open={open}
          aria-haspopup="dialog"
          aria-expanded={open}
          data-tour="project-switcher"
          aria-label={name ? `Project: ${name}. Switch project` : "Switch project"}
        >
          {name && (
            <Glyph $small aria-hidden>
              {name.trim().charAt(0) || "?"}
            </Glyph>
          )}
          <span className={name ? "name" : "name muted"}>
            {name ?? fallback}
          </span>
          <DownOutlined className="caret" aria-hidden />
        </Trigger>
      </Popover>
      <CreateProjectModal open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
