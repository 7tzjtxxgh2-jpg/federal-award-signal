import {
  ExtractedSamIdentifiers,
  PublicDataError,
  SolicitationProfile,
} from "@/lib/types";
import {
  getSamRecords,
  normalizeSamOpportunity,
} from "@/lib/sam/normalizeSamOpportunity";

export type FetchSamOptions = {
  fetchImpl?: typeof fetch;
  apiKey?: string;
  baseUrl?: string;
  now?: Date;
};

export type FetchSamResult = {
  profile: SolicitationProfile;
  queryUsed: Array<{
    label: string;
    source:
      | "sam-public-search"
      | "usaspending-award-fallback";
    endpoint: string;
    method: "GET" | "POST";
    params?: Record<string, string>;
    body?: Record<string, unknown>;
    status?: number;
    resultCount?: number;
  }>;
  warnings: string[];
};

function mmddyyyy(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function searchWindows(
  now: Date,
  years = 5,
): Array<{ from: Date; to: Date }> {
  const windows: Array<{ from: Date; to: Date }> = [];
  let to = new Date(now);

  for (let index = 0; index < years; index += 1) {
    const from = new Date(to);
    from.setUTCFullYear(from.getUTCFullYear() - 1);
    from.setUTCDate(from.getUTCDate() + 1);
    windows.push({ from, to: new Date(to) });

    to = new Date(from);
    to.setUTCDate(to.getUTCDate() - 1);
  }

  return windows;
}

async function responseBody(response: Response): Promise<unknown> {
  const body = await response.text();
  if (!body) return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

function apiMessage(body: unknown): string | undefined {
  if (typeof body === "string") return body.slice(0, 500);
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    for (const key of ["message", "detail", "error"]) {
      if (typeof record[key] === "string") return record[key] as string;
    }
  }
  return undefined;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function valueText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function codeValue(value: unknown): {
  code?: string;
  description?: string;
} {
  if (typeof value === "string") return { code: value };
  if (!isRecord(value)) return {};
  return {
    code: valueText(value.code),
    description: valueText(value.description),
  };
}

async function fetchUsaspendingAwardProfile(
  awardId: string,
  sourceUrl: string,
  fetchImpl: typeof fetch,
  queryUsed: FetchSamResult["queryUsed"],
): Promise<SolicitationProfile | undefined> {
  const baseUrl = (
    process.env.USASPENDING_BASE_URL ?? "https://api.usaspending.gov"
  ).replace(/\/$/, "");
  const endpoint = `${baseUrl}/api/v2/search/spending_by_award/`;
  const body = {
    filters: {
      time_period: [
        { start_date: "2007-10-01", end_date: new Date().toISOString().slice(0, 10) },
      ],
      award_type_codes: ["A", "B", "C", "D"],
      award_ids: [awardId],
    },
    fields: [
      "Award ID",
      "Recipient Name",
      "Award Amount",
      "Start Date",
      "End Date",
      "Awarding Agency",
      "Awarding Sub Agency",
      "Awarding Office",
      "Contract Award Type",
      "Description",
      "NAICS",
      "PSC",
    ],
    page: 1,
    limit: 10,
    sort: "Award Amount",
    order: "desc",
    subawards: false,
  };
  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const responseBodyValue = await responseBody(response);
    const rows =
      isRecord(responseBodyValue) && Array.isArray(responseBodyValue.results)
        ? responseBodyValue.results
        : [];
    queryUsed.push({
      label: `USAspending exact award: ${awardId}`,
      source: "usaspending-award-fallback",
      endpoint,
      method: "POST",
      body,
      status: response.status,
      resultCount: rows.length,
    });
    const row = rows.find(isRecord);
    if (!response.ok || !row) return undefined;
    const naics = codeValue(row.NAICS);
    const psc = codeValue(row.PSC);
    const amount = Number(row["Award Amount"]);
    return {
      title: valueText(row.Description) ?? `Federal award ${awardId}`,
      solicitationNumber: valueText(row["Award ID"], awardId),
      noticeId: undefined,
      agency: valueText(row["Awarding Agency"]),
      subAgency: valueText(row["Awarding Sub Agency"]),
      office: valueText(row["Awarding Office"]),
      postedDate: valueText(row["Start Date"]),
      naicsCode: naics.code,
      naicsDescription: naics.description,
      pscCode: psc.code,
      pscDescription: psc.description,
      descriptionText: valueText(row.Description),
      noticeType: "USAspending award fallback",
      recordKind: "award",
      award: {
        number: valueText(row["Award ID"], awardId),
        amount: Number.isFinite(amount) ? amount : undefined,
        date: valueText(row["Start Date"]),
        awardeeName: valueText(row["Recipient Name"]),
      },
      sourceUrl,
      rawSamRecord: {
        resolutionSource: "usaspending-award-fallback",
        award: row,
      },
    };
  } catch {
    queryUsed.push({
      label: `USAspending exact award: ${awardId}`,
      source: "usaspending-award-fallback",
      endpoint,
      method: "POST",
      body,
    });
    return undefined;
  }
}

async function fetchDescription(
  record: Record<string, unknown>,
  apiKey: string,
  fetchImpl: typeof fetch,
): Promise<{ text?: string; warning?: string }> {
  if (typeof record.description !== "string") return {};
  const value = record.description.trim();
  if (!value.startsWith("http")) return { text: value };

  try {
    const url = new URL(value);
    url.searchParams.set("api_key", apiKey);
    const response = await fetchImpl(url);
    if (!response.ok) {
      return {
        warning: `SAM.gov description could not be retrieved (${response.status}).`,
      };
    }
    const body = await response.text();
    try {
      const parsed = JSON.parse(body) as unknown;
      if (typeof parsed === "string") return { text: parsed };
      if (parsed && typeof parsed === "object") {
        const object = parsed as Record<string, unknown>;
        const description =
          object.description ?? object.content ?? object.text ?? object.result;
        if (typeof description === "string") return { text: description };
      }
    } catch {
      // SAM sometimes serves the description as plain text or HTML.
    }
    return { text: body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() };
  } catch {
    return { warning: "SAM.gov returned an invalid description URL." };
  }
}

export async function fetchSamOpportunityWithDebug(
  ids: ExtractedSamIdentifiers,
  options: FetchSamOptions = {},
): Promise<FetchSamResult> {
  if (!ids.noticeId && !ids.solicitationNumber && !ids.providedIdentifier) {
    throw new PublicDataError(
      "Could not extract a SAM.gov notice ID or solicitation number from this URL.",
      "SAM_IDENTIFIER_NOT_FOUND",
      400,
    );
  }

  const apiKey = options.apiKey ?? process.env.SAM_API_KEY;
  if (!apiKey || apiKey === "replace_me") {
    throw new PublicDataError(
      "SAM_API_KEY is not configured. Add it to .env.local and try again.",
      "SAM_API_KEY_MISSING",
      503,
    );
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl =
    options.baseUrl ??
    process.env.SAM_OPPORTUNITIES_BASE_URL ??
    "https://api.sam.gov/opportunities/v2/search";
  const now = options.now ?? new Date();
  const queryUsed: FetchSamResult["queryUsed"] = [];
  const warnings: string[] = [];

  const publicIdentifiers: Array<{
    key: "noticeid" | "solnum";
    value: string;
  }> = [];
  if (ids.noticeId) {
    publicIdentifiers.push({ key: "noticeid", value: ids.noticeId });
  }
  for (const value of [ids.providedIdentifier, ids.solicitationNumber]) {
    if (
      value &&
      !publicIdentifiers.some(
        (candidate) =>
          candidate.key === "solnum" &&
          candidate.value.toLowerCase() === value.toLowerCase(),
      )
    ) {
      publicIdentifiers.push({ key: "solnum", value });
    }
  }

  for (const identifier of publicIdentifiers) {
    for (const { from, to } of searchWindows(now)) {
      const publicParams: Record<string, string> = {
        limit: "10",
        offset: "0",
        postedFrom: mmddyyyy(from),
        postedTo: mmddyyyy(to),
        [identifier.key]: identifier.value,
      };
      const url = new URL(baseUrl);
      Object.entries(publicParams).forEach(([key, value]) =>
        url.searchParams.set(key, value),
      );
      url.searchParams.set("api_key", apiKey);

      let response: Response;
      try {
        response = await fetchImpl(url);
      } catch (error) {
        queryUsed.push({
          label: `SAM public search: ${identifier.key} ${identifier.value}`,
          source: "sam-public-search",
          endpoint: baseUrl,
          method: "GET",
          params: publicParams,
        });
        warnings.push(
          `SAM public search could not be reached${
            error instanceof Error ? ` (${error.message})` : ""
          }.`,
        );
        break;
      }

      const body = await responseBody(response);
      const records = response.ok ? getSamRecords(body) : [];
      queryUsed.push({
        label: `SAM public search: ${identifier.key} ${identifier.value}`,
        source: "sam-public-search",
        endpoint: baseUrl,
        method: "GET",
        params: publicParams,
        status: response.status,
        resultCount: records.length,
      });

      if (!response.ok && response.status !== 404) {
        warnings.push(
          `SAM public search returned ${response.status}${
            apiMessage(body) ? ` (${apiMessage(body)})` : ""
          }.`,
        );
        break;
      }
      if (response.status === 404) continue;

      const selected =
        records.find((record) => {
          const noticeId = String(record.noticeId ?? record.noticeid ?? "");
          const solnum = String(
            record.solicitationNumber ?? record.solicitation_number ?? "",
          );
          return identifier.key === "noticeid"
            ? noticeId === identifier.value
            : solnum.trim().toLowerCase() ===
                identifier.value.trim().toLowerCase();
        }) ?? records[0];

      if (selected) {
        const description = await fetchDescription(selected, apiKey, fetchImpl);
        if (description.warning) warnings.push(description.warning);
        return {
          profile: normalizeSamOpportunity(selected, ids, description.text),
          queryUsed,
          warnings,
        };
      }
    }
  }

  const awardFallbackId =
    ids.providedIdentifier ?? ids.solicitationNumber;
  if (awardFallbackId) {
    const profile = await fetchUsaspendingAwardProfile(
      awardFallbackId,
      ids.originalUrl,
      fetchImpl,
      queryUsed,
    );
    if (profile) {
      warnings.push(
        "SAM.gov did not return the identifier, so an exact USAspending award record was used to build the research profile.",
      );
      return { profile, queryUsed, warnings };
    }
  }

  throw new PublicDataError(
    "SAM.gov did not return usable metadata for this notice. Add the solicitation or award number as a fallback and retry.",
    "SAM_OPPORTUNITY_NOT_FOUND",
    404,
    {
      extractedIdentifiers: ids,
      attemptedQueries: queryUsed,
      warnings,
      suggestion:
        "For an award notice, enter its award number. For a solicitation, enter the solicitation number shown on SAM.gov.",
    },
  );
}

export async function fetchSamOpportunity(
  ids: ExtractedSamIdentifiers,
  options: FetchSamOptions = {},
): Promise<SolicitationProfile> {
  return (await fetchSamOpportunityWithDebug(ids, options)).profile;
}
