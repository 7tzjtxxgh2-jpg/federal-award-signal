import { SolicitationProfile } from "@/lib/types";
import { formatDate } from "@/components/format";

function DataPoint({
  label,
  value,
  wide = false,
}: {
  label: string;
  value?: string;
  wide?: boolean;
}) {
  return (
    <div className={`data-point${wide ? " data-point-wide" : ""}`}>
      <dt>{label}</dt>
      <dd>{value || "Not reported"}</dd>
    </div>
  );
}

export function SolicitationProfileCard({
  solicitation,
}: {
  solicitation: SolicitationProfile;
}) {
  return (
    <section className="card profile-card">
      <div className="section-heading">
        <div>
          <span className="section-index">01</span>
          <h2>Solicitation profile</h2>
        </div>
        <a
          className="source-link"
          href={solicitation.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          View on SAM.gov ↗
        </a>
      </div>
      <h3 className="opportunity-title">
        {solicitation.title ?? "Untitled opportunity"}
      </h3>
      <dl className="profile-grid">
        <DataPoint
          label="Solicitation"
          value={solicitation.solicitationNumber}
        />
        <DataPoint label="Notice ID" value={solicitation.noticeId} />
        <DataPoint label="Notice type" value={solicitation.noticeType} />
        <DataPoint label="Agency" value={solicitation.agency} />
        <DataPoint label="Sub-agency" value={solicitation.subAgency} />
        <DataPoint label="Office" value={solicitation.office} />
        <DataPoint
          label="Response deadline"
          value={formatDate(solicitation.responseDeadline)}
        />
        <DataPoint
          label="NAICS"
          value={
            [solicitation.naicsCode, solicitation.naicsDescription]
              .filter(Boolean)
              .join(" · ") || undefined
          }
        />
        <DataPoint
          label="PSC"
          value={
            [solicitation.pscCode, solicitation.pscDescription]
              .filter(Boolean)
              .join(" · ") || undefined
          }
        />
        <DataPoint
          label="Set-aside"
          value={solicitation.setAsideDescription ?? solicitation.setAsideCode}
        />
        <DataPoint
          label="Place of performance"
          value={solicitation.placeOfPerformance}
          wide
        />
        {solicitation.award && (
          <>
            <DataPoint
              label="Award / incumbent signal"
              value={[
                solicitation.award.number,
                solicitation.award.awardeeName,
              ]
                .filter(Boolean)
                .join(" · ")}
              wide
            />
            <DataPoint
              label="Public award amount"
              value={
                solicitation.award.amount === undefined
                  ? undefined
                  : new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(solicitation.award.amount)
              }
            />
          </>
        )}
      </dl>
      {solicitation.descriptionText && (
        <details className="inline-details">
          <summary>Opportunity description</summary>
          <p>{solicitation.descriptionText}</p>
        </details>
      )}
    </section>
  );
}
