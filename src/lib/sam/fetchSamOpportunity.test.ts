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
    ]);
  });

  it("follows an award notice to its related original solicitation", async () => {
    const awardNoticeId = "5bc31d547dd34510ae98327519c30a90";
    const solicitationNoticeId = "f42cb58d7201471a94259e85b2471f3c";
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.includes(`/opportunities/${awardNoticeId}?`)) {
        return Response.json({
          id: awardNoticeId,
          opportunityId: awardNoticeId,
          postedDate: "2026-06-16T20:05:41.908Z",
          data2: {
            type: "a",
            title: "Janitorial award",
            solicitationNumber: "1232SA26P0366",
            award: {
              number: "1232SA26P0366",
              amount: "118378.26",
              date: "2026-06-16",
              awardee: { name: "Example Cleaner LLC" },
            },
          },
          related: { opportunityId: solicitationNoticeId },
        });
      }
      if (url.includes(`/opportunities/${solicitationNoticeId}?`)) {
        return Response.json({
          id: solicitationNoticeId,
          opportunityId: solicitationNoticeId,
          postedDate: "2026-05-06T13:30:00Z",
          description: [{ body: "<p>Janitorial services for a facility.</p>" }],
          data2: {
            type: "k",
            title: "Janitorial solicitation",
            solicitationNumber: "1232SA26Q0580",
            organizationId: "500022476",
            naics: [{ code: ["561720"], type: "primary" }],
            classificationCode: "S201",
            solicitation: {
              setAside: "SBA",
              deadlines: { response: "2026-05-20T15:00:00-04:00" },
            },
          },
        });
      }
      if (url.includes("/opportunities/organizations/500022476?")) {
        return Response.json({
          _embedded: [
            {
              org: {
                l1Name: "AGRICULTURE, DEPARTMENT OF",
                l2Name: "AGRICULTURAL RESEARCH SERVICE",
                l3Name: "USDA ARS AFM APD",
              },
            },
          ],
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await fetchSamOpportunityWithDebug(
      {
        originalUrl: `https://sam.gov/workspace/contract/opp/${awardNoticeId}/view`,
        noticeId: awardNoticeId,
        queryParams: {},
      },
      { apiKey: "test-key", fetchImpl: fetchMock },
    );

    expect(result.profile).toMatchObject({
      title: "Janitorial solicitation",
      solicitationNumber: "1232SA26Q0580",
      noticeId: solicitationNoticeId,
      relatedNoticeId: awardNoticeId,
      naicsCode: "561720",
      pscCode: "S201",
      agency: "AGRICULTURE, DEPARTMENT OF",
      award: {
        number: "1232SA26P0366",
        amount: 118378.26,
        awardeeName: "Example Cleaner LLC",
      },
    });
    expect(result.warnings.join(" ")).toContain("award notice");
  });
});
