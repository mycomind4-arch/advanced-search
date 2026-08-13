import type { SearchMode, SearchRequest } from './types.js';

export interface SearchPlanStep {
  mode: SearchMode;
  reason: string;
  depth: number;
}

export function buildPlan(request: SearchRequest): SearchPlanStep[] {
  const steps: SearchPlanStep[] = [{ mode: request.mode, reason: 'primary query', depth: 0 }];
  if (request.mode === 'image') {
    steps.push({ mode: 'metadata', reason: 'extract source metadata and clues', depth: 1 });
    steps.push({ mode: 'archive', reason: 'look for historical copies and provenance', depth: 1 });
  }
  if (request.mode === 'face') {
    steps.push({ mode: 'image', reason: 'expand from face candidates to visually related images', depth: 1 });
    steps.push({ mode: 'metadata', reason: 'extract captions, names, dates, and locations', depth: 1 });
  }
  if (request.mode === 'video') {
    steps.push({ mode: 'face', reason: 'search detected faces in keyframes', depth: 1 });
    steps.push({ mode: 'image', reason: 'search representative keyframes visually', depth: 1 });
  }
  return steps.filter((step) => step.depth <= (request.budget?.maxDepth ?? 2));
}
