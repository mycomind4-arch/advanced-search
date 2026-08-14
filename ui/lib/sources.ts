import type { SourceStatus, SourceCategory } from './types';

// Source/provider definitions — mirrors src/adapters/builtins.ts + server adapters
// Sources marked 'configured: true' have live adapters that will actually execute.
export const SOURCE_DEFINITIONS: Omit<SourceStatus, 'resultCount'>[] = [
  // Configured & live
  { id: 'wayback', name: 'Internet Archive / Wayback', category: 'archive', configured: true, available: true, adapterId: 'wayback', modes: ['archive', 'image', 'text', 'document'] },
  { id: 'common-crawl', name: 'Common Crawl', category: 'archive', configured: true, available: true, adapterId: 'common-crawl', modes: ['archive', 'image', 'text', 'document'] },
  { id: 'github', name: 'GitHub Code & Repos', category: 'web', configured: true, available: true, adapterId: 'github', modes: ['text', 'metadata'] },

  // Not yet configured — require API credentials
  { id: 'google-vision', name: 'Google Vision', category: 'web', configured: false, available: false, adapterId: 'google-vision', modes: ['image', 'text', 'metadata'] },
  { id: 'brave-search', name: 'Brave Search', category: 'web', configured: false, available: false, modes: ['text'] },
  { id: 'bing-search', name: 'Bing Web Search', category: 'web', configured: false, available: false, modes: ['text'] },
  { id: 'tineye', name: 'TinEye', category: 'image', configured: false, available: false, adapterId: 'tineye', modes: ['image'] },
  { id: 'insightface', name: 'InsightFace', category: 'image', configured: false, available: false, adapterId: 'insightface', modes: ['face', 'image'] },

  // Require Computer runtime
  { id: 'computer-ftp', name: 'Public FTP (Computer)', category: 'ftp', configured: false, available: false, adapterId: 'computer-ftp', modes: ['text', 'image', 'document', 'metadata'] },
  { id: 'computer-nntp', name: 'Public NNTP (Computer)', category: 'newsgroup', configured: false, available: false, adapterId: 'computer-nntp', modes: ['text', 'metadata'] },
];

export function getSourceStatuses(): SourceStatus[] {
  return SOURCE_DEFINITIONS.map((s) => ({ ...s, resultCount: 0 }));
}

export const SOURCE_CATEGORY_LABELS: Record<SourceCategory, string> = {
  web: 'Web & Search Engines',
  image: 'Images & Reverse Image',
  archive: 'Archives',
  document: 'Documents',
  video: 'Video',
  metadata: 'Metadata',
  ftp: 'FTP',
  newsgroup: 'Newsgroups',
};
