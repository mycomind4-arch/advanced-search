# Global Intelligence Research Network

## Status
**Executable, bounded pilot**. This directory contains a live collector and unit tests, not ten independent LLM agents. It has ten investigative domains and runs ten topic searches through the repository's existing search adapters, with Google News RSS as a fallback when those adapters return no results. Individual roles do not yet reason autonomously. This pilot does not predict disasters or claim every public internet source is indexed.

## Run
```bash
npm ci
npx tsc -p intelligence/tsconfig.json
node --test intelligence/*.test.mjs
node intelligence/runner.mjs --out intelligence-report.json
# No search queries, only official feeds:
node intelligence/runner.mjs --official-only --out intelligence-report.json
```

GitHub Actions workflow: `.github/workflows/global-intelligence.yml`. Runs on feature-branch pushes and PRs, uploads a JSON artifact retained for 7 days. Manual workflow dispatch is available when the workflow is present on the default branch. No recurring schedule is configured yet, and no deployment is automatic.

## Inputs
- USGS significant earthquakes (observations)
- NOAA Space Weather Prediction Center alerts and watches (official advisories and forecasts)
- NASA EONET open natural events (observations, may have begun earlier)
- CISA Known Exploited Vulnerabilities (security advisories, not evidence of a national incident)
- Federal Register matching emergency preparedness (publications)
- FEMA OpenFEMA disaster declarations (response declarations)
- Existing Advanced Search DuckDuckGo Instant Answers and Hacker News search adapters (discovery only)
- Google News RSS fallback (discovery only; aggregated headlines, not independently corroborated)

Feed coverage is limited, and specific source APIs may fail or rate limit. Each run records which sources returned successfully, which failed, and what was accepted. The last 45 days is the default age filter for official feed entries, not a guarantee of coverage. Queries cover ten investigative topics, but neither the number of topics nor the number of results establishes ten deployed AI services.

## Integrity rules
- Label primary-source feed entries `official-source-record`. This verifies only that the feed published a record, not its relevance to the investigation.
- Label search and RSS hits `unverified-lead`. A news aggregator is not a second independent source.
- Never infer event coordination, exact timing or conspiracies from drill calendars or unrelated incidents.
- Remove tracking parameters, deduplicate repeated titles, retain observation dates and original source URLs.
- Outages must be reported, not interpreted as a quiet world.
- Reclassifications and independent corroboration require explicit follow-up checking.

## Storage
The runner always writes a local JSON report for review. An optional database writer is present but disabled unless **both** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied from a secured server runtime. Do not put secret credentials in frontend code, GitHub files or logs. Apply `intelligence/schema.sql` **only to a dedicated project selected for this system**. No existing Supabase project has been changed.

## Next milestones
1. Store report history in a dedicated project with row restrictions, retention and integrity checks.
2. Add direct official military, international public-health and financial regulatory sources.
3. Implement independent reporting-chain checks, contradiction detection, and human review.
4. Add dashboard, controlled scheduling and meaningful notifications after regression validation.

