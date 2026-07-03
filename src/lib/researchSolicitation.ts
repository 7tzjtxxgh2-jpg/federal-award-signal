import { calculatePriceIntelligence } from "@/lib/analysis/calculatePriceIntelligence";
import { generatePursuitMemoWithDebug } from "@/lib/analysis/generatePursuitMemo";
import { summarizeVendors } from "@/lib/analysis/summarizeVendors";
import { fetchSamOpportunityWithDebug } from "@/lib/sam/fetchSamOpportunity";
import { parseSamUrl } from "@/lib/sam/parseSamUrl";
import { ResearchSolicitationResponse } from "@/lib/types";
import { fetchComparableAwards } from "@/lib/usaspending/fetchComparableAwards";

type ResearchOptions = {
  fetchImpl?: typeof fetch;
  samApiKey?: string;
  openAiApiKey?: string;
  samBaseUrl?: string;
  usaspendingBaseUrl?: string;
  openAiModel?: string;
  now?: Date;
  fallbackIdentifier?: string;
};

export async function researchSolicitation(
  samUrl: string,
  options: ResearchOptions = {},
): Promise<ResearchSolicitationResponse> {
  const extractedIdentifiers = parseSamUrl(samUrl);
  if (options.fallbackIdentifier?.trim()) {
    extractedIdentifiers.providedIdentifier =
      options.fallbackIdentifier.trim();
  }
  const warnings: string[] = [];
  if (
    !extractedIdentifiers.noticeId &&
    !extractedIdentifiers.solicitationNumber
  ) {
    warnings.push(
      "The URL was preserved, but no notice ID or solicitation number was found.",
    );
  }

  const sam = await fetchSamOpportunityWithDebug(extractedIdentifiers, {
    fetchImpl: options.fetchImpl,
    apiKey: options.samApiKey,
    baseUrl: options.samBaseUrl,
      now: options.now,
    });
  warnings.push(...sam.warnings);

  const comparable = await fetchComparableAwards(sam.profile, {
    fetchImpl: options.fetchImpl,
    baseUrl: options.usaspendingBaseUrl,
    now: options.now,
  });
  warnings.push(...comparable.warnings);

  const vendorLandscape = summarizeVendors(comparable.awards);
  const priceIntelligence = calculatePriceIntelligence(comparable.awards);
  const memo = await generatePursuitMemoWithDebug(
    {
      solicitation: sam.profile,
      comparableAwards: comparable.awards,
      vendorLandscape,
      priceIntelligence,
    },
    {
      fetchImpl: options.fetchImpl,
      apiKey: options.openAiApiKey,
      model: options.openAiModel,
    },
  );
  warnings.push(...memo.warnings);

  return {
    solicitation: sam.profile,
    comparableAwards: comparable.awards,
    vendorLandscape,
    priceIntelligence,
    pursuitMemo: memo.memo,
    debug: {
      extractedIdentifiers,
      samQueryUsed: sam.queryUsed,
      usaspendingQueriesUsed: comparable.queriesUsed,
      warnings,
    },
  };
}
