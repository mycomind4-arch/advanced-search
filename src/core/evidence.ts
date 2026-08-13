import type { SearchObservation } from './types.js';

export interface EvidenceCluster {
  key: string;
  observations: SearchObservation[];
  providerCount: number;
  domainCount: number;
  score: number;
}

export function clusterEvidence(items: SearchObservation[]): EvidenceCluster[] {
  const groups = new Map<string, SearchObservation[]>();
  for (const item of items) {
    const key = item.mediaUrl ?? item.sourceUrl ?? `${item.provider}:${item.id}`;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return [...groups.entries()].map(([key, observations]) => {
    const providers = new Set(observations.map((x) => x.provider));
    const domains = new Set(observations.map((x) => {
      try { return x.sourceUrl ? new URL(x.sourceUrl).hostname : x.provider; } catch { return x.provider; }
    }));
    return { key, observations, providerCount: providers.size, domainCount: domains.size, score: Math.min(1, (providers.size * 0.15) + (domains.size * 0.05) + 0.5) };
  }).sort((a, b) => b.score - a.score);
}
