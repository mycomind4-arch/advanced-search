import type { AgentInfo, PipelineStage, SearchMode } from './types';

// Agent definitions — mirrors src/agents/builtin-agents.ts
// Agents marked 'active' have real implementations that execute during searches.
export const AGENTS: AgentInfo[] = [
  { id: 'web-discovery', name: 'Web Discovery', capabilities: ['web', 'search-engine', 'query-expansion', 'code-search', 'repo-search'], status: 'active', description: 'Broad public-web discovery via GitHub code, repository, commit, and issue search' },
  { id: 'reverse-image', name: 'Reverse Image', capabilities: ['reverse-image', 'image', 'near-duplicate'], status: 'planned', description: 'Image copies and derivatives across providers — requires TinEye or Google Vision credentials' },
  { id: 'face-search', name: 'Face Search', capabilities: ['face', 'identity-candidate', 'multi-reference-face'], status: 'planned', description: 'Face similarity and identity candidates over permitted corpora — requires licensed face-search provider' },
  { id: 'archive', name: 'Archive', capabilities: ['wayback', 'common-crawl', 'historical', 'deleted-page-discovery'], status: 'active', description: 'Historical and deleted-page discovery via Wayback CDX API and Common Crawl index' },
  { id: 'document', name: 'Document', capabilities: ['pdf', 'ocr', 'document-images', 'attachment-extraction'], status: 'planned', description: 'PDF and embedded-image extraction with OCR — requires document processing pipeline' },
  { id: 'video', name: 'Video', capabilities: ['video', 'keyframes', 'frame-deduplication'], status: 'planned', description: 'Keyframe extraction and visual/metadata search — requires video processing pipeline' },
  { id: 'metadata', name: 'Metadata', capabilities: ['exif', 'ocr', 'filename', 'hashing'], status: 'active', description: 'HTTP header extraction, content type analysis, and timestamp normalization' },
  { id: 'visual-context', name: 'Visual Context', capabilities: ['objects', 'scene', 'location-clues', 'visual-embeddings'], status: 'planned', description: 'Object detection, scene classification, and location inference — requires vision API' },
  { id: 'source-provenance', name: 'Source Provenance', capabilities: ['provenance', 'deduplication', 'earliest-source'], status: 'active', description: 'Source lineage tracking and URL-based deduplication across providers' },
  { id: 'entity-resolution', name: 'Entity Resolution', capabilities: ['entities', 'cross-source', 'alias-resolution'], status: 'active', description: 'Cross-source entity extraction — identifies people, organizations, repos, dates, and locations from results' },
  { id: 'cross-corroboration', name: 'Cross-Corroboration', capabilities: ['corroboration', 'ranking', 'independence-analysis'], status: 'active', description: 'Independent-provider corroboration analysis, scoring, and result ranking' },
  { id: 'ftp-research', name: 'FTP Research', capabilities: ['ftp', 'legacy-source', 'public-directory-search', 'file-discovery'], status: 'planned', description: 'Public FTP directory and file discovery (read-only, allowlist-driven) — requires Computer runtime' },
  { id: 'newsgroup-research', name: 'Newsgroup Research', capabilities: ['nntp', 'newsgroups', 'message-search', 'legacy-source'], status: 'planned', description: 'Public NNTP/newsgroup message search (read-only, allowlist-driven) — requires Computer runtime' },
  { id: 'computer-source-hunter', name: 'Computer Source Hunter', capabilities: ['browser', 'computer-runtime', 'ftp', 'nntp', 'archives', 'shell-tools', 'evidence-packaging'], status: 'planned', description: 'Computer runtime source hunting with browser, shell, and evidence packaging — requires Computer deployment' },
];

export function getAgentById(id: string): AgentInfo | undefined {
  return AGENTS.find((a) => a.id === id);
}

