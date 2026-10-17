"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Alert, App, Button, Form, Input, Modal, Radio, Table, Tag } from "antd";
import { useState } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { formatDateTime, Mono } from "@/components/app/kit";
import { RoleTip } from "@/components/app/knowledge/RoleTip";
import { plural } from "@/components/app/projects/format";
import { LoadError } from "@/components/app/projects/LoadError";
import { SectionBody, SettingsSection } from "@/components/app/projects/SettingsPanels";
import { ApiError, type ConsentRecord, recordConsent, useConsents } from "@/lib/api";
import { TableWrap, Toolbar } from "./DoNotCallSection";

// Who has agreed to be called, or taken that back. The latest record for a
// number is the one that counts.

const ModalBody = styled.div`
  padding-top: ${({ theme }) => theme.space(2)};

  .ant-form-item:last-child {
    margin-bottom: 0;
  }
  .ant-form-item-extra {
    ${type("caption")}
    margin-top: ${({ theme }) => theme.space(1)};
  }
`;

const Hint = styled.p`
  ${type("caption")}
  flex: 1 1 ${({ theme }) => theme.space(60)};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

interface Values {
  number: string;
  given: boolean;
  source?: string;
  note?: string;
}

function RecordConsentModal({
  projectId,
  open,
  onClose,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const close = () => {
    if (saving) return;
    form.resetFields();
    setFailure(null);
    onClose();
  };

  const save = async (values: Values) => {
    setSaving(true);
    setFailure(null);
    try {
      const record = await recordConsent(projectId, {
        number: values.number.trim(),
        given: values.given,
        source: (values.source ?? "").trim() || undefined,
        note: (values.note ?? "").trim() || undefined,
      });
      message.success(
        record.given
          ? `Recorded consent for ${record.number}`
          : `Recorded that ${record.number} withdrew consent`,
      );
      setSaving(false);
      close();
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : "Could not record consent.");
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Record consent"
      open={open}
      onCancel={close}
      onOk={() => form.submit()}
      okText="Record"
      confirmLoading={saving}
      destroyOnHidden
      width={480}
    >
      <ModalBody>
        {failure && (
          <Alert type="error" showIcon title={failure} style={{ marginBottom: 12 }} />
        )}
        <Form<Values>
          form={form}
          layout="vertical"
          requiredMark={false}
          disabled={saving}
          initialValues={{ given: true }}
          onFinish={(values) => void save(values)}
        >
          <Form.Item
            name="number"
            label="Number"
            extra="Include the country code."
            rules={[{ required: true, whitespace: true, message: "Enter a phone number" }]}
          >
            <Input placeholder="+919876543210" autoComplete="off" inputMode="tel" />
          </Form.Item>
          <Form.Item name="given" label="Consent">
            <Radio.Group
              optionType="button"
              options={[
                { value: true, label: "Given" },
                { value: false, label: "Withdrawn" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="source"
            label="Source"
            extra="Optional. Where it came from, so it can be shown later."
            rules={[{ max: 120, message: "Keep the source under 120 characters" }]}
          >
            <Input placeholder="Sign-up form" autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="note"
            label="Note"
            rules={[{ max: 200, message: "Keep the note under 200 characters" }]}
          >
            <Input placeholder="Optional" autoComplete="off" />
          </Form.Item>
        </Form>
      </ModalBody>
    </Modal>
  );
}

export function ConsentSection({
  projectId,
  canRecord,
  required,
}: {
  projectId: string;
  // Editors and above.
  canRecord: boolean;
  // Whether the rules only allow calls to numbers with consent.
  required: boolean;
}) {
  const consents = useConsents(projectId);
  const [recording, setRecording] = useState(false);

  const count = consents.data ? ` · ${plural(consents.data.length, "record")}` : "";

  return (
    <SettingsSection
      scope="compliance"
      id="consents"
      title="Consent records"
      description="Who agreed to be called, or took it back. The latest record for a number counts."
      summary={`${required ? "Required for every call" : "Not required"}${count}`}
    >
      <Toolbar>
        <Hint>
          {required
            ? "Consent is required, so numbers without a record here are not called."
            : "Consent is not required right now. Turn it on under Rules."}
        </Hint>
        <RoleTip allowed={canRecord} title="Editors and above can record consent">
          <Button icon={<PlusOutlined />} disabled={!canRecord} onClick={() => setRecording(true)}>
            Record consent
          </Button>
        </RoleTip>
      </Toolbar>
      {consents.error && !consents.data ? (
        <SectionBody>
          <LoadError
            compact
            error={consents.error}
            what="consent records"
            onRetry={() => void consents.mutate()}
          />
        </SectionBody>
      ) : (
        <TableWrap>
          <Table<ConsentRecord>
            rowKey="id"
            size="middle"
            loading={consents.isLoading}
            dataSource={consents.data ?? []}
            pagination={{ pageSize: 20, hideOnSinglePage: true, showSizeChanger: false }}
            scroll={{ x: 720 }}
            locale={{ emptyText: "No consent recorded yet." }}
            columns={[
              {
                title: "Number",
                dataIndex: "number",
                render: (number: string) => <Mono>{number}</Mono>,
              },
              {
                title: "Consent",
                dataIndex: "given",
                render: (given: boolean) => (
                  <Tag color={given ? "success" : "default"} variant="filled">
                    {given ? "Given" : "Withdrawn"}
                  </Tag>
                ),
              },
              {
                title: "Source",
                dataIndex: "source",
                render: (source: string, record) => (
                  <span className="note">
                    {[source, record.note].filter(Boolean).join(" · ") || "—"}
                  </span>
                ),
              },
              {
                title: "Captured",
                dataIndex: "capturedAt",
                render: (iso: string) => formatDateTime(iso),
              },
            ]}
          />
        </TableWrap>
      )}
      <RecordConsentModal
        projectId={projectId}
        open={recording}
        onClose={() => setRecording(false)}
      />
    </SettingsSection>
  );
}
