import { Injectable, Logger } from "@nestjs/common";
import { appendFile } from "node:fs/promises";
import path from "node:path";

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

// Outbound email. No provider is wired up yet: until one is, messages are
// written to the server log and to .dev-outbox.log at the repo root, so flows
// that depend on email (password reset) can be completed during development.
// Replace the body of send() with a provider call before launch.
@Injectable()
export class MailService {
  private logger = new Logger(MailService.name);
  private outbox = path.resolve(process.cwd(), "../../.dev-outbox.log");

  async send(mail: Mail): Promise<void> {
    if (process.env.NODE_ENV === "production") {
      this.logger.error(
        `No email provider configured; "${mail.subject}" to ${mail.to} was not sent.`,
      );
      return;
    }
    const entry = `--- ${new Date().toISOString()}\nTo: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n\n`;
    this.logger.log(`Email (dev outbox) to ${mail.to}: ${mail.subject}`);
    await appendFile(this.outbox, entry).catch(() => undefined);
  }
}
