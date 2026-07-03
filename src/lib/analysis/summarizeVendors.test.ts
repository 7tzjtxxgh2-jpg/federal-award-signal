import { describe, expect, it } from "vitest";
import { summarizeVendors } from "@/lib/analysis/summarizeVendors";
import { ComparableAward } from "@/lib/types";

function award(overrides: Partial<ComparableAward>): ComparableAward {
  return {
    source: "usaspending",
    raw: {},
    similarityReasons: [],
    ...overrides,
  };
}

describe("summarizeVendors", () => {
  it("aggregates vendor amounts and uses cautious incumbent language", () => {
    const vendors = summarizeVendors([
      award({
        recipientName: "Example LLC",
        awardAmount: 100,
        endDate: "2025-01-01",
        similarityReasons: ["same awarding agency", "same NAICS"],
      }),
      award({
        recipientName: "EXAMPLE LLC",
        awardAmount: 300,
        endDate: "2026-01-01",
        similarityReasons: ["same awarding agency", "same PSC"],
      }),
    ]);

    expect(vendors[0]).toMatchObject({
      awardCount: 2,
      totalAwardAmount: 400,
      medianAwardAmount: 200,
      latestAwardDate: "2026-01-01",
    });
    expect(vendors[0].possibleIncumbentReason).toContain(
      "possible incumbent signal, not proof",
    );
  });
});
