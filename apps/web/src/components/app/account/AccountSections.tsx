"use client";

import { DeleteOutlined, LogoutOutlined } from "@ant-design/icons";
import { Alert, App, Button, Form, Input, Modal } from "antd";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import styled from "styled-components";
import { PasswordStrength } from "@/components/auth/fields";
import { ThemeChoices, themeLabel } from "@oxumi/ui/theme/ThemeSwitch";
import { useThemeMode } from "@oxumi/ui/design/theme-mode";
import { type } from "@oxumi/ui/design/typography";
import {
  ApiError,
  changePassword,
  deleteAccount,
  logout,
  updateProfile,
  type User,
} from "@/lib/api";
import { routes } from "@/lib/routes";
import { formatDate } from "../projects/format";
import {
  FIELD_LAYOUT,
  Fields,
  SectionBody,
  SectionFoot,
  SettingsSection,
} from "../projects/SettingsPanels";
import { initials } from "../shell/UserMenu";

// The sections of the account page. Each owns one form and saves on its own.

export const ACCOUNT_SCOPE = "account";

export const ACCOUNT_SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "email", label: "Email" },
  { id: "password", label: "Password" },
  { id: "appearance", label: "Appearance" },
  { id: "session", label: "Session" },
  { id: "danger", label: "Danger zone" },
] as const;

const errorText = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : fallback;

const Notice = styled.div`
  margin-bottom: ${({ theme }) => theme.space(3)};

  .ant-alert {
    padding: ${({ theme }) => theme.space(1.5)} ${({ theme }) => theme.space(3)};
  }
`;

function Feedback({ error, success }: { error?: string | null; success?: ReactNode }) {
  if (!error && !success) return null;
  return (
    <Notice>
      <Alert type={error ? "error" : "success"} showIcon title={error ?? success} />
    </Notice>
  );
}

// ---- Profile --------------------------------------------------------------

