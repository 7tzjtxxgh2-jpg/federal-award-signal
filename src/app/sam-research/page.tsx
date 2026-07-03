"use client";

import { FormEvent, useState } from "react";
import { ComparableAwardsTable } from "@/components/ComparableAwardsTable";
import { DebugPanel } from "@/components/DebugPanel";
import { PriceIntelligenceCard } from "@/components/PriceIntelligenceCard";
import { PursuitMemo } from "@/components/PursuitMemo";
import { SolicitationProfileCard } from "@/components/SolicitationProfileCard";
import { VendorLandscapeTable } from "@/components/VendorLandscapeTable";
import { ResearchSolicitationResponse } from "@/lib/types";

type ApiError = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export default function SamResearchPage() {
  const [samUrl, setSamUrl] = useState("");
  const [fallbackIdentifier, setFallbackIdentifier] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{
    message: string;
    code?: string;
    details?: unknown;
  }>();
  const [result, setResult] = useState<ResearchSolicitationResponse>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);
    setResult(undefined);

    try {
      const response = await fetch("/api/research-solicitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ samUrl, fallbackIdentifier, accessCode }),
      });
      const body = (await response.json()) as
        | ResearchSolicitationResponse
        | ApiError;
      if (!response.ok) {
        const apiError = body as ApiError;
        setError({
          message:
            apiError.error?.message ??
            `The research request failed (${response.status}).`,
          code: apiError.error?.code,
          details: apiError.error?.details,
        });
        return;
      }
      setResult(body as ResearchSolicitationResponse);
    } catch (caught) {
      setError({
        message:
          caught instanceof Error
            ? caught.message
            : "The research request failed unexpectedly.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <header className="research-hero">
        <nav>
          <a className="wordmark" href="/">
            <span>FAS</span> Federal Award Signal
          </a>
          <span className="prototype-label">Public-data prototype</span>
        </nav>
        <div className="hero-copy">
          <div className="eyebrow">SAM.gov → USAspending.gov</div>
          <h1>Find the award history hiding behind an opportunity.</h1>
          <p>
            Paste a public SAM.gov solicitation. We’ll trace its agency and
            classification signals into comparable awards, vendors, and a
            cautious pursuit brief.
          </p>
        </div>
        <form className="research-form" onSubmit={submit}>
          <label htmlFor="samUrl">SAM.gov solicitation URL</label>
          <div className="input-row">
            <input
              id="samUrl"
              type="url"
              placeholder="https://sam.gov/opp/…/view"
              value={samUrl}
              onChange={(event) => setSamUrl(event.target.value)}
              required
              disabled={loading}
            />
            <button
              className="button button-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? "Researching…" : "Research comparable awards"}
            </button>
          </div>
          <div className="fallback-field">
            <label htmlFor="fallbackIdentifier">
              Solicitation or award number{" "}
              <span>(optional fallback)</span>
            </label>
            <input
              id="fallbackIdentifier"
              type="text"
              placeholder="Example: 1232SA26P0366"
              value={fallbackIdentifier}
              onChange={(event) =>
                setFallbackIdentifier(event.target.value)
              }
              disabled={loading}
            />
          </div>
          <div className="fallback-field">
            <label htmlFor="accessCode">
              Dashboard access code <span>(if required)</span>
            </label>
            <input
              id="accessCode"
              type="password"
              autoComplete="current-password"
              placeholder="Code provided by the dashboard owner"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              disabled={loading}
            />
          </div>
          <p className="form-hint">
            The server uses the documented public SAM.gov Opportunities API.
            Your access code is separate from the owner’s SAM.gov key.
          </p>
        </form>
      </header>

      {loading && (
        <section className="loading-state" aria-live="polite">
          <div className="loading-line" />
          <div>
            <strong>Following the evidence trail</strong>
            <p>
              Retrieving the notice, then broadening comparable-award searches
              until enough useful records are found.
            </p>
          </div>
        </section>
      )}

      {error && (
        <section className="error-state" role="alert">
          <strong>Research couldn’t be completed.</strong>
          <p>{error.message}</p>
          {error.details !== undefined && (
            <details className="error-details">
              <summary>Show resolution attempts</summary>
              <pre>{JSON.stringify(error.details, null, 2)}</pre>
            </details>
          )}
        </section>
      )}

      {result && (
        <div className="results">
          <div className="results-kicker">
            <span>Research report</span>
            <span>
              {result.comparableAwards.length} awards ·{" "}
              {result.vendorLandscape.length} vendors
            </span>
          </div>
          <SolicitationProfileCard solicitation={result.solicitation} />
          <ComparableAwardsTable awards={result.comparableAwards} />
          <div className="analysis-grid">
            <VendorLandscapeTable vendors={result.vendorLandscape} />
            <PriceIntelligenceCard
              intelligence={result.priceIntelligence}
            />
          </div>
          <PursuitMemo memo={result.pursuitMemo} />
          <DebugPanel debug={result.debug} />
        </div>
      )}

      {!result && !loading && (
        <section className="method-strip">
          <div>
            <span>01</span>
            <strong>Resolve the notice</strong>
            <p>Extract IDs and normalize SAM.gov metadata.</p>
          </div>
          <div>
            <span>02</span>
            <strong>Search in layers</strong>
            <p>Move from exact code matches to careful fallbacks.</p>
          </div>
          <div>
            <span>03</span>
            <strong>Show the receipts</strong>
            <p>Keep queries, match reasons, and caveats visible.</p>
          </div>
        </section>
      )}
    </main>
  );
}
