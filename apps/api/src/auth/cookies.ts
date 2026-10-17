import type { Response } from "express";

const base = () => ({
  path: "/",
  // Set when the web app and API sit on sibling subdomains.
  domain: process.env.COOKIE_DOMAIN || undefined,
});

// Without maxAge the cookie lasts until the browser closes.
export function setAuthCookie(
  res: Response,
  name: string,
  token: string,
  maxAge?: number,
): void {
  res.cookie(name, token, {
    ...base(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    ...(maxAge ? { maxAge } : {}),
  });
}

export function clearAuthCookie(res: Response, name: string): void {
  res.clearCookie(name, base());
}
