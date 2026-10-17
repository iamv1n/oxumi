"use client";

import LegalPage, { Blank, type LegalSection } from "@/components/legal/LegalPage";

const SECTIONS: LegalSection[] = [
  {
    id: "who",
    title: "Who we are",
    body: (
      <p>
        Oxumi is operated by <Blank>company legal name</Blank>,{" "}
        <Blank>registered address</Blank>. For anything in this policy, contact{" "}
        <Blank>privacy contact email</Blank>.
      </p>
    ),
  },
  {
    id: "collect",
    title: "What we collect",
    body: (
      <>
        <p>
          <strong>Account details.</strong> Your name, email address, company name
          if you give one, the time you accepted these policies, and your
          password, which is stored only as a salted hash that cannot be read
          back.
        </p>
        <p>
          <strong>What you build.</strong> Your projects, agents and call flows,
          including the wording and settings you give them.
        </p>
        <p>
          <strong>Call records.</strong> For each call: the details you supplied
          for it, the transcript, the answers the agent collected, the outcome,
          and timing measurements. Call audio is streamed to our speech provider
          to be transcribed and spoken; Oxumi does not keep recordings.
        </p>
        <p>
          <strong>Technical data.</strong> A session cookie that keeps you signed
          in, and your IP address at sign-in, used briefly to limit repeated
          failed attempts.
        </p>
      </>
    ),
  },
  {
    id: "use",
    title: "How we use it",
    body: (
      <ul>
        <li>To provide the service: run your calls and show you the results.</li>
        <li>To keep accounts secure and prevent abuse.</li>
        <li>To send essential messages, such as a password reset link.</li>
        <li>To fix problems and understand how the product performs.</li>
      </ul>
    ),
  },
  {
    id: "people-you-call",
    title: "People your agents call",
    body: (
      <p>
        When you use Oxumi to call someone, you decide why and how their
        information is used, and we process it on your behalf and on your
        instructions. You are responsible for telling those people how you handle
        their data and for having a lawful reason to call them. If someone you
        called contacts us directly, we will refer them to you.
      </p>
    ),
  },
  {
    id: "sharing",
    title: "Who we share it with",
    body: (
      <>
        <p>We do not sell personal data. It is shared only with providers that the service needs in order to work:</p>
        <ul>
          <li>
            <strong>Speech provider</strong> (ElevenLabs): call audio and the
            agent&rsquo;s spoken text, for transcription and speech.
          </li>
          <li>
            <strong>Language-model provider</strong>: the conversation text and
            your flow&rsquo;s instructions go to the provider selected for the
            agent (Anthropic, OpenAI or Google).
          </li>
          <li>
            <strong>Hosting and database</strong>: <Blank>hosting provider and region</Blank>.
          </li>
        </ul>
        <p>We may also disclose information where the law requires it.</p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    body: (
      <p>
        Oxumi sets one cookie: an essential session cookie that keeps you
        signed in. It cannot be read by scripts in the page. We do not use
        advertising or analytics cookies.
      </p>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <p>
        Account and project data is kept while your account is open. Deleting a
        project removes its agents and call records. When an account is closed we
        delete its data within <Blank>retention period</Blank>, apart from
        anything the law requires us to keep.
      </p>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        Passwords and session tokens are stored only as hashes. Each account can
        reach only its own projects, agents and calls. No system is perfectly
        secure, so please use a strong, unique password and tell us if you
        suspect unauthorised access.
      </p>
    ),
  },
  {
    id: "rights",
    title: "Your choices and rights",
    body: (
      <p>
        You can ask for a copy of your data, ask us to correct it, or ask us to
        delete your account. Depending on where you live you may have further
        rights under data-protection law, including the right to complain to a
        regulator. Write to <Blank>privacy contact email</Blank> and we will
        respond within <Blank>response period</Blank>.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        If we change how we handle personal data, we will update this page and
        its date, and tell you about significant changes before they take effect.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      current="privacy"
      title="Privacy Policy"
      updated="13 October 2026"
      intro="What Oxumi collects, why, and who else sees it. We collect what the product needs to run your calls, we do not sell it, and we do not keep call recordings."
      sections={SECTIONS}
    />
  );
}
