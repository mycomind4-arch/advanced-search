# Global Intelligence Research Network

An additive research vertical within Advanced Search, not a deployed autonomous service.

## Objective
Investigate significant global developments within a rolling 90-day horizon without presupposing a catastrophic event. Use the existing search commander, provenance graph and corroboration machinery.

## Agent assignments
Government; military; geopolitics; finance; infrastructure/cyber; public health; earth/space; open-source media; public records; skeptical verification. The skeptical verifier must actively seek disconfirming evidence and historical baselines.

## Processing contract
1. Discover publicly accessible items through approved source adapters.
2. Normalize canonical URLs, dates, language, source ownership and claims.
3. Deduplicate syndication and copied stories; independent sources must not share the same original reporting chain.
4. Compare to baseline frequencies and official exercise calendars.
5. Label each item: confirmed event, official forecast, planned exercise, allegation, or unverified claim.
6. Assess likelihood and event window only when justified; never infer a disaster date from a drill date.
7. Store provenance, contradictions and revision history. Publish only corroborated material developments.

## Deployment roadmap
- Wire existing adapters into a bounded per-domain collection queue.
- Add persistent Postgres/Supabase tables for sources, claims, evidence edges, investigations and alerts with row-level access control.
- Add scheduled Cloudflare Workers/Queues and per-provider quotas.
- Add dashboard for timeline, source graph, confidence and counterevidence.
- Add unit/integration tests with synthetic contradictory reports before enabling notifications.

## Operational guardrails
Public/authorized sources only; respect robots policies, terms and rate limits. No bypassing authentication, no secret collection, no private-person tracking. External actions require approval. Do not label a design document or registry entry as a working deployed agent.
