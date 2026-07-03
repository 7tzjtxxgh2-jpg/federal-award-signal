import { VendorSummary } from "@/lib/types";
import { formatDate, formatMoney } from "@/components/format";

export function VendorLandscapeTable({
  vendors,
}: {
  vendors: VendorSummary[];
}) {
  return (
    <section className="card table-card">
      <div className="section-heading">
        <div>
          <span className="section-index">03</span>
          <h2>Vendor landscape</h2>
        </div>
        <p className="section-note">Signals, not confirmed incumbency</p>
      </div>
      {!vendors.length ? (
        <div className="empty-state">
          Vendor patterns will appear when comparable awards are available.
        </div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Similar awards</th>
                <th>Total</th>
                <th>Median</th>
                <th>Latest</th>
                <th>Evidence note</th>
              </tr>
            </thead>
            <tbody>
              {vendors.slice(0, 12).map((vendor) => (
                <tr key={vendor.recipientName}>
                  <td>
                    <strong>{vendor.recipientName}</strong>
                  </td>
                  <td className="numeric">{vendor.awardCount}</td>
                  <td className="numeric">
                    {formatMoney(vendor.totalAwardAmount)}
                  </td>
                  <td className="numeric">
                    {formatMoney(vendor.medianAwardAmount)}
                  </td>
                  <td>{formatDate(vendor.latestAwardDate)}</td>
                  <td>
                    {vendor.possibleIncumbentReason ??
                      "Comparable award history; no strong incumbent signal."}
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
