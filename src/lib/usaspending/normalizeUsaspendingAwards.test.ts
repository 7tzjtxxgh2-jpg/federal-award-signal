import { describe, expect, it } from "vitest";
import {
  deduplicateAwards,
  normalizeUsaspendingAward,
} from "@/lib/usaspending/normalizeUsaspendingAwards";

const profile = {
  title: "Cloud security operations",
  agency: "Department of Testing",
  naicsCode: "541512",
  pscCode: "DA01",
  sourceUrl: "https://sam.gov/opp/test-notice/view",
  rawSamRecord: {},
};

describe("USAspending award normalization", () => {
  it("deduplicates on generated internal ID and merges similarity reasons", () => {
    const first = normalizeUsaspendingAward(
      {
        generated_internal_id: "CONT_AWD_1",
        "Award ID": "A-1",
        "Recipient Name": "Example Co",
        "Award Amount": 500_000,
        "Awarding Agency": "Department of Testing",
        NAICS: { code: "541512", description: "Systems design" },
        PSC: { code: "OTHER", description: "Other" },
        Description: "Cloud engineering",
      },
      profile,
    );
    const second = normalizeUsaspendingAward(
      {
        generated_internal_id: "CONT_AWD_1",
        "Award ID": "A-1",
        "Recipient Name": "Example Co",
        "Awarding Agency": "Department of Testing",
        NAICS: { code: "OTHER" },
        PSC: { code: "DA01" },
        Description: "Security operations",
      },
      profile,
    );
    const deduplicated = deduplicateAwards([first, second]);

    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0].similarityReasons).toEqual(
      expect.arrayContaining(["same NAICS", "same PSC", "same awarding agency"]),
    );
  });
});
