export type SearchAgentId =
  | 'web-discovery'
  | 'reverse-image'
  | 'face-search'
  | 'archive'
  | 'document'
  | 'video'
  | 'metadata'
  | 'visual-context'
  | 'source-provenance'
  | 'entity-resolution'
  | 'cross-corroboration'
  | 'ftp-research'
  | 'newsgroup-research'
  | 'computer-source-hunter';

export interface AgentTask {
  id: string;
  caseId?: string;
  mode: 'text' | 'image' | 'face' | 'video' | 'document' | 'archive' | 'metadata';
  objective: string;
  query?: string;
  inputUrls?: string[];
  depth: number;
  budget: { maxRequests: number; timeoutMs: number; maxBytes?: number };
  constraints: {
    publicSourcesOnly?: boolean;
    allowedDomains?: string[];
    excludedDomains?: string[];
    allowedFtpHosts?: string[];
    allowedNntpServers?: string[];
    allowedNntpGroups?: string[];
  };
}

export interface AgentFinding {
  agent: SearchAgentId;
  title: string;
  sourceUrl?: string;
  mediaUrl?: string;
  publishedAt?: string;
  extractedText?: string;
  entities?: string[];
  signals?: Record<string, number>;
  provenance?: { parentFindingId?: string; relation: 'same-image' | 'derived-image' | 'same-source' | 'related' | 'supports' | 'contradicts' };
  notes?: string[];
}

export interface SearchAgent {
  readonly id: SearchAgentId;
  readonly capabilities: string[];
  run(task: AgentTask): Promise<AgentFinding[]>;
}
