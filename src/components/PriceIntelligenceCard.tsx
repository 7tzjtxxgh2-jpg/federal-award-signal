import { PriceIntelligence } from "@/lib/types";
import { formatMoney } from "@/components/format";

const metrics: Array<{
  key: keyof PriceIntelligence;
  label: string;
}> = [
  { key: "min", label: "Minimum" },
  { key: "p25", label: "25th percentile" },
  { key: "median", label: "Median" },
  { key: "p75", label: "75th percentile" },
  { key: "max", label: "Maximum" },
];

export function PriceIntelligenceCard({
  intelligence,
}: {
  intelligence: PriceIntelligence;
}) {
  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <span className="section-index">04</span>
          <h2>Price intelligence</h2>
        </div>
        <span className="count-pill">
          {intelligence.count} positive amounts
        </span>
      </div>
      <div className="metric-grid">
        {metrics.map(({ key, label }) => (
          <div className="metric" key={key}>
            <span>{label}</span>
            <strong>
              {formatMoney(intelligence[key] as number | undefined)}
            </strong>
          </div>
        ))}
      </div>
      <div className="notes">
        {intelligence.notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
      </div>
    </section>
  );
}
