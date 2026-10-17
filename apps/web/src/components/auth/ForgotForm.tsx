"use client";

import { MailOutlined } from "@ant-design/icons";
import { Alert, Button, Form, Input, Result } from "antd";
import Link from "next/link";
import { useState } from "react";
import { ApiError, requestPasswordReset } from "@/lib/api";
import { routes } from "@/lib/routes";
import AuthLayout from "./AuthLayout";
import { AuthForm, SubmitRow } from "./fields";

export default function ForgotForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit({ email }: { email: string }) {
    setError(null);
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setSentTo(email);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const back = <Link href={routes.login}>Back to sign in</Link>;

  if (sentTo) {
    return (
      <AuthLayout
      eyebrow="Account recovery"
        title="Check your email"
        description={
          <>
            If an account exists for <strong>{sentTo}</strong>, a link to choose a
            new password is on its way. It works once and expires in an hour.
          </>
        }
        footer={back}
      >
        <Result
          icon={<MailOutlined />}
          style={{ padding: "8px 0 0" }}
          extra={
            <Button onClick={() => setSentTo(null)}>Use a different email</Button>
          }
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Forgot your password?"
      description="Enter the email you signed up with and we'll send you a link to choose a new one."
      footer={back}
    >
      {error && (
        <Alert type="error" showIcon title={error} style={{ marginBottom: 20 }} />
      )}
      <AuthForm<{ email: string }>
        layout="vertical"
        requiredMark={false}
        onFinish={submit}
        disabled={busy}
      >
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Enter your email" },
            { type: "email", message: "That doesn't look like an email address" },
          ]}
        >
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            autoFocus
          />
        </Form.Item>
        <SubmitRow>
          <Button type="primary" htmlType="submit" block loading={busy}>
            Send reset link
          </Button>
        </SubmitRow>
      </AuthForm>
    </AuthLayout>
  );
}
