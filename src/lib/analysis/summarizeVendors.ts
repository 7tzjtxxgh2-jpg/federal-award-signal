import { ComparableAward, VendorSummary } from "@/lib/types";

function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function latestDate(awards: ComparableAward[]): string | undefined {
  return awards
    .flatMap((award) => [award.endDate, award.startDate])
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => b.localeCompare(a))[0];
}

export function summarizeVendors(
  awards: ComparableAward[],
): VendorSummary[] {
  const groups = new Map<string, ComparableAward[]>();
  for (const award of awards) {
    if (!award.recipientName) continue;
    const key = award.recipientName.trim().toUpperCase();
    groups.set(key, [...(groups.get(key) ?? []), award]);
  }

  return [...groups.values()]
    .map((vendorAwards) => {
      const recipientName = vendorAwards[0].recipientName!;
      const amounts = vendorAwards
        .map((award) => award.awardAmount)
        .filter(
          (value): value is number =>
            typeof value === "number" && Number.isFinite(value),
        );
      const matchedNaicsCount = vendorAwards.filter((award) =>
        award.similarityReasons.includes("same NAICS"),
      ).length;
      const matchedPscCount = vendorAwards.filter((award) =>
        award.similarityReasons.includes("same PSC"),
      ).length;
      const agencyMatches = vendorAwards.filter((award) =>
        award.similarityReasons.includes("same awarding agency"),
      ).length;
      const latestAwardDate = latestDate(vendorAwards);
      const strongMatches = Math.max(matchedNaicsCount, matchedPscCount);

      let possibleIncumbentReason: string | undefined;
      if (agencyMatches > 0 && strongMatches > 0) {
        possibleIncumbentReason =
          vendorAwards.length > 1
            ? `${vendorAwards.length} similar awards include same-agency and NAICS/PSC matches; possible incumbent signal, not proof.`
            : "One same-agency NAICS/PSC match suggests a possible incumbent or competitor; not proof.";
      }

      return {
        recipientName,
        awardCount: vendorAwards.length,
        totalAwardAmount: amounts.reduce((sum, value) => sum + value, 0),
        medianAwardAmount: median(amounts),
        latestAwardDate,
        matchedNaicsCount,
        matchedPscCount,
        possibleIncumbentReason,
      };
    })
    .sort((a, b) => {
      const recent =
        (b.latestAwardDate ?? "").localeCompare(a.latestAwardDate ?? "") * 4;
      const count = (b.awardCount - a.awardCount) * 3;
      const classification =
        ((b.matchedNaicsCount ?? 0) +
          (b.matchedPscCount ?? 0) -
          (a.matchedNaicsCount ?? 0) -
          (a.matchedPscCount ?? 0)) *
        2;
      return (
        recent +
        count +
        classification +
        Math.sign(b.totalAwardAmount - a.totalAwardAmount)
      );
    });
}
