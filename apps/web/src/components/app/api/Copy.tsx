"use client";

import { CheckOutlined, CopyOutlined } from "@ant-design/icons";
import { App, Button, Tooltip } from "antd";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers and non-secure origins: fall back to a hidden field.
    const field = document.createElement("textarea");
    field.value = text;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    field.remove();
    return ok;
  }
}

export function CopyButton({
  text,
  label,
  what = "Copied",
  type: kind = "text",
  size = "small",
  onCopied,
  tooltip = "Copy",
}: {
  // Tooltip of the icon-only button.
  tooltip?: string;
  text: string;
  // Visible text; without it the button is an icon with a tooltip.
  label?: string;
  // Announced after copying, e.g. "Key copied".
  what?: string;
  type?: "text" | "default" | "primary";
  size?: "small" | "middle";
  onCopied?: () => void;
}) {
  const { message } = App.useApp();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setDone(false), 1800);
    return () => clearTimeout(timer);
  }, [done]);

  const copy = async () => {
    if (await copyText(text)) {
      setDone(true);
      message.success(what);
      onCopied?.();
    } else {
      message.error("Could not copy. Select the text and copy it by hand.");
    }
  };

  const button = (
    <Button
      type={kind}
      size={size}
      icon={done ? <CheckOutlined /> : <CopyOutlined />}
      aria-label={label ? undefined : tooltip}
      onClick={copy}
    >
      {label ? (done ? "Copied" : label) : null}
    </Button>
  );
  return label ? button : <Tooltip title={done ? "Copied" : tooltip}>{button}</Tooltip>;
}

const Block = styled.figure`
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => theme.color.canvas};
  overflow: hidden;

  figcaption {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ theme }) => theme.space(3)};
    min-height: 36px;
    padding: 0 ${({ theme }) => theme.space(1.5)} 0 ${({ theme }) => theme.space(4)};
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
    ${type("caption")}
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  pre {
    ${type("code")}
    margin: 0;
    padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
    overflow-x: auto;
    color: ${({ theme }) => theme.color.fg};
    tab-size: 2;
  }
`;

// A labelled, copyable block of code.
export function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <Block>
      <figcaption>
        {label}
        <CopyButton text={code} what={`${label} copied`} />
      </figcaption>
      <pre tabIndex={0}>
        <code>{code}</code>
      </pre>
    </Block>
  );
}
