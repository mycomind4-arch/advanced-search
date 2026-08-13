# FTP Research Skill

Use the Computer runtime to search explicitly approved public FTP repositories for files and directory listings relevant to a search task.

## Strategy
- Start with known public FTP endpoints supplied by configuration.
- Search shallowly before expanding depth.
- Prefer filename, path, extension and timestamp clues.
- Download only files needed for evidence extraction.
- Hash downloaded artifacts and retain the originating FTP URL.
- Feed discovered images/documents back into OCR, visual, face and provenance agents.

## Safety
- Read-only by default.
- No anonymous-write operations.
- No credential guessing.
- No host/port scanning.
- No traversal outside the configured public root.
- Enforce per-host request, byte and time budgets.

## Handoff
Every useful result becomes a normalized finding and may create a bounded follow-up task for document, image, metadata or provenance agents.