// Pipeline stages — mirrors src/core/search-plan.ts + server engine logic
// Stages marked 'not-configured' show the user what would run if credentials were added.
export function buildPipelineStages(mode: SearchMode): PipelineStage[] {
  const base: PipelineStage[] = [
    { id: 'planning', name: 'Planning', agentId: 'web-discovery', status: 'queued', capabilities: ['query-expansion'] },
  ];

  switch (mode) {
    case 'text':
      return [
        ...base,
        { id: 'github-search', name: 'GitHub Code Search', agentId: 'web-discovery', status: 'queued', capabilities: ['code-search', 'repo-search'] },
        { id: 'archive', name: 'Archives (Wayback)', agentId: 'archive', status: 'queued', capabilities: ['wayback'] },
        { id: 'common-crawl', name: 'Common Crawl', agentId: 'archive', status: 'queued', capabilities: ['common-crawl'] },
        { id: 'metadata', name: 'Metadata Extraction', agentId: 'metadata', status: 'queued', capabilities: ['exif', 'hashing'] },
        { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', status: 'queued', capabilities: ['entities'] },
        { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', status: 'queued', capabilities: ['corroboration'] },
      ];
    case 'image':
      return [
        ...base,
        { id: 'archive', name: 'Archives (Wayback)', agentId: 'archive', status: 'queued', capabilities: ['wayback'] },
        { id: 'common-crawl', name: 'Common Crawl', agentId: 'archive', status: 'queued', capabilities: ['common-crawl'] },
        { id: 'github-search', name: 'GitHub Image Search', agentId: 'reverse-image', status: 'queued', capabilities: ['code-search'] },
        { id: 'metadata', name: 'Metadata Extraction', agentId: 'metadata', status: 'queued', capabilities: ['exif', 'ocr'] },
        { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', status: 'queued', capabilities: ['entities'] },
        { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', status: 'queued', capabilities: ['corroboration'] },
      ];
    case 'face':
      return [
        ...base,
        { id: 'archive', name: 'Archives (Wayback)', agentId: 'archive', status: 'queued', capabilities: ['wayback'] },
        { id: 'github-search', name: 'GitHub Search', agentId: 'face-search', status: 'queued', capabilities: ['code-search'] },
        { id: 'metadata', name: 'Metadata', agentId: 'metadata', status: 'queued', capabilities: ['ocr', 'filename'] },
        { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', status: 'queued', capabilities: ['entities'] },
        { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', status: 'queued', capabilities: ['corroboration'] },
      ];
    case 'video':
      return [
        ...base,
        { id: 'archive', name: 'Archives (Wayback)', agentId: 'archive', status: 'queued', capabilities: ['wayback'] },
        { id: 'github-search', name: 'GitHub Search', agentId: 'video', status: 'queued', capabilities: ['code-search'] },
        { id: 'metadata', name: 'Metadata', agentId: 'metadata', status: 'queued', capabilities: ['exif'] },
        { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', status: 'queued', capabilities: ['entities'] },
        { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', status: 'queued', capabilities: ['corroboration'] },
      ];
    case 'document':
      return [
        ...base,
        { id: 'github-search', name: 'GitHub Code Search', agentId: 'document', status: 'queued', capabilities: ['code-search', 'pdf'] },
        { id: 'archive', name: 'Archives (Wayback)', agentId: 'archive', status: 'queued', capabilities: ['wayback'] },
        { id: 'common-crawl', name: 'Common Crawl', agentId: 'archive', status: 'queued', capabilities: ['common-crawl'] },
        { id: 'metadata', name: 'Metadata', agentId: 'metadata', status: 'queued', capabilities: ['hashing', 'ocr'] },
        { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', status: 'queued', capabilities: ['entities'] },
        { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', status: 'queued', capabilities: ['corroboration'] },
      ];
    case 'archive':
      return [
        ...base,
        { id: 'archive', name: 'Archive Search (Wayback)', agentId: 'archive', status: 'queued', capabilities: ['wayback', 'common-crawl'] },
        { id: 'common-crawl', name: 'Common Crawl', agentId: 'archive', status: 'queued', capabilities: ['common-crawl'] },
        { id: 'github-search', name: 'GitHub Code Search', agentId: 'web-discovery', status: 'queued', capabilities: ['code-search'] },
        { id: 'metadata', name: 'Metadata', agentId: 'metadata', status: 'queued', capabilities: ['exif'] },
        { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', status: 'queued', capabilities: ['entities'] },
        { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', status: 'queued', capabilities: ['corroboration'] },
      ];
    case 'metadata':
      return [
        ...base,
        { id: 'metadata', name: 'Metadata Extraction', agentId: 'metadata', status: 'queued', capabilities: ['exif', 'ocr', 'hashing'] },
        { id: 'github-search', name: 'GitHub Search', agentId: 'web-discovery', status: 'queued', capabilities: ['code-search'] },
        { id: 'archive', name: 'Archives (Wayback)', agentId: 'archive', status: 'queued', capabilities: ['wayback'] },
        { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', status: 'queued', capabilities: ['entities'] },
        { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', status: 'queued', capabilities: ['corroboration'] },
      ];
  }
}
