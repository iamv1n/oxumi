"use client";

import {
  DeleteOutlined,
  ExclamationCircleFilled,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Alert, App, Button, Form, Input, Modal, Table, Tag } from "antd";
import Link from "next/link";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { formatDateTime, Mono } from "@/components/app/kit";
import { RoleTip } from "@/components/app/knowledge/RoleTip";
import { plural } from "@/components/app/projects/format";
import { LoadError } from "@/components/app/projects/LoadError";
import { SectionBody, SettingsSection } from "@/components/app/projects/SettingsPanels";
import {
  addDoNotCall,
  ApiError,
  type DoNotCallEntry,
  removeDoNotCall,
  useDoNotCall,
} from "@/lib/api";
import { routes } from "@/lib/routes";
import { REASON } from "./labels";

// Numbers the project's agents never call.

export const Toolbar = styled(SectionBody)`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  padding-bottom: ${({ theme }) => theme.space(3)};

  .grow {
    flex: 1 1 ${({ theme }) => theme.space(60)};
    max-width: 360px;
  }
`;

// Full-bleed table under the toolbar.
export const TableWrap = styled.div`
  border-top: 1px solid ${({ theme }) => theme.color.line};

  .ant-table-wrapper .ant-table {
    background: transparent;
  }
  .note {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

const ModalBody = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};
  padding-top: ${({ theme }) => theme.space(2)};

  .ant-form-item:last-child {
    margin-bottom: 0;
  }
  .ant-form-item-extra {
    ${type("caption")}
    margin-top: ${({ theme }) => theme.space(1)};
  }
`;

interface AddValues {
  numbers: string;
  note?: string;
}

