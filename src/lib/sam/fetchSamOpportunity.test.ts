import { describe, expect, it, vi } from "vitest";
import { fetchSamOpportunityWithDebug } from "@/lib/sam/fetchSamOpportunity";

describe("fetchSamOpportunityWithDebug", () => {
  it("searches up to five one-year windows and stops when it finds a record", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ totalRecords: 0, opportunitiesData: [] }),
      )
      .mockResolvedValueOnce(
        Response.json({ message: "No Data found" }, { status: 404 }),
      )
      .mockResolvedValueOnce(
        Response.json({
          totalRecords: 1,
          opportunitiesData: [
            {
              noticeId: "12345678abcdef",
              title: "Found in an older window",
              postedDate: "2024-01-10",
            },
          ],
        }),
      );

    const result = await fetchSamOpportunityWithDebug(
      {
        originalUrl: "https://sam.gov/opp/12345678abcdef/view",
        noticeId: "12345678abcdef",
        queryParams: {},
      },
      {
        apiKey: "test-key",
        baseUrl: "https://sam.test/search",
        fetchImpl: fetchMock,
        now: new Date("2026-07-03T12:00:00Z"),
      },
    );

    expect(result.profile.title).toBe("Found in an older window");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(
      result.queryUsed
        .filter((query) => query.source === "sam-public-search")
        .map((query) => query.params),
    ).toMatchObject([
      { postedFrom: "07/04/2025", postedTo: "07/03/2026" },
      { postedFrom: "07/04/2024", postedTo: "07/03/2025" },
      { postedFrom: "07/04/2023", postedTo: "07/03/2024" },
    ]);
  });

  it("uses only the documented public Opportunities API for workspace URLs", async () => {
    const noticeId = "4befa4be4f634d82b1f0fb16bd98a822";
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        totalRecords: 1,
        opportunitiesData: [
          {
            noticeId,
            title: "Runways Edge Tables & Chairs Update",
            solicitationNumber: "W50S9H26QA029",
            department: "DEPT OF DEFENSE",
            subTier: "DEPT OF THE ARMY",
            office: "W7N8 USPFO ACTIVITY WIANG CRTC",
            postedDate: "2026-06-26",
            naicsCode: "337127",
            classificationCode: "7105",
            descriptionText: "Tables and chairs for a public requirement.",
          },
        ],
      }),
    );

    const result = await fetchSamOpportunityWithDebug(
      {
        originalUrl: `https://sam.gov/workspace/contract/opp/${noticeId}/view`,
        noticeId,
        queryParams: {},
      },
      {
        apiKey: "test-key",
        baseUrl: "https://api.sam.test/opportunities/v2/search",
        fetchImpl: fetchMock,
        now: new Date("2026-07-03T12:00:00Z"),
      },
    );

    expect(result.profile).toMatchObject({
      title: "Runways Edge Tables & Chairs Update",
      solicitationNumber: "W50S9H26QA029",
      noticeId,
      naicsCode: "337127",
      pscCode: "7105",
      agency: "DEPT OF DEFENSE",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "https://api.sam.test/opportunities/v2/search",
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain(
      "sam.gov/api/prod",
    );
  });
});
