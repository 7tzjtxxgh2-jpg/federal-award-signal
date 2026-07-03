import { ExtractedSamIdentifiers, SolicitationProfile } from "@/lib/types";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed && trimmed.toLowerCase() !== "null") return trimmed;
    }
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function nested(record: JsonRecord, key: string): JsonRecord {
  return isRecord(record[key]) ? record[key] : {};
}

function formatPlace(value: unknown): string | undefined {
  if (typeof value === "string") return text(value);
  if (!isRecord(value)) return undefined;

  const city = nested(value, "city");
  const state = nested(value, "state");
  const country = nested(value, "country");
  const parts = [
    text(value.streetAddress),
    text(city.name, value.city),
    text(state.code, state.name, value.state),
    text(value.zip, value.zipcode),
    text(country.code, country.name, value.country),
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

export function getSamRecords(payload: unknown): JsonRecord[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (!isRecord(payload)) return [];
  for (const key of ["opportunitiesData", "data", "results"]) {
    const value = payload[key];
    if (Array.isArray(value)) return value.filter(isRecord);
  }
  return [payload];
}

export function normalizeSamOpportunity(
  raw: unknown,
  ids: ExtractedSamIdentifiers,
  descriptionText?: string,
): SolicitationProfile {
  const record = isRecord(raw) ? raw : {};
  const organizationPath = text(
    record.fullParentPathName,
    record.organizationPath,
  );
  const pathParts = organizationPath
    ?.split(".")
    .map((part) => part.trim())
    .filter(Boolean);
  const place = record.placeOfPerformance ?? record.place_of_performance;
  const naics = nested(record, "naics");
  const psc = nested(record, "psc");
  const embeddedDescription = text(
    record.descriptionText,
    record.description_text,
  );

  return {
    title: text(record.title),
    solicitationNumber: text(
      record.solicitationNumber,
      record.solicitation_number,
      ids.solicitationNumber,
    ),
    noticeId: text(record.noticeId, record.noticeid, ids.noticeId),
    agency: text(record.department, pathParts?.[0]),
    subAgency: text(record.subTier, record.subtier, pathParts?.[1]),
    office: text(record.office, pathParts?.at(-1)),
    organizationPath,
    postedDate: text(record.postedDate, record.posted_date),
    responseDeadline: text(
      record.responseDeadLine,
      record.reponseDeadLine,
      record.responseDeadline,
    ),
    naicsCode: text(record.naicsCode, record.ncode, naics.code),
    naicsDescription: text(
      record.naicsDescription,
      record.naics_description,
      naics.description,
    ),
    pscCode: text(
      record.classificationCode,
      record.pscCode,
      psc.code,
    ),
    pscDescription: text(
      record.classificationDescription,
      record.pscDescription,
      psc.description,
    ),
    setAsideCode: text(record.typeOfSetAside, record.setAsideCode),
    setAsideDescription: text(
      record.typeOfSetAsideDescription,
      record.setAside,
    ),
    placeOfPerformance: formatPlace(place),
    descriptionText: text(descriptionText, embeddedDescription),
    sourceUrl: ids.originalUrl,
    rawSamRecord: raw,
  };
}
