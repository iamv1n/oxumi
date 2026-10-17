import type { Samples } from "./languages";

// Webhook signature verification in each sample language. Every version does
// the same four things: reads the raw body, splits the header into t and v1,
// rejects a timestamp more than five minutes from now, and compares an
// HMAC-SHA256 of "<t>.<raw body>" with v1 in constant time.

const javascript = `import { createHmac, timingSafeEqual } from "node:crypto";

// rawBody: the request body exactly as received, before any JSON parsing.
// header:  the Oxumi-Signature header, "t=<unix seconds>,v1=<hex digest>".
// secret:  the endpoint's signing secret (whsec_...).
export function verifyOxumiSignature(rawBody, header, secret, toleranceSeconds = 300) {
  const parts = Object.fromEntries(header.split(",").map((part) => part.split("=")));
  const timestamp = Number(parts.t);
  if (!timestamp || !parts.v1) return false;

  // Reject old deliveries, so a captured request cannot be replayed later.
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret)
    .update(\`\${parts.t}.\${rawBody}\`)
    .digest("hex");

  // Constant-time comparison.
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}`;

const typescript = `import { createHmac, timingSafeEqual } from "node:crypto";

// rawBody: the request body exactly as received, before any JSON parsing.
// header:  the Oxumi-Signature header, "t=<unix seconds>,v1=<hex digest>".
// secret:  the endpoint's signing secret (whsec_...).
export function verifyOxumiSignature(
  rawBody: string | Buffer,
  header: string,
  secret: string,
  toleranceSeconds = 300,
): boolean {
  const parts: Record<string, string> = Object.fromEntries(
    header.split(",").map((part) => part.split("=") as [string, string]),
  );
  const timestamp = Number(parts.t);
  if (!timestamp || !parts.v1) return false;

  // Reject old deliveries, so a captured request cannot be replayed later.
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret)
    .update(\`\${parts.t}.\`)
    .update(rawBody)
    .digest("hex");

  // Constant-time comparison.
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}`;

const python = `import hashlib
import hmac
import time


# raw_body: the request body exactly as received, as bytes.
# header:   the Oxumi-Signature header, "t=<unix seconds>,v1=<hex digest>".
# secret:   the endpoint's signing secret (whsec_...).
def verify_oxumi_signature(raw_body, header, secret, tolerance=300):
    try:
        parts = dict(part.split("=", 1) for part in header.split(","))
        timestamp = int(parts["t"])
        signature = parts["v1"]
    except (KeyError, ValueError):
        return False

    # Reject old deliveries, so a captured request cannot be replayed later.
    if abs(time.time() - timestamp) > tolerance:
        return False

    expected = hmac.new(
        secret.encode(),
        parts["t"].encode() + b"." + raw_body,
        hashlib.sha256,
    ).hexdigest()

    # Constant-time comparison.
    return hmac.compare_digest(expected, signature)`;

const go = `package webhook

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"strconv"
	"strings"
	"time"
)

// Verify reports whether a delivery was signed with secret.
// rawBody is the request body exactly as received (io.ReadAll(r.Body));
// header is the Oxumi-Signature header, "t=<unix seconds>,v1=<hex digest>".
func Verify(rawBody []byte, header, secret string) bool {
	var timestamp, signature string
	for _, part := range strings.Split(header, ",") {
		key, value, _ := strings.Cut(part, "=")
		switch key {
		case "t":
			timestamp = value
		case "v1":
			signature = value
		}
	}
	seconds, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil || signature == "" {
		return false
	}

	// Reject old deliveries, so a captured request cannot be replayed later.
	age := time.Now().Unix() - seconds
	if age > 300 || age < -300 {
		return false
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(timestamp + "."))
	mac.Write(rawBody)
	expected := hex.EncodeToString(mac.Sum(nil))

	// hmac.Equal compares in constant time.
	return hmac.Equal([]byte(expected), []byte(signature))
}`;

const php = `<?php

// $rawBody: the request body exactly as received: file_get_contents("php://input").
// $header:  the Oxumi-Signature header: $_SERVER["HTTP_OXUMI_SIGNATURE"].
// $secret:  the endpoint's signing secret (whsec_...).
function verify_oxumi_signature(
    string $rawBody,
    string $header,
    string $secret,
    int $tolerance = 300
): bool {
    $parts = [];
    foreach (explode(",", $header) as $part) {
        [$key, $value] = array_pad(explode("=", $part, 2), 2, "");
        $parts[$key] = $value;
    }
    $timestamp = $parts["t"] ?? "";
    $signature = $parts["v1"] ?? "";
    if (!ctype_digit($timestamp) || $signature === "") {
        return false;
    }

    // Reject old deliveries, so a captured request cannot be replayed later.
    if (abs(time() - (int) $timestamp) > $tolerance) {
        return false;
    }

    $expected = hash_hmac("sha256", $timestamp . "." . $rawBody, $secret);

    // hash_equals compares in constant time.
    return hash_equals($expected, $signature);
}`;

