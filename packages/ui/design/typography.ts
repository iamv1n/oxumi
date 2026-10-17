import { css } from "styled-components";
import { text, type TextStyle, type TextToken } from "./tokens";

// Applies one step of the type scale: ${type("title")}
export const type = (name: TextToken) => {
  const style: TextStyle = text[name];
  return css`
    font-family: ${style.family};
    font-size: ${style.size};
    line-height: ${style.line};
    font-weight: ${style.weight};
    letter-spacing: ${style.tracking};
    ${style.transform ? `text-transform: ${style.transform};` : ""}
  `;
};
