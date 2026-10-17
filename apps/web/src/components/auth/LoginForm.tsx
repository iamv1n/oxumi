"use client";

import { Alert, Button, Checkbox, Form, Input } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, login, useSession } from "@/lib/api";
import { routes } from "@/lib/routes";
import AuthLayout from "./AuthLayout";
import { AuthForm, LabelRow, safeNext, SubmitRow, withNext } from "./fields";

interface Values {
  email: string;
  password: string;
  remember: boolean;
}

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const justReset = params.get("reset") === "1";
  const { user } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace(next);
  }, [user, router, next]);

  async function submit(values: Values) {
    setError(null);
    setBusy(true);
    try {
      await login(values);
      router.replace(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in"
      description="Pick up where your agents left off."
      footer={
        <>
          New to Oxumi?{" "}
          <Link href={withNext(routes.signup, next)}>Create an account</Link>
        </>
      }
    >
      {justReset && !error && (
        <Alert
          type="success"
          showIcon
          title="Password updated. Sign in with your new password."
          style={{ marginBottom: 20 }}
        />
      )}
      {error && (
        <Alert type="error" showIcon title={error} style={{ marginBottom: 20 }} />
      )}
      <AuthForm<Values>
        layout="vertical"
        requiredMark={false}
        initialValues={{ remember: true }}
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
        <Form.Item
          name="password"
          label={
            <LabelRow>
              Password
              <Link href={routes.forgotPassword}>Forgot password?</Link>
            </LabelRow>
          }
          rules={[{ required: true, message: "Enter your password" }]}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item name="remember" valuePropName="checked">
          <Checkbox>Keep me signed in on this device</Checkbox>
        </Form.Item>
        <SubmitRow>
          <Button type="primary" htmlType="submit" block loading={busy}>
            Sign in
          </Button>
        </SubmitRow>
      </AuthForm>
    </AuthLayout>
  );
}
