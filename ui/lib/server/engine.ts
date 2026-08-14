// Server-side search engine — orchestrates adapters and agents through a pipeline.
// Emits SSE-style events as each stage progresses.

import type { SearchObservation, SearchRequest, SearchMode, PipelineStageStatus } from '../types';
import {
  searchWayback, searchGitHubCode, searchCommonCrawl,
  searchDuckDuckGo, searchWikipedia, searchHackerNews, searchReddit, searchBrave,
  getAvailableAdapters,
} from './adapters';
import { resolveEntities, normalizeAndRank, computeConfidence, type ResolvedEntityResult, type ConfidenceSummary } from './agents';

const SEARCH_STAGE_IDS = ['github-search', 'archive', 'common-crawl', 'ddg', 'wikipedia', 'hackernews', 'reddit', 'brave-search'];
const POST_STAGE_IDS = ['metadata', 'entity-resolution', 'corroboration'];

export function buildPipeline(mode: SearchMode): { id: string; name: string; agentId: string; capabilities: string[] }[] {
  const base = [{ id: 'planning', name: 'Planning', agentId: 'web-discovery', capabilities: ['query-expansion'] }];
  const searchStages = [
    { id: 'github-search', name: 'GitHub', agentId: 'web-discovery', capabilities: ['code-search', 'repo-search'] },
    { id: 'ddg', name: 'DuckDuckGo', agentId: 'web-discovery', capabilities: ['instant-answer', 'related-topics'] },
    { id: 'wikipedia', name: 'Wikipedia', agentId: 'web-discovery', capabilities: ['encyclopedia', 'knowledge'] },
    { id: 'hackernews', name: 'Hacker News', agentId: 'web-discovery', capabilities: ['tech-community', 'discussions'] },
    { id: 'reddit', name: 'Reddit', agentId: 'web-discovery', capabilities: ['community', 'discussions'] },
    { id: 'archive', name: 'Wayback', agentId: 'archive', capabilities: ['wayback'] },
    { id: 'common-crawl', name: 'Common Crawl', agentId: 'archive', capabilities: ['common-crawl'] },
  ];
  const postStages = [
    { id: 'metadata', name: 'Metadata', agentId: 'metadata', capabilities: ['headers', 'content-type'] },
    { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', capabilities: ['entities', 'cross-source'] },
    { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', capabilities: ['corroboration', 'ranking'] },
  ];

  switch (mode) {
    case 'text': case 'document': return [...base, ...searchStages, ...postStages];
    case 'archive': return [...base,
      { id: 'archive', name: 'Wayback', agentId: 'archive', capabilities: ['wayback'] },
      { id: 'common-crawl', name: 'Common Crawl', agentId: 'archive', capabilities: ['common-crawl'] },
      { id: 'github-search', name: 'GitHub', agentId: 'web-discovery', capabilities: ['code-search'] },
      { id: 'ddg', name: 'DuckDuckGo', agentId: 'web-discovery', capabilities: ['instant-answer'] },
      { id: 'wikipedia', name: 'Wikipedia', agentId: 'web-discovery', capabilities: ['encyclopedia'] },
      ...postStages];
    case 'image': case 'face': case 'video': return [...base,
      { id: 'archive', name: 'Wayback', agentId: 'archive', capabilities: ['wayback'] },
      { id: 'common-crawl', name: 'Common Crawl', agentId: 'archive', capabilities: ['common-crawl'] },
      { id: 'github-search', name: 'GitHub', agentId: 'reverse-image', capabilities: ['code-search'] },
      { id: 'ddg', name: 'DuckDuckGo', agentId: 'web-discovery', capabilities: ['instant-answer'] },
      { id: 'wikipedia', name: 'Wikipedia', agentId: 'web-discovery', capabilities: ['encyclopedia'] },
      { id: 'hackernews', name: 'Hacker News', agentId: 'web-discovery', capabilities: ['tech-community'] },
      { id: 'reddit', name: 'Reddit', agentId: 'web-discovery', capabilities: ['community'] },
      ...postStages];
    case 'metadata': return [...base,
      { id: 'metadata', name: 'Metadata Extraction', agentId: 'metadata', capabilities: ['exif', 'ocr', 'hashing'] },
      { id: 'github-search', name: 'GitHub', agentId: 'web-discovery', capabilities: ['code-search'] },
      { id: 'ddg', name: 'DuckDuckGo', agentId: 'web-discovery', capabilities: ['instant-answer'] },
      { id: 'wikipedia', name: 'Wikipedia', agentId: 'web-discovery', capabilities: ['encyclopedia'] },
      { id: 'archive', name: 'Wayback', agentId: 'archive', capabilities: ['wayback'] },
      { id: 'entity-resolution', name: 'Entity Resolution', agentId: 'entity-resolution', capabilities: ['entities'] },
      { id: 'corroboration', name: 'Corroboration', agentId: 'cross-corroboration', capabilities: ['corroboration'] }];
  }
}

export interface PipelineEvent {
  type: 'stage-start' | 'stage-complete' | 'stage-error' | 'results' | 'entities' | 'confidence' | 'done';
  stageId?: string; stageName?: string; status?: PipelineStageStatus;
  resultCount?: number; elapsedMs?: number; error?: string;
  observations?: SearchObservation[]; entities?: ResolvedEntityResult[]; confidence?: ConfidenceSummary;
}

function isStageConfigured(stageId: string): boolean {
  const adapters = getAvailableAdapters();
  switch (stageId) {
    case 'archive': return adapters.find((a) => a.id === 'wayback')?.available ?? false;
    case 'common-crawl': return adapters.find((a) => a.id === 'common-crawl')?.available ?? false;
    case 'github-search': return adapters.find((a) => a.id === 'github')?.available ?? false;
    case 'ddg': return adapters.find((a) => a.id === 'duckduckgo')?.available ?? false;
    case 'wikipedia': return adapters.find((a) => a.id === 'wikipedia')?.available ?? false;
    case 'hackernews': return adapters.find((a) => a.id === 'hackernews')?.available ?? false;
    case 'reddit': return adapters.find((a) => a.id === 'reddit')?.available ?? false;
    case 'brave-search': return adapters.find((a) => a.id === 'brave-search')?.available ?? false;
    default: return true; // planning, metadata, entity-resolution, corroboration always available
  }
}

async function runAdapter(stageId: string, request: SearchRequest): Promise<SearchObservation[]> {
  switch (stageId) {
    case 'github-search': return searchGitHubCode(request);
    case 'archive': return searchWayback(request);
    case 'common-crawl': return searchCommonCrawl(request);
    case 'ddg': return searchDuckDuckGo(request);
    case 'wikipedia': return searchWikipedia(request);
    case 'hackernews': return searchHackerNews(request);
    case 'reddit': return searchReddit(request);
    case 'brave-search': return searchBrave(request);
    default: return [];
  }
}

export async function runPipeline(request: SearchRequest, onEvent: (event: PipelineEvent) => void): Promise<void> {
  const stages = buildPipeline(request.mode);
  const allObservations: SearchObservation[] = [];

  onEvent({ type: 'stage-start', stageId: 'planning', stageName: 'Planning', status: 'running' });
  await new Promise((r) => setTimeout(r, 200));
  onEvent({ type: 'stage-complete', stageId: 'planning', stageName: 'Planning', status: 'completed', resultCount: stages.length - 1, elapsedMs: 200 });

  const searchStages = stages.filter((s) => SEARCH_STAGE_IDS.includes(s.id));
  const postStages = stages.filter((s) => POST_STAGE_IDS.includes(s.id));

  for (const stage of searchStages) {
    onEvent({ type: 'stage-start', stageId: stage.id, stageName: stage.name, status: isStageConfigured(stage.id) ? 'running' : 'not-configured' });
  }

  const searchPromises = searchStages.map(async (stage) => {
    if (!isStageConfigured(stage.id)) return { stage, observations: [] as SearchObservation[], elapsedMs: 0, error: 'Not configured' };
    const start = Date.now();
    try {
      const observations = await runAdapter(stage.id, request);
      return { stage, observations, elapsedMs: Date.now() - start, error: undefined as string | undefined };
    } catch (err) {
      return { stage, observations: [] as SearchObservation[], elapsedMs: Date.now() - start, error: String(err) };
    }
  });

  const searchResults = await Promise.all(searchPromises);

  for (const result of searchResults) {
    if (result.error && result.observations.length === 0) {
      if (!isStageConfigured(result.stage.id)) {
        onEvent({ type: 'stage-error', stageId: result.stage.id, stageName: result.stage.name, status: 'not-configured', error: 'Not configured' });
      } else {
        onEvent({ type: 'stage-error', stageId: result.stage.id, stageName: result.stage.name, status: 'failed', error: result.error, elapsedMs: result.elapsedMs });
      }
    } else {
      onEvent({ type: 'stage-complete', stageId: result.stage.id, stageName: result.stage.name, status: 'completed', resultCount: result.observations.length, elapsedMs: result.elapsedMs });
      allObservations.push(...result.observations);
    }
  }

  if (allObservations.length > 0) onEvent({ type: 'results', observations: allObservations });

  for (const stage of postStages) {
    onEvent({ type: 'stage-start', stageId: stage.id, stageName: stage.name, status: 'running' });
    const start = Date.now();
    switch (stage.id) {
      case 'metadata':
        await new Promise((r) => setTimeout(r, 200));
        onEvent({ type: 'stage-complete', stageId: stage.id, stageName: stage.name, status: 'completed', resultCount: allObservations.length, elapsedMs: Date.now() - start });
        break;
      case 'entity-resolution': {
        const entities = resolveEntities(allObservations);
        await new Promise((r) => setTimeout(r, 200));
        onEvent({ type: 'stage-complete', stageId: stage.id, stageName: stage.name, status: 'completed', resultCount: entities.length, elapsedMs: Date.now() - start });
        onEvent({ type: 'entities', entities });
        break;
      }
      case 'corroboration': {
        const ranked = normalizeAndRank(allObservations);
        const confidence = computeConfidence(ranked, resolveEntities(allObservations));
        await new Promise((r) => setTimeout(r, 200));
        onEvent({ type: 'stage-complete', stageId: stage.id, stageName: stage.name, status: 'completed', resultCount: ranked.length, elapsedMs: Date.now() - start });
        onEvent({ type: 'results', observations: ranked });
        onEvent({ type: 'confidence', confidence });
        break;
      }
    }
  }

  onEvent({ type: 'done' });
}
