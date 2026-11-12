import { describe, expect, it } from "vitest";
import { decodeSession, encodeSession } from "@/lib/session";

describe("session cookie", () => {
  it("round-trips a signed user id", () => {
    expect(decodeSession(encodeSession("user_123"))).toBe("user_123");
  });

  it("rejects tampered, swapped or malformed tokens", () => {
    const token = encodeSession("alice");
    const [, sig] = token.split(".");
    expect(decodeSession(`bob.${sig}`)).toBeNull(); // someone else's id with Alice's signature
    expect(decodeSession(`${token}x`)).toBeNull();
    expect(decodeSession("alice")).toBeNull();
    expect(decodeSession("")).toBeNull();
    expect(decodeSession(undefined)).toBeNull();
  });
});
