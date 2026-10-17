"use client";

import { Alert, App, Button, Form, InputNumber } from "antd";
import { useState } from "react";
import styled from "styled-components";
import { Panel, PanelTitle } from "@/components/app/kit";
import { type } from "@oxumi/ui/design/typography";
import { type SpendLimit, updateSpendLimit } from "@/lib/api";
import { formatMoney } from "./format";

type Tone = "ok" | "warn" | "danger";

const Lead = styled.p`
  ${type("body")}
  color: ${({ theme }) => theme.color.fgMuted};

  b {
    color: ${({ theme }) => theme.color.fg};
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
`;

const Meter = styled.div`
  margin-top: ${({ theme }) => theme.space(4)};
`;

const Track = styled.div`
  position: relative;
  height: ${({ theme }) => theme.space(2.5)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.hover};
`;

const Fill = styled.div<{ $tone: Tone }>`
  height: 100%;
  min-width: 2px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $tone }) =>
    $tone === "danger"
      ? theme.color.danger
      : $tone === "warn"
        ? theme.color.warning
        : theme.color.accent};
`;

// The alert threshold, drawn across the track.
const Threshold = styled.span`
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 2px;
  border-radius: 1px;
  background: ${({ theme }) => theme.color.fg};
  opacity: 0.6;
`;

const Scale = styled.div`
  ${type("caption")}
  position: relative;
  height: 1rem;
  margin-top: ${({ theme }) => theme.space(1.5)};
  color: ${({ theme }) => theme.color.fgSubtle};
  font-variant-numeric: tabular-nums;

  span {
    position: absolute;
    white-space: nowrap;
  }
  .start {
    left: 0;
  }
  .end {
    right: 0;
  }
  /* On a phone there is no room beside the end amount; the sentence above
     already says where the alert is. */
  .alert {
    display: none;
    transform: translateX(-50%);
  }
  ${({ theme }) => theme.media.sm} {
    .alert {
      display: inline;
    }
  }
`;

const Fields = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: ${({ theme }) => theme.space(3)};
  margin-top: ${({ theme }) => theme.space(5)};
  padding-top: ${({ theme }) => theme.space(4)};
  border-top: 1px solid ${({ theme }) => theme.color.line};

  .ant-form-item {
    margin-bottom: 0;
  }
  .buttons {
    display: flex;
    gap: ${({ theme }) => theme.space(2)};
  }
`;

const Hint = styled.p`
  ${type("caption")}
  margin-top: ${({ theme }) => theme.space(3)};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

interface Values {
  monthlyCap: number | null;
  alertPercent: number;
}

// The project's own spending cap for the current month, and (for admins) the
// form that sets it. Once the cap is reached, new calls are refused.
export function SpendLimitCard({
  projectId,
  limit,
  spent,
  canEdit,
}: {
  projectId: string;
  limit: SpendLimit;
  // This month's spend so far, for the "₹X of ₹Y" line.
  spent: number | null;
  canEdit: boolean;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const [saving, setSaving] = useState(false);
  const { monthlyCap: cap, alertPercent, used, reached } = limit;
  const share = used ?? 0;
  const tone: Tone = reached ? "danger" : share * 100 >= alertPercent ? "warn" : "ok";
  const percentUsed = Math.round(share * 100);

  const save = async (input: Values) => {
    setSaving(true);
    try {
      await updateSpendLimit(projectId, input);
      message.success(input.monthlyCap === null ? "Monthly limit removed" : "Monthly limit saved");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Could not save the limit.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel aria-labelledby="spend-limit">
      <PanelTitle id="spend-limit">Monthly limit</PanelTitle>
      {cap === null ? (
        <Lead>
          No limit set. Calls are never refused for spend.
          {canEdit && " Set one to stop new calls once this month's spend reaches it."}
        </Lead>
      ) : (
        <>
          <Lead>
            {spent !== null && (
              <>
                <b>{formatMoney(spent)}</b> of{" "}
              </>
            )}
            <b>{formatMoney(cap)}</b> used this month ({percentUsed}%). Admins are emailed at{" "}
            {alertPercent}%.
          </Lead>
          <Meter>
            <Track
              role="meter"
              aria-label="Share of the monthly limit used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(100, percentUsed)}
              aria-valuetext={`${percentUsed}% used${reached ? ", limit reached" : ""}`}
            >
              <Fill $tone={tone} style={{ width: `${Math.min(1, share) * 100}%` }} />
              <Threshold style={{ left: `calc(${alertPercent}% - 1px)` }} aria-hidden />
            </Track>
            <Scale aria-hidden>
              <span className="start">₹0</span>
              {alertPercent > 12 && alertPercent < 88 && (
                <span className="alert" style={{ left: `${alertPercent}%` }}>
                  Alert {alertPercent}%
                </span>
              )}
              <span className="end">{formatMoney(cap)}</span>
            </Scale>
          </Meter>
          {reached && (
            <Alert
              type="error"
              showIcon
              title="Limit reached"
              description={
                canEdit
                  ? "New calls are refused until next month. Raise or remove the limit to allow them now."
                  : "New calls are refused until next month, or until an admin raises the limit."
              }
              style={{ marginTop: 16 }}
            />
          )}
        </>
      )}

      {canEdit && (
        <Form<Values>
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{ monthlyCap: cap, alertPercent }}
          onFinish={(values) =>
            void save({ monthlyCap: values.monthlyCap ?? null, alertPercent: values.alertPercent })
          }
        >
          <Fields>
            <Form.Item
              name="monthlyCap"
              label="Limit per month"
              rules={[{ type: "number", min: 1, message: "Enter at least ₹1, or leave it empty" }]}
            >
              <InputNumber<number>
                prefix="₹"
                min={0}
                step={100}
                precision={2}
                placeholder="No limit"
                style={{ width: 180 }}
              />
            </Form.Item>
            <Form.Item
              name="alertPercent"
              label="Email admins at"
              rules={[{ required: true, message: "Enter a percentage" }]}
            >
              <InputNumber<number> suffix="%" min={1} max={100} precision={0} style={{ width: 120 }} />
            </Form.Item>
            <div className="buttons">
              <Button type="primary" htmlType="submit" loading={saving}>
                Save
              </Button>
              {cap !== null && (
                <Button
                  disabled={saving}
                  onClick={() => {
                    form.setFieldValue("monthlyCap", null);
                    void save({ monthlyCap: null, alertPercent: form.getFieldValue("alertPercent") });
                  }}
                >
                  Remove limit
                </Button>
              )}
            </div>
          </Fields>
          <Hint>
            Leave the limit empty for none. It applies per calendar month (UTC); admins get one
            email a month when spend passes the alert.
          </Hint>
        </Form>
      )}
    </Panel>
  );
}
