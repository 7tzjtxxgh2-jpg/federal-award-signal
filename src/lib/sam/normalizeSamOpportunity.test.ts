import { describe, expect, it } from "vitest";
import { normalizeSamOpportunity } from "@/lib/sam/normalizeSamOpportunity";

describe("normalizeSamOpportunity", () => {
  it("normalizes documented SAM fields and nested place data", () => {
    const profile = normalizeSamOpportunity(
      {
        noticeId: "abc123",
        title: "Network operations",
        solicitationNumber: "FAKE-001",
        fullParentPathName:
          "DEPARTMENT OF TESTING.TEST AGENCY.NETWORK OFFICE",
        postedDate: "2026-05-01",
        responseDeadLine: "2026-07-30",
        naicsCode: "541512",
        classificationCode: "DA01",
        typeOfSetAside: "SBA",
        typeOfSetAsideDescription: "Total Small Business",
        placeOfPerformance: {
          city: { name: "Milwaukee" },
          state: { code: "WI" },
          zip: "53202",
          country: { code: "USA" },
        },
      },
      {
        originalUrl: "https://sam.gov/opp/abc123/view",
        noticeId: "abc123",
        rawPath: "/opp/abc123/view",
        queryParams: {},
      },
      "Operate and maintain the network.",
    );

    expect(profile).toMatchObject({
      agency: "DEPARTMENT OF TESTING",
      subAgency: "TEST AGENCY",
      office: "NETWORK OFFICE",
      responseDeadline: "2026-07-30",
      naicsCode: "541512",
      pscCode: "DA01",
      placeOfPerformance: "Milwaukee, WI, 53202, USA",
      descriptionText: "Operate and maintain the network.",
    });
  });
});
