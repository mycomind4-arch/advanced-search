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

GitHub Actions workflow: `.github/workflows/global-intelligence.yml`. Runs on relevant development-branch and main pushes, pull requests, manual dispatch, and a six-hour UTC cron. The research job has read-only permissions and uploads a JSON artifact retained for 7 days. A separate publish job with scoped GitHub `contents: write` runs **only** when the workflow executes on `main` and research succeeds. Publication stores immutable snapshots plus `latest.json` and `index.json` on the separate `intelligence-history` Git branch; it never commits research reports onto application `main`. The first successful publication creates its own baseline. GitHub cron timing may be delayed.

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

## History and dashboard
- `/intelligence` in the existing `ui/` Next.js application displays run history, source-health badges, bounded sample counts, case-insensitive ledger search, and source/verification filters. No site deployment is implied by a passing build.
- The historical branch keeps full immutable snapshot JSON and an approximately 100-day index (up to 400 runs). Source-level gaps and run-to-run changes are labeled as sampling differences rather than changes in world risk.
- Cross-source candidates require matching normalized titles from two distinct official publishers. Even that is **not** sufficient to establish reporting independence: candidates remain subject to manual review. News aggregation and syndicated headlines cannot create confirmed corroboration.
- The search tasks derive calendar terms from each run's UTC date, with a rolling forward research window rather than fixed October/November 2026 queries.
- On a public GitHub repository, this history branch and all committed evidence snapshots are public; use a private repository for nonpublic investigations.
- Existing Supabase projects are not modified. The optional schema remains unconfigured and is not a required part of the GitHub-based historical archive.

## Next milestones
1. Expand verified international source coverage beyond the current six official feeds.
2. Add human-reviewed provenance decisions, contradiction detection and alert thresholds.
3. Deploy the Next.js dashboard to an explicitly configured site and validate its live reachability.
4. If dedicated database storage is required, choose a separate Supabase project and verify restricted access.

