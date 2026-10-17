"use client";

import { RightOutlined } from "@ant-design/icons";
import { Skeleton } from "antd";
import Link from "next/link";
import type { ReactNode } from "react";
import styled, { css } from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import type { ProjectListItem } from "@/lib/api";
import { routes } from "@/lib/routes";
import { formatDate } from "./format";

// Every project as one dense, scannable row: name and description, then
// agents, calls and creation date in aligned columns.

const columns = css`
  display: grid;
  grid-template-columns: minmax(0, 1fr) ${({ theme }) => theme.space(4)};
  align-items: center;
  gap: ${({ theme }) => theme.space(4)};
  padding-inline: ${({ theme }) => theme.space(4)};

  .num,
  .date {
    display: none;
  }

  ${({ theme }) => theme.media.sm} {
    grid-template-columns:
      minmax(0, 1fr) ${({ theme }) => theme.space(16)} ${({ theme }) => theme.space(16)}
      ${({ theme }) => theme.space(4)};

    .num {
      display: block;
    }
  }
  ${({ theme }) => theme.media.md} {
    grid-template-columns:
      minmax(0, 1fr) ${({ theme }) => theme.space(18)} ${({ theme }) => theme.space(18)}
      ${({ theme }) => theme.space(28)} ${({ theme }) => theme.space(4)};

    .date {
      display: block;
    }
  }

  .num {
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
`;

const Box = styled.section`
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.color.surface};
  overflow: hidden;
`;

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  min-height: ${({ theme }) => theme.space(11)};
  padding: ${({ theme }) => theme.space(1.5)} ${({ theme }) => theme.space(4)}
    ${({ theme }) => theme.space(1.5)} ${({ theme }) => theme.space(2)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};

  .search {
    width: min(100%, 280px);
  }
  .count {
    ${type("caption")}
    margin-left: auto;
    color: ${({ theme }) => theme.color.fgSubtle};
    white-space: nowrap;
  }
`;

const HeadRow = styled.div`
  ${columns}
  ${type("overline")}
  height: ${({ theme }) => theme.space(8)};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

const Rows = styled.ul`
  li + li {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
`;

const Row = styled(Link)`
  ${columns}
  ${type("label")}
  min-height: ${({ theme }) => theme.space(11)};
  padding-block: ${({ theme }) => theme.space(1.5)};
  color: ${({ theme }) => theme.color.fgMuted};
  font-weight: 400;
  transition: background ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &:hover,
  &:focus-visible {
    background: ${({ theme }) => theme.color.hover};
  }
  /* The list clips its corners, so the ring is drawn inside. */
  &:focus-visible {
    box-shadow: inset ${({ theme }) => theme.shadow.focus};
  }
  &:hover .go,
  &:focus-visible .go {
    color: ${({ theme }) => theme.color.accentText};
  }

  .main {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space(3)};
    min-width: 0;
  }
  .text {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }
  .name {
    ${type("label")}
    flex: none;
    max-width: 100%;
    overflow: hidden;
    color: ${({ theme }) => theme.color.fg};
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .desc {
    ${type("caption")}
    min-width: 0;
    overflow: hidden;
    color: ${({ theme }) => theme.color.fgSubtle};
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .date {
    color: ${({ theme }) => theme.color.fgSubtle};
    white-space: nowrap;
  }
  .go {
    font-size: 10px;
    color: ${({ theme }) => theme.color.fgFaint};
  }

  /* Wide enough for name and description to share one line. */
  ${({ theme }) => theme.media.lg} {
    .text {
      flex-direction: row;
      align-items: baseline;
      gap: ${({ theme }) => theme.space(3)};
    }
    .name {
      flex: 0 1 auto;
      max-width: 55%;
    }
    .desc {
      ${type("label")}
      font-weight: 400;
    }
  }
`;

export const ProjectGlyph = styled.span`
  ${type("caption")}
  display: grid;
  place-items: center;
  flex: none;
  width: ${({ theme }) => theme.space(6)};
  height: ${({ theme }) => theme.space(6)};
  border-radius: ${({ theme }) => theme.radius.small};
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accentText};
  font-weight: 600;
  text-transform: uppercase;
`;

const SrOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`;

const Blank = styled.div`
  ${type("label")}
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(8)} ${({ theme }) => theme.space(4)};
  color: ${({ theme }) => theme.color.fgMuted};
  font-weight: 400;
`;

export function ProjectList({
  projects,
  toolbar,
  empty,
}: {
  projects: ProjectListItem[];
  // Search and count, shown in a strip above the column headings.
  toolbar?: ReactNode;
  // Shown in place of the rows when the search matches nothing.
  empty?: ReactNode;
}) {
  return (
    <Box data-tour="project-list" aria-label="Projects">
      {toolbar && <Bar>{toolbar}</Bar>}
      {projects.length === 0 ? (
        <Blank>{empty}</Blank>
      ) : (
        <>
          <HeadRow aria-hidden>
            <span>Project</span>
            <span className="num">Agents</span>
            <span className="num">Calls</span>
            <span className="date">Created</span>
            <span />
          </HeadRow>
          <Rows>
            {projects.map((project) => (
              <li key={project.id}>
                <Row href={routes.project(project.id)}>
                  <span className="main">
                    <ProjectGlyph aria-hidden>{project.name.trim().charAt(0) || "?"}</ProjectGlyph>
                    <span className="text">
                      <span className="name">{project.name}</span>
                      <span className="desc">{project.description || "No description"}</span>
                    </span>
                  </span>
                  <span className="num">
                    {project.agentCount.toLocaleString()}
                    <SrOnly> agents</SrOnly>
                  </span>
                  <span className="num">
                    {project.callCount.toLocaleString()}
                    <SrOnly> calls</SrOnly>
                  </span>
                  <span className="date">
                    <SrOnly>Created </SrOnly>
                    {formatDate(project.createdAt)}
                  </span>
                  <RightOutlined className="go" aria-hidden />
                </Row>
              </li>
            ))}
          </Rows>
        </>
      )}
    </Box>
  );
}

const SkeletonRow = styled.div`
  display: flex;
  align-items: center;
  height: ${({ theme }) => theme.space(11)};
  padding-inline: ${({ theme }) => theme.space(4)};

  & + & {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
`;

export function ProjectListSkeleton() {
  return (
    <Box aria-busy aria-label="Loading projects">
      {[52, 38, 45].map((width) => (
        <SkeletonRow key={width}>
          <Skeleton.Node active style={{ width: `${width}%`, height: 12 }} />
        </SkeletonRow>
      ))}
    </Box>
  );
}
