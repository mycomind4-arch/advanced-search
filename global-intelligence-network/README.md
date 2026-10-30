# Global Intelligence Research Network

Standalone Node.js 22+ pilot. It lives in a dedicated directory of the existing advanced-search GitHub repository, but has no runtime imports or dependencies on that application. The connected GitHub actions cannot create a new repository, so this package has not yet been moved into a separate repository.

## Mission
Track evidence-based public information on large-scale developments over a rolling 90-day horizon. Contradict unfounded conclusions. Never treat scheduled exercises as predictions of catastrophe.

## How it works
Six official data feeds plus ten topic-specific news queries -> normalization, timestamps, deduplication -> verification labels -> historical sample comparison -> conservative review candidates -> GitHub snapshots and dashboard.

The ten research roles are configured topics, not ten separate autonomous LLM agents. No result is automatically corroborated.

## Local development
From this directory with Node.js 22 or later:

    npm run check
    npm test
    npm run scan
    npm run serve

Then open http://127.0.0.1:8788. Scans create data/latest.json, data/index.json, and data/snapshots/<runId>.json. Re-run to compare sample changes.

## GitHub Actions
Workflow lives in the parent repository's .github/workflows/standalone-global-intelligence.yml.
- PR and feature-branch runs: source checks, tests, live public-data collection, 14-day research artifacts and static dashboard preview artifacts.
- Default-branch successful runs: separately scoped writer publishes immutable snapshots on global-intelligence-history, keeping code on main untouched.
- Schedule: every six hours (UTC cron: 47 */6 * * *). GitHub may delay scheduling.
- Public dashboard deployment is not enabled automatically; the workflow generates a ready-to-serve static artifact.

## Official public sources
USGS significant earthquakes, NOAA/SWPC space weather, NASA EONET, CISA KEV advisories, Federal Register emergency-preparedness records, and OpenFEMA disaster declarations.

Google News RSS is used solely for discovery leads across the ten research topics. Publication and reporting dates are not necessarily the occurrence dates. Public-source failures are recorded, not hidden.

## Integrity and safeguards
An official record confirms only that its publisher issued it; it does not establish a hidden plan. News records are unverified. Cross-publisher matching titles are review candidates only. Sample changes are not changes in world risk. Do not access protected sources, track private persons or gather secrets. Respect rate limits and publisher terms. GitHub history in this public repository is PUBLIC: never store private data.

## Extraction into a separate GitHub repository
Copy all files from this directory to a new repository root, and copy the GitHub workflow into the new repo's .github/workflows folder. Adjust the workflow's working-directory and artifact paths, and change the data prefix in src/publish.mjs. All runtime modules are already self-contained.

## Next work
Add direct official financial, WHO, multilingual and military-exercise sources; richer provenance review; meaningful baselines and human-approved alerts; publish the static dashboard to an approved host.
