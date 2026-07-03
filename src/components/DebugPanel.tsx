import { ResearchSolicitationResponse } from "@/lib/types";

export function DebugPanel({
  debug,
}: {
  debug: ResearchSolicitationResponse["debug"];
}) {
  return (
    <details className="debug-panel">
      <summary>
        Debug &amp; source trail
        <span>{debug.warnings.length} warnings</span>
      </summary>
      <div className="debug-content">
        {debug.warnings.length > 0 && (
          <div>
            <h3>Warnings</h3>
            <ul>
              {debug.warnings.map((warning, index) => (
                <li key={`${warning}-${index}`}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <h3>Extracted identifiers</h3>
          <pre>{JSON.stringify(debug.extractedIdentifiers, null, 2)}</pre>
        </div>
        <div>
          <h3>SAM.gov query</h3>
          <pre>{JSON.stringify(debug.samQueryUsed, null, 2)}</pre>
        </div>
        <div>
          <h3>USAspending query attempts</h3>
          <pre>{JSON.stringify(debug.usaspendingQueriesUsed, null, 2)}</pre>
        </div>
      </div>
    </details>
  );
}
