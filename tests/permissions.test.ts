import { describe, expect, it } from "vitest";
import { can, resolveAccess } from "@/lib/permissions";

const doc = { ownerId: "alice" };
const shares = [
  { userId: "bob", role: "editor" as const },
  { userId: "carol", role: "viewer" as const },
];

describe("resolveAccess", () => {
  it("treats the owner as owner even if a share row also exists", () => {
    expect(resolveAccess(doc, [...shares, { userId: "alice", role: "viewer" }], "alice")).toBe("owner");
  });
  it("returns the shared role for collaborators", () => {
    expect(resolveAccess(doc, shares, "bob")).toBe("editor");
    expect(resolveAccess(doc, shares, "carol")).toBe("viewer");
  });
  it("returns null for everyone else", () => {
    expect(resolveAccess(doc, shares, "mallory")).toBeNull();
  });
});

describe("can", () => {
  it.each([
    ["owner", "share", true],
    ["owner", "delete", true],
    ["editor", "edit", true],
    ["editor", "rename", true],
    ["editor", "share", false],
    ["editor", "delete", false],
    ["viewer", "view", true],
    ["viewer", "edit", false],
    ["viewer", "rename", false],
    [null, "view", false],
  ] as const)("%s → %s = %s", (access, action, expected) => {
    expect(can(access, action)).toBe(expected);
  });
});
