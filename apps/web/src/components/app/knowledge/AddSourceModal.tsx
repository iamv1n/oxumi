"use client";

import { FileTextOutlined, GlobalOutlined, UploadOutlined } from "@ant-design/icons";
import { Alert, App, Button, Form, Input, Modal, Segmented } from "antd";
import { useRef, useState } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { addKnowledge, ApiError } from "@/lib/api";

// Adds one source to the knowledge base: pasted text (or a text file read in
// the browser) or a web page the server fetches.

export const MAX_CHARACTERS = 200_000;

type Mode = "text" | "url";

interface Values {
  title?: string;
  text?: string;
  url?: string;
}

const Body = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(4)};
  padding-top: ${({ theme }) => theme.space(2)};

  .ant-form-item:last-child {
    margin-bottom: 0;
  }
  .ant-form-item-extra {
    ${type("caption")}
    margin-top: ${({ theme }) => theme.space(1)};
  }
`;

const FileRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  margin: -${({ theme }) => theme.space(2)} 0 ${({ theme }) => theme.space(4)};

  span {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  input {
    display: none;
  }
`;

// "faq-2026.md" → "faq-2026"
const titleFromFile = (name: string) => name.replace(/\.[^.]+$/, "").trim();

export function AddSourceModal({
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
  const [mode, setMode] = useState<Mode>("text");
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const close = () => {
    if (saving) return;
    form.resetFields();
    setFailure(null);
    setMode("text");
    onClose();
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      form.setFieldValue("text", text);
      if (!form.getFieldValue("title")) form.setFieldValue("title", titleFromFile(file.name));
      void form.validateFields(["text"]).catch(() => undefined);
    };
    reader.onerror = () => message.error(`Could not read ${file.name}.`);
    reader.readAsText(file);
  };

  const save = async (values: Values) => {
    setSaving(true);
    setFailure(null);
    try {
      const title = (values.title ?? "").trim();
      const source = await addKnowledge(
        projectId,
        mode === "text"
          ? { title, text: values.text ?? "" }
          : { url: (values.url ?? "").trim(), ...(title ? { title } : {}) },
      );
      if (source.status === "failed")
        message.warning(`Added "${source.title}", but it could not be read: ${source.error ?? "unknown error"}`);
      else message.success(`Added "${source.title}"`);
      setSaving(false);
      close();
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : "Could not add the source.");
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Add a source"
      open={open}
      onCancel={close}
      onOk={() => form.submit()}
      okText="Add source"
      confirmLoading={saving}
      destroyOnHidden
      width={640}
    >
      <Body>
        <Segmented<Mode>
          block
          value={mode}
          onChange={(next) => {
            setMode(next);
            setFailure(null);
          }}
          disabled={saving}
          options={[
            { value: "text", label: "Paste text", icon: <FileTextOutlined /> },
            { value: "url", label: "Web page", icon: <GlobalOutlined /> },
          ]}
        />
        {failure && <Alert type="error" showIcon title={failure} />}
        <Form<Values>
          form={form}
          layout="vertical"
          requiredMark={false}
          disabled={saving}
          onFinish={(values) => void save(values)}
        >
          {mode === "text" ? (
            <>
              <Form.Item
                name="title"
                label="Title"
                rules={[
                  { required: true, whitespace: true, message: "Give the source a title" },
                  { max: 200, message: "Keep the title under 200 characters" },
                ]}
              >
                <Input placeholder="Delivery FAQ" autoComplete="off" />
              </Form.Item>
              <Form.Item
                name="text"
                label="Text"
                extra="Plain facts work best: prices, hours, policies, answers to common questions."
                rules={[
                  { required: true, whitespace: true, message: "Paste some text" },
                  {
                    max: MAX_CHARACTERS,
                    message: `A source can hold up to ${MAX_CHARACTERS.toLocaleString()} characters`,
                  },
                ]}
              >
                <Input.TextArea
                  autoSize={{ minRows: 8, maxRows: 16 }}
                  showCount
                  maxLength={MAX_CHARACTERS}
                  placeholder="Paste the text the agent may answer from."
                />
              </Form.Item>
              <FileRow>
                <Button size="small" icon={<UploadOutlined />} onClick={() => fileInput.current?.click()}>
                  Choose a file
                </Button>
                <span>.txt or .md, read in your browser</span>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".txt,.md,.markdown,text/plain,text/markdown"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) readFile(file);
                    // Lets the same file be chosen again.
                    event.target.value = "";
                  }}
                />
              </FileRow>
            </>
          ) : (
            <>
              <Form.Item
                name="url"
                label="Page address"
                extra="An HTML page or plain text file. PDFs can't be read; paste their text instead."
                rules={[
                  { required: true, whitespace: true, message: "Enter the page's address" },
                  { type: "url", message: "Enter a full address starting with https://" },
                ]}
              >
                <Input placeholder="https://example.com/help/delivery" autoComplete="off" spellCheck={false} />
              </Form.Item>
              <Form.Item
                name="title"
                label="Title"
                extra="Optional. The page's own title is used when this is empty."
                rules={[{ max: 200, message: "Keep the title under 200 characters" }]}
              >
                <Input autoComplete="off" />
              </Form.Item>
            </>
          )}
        </Form>
      </Body>
    </Modal>
  );
}
