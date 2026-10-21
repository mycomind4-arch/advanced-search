# CodeRadar
A GitHub discovery engine with a bounded evolution workbench.

## Live application
https://coderadar-evolution.mycomind4.chatgpt.site (owner-private)

## Source locations
GitHub: `mycomind4-arch/advanced-search/coderadar`. Existing repository files are preserved. Sites maintains its own deployment source; this initial release has matching application sources in both locations. GitHub changes do not automatically redeploy Sites. Publish reviewed changes through the Sites source workflow.

## Implemented
- Live public GitHub repository search with keyword cleanup, language/sort filters, pagination and hidden-gem star range.
- Metadata comparison for up to four repositories.
- README excerpts, recent commits and recent forks with source links and partial-failure handling.
- Browser-local saved searches (not background watches).
- GitHub Actions run history in the Evolution screen.
- Daily bounded metadata discovery; validated catalog additions proposed as draft PRs. Uses the repository GITHUB_TOKEN and no paid LLM.

## Evolution limits
The current agent is a deterministic research workflow, not a general-purpose coding model. It adds evidence-backed catalog candidates, not executable integrations. No remote repository code is executed. No auto-merge, auto-deployment, spending or policy edits. Actions must allow write access and creation of PRs; if disabled the run records failure and retains its report artifact. Daily cron is 14:23 UTC (07:23 PDT / 06:23 PST). Scheduling is best effort. Public repositories may have inactive scheduled workflows disabled by GitHub.

## Develop
Node 22.13+; run `corepack pnpm install --frozen-lockfile`, `corepack pnpm dev`. Sites deployment uses the retained build integration. Run `node --test tests/*.test.mjs` for contract checks. Workflow YAML files are mirrored to the parent repository `.github/workflows/` to activate them.

## Coverage and security
Searches use GitHub's public metadata index, not semantic full-code search. No private repository access. Public unauthenticated API limits apply and are surfaced as errors. Provider content is treated as data and rendered as text. README claims are not execution evidence. Licenses are metadata, not legal approval. The inspector accepts only owner/repository identifiers and uses fixed GitHub endpoints.

## Next capabilities
Code-level indexing, benchmarks for relevance, isolated execution, model-driven implementation, automatic rollback and unattended Sites source synchronization are not yet implemented.

## Activation items verified in first run
Discovery generated 30 candidates and pushed `coderadar/evolution-39532600162-1`. GitHub denied automatic PR creation: repository Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests. This setting was not changed. Subsequent cycles wait while any evolution proposal branch exists, preventing duplicate proposals.

Sites public API reads can exhaust the shared unauthenticated quota. Configure an optional read-only `GITHUB_TOKEN` in the Site's secret environment settings, then redeploy. Do not paste tokens into chat, commit them, or put them in browser storage. GitHub Actions already uses its own scoped token; it does not share that token with Sites.
