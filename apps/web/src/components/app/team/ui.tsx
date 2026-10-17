"use client";

import { Tooltip } from "antd";
import styled from "styled-components";
import { fullDate, relativeTime } from "@/components/app/api/format";
import { Panel } from "@/components/app/kit";
import { type } from "@oxumi/ui/design/typography";

// Pieces shared by the Team page's panels.

// A table on a panel, with quiet column headings.
export const TableBox = styled(Panel)`
  overflow: hidden;

  .ant-table-wrapper .ant-table {
    background: transparent;
  }
  && .ant-table-thead > tr > th {
    ${type("caption")}
    font-weight: 500;
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

export const SectionHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: ${({ theme }) => theme.space(2)};
  margin-bottom: ${({ theme }) => theme.space(3)};

  h2 {
    ${type("heading")}
    color: ${({ theme }) => theme.color.fg};
  }
  p {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  .actions {
    margin-left: auto;
  }
`;

export const Person = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;

  .name {
    color: ${({ theme }) => theme.color.fg};
    font-weight: 500;
  }
  small {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Quiet = styled.span`
  color: ${({ theme }) => theme.color.fgMuted};
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`;

// "3 days ago", with the full date on hover and focus.
export function When({ iso, now }: { iso: string; now?: number }) {
  return (
    <Tooltip title={fullDate(iso)}>
      <Quiet tabIndex={0}>
        <time dateTime={iso}>{relativeTime(iso, now)}</time>
      </Quiet>
    </Tooltip>
  );
}
