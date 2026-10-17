import { API_URL } from "../lib/urls";
import type { Samples } from "./languages";

// One description of an HTTP request, written out as a complete program in
// each of the nine sample languages. Every builder reads the same spec, so
// the samples cannot drift apart. Only the standard library, or the one
// de-facto HTTP client, is used: there are no Oxumi SDKs.

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export interface RequestSpec {
  method: "GET" | "POST" | "DELETE";
  path: string;
  query?: Record<string, string | number>;
  body?: { [key: string]: Json };
  // Name for the parsed response in languages that bind it to a variable.
  result?: string;
}

export interface RequestOptions {
  // Defaults to the API this site talks to.
  baseUrl?: string;
  // A literal to show in place of the key, e.g. "YOUR_API_KEY". When absent,
  // samples read the key from the OXUMI_API_KEY environment variable.
  apiKey?: string;
}

export const BASE_URL = API_URL.replace(/\/$/, "");
export const KEY_PLACEHOLDER = "YOUR_API_KEY";

const IDENT = /^[A-Za-z_$][\w$]*$/;
const indent = (text: string, pad: string) => text.replace(/\n/g, `\n${pad}`);

function url(spec: RequestSpec, options: RequestOptions): string {
  const query = spec.query
    ? `?${Object.entries(spec.query)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("&")}`
    : "";
  return `${(options.baseUrl ?? BASE_URL).replace(/\/$/, "")}${spec.path}${query}`;
}

/* ---------- literals ---------- */

function jsLiteral(value: Json, depth: number): string {
  const pad = "  ".repeat(depth);
  if (Array.isArray(value)) return `[${value.map((v) => jsLiteral(v, depth)).join(", ")}]`;
  if (value && typeof value === "object") {
    const rows = Object.entries(value).map(
      ([k, v]) => `${pad}  ${IDENT.test(k) ? k : JSON.stringify(k)}: ${jsLiteral(v, depth + 1)},`,
    );
    return rows.length ? `{\n${rows.join("\n")}\n${pad}}` : "{}";
  }
  return JSON.stringify(value);
}

// Python dicts, PHP arrays and Ruby hashes share a shape: quoted keys, a
// separator, and their own words for true, false and null.
function mapLiteral(
  value: Json,
  depth: number,
  style: { open: string; close: string; arrow: string; t: string; f: string; nil: string; unit: string },
): string {
  const pad = style.unit.repeat(depth);
  if (value === null) return style.nil;
  if (value === true) return style.t;
  if (value === false) return style.f;
  if (Array.isArray(value))
    return `[${value.map((v) => mapLiteral(v, depth, style)).join(", ")}]`;
  if (typeof value === "object") {
    const rows = Object.entries(value).map(
      ([k, v]) =>
        `${pad}${style.unit}${JSON.stringify(k)}${style.arrow}${mapLiteral(v, depth + 1, style)},`,
    );
    return rows.length ? `${style.open}\n${rows.join("\n")}\n${pad}${style.close}` : `${style.open}${style.close}`;
  }
  return JSON.stringify(value);
}

const PY = { open: "{", close: "}", arrow: ": ", t: "True", f: "False", nil: "None", unit: "    " };
const PHP = { open: "[", close: "]", arrow: " => ", t: "true", f: "false", nil: "null", unit: "    " };
const RUBY = { open: "{", close: "}", arrow: " => ", t: "true", f: "false", nil: "nil", unit: "  " };

const pretty = (body: RequestSpec["body"]) => JSON.stringify(body, null, 2);

/* ---------- builders ---------- */

function curl(spec: RequestSpec, o: RequestOptions): string {
  const lines = [`curl --fail-with-body "${url(spec, o)}"`];
  if (spec.method !== "GET") lines.push(`-X ${spec.method}`);
  lines.push(`-H "Authorization: Bearer ${o.apiKey ?? "$OXUMI_API_KEY"}"`);
  if (spec.body) {
    lines.push(`-H "Content-Type: application/json"`);
    lines.push(`-d '${indent(pretty(spec.body), "  ")}'`);
  }
  return lines.join(" \\\n  ");
}

