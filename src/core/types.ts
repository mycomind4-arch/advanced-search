export type SearchMode =
  | 'text'
  | 'image'
  | 'face'
  | 'video'
  | 'document'
  | 'archive'
  | 'metadata';

export interface SearchRequest {
  id: string;
  mode: SearchMode;
  query?: string;
  imageUrl?: string;
  imageBytesBase64?: string;
  filters?: SearchFilters;
  budget?: SearchBudget;
}

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

export interface SearchAdapter {
  readonly id: string;
  readonly modes: SearchMode[];
  isAvailable(): Promise<boolean>;
  search(request: SearchRequest): Promise<SearchObservation[]>;
}
