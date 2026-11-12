import { describe, expect, it } from "vitest";
import { readableAvatarColor } from "@/components/ui";

function contrastWithWhite(hex: string) {
  const ch = (v: number) => ((v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 1.05 / (0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b) + 0.05);
}

describe("readableAvatarColor", () => {
  it("darkens colours that cannot carry white text at AA", () => {
    for (const c of ["#059669", "#d97706", "#fde047"]) {
      expect(contrastWithWhite(readableAvatarColor(c))).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("leaves already-readable colours and non-hex values alone", () => {
    expect(readableAvatarColor("#4f46e5")).toBe("#4f46e5");
    expect(readableAvatarColor("rebeccapurple")).toBe("rebeccapurple");
  });
});
