"use client";

import { Form } from "antd";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { routes } from "@/lib/routes";

// One consistent structure for every auth form: label directly above its
// control, a fixed gap between fields, helper and error text underneath.
export const AuthForm = styled(Form)`
  .ant-form-item {
    margin-bottom: ${({ theme }) => theme.space(5)};
  }
  .ant-form-item-label {
    padding-bottom: ${({ theme }) => theme.space(1.5)};
  }
  .ant-form-item-label > label {
    width: 100%;
    height: auto;
    ${type("label")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
  .ant-checkbox-wrapper {
    ${type("body")}
    color: ${({ theme }) => theme.color.fgMuted};
  }
  .ant-checkbox-wrapper a {
    color: ${({ theme }) => theme.color.fg};
    text-decoration: underline;
    text-decoration-color: ${({ theme }) => theme.color.lineStrong};
    text-underline-offset: 3px;
  }
  .ant-checkbox-wrapper a:hover {
    text-decoration-color: ${({ theme }) => theme.color.accentLine};
  }
  .ant-input,
  .ant-input-affix-wrapper {
    height: 44px;
    padding-inline: ${({ theme }) => theme.space(3.5)};
    font-size: 0.9375rem;
  }
  .ant-input-affix-wrapper > .ant-input {
    height: auto;
    padding-inline: 0;
  }
  .ant-form-item-extra,
  .ant-form-item-explain {
    ${type("caption")}
    margin-top: ${({ theme }) => theme.space(1.5)};
  }
  .ant-form-item-extra {
    color: ${({ theme }) => theme.color.fgSubtle};
  }
` as typeof Form;

export const Row = styled.div`
  display: grid;
  gap: 0 ${({ theme }) => theme.space(4)};

  @media (min-width: 480px) {
    grid-template-columns: 1fr 1fr;
  }
`;

// A label with a link on the right, e.g. "Password ......... Forgot password?"
export const LabelRow = styled.span`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  width: 100%;

  && a {
    ${type("caption")}
    font-weight: 500;
    color: ${({ theme }) => theme.color.fgMuted};
  }
  && a:hover {
    color: ${({ theme }) => theme.color.accentText};
  }
`;

export const Optional = styled.span`
  ${type("caption")}
  font-weight: 400;
  margin-left: ${({ theme }) => theme.space(1.5)};
  color: ${({ theme }) => theme.color.fgSubtle};
`;

export const SubmitRow = styled.div`
  margin-top: ${({ theme }) => theme.space(2)};

  .ant-btn {
    height: 44px;
    font-size: 0.9375rem;
  }
`;

const Meter = styled.div<{ $score: number }>`
  margin-top: ${({ theme }) => theme.space(2)};

  .bars {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: ${({ theme }) => theme.space(1)};
  }
  .bars i {
    height: 3px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.line};
    transition: background ${({ theme }) => theme.motion.base};
  }
  .bars i[data-on="true"] {
    background: ${({ theme, $score }) =>
      $score <= 1
        ? theme.color.danger
        : $score === 2
          ? theme.color.warning
          : theme.color.success};
  }
  p {
    ${type("caption")}
    margin-top: ${({ theme }) => theme.space(1.5)};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const STRENGTH = ["Too short", "Weak", "Fair", "Good", "Strong"] as const;

// Advisory only; the single hard rule (8 characters) is enforced by the form.
export function passwordScore(password: string): number {
  if (password.length < 8) return 0;
  let score = 1;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

export function PasswordStrength({ password }: { password: string }) {
  const score = passwordScore(password);
  return (
    <Meter $score={score} aria-live="polite">
      <div className="bars" aria-hidden>
        {[1, 2, 3, 4].map((n) => (
          <i key={n} data-on={score >= n} />
        ))}
      </div>
      <p>
        {password
          ? `${STRENGTH[score]}. Longer passwords with mixed characters are stronger.`
          : "At least 8 characters."}
      </p>
    </Meter>
  );
}

// Only follow same-site paths, so a crafted link cannot bounce someone who
// has just signed in to another website.
export function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : routes.projects;
}

export function withNext(path: string, next: string): string {
  return next === routes.projects ? path : `${path}?next=${encodeURIComponent(next)}`;
}
