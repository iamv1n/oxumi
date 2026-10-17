"use client";

import styled from "styled-components";
import { type } from "@oxumi/ui/design/typography";
import { KIT_ZIP, kitFiles, type KitFile } from "./manifest";
import { Action } from "./ui";

const Wrap = styled.div`
  .top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(5)};
    padding: ${({ theme }) => theme.space(5)};
    border: 1px solid ${({ theme }) => theme.color.lineStrong};
    border-radius: ${({ theme }) => theme.radius.card};
    background: ${({ theme }) => theme.color.surface};
  }
  .top p {
    ${type("body")}
    flex: 1 1 18rem;
    color: ${({ theme }) => theme.color.fgMuted};
    text-wrap: pretty;
  }
  .top img {
    flex: none;
    border-radius: 14px;
  }
  .groups {
    display: grid;
    gap: ${({ theme }) => theme.space(6)} ${({ theme }) => theme.space(8)};
    margin-top: ${({ theme }) => theme.space(8)};

    ${({ theme }) => theme.media.sm} {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    ${({ theme }) => theme.media.lg} {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
  h3 {
    ${type("overline")}
    margin-bottom: ${({ theme }) => theme.space(2)};
    color: ${({ theme }) => theme.color.fgSubtle};
  }
  li a {
    ${type("body")}
    display: flex;
    justify-content: space-between;
    gap: ${({ theme }) => theme.space(3)};
    padding: ${({ theme }) => theme.space(1.5)} 0;
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
    color: ${({ theme }) => theme.color.fgMuted};
  }
  li a:hover {
    color: ${({ theme }) => theme.color.fg};
  }
  li a span:last-child {
    flex: none;
    font-family: ${({ theme }) => theme.font.mono};
    font-size: 0.75rem;
    color: ${({ theme }) => theme.color.fgSubtle};
    text-transform: uppercase;
  }
  .ask {
    ${type("body")}
    margin-top: ${({ theme }) => theme.space(8)};
    color: ${({ theme }) => theme.color.fgMuted};
  }
`;

// The pre-built files in public/brand, one link each, and the zip of all of them.
export default function Downloads() {
  const groups = new Map<KitFile["group"], KitFile[]>();
  for (const file of kitFiles) groups.set(file.group, [...(groups.get(file.group) ?? []), file]);
  return (
    <Wrap>
      <div className="top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/icons/app-icon-192.png" width={56} height={56} alt="" />
        <p>
          The primary colourway of every design as SVG and PNG, the transparent and one-colour logos, the app icons and
          favicons, and one banner for each platform: {kitFiles.length} files.
        </p>
        <Action as="a" href={`/brand/${KIT_ZIP}`} download $strong>
          Download everything (.zip)
        </Action>
      </div>
      <div className="groups">
        {[...groups].map(([group, files]) => (
          <section key={group}>
            <h3>{group}</h3>
            <ul>
              {files.map((file) => (
                <li key={file.path}>
                  <a href={`/brand/${file.path}`} download>
                    <span>{file.label}</span>
                    <span>{file.path.split(".").pop()}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="ask">
        Ask before using the logo in a way that suggests a partnership, an endorsement or that Oxumi made something it
        did not.
      </p>
    </Wrap>
  );
}
