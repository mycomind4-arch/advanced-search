# Advanced Search Engine

A modular, multimodal investigation search platform for discovering publicly accessible images, documents, video, pages, and other evidence, with optional face/visual matching over lawfully collected or user-authorized corpora.

## Design goals

- Provider-agnostic search adapters
- Text, image, face, video, document, metadata, and archive search
- Result normalization and deduplication
- Provenance and source lineage
- Evidence-aware ranking rather than opaque provider scores
- Recursive clue discovery with bounded search budgets
- Pluggable vector search for private/user-authorized collections
- Explicit source permissions, rate limits, robots/terms controls, and audit logs

## Initial architecture

```text
Query / Upload
      |
      v
Query Planner -> Search Jobs -> Source Adapters
                              |-- web
                              |-- reverse image
                              |-- face
                              |-- archives
                              |-- documents
                              |-- video
                              |-- metadata
                              `-- user-authorized corpora
                                      |
                                      v
                              Result Normalizer
                                      |
                                      v
                           Dedup / Entity Linking
                                      |
                                      v
                         Evidence + Provenance Graph
                                      |
                                      v
                          Ranking / Cluster Engine
                                      |
                                      v
                              Search Workspace
```

## Reference projects

This project is implementing original integration boundaries inspired by public projects and standards rather than copying their code. Candidate references include EyeOfWeb, InsightFace, WISE, Search by Image, LibrePhotos, Bellingcat's OSINT resources, Milvus, and Common Crawl/Wayback tooling.

## Status

Phase 0: architecture and adapter contracts.

Next phases: working text search, reverse-image adapters, face-search adapter, archival/document discovery, vector index, evidence graph, and investigator UI.
