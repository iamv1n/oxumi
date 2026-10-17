"use client";

import { Alert, Button, Form, Input } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ApiError, resetPassword } from "@/lib/api";
import { routes } from "@/lib/routes";
import AuthLayout from "./AuthLayout";
import { AuthForm, PasswordStrength, SubmitRow } from "./fields";

export default function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [form] = Form.useForm<{ password: string }>();
  const password = Form.useWatch("password", form) ?? "";
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(values: { password: string }) {
    setError(null);
    setBusy(true);
    try {
      await resetPassword({ token, password: values.password });
      router.replace(`${routes.login}?reset=1`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  const requestNew = <Link href={routes.forgotPassword}>Request a new link</Link>;

  if (!token) {
    return (
      <AuthLayout
      eyebrow="Account recovery"
        title="This link is incomplete"
        description="The reset link is missing its code. Open the link from your email again, or request a new one."
        footer={requestNew}
      >
        <Link href={routes.login}>
          <Button block>Back to sign in</Button>
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Choose a new password"
      description="You'll be signed out everywhere else once it's changed."
      footer={<Link href={routes.login}>Back to sign in</Link>}
    >
      {error && (
        <Alert
          type="error"
          showIcon
          title={error}
          action={requestNew}
          style={{ marginBottom: 20 }}
        />
      )}
      <AuthForm<{ password: string }>
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={submit}
        disabled={busy}
      >
        <Form.Item
          name="password"
          label="New password"
          rules={[
            { required: true, message: "Choose a password" },
            { min: 8, message: "Use at least 8 characters" },
          ]}
          extra={<PasswordStrength password={password} />}
        >
          <Input.Password autoComplete="new-password" autoFocus />
        </Form.Item>
        <SubmitRow>
          <Button type="primary" htmlType="submit" block loading={busy}>
            Update password
          </Button>
        </SubmitRow>
      </AuthForm>
    </AuthLayout>
  );
}
