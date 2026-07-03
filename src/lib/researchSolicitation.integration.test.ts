import { describe, expect, it, vi } from "vitest";
import { researchSolicitation } from "@/lib/researchSolicitation";

describe("researchSolicitation integration", () => {
  it("joins mocked SAM and USAspending responses into an auditable report", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("https://sam.test/search")) {
        return Response.json({
          opportunitiesData: [
            {
              noticeId: "12345678abcdef",
              solicitationNumber: "TEST-26-001",
              title: "Cybersecurity operations",
              fullParentPathName:
                "Department of Testing.Test Agency.Security Office",
              postedDate: "2026-06-01",
              responseDeadLine: "2026-07-31",
              naicsCode: "541512",
              classificationCode: "DA01",
              description: "Operate cloud security services.",
            },
          ],
        });
      }
      if (
        url ===
        "https://usa.test/api/v2/search/spending_by_award/"
      ) {
        return Response.json({
          results: Array.from({ length: 25 }, (_, index) => ({
            generated_internal_id: `CONT_AWD_${index}`,
            "Award ID": `TEST-${index}`,
            "Recipient Name": `Vendor ${index % 3}`,
            "Award Amount": 100_000 + index * 10_000,
            "Start Date": "2024-01-01",
            "End Date": "2026-01-01",
            "Awarding Agency": "Department of Testing",
            Description: "Cybersecurity operations and cloud monitoring",
            NAICS: { code: "541512", description: "Systems design" },
            PSC: { code: "DA01", description: "IT services" },
          })),
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await researchSolicitation(
      "https://sam.gov/opp/12345678abcdef/view",
      {
        fetchImpl: fetchMock as typeof fetch,
        samApiKey: "test-key",
        openAiApiKey: "",
        samBaseUrl: "https://sam.test/search",
        usaspendingBaseUrl: "https://usa.test",
        now: new Date("2026-07-03T12:00:00Z"),
      },
    );

    expect(result.solicitation.title).toBe("Cybersecurity operations");
    expect(result.comparableAwards).toHaveLength(25);
    expect(result.vendorLandscape).toHaveLength(3);
    expect(result.priceIntelligence.count).toBe(25);
    expect(result.debug.usaspendingQueriesUsed).toHaveLength(1);
    expect(result.pursuitMemo).toContain("public award and obligation data");
  });
});
