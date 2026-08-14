import type { AgentInfo, PipelineStage, SearchMode } from './types';

// Agent definitions — mirrors src/agents/builtin-agents.ts
export const AGENTS: AgentInfo[] = [
  { id: 'web-discovery', name: 'Web Discovery', capabilities: ['web', 'search-engine', 'query-expansion'], status: 'planned', description: 'Broad public-web discovery across search engines and public endpoints' },
  { id: 'reverse-image', name: 'Reverse Image', capabilities: ['reverse-image', 'image', 'near-duplicate'], status: 'planned', description: 'Image copies and derivatives across providers' },
  { id: 'face-search', name: 'Face Search', capabilities: ['face', 'identity-candidate', 'multi-reference-face'], status: 'planned', description: 'Face similarity and identity candidates over permitted corpora' },
  { id: 'archive', name: 'Archive', capabilities: ['wayback', 'common-crawl', 'historical', 'deleted-page-discovery'], status: 'planned', description: 'Historical and deleted-page discovery via Wayback and Common Crawl' },
  { id: 'document', name: 'Document', capabilities: ['pdf', 'ocr', 'document-images', 'attachment-extraction'], status: 'planned', description: 'PDF and embedded-image extraction with OCR' },
  { id: 'video', name: 'Video', capabilities: ['video', 'keyframes', 'frame-deduplication'], status: 'planned', description: 'Keyframe extraction and visual/metadata search' },
  { id: 'metadata', name: 'Metadata', capabilities: ['exif', 'ocr', 'filename', 'hashing'], status: 'planned', description: 'EXIF, OCR, filename analysis, and content hashing' },
  { id: 'visual-context', name: 'Visual Context', capabilities: ['objects', 'scene', 'location-clues', 'visual-embeddings'], status: 'planned', description: 'Object detection, scene classification, and location inference' },
  { id: 'source-provenance', name: 'Source Provenance', capabilities: ['provenance', 'deduplication', 'earliest-source'], status: 'planned', description: 'Source lineage tracking and deduplication' },
  { id: 'entity-resolution', name: 'Entity Resolution', capabilities: ['entities', 'cross-source', 'alias-resolution'], status: 'planned', description: 'Cross-source entity resolution and alias detection' },
  { id: 'cross-corroboration', name: 'Cross-Corroboration', capabilities: ['corroboration', 'ranking', 'independence-analysis'], status: 'planned', description: 'Independent-provider corroboration analysis and ranking' },
  { id: 'ftp-research', name: 'FTP Research', capabilities: ['ftp', 'legacy-source', 'public-directory-search', 'file-discovery'], status: 'planned', description: 'Public FTP directory and file discovery (read-only, allowlist-driven)' },
  { id: 'newsgroup-research', name: 'Newsgroup Research', capabilities: ['nntp', 'newsgroups', 'message-search', 'legacy-source'], status: 'planned', description: 'Public NNTP/newsgroup message search (read-only, allowlist-driven)' },
  { id: 'computer-source-hunter', name: 'Computer Source Hunter', capabilities: ['browser', 'computer-runtime', 'ftp', 'nntp', 'archives', 'shell-tools', 'evidence-packaging'], status: 'planned', description: 'Computer runtime source hunting with browser, shell, and evidence packaging' },
];

export function getAgentById(id: string): AgentInfo | undefined {
  return AGENTS.find((a) => a.id === id);
}