function script(spec: RequestSpec, o: RequestOptions, typed: boolean): string {
  const name = spec.result ?? "result";
  const auth = o.apiKey
    ? `    Authorization: "Bearer ${o.apiKey}",`
    : "    Authorization: `Bearer ${process.env.OXUMI_API_KEY}`,";
  const init = [
    ...(spec.method === "GET" ? [] : [`  method: "${spec.method}",`]),
    "  headers: {",
    auth,
    ...(spec.body ? ['    "Content-Type": "application/json",'] : []),
    "  },",
    ...(spec.body ? [`  body: JSON.stringify(${jsLiteral(spec.body, 1)}),`] : []),
  ];
  const types = typed
    ? "interface ApiError {\n  message: string;\n  error?: string;\n  statusCode: number;\n}\n\n"
    : "";
  const error = typed
    ? "  const error = (await response.json()) as ApiError;"
    : "  const error = await response.json();";
  const tail =
    spec.method === "DELETE"
      ? "console.log(response.status); // 204"
      : `const ${name}${typed ? ": unknown" : ""} = await response.json();\nconsole.log(${name});`;
  return `${types}const response = await fetch("${url(spec, o)}", {
${init.join("\n")}
});

if (!response.ok) {
${error}
  throw new Error(\`Oxumi API \${response.status}: \${error.message}\`);
}

${tail}`;
}

function python(spec: RequestSpec, o: RequestOptions): string {
  const name = spec.result ?? "result";
  const base = `${(o.baseUrl ?? BASE_URL).replace(/\/$/, "")}${spec.path}`;
  const args = [
    `    "${base}",`,
    o.apiKey
      ? `    headers={"Authorization": "Bearer ${o.apiKey}"},`
      : `    headers={"Authorization": f"Bearer {os.environ['OXUMI_API_KEY']}"},`,
    ...(spec.query ? [`    params=${mapLiteral(spec.query, 1, PY)},`] : []),
    ...(spec.body ? [`    json=${mapLiteral(spec.body, 1, PY)},`] : []),
    "    timeout=30,",
  ];
  const tail =
    spec.method === "DELETE"
      ? "print(response.status_code)  # 204"
      : `${name} = response.json()\nprint(${name})`;
  return `${o.apiKey ? "" : "import os\n\n"}import requests

response = requests.${spec.method.toLowerCase()}(
${args.join("\n")}
)

if not response.ok:
    raise SystemExit(f"Oxumi API {response.status_code}: {response.json()['message']}")

${tail}`;
}

function go(spec: RequestSpec, o: RequestOptions): string {
  const imports = [...(spec.body ? ['"bytes"'] : []), '"fmt"', '"io"', '"net/http"', '"os"'];
  const key = o.apiKey ? `"Bearer ${o.apiKey}"` : `"Bearer "+os.Getenv("OXUMI_API_KEY")`;
  const payload = spec.body ? `\tbody := []byte(\`${pretty(spec.body)}\`)\n\n` : "";
  return `package main

import (
${imports.map((name) => `\t${name}`).join("\n")}
)

func main() {
${payload}\treq, err := http.NewRequest("${spec.method}", "${url(spec, o)}", ${spec.body ? "bytes.NewReader(body)" : "nil"})
\tif err != nil {
\t\tpanic(err)
\t}
\treq.Header.Set("Authorization", ${key})
${spec.body ? '\treq.Header.Set("Content-Type", "application/json")\n' : ""}
\tres, err := http.DefaultClient.Do(req)
\tif err != nil {
\t\tpanic(err)
\t}
\tdefer res.Body.Close()

\tdata, err := io.ReadAll(res.Body)
\tif err != nil {
\t\tpanic(err)
\t}
\tif res.StatusCode >= 300 {
\t\tfmt.Fprintf(os.Stderr, "Oxumi API %d: %s\\n", res.StatusCode, data)
\t\tos.Exit(1)
\t}
\t${spec.method === "DELETE" ? "fmt.Println(res.Status) // 204 No Content" : "fmt.Println(string(data))"}
}`;
}

function php(spec: RequestSpec, o: RequestOptions): string {
  const name = spec.result ?? "result";
  const key = o.apiKey ? `"Authorization: Bearer ${o.apiKey}"` : `"Authorization: Bearer " . getenv("OXUMI_API_KEY")`;
  const options = [
    ...(spec.method === "GET" ? [] : [`    CURLOPT_CUSTOMREQUEST => "${spec.method}",`]),
    "    CURLOPT_RETURNTRANSFER => true,",
    "    CURLOPT_HTTPHEADER => [",
    `        ${key},`,
    ...(spec.body ? ['        "Content-Type: application/json",'] : []),
    "    ],",
    ...(spec.body ? [`    CURLOPT_POSTFIELDS => json_encode(${mapLiteral(spec.body, 1, PHP)}),`] : []),
  ];
  const tail =
    spec.method === "DELETE"
      ? "echo $status, PHP_EOL; // 204"
      : `$${name} = json_decode($body, true);\nprint_r($${name});`;
  return `<?php

$ch = curl_init("${url(spec, o)}");
curl_setopt_array($ch, [
${options.join("\n")}
]);

$body = curl_exec($ch);
if ($body === false) {
    throw new RuntimeException(curl_error($ch));
}
$status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
curl_close($ch);

if ($status >= 300) {
    throw new RuntimeException("Oxumi API $status: $body");
}

${tail}`;
}

