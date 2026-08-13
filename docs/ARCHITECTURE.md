# Architecture

## Core principle

No individual search provider is treated as ground truth. Providers are adapters that emit normalized observations. The engine performs deduplication, corroboration, provenance tracking, and ranking independently.

## Search modes

1. Text search
2. Reverse-image search
3. Face search over permitted providers/corpora
4. Visual similarity search
5. Document/PDF image extraction
6. Video keyframe search
7. Historical/archive search
8. Metadata/OCR search
9. Geographic/contextual search
10. Recursive clue expansion

## Provider tiers

### Tier A: direct APIs

Use official APIs or licensed commercial APIs whenever available.

### Tier B: open/public endpoints

Use only where the endpoint permits automated access and applicable terms/robots policies are respected.

### Tier C: user-authorized/private corpora

Index only data the user or organization is authorized to process. These can use local/self-hosted face and vector models.

## Result model

Every observation should retain:

- provider
- source URL
- discovered timestamp
- publication timestamp when known
- title/caption/snippet
- media URL when permitted
- source type
- query/job that produced it
- hashes where available
- OCR/entities extracted
- face/visual match metadata
- provenance relationships
- provider confidence (kept separate from engine confidence)

## Ranking

The engine score must not simply average vendor confidence. It should consider:

- independent provider agreement
- independent domain count
- image similarity
- face similarity where legally/technically appropriate
- source quality
- temporal consistency
- provenance consistency
- duplicate/derivative relationships
- query relevance

Scores are evidence signals, not identity guarantees.

## Recursive search

A result may expose new bounded clues such as a caption, author, event, username, location, filename, organization, or date. The planner can schedule follow-up searches subject to a configurable budget, depth limit, source policy, and rate limits.

## Safety and governance

The platform must include provider credentials isolation, rate limiting, audit logs, source policy controls, retention controls, and a clear distinction between a visual similarity result and verified identity. It must not bypass authentication, access controls, CAPTCHAs, or robots/terms restrictions.
