import { ExtractedSamIdentifiers, SolicitationProfile } from "@/lib/types";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function record(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function text(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function number(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function stripHtml(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned || undefined;
}

function description(detail: JsonRecord): string | undefined {
  if (!Array.isArray(detail.description)) {
    return stripHtml(detail.description);
  }
  return detail.description
    .map((item) => stripHtml(record(item).body))
    .filter((item): item is string => Boolean(item))
    .join("\n\n");
}

function primaryNaics(data: JsonRecord): string | undefined {
  if (typeof data.naics === "string") return text(data.naics);
  if (!Array.isArray(data.naics)) return undefined;
  const primary =
    data.naics.find((item) => record(item).type === "primary") ?? data.naics[0];
  const code = record(primary).code;
  if (Array.isArray(code)) return text(code[0]);
  return text(code);
}

function formatPlace(value: unknown): string | undefined {
  const place = record(value);
  const city = record(place.city);
  const state = record(place.state);
  const country = record(place.country);
  const parts = [
    text(place.streetAddress),
    text(city.name, place.city),
    text(state.code, state.name, place.state),
    text(place.zip, place.zipcode),
    text(country.code, country.name, place.country),
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

function organizationRecord(value: unknown): JsonRecord {
  const root = record(value);
  const embedded = Array.isArray(root._embedded) ? root._embedded[0] : undefined;
  return record(record(embedded).org);
}

const NOTICE_TYPES: Record<string, string> = {
  a: "Award Notice",
  k: "Combined Synopsis/Solicitation",
  o: "Solicitation",
  p: "Pre-solicitation",
  r: "Sources Sought",
  s: "Special Notice",
  u: "Justification",
};

export function normalizeSamNoticeDetail(input: {
  detail: unknown;
  ids: ExtractedSamIdentifiers;
  organization?: unknown;
  originatingAwardNotice?: unknown;
}): SolicitationProfile {
  const detail = record(input.detail);
  const data = record(detail.data2);
  const solicitation = record(data.solicitation);
  const deadlines = record(solicitation.deadlines);
  const org = organizationRecord(input.organization);
  const awardNotice = record(input.originatingAwardNotice);
  const awardData = record(
    Object.keys(awardNotice).length
      ? record(awardNotice.data2).award
      : data.award,
  );
  const awardee = record(awardData.awardee);
  const inputNoticeId = input.ids.noticeId;
  const resolvedNoticeId = text(detail.opportunityId, detail.id);
  const typeCode = text(data.type)?.toLowerCase();
  const organizationPath = [org.l1Name, org.l2Name, org.l3Name]
    .filter((value): value is string => typeof value === "string" && Boolean(value))
    .join(".");

  return {
    title: text(data.title),
    solicitationNumber: text(
      data.solicitationNumber,
      input.ids.providedIdentifier,
      input.ids.solicitationNumber,
    ),
    noticeId: resolvedNoticeId ?? inputNoticeId,
    agency: text(org.l1Name),
    subAgency: text(org.l2Name),
    office: text(org.l3Name, org.name),
    organizationPath: organizationPath || undefined,
    postedDate: text(detail.postedDate),
    responseDeadline: text(deadlines.response),
    naicsCode: primaryNaics(data),
    pscCode: text(data.classificationCode),
    setAsideCode: text(solicitation.setAside),
    setAsideDescription: text(solicitation.setAsideDescription),
    placeOfPerformance: formatPlace(data.placeOfPerformance),
    descriptionText: description(detail),
    noticeType: typeCode ? NOTICE_TYPES[typeCode] ?? typeCode : undefined,
    recordKind: typeCode === "a" ? "award" : "solicitation",
    relatedNoticeId:
      inputNoticeId && resolvedNoticeId !== inputNoticeId
        ? inputNoticeId
        : text(record(detail.related).opportunityId),
    award: Object.keys(awardData).length
      ? {
          number: text(awardData.number),
          amount: number(awardData.amount),
          date: text(awardData.date),
          awardeeName: text(awardee.name),
        }
      : undefined,
    sourceUrl: input.ids.originalUrl,
    rawSamRecord: {
      noticeDetail: input.detail,
      organization: input.organization,
      originatingAwardNotice: input.originatingAwardNotice,
    },
  };
}
