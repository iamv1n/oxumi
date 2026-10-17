"use client";

import { ArrowUpOutlined } from "@ant-design/icons";
import { Button, Checkbox } from "antd";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";

export type Language = "hi" | "en";

const LANGUAGES: Record<Language, { label: string; native: string }> = {
  hi: { label: "Hindi", native: "हिन्दी" },
  en: { label: "English", native: "English" },
};
const ALL = Object.keys(LANGUAGES) as Language[];

const List = styled.ul`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.color.lineStrong};
  border-radius: ${({ theme }) => theme.radius.control};
  overflow: hidden;
`;

const Item = styled.li<{ $on: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  min-height: 48px;
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  background: ${({ theme, $on }) => ($on ? theme.color.raised : "transparent")};

  & + & {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
  .ant-checkbox-wrapper {
    flex: 1;
    align-items: center;
  }
  .name {
    ${type("label")}
    color: ${({ theme, $on }) => ($on ? theme.color.fg : theme.color.fgMuted)};
  }
  .native {
    margin-left: ${({ theme }) => theme.space(2)};
    font-family: ${({ theme }) => theme.font.hindi};
    font-size: ${({ theme }) => theme.text.caption.size};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
`;

const Badge = styled.span`
  ${type("caption")}
  font-weight: 500;
  padding: ${({ theme }) => theme.space(0.5)} ${({ theme }) => theme.space(2)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accentText};
  white-space: nowrap;
`;

// An ordered choice of call languages. The first one opens the call; the
// agent follows the caller into any other that is switched on.
export function LanguageOrder({
  value = [],
  onChange,
  disabled,
}: {
  value?: Language[];
  onChange?: (next: Language[]) => void;
  disabled?: boolean;
}) {
  // Chosen languages in their order, then the rest.
  const rows = [...value, ...ALL.filter((code) => !value.includes(code))];

  return (
    <List>
      {rows.map((code) => {
        const index = value.indexOf(code);
        const on = index !== -1;
        const { label, native } = LANGUAGES[code];
        return (
          <Item key={code} $on={on}>
            <Checkbox
              checked={on}
              disabled={disabled}
              onChange={(e) =>
                onChange?.(e.target.checked ? [...value, code] : value.filter((c) => c !== code))
              }
            >
              <span className="name">{label}</span>
              {native !== label && (
                <span className="native" lang={code}>
                  {native}
                </span>
              )}
            </Checkbox>
            {index === 0 && <Badge>Opening language</Badge>}
            {index > 0 && (
              <Button
                size="small"
                type="text"
                icon={<ArrowUpOutlined />}
                disabled={disabled}
                onClick={() => onChange?.([code, ...value.filter((c) => c !== code)])}
              >
                Open with {label}
              </Button>
            )}
          </Item>
        );
      })}
    </List>
  );
}
