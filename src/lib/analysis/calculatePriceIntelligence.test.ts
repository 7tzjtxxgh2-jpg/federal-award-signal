import { describe, expect, it } from "vitest";
import { calculatePriceIntelligence } from "@/lib/analysis/calculatePriceIntelligence";
import { ComparableAward } from "@/lib/types";

function award(awardAmount: number): ComparableAward {
  return {
    awardAmount,
    source: "usaspending",
    raw: {},
    similarityReasons: [],
  };
}

describe("calculatePriceIntelligence", () => {
  it("keeps the total range but removes IQR outliers from percentiles", () => {
    const result = calculatePriceIntelligence(
      [10, 20, 30, 40, 1_000, 0].map(award),
    );
    expect(result).toMatchObject({
      count: 5,
      min: 10,
      median: 25,
      max: 1_000,
      total: 1_100,
    });
    expect(result.notes.join(" ")).toContain("IQR outlier");
    expect(result.notes.join(" ")).toContain("zero-dollar");
  });
});