const ruby = `require "openssl"

# raw_body: the request body exactly as received (request.body.read).
# header:   the Oxumi-Signature header, "t=<unix seconds>,v1=<hex digest>".
# secret:   the endpoint's signing secret (whsec_...).
def verify_oxumi_signature(raw_body, header, secret, tolerance: 300)
  parts = header.split(",").map { |part| part.split("=", 2) }.select { |pair| pair.length == 2 }.to_h
  timestamp = parts["t"].to_s
  signature = parts["v1"].to_s
  return false unless timestamp.match?(/\\A\\d+\\z/) && !signature.empty?

  # Reject old deliveries, so a captured request cannot be replayed later.
  return false if (Time.now.to_i - timestamp.to_i).abs > tolerance

  expected = OpenSSL::HMAC.hexdigest("SHA256", secret, "#{timestamp}.#{raw_body}")

  # Constant-time comparison: every byte is compared whatever the result.
  return false unless expected.bytesize == signature.bytesize
  expected.bytes.zip(signature.bytes).reduce(0) { |diff, (a, b)| diff | (a ^ b) }.zero?
end`;

const java = `import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public final class OxumiSignature {
    // rawBody: the request body exactly as received, before any JSON parsing.
    // header:  the Oxumi-Signature header, "t=<unix seconds>,v1=<hex digest>".
    // secret:  the endpoint's signing secret (whsec_...).
    public static boolean verify(byte[] rawBody, String header, String secret) throws Exception {
        String timestamp = null;
        String signature = null;
        for (String part : header.split(",")) {
            String[] pair = part.split("=", 2);
            if (pair.length != 2) continue;
            if (pair[0].equals("t")) timestamp = pair[1];
            if (pair[0].equals("v1")) signature = pair[1];
        }
        if (timestamp == null || signature == null) return false;

        long seconds;
        try {
            seconds = Long.parseLong(timestamp);
        } catch (NumberFormatException e) {
            return false;
        }

        // Reject old deliveries, so a captured request cannot be replayed later.
        if (Math.abs(Instant.now().getEpochSecond() - seconds) > 300) return false;

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        mac.update((timestamp + ".").getBytes(StandardCharsets.UTF_8));
        byte[] digest = mac.doFinal(rawBody);

        StringBuilder expected = new StringBuilder();
        for (byte b : digest) expected.append(String.format("%02x", b));

        // MessageDigest.isEqual compares in constant time.
        return MessageDigest.isEqual(
            expected.toString().getBytes(StandardCharsets.UTF_8),
            signature.getBytes(StandardCharsets.UTF_8));
    }
}`;

const csharp = `using System;
using System.Security.Cryptography;
using System.Text;

public static class OxumiSignature
{
    // rawBody: the request body exactly as received, before any JSON parsing.
    // header:  the Oxumi-Signature header, "t=<unix seconds>,v1=<hex digest>".
    // secret:  the endpoint's signing secret (whsec_...).
    public static bool Verify(byte[] rawBody, string header, string secret, int toleranceSeconds = 300)
    {
        string timestamp = null;
        string signature = null;
        foreach (var part in header.Split(','))
        {
            var pair = part.Split('=', 2);
            if (pair.Length != 2) continue;
            if (pair[0] == "t") timestamp = pair[1];
            if (pair[0] == "v1") signature = pair[1];
        }
        if (timestamp == null || signature == null) return false;
        if (!long.TryParse(timestamp, out var seconds)) return false;

        // Reject old deliveries, so a captured request cannot be replayed later.
        var age = DateTimeOffset.UtcNow.ToUnixTimeSeconds() - seconds;
        if (Math.Abs(age) > toleranceSeconds) return false;

        var prefix = Encoding.UTF8.GetBytes(timestamp + ".");
        var signed = new byte[prefix.Length + rawBody.Length];
        Buffer.BlockCopy(prefix, 0, signed, 0, prefix.Length);
        Buffer.BlockCopy(rawBody, 0, signed, prefix.Length, rawBody.Length);

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var expected = Convert.ToHexString(hmac.ComputeHash(signed)).ToLowerInvariant();

        // FixedTimeEquals compares in constant time.
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(signature));
    }
}`;

// There is no server to verify in with cURL. This checks one saved delivery
// by hand with openssl, which is useful when debugging a receiver.
const curl = `#!/bin/sh
# Checks one saved delivery by hand. For debugging only: a shell comparison is
# not constant-time, so verify in your server with one of the other languages.
#
# usage: sh verify.sh body.json "t=1791844742,v1=e8e42b..." "whsec_..."
body_file="$1"
header="$2"
secret="$3"

timestamp="\${header#t=}"
timestamp="\${timestamp%%,*}"
signature="\${header##*v1=}"

# Reject a timestamp more than five minutes from now.
age=$(( $(date +%s) - timestamp ))
if [ "$age" -gt 300 ] || [ "$age" -lt -300 ]; then
  echo "rejected: timestamp is outside the five-minute window"
  exit 1
fi

# HMAC-SHA256 of "<timestamp>.<raw body>", keyed with the secret.
expected=$( { printf '%s.' "$timestamp"; cat "$body_file"; } \\
  | openssl dgst -sha256 -hmac "$secret" -r | cut -d' ' -f1 )

if [ "$expected" = "$signature" ]; then
  echo "valid"
else
  echo "invalid"
  exit 1
fi`;

export const VERIFY_SAMPLES: Samples = {
  curl,
  javascript,
  typescript,
  python,
  go,
  php,
  ruby,
  java,
  csharp,
};
