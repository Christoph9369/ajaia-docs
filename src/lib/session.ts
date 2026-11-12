import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Mocked auth: the session cookie is just a user id plus an HMAC signature, so it can't be
 * forged by editing the cookie. There are no passwords. Users pick a seeded account at /login.
 */
export const SESSION_COOKIE = "ajaia_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set in production.");
    return "dev-only-insecure-secret";
  }
  return s;
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function encodeSession(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

export function decodeSession(token: string | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(userId));
  return given.length === expected.length && timingSafeEqual(given, expected) ? userId : null;
}
