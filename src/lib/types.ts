export type ExtractedSamIdentifiers = {
  originalUrl: string;
  noticeId?: string;
  solicitationNumber?: string;
  providedIdentifier?: string;
  rawPath?: string;
  queryParams: Record<string, string>;
};

export type SolicitationProfile = {
  title?: string;
  solicitationNumber?: string;
  noticeId?: string;
  agency?: string;
  subAgency?: string;
  office?: string;
  organizationPath?: string;
  postedDate?: string;
  responseDeadline?: string;
  naicsCode?: string;
  naicsDescription?: string;
  pscCode?: string;
  pscDescription?: string;
  setAsideCode?: string;
  setAsideDescription?: string;
  placeOfPerformance?: string;
  descriptionText?: string;
  noticeType?: string;
  recordKind?: "solicitation" | "award";
  relatedNoticeId?: string;
  award?: {
    number?: string;
    amount?: number;
    date?: string;
    awardeeName?: string;
  };
  sourceUrl: string;
  rawSamRecord: unknown;
};

export type ComparableAward = {
  awardId?: string;
  recipientName?: string;
  awardAmount?: number;
  startDate?: string;
  endDate?: string;
  awardingAgency?: string;
  awardingSubAgency?: string;
  awardingOffice?: string;
  description?: string;
  naicsCode?: string;
  naicsDescription?: string;
  pscCode?: string;
  pscDescription?: string;
  awardType?: string;
  competition?: string;
  setAside?: string;
  sourceDocuments: {
    label: string;
    url: string;
  }[];
  source: "usaspending";
  raw: unknown;
  similarityReasons: string[];
};

export type VendorSummary = {
  recipientName: string;
  awardCount: number;
  totalAwardAmount: number;
  medianAwardAmount?: number;
  latestAwardDate?: string;
  matchedNaicsCount?: number;
  matchedPscCount?: number;
  possibleIncumbentReason?: string;
};

export type PriceIntelligence = {
  count: number;
  min?: number;
  p25?: number;
  median?: number;
  p75?: number;
  max?: number;
  total?: number;
  notes: string[];
};

export type UsaspendingAwardTypeGroup = "contracts" | "idvs";

export type UsaspendingQuery = {
  label: string;
  awardTypeGroup: UsaspendingAwardTypeGroup;
  body: Record<string, unknown>;
};

export type QueryAudit = {
  label: string;
  awardTypeGroup: UsaspendingAwardTypeGroup;
  body: Record<string, unknown>;
  status?: number;
  resultCount?: number;
  retriedWithBasicFields?: boolean;
};

export type ResearchSolicitationResponse = {
  solicitation: SolicitationProfile;
  comparableAwards: ComparableAward[];
  vendorLandscape: VendorSummary[];
  priceIntelligence: PriceIntelligence;
  pursuitMemo: string;
  debug: {
    extractedIdentifiers: ExtractedSamIdentifiers;
    samQueryUsed: unknown;
    usaspendingQueriesUsed: QueryAudit[];
    warnings: string[];
  };
};

export class PublicDataError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "PublicDataError";
  }
}
