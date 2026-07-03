import { ComparableAward, SolicitationProfile } from "@/lib/types";
import {
  canonicalAgencyName,
  extractOpportunityKeywords,
} from "@/lib/usaspending/buildUsaspendingQueries";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function codeAndDescription(
  value: unknown,
): { code?: string; description?: string } {
  if (typeof value === "string") return { code: text(value) };
  if (!isRecord(value)) return {};
  return {
    code: text(value.code, value.naics, value.psc),
    description: text(value.description, value.name),
  };
}

function amount(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function same(a?: string, b?: string): boolean {
  return Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());
}

export function normalizeUsaspendingAward(
  raw: unknown,
  profile: SolicitationProfile,
): ComparableAward {
  const record = isRecord(raw) ? raw : {};
  const naics = codeAndDescription(record.NAICS ?? record.naics);
  const psc = codeAndDescription(record.PSC ?? record.psc);
  const awardingAgency = text(
    record["Awarding Agency"],
    record.awarding_agency,
  );
  const description = text(record.Description, record.description);
  const similarityReasons: string[] = [];

  if (same(naics.code, profile.naicsCode)) {
    similarityReasons.push("same NAICS");
  }
  if (same(psc.code, profile.pscCode)) {
    similarityReasons.push("same PSC");
  }
  if (
    same(
      canonicalAgencyName(awardingAgency),
      canonicalAgencyName(profile.agency),
    )
  ) {
    similarityReasons.push("same awarding agency");
  }
  const haystack = description?.toLowerCase() ?? "";
  for (const keyword of extractOpportunityKeywords(profile)) {
    if (haystack.includes(keyword)) {
      similarityReasons.push(`description keyword match: ${keyword}`);
    }
  }

  return {
    awardId: text(record["Award ID"], record.award_id, record.piid),
    recipientName: text(record["Recipient Name"], record.recipient_name),
    awardAmount: amount(record["Award Amount"] ?? record.award_amount),
    startDate: text(record["Start Date"], record.start_date),
    endDate: text(record["End Date"], record.end_date),
    awardingAgency,
    awardingSubAgency: text(
      record["Awarding Sub Agency"],
      record.awarding_sub_agency,
    ),
    awardingOffice: text(
      record["Awarding Office"],
      record.awarding_office,
    ),
    description,
    naicsCode: naics.code,
    naicsDescription: naics.description,
    pscCode: psc.code,
    pscDescription: psc.description,
    awardType: text(
      record["Contract Award Type"],
      record["Award Type"],
      record.award_type,
    ),
    competition: text(record.Competition, record.competition),
    setAside: text(record["Set Aside"], record.set_aside),
    source: "usaspending",
    raw,
    similarityReasons,
  };
}

export function awardDeduplicationKey(award: ComparableAward): string {
  const raw = isRecord(award.raw) ? award.raw : {};
  const generated = text(
    raw.generated_internal_id,
    raw.internal_id,
    raw["generated_internal_id"],
  );
  if (generated) return generated;
  return [
    award.awardId ?? "unknown",
    award.recipientName ?? "unknown",
    award.awardingAgency ?? "unknown",
  ]
    .join("|")
    .toLowerCase();
}

export function deduplicateAwards(
  awards: ComparableAward[],
): ComparableAward[] {
  const unique = new Map<string, ComparableAward>();
  for (const award of awards) {
    const key = awardDeduplicationKey(award);
    const existing = unique.get(key);
    if (!existing) {
      unique.set(key, award);
      continue;
    }
    existing.similarityReasons = [
      ...new Set([...existing.similarityReasons, ...award.similarityReasons]),
    ];
  }
  return [...unique.values()];
}
