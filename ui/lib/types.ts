// Shared types — mirrors the core library types for UI consumption

export type SearchMode = 'text' | 'image' | 'face' | 'video' | 'document' | 'archive' | 'metadata';

export interface SearchFilters {
  domains?: string[];
  excludeDomains?: string[];
  dateFrom?: string;
  dateTo?: string;
  languages?: string[];
  countries?: string[];
  sourceTypes?: string[];
}

export interface SearchBudget {
  maxJobs?: number;
  maxDepth?: number;
  maxProviderCostUsd?: number;
  timeoutMs?: number;
}

export interface SearchRequest {
  id: string;
  mode: SearchMode;
  query?: string;
  imageUrl?: string;
  imageBytesBase64?: string;
  filters?: SearchFilters;
  budget?: SearchBudget;
}

export interface MatchSignals {
  faceSimilarity?: number;
  visualSimilarity?: number;
  textRelevance?: number;
  sourceQuality?: number;
  temporalConsistency?: number;
  corroboration?: number;
}

export interface ExtractedEntity {
  type: 'person' | 'organization' | 'location' | 'event' | 'username' | 'date' | 'other';
  value: string;
  confidence?: number;
}

export interface ProvenanceLink {
  relation: 'duplicate' | 'derived-from' | 'repost' | 'embedded-in' | 'same-source';
  targetObservationId: string;
}

export interface SearchObservation {
  id: string;
  provider: string;
  providerResultId?: string;
  sourceUrl?: string;
  mediaUrl?: string;
  title?: string;
  snippet?: string;
  caption?: string;
  discoveredAt: string;
  publishedAt?: string;
  sourceType?: string;
  queryJobId: string;
  providerScore?: number;
  signals?: MatchSignals;
  entities?: ExtractedEntity[];
  provenance?: ProvenanceLink[];
}

// UI-specific types

export type InvestigationStatus = 'active' | 'completed' | 'archived';

export interface Investigation {
  id: string;
  title: string;
  query: string;
  mode: SearchMode;
  status: InvestigationStatus;
  createdAt: string;
  updatedAt: string;
  evidence: EvidenceItem[];
  entities: ResolvedEntity[];
  sources: SourceStatus[];
  notes: string;
  pipelineStages: PipelineStage[];
  resultCount: number;
  confidenceSummary: ConfidenceSummary;
}

export interface EvidenceItem {
  id: string;
  observation: SearchObservation;
  investigationId: string;
  addedAt: string;
  note?: string;
  labels: string[];
  boardPosition?: { x: number; y: number };
  relationships: EvidenceRelationship[];
}

export interface EvidenceRelationship {
  id: string;
  fromId: string;
  toId: string;
  relation: 'same-source' | 'derived-from' | 'corroborates' | 'contradicts' | 'related';
}

export interface ResolvedEntity {
  id: string;
  type: ExtractedEntity['type'];
  name: string;
  aliases: string[];
  confidence: number;
  sources: string[];
  relationships: { entityId: string; relation: string }[];
  appearances: string[];
  firstSeen: string;
  lastSeen: string;
}

export interface ConfidenceSummary {
  overall: number;
  high: number;
  medium: number;
  low: number;
}

export type PipelineStageStatus = 'queued' | 'running' | 'completed' | 'failed' | 'not-configured';

export interface PipelineStage {
  id: string;
  name: string;
  agentId: string;
  status: PipelineStageStatus;
  resultCount?: number;
  elapsedMs?: number;
  error?: string;
  capabilities?: string[];
}

export type SourceCategory = 'web' | 'image' | 'archive' | 'document' | 'video' | 'metadata' | 'ftp' | 'newsgroup';

export interface SourceStatus {
  id: string;
  name: string;
  category: SourceCategory;
  configured: boolean;
  available: boolean;
  resultCount: number;
  latencyMs?: number;
  lastQueried?: string;
  error?: string;
  adapterId?: string;
  modes: SearchMode[];
}

export interface AgentInfo {
  id: string;
  name: string;
  capabilities: string[];
  status: 'planned' | 'active' | 'error';
  description: string;
}

export type ResultsView = 'list' | 'cards' | 'table' | 'timeline' | 'graph';

export interface GraphNode {
  id: string;
  type: 'person' | 'organization' | 'location' | 'event' | 'document' | 'image' | 'url' | 'video' | 'claim';
  label: string;
  x?: number;
  y?: number;
  evidenceId?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
}

export interface TimelineEventItem {
  id: string;
  date: string;
  type: SourceCategory | 'entity';
  title: string;
  description?: string;
  sourceUrl?: string;
  evidenceId?: string;
}
