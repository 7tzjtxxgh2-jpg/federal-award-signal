import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing">
      <div className="eyebrow">Federal procurement research</div>
      <h1>Turn a public opportunity into an evidence trail.</h1>
      <p>
        Start with a SAM.gov link. Follow the classifications, agencies, award
        history, and vendor signals into a concise pursuit brief.
      </p>
      <Link className="button button-primary" href="/sam-research">
        Open solicitation research
      </Link>
    </main>
  );
}