function ruby(spec: RequestSpec, o: RequestOptions): string {
  const name = spec.result ?? "result";
  const kind = { GET: "Get", POST: "Post", DELETE: "Delete" }[spec.method];
  const key = o.apiKey ? `"Bearer ${o.apiKey}"` : `"Bearer #{ENV.fetch("OXUMI_API_KEY")}"`;
  const body = spec.body
    ? `request["Content-Type"] = "application/json"\nrequest.body = JSON.generate(${mapLiteral(spec.body, 0, RUBY)})\n`
    : "";
  const tail =
    spec.method === "DELETE"
      ? "puts response.code # 204"
      : `${name} = JSON.parse(response.body)\nputs ${name}`;
  return `require "json"
require "net/http"
require "uri"

uri = URI("${url(spec, o)}")
request = Net::HTTP::${kind}.new(uri)
request["Authorization"] = ${key}
${body}
response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") do |http|
  http.request(request)
end

unless response.is_a?(Net::HTTPSuccess)
  abort "Oxumi API #{response.code}: #{response.body}"
end

${tail}`;
}

function java(spec: RequestSpec, o: RequestOptions): string {
  const key = o.apiKey ? `"Bearer ${o.apiKey}"` : `"Bearer " + System.getenv("OXUMI_API_KEY")`;
  // Java 11 has no text blocks, so the body is joined from quoted lines.
  const body = spec.body
    ? `        String body = String.join("\\n",\n${pretty(spec.body)
        .split("\n")
        .map((line) => `            ${JSON.stringify(line)}`)
        .join(",\n")});\n\n`
    : "";
  const verb =
    spec.method === "POST"
      ? ".POST(HttpRequest.BodyPublishers.ofString(body))"
      : spec.method === "DELETE"
        ? ".DELETE()"
        : ".GET()";
  return `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    public static void main(String[] args) throws Exception {
${body}        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("${url(spec, o)}"))
            .header("Authorization", ${key})
${spec.body ? '            .header("Content-Type", "application/json")\n' : ""}            ${verb}
            .build();

        HttpResponse<String> response = HttpClient.newHttpClient()
            .send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() >= 300) {
            throw new RuntimeException(
                "Oxumi API " + response.statusCode() + ": " + response.body());
        }
        System.out.println(${spec.method === "DELETE" ? "response.statusCode()); // 204" : "response.body());"}
    }
}`;
}

function csharp(spec: RequestSpec, o: RequestOptions): string {
  const key = o.apiKey ? `"${o.apiKey}"` : `Environment.GetEnvironmentVariable("OXUMI_API_KEY")`;
  // A verbatim string: quotes are doubled, new lines are kept.
  const body = spec.body
    ? `var json = @"${pretty(spec.body).replace(/"/g, '""')}";\nusing var content = new StringContent(json, Encoding.UTF8, "application/json");\n\n`
    : "";
  const call =
    spec.method === "POST"
      ? `client.PostAsync("${url(spec, o)}", content)`
      : spec.method === "DELETE"
        ? `client.DeleteAsync("${url(spec, o)}")`
        : `client.GetAsync("${url(spec, o)}")`;
  return `using System;
using System.Net.Http;
using System.Net.Http.Headers;
${spec.body ? "using System.Text;\n" : ""}
using var client = new HttpClient();
client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
    "Bearer", ${key});

${body}using var response = await ${call};
var text = await response.Content.ReadAsStringAsync();

if (!response.IsSuccessStatusCode)
{
    throw new HttpRequestException($"Oxumi API {(int)response.StatusCode}: {text}");
}

Console.WriteLine(${spec.method === "DELETE" ? "(int)response.StatusCode); // 204" : "text);"}`;
}

// The request in all nine languages.
export function requestSamples(spec: RequestSpec, options: RequestOptions = {}): Samples {
  return {
    curl: curl(spec, options),
    javascript: script(spec, options, false),
    typescript: script(spec, options, true),
    python: python(spec, options),
    go: go(spec, options),
    php: php(spec, options),
    ruby: ruby(spec, options),
    java: java(spec, options),
    csharp: csharp(spec, options),
  };
}
