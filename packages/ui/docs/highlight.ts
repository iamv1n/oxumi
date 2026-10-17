// A small syntax highlighter for the four languages the docs show. Each
// language is one regular expression of alternatives; the first group that
// matches names the token.

export type CodeLanguage =
  | "json"
  | "bash"
  | "javascript"
  | "typescript"
  | "python"
  | "go"
  | "php"
  | "ruby"
  | "java"
  | "csharp"
  | "http"
  | "text";

export type TokenKind =
  | "plain"
  | "comment"
  | "string"
  | "number"
  | "keyword"
  | "key"
  | "variable"
  | "flag";

export interface Token {
  kind: TokenKind;
  text: string;
}

type Rule = [TokenKind, string];

const STRING = `"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'`;
const NUMBER = `\\b\\d+(?:\\.\\d+)?\\b`;

const words = (list: string) => `\\b(?:${list.trim().split(/\s+/).join("|")})\\b`;

// Languages in the C family differ, for our purposes, only in their keywords.
const cLike = (keywords: string, extra: Rule[] = []): Rule[] => [
  ["comment", `//.*$`],
  ...extra,
  ["string", `${STRING}|\`(?:\\\\.|[^\`\\\\])*\``],
  ["keyword", words(keywords)],
  ["number", NUMBER],
];

const JS_WORDS = `import from export const let var await async function return if else new throw
  try catch for of in true false null undefined typeof`;

const RULES: Record<CodeLanguage, Rule[]> = {
  json: [
    ["key", `"(?:\\\\.|[^"\\\\])*"(?=\\s*:)`],
    ["string", `"(?:\\\\.|[^"\\\\])*"`],
    ["number", `-?${NUMBER}`],
    ["keyword", `\\b(?:true|false|null)\\b`],
  ],
  bash: [
    ["comment", `(?:^|(?<=\\s))#.*$`],
    ["string", STRING],
    ["variable", `\\$\\{?[A-Za-z_][A-Za-z0-9_]*\\}?`],
    ["flag", `(?<=\\s)--?[A-Za-z][A-Za-z-]*`],
    ["keyword", `^\\s*(?:curl|export|node|python3?|pip)\\b`],
  ],
  javascript: [...cLike(JS_WORDS), ["key", `\\b[A-Za-z_$][\\w$]*(?=\\s*:)`]],
  typescript: [
    ...cLike(`${JS_WORDS} interface type as string number boolean unknown void Promise Record`),
    ["key", `\\b[A-Za-z_$][\\w$]*(?=\\??\\s*:)`],
  ],
  go: cLike(`package import func return if else for range var const defer switch case default
    nil true false string int64 byte bool error struct type map panic`),
  java: cLike(`import public private static final class void throws throw new return if else for
    try catch continue null true false String long byte boolean int`),
  csharp: cLike(
    `using var public private static class void bool string int long byte await async new return
    if else foreach in continue throw null true false out is`,
    [["string", `@"(?:""|[^"])*"|\\$"(?:\\\\.|[^"\\\\])*"`]],
  ),
  php: [
    ["comment", `//.*$`],
    ["string", STRING],
    ["variable", `\\$[A-Za-z_][A-Za-z0-9_]*`],
    [
      "keyword",
      words(`function return if else foreach as new throw true false null string int bool echo
        array`),
    ],
    ["flag", `\\b[A-Z][A-Z_]{3,}\\b`],
    ["number", NUMBER],
  ],
  ruby: [
    ["comment", `#(?!\\{).*$`],
    ["string", STRING],
    [
      "keyword",
      words(`require def end return if unless else do nil true false puts abort and or not`),
    ],
    ["key", `\\b[a-z_]+(?=:\\s)`],
    ["number", NUMBER],
  ],
  python: [
    ["comment", `#.*$`],
    ["string", `[fb]?(?:${STRING})`],
    [
      "keyword",
      `\\b(?:import|from|def|return|if|elif|else|not|in|for|try|except|raise|with|as|and|or|class|None|True|False|pass)\\b`,
    ],
    ["number", NUMBER],
  ],
  http: [
    ["keyword", `^(?:HTTP/[\\d.]+ \\d+.*|[A-Z]+ /\\S*)$`],
    ["key", `^[A-Za-z-]+(?=:)`],
    ["number", NUMBER],
  ],
  text: [],
};

const compiled = new Map<CodeLanguage, RegExp>();

function pattern(language: CodeLanguage): RegExp | null {
  const rules = RULES[language];
  if (!rules.length) return null;
  let regex = compiled.get(language);
  if (!regex) {
    regex = new RegExp(rules.map(([, source]) => `(${source})`).join("|"), "gm");
    compiled.set(language, regex);
  }
  return regex;
}

// Splits source into lines of tokens.
export function highlight(code: string, language: CodeLanguage): Token[][] {
  const regex = pattern(language);
  const rules = RULES[language];
  return code.split("\n").map((line) => {
    if (!regex) return [{ kind: "plain", text: line }];
    const tokens: Token[] = [];
    let cursor = 0;
    regex.lastIndex = 0;
    for (const match of line.matchAll(regex)) {
      const text = match[0];
      if (!text) continue;
      const start = match.index ?? 0;
      if (start > cursor) tokens.push({ kind: "plain", text: line.slice(cursor, start) });
      const group = match.slice(1).findIndex((value) => value !== undefined);
      tokens.push({ kind: rules[group]?.[0] ?? "plain", text });
      cursor = start + text.length;
    }
    if (cursor < line.length) tokens.push({ kind: "plain", text: line.slice(cursor) });
    return tokens;
  });
}
