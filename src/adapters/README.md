# Adapter roadmap

Adapters are intentionally isolated from the core engine. Each adapter must implement `SearchAdapter` and return normalized observations.

## Planned adapters

### Web / text
- Google Programmable Search or licensed provider
- Bing Web Search / licensed provider
- Brave Search API

### Reverse image
- TinEye API
- Google Cloud Vision Web Detection
- licensed visual-search providers

### Face
- licensed facial-search provider adapters where permitted
- Amazon Rekognition for authorized collections
- self-hosted InsightFace/ArcFace service for authorized corpora

### Archives
- Internet Archive / Wayback APIs
- Common Crawl index

### Documents
- PDF/image extraction pipeline
- OCR
- metadata extraction

### Video
- keyframe extraction
- face/visual embedding pipeline
- video metadata

### Local / private corpus
- PostgreSQL + pgvector or Milvus
- object storage
- background indexing workers

Adapters must not circumvent authentication, CAPTCHAs, access controls, rate limits, robots directives, or provider terms.
