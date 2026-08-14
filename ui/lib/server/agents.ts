// Server-side agent implementations — real logic for processing search results.
// These run after the adapters return observations and perform post-processing:
// entity resolution, corroboration analysis, provenance tracking, deduplication.

import type { SearchObservation, ExtractedEntity, MatchSignals } from '../types';

// -- Entity Resolution Agent --
// Groups extracted entities across observations, resolves aliases, computes confidence.
export interface ResolvedEntityResult {
  type: ExtractedEntity['type'];
  name: string;
  aliases: string[];
  confidence: number;
  sources: string[];
  appearances: string[];
  count: number;
}

export function resolveEntities(observations: SearchObservation[]): ResolvedEntityResult[] {
  const entityMap = new Map<string, { type: ExtractedEntity['type']; value: string; confidence: number; sources: Set<string>; appearances: Set<string>; count: number }>();

  for (const obs of observations) {
    if (!obs.entities) continue;
    for (const ent of obs.entities) {
      if (!ent.value || ent.value.length < 2) continue;
      // Normalize: lowercase, trim
      const key = `${ent.type}:${ent.value.toLowerCase().trim()}`;
      const existing = entityMap.get(key);
      if (existing) {
        existing.confidence = Math.max(existing.confidence, ent.confidence ?? 0.5);
        existing.sources.add(obs.provider);
        existing.appearances.add(obs.id);
        existing.count++;
      } else {
        entityMap.set(key, {
          type: ent.type,
          value: ent.value,
          confidence: ent.confidence ?? 0.5,
          sources: new Set([obs.provider]),
          appearances: new Set([obs.id]),
          count: 1,
        });
      }
    }
  }

  // Also extract entities from titles and snippets
  for (const obs of observations) {
    const text = `${obs.title ?? ''} ${obs.snippet ?? ''}`;
    // Extract URLs as locations
    const urlMatches = text.match(/https?:\/\/[^\s]+/g);
    if (urlMatches) {
      for (const url of urlMatches) {
        try {
          const hostname = new URL(url).hostname;
          const key = `location:${hostname}`;
          if (!entityMap.has(key)) {
            entityMap.set(key, {
              type: 'location',
              value: hostname,
              confidence: 0.5,
              sources: new Set([obs.provider]),
              appearances: new Set([obs.id]),
              count: 1,
            });
          }
        } catch { /* skip */ }
      }
    }

    // Extract dates from text
    const dateMatches = text.match(/\b(20\d{2}-\d{2}-\d{2}|\d{4}\/\d{2}\/\d{2})\b/g);
    if (dateMatches) {
      for (const date of dateMatches.slice(0, 1)) {
        const key = `date:${date}`;
        if (!entityMap.has(key)) {
          entityMap.set(key, {
            type: 'date',
            value: date,
            confidence: 0.6,
            sources: new Set([obs.provider]),
            appearances: new Set([obs.id]),
            count: 1,
          });
        }
      }
    }

    // Extract repo-style identifiers (org/repo)
    const repoMatches = text.match(/\b[\w-]+\/[\w-]+\b/g);
    if (repoMatches) {
      for (const repo of repoMatches.slice(0, 2)) {
        if (repo.includes('.') || repo.length < 3) continue;
        const key = `organization:${repo}`;
        if (!entityMap.has(key)) {
          entityMap.set(key, {
            type: 'organization',
            value: repo,
            confidence: 0.6,
            sources: new Set([obs.provider]),
            appearances: new Set([obs.id]),
            count: 1,
          });
        }
      }
    }
  }

  // Convert to results, sort by count and confidence
  return [...entityMap.entries()]
    .map(([_, data]) => ({
      type: data.type,
      name: data.value,
      aliases: [], // could add alias resolution logic
      confidence: Math.min(1, data.confidence + data.count * 0.05),
      sources: [...data.sources],
      appearances: [...data.appearances],
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count || b.confidence - a.confidence)
    .slice(0, 30);
}

// -- Cross-Corroboration Agent --
// Analyzes results across providers to compute corroboration scores.
export function analyzeCorroboration(observations: SearchObservation[]): SearchObservation[] {
  // Group by source URL (ignoring query params for similarity)
  const urlGroups = new Map<string, SearchObservation[]>();
  for (const obs of observations) {
    if (!obs.sourceUrl) continue;
    try {
      const url = new URL(obs.sourceUrl);
      const key = `${url.hostname}${url.pathname}`;
      const group = urlGroups.get(key) ?? [];
      group.push(obs);
      urlGroups.set(key, group);
    } catch {
      const group = urlGroups.get(obs.sourceUrl) ?? [];
      group.push(obs);
      urlGroups.set(obs.sourceUrl, group);
    }
  }

  // Provider diversity
  const providerGroups = new Map<string, SearchObservation[]>();
  for (const obs of observations) {
    const group = providerGroups.get(obs.provider) ?? [];
    group.push(obs);
    providerGroups.set(obs.provider, group);
  }

  const providerCount = providerGroups.size;

  return observations.map((obs) => {
    const signals: MatchSignals = obs.signals ?? {};
    // Find how many distinct providers have results for the same domain
    let domainProviders = new Set<string>();
    if (obs.sourceUrl) {
      try {
        const hostname = new URL(obs.sourceUrl).hostname;
        for (const other of observations) {
          if (other.sourceUrl) {
            try {
              const otherHost = new URL(other.sourceUrl).hostname;
              if (otherHost === hostname) domainProviders.add(other.provider);
            } catch { /* skip */ }
          }
        }
      } catch { /* skip */ }
    }

    const corroboration = Math.min(1, domainProviders.size * 0.2 + (providerCount > 1 ? 0.1 : 0));
    return {
      ...obs,
      signals: { ...signals, corroboration },
    };
  });
}

// -- Source Provenance Agent --
// Deduplicates observations and tracks source lineage.
export function deduplicateAndProvenance(observations: SearchObservation[]): SearchObservation[] {
  const seen = new Set<string>();
  const deduped: SearchObservation[] = [];

  for (const obs of observations) {
    const key = obs.sourceUrl ?? obs.mediaUrl ?? `${obs.provider}:${obs.id}`;
    if (seen.has(key)) {
      // Add provenance link to the first occurrence
      const first = deduped.find((d) => (d.sourceUrl ?? d.mediaUrl ?? `${d.provider}:${d.id}`) === key);
      if (first && !first.provenance) {
        first.provenance = [{ relation: 'duplicate', targetObservationId: obs.id }];
      }
      continue;
    }
    seen.add(key);
    deduped.push(obs);
  }

  return deduped;
}

// -- Normalization & Ranking --
export function rankObservation(item: SearchObservation): number {
  const s = item.signals ?? {};
  const values = [s.faceSimilarity, s.visualSimilarity, s.textRelevance, s.sourceQuality, s.temporalConsistency, s.corroboration]
    .filter((v): v is number => typeof v === 'number');
  if (!values.length) return item.providerScore ?? 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function normalizeAndRank(observations: SearchObservation[]): SearchObservation[] {
  return deduplicateAndProvenance(analyzeCorroboration(observations))
    .sort((a, b) => rankObservation(b) - rankObservation(a));
}

// -- Confidence Summary --
export interface ConfidenceSummary {
  overall: number;
  high: number;
  medium: number;
  low: number;
}

export function computeConfidence(observations: SearchObservation[], entities: ResolvedEntityResult[]): ConfidenceSummary {
  if (observations.length === 0) return { overall: 0, high: 0, medium: 0, low: 0 };

  const scores = observations.map(rankObservation);
  const overall = scores.reduce((a, b) => a + b, 0) / scores.length;
  const high = scores.filter((s) => s >= 0.7).length;
  const medium = scores.filter((s) => s >= 0.4 && s < 0.7).length;
  const low = scores.filter((s) => s < 0.4).length;

  // Boost overall confidence if we have entity corroboration
  const entityBoost = entities.length > 0 ? Math.min(0.1, entities.length * 0.01) : 0;

  return {
    overall: Math.min(1, overall + entityBoost),
    high,
    medium,
    low,
  };
}
