import { describe, expect, it } from "vitest";
import { generatePursuitMemo } from "@/lib/analysis/generatePursuitMemo";

describe("generatePursuitMemo", () => {
  it("returns a deterministic caveated memo without an OpenAI key", async () => {
    const memo = await generatePursuitMemo(
      {
        solicitation: {
          title: "Test opportunity",
          sourceUrl: "https://sam.gov/opp/test-notice/view",
          rawSamRecord: {},
        },
        comparableAwards: [],
        vendorLandscape: [],
        priceIntelligence: { count: 0, notes: [] },
      },
      { apiKey: "" },
    );

    expect(memo).toContain("## Opportunity summary");
    expect(memo).toContain(
      "This report does not show losing companies’ actual bids",
    );
  });
});
