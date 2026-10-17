"use client";

import { Alert, App, Form, Input, Modal, Radio } from "antd";
import { useState } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { type Invite, inviteMember, type ProjectRole } from "@/lib/api";
import { assignableRoles, ROLE } from "./roles";

interface Values {
  email: string;
  role: Invite["role"];
}

const Lead = styled.p`
  ${type("body")}
  margin-bottom: ${({ theme }) => theme.space(4)};
  color: ${({ theme }) => theme.color.fgMuted};
`;

// One role per row, each with a line on what it allows.
const Roles = styled(Radio.Group)`
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.control};
  overflow: hidden;

  .ant-radio-wrapper {
    display: flex;
    align-items: flex-start;
    width: 100%;
    margin: 0;
    padding: ${({ theme }) => theme.space(2.5)} ${({ theme }) => theme.space(3)};
  }
  .ant-radio-wrapper + .ant-radio-wrapper {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
  .ant-radio-wrapper-checked {
    background: ${({ theme }) => theme.color.accentSoft};
  }
  .ant-radio-label {
    display: flex;
    flex-direction: column;
  }
  b {
    font-weight: 500;
    color: ${({ theme }) => theme.color.fg};
  }
  small {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

export function InviteModal({
  projectId,
  myRole,
  open,
  onClose,
}: {
  projectId: string;
  myRole: ProjectRole | undefined;
  open: boolean;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roles = assignableRoles(myRole);

  const close = () => {
    setError(null);
    onClose();
  };

  const submit = async (values: Values) => {
    setSaving(true);
    setError(null);
    try {
      const invite = await inviteMember(projectId, {
        email: values.email.trim().toLowerCase(),
        role: values.role,
      });
      message.success(`Invitation sent to ${invite.email}`);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the invitation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Invite someone"
      open={open}
      onCancel={close}
      onOk={() => form.submit()}
      okText="Send invitation"
      confirmLoading={saving}
      destroyOnHidden
      width={480}
    >
      <Lead>
        We&apos;ll email them a link that works for 7 days. They accept it signed in with this
        address.
      </Lead>
      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}
      <Form<Values>
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ role: "editor" }}
        onFinish={(values) => void submit(values)}
      >
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Enter their email address" },
            { type: "email", message: "Enter a valid email address" },
          ]}
        >
          <Input type="email" autoComplete="off" placeholder="name@company.com" autoFocus />
        </Form.Item>
        <Form.Item name="role" label="Role" style={{ marginBottom: 0 }}>
          <Roles>
            {roles.map((role) => (
              <Radio key={role} value={role}>
                <b>{ROLE[role].label}</b>
                <small>{ROLE[role].description}</small>
              </Radio>
            ))}
          </Roles>
        </Form.Item>
      </Form>
    </Modal>
  );
}