function AddNumbersModal({
  projectId,
  open,
  onClose,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<AddValues>();
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  // After a save with bad entries: how many went in, and what did not.
  const [partial, setPartial] = useState<{ added: number; invalid: string[] } | null>(null);

  const close = () => {
    if (saving) return;
    form.resetFields();
    setFailure(null);
    setPartial(null);
    onClose();
  };

  const save = async (values: AddValues) => {
    setSaving(true);
    setFailure(null);
    try {
      const result = await addDoNotCall(projectId, values.numbers, (values.note ?? "").trim());
      setSaving(false);
      if (result.invalid.length === 0) {
        message.success(`Added ${plural(result.added, "number")} to the do-not-call list`);
        close();
        return;
      }
      // Leave only the entries that need fixing in the box.
      setPartial(result);
      form.setFieldValue("numbers", result.invalid.join("\n"));
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : "Could not add the numbers.");
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Add to the do-not-call list"
      open={open}
      onCancel={close}
      onOk={() => form.submit()}
      okText="Add numbers"
      cancelText={partial ? "Done" : "Cancel"}
      confirmLoading={saving}
      destroyOnHidden
      width={520}
    >
      <ModalBody>
        {failure && <Alert type="error" showIcon title={failure} />}
        {partial && (
          <Alert
            type="warning"
            showIcon
            title={`Added ${plural(partial.added, "number")}. ${
              partial.invalid.length === 1
                ? "1 entry isn't a valid phone number."
                : `${partial.invalid.length} entries aren't valid phone numbers.`
            }`}
            description="They are left below. Fix and add them, or close."
          />
        )}
        <Form<AddValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          disabled={saving}
          onFinish={(values) => void save(values)}
        >
          <Form.Item
            name="numbers"
            label="Numbers"
            extra="One per line, or separated by commas. Include the country code."
            rules={[{ required: true, whitespace: true, message: "Enter at least one number" }]}
          >
            <Input.TextArea
              autoSize={{ minRows: 4, maxRows: 10 }}
              placeholder={"+919876543210\n+919812345678"}
              spellCheck={false}
            />
          </Form.Item>
          <Form.Item
            name="note"
            label="Note"
            extra="Optional. Why these numbers are on the list."
            rules={[{ max: 200, message: "Keep the note under 200 characters" }]}
          >
            <Input placeholder="Asked by email on 3 Oct" autoComplete="off" />
          </Form.Item>
        </Form>
      </ModalBody>
    </Modal>
  );
}

export function DoNotCallSection({
  projectId,
  canAdd,
  canRemove,
}: {
  projectId: string;
  // Editors and above.
  canAdd: boolean;
  // Admins and owners.
  canRemove: boolean;
}) {
  const { message, modal } = App.useApp();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const list = useDoNotCall(projectId, query);

  // Search once typing pauses.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const remove = (entry: DoNotCallEntry) =>
    modal.confirm({
      title: `Remove ${entry.number}?`,
      icon: <ExclamationCircleFilled />,
      content:
        entry.reason === "opted_out"
          ? "This person asked not to be called. Removing the number lets agents call it again."
          : "Agents will be able to call this number again.",
      okText: "Remove",
      okButtonProps: { danger: true },
      cancelText: "Keep it",
      focusable: { autoFocusButton: "cancel" },
      onOk: async () => {
        setRemoving(entry.number);
        try {
          await removeDoNotCall(projectId, entry.number);
          message.success(`Removed ${entry.number}`);
        } catch (err) {
          message.error(err instanceof ApiError ? err.message : "Could not remove the number.");
        } finally {
          setRemoving(null);
        }
      },
    });

  const count = list.data && !query ? ` · ${plural(list.data.length, "number")}` : "";

  return (
    <SettingsSection
      scope="compliance"
      id="do-not-call"
      title="Do-not-call list"
      description="Numbers your agents never call."
      summary={`Numbers your agents never call${count}`}
    >
      <Toolbar>
        <Input
          className="grow"
          aria-label="Search numbers"
          placeholder="Search numbers"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          allowClear
        />
        <RoleTip allowed={canAdd} title="Editors and above can add numbers">
          <Button icon={<PlusOutlined />} disabled={!canAdd} onClick={() => setAdding(true)}>
            Add numbers
          </Button>
        </RoleTip>
      </Toolbar>
      {list.error && !list.data ? (
        <SectionBody>
          <LoadError
            compact
            error={list.error}
            what="the do-not-call list"
            onRetry={() => void list.mutate()}
          />
        </SectionBody>
      ) : (
        <TableWrap>
          <Table<DoNotCallEntry>
            rowKey="id"
            size="middle"
            loading={list.isLoading}
            dataSource={list.data ?? []}
            pagination={{ pageSize: 20, hideOnSinglePage: true, showSizeChanger: false }}
            scroll={{ x: 760 }}
            locale={{
              emptyText: query ? "No numbers match this search." : "No numbers on the list yet.",
            }}
            columns={[
              {
                title: "Number",
                dataIndex: "number",
                render: (number: string) => <Mono>{number}</Mono>,
              },
              {
                title: "Reason",
                dataIndex: "reason",
                render: (reason: DoNotCallEntry["reason"]) => (
                  <Tag color={REASON[reason]?.color ?? "default"} variant="filled">
                    {REASON[reason]?.label ?? reason}
                  </Tag>
                ),
              },
              {
                title: "Note",
                dataIndex: "note",
                render: (note: string, entry) => (
                  <span className="note">
                    {note || (entry.callId ? null : "—")}
                    {entry.callId && (
                      <>
                        {note && " · "}
                        <Link href={routes.call(projectId, entry.callId)}>View call</Link>
                      </>
                    )}
                  </span>
                ),
              },
              {
                title: "Added",
                dataIndex: "createdAt",
                render: (iso: string) => formatDateTime(iso),
              },
              {
                key: "actions",
                align: "right",
                width: 64,
                render: (_, entry) => (
                  <RoleTip allowed={canRemove} title="Admins and owners can remove numbers">
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      aria-label={`Remove ${entry.number}`}
                      disabled={!canRemove || removing === entry.number}
                      onClick={() => remove(entry)}
                    />
                  </RoleTip>
                ),
              },
            ]}
          />
        </TableWrap>
      )}
      <AddNumbersModal projectId={projectId} open={adding} onClose={() => setAdding(false)} />
    </SettingsSection>
  );
}
