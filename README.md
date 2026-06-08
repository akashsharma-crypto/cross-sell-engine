# InsuranceMarket.ae — AI Cross-Sell Recommendation Engine (MVP)

Rules-based MVP that scores existing Motor/Health leads for Life Insurance
and Savings Plan cross-sell potential, and surfaces recommendations on the
Quote Results Page and an Advisor Dashboard.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # runs the scoring engine unit tests (vitest)
```

> Note: this environment did not have Node.js/npm available, so `npm install`
> and the test run could not be executed here. The code is written against
> Next.js 14 (App Router) + TypeScript + Vitest and should run with `npm install && npm run dev`
> on any machine with Node 18+.

## Folder structure

```
src/
  app/
    page.tsx                       # landing page (links to sample leads)
    layout.tsx, globals.css
    quote/[leadId]/page.tsx        # Quote Results Page (customer view)
    advisor/page.tsx               # Advisor Dashboard
    api/
      recommendations/route.ts             # GET /api/recommendations  (all leads, sortable)
      recommendations/[leadId]/route.ts    # GET /api/recommendations/:leadId
  components/
    recommendations/RecommendedForYouCard.tsx + .module.css
    advisor/AdvisorLeadTable.tsx + .module.css
  lib/
    scoring/
      engine.ts          # RulesBasedScoringEngine (implements ScoringEngine interface)
      constants.ts       # tunable thresholds & reference data
      helpers.ts         # age calculation, salary-band parsing, premium-make matching
      __tests__/engine.test.ts
    db/
      lead-repository.ts # LeadRepository interface + in-memory implementation
      schema.sql         # PostgreSQL DDL for production persistence
  data/
    sample-leads.ts      # sample test data (5 leads spanning all rule branches)
  types/
    lead.ts              # Lead / MotorLeadData / HealthLeadData
    recommendation.ts    # RecommendationResult, reason codes, product pitches
```

## Architecture notes (clean migration path to ML)

- `ScoringEngine` (in `lib/scoring/engine.ts`) is an interface with one method,
  `score(lead): RecommendationResult`. The MVP provides `RulesBasedScoringEngine`;
  a future ML-backed engine implements the same interface and is swapped in via
  the `scoringEngine` singleton — no API route or UI change required.
- The engine returns **reason codes**, not just numbers, so the UI and advisor
  dashboard can explain *why* a score was given. An ML engine should populate
  the same `reasonCodes`/`reasons` fields (e.g. via SHAP-style top features)
  to remain a drop-in replacement.
- `LeadRepository` abstracts persistence. The MVP uses an in-memory sample
  dataset; `db/schema.sql` documents the production PostgreSQL schema
  (append-only `recommendations` table for audit/history and future model comparison).
- Business thresholds live in `lib/scoring/constants.ts`, separated from engine
  logic, so rule tuning doesn't require touching the scoring algorithm.

## API contracts

### `GET /api/recommendations/:leadId`

Returns scores + recommendations for a single lead.

**200 OK**
```json
{
  "leadId": "LEAD-1001",
  "lifeScore": 100,
  "savingsScore": 85,
  "recommendedProducts": ["Family Protection Plan", "Term Life Insurance", "Wealth Builder Savings Plan"],
  "reasonCodes": ["MARRIED", "SPOUSE_AND_CHILDREN", "FAMILY_HEALTH_COVERAGE", "SALARY_ABOVE_15K", "AGE_28_TO_50", "SALARY_ABOVE_20K", "AGE_25_TO_45", "PREMIUM_VEHICLE_OWNER", "COMPANY_REGISTERED_VEHICLE"],
  "reasons": ["Married", "Has Spouse and Children", "Family Health Coverage", "Salary Above AED 15,000", "Age Between 28 and 50", "Salary Above AED 20,000", "Age Between 25 and 45", "Owns a Premium Vehicle", "Company-Registered Vehicle"],
  "generatedAt": "2026-06-08T12:00:00.000Z"
}
```

**404 Not Found**
```json
{ "error": "Lead not found", "leadId": "LEAD-9999" }
```

### `GET /api/recommendations?sortBy=lifeScore|savingsScore&order=asc|desc`

Returns scored results for every lead (advisor dashboard data source).
Defaults: `sortBy=lifeScore`, `order=desc` (highest score first).

```json
{ "results": [ { "leadId": "...", "lifeScore": 100, "savingsScore": 85, "...": "..." } ] }
```

## Database schema

See [`src/lib/db/schema.sql`](src/lib/db/schema.sql):

- `leads` — unified lead record (`source` discriminator)
- `motor_lead_details` / `health_lead_details` — 1:1 extension tables
- `recommendations` — append-only scoring history (life/savings scores, engine version)
- `recommendation_products` / `recommendation_reason_codes` — normalised many-to-one detail tables
- `latest_recommendations` — view returning the most recent score per lead (advisor dashboard)

## UI

- **Quote Results Page** (`/quote/[leadId]`): existing quotes block + `RecommendedForYouCard`,
  which renders one pitch (headline, supporting copy, CTA button) per recommended product.
- **Advisor Dashboard** (`/advisor`): `AdvisorLeadTable` — sortable by Life Score or
  Savings Score (click column header to toggle direction; defaults to highest-first),
  shows Lead ID, both scores, recommended products, and reason codes. Collapses to
  stacked cards on narrow viewports for mobile responsiveness.

## Sample test data

`src/data/sample-leads.ts` contains 5 leads engineered to hit every scoring branch
and recommendation threshold (capped-at-100 life score, exact-85 savings score that
just misses the Retirement threshold, zero-recommendation profiles, motor-only leads
using fallback DOB, etc.) — see inline comments for expected score breakdowns.

Visit `/` for links to each sample lead's quote page, or `/advisor` for the dashboard.

## Tests

`src/lib/scoring/__tests__/engine.test.ts` unit-tests the engine directly against
constructed `Lead` fixtures, covering: each scoring rule individually, additive
stacking + 100-point cap, fallback DOB resolution (motor-only leads), case-insensitive
premium-make matching, "no dependents"/"spouse and children" derivations, and every
recommendation threshold boundary (>70, >85 for both scores).
