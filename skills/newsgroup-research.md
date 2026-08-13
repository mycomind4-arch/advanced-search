# Newsgroup Research Skill

Use Computer-backed NNTP access only against explicitly configured public/authorized servers and groups.

## Strategy
- Discover relevant groups from an approved server's group metadata.
- Search subject/body/index metadata for exact terms, aliases, usernames, events and dates.
- Retrieve only matching message headers/bodies needed for the investigation.
- Extract attachment references, image URLs, names, dates, organizations and quoted material.
- Feed discovered media and clues into image, metadata, entity and provenance agents.

## Safety
- Read-only.
- No authentication attacks or credential guessing.
- No arbitrary server enumeration.
- No posting, message injection, deletion or moderation actions.
- Per-server/group request and byte budgets are mandatory.

## Evidence
Preserve server, group, message identifier, subject, author as publicly displayed, timestamp, retrieval time and source path. Distinguish message claims from independently corroborated facts.