// Pipeline stages — mirrors src/core/search-plan.ts logic
export function buildPipelineStages(mode: SearchMode): PipelineStage[] {
  const base: PipelineStage[] = [
    { id: 'planning', name: 'Planning', agentId: 'web-discovery', status: 'queued', capabilities: ['query-expansion'] },
  ];

  switch (mode) {
    case 'text':
      return [
        ...base,
        { id: 'web-discovery', name: 'Web Discovery', agentId: 'web-discovery', status: 'queued', capabilities: ['web', 'search-engine'] },
        { id: 'archive', name: 'Archives', agentId: 'archive', status: 'queued', capabilities: ['wayback', 'common-crawl'] },
        { id: 'ftp', name: 'FTP Sources', agentId: 'ftp-research', status: 'not-configured', capabilities: ['ftp'] },
        { id: 'nntp', name: 'Newsgroups', agentId: 'newsgroup-research', status: 'not-configured', capabilities: ['nntp'] },
        { id: 'metadata', name: 'Metadata', agentId: 'metadata', status: 'queued', capabilities: ['exif', 'hashing'] },
        { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', status: 'queued', capabilities: ['entities'] },
        { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', status: 'queued', capabilities: ['corroboration'] },
      ];
    case 'image':
      return [
        ...base,
        { id: 'reverse-image', name: 'Reverse Image', agentId: 'reverse-image', status: 'queued', capabilities: ['reverse-image'] },
        { id: 'metadata', name: 'Metadata', agentId: 'metadata', status: 'queued', capabilities: ['exif', 'ocr'] },
        { id: 'archive', name: 'Archives', agentId: 'archive', status: 'queued', capabilities: ['wayback'] },
        { id: 'document', name: 'Documents', agentId: 'document', status: 'queued', capabilities: ['document-images'] },
        { id: 'visual-context', name: 'Visual Context', agentId: 'visual-context', status: 'queued', capabilities: ['objects', 'scene'] },
        { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', status: 'queued', capabilities: ['entities'] },
        { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', status: 'queued', capabilities: ['corroboration'] },
      ];
    case 'face':
      return [
        ...base,
        { id: 'face-search', name: 'Face Search', agentId: 'face-search', status: 'queued', capabilities: ['face'] },
        { id: 'reverse-image', name: 'Image Expansion', agentId: 'reverse-image', status: 'queued', capabilities: ['image'] },
        { id: 'metadata', name: 'Metadata', agentId: 'metadata', status: 'queued', capabilities: ['ocr', 'filename'] },
        { id: 'archive', name: 'Archives', agentId: 'archive', status: 'queued', capabilities: ['historical'] },
        { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', status: 'queued', capabilities: ['entities'] },
        { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', status: 'queued', capabilities: ['corroboration'] },
      ];
    case 'video':
      return [
        ...base,
        { id: 'video', name: 'Video Search', agentId: 'video', status: 'queued', capabilities: ['keyframes'] },
        { id: 'face-search', name: 'Face Search', agentId: 'face-search', status: 'queued', capabilities: ['face'] },
        { id: 'reverse-image', name: 'Keyframe Image', agentId: 'reverse-image', status: 'queued', capabilities: ['image'] },
        { id: 'metadata', name: 'Metadata', agentId: 'metadata', status: 'queued', capabilities: ['exif'] },
        { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', status: 'queued', capabilities: ['entities'] },
        { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', status: 'queued', capabilities: ['corroboration'] },
      ];
    case 'document':
      return [
        ...base,
        { id: 'document', name: 'Document Search', agentId: 'document', status: 'queued', capabilities: ['pdf', 'ocr'] },
        { id: 'metadata', name: 'Metadata', agentId: 'metadata', status: 'queued', capabilities: ['hashing', 'ocr'] },
        { id: 'archive', name: 'Archives', agentId: 'archive', status: 'queued', capabilities: ['wayback'] },
        { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', status: 'queued', capabilities: ['entities'] },
        { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', status: 'queued', capabilities: ['corroboration'] },
      ];
    case 'archive':
      return [
        ...base,
        { id: 'archive', name: 'Archive Search', agentId: 'archive', status: 'queued', capabilities: ['wayback', 'common-crawl'] },
        { id: 'ftp', name: 'FTP Sources', agentId: 'ftp-research', status: 'not-configured', capabilities: ['ftp'] },
        { id: 'nntp', name: 'Newsgroups', agentId: 'newsgroup-research', status: 'not-configured', capabilities: ['nntp'] },
        { id: 'metadata', name: 'Metadata', agentId: 'metadata', status: 'queued', capabilities: ['exif'] },
        { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', status: 'queued', capabilities: ['entities'] },
        { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', status: 'queued', capabilities: ['corroboration'] },
      ];
    case 'metadata':
      return [
        ...base,
        { id: 'metadata', name: 'Metadata Extraction', agentId: 'metadata', status: 'queued', capabilities: ['exif', 'ocr', 'hashing'] },
        { id: 'visual-context', name: 'Visual Context', agentId: 'visual-context', status: 'queued', capabilities: ['objects', 'scene'] },
        { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', status: 'queued', capabilities: ['entities'] },
        { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', status: 'queued', capabilities: ['corroboration'] },
      ];
  }
}
