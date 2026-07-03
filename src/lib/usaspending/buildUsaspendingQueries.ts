import {
  SolicitationProfile,
  UsaspendingAwardTypeGroup,
  UsaspendingQuery,
} from "@/lib/types";

const CONTRACT_TYPES = ["A", "B", "C", "D"];
const IDV_TYPES = [
  "IDV_A",
  "IDV_B",
  "IDV_B_A",
  "IDV_B_B",
  "IDV_B_C",
  "IDV_C",
  "IDV_D",
  "IDV_E",
];

export const USASPENDING_FIELDS = [
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
];

export const USASPENDING_BASIC_FIELDS = [
  "Award ID",
  "Recipient Name",
  "Award Amount",
  "Start Date",
  "End Date",
  "Awarding Agency",
  "Awarding Sub Agency",
  "Contract Award Type",
  "Description",
];

const STOP_WORDS = new Set([
  "and",
  "for",
  "from",
  "the",
  "with",
  "services",
  "service",
  "support",
  "solicitation",
  "requirement",
  "contract",
  "notice",
  "acquisition",
  "commercial",
  "items",
  "offer",
  "offers",
  "quote",
  "quotes",
  "quotation",
  "quotations",
  "must",
  "shall",
  "attached",
  "information",
  "this",
  "that",
  "will",
  "government",
  "federal",
]);

const AGENCY_ACRONYMS = new Set([
  "DOD",
  "DHS",
  "GSA",
  "NASA",
  "NSF",
  "SBA",
  "USAID",
  "USDA",
  "VA",
]);

function titleCaseAgency(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      const upper = word.toUpperCase();
      if (AGENCY_ACRONYMS.has(upper)) return upper;
      return word ? `${word[0].toUpperCase()}${word.slice(1)}` : word;
    })
    .join(" ");
}

export function canonicalAgencyName(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  const trimmed = value.trim().replace(/\s+/g, " ");
  const reversedDepartment = trimmed.match(
    /^(.+),\s*(?:DEPARTMENT|DEPT)\s+OF$/i,
  );
  if (reversedDepartment) {
    return `Department of ${titleCaseAgency(reversedDepartment[1])}`;
  }
  const forwardDepartment = trimmed.match(
    /^(?:DEPARTMENT|DEPT)\s+OF\s+(.+)$/i,
  );
  if (forwardDepartment) {
    return `Department of ${titleCaseAgency(forwardDepartment[1])}`;
  }
  return titleCaseAgency(trimmed);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dateRange(now: Date) {
  const end = new Date(now);
  const start = new Date(
    Date.UTC(
      end.getUTCFullYear() - 5,
      end.getUTCMonth(),
      end.getUTCDate(),
    ),
  );
  return [{ start_date: isoDate(start), end_date: isoDate(end) }];
}

export function extractOpportunityKeywords(
  profile: SolicitationProfile,
): string[] {
  const source = `${profile.title ?? ""} ${profile.descriptionText ?? ""}`;
  const counts = new Map<string, number>();
  source
    .toLowerCase()
    .match(/[a-z][a-z0-9-]{3,}/g)
    ?.forEach((word) => {
      if (STOP_WORDS.has(word) || /^\d+$/.test(word)) return;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 4)
    .map(([word]) => word);
}

function agencyFilter(profile: SolicitationProfile) {
  const agency = canonicalAgencyName(profile.agency);
  return agency
    ? [
        {
          type: "awarding",
          tier: "toptier",
          name: agency,
        },
      ]
    : undefined;
}

function compactObject(
  value: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => {
      if (item === undefined || item === null) return false;
      return !Array.isArray(item) || item.length > 0;
    }),
  );
}

function awardTypes(group: UsaspendingAwardTypeGroup): string[] {
  return group === "contracts" ? CONTRACT_TYPES : IDV_TYPES;
}

export function buildUsaspendingQueries(
  profile: SolicitationProfile,
  now = new Date(),
): UsaspendingQuery[] {
  const timeFilter = {
    time_period: dateRange(now),
  };
  const agencies = agencyFilter(profile);
  const keywords = extractOpportunityKeywords(profile);
  const strategies: Array<{
    label: string;
    filters: Record<string, unknown>;
  }> = [];

  if (agencies) {
    if (profile.naicsCode && profile.pscCode) {
      strategies.push({
        label: "Tight: NAICS + PSC + agency",
        filters: {
          ...timeFilter,
          agencies,
          naics_codes: [profile.naicsCode],
          psc_codes: [profile.pscCode],
        },
      });
    }
    if (profile.naicsCode) {
      strategies.push({
        label: "Broad: NAICS + agency",
        filters: {
          ...timeFilter,
          agencies,
          naics_codes: [profile.naicsCode],
        },
      });
    }
    if (profile.pscCode) {
      strategies.push({
        label: "Broad: PSC + agency",
        filters: {
          ...timeFilter,
          agencies,
          psc_codes: [profile.pscCode],
        },
      });
    }
  }

  if (profile.naicsCode && profile.pscCode) {
    strategies.push({
      label: "Fallback: NAICS + PSC across all agencies",
      filters: {
        ...timeFilter,
        naics_codes: [profile.naicsCode],
        psc_codes: [profile.pscCode],
      },
    });
  }
  if (profile.naicsCode) {
    strategies.push({
      label: "Fallback: NAICS across all agencies",
      filters: {
        ...timeFilter,
        naics_codes: [profile.naicsCode],
      },
    });
  }
  if (profile.pscCode) {
    strategies.push({
      label: "Fallback: PSC across all agencies",
      filters: {
        ...timeFilter,
        psc_codes: [profile.pscCode],
      },
    });
  }

  if (keywords.length) {
    if (agencies) {
      strategies.push({
        label: "Fallback: opportunity keywords + agency",
        filters: {
          ...timeFilter,
          agencies,
          keywords,
        },
      });
    }
    strategies.push({
      label: "Fallback: opportunity keywords across all agencies",
      filters: {
        ...timeFilter,
        keywords,
      },
    });
  }

  const deduplicatedStrategies = strategies.filter((strategy, index, all) => {
    const serialized = JSON.stringify(compactObject(strategy.filters));
    return (
      all.findIndex(
        (candidate) =>
          JSON.stringify(compactObject(candidate.filters)) === serialized,
      ) === index
    );
  });

  return deduplicatedStrategies.flatMap((strategy) => {
    return (["contracts", "idvs"] as UsaspendingAwardTypeGroup[]).map(
      (group) => ({
        label: `${strategy.label} (${group})`,
        awardTypeGroup: group,
        body: {
          filters: compactObject({
            ...strategy.filters,
            award_type_codes: awardTypes(group),
          }),
          fields: USASPENDING_FIELDS,
          page: 1,
          limit: 25,
          sort: "Award Amount",
          order: "desc",
          subawards: false,
        },
      }),
    );
  });
}
