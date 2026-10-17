"use client";

import { Alert, App, Form, Input, Modal } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styled from "styled-components";
import { ApiError, createProject } from "@/lib/api";
import { routes } from "@/lib/routes";

interface Values {
  name: string;
  description?: string;
}

const Intro = styled.p`
  margin-bottom: ${({ theme }) => theme.space(5)};
  color: ${({ theme }) => theme.color.fgMuted};
`;

const ErrorSlot = styled.div`
  margin-bottom: ${({ theme }) => theme.space(4)};
`;

// Creates a project, then opens it.
export function CreateProjectModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (saving) return;
    setError(null);
    onClose();
  };

  const submit = async (values: Values) => {
    setSaving(true);
    setError(null);
    try {
      const project = await createProject({
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
      });
      message.success(`Project "${project.name}" created`);
      onClose();
      router.push(routes.project(project.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the project.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="New project"
      open={open}
      onCancel={close}
      onOk={() => form.submit()}
      okText="Create project"
      confirmLoading={saving}
      destroyOnHidden
      width={480}
    >
      <Intro>
        A project groups the call agents for one team or use case, along with their call history.
      </Intro>
      {error && (
        <ErrorSlot>
          <Alert type="error" showIcon title={error} />
        </ErrorSlot>
      )}
      <Form<Values>
        form={form}
        layout="vertical"
        requiredMark={false}
        preserve={false}
        onFinish={submit}
        disabled={saving}
      >
        <Form.Item
          name="name"
          label="Name"
          rules={[
            { required: true, whitespace: true, message: "Give the project a name" },
            { max: 80, message: "Keep the name under 80 characters" },
          ]}
        >
          <Input autoFocus placeholder="e.g. Fleet operations" autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="description"
          label="Description"
          extra="Optional. Shown on the project card."
          rules={[{ max: 240, message: "Keep the description under 240 characters" }]}
        >
          <Input.TextArea
            placeholder="What these calls are for"
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
