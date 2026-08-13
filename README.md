# Advanced Search Engine

A modular, multimodal investigation search platform for discovering publicly accessible images, documents, video, pages, archives and other evidence, with optional face/visual matching over lawfully collected or user-authorized corpora.

## Architecture

```text
Query / Upload
      |
      v
Search Commander
      |
      +-- Web / Search Engines
      +-- Reverse Image / Face Providers
      +-- Wayback / Common Crawl
      +-- Documents / PDFs / OCR
      +-- Video / Keyframes
      +-- Metadata / Hashing
      +-- Cloudflare Computer
      |      +-- Browser research
      |      +-- Public FTP
      |      +-- Public NNTP / Newsgroups
      |      +-- Archive/document tooling
      |      `-- Local evidence processing
      |
      v
Result Normalizer -> Dedup -> Entity Resolution
      |
      v
Provenance + Evidence Graph
      |
      v
Cross-Provider Corroboration + Ranking
      |
      v
Investigation Workspace
```

## Computer integration

The `computer/` directory defines a controlled integration profile for Cloudflare Computer. The upstream project is used as an execution backend rather than copied into this repository. Cloudflare Computer supports a durable workspace and container/isolate execution surfaces; the advanced-search profile adds source-specific skills and adapters on top.

## Legacy-source capabilities

- Public FTP directory/file discovery through a Computer-controlled executor.
- Public/authorized NNTP/newsgroup discovery through a Computer-controlled executor.
- Bounded browser and shell research.
- Hashing, OCR, document extraction and evidence packaging.

FTP and NNTP are intentionally read-only and allowlist-driven. The system does not perform credential guessing, port scanning, access-control bypass, posting, deletion or private-source enumeration.

## Agent team

The default registry now includes web discovery, reverse image, face search, archive, document, video, metadata, visual context, provenance, entity resolution, cross-corroboration, FTP research, newsgroup research and a Computer source-hunter agent.

## Skills

See `skills/` for the source-hunter, FTP, NNTP and evidence-fusion operating procedures.

## Reference projects

This project uses original integration boundaries inspired by public projects and standards rather than copying their code. Candidate references include EyeOfWeb, InsightFace, WISE, Search by Image, LibrePhotos, Bellingcat's OSINT resources, Milvus, Common Crawl/Wayback tooling, and Cloudflare Computer.

## Status

Core architecture is implemented. Agent registry, bounded orchestration, evidence normalization, recursive search planning, Computer integration profile, and FTP/NNTP source adapters are in place. Provider-specific API credentials and runtime wiring remain deployment configuration rather than hard-coded secrets.
