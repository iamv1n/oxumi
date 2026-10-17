"use client";

import { SafetyCertificateOutlined } from "@ant-design/icons";
import { Alert, Button, Input, Space } from "antd";
import { useState } from "react";
import styled from "styled-components";
import { SectionBody, SettingsSection } from "@/components/app/projects/SettingsPanels";
import { ApiError, checkNumber, type ComplianceBlock } from "@/lib/api";
import { BLOCK } from "./labels";

// Whether a call to one number would be placed right now, and if not, why.

const Body = styled(SectionBody)`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};
  max-width: 640px;

  ul {
    display: grid;
    gap: ${({ theme }) => theme.space(1)};
    margin-top: ${({ theme }) => theme.space(1)};
  }
  li strong {
    font-weight: 600;
  }
`;

interface Result {
  number: string;
  allowed: boolean;
  blocks: ComplianceBlock[];
}

export function CheckNumberSection({ projectId }: { projectId: string }) {
  const [number, setNumber] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const check = async () => {
    const text = number.trim();
    if (!text) return;
    setChecking(true);
    setFailure(null);
    try {
      setResult(await checkNumber(projectId, text));
    } catch (err) {
      setResult(null);
      setFailure(err instanceof ApiError ? err.message : "Could not check the number.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <SettingsSection
      scope="compliance"
      id="check"
      title="Check a number"
      description="Would a call to this number go through right now?"
      summary="Test a number against the rules and lists"
    >
      <Body>
        <Space.Compact block>
          <Input
            aria-label="Phone number"
            placeholder="+919876543210"
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            onPressEnter={() => void check()}
            autoComplete="off"
            inputMode="tel"
            allowClear
          />
          <Button
            icon={<SafetyCertificateOutlined />}
            loading={checking}
            disabled={!number.trim()}
            onClick={() => void check()}
          >
            Check
          </Button>
        </Space.Compact>
        {failure && <Alert type="error" showIcon title={failure} />}
        {result && !failure && (
          <div role="status" aria-live="polite">
            {result.allowed ? (
              <Alert
                type="success"
                showIcon
                title={`A call to ${result.number} would go through right now.`}
              />
            ) : (
              <Alert
                type="warning"
                showIcon
                title={`A call to ${result.number} would be blocked`}
                description={
                  <ul>
                    {result.blocks.map((block) => (
                      <li key={block.code}>
                        <strong>{BLOCK[block.code] ?? block.code}.</strong> {block.message}
                      </li>
                    ))}
                  </ul>
                }
              />
            )}
          </div>
        )}
      </Body>
    </SettingsSection>
  );
}
