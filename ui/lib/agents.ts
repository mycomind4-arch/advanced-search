import type { AgentInfo, PipelineStage, SearchMode } from './types';

export const AGENTS: AgentInfo[] = [
  { id: 'web-discovery', name: 'Web Discovery', capabilities: ['web', 'search-engine', 'query-expansion', 'code-search', 'repo-search', 'instant-answer', 'encyclopedia', 'tech-community', 'community', 'discussions'], status: 'active', description: 'Multi-source web discovery across GitHub, DuckDuckGo, Wikipedia, Hacker News, and Reddit' },
  { id: 'reverse-image', name: 'Reverse Image', capabilities: ['reverse-image', 'image', 'near-duplicate'], status: 'planned', description: 'Image copies and derivatives across providers — requires TinEye or Google Vision credentials' },
  { id: 'face-search', name: 'Face Search', capabilities: ['face', 'identity-candidate', 'multi-reference-face'], status: 'planned', description: 'Face similarity and identity candidates over permitted corpora — requires licensed face-search provider' },
  { id: 'archive', name: 'Archive', capabilities: ['wayback', 'common-crawl', 'historical', 'deleted-page-discovery'], status: 'active', description: 'Historical and deleted-page discovery via Wayback CDX API and Common Crawl index' },
  { id: 'document', name: 'Document', capabilities: ['pdf', 'ocr', 'document-images', 'attachment-extraction'], status: 'planned', description: 'PDF and embedded-image extraction with OCR — requires document processing pipeline' },
  { id: 'video', name: 'Video', capabilities: ['video', 'keyframes', 'frame-deduplication'], status: 'planned', description: 'Keyframe extraction and visual/metadata search — requires video processing pipeline' },
  { id: 'metadata', name: 'Metadata', capabilities: ['exif', 'headers', 'content-type', 'hashing'], status: 'active', description: 'HTTP header extraction, content type analysis, and timestamp normalization' },
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

export function buildPipelineStages(mode: SearchMode): PipelineStage[] {
  const base: PipelineStage[] = [
    { id: 'planning', name: 'Planning', agentId: 'web-discovery', status: 'queued', capabilities: ['query-expansion'] },
  ];
  const searchStages: PipelineStage[] = [
    { id: 'github-search', name: 'GitHub', agentId: 'web-discovery', status: 'queued', capabilities: ['code-search', 'repo-search'] },
    { id: 'ddg', name: 'DuckDuckGo', agentId: 'web-discovery', status: 'queued', capabilities: ['instant-answer', 'related-topics'] },
    { id: 'wikipedia', name: 'Wikipedia', agentId: 'web-discovery', status: 'queued', capabilities: ['encyclopedia', 'knowledge'] },
    { id: 'hackernews', name: 'Hacker News', agentId: 'web-discovery', status: 'queued', capabilities: ['tech-community', 'discussions'] },
    { id: 'reddit', name: 'Reddit', agentId: 'web-discovery', status: 'queued', capabilities: ['community', 'discussions'] },
    { id: 'archive', name: 'Wayback', agentId: 'archive', status: 'queued', capabilities: ['wayback'] },
    { id: 'common-crawl', name: 'Common Crawl', agentId: 'archive', status: 'queued', capabilities: ['common-crawl'] },
  ];
  const postStages: PipelineStage[] = [
    { id: 'metadata', name: 'Metadata', agentId: 'metadata', status: 'queued', capabilities: ['headers', 'content-type'] },
    { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', status: 'queued', capabilities: ['entities', 'cross-source'] },
    { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', status: 'queued', capabilities: ['corroboration', 'ranking'] },
  ];

  switch (mode) {
    case 'text': case 'document': return [...base, ...searchStages, ...postStages];
    case 'archive': return [...base,
      { id: 'archive', name: 'Wayback', agentId: 'archive', status: 'queued', capabilities: ['wayback'] },
      { id: 'common-crawl', name: 'Common Crawl', agentId: 'archive', status: 'queued', capabilities: ['common-crawl'] },
      { id: 'github-search', name: 'GitHub', agentId: 'web-discovery', status: 'queued', capabilities: ['code-search'] },
      { id: 'ddg', name: 'DuckDuckGo', agentId: 'web-discovery', status: 'queued', capabilities: ['instant-answer'] },
      { id: 'wikipedia', name: 'Wikipedia', agentId: 'web-discovery', status: 'queued', capabilities: ['encyclopedia'] },
      ...postStages];
    case 'image': case 'face': case 'video': return [...base,
      { id: 'archive', name: 'Wayback', agentId: 'archive', status: 'queued', capabilities: ['wayback'] },
      { id: 'common-crawl', name: 'Common Crawl', agentId: 'archive', status: 'queued', capabilities: ['common-crawl'] },
      { id: 'github-search', name: 'GitHub', agentId: 'reverse-image', status: 'queued', capabilities: ['code-search'] },
      { id: 'ddg', name: 'DuckDuckGo', agentId: 'web-discovery', status: 'queued', capabilities: ['instant-answer'] },
      { id: 'wikipedia', name: 'Wikipedia', agentId: 'web-discovery', status: 'queued', capabilities: ['encyclopedia'] },
      { id: 'hackernews', name: 'Hacker News', agentId: 'web-discovery', status: 'queued', capabilities: ['tech-community'] },
      { id: 'reddit', name: 'Reddit', agentId: 'web-discovery', status: 'queued', capabilities: ['community'] },
      ...postStages];
    case 'metadata': return [...base,
      { id: 'metadata', name: 'Metadata Extraction', agentId: 'metadata', status: 'queued', capabilities: ['exif', 'ocr', 'hashing'] },
      { id: 'github-search', name: 'GitHub', agentId: 'web-discovery', status: 'queued', capabilities: ['code-search'] },
      { id: 'ddg', name: 'DuckDuckGo', agentId: 'web-discovery', status: 'queued', capabilities: ['instant-answer'] },
      { id: 'wikipedia', name: 'Wikipedia', agentId: 'web-discovery', status: 'queued', capabilities: ['encyclopedia'] },
      { id: 'archive', name: 'Wayback', agentId: 'archive', status: 'queued', capabilities: ['wayback'] },
      { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', status: 'queued', capabilities: ['entities'] },
      { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', status: 'queued', capabilities: ['corroboration'] }];
  }
}
