# Federal Award Signal MVP

A Next.js proof of concept that turns a public SAM.gov opportunity URL into an auditable comparable-award report using SAM.gov and USAspending.gov.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2F7tzjtxxgh2-jpg%2Ffederal-award-signal&env=SAM_API_KEY,OPENAI_API_KEY,OPENAI_MODEL&envDescription=SAM.gov%20is%20required.%20OpenAI%20is%20optional.&project-name=federal-award-signal&repository-name=federal-award-signal)

## What is implemented

- Flexible SAM.gov URL parsing for notice IDs and solicitation numbers
- SAM.gov Opportunities API retrieval and response normalization
- Five-year lookup through the documented SAM.gov Public Opportunities API
- Optional solicitation or award-number fallback, including exact USAspending award resolution
- Cascading USAspending searches by NAICS, PSC, agency, and keywords
- Separate contract and IDV searches (required by the live USAspending API)
- Award deduplication with visible similarity reasons
- Vendor aggregation with cautious possible-incumbent signals
- Outlier-aware award amount percentiles
- Optional OpenAI Responses API pursuit memo with a deterministic fallback
- Collapsible query and warning audit trail
- Unit and mocked integration tests

## Run locally

1. Copy the environment template:

   ```bash
   cp .env.example .env.local
   ```

2. Add a SAM.gov API key to `.env.local`. Leave `OPENAI_API_KEY` blank to use the deterministic memo. Set `APP_ACCESS_CODE` if you want visitors to enter a separate share code before the server uses your SAM.gov key.

3. Install and run:

   ```bash
   pnpm install
   pnpm dev
   ```

4. Open [http://localhost:3000/sam-research](http://localhost:3000/sam-research).

## Commands

```bash
pnpm test
pnpm build
```

## Deploy a shareable dashboard

GitHub Pages cannot host this project by itself because the dashboard uses a
server-side Next.js API route and a private SAM.gov API key. Deploy the public
repository to Vercel instead:

1. Click **Deploy with Vercel** above and sign in with GitHub.
2. Set `SAM_API_KEY` to a valid SAM.gov API key.
3. Set `APP_ACCESS_CODE` to a private share code and give that code—not the
   SAM.gov key—to the people testing the dashboard.
4. Optionally set `OPENAI_API_KEY` and `OPENAI_MODEL`. Without them, the app
   uses its deterministic pursuit memo.
5. Deploy, then share the generated Vercel URL.

Never commit `.env.local`. It is ignored by Git and environment variables set
in Vercel remain server-side. The deployed app only calls the documented public
SAM.gov Opportunities API and displays public API data.

## Current MVP limitations

- SAM.gov public search requires `postedFrom` and `postedTo` and limits each request to one year, so the app searches up to five one-year windows.
- Personal SAM.gov API keys can have low daily quotas. Keep the share code private and consider a SAM.gov system account for broader use.
- Comparable-award ranking uses transparent classification, agency, and keyword signals rather than semantic embeddings.
- USAspending award amounts may represent obligations, ceilings, task orders, or IDVs. They are not directly interchangeable with bid prices.
- The tool does not know losing vendors’ proposals or pricing and never treats a possible incumbent signal as confirmed incumbency.
