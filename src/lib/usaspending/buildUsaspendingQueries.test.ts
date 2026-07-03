import { describe, expect, it } from "vitest";
import { buildUsaspendingQueries } from "@/lib/usaspending/buildUsaspendingQueries";

describe("buildUsaspendingQueries", () => {
  it("builds tight and broad contract/IDV searches without mixing type groups", () => {
    const queries = buildUsaspendingQueries(
      {
        title: "Cybersecurity network operations",
        agency: "Department of Testing",
        naicsCode: "541512",
        pscCode: "DA01",
        sourceUrl: "https://sam.gov/opp/test-notice/view",
        rawSamRecord: {},
      },
      new Date("2026-07-03T12:00:00Z"),
    );

    expect(queries.length).toBeGreaterThanOrEqual(8);
    expect(queries[0].label).toContain("Tight");
    expect(queries[0].body).toMatchObject({
      filters: {
        time_period: [
          {
            start_date: "2021-07-03",
            end_date: "2026-07-03",
          },
        ],
        naics_codes: ["541512"],
        psc_codes: ["DA01"],
        award_type_codes: ["A", "B", "C", "D"],
      },
    });
    expect(
      (
        (queries[1].body.filters as Record<string, unknown>)
          .award_type_codes as string[]
      ).every((code) => code.startsWith("IDV_")),
    ).toBe(true);
  });

  it("translates SAM's abbreviated department names for USAspending", () => {
    const queries = buildUsaspendingQueries({
      agency: "DEPT OF DEFENSE",
      naicsCode: "337127",
      pscCode: "7105",
      sourceUrl: "https://sam.gov/opp/test-notice/view",
      rawSamRecord: {},
    });

    expect(queries[0].body).toMatchObject({
      filters: {
        agencies: [
          {
            type: "awarding",
            tier: "toptier",
            name: "Department of Defense",
          },
        ],
      },
    });
  });

  it("translates SAM's reversed department names for USAspending", () => {
    const queries = buildUsaspendingQueries({
      agency: "AGRICULTURE, DEPARTMENT OF",
      naicsCode: "561720",
      sourceUrl: "https://sam.gov/opp/test-notice/view",
      rawSamRecord: {},
    });
    expect(queries[0].body).toMatchObject({
      filters: {
        agencies: [
          {
            type: "awarding",
            tier: "toptier",
            name: "Department of Agriculture",
          },
        ],
      },
    });
  });

  it("adds classification fallbacks that are not blocked by an agency name", () => {
    const queries = buildUsaspendingQueries({
      agency: "DEPT OF DEFENSE",
      naicsCode: "337127",
      pscCode: "7105",
      sourceUrl: "https://sam.gov/opp/test-notice/view",
      rawSamRecord: {},
    });
    const fallback = queries.find(
      (query) =>
        query.label ===
        "Fallback: NAICS + PSC across all agencies (contracts)",
    );
    const filters = fallback?.body.filters as Record<string, unknown>;

    expect(fallback).toBeDefined();
    expect(filters).toMatchObject({
      naics_codes: ["337127"],
      psc_codes: ["7105"],
      award_type_codes: ["A", "B", "C", "D"],
    });
    expect(filters).not.toHaveProperty("agencies");
  });
});
