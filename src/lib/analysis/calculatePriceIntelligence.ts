import { ComparableAward, PriceIntelligence } from "@/lib/types";

function percentile(sorted: number[], p: number): number | undefined {
  if (!sorted.length) return undefined;
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function calculatePriceIntelligence(
  awards: ComparableAward[],
): PriceIntelligence {
  const numeric = awards
    .map((award) => award.awardAmount)
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value),
    );
  const positive = numeric.filter((value) => value > 0).sort((a, b) => a - b);
  const notes: string[] = [];
  const excludedNonPositive = numeric.length - positive.length;
  if (excludedNonPositive) {
    notes.push(
      `${excludedNonPositive} zero-dollar or negative award${
        excludedNonPositive === 1 ? " was" : "s were"
      } excluded from percentile calculations.`,
    );
  }

  let percentilePopulation = positive;
  if (positive.length >= 4) {
    const q1 = percentile(positive, 0.25)!;
    const q3 = percentile(positive, 0.75)!;
    const iqr = q3 - q1;
    if (iqr > 0) {
      const lowerFence = Math.max(0, q1 - 1.5 * iqr);
      const upperFence = q3 + 1.5 * iqr;
      percentilePopulation = positive.filter(
        (value) => value >= lowerFence && value <= upperFence,
      );
      const outliers = positive.length - percentilePopulation.length;
      if (outliers) {
        notes.push(
          `${outliers} obvious IQR outlier${
            outliers === 1 ? " was" : "s were"
          } excluded from percentile calculations; min, max, and total still reflect all positive awards.`,
        );
      }
    }
  }

  if (!positive.length) {
    notes.push("No positive award amounts were available.");
  } else {
    notes.push(
      "Award amounts are public obligations or award values, not losing bid prices or line-item estimates.",
    );
  }

  return {
    count: positive.length,
    min: positive[0],
    p25: percentile(percentilePopulation, 0.25),
    median: percentile(percentilePopulation, 0.5),
    p75: percentile(percentilePopulation, 0.75),
    max: positive.at(-1),
    total: positive.length
      ? positive.reduce((sum, value) => sum + value, 0)
      : undefined,
    notes,
  };
}
