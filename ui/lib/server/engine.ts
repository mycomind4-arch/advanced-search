// Server-side search engine — orchestrates adapters and agents through a pipeline.
// Emits SSE-style events as each stage progresses.

import type { SearchObservation, SearchRequest, SearchMode, PipelineStage, PipelineStageStatus } from '../types';
import { searchWayback, searchGitHubCode, searchCommonCrawl, getAvailableAdapters } from './adapters';
import { resolveEntities, normalizeAndRank, computeConfidence, type ResolvedEntityResult, type ConfidenceSummary } from './agents';

// Pipeline stage definitions — mirrors search-plan.ts logic
export function buildPipeline(mode: SearchMode): { id: string; name: string; agentId: string; capabilities: string[] }[] {
  const base = [
    { id: 'planning', name: 'Planning', agentId: 'web-discovery', capabilities: ['query-expansion'] },
  ];

  switch (mode) {
    case 'text':
      return [
        ...base,
        { id: 'github-search', name: 'GitHub Code Search', agentId: 'web-discovery', capabilities: ['code-search', 'repo-search'] },
        { id: 'archive', name: 'Archives (Wayback)', agentId: 'archive', capabilities: ['wayback'] },
        { id: 'common-crawl', name: 'Common Crawl', agentId: 'archive', capabilities: ['common-crawl'] },
        { id: 'metadata', name: 'Metadata Extraction', agentId: 'metadata', capabilities: ['exif', 'hashing'] },
        { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', capabilities: ['entities'] },
        { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', capabilities: ['corroboration'] },
      ];
    case 'image':
      return [
        ...base,
        { id: 'archive', name: 'Archives (Wayback)', agentId: 'archive', capabilities: ['wayback'] },
        { id: 'common-crawl', name: 'Common Crawl', agentId: 'archive', capabilities: ['common-crawl'] },
        { id: 'github-search', name: 'GitHub Image Search', agentId: 'reverse-image', capabilities: ['code-search'] },
        { id: 'metadata', name: 'Metadata Extraction', agentId: 'metadata', capabilities: ['exif', 'ocr'] },
        { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', capabilities: ['entities'] },
        { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', capabilities: ['corroboration'] },
      ];
    case 'archive':
      return [
        ...base,
        { id: 'archive', name: 'Archive Search (Wayback)', agentId: 'archive', capabilities: ['wayback', 'common-crawl'] },
        { id: 'common-crawl', name: 'Common Crawl', agentId: 'archive', capabilities: ['common-crawl'] },
        { id: 'github-search', name: 'GitHub Code Search', agentId: 'web-discovery', capabilities: ['code-search'] },
        { id: 'metadata', name: 'Metadata', agentId: 'metadata', capabilities: ['exif'] },
        { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', capabilities: ['entities'] },
        { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', capabilities: ['corroboration'] },
      ];
    case 'document':
      return [
        ...base,
        { id: 'github-search', name: 'GitHub Code Search', agentId: 'document', capabilities: ['code-search', 'pdf'] },
        { id: 'archive', name: 'Archives (Wayback)', agentId: 'archive', capabilities: ['wayback'] },
        { id: 'common-crawl', name: 'Common Crawl', agentId: 'archive', capabilities: ['common-crawl'] },
        { id: 'metadata', name: 'Metadata', agentId: 'metadata', capabilities: ['hashing', 'ocr'] },
        { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', capabilities: ['entities'] },
        { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', capabilities: ['corroboration'] },
      ];
    case 'face':
      return [
        ...base,
        { id: 'archive', name: 'Archives (Wayback)', agentId: 'archive', capabilities: ['wayback'] },
        { id: 'github-search', name: 'GitHub Search', agentId: 'face-search', capabilities: ['code-search'] },
        { id: 'metadata', name: 'Metadata', agentId: 'metadata', capabilities: ['ocr', 'filename'] },
        { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', capabilities: ['entities'] },
        { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', capabilities: ['corroboration'] },
      ];
    case 'video':
      return [
        ...base,
        { id: 'archive', name: 'Archives (Wayback)', agentId: 'archive', capabilities: ['wayback'] },
        { id: 'github-search', name: 'GitHub Search', agentId: 'video', capabilities: ['code-search'] },
        { id: 'metadata', name: 'Metadata', agentId: 'metadata', capabilities: ['exif'] },
        { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', capabilities: ['entities'] },
        { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', capabilities: ['corroboration'] },
      ];
    case 'metadata':
      return [
        ...base,
        { id: 'metadata', name: 'Metadata Extraction', agentId: 'metadata', capabilities: ['exif', 'ocr', 'hashing'] },
        { id: 'github-search', name: 'GitHub Search', agentId: 'web-discovery', capabilities: ['code-search'] },
        { id: 'archive', name: 'Archives (Wayback)', agentId: 'archive', capabilities: ['wayback'] },
        { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', capabilities: ['entities'] },
        { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', capabilities: ['corroboration'] },
      ];
  }
}

// Event types for streaming pipeline updates
export interface PipelineEvent {
  type: 'stage-start' | 'stage-complete' | 'stage-error' | 'results' | 'entities' | 'confidence' | 'done';
  stageId?: string;
  stageName?: string;
  status?: PipelineStageStatus;
  resultCount?: number;
  elapsedMs?: number;
  error?: string;
  observations?: SearchObservation[];
  entities?: ResolvedEntityResult[];
  confidence?: ConfidenceSummary;
}

// Check which adapters are available
function isStageConfigured(stageId: string): boolean {
  const adapters = getAvailableAdapters();
  switch (stageId) {
    case 'archive': return adapters.find((a) => a.id === 'wayback')?.available ?? false;
    case 'common-crawl': return adapters.find((a) => a.id === 'common-crawl')?.available ?? false;
    case 'github-search': return adapters.find((a) => a.id === 'github')?.available ?? false;
    case 'planning': return true;
    case 'metadata': return true;
    case 'entity-resolution': return true;
    case 'corroboration': return true;
    default: return false;
  }
}

// Run the search pipeline and emit events via callback
export async function runPipeline(
  request: SearchRequest,
  onEvent: (event: PipelineEvent) => void,
): Promise<void> {
  const stages = buildPipeline(request.mode);
  const allObservations: SearchObservation[] = [];

  // Stage 1: Planning (instant)
  onEvent({ type: 'stage-start', stageId: 'planning', stageName: 'Planning', status: 'running' });
  await new Promise((r) => setTimeout(r, 200));
  onEvent({ type: 'stage-complete', stageId: 'planning', stageName: 'Planning', status: 'completed', resultCount: stages.length, elapsedMs: 200 });

  // Run search stages in parallel where possible
  const searchStages = stages.filter((s) => ['github-search', 'archive', 'common-crawl'].includes(s.id));
  const processingStages = stages.filter((s) => ['metadata', 'entity-resolution', 'corroboration'].includes(s.id));

  // Emit stage-start for all search stages
  for (const stage of searchStages) {
    const configured = isStageConfigured(stage.id);
    onEvent({
      type: 'stage-start',
      stageId: stage.id,
      stageName: stage.name,
      status: configured ? 'running' : 'not-configured',
    });
  }

  // Run all search adapters in parallel
  const searchPromises = searchStages.map(async (stage) => {
    if (!isStageConfigured(stage.id)) {
      return { stage, observations: [] as SearchObservation[], elapsedMs: 0, error: 'Not configured' };
    }
    const start = Date.now();
    try {
      let observations: SearchObservation[] = [];
      switch (stage.id) {
        case 'github-search':
          observations = await searchGitHubCode(request);
          break;
        case 'archive':
          observations = await searchWayback(request);
          break;
        case 'common-crawl':
          observations = await searchCommonCrawl(request);
          break;
      }
      const elapsedMs = Date.now() - start;
      return { stage, observations, elapsedMs, error: undefined as string | undefined };
    } catch (err) {
      const elapsedMs = Date.now() - start;
      return { stage, observations: [] as SearchObservation[], elapsedMs, error: String(err) };
    }
  });

  const searchResults = await Promise.all(searchPromises);

  // Emit stage-complete events
  for (const result of searchResults) {
    if (result.error && result.observations.length === 0 && result.stage.id !== 'planning') {
      // Check if it was "not configured"
      if (!isStageConfigured(result.stage.id)) {
        onEvent({
          type: 'stage-error',
          stageId: result.stage.id,
          stageName: result.stage.name,
          status: 'not-configured',
          error: 'Not configured',
        });
      } else {
        onEvent({
          type: 'stage-error',
          stageId: result.stage.id,
          stageName: result.stage.name,
          status: 'failed',
          error: result.error,
          elapsedMs: result.elapsedMs,
        });
      }
    } else {
      onEvent({
        type: 'stage-complete',
        stageId: result.stage.id,
        stageName: result.stage.name,
        status: 'completed',
        resultCount: result.observations.length,
        elapsedMs: result.elapsedMs,
      });
      allObservations.push(...result.observations);
    }
  }

  // Send intermediate results
  if (allObservations.length > 0) {
    onEvent({ type: 'results', observations: allObservations });
  }

  // Stage: Metadata (post-processing)
  const metaStart = Date.now();
  onEvent({ type: 'stage-start', stageId: 'metadata', stageName: 'Metadata Extraction', status: 'running' });
  // Metadata extraction is handled by the adapter layer — mark as complete
  await new Promise((r) => setTimeout(r, 300));
  onEvent({
    type: 'stage-complete',
    stageId: 'metadata',
    stageName: 'Metadata Extraction',
    status: 'completed',
    resultCount: allObservations.length,
    elapsedMs: Date.now() - metaStart,
  });

  // Stage: Entity Resolution
  const entityStart = Date.now();
  onEvent({ type: 'stage-start', stageId: 'entity-resolution', stageName: 'Entity Resolution', status: 'running' });
  const entities = resolveEntities(allObservations);
  await new Promise((r) => setTimeout(r, 200));
  onEvent({
    type: 'stage-complete',
    stageId: 'entity-resolution',
    stageName: 'Entity Resolution',
    status: 'completed',
    resultCount: entities.length,
    elapsedMs: Date.now() - entityStart,
  });
  onEvent({ type: 'entities', entities });

  // Stage: Corroboration & Ranking
  const corrobStart = Date.now();
  onEvent({ type: 'stage-start', stageId: 'corroboration', stageName: 'Corroboration', status: 'running' });
  const ranked = normalizeAndRank(allObservations);
  const confidence = computeConfidence(ranked, entities);
  await new Promise((r) => setTimeout(r, 200));
  onEvent({
    type: 'stage-complete',
    stageId: 'corroboration',
    stageName: 'Corroboration',
    status: 'completed',
    resultCount: ranked.length,
    elapsedMs: Date.now() - corrobStart,
  });

  // Send final ranked results
  onEvent({ type: 'results', observations: ranked });
  onEvent({ type: 'confidence', confidence });
  onEvent({ type: 'done' });
}
