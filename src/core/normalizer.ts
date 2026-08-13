import type { SearchObservation } from './types.js';

export function normalizeObservations(items: SearchObservation[]): SearchObservation[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.mediaUrl ?? item.sourceUrl ?? `${item.provider}:${item.providerResultId ?? item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function rankObservation(item: SearchObservation): number {
  const s = item.signals ?? {};
  const values = [s.faceSimilarity, s.visualSimilarity, s.textRelevance, s.sourceQuality, s.temporalConsistency, s.corroboration].filter((v): v is number => typeof v === 'number');
  if (!values.length) return item.providerScore ?? 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
