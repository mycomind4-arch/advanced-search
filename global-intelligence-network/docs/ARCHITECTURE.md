# Standalone architecture

    Official public feeds (6) ----> normalized official records --+
                                                                    |
    Public news RSS (10 roles) --> unverified leads ----------------+--> dedup --> review queue
                                                                          |
                                                                          v
                  Previous run  <--- Git data branch <--- current run report
                                                       |
                                                       v
                                        Static local dashboard and CI artifacts

## Components
- src/config.mjs: research roles, rolling queries and official feed registry.
- src/collect.mjs: read-only bounded HTTP fetching, normalization and explicit errors.
- src/analyze.mjs: classification, historical sample comparison, candidate review and index.
- src/scan.mjs: standalone scanner, runs with Node.js only, saves JSON.
- src/publish.mjs: GitHub API atomic commit to isolated global-intelligence-history branch.
- src/server.mjs: loopback-only local read-only static/data server.
- public/index.html: browser dashboard, no React, Next.js or Cloudflare dependency.
- tests/network.test.mjs: offline regression checks.

## Data contract
Report schema version 1 contains a unique run ID, UTC timestamp, counts, source and role status, comparisons, review candidates, conservative assessment, and original source observations. Each observation has an original URL, a dated publication record when known, a domain and a classification.

Official publications do not prove a future event. Public headlines are unverified. The system never assigns a catastrophe date. Syndication is not independent corroboration; two same-title agency records require human source review.

## Security
Only fixed public data sources are contacted. No arbitrary URL crawling or authentication bypass. GitHub write permissions are granted only to the default-branch publisher; untrusted pull request jobs are read-only. Static UI uses safe text nodes for all untrusted titles. All data in this repository is public.

## Acceptance checkpoints
1. Syntax and unit tests pass on exact feature head SHA.
2. A live collection run publishes an artifact with accurate source failures.
3. Merge to main only after CI green.
4. Main-branch publisher commits first baseline to isolated Git history branch.
5. Subsequent scans show sample deltas, never invented causal links.
6. Preview dashboard receives real latest and index JSON.
7. No existing user databases, secrets or hosted services are modified.
