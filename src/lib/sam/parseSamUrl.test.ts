import { describe, expect, it } from "vitest";
import { parseSamUrl } from "@/lib/sam/parseSamUrl";

describe("parseSamUrl", () => {
  it("extracts a notice ID from the common opportunity path", () => {
    const parsed = parseSamUrl(
      "https://sam.gov/opp/abc12345def67890/view?from=search",
    );
    expect(parsed.noticeId).toBe("abc12345def67890");
    expect(parsed.queryParams).toEqual({ from: "search" });
  });

  it("extracts case-insensitive identifier query parameters", () => {
    const parsed = parseSamUrl(
      "https://sam.gov/search/?noticeId=notice-1234&solicitationNumber=W912-26-R-1",
    );
    expect(parsed.noticeId).toBe("notice-1234");
    expect(parsed.solicitationNumber).toBe("W912-26-R-1");
  });

  it("preserves a valid SAM URL when no identifier is present", () => {
    const parsed = parseSamUrl("https://sam.gov/search/?index=opp");
    expect(parsed.noticeId).toBeUndefined();
    expect(parsed.originalUrl).toContain("sam.gov");
  });

  it("rejects non-SAM hosts", () => {
    expect(() => parseSamUrl("https://example.com/opp/abc123456")).toThrow(
      "Use a URL from sam.gov.",
    );
  });
});
