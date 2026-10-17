"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App as AntApp } from "antd";
import { useServerInsertedHTML } from "next/navigation";
import { type ReactNode, useState } from "react";
import {
  ServerStyleSheet,
  StyleSheetManager,
  ThemeProvider,
} from "styled-components";
import ThemeLab from "../theme/ThemeLab";
import { GlobalStyle } from "./GlobalStyle";
import { AntdThemed } from "./theme-mode";
import { tokens } from "./tokens";

// Collects styled-components CSS during server rendering so pages arrive styled.
function StyledRegistry({ children }: { children: ReactNode }) {
  const [sheet] = useState(() => new ServerStyleSheet());
  useServerInsertedHTML(() => {
    const styles = sheet.getStyleElement();
    sheet.instance.clearTag();
    return <>{styles}</>;
  });
  if (typeof window !== "undefined") return <>{children}</>;
  return <StyleSheetManager sheet={sheet.instance}>{children}</StyleSheetManager>;
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <StyledRegistry>
      <AntdRegistry>
        <AntdThemed>
          <ThemeProvider theme={tokens}>
            <GlobalStyle />
            <AntApp>
              {children}
              <ThemeLab />
            </AntApp>
          </ThemeProvider>
        </AntdThemed>
      </AntdRegistry>
    </StyledRegistry>
  );
}
