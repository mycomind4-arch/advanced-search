# Advanced Search Computer Profile

This directory defines how `advanced-search` uses Cloudflare Computer as an execution backend. It does not modify or vendor the upstream `cloudflare/computer` repository.

Cloudflare Computer provides the workspace filesystem plus pluggable container, isolate-shell and isolate-JavaScript runtimes. The integration uses that runtime as a controlled research worker.

## Required controls
- Explicit egress allowlist.
- Per-domain/server request limits.
- Maximum response bytes.
- Execution timeout.
- Read-only source tools by default.
- Full command/source audit trail.
- No credential discovery or bypass behavior.

## Suggested workspace tools
- browser navigation/extraction
- curl/http retrieval
- FTP read-only listing/download
- Python NNTP read-only client
- file hashing
- OCR/image inspection
- archive/document processing
- artifact packaging

See `skills/computer-source-hunter.md` and the source-specific skills for task behavior.
