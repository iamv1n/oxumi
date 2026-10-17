"use client";

import { Button, Checkbox, Modal } from "antd";
import { type ReactNode, useId, useState } from "react";
import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { CopyButton } from "./Copy";
import { ModalFooter, ModalLead } from "./ui";

const Secret = styled.div`
  border: 1px solid ${({ theme }) => theme.color.lineStrong};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => theme.color.canvas};
  overflow: hidden;

  .label {
    ${type("overline")}
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: ${({ theme }) => theme.space(9)};
    padding: 0 ${({ theme }) => theme.space(1.5)} 0 ${({ theme }) => theme.space(3)};
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  output {
    ${type("code")}
    display: block;
    padding: ${({ theme }) => theme.space(3)};
    color: ${({ theme }) => theme.color.fg};
    font-size: ${({ theme }) => theme.text.body.size};
    line-height: ${({ theme }) => theme.text.lede.line};
    overflow-wrap: anywhere;
    user-select: all;
  }
`;

const Once = styled.p`
  ${type("caption")}
  margin-top: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  border-left: 2px solid ${({ theme }) => theme.color.warning};
  background: ${({ theme }) => theme.color.warningSoft};
  color: ${({ theme }) => theme.color.fg};

  b {
    font-weight: 600;
  }
`;

const Foot = styled(ModalFooter)`
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
`;

// Shows a secret exactly once, right after it is issued. It can only be
// closed by confirming that the secret has been stored.
export function SecretModal({
  open,
  title,
  lead,
  secret,
  label,
  lostAdvice,
  onDone,
}: {
  open: boolean;
  title: string;
  lead: ReactNode;
  secret: string;
  // What the secret is, for assistive technology and the copy message.
  label: string;
  // What to do if the secret is lost.
  lostAdvice: string;
  onDone: () => void;
}) {
  const [stored, setStored] = useState(false);
  const secretId = useId();
  return (
    <Modal
      title={title}
      open={open}
      closable={false}
      keyboard={false}
      mask={{ closable: false }}
      footer={null}
      width={560}
      destroyOnHidden
      afterOpenChange={(visible) => !visible && setStored(false)}
    >
      <ModalLead>{lead}</ModalLead>
      <Secret>
        <div className="label">
          <span id={secretId}>{label}</span>
          <CopyButton text={secret} label="Copy" what={`${label} copied`} type="primary" />
        </div>
        <output aria-labelledby={secretId} tabIndex={0}>
          {secret}
        </output>
      </Secret>
      <Once>
        <b>This is the only time it is shown.</b> We keep only a protected copy. {lostAdvice}
      </Once>
      <Foot>
        <Checkbox checked={stored} onChange={(event) => setStored(event.target.checked)}>
          I have stored it somewhere safe
        </Checkbox>
        <Button type="primary" disabled={!stored} onClick={onDone}>
          Done
        </Button>
      </Foot>
    </Modal>
  );
}
