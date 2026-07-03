import {
  ComparableAward,
  PriceIntelligence,
  SolicitationProfile,
  VendorSummary,
} from "@/lib/types";

const MANDATORY_CAVEAT =
  "This report does not show losing companies’ actual bids, proposals, or line-item pricing. It uses public award and obligation data to infer comparable procurement patterns.";

type MemoInput = {
  solicitation: SolicitationProfile;
  comparableAwards: ComparableAward[];
  vendorLandscape: VendorSummary[];
  priceIntelligence: PriceIntelligence;
};

type MemoOptions = {
  fetchImpl?: typeof fetch;
  apiKey?: string;
  model?: string;
};

function money(value?: number): string {
  if (value === undefined) return "not available";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function deterministicPursuitMemo(input: MemoInput): string {
  const { solicitation, comparableAwards, vendorLandscape, priceIntelligence } =
    input;
  const opportunity = solicitation.title ?? "This opportunity";
  const identifiers = [
    solicitation.naicsCode && `NAICS ${solicitation.naicsCode}`,
    solicitation.pscCode && `PSC ${solicitation.pscCode}`,
    solicitation.agency,
  ].filter(Boolean);
  const topVendors = vendorLandscape.slice(0, 3);

  return `## Opportunity summary

${opportunity} is a ${solicitation.setAsideDescription ?? "federal"} procurement${solicitation.agency ? ` associated with ${solicitation.agency}` : ""}. The public notice${identifiers.length ? ` identifies ${identifiers.join(", ")}` : " has limited classification metadata"}${solicitation.responseDeadline ? ` and lists a response deadline of ${solicitation.responseDeadline}` : ""}.

## Why these awards are comparable

The research cascade found ${comparableAwards.length} unique public contract or IDV award${comparableAwards.length === 1 ? "" : "s"}. Matches were based on the available NAICS, PSC, awarding-agency, and opportunity-keyword signals. These are research analogues, not proof that every award has the same scope.

## Vendor landscape

${
  topVendors.length
    ? topVendors
        .map(
          (vendor) =>
            `- **${vendor.recipientName}:** ${vendor.awardCount} similar award${vendor.awardCount === 1 ? "" : "s"} totaling ${money(vendor.totalAwardAmount)}.${vendor.possibleIncumbentReason ? ` ${vendor.possibleIncumbentReason}` : ""}`,
        )
        .join("\n")
    : "No vendor pattern could be calculated from the retrieved records."
}

## Award-size pattern

There are ${priceIntelligence.count} positive award amounts. The observed range is ${money(priceIntelligence.min)} to ${money(priceIntelligence.max)}, with an outlier-adjusted median of ${money(priceIntelligence.median)}. Treat this as rough market context because obligations, ceilings, task orders, and IDV values are not directly interchangeable.

## Pursuit considerations

- Validate the notice scope and attachments before treating classification-code matches as true comparables.
- Review the strongest same-agency, same-NAICS/PSC awards for period of performance and work-scope overlap.
- Use vendor results as a competitor-research starting point; “possible incumbent” language is an evidence signal, not a confirmed status.
- Confirm whether the solicitation is a task order, standalone contract, or IDV because that distinction materially changes price comparisons.

## Data limitations

${priceIntelligence.notes.join(" ")}

> ${MANDATORY_CAVEAT}`;
}

function extractOutputText(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const record = body as Record<string, unknown>;
  if (typeof record.output_text === "string") return record.output_text;
  if (!Array.isArray(record.output)) return undefined;
  const parts: string[] = [];
  for (const item of record.output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        typeof (part as Record<string, unknown>).text === "string"
      ) {
        parts.push((part as Record<string, string>).text);
      }
    }
  }
  return parts.join("\n").trim() || undefined;
}

export async function generatePursuitMemoWithDebug(
  input: MemoInput,
  options: MemoOptions = {},
): Promise<{ memo: string; warnings: string[] }> {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "optional_replace_me") {
    return { memo: deterministicPursuitMemo(input), warnings: [] };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const compactEvidence = {
    solicitation: {
      title: input.solicitation.title,
      solicitationNumber: input.solicitation.solicitationNumber,
      agency: input.solicitation.agency,
      subAgency: input.solicitation.subAgency,
      office: input.solicitation.office,
      naicsCode: input.solicitation.naicsCode,
      pscCode: input.solicitation.pscCode,
      setAsideDescription: input.solicitation.setAsideDescription,
      responseDeadline: input.solicitation.responseDeadline,
      descriptionText: input.solicitation.descriptionText?.slice(0, 4_000),
    },
    comparableAwards: input.comparableAwards.slice(0, 15).map((award) => ({
      awardId: award.awardId,
      recipientName: award.recipientName,
      awardAmount: award.awardAmount,
      dates: [award.startDate, award.endDate],
      agency: award.awardingAgency,
      description: award.description?.slice(0, 500),
      naicsCode: award.naicsCode,
      pscCode: award.pscCode,
      similarityReasons: award.similarityReasons,
    })),
    vendorLandscape: input.vendorLandscape.slice(0, 8),
    priceIntelligence: input.priceIntelligence,
  };

  try {
    const response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model ?? process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
        instructions:
          "Write a concise, evidence-bound federal opportunity pursuit memo in Markdown. Include: opportunity summary, comparability, likely competitors or possible incumbents, award-size range with caveats, pursuit considerations, and data limitations. Never state that a vendor is definitely the incumbent unless direct evidence says so. End with the exact mandatory caveat supplied in the user input.",
        input: `Use only this retrieved public evidence:\n${JSON.stringify(compactEvidence)}\n\nMandatory caveat (reproduce exactly): ${MANDATORY_CAVEAT}`,
        max_output_tokens: 1_500,
      }),
    });
    const body = (await response.json()) as unknown;
    if (!response.ok) {
      throw new Error(`OpenAI returned ${response.status}`);
    }
    let memo = extractOutputText(body);
    if (!memo) throw new Error("OpenAI returned no text");
    if (!memo.includes(MANDATORY_CAVEAT)) {
      memo = `${memo.trim()}\n\n> ${MANDATORY_CAVEAT}`;
    }
    return { memo, warnings: [] };
  } catch (error) {
    return {
      memo: deterministicPursuitMemo(input),
      warnings: [
        `AI memo generation failed; a deterministic memo was used${
          error instanceof Error ? ` (${error.message})` : ""
        }.`,
      ],
    };
  }
}

export async function generatePursuitMemo(
  input: MemoInput,
  options: MemoOptions = {},
): Promise<string> {
  return (await generatePursuitMemoWithDebug(input, options)).memo;
}
