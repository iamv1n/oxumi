"use client";

import { CheckCircleFilled, ExclamationCircleFilled } from "@ant-design/icons";
import { Skeleton } from "antd";
import Link from "next/link";
import { Fragment } from "react";
import styled from "styled-components";
import { Overline, Panel } from "@/components/app/kit";
import type { Credential, Health } from "@/lib/api";
import { routes } from "@/lib/routes";
import { type } from "@oxumi/ui/design/typography";
import { abilities, type Need } from "./model";

// What the project can do with the keys it has, and in plain words what is
// still needed for each kind of call.

const Box = styled(Panel)`
  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: ${({ theme }) => theme.space(3)};
    padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
  }
  header span {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Row = styled.li<{ $ready: boolean }>`
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  gap: ${({ theme }) => theme.space(0.5)} ${({ theme }) => theme.space(2)};
  align-items: baseline;
  min-height: 32px;
  padding: ${({ theme }) => theme.space(1.5)} ${({ theme }) => theme.space(3)};

  & + & {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
  ${({ theme }) => theme.media.md} {
    grid-template-columns: 16px 184px 84px minmax(0, 1fr);
  }

  > .anticon {
    align-self: center;
    font-size: 14px;
    color: ${({ theme, $ready }) => ($ready ? theme.color.success : theme.color.warning)};
  }
  h3 {
    ${type("label")}
    font-weight: 600;
    color: ${({ theme }) => theme.color.fg};
  }
  .state {
    ${type("label")}
    color: ${({ theme, $ready }) => ($ready ? theme.color.success : theme.color.warning)};
  }
  p {
    ${type("label")}
    font-weight: 400;
    color: ${({ theme }) => theme.color.fgMuted};
  }
  /* On a phone the state and the sentence sit under the title. */
  .state,
  p {
    grid-column: 2;
  }
  ${({ theme }) => theme.media.md} {
    .state,
    p {
      grid-column: auto;
    }
  }
  button,
  a {
    padding: 0;
    border: 0;
    border-radius: ${({ theme }) => theme.radius.small};
    background: none;
    font: inherit;
    font-weight: 500;
    color: ${({ theme }) => theme.color.accentText};
    text-decoration: underline;
    text-decoration-color: transparent;
    text-underline-offset: 2px;
    cursor: pointer;
  }
  button:hover,
  a:hover {
    color: ${({ theme }) => theme.color.accentTextHover};
    text-decoration-color: currentColor;
  }
`;

export function Readiness({
  projectId,
  credentials,
  health,
  onOpen,
}: {
  projectId: string;
  credentials: Credential[];
  health?: Health;
  // Opens a provider, or moves to its group.
  onOpen: (need: Need) => void;
}) {
  const rows = health ? abilities(credentials, health) : null;
  const ready = rows?.filter((row) => row.ready).length ?? 0;

  return (
    <Box $padded={false} data-tour="integrations-summary" aria-label="What this project can do now">
      <header>
        <Overline as="h2">What this project can do now</Overline>
        {rows && (
          <span>
            {ready} of {rows.length} ready
          </span>
        )}
      </header>
      <ul aria-busy={!rows}>
        {rows
          ? rows.map((row) => (
              <Row key={row.key} $ready={row.ready} data-ability={row.key} data-ready={row.ready}>
                {row.ready ? <CheckCircleFilled /> : <ExclamationCircleFilled />}
                <h3>{row.title}</h3>
                <span className="state">{row.ready ? "Ready" : "Not ready"}</span>
                <p>
                  {row.ready ? (
                    row.detail
                  ) : (
                    <>
                      Still needs{" "}
                      {row.needs.map((need, index) => (
                        <Fragment key={need.text}>
                          {index > 0 && (index === row.needs.length - 1 ? " and " : ", ")}
                          {need.provider || need.kind ? (
                            <button type="button" onClick={() => onOpen(need)}>
                              {need.text}
                            </button>
                          ) : (
                            need.text
                          )}
                        </Fragment>
                      ))}
                      .
                    </>
                  )}
                  {row.key === "phone" && row.ready && (
                    <>
                      {" "}
                      Start one from an agent&apos;s Test tab or{" "}
                      <Link href={routes.projectApi(projectId)}>through the API</Link>.
                    </>
                  )}
                </p>
              </Row>
            ))
          : [0, 1, 2].map((index) => (
              <Row key={index} $ready={false} as="li">
                <Skeleton.Button active size="small" style={{ width: 16, minWidth: 16, height: 16 }} />
                <Skeleton.Button active size="small" style={{ width: 160, height: 16 }} />
              </Row>
            ))}
      </ul>
    </Box>
  );
}
