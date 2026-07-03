import {
  ComparableAward,
  QueryAudit,
  SolicitationProfile,
} from "@/lib/types";
import {
  buildUsaspendingQueries,
  USASPENDING_BASIC_FIELDS,
} from "@/lib/usaspending/buildUsaspendingQueries";
import {
  deduplicateAwards,
  normalizeUsaspendingAward,
} from "@/lib/usaspending/normalizeUsaspendingAwards";

type FetchComparableOptions = {
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  now?: Date;
  minimumResults?: number;
};

export type FetchComparableResult = {
  awards: ComparableAward[];
  queriesUsed: QueryAudit[];
  warnings: string[];
};

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function resultRows(body: unknown): unknown[] {
  if (!body || typeof body !== "object") return [];
  const results = (body as Record<string, unknown>).results;
  return Array.isArray(results) ? results : [];
}

function errorDetail(body: unknown): string {
  if (typeof body === "string") return body.slice(0, 300);
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    for (const key of ["detail", "message", "error"]) {
      if (typeof record[key] === "string") {
        return (record[key] as string).slice(0, 300);
      }
    }
  }
  return "Unknown API error";
}

export async function fetchComparableAwards(
  profile: SolicitationProfile,
  options: FetchComparableOptions = {},
): Promise<FetchComparableResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = (
    options.baseUrl ??
    process.env.USASPENDING_BASE_URL ??
    "https://api.usaspending.gov"
  ).replace(/\/$/, "");
  const endpoint = `${baseUrl}/api/v2/search/spending_by_award/`;
  const minimumResults = options.minimumResults ?? 25;
  const queries = buildUsaspendingQueries(profile, options.now);
  const queriesUsed: QueryAudit[] = [];
  const warnings: string[] = [];
  let awards: ComparableAward[] = [];

  for (const query of queries) {
    const audit: QueryAudit = {
      label: query.label,
      awardTypeGroup: query.awardTypeGroup,
      body: query.body,
    };
    let requestBody = query.body;
    let response: Response;

    try {
      response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      warnings.push(
        `${query.label}: USAspending could not be reached${
          error instanceof Error ? ` (${error.message})` : ""
        }.`,
      );
      queriesUsed.push(audit);
      continue;
    }

    let body = await readBody(response);
    audit.status = response.status;

    if (!response.ok && response.status === 400) {
      requestBody = { ...query.body, fields: USASPENDING_BASIC_FIELDS };
      audit.retriedWithBasicFields = true;
      audit.body = requestBody;
      response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      body = await readBody(response);
      audit.status = response.status;
    }

    if (!response.ok) {
      warnings.push(
        `${query.label}: USAspending returned ${response.status}: ${errorDetail(body)}.`,
      );
      queriesUsed.push(audit);
      continue;
    }

    const rows = resultRows(body);
    audit.resultCount = rows.length;
    queriesUsed.push(audit);
    awards = deduplicateAwards([
      ...awards,
      ...rows.map((row) => normalizeUsaspendingAward(row, profile)),
    ]);
    if (awards.length >= minimumResults) break;
  }

  if (!awards.length) {
    warnings.push(
      "USAspending returned no comparable contract or IDV awards for the attempted searches.",
    );
  }

  return {
    awards: awards.slice(0, Math.max(minimumResults, 50)),
    queriesUsed,
    warnings,
  };
}
