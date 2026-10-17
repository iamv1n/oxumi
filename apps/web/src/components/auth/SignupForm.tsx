"use client";

import { Alert, Button, Checkbox, Form, Input } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, signup, useSession } from "@/lib/api";
import { routes } from "@/lib/routes";
import AuthLayout from "./AuthLayout";
import {
  AuthForm,
  Optional,
  PasswordStrength,
  Row,
  safeNext,
  SubmitRow,
  withNext,
} from "./fields";

interface Values {
  name: string;
  company?: string;
  email: string;
  password: string;
  acceptTerms: boolean;
}

export default function SignupForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { user } = useSession();
  const [form] = Form.useForm<Values>();
  const password = Form.useWatch("password", form) ?? "";
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace(next);
  }, [user, router, next]);

  async function submit(values: Values) {
    setError(null);
    setBusy(true);
    try {
      await signup(values);
      router.replace(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Get started"
      title="Create your account"
      description="Set up a project and design your first call flow in minutes."
      footer={
        <>
          Already have an account?{" "}
          <Link href={withNext(routes.login, next)}>Sign in</Link>
        </>
      }
    >
      {error && (
        <Alert type="error" showIcon title={error} style={{ marginBottom: 20 }} />
      )}
      <AuthForm<Values>
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={submit}
        disabled={busy}
      >
        <Row>
          <Form.Item
            name="name"
            label="Full name"
            rules={[{ required: true, whitespace: true, message: "Enter your name" }]}
          >
            <Input autoComplete="name" placeholder="Asha Verma" autoFocus />
          </Form.Item>
          <Form.Item
            name="company"
            label={
              <>
                Company<Optional>optional</Optional>
              </>
            }
          >
            <Input autoComplete="organization" placeholder="Where you work" />
          </Form.Item>
        </Row>
        <Form.Item
          name="email"
          label="Work email"
          rules={[
            { required: true, message: "Enter your email" },
            { type: "email", message: "That doesn't look like an email address" },
          ]}
        >
          <Input type="email" autoComplete="email" placeholder="you@company.com" />
        </Form.Item>
        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: true, message: "Choose a password" },
            { min: 8, message: "Use at least 8 characters" },
          ]}
          extra={<PasswordStrength password={password} />}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="acceptTerms"
          valuePropName="checked"
          rules={[
            {
              validator: (_, checked) =>
                checked
                  ? Promise.resolve()
                  : Promise.reject(new Error("Please accept the terms to continue")),
            },
          ]}
        >
          <Checkbox>
            I agree to the{" "}
            <Link href={routes.terms} target="_blank">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href={routes.privacy} target="_blank">
              Privacy Policy
            </Link>
          </Checkbox>
        </Form.Item>
        <SubmitRow>
          <Button type="primary" htmlType="submit" block loading={busy}>
            Create account
          </Button>
        </SubmitRow>
      </AuthForm>
    </AuthLayout>
  );
}
