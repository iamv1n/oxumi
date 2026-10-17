"use client";

import { Alert, App, Button, Checkbox, Form, Input, Select, Switch } from "antd";
import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { RoleTip } from "@/components/app/knowledge/RoleTip";
import {
  FIELD_LAYOUT,
  Fields,
  SectionFoot,
  SettingsSection,
} from "@/components/app/projects/SettingsPanels";
import { ApiError, type ComplianceSettings, updateCompliance } from "@/lib/api";
import {
  allTimeZones,
  describeDays,
  ownTimeZone,
  timeIn,
  TIMES,
  WEEKDAYS,
} from "./labels";

// When and how the project's agents may place phone calls.

const DISCLOSURE_MAX = 300;

const Hours = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};

  .ant-select {
    width: ${({ theme }) => theme.space(28)};
  }
`;

const Days = styled(Checkbox.Group)`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(3)};
`;

// What is compared to decide whether the form differs from the saved rules.
function normalise(v: Partial<ComplianceSettings> | undefined): ComplianceSettings {
  return {
    timezone: v?.timezone ?? "",
    callingHours: {
      enabled: v?.callingHours?.enabled ?? false,
      start: v?.callingHours?.start ?? "",
      end: v?.callingHours?.end ?? "",
      days: [...(v?.callingHours?.days ?? [])].sort(),
    },
    disclosure: (v?.disclosure ?? "").trim(),
    requireConsent: v?.requireConsent ?? false,
    honourOptOuts: v?.honourOptOuts ?? false,
  };
}

// "Asia/Kolkata · 09:00–21:00, Mon–Sat · consent required"
function rulesSummary(rules: ComplianceSettings): string {
  const hours = rules.callingHours.enabled
    ? `${rules.callingHours.start}–${rules.callingHours.end}, ${describeDays(rules.callingHours.days)}`
    : "Any time";
  return [
    rules.timezone,
    hours,
    rules.requireConsent ? "consent required" : "consent not required",
    rules.disclosure ? "disclosure on" : "no disclosure",
  ].join(" · ");
}

// Suggested zones first, then every other zone the browser knows.
function zoneOptions(current: string) {
  const own = ownTimeZone();
  const suggested = [...new Set(["Asia/Kolkata", "UTC", ...(own ? [own] : []), current])].filter(
    Boolean,
  );
  const label = (zone: string) =>
    zone === own && zone !== "UTC" && zone !== "Asia/Kolkata" ? `${zone} (your time zone)` : zone;
  return [
    {
      label: "Suggested",
      title: "Suggested",
      options: suggested.map((zone) => ({ value: zone, label: label(zone) })),
    },
    {
      label: "All time zones",
      title: "All time zones",
      options: allTimeZones()
        .filter((zone) => !suggested.includes(zone))
        .map((zone) => ({ value: zone, label: zone })),
    },
  ];
}

export function RulesSection({
  projectId,
  rules,
  canEdit,
}: {
  projectId: string;
  rules: ComplianceSettings;
  canEdit: boolean;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<ComplianceSettings>();
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const values = Form.useWatch([], form) as Partial<ComplianceSettings> | undefined;

  const baseline = JSON.stringify(normalise(rules));
  const dirty = values !== undefined && JSON.stringify(normalise(values)) !== baseline;

  // Follow the saved rules, e.g. after a save in another tab.
  useEffect(() => {
    form.setFieldsValue(rules);
  }, [form, rules]);

  const zone = values?.timezone ?? rules.timezone;
  const options = useMemo(() => zoneOptions(rules.timezone), [rules.timezone]);
  const now = timeIn(zone);
  const hoursOn = values?.callingHours?.enabled ?? rules.callingHours.enabled;
  const start = values?.callingHours?.start ?? rules.callingHours.start;
  const end = values?.callingHours?.end ?? rules.callingHours.end;

  // Saved values that are not on the quarter hour still show.
  const timeOptions = [...new Set([...TIMES, rules.callingHours.start, rules.callingHours.end])]
    .sort()
    .map((time) => ({ value: time, label: time }));

  const save = async (next: ComplianceSettings) => {
    setSaving(true);
    setFailure(null);
    try {
      await updateCompliance(projectId, normalise(next));
      message.success("Rules saved");
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : "Could not save the rules.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection
      scope="compliance"
      id="rules"
      title="Rules"
      description="Checked every time a phone call is placed."
      summary={
        <>
          {dirty && "Unsaved changes · "}
          {rulesSummary(rules)}
        </>
      }
    >
      <Form<ComplianceSettings>
        form={form}
        {...FIELD_LAYOUT}
        initialValues={rules}
        disabled={!canEdit || saving}
        onFinish={(next) => void save(next)}
      >
        <Fields>
          <Form.Item
            name="timezone"
            label="Time zone"
            extra={now ? `Calling hours are in this zone. It is ${now} there now.` : undefined}
            rules={[{ required: true, message: "Choose a time zone" }]}
          >
            <Select options={options} showSearch={{ optionFilterProp: "label" }} />
          </Form.Item>
          <Form.Item
            name={["callingHours", "enabled"]}
            label="Calling hours"
            valuePropName="checked"
            extra={hoursOn ? undefined : "Off: calls can be placed at any time of day."}
          >
            <Switch checkedChildren="On" unCheckedChildren="Off" />
          </Form.Item>
          {/* Hidden rather than removed while hours are off, so the times and
              days are kept and still saved. */}
          <Form.Item
            hidden={!hoursOn}
            label="Between"
            extra={
              start && end && end < start
                ? "Runs past midnight. Calls stop just before the end time."
                : "Calls stop just before the end time."
            }
          >
            <Hours>
              <Form.Item name={["callingHours", "start"]} noStyle>
                <Select aria-label="Start time" options={timeOptions} showSearch />
              </Form.Item>
              <span>and</span>
              <Form.Item
                name={["callingHours", "end"]}
                noStyle
                dependencies={[
                  ["callingHours", "start"],
                  ["callingHours", "enabled"],
                ]}
                rules={[
                  ({ getFieldValue }) => ({
                    validator: (_, value: string) =>
                      getFieldValue(["callingHours", "enabled"]) &&
                      value === getFieldValue(["callingHours", "start"])
                        ? Promise.reject(new Error("Start and end can't be the same"))
                        : Promise.resolve(),
                  }),
                ]}
              >
                <Select aria-label="End time" options={timeOptions} showSearch />
              </Form.Item>
            </Hours>
          </Form.Item>
          <Form.Item
            hidden={!hoursOn}
            name={["callingHours", "days"]}
            label="On"
            dependencies={[["callingHours", "enabled"]]}
            rules={[
              ({ getFieldValue }) => ({
                validator: (_, days: number[]) =>
                  !getFieldValue(["callingHours", "enabled"]) || days?.length
                    ? Promise.resolve()
                    : Promise.reject(new Error("Choose at least one day")),
              }),
            ]}
          >
            <Days options={WEEKDAYS.map((day) => ({ value: day.value, label: day.short }))} />
          </Form.Item>
          <Form.Item
            name="disclosure"
            label="Disclosure"
            extra={`Spoken before the flow's opening on every call, up to ${DISCLOSURE_MAX} characters. Leave empty for none.`}
            rules={[
              {
                max: DISCLOSURE_MAX,
                message: `Keep the disclosure under ${DISCLOSURE_MAX} characters`,
              },
            ]}
          >
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              maxLength={DISCLOSURE_MAX}
              placeholder="This call is from Acme Logistics and may be recorded."
            />
          </Form.Item>
          <Form.Item
            name="requireConsent"
            label="Require consent"
            valuePropName="checked"
            extra="Only call numbers whose latest consent record says consent was given."
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="honourOptOuts"
            label="Honour opt-outs"
            valuePropName="checked"
            extra="Callers who ask not to be called again go on the do-not-call list."
          >
            <Switch />
          </Form.Item>
          {failure && (
            <Alert
              type="error"
              showIcon
              closable
              onClose={() => setFailure(null)}
              title="Rules were not saved"
              description={failure}
            />
          )}
        </Fields>
        <SectionFoot>
          <span className="hint" role="status">
            {!canEdit
              ? "Only admins and owners can change these rules."
              : dirty
                ? "Unsaved changes"
                : "Everything is saved"}
          </span>
          <Button disabled={!canEdit || !dirty || saving} onClick={() => form.resetFields()}>
            Discard
          </Button>
          <RoleTip allowed={canEdit} title="Admins and owners can change the rules">
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              disabled={!canEdit || !dirty}
            >
              Save rules
            </Button>
          </RoleTip>
        </SectionFoot>
      </Form>
    </SettingsSection>
  );
}
