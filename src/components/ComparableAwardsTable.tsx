import { ComparableAward } from "@/lib/types";
import { formatDate, formatMoney } from "@/components/format";

export function ComparableAwardsTable({
  awards,
}: {
  awards: ComparableAward[];
}) {
  return (
    <section className="card table-card">
      <div className="section-heading">
        <div>
          <span className="section-index">02</span>
          <h2>Comparable awards</h2>
        </div>
        <span className="count-pill">{awards.length} unique records</span>
      </div>
      {!awards.length ? (
        <div className="empty-state">
          No awards matched the attempted search cascade. The debug panel shows
          every query and warning.
        </div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Amount</th>
                <th>Period</th>
                <th>Agency</th>
                <th>Codes</th>
                <th>Description</th>
                <th>Why it matched</th>
                <th>Source docs</th>
              </tr>
            </thead>
            <tbody>
              {awards.map((award, index) => (
                <tr key={`${award.awardId ?? "award"}-${index}`}>
                  <td>
                    <strong>{award.recipientName ?? "Unknown recipient"}</strong>
                    <span className="table-subtext">
                      {award.awardId ?? "No award ID"}
                    </span>
                  </td>
                  <td className="numeric">{formatMoney(award.awardAmount)}</td>
                  <td>
                    {formatDate(award.startDate)}
                    <span className="table-subtext">
                      to {formatDate(award.endDate)}
                    </span>
                  </td>
                  <td>
                    {award.awardingAgency ?? "—"}
                    <span className="table-subtext">
                      {award.awardingSubAgency}
                    </span>
                  </td>
                  <td>
                    <span className="code-chip">
                      NAICS {award.naicsCode ?? "—"}
                    </span>
                    <span className="code-chip">
                      PSC {award.pscCode ?? "—"}
                    </span>
                  </td>
                  <td className="description-cell">
                    {award.description ?? "No description reported"}
                  </td>
                  <td>
                    <div className="reason-list">
                      {award.similarityReasons.length
                        ? award.similarityReasons.map((reason) => (
                            <span key={reason}>{reason}</span>
                          ))
                        : "Broad fallback match"}
                    </div>
                  </td>
                  <td>
                    {award.sourceDocuments.length ? (
                      <div className="source-doc-list">
                        {award.sourceDocuments.map((sourceDocument) => (
                          <a
                            key={sourceDocument.url}
                            href={sourceDocument.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {sourceDocument.label}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="table-subtext">No source link</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
