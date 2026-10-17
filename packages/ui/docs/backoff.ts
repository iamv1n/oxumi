import type { Samples } from "./languages";
import { BASE_URL, type RequestOptions } from "./request";

// Handling 429 in each sample language: one helper that sends a request and,
// while the API answers 429, waits the number of seconds in Retry-After (plus
// a little random delay) and tries again, giving up after five attempts.

export function backoffSamples(options: RequestOptions = {}): Samples {
  const base = (options.baseUrl ?? BASE_URL).replace(/\/$/, "");
  const key = options.apiKey;

  const curl = `#!/bin/sh
# Repeats a request while the API answers 429, waiting as Retry-After says.
attempt=0
while :; do
  status=$(curl -s -o response.json -D headers.txt -w "%{http_code}" \\
    "${base}/v1/agents" \\
    -H "Authorization: Bearer ${key ?? "$OXUMI_API_KEY"}")
  [ "$status" != "429" ] && break

  attempt=$((attempt + 1))
  [ "$attempt" -ge 5 ] && break

  wait=$(awk 'tolower($1) == "retry-after:" { print $2 + 0 }' headers.txt)
  sleep "\${wait:-1}"
done

echo "$status"
cat response.json`;

  const jsAuth = key ? `"Bearer ${key}"` : "`Bearer ${process.env.OXUMI_API_KEY}`";
  const javascript = `// fetch for the Oxumi API that waits and retries while it answers 429.
export async function oxumi(path, init = {}, attempt = 0) {
  const response = await fetch(\`${base}\${path}\`, {
    ...init,
    headers: {
      Authorization: ${jsAuth},
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (response.status !== 429 || attempt >= 4) return response;

  // Retry-After is the number of seconds until the window resets.
  const seconds = Number(response.headers.get("Retry-After") ?? 1);
  const jitter = Math.random() * 250;
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000 + jitter));
  return oxumi(path, init, attempt + 1);
}`;

  const typescript = `// fetch for the Oxumi API that waits and retries while it answers 429.
export async function oxumi(
  path: string,
  init: RequestInit = {},
  attempt = 0,
): Promise<Response> {
  const response = await fetch(\`${base}\${path}\`, {
    ...init,
    headers: {
      Authorization: ${jsAuth},
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  if (response.status !== 429 || attempt >= 4) return response;

  // Retry-After is the number of seconds until the window resets.
  const seconds = Number(response.headers.get("Retry-After") ?? 1);
  const jitter = Math.random() * 250;
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000 + jitter));
  return oxumi(path, init, attempt + 1);
}`;

  const python = `${key ? "" : "import os\n"}import random
import time

import requests


# requests for the Oxumi API that waits and retries while it answers 429.
def oxumi(method, path, attempt=0, **kwargs):
    response = requests.request(
        method,
        f"${base}{path}",
        headers={"Authorization": ${key ? `"Bearer ${key}"` : `f"Bearer {os.environ['OXUMI_API_KEY']}"`}},
        timeout=30,
        **kwargs,
    )
    if response.status_code != 429 or attempt >= 4:
        return response

    # Retry-After is the number of seconds until the window resets.
    seconds = int(response.headers.get("Retry-After", 1))
    time.sleep(seconds + random.random() * 0.25)
    return oxumi(method, path, attempt + 1, **kwargs)`;

  const go = `package oxumi

import (
	"io"
	"math/rand"
	"net/http"
${key ? "" : '\t"os"\n'}	"strconv"
	"time"
)

// Do sends the request that newRequest builds, waiting and retrying while the
// API answers 429. The request is rebuilt for each attempt so that a body can
// be sent again.
func Do(newRequest func() (*http.Request, error)) (*http.Response, error) {
	for attempt := 0; ; attempt++ {
		req, err := newRequest()
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", ${key ? `"Bearer ${key}"` : `"Bearer "+os.Getenv("OXUMI_API_KEY")`})

		res, err := http.DefaultClient.Do(req)
		if err != nil {
			return nil, err
		}
		if res.StatusCode != http.StatusTooManyRequests || attempt >= 4 {
			return res, nil
		}
		io.Copy(io.Discard, res.Body)
		res.Body.Close()

		// Retry-After is the number of seconds until the window resets.
		seconds, err := strconv.Atoi(res.Header.Get("Retry-After"))
		if err != nil {
			seconds = 1
		}
		jitter := time.Duration(rand.Intn(250)) * time.Millisecond
		time.Sleep(time.Duration(seconds)*time.Second + jitter)
	}
}`;

  const php = `<?php

// Sends a request to the Oxumi API, waiting and retrying while it answers
// 429. Returns [status, body].
function oxumi(string $method, string $path, ?array $json = null): array
{
    for ($attempt = 0; ; $attempt++) {
        $retryAfter = 1;
        $ch = curl_init("${base}" . $path);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                ${key ? `"Authorization: Bearer ${key}"` : `"Authorization: Bearer " . getenv("OXUMI_API_KEY")`},
                "Content-Type: application/json",
            ],
            // Retry-After is the number of seconds until the window resets.
            CURLOPT_HEADERFUNCTION => function ($ch, string $line) use (&$retryAfter): int {
                if (stripos($line, "Retry-After:") === 0) {
                    $retryAfter = (int) trim(substr($line, 12));
                }
                return strlen($line);
            },
        ]);
        if ($json !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($json));
        }

        $body = curl_exec($ch);
        if ($body === false) {
            throw new RuntimeException(curl_error($ch));
        }
        $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        if ($status !== 429 || $attempt >= 4) {
            return [$status, $body];
        }
        usleep(max(1, $retryAfter) * 1000000 + random_int(0, 250000));
    }
}`;

  const ruby = `require "json"
require "net/http"
require "uri"

# Sends a request to the Oxumi API, waiting and retrying while it answers
# 429. method is "get", "post" or "delete".
def oxumi(method, path, json = nil)
  uri = URI("${base}#{path}")
  attempt = 0
  loop do
    request = Net::HTTP.const_get(method.capitalize).new(uri)
    request["Authorization"] = ${key ? `"Bearer ${key}"` : `"Bearer #{ENV.fetch("OXUMI_API_KEY")}"`}
    if json
      request["Content-Type"] = "application/json"
      request.body = JSON.generate(json)
    end

    response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") do |http|
      http.request(request)
    end
    return response unless response.code == "429" && attempt < 4

    # Retry-After is the number of seconds until the window resets.
    attempt += 1
    sleep((response["Retry-After"] || 1).to_i + rand * 0.25)
  end
end`;

  const java = `import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.concurrent.ThreadLocalRandom;

public final class Oxumi {
    private static final HttpClient CLIENT = HttpClient.newHttpClient();

    // Sends a request to the Oxumi API, waiting and retrying while it
    // answers 429. Build the request with its Authorization header as usual.
    public static HttpResponse<String> send(HttpRequest request) throws Exception {
        for (int attempt = 0; ; attempt++) {
            HttpResponse<String> response =
                CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 429 || attempt >= 4) {
                return response;
            }

            // Retry-After is the number of seconds until the window resets.
            long seconds = response.headers()
                .firstValue("Retry-After")
                .map(Long::parseLong)
                .orElse(1L);
            Thread.sleep(seconds * 1000 + ThreadLocalRandom.current().nextInt(250));
        }
    }
}`;

  const csharp = `using System;
using System.Net.Http;
using System.Threading.Tasks;

public static class Oxumi
{
    private static readonly HttpClient Client = new HttpClient();
    private static readonly Random Jitter = new Random();

    // Sends the request that createRequest builds, waiting and retrying while
    // the API answers 429. The request is rebuilt for each attempt, because an
    // HttpRequestMessage cannot be sent twice.
    public static async Task<HttpResponseMessage> SendAsync(Func<HttpRequestMessage> createRequest)
    {
        for (var attempt = 0; ; attempt++)
        {
            var response = await Client.SendAsync(createRequest());
            if ((int)response.StatusCode != 429 || attempt >= 4)
            {
                return response;
            }

            // Retry-After is the number of seconds until the window resets.
            var wait = response.Headers.RetryAfter?.Delta ?? TimeSpan.FromSeconds(1);
            response.Dispose();
            await Task.Delay(wait + TimeSpan.FromMilliseconds(Jitter.Next(250)));
        }
    }
}`;

  return { curl, javascript, typescript, python, go, php, ruby, java, csharp };
}

export const BACKOFF_SAMPLES: Samples = backoffSamples();
