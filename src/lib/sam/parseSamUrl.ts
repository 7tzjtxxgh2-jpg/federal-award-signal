import { ExtractedSamIdentifiers, PublicDataError } from "@/lib/types";

const NOTICE_PARAM_NAMES = [
  "noticeid",
  "notice_id",
  "opportunityid",
  "opportunity_id",
];
const SOLICITATION_PARAM_NAMES = [
  "solnum",
  "solicitationnumber",
  "solicitation_number",
];

function firstParam(
  params: Record<string, string>,
  candidates: string[],
): string | undefined {
  const match = Object.entries(params).find(([key, value]) => {
    return candidates.includes(key.toLowerCase()) && value.trim().length > 0;
  });
  return match?.[1].trim();
}

export function parseSamUrl(input: string): ExtractedSamIdentifiers {
  const originalUrl = input.trim();
  if (!originalUrl) {
    throw new PublicDataError(
      "Enter a SAM.gov solicitation URL.",
      "INVALID_SAM_URL",
      400,
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(originalUrl);
  } catch {
    throw new PublicDataError(
      "The SAM.gov URL is not valid.",
      "INVALID_SAM_URL",
      400,
    );
  }

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    !(parsed.hostname === "sam.gov" || parsed.hostname.endsWith(".sam.gov"))
  ) {
    throw new PublicDataError(
      "Use a URL from sam.gov.",
      "INVALID_SAM_URL",
      400,
    );
  }

  const queryParams: Record<string, string> = {};
  parsed.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const pathSegments = parsed.pathname
    .split("/")
    .map((segment) => decodeURIComponent(segment).trim())
    .filter(Boolean);

  let noticeId = firstParam(queryParams, NOTICE_PARAM_NAMES);
  const solicitationNumber = firstParam(
    queryParams,
    SOLICITATION_PARAM_NAMES,
  );

  if (!noticeId) {
    const opportunityIndex = pathSegments.findIndex((segment) =>
      ["opp", "opportunity", "opportunities"].includes(segment.toLowerCase()),
    );
    const candidate =
      opportunityIndex >= 0 ? pathSegments[opportunityIndex + 1] : undefined;
    if (
      candidate &&
      !["view", "edit", "search"].includes(candidate.toLowerCase()) &&
      /^[a-z0-9_-]{8,}$/i.test(candidate)
    ) {
      noticeId = candidate;
    }
  }

  return {
    originalUrl,
    noticeId,
    solicitationNumber,
    rawPath: parsed.pathname,
    queryParams,
  };
}