const Identity = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};

  .avatar {
    ${type("caption")}
    display: grid;
    place-items: center;
    flex: none;
    width: ${({ theme }) => theme.space(8)};
    height: ${({ theme }) => theme.space(8)};
    border: 1px solid ${({ theme }) => theme.color.lineStrong};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.overlay};
    color: ${({ theme }) => theme.color.fg};
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  span:last-child {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

interface ProfileValues {
  name: string;
  company: string;
}

export function ProfileSection({ user }: { user: User }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<ProfileValues>();
  const [saving, setSaving] = useState(false);
  const values = Form.useWatch([], form);

  // Follow the saved profile, e.g. after it is changed in another tab.
  useEffect(() => {
    form.setFieldsValue({ name: user.name, company: user.company });
  }, [form, user.name, user.company]);

  const dirty =
    values !== undefined &&
    ((values.name ?? "").trim() !== user.name || (values.company ?? "").trim() !== user.company);

  const save = async (next: ProfileValues) => {
    setSaving(true);
    try {
      await updateProfile({ name: next.name.trim(), company: (next.company ?? "").trim() });
      message.success("Profile saved");
    } catch (err) {
      message.error(errorText(err, "Could not save your profile."));
    } finally {
      setSaving(false);
    }
  };

  // Preview the initials as the name is typed.
  const shown = { name: values?.name ?? user.name, email: user.email };

  return (
    <SettingsSection
      scope={ACCOUNT_SCOPE}
      id="profile"
      title="Profile"
      description="Who you are in Oxumi. Shown in the account menu."
      summary={
        <>
          {dirty && "Unsaved changes · "}
          {user.name || "No name"} · {user.company || "No company"}
        </>
      }
    >
      <Form<ProfileValues>
        form={form}
        // Prefixes the field ids, which would otherwise repeat across the forms.
        name="profile"
        {...FIELD_LAYOUT}
        initialValues={{ name: user.name, company: user.company }}
        onFinish={save}
      >
        <Fields>
          <div className="aligned">
            <span className="key">Avatar</span>
            <Identity>
              <span className="avatar" aria-hidden>
                {initials(shown)}
              </span>
              <span>Your initials · Member since {formatDate(user.createdAt)}</span>
            </Identity>
          </div>
          <Form.Item
            name="name"
            label="Full name"
            rules={[
              { required: true, whitespace: true, message: "Enter your name" },
              { max: 80, message: "Keep your name under 80 characters" },
            ]}
          >
            <Input autoComplete="name" />
          </Form.Item>
          <Form.Item
            name="company"
            label="Company"
            rules={[{ max: 120, message: "Keep the company name under 120 characters" }]}
          >
            <Input autoComplete="organization" placeholder="Optional" />
          </Form.Item>
        </Fields>
        <SectionFoot>
          <span className="hint" role="status">
            {dirty ? "Unsaved changes" : "Everything is saved"}
          </span>
          <Button disabled={!dirty || saving} onClick={() => form.resetFields()}>
            Discard
          </Button>
          <Button type="primary" htmlType="submit" loading={saving} disabled={!dirty}>
            Save changes
          </Button>
        </SectionFoot>
      </Form>
    </SettingsSection>
  );
}

// ---- Email ----------------------------------------------------------------

const CurrentValue = styled.dd`
  ${type("label")}
  color: ${({ theme }) => theme.color.fg};
  font-weight: 400;
  overflow-wrap: anywhere;
`;

interface EmailValues {
  email: string;
  currentPassword: string;
}

export function EmailSection({ user }: { user: User }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<EmailValues>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changedTo, setChangedTo] = useState<string | null>(null);

  const save = async (next: EmailValues) => {
    setSaving(true);
    setError(null);
    setChangedTo(null);
    try {
      const updated = await updateProfile({
        email: next.email.trim(),
        currentPassword: next.currentPassword,
      });
      form.resetFields();
      setChangedTo(updated.email);
      message.success("Email changed");
    } catch (err) {
      setError(errorText(err, "Could not change your email."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection
      scope={ACCOUNT_SCOPE}
      id="email"
      title="Email"
      description="The address you sign in with. Changing it needs your current password."
      summary={user.email}
    >
      <Form<EmailValues>
        form={form}
        // Prefixes the field ids, which would otherwise repeat across the forms.
        name="email"
        {...FIELD_LAYOUT}
        onFinish={save}
        onValuesChange={() => setError(null)}
      >
        <Fields>
          <Feedback
            error={error}
            success={changedTo && `Your email is now ${changedTo}. Use it the next time you sign in.`}
          />
          <dl className="aligned">
            <dt>Current email</dt>
            <CurrentValue>{user.email}</CurrentValue>
          </dl>
          <Form.Item
            name="email"
            label="New email"
            validateTrigger="onBlur"
            rules={[
              { required: true, message: "Enter the new email address" },
              { type: "email", message: "Enter a valid email address" },
              {
                validator: (_, value: string | undefined) =>
                  value && value.trim().toLowerCase() === user.email.toLowerCase()
                    ? Promise.reject(new Error("That is already your email"))
                    : Promise.resolve(),
              },
            ]}
          >
            <Input type="email" autoComplete="email" placeholder="you@company.com" />
          </Form.Item>
          <Form.Item
            name="currentPassword"
            label="Current password"
            rules={[{ required: true, message: "Enter your current password to confirm" }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
        </Fields>
        <SectionFoot>
          <Button type="primary" htmlType="submit" loading={saving}>
            Change email
          </Button>
        </SectionFoot>
      </Form>
    </SettingsSection>
  );
}

// ---- Password -------------------------------------------------------------

interface PasswordValues {
  currentPassword: string;
  newPassword: string;
  confirm: string;
}

export function PasswordSection() {
  const { message } = App.useApp();
  const [form] = Form.useForm<PasswordValues>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);
  const newPassword = Form.useWatch("newPassword", form) ?? "";

  const save = async (next: PasswordValues) => {
    setSaving(true);
    setError(null);
    setChanged(false);
    try {
      await changePassword({
        currentPassword: next.currentPassword,
        newPassword: next.newPassword,
      });
      form.resetFields();
      setChanged(true);
      message.success("Password changed");
    } catch (err) {
      setError(errorText(err, "Could not change your password."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection
      scope={ACCOUNT_SCOPE}
      id="password"
      title="Password"
      description="Changing your password signs you out on every other device."
      summary="Change your password"
    >
      <Form<PasswordValues>
        form={form}
        // Prefixes the field ids, which would otherwise repeat across the forms.
        name="password"
        {...FIELD_LAYOUT}
        onFinish={save}
        onValuesChange={() => setError(null)}
      >
        <Fields>
          <Feedback
            error={error}
            success={
              changed &&
              "Password changed. Every other device was signed out; this one stays signed in."
            }
          />
          <Form.Item
            name="currentPassword"
            label="Current password"
            rules={[{ required: true, message: "Enter your current password" }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="New password"
            extra={<PasswordStrength password={newPassword} />}
            rules={[
              { required: true, message: "Choose a new password" },
              { min: 8, message: "Use at least 8 characters" },
              ({ getFieldValue }) => ({
                validator: (_, value: string | undefined) =>
                  value && value === getFieldValue("currentPassword")
                    ? Promise.reject(new Error("Choose a password you are not using now"))
                    : Promise.resolve(),
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="Confirm password"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Type the new password again" },
              ({ getFieldValue }) => ({
                validator: (_, value: string | undefined) =>
                  !value || value === getFieldValue("newPassword")
                    ? Promise.resolve()
                    : Promise.reject(new Error("The two passwords do not match")),
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Fields>
        <SectionFoot>
          <Button type="primary" htmlType="submit" loading={saving}>
            Change password
          </Button>
        </SectionFoot>
      </Form>
    </SettingsSection>
  );
}

// ---- Session and danger zone ----------------------------------------------

const ActionRow = styled(SectionBody)`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  padding-block: ${({ theme }) => theme.space(3)};

  .text {
    flex: 1;
    min-width: min(100%, 260px);
  }
  h3 {
    ${type("label")}
    color: ${({ theme }) => theme.color.fg};
    overflow-wrap: anywhere;
  }
  p,
  li {
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
  ul {
    margin-top: ${({ theme }) => theme.space(1)};
    padding-left: ${({ theme }) => theme.space(4)};
    list-style: disc;
  }
`;

// ---- Appearance -----------------------------------------------------------

// Saved in this browser as it is chosen: there is nothing to submit.
export function AppearanceSection() {
  const { preference, mode } = useThemeMode();
  return (
    <SettingsSection
      scope={ACCOUNT_SCOPE}
      id="appearance"
      title="Appearance"
      description="Light or dark, or whichever your device is using. Applies everywhere on Oxumi in this browser."
      summary={`Theme: ${themeLabel(preference, mode)}`}
    >
      <SectionBody>
        <ThemeChoices />
      </SectionBody>
    </SettingsSection>
  );
}

export function SessionSection({ user }: { user: User }) {
  const router = useRouter();
  const { message } = App.useApp();
  const [leaving, setLeaving] = useState(false);

  const signOut = async () => {
    setLeaving(true);
    try {
      await logout();
      router.replace(routes.login);
    } catch (err) {
      setLeaving(false);
      message.error(errorText(err, "Could not log out."));
    }
  };

  return (
    <SettingsSection
      scope={ACCOUNT_SCOPE}
      id="session"
      title="Session"
      description="This browser's sign-in."
      summary={`Signed in as ${user.email}`}
    >
      <ActionRow>
        <div className="text">
          <h3>Signed in as {user.name ? `${user.name} (${user.email})` : user.email}</h3>
          <p>Logging out ends the session in this browser only.</p>
        </div>
        <Button icon={<LogoutOutlined />} loading={leaving} onClick={() => void signOut()}>
          Log out
        </Button>
      </ActionRow>
    </SettingsSection>
  );
}

const Confirm = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(4)};
  padding-top: ${({ theme }) => theme.space(2)};

  p {
    color: ${({ theme }) => theme.color.fgMuted};
  }
  strong {
    color: ${({ theme }) => theme.color.fg};
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  label {
    ${type("label")}
    display: block;
    margin-bottom: ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.color.fg};
  }
`;

export function DangerSection({ user }: { user: User }) {
  const router = useRouter();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailMatches = typed.trim().toLowerCase() === user.email.toLowerCase();
  const ready = emailMatches && password.length > 0;

  const close = () => {
    if (deleting) return;
    setOpen(false);
    setTyped("");
    setPassword("");
    setError(null);
  };

  const remove = async () => {
    if (!ready) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount(password);
      message.success("Your account was deleted");
      router.replace(routes.signup);
    } catch (err) {
      setError(errorText(err, "Could not delete your account."));
      setDeleting(false);
    }
  };

  return (
    <SettingsSection
      scope={ACCOUNT_SCOPE}
      id="danger"
      title="Danger zone"
      description="Actions here cannot be undone."
      summary="Delete your account"
      defaultOpen={false}
      danger
    >
      <ActionRow>
        <div className="text">
          <h3>Delete your account</h3>
          <p>This permanently removes, for {user.email}:</p>
          <ul>
            <li>your account and sign-in</li>
            <li>every project you own, with its agents and call flows</li>
            <li>all call history, transcripts and collected answers</li>
            <li>all API keys</li>
          </ul>
        </div>
        <Button danger icon={<DeleteOutlined />} onClick={() => setOpen(true)}>
          Delete account
        </Button>
      </ActionRow>
      <Modal
        title="Delete your account?"
        open={open}
        onCancel={close}
        onOk={() => void remove()}
        okText="Delete account"
        okButtonProps={{ danger: true, disabled: !ready }}
        confirmLoading={deleting}
        destroyOnHidden
        width={480}
      >
        <Confirm>
          <p>
            This deletes the account <strong>{user.email}</strong> together with all of its
            projects, agents, calls and API keys. It cannot be undone.
          </p>
          {error && <Alert type="error" showIcon title={error} />}
          <div>
            <label htmlFor="confirm-account-email">
              Type <strong>{user.email}</strong> to confirm
            </label>
            <Input
              id="confirm-account-email"
              autoFocus
              autoComplete="off"
              value={typed}
              disabled={deleting}
              onChange={(event) => setTyped(event.target.value)}
              status={typed && !emailMatches ? "warning" : undefined}
            />
          </div>
          <div>
            <label htmlFor="confirm-account-password">Your password</label>
            <Input.Password
              id="confirm-account-password"
              autoComplete="current-password"
              value={password}
              disabled={deleting}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
              onPressEnter={() => void remove()}
            />
          </div>
        </Confirm>
      </Modal>
    </SettingsSection>
  );
}
