import { describe, it, expect } from 'vitest';
import type { SearchObservation } from '../src/core/types.js';
import { normalizeObservations, rankObservation } from '../src/core/normalizer.js';

describe('normalizer', () => {
  const makeObs = (overrides: Partial<SearchObservation> = {}): SearchObservation => ({
    id: 'test-1',
    provider: 'test',
    discoveredAt: new Date().toISOString(),
    queryJobId: 'q1',
    ...overrides,
  });

  describe('normalizeObservations', () => {
    it('removes duplicates by sourceUrl', () => {
      const items = [
        makeObs({ id: 'a', sourceUrl: 'https://example.com/page' }),
        makeObs({ id: 'b', sourceUrl: 'https://example.com/page' }),
        makeObs({ id: 'c', sourceUrl: 'https://example.com/other' }),
      ];
      const result = normalizeObservations(items);
      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('a');
      expect(result[1]?.id).toBe('c');
    });

    it('removes duplicates by mediaUrl when no sourceUrl', () => {
      const items = [
        makeObs({ id: 'a', mediaUrl: 'https://img.com/1.jpg' }),
        makeObs({ id: 'b', mediaUrl: 'https://img.com/1.jpg' }),
      ];
      const result = normalizeObservations(items);
      expect(result).toHaveLength(1);
    });

    it('falls back to provider:id when no URLs', () => {
      const items = [
        makeObs({ id: 'x', provider: 'github', providerResultId: '123' }),
        makeObs({ id: 'y', provider: 'github', providerResultId: '123' }),
        makeObs({ id: 'z', provider: 'github', providerResultId: '456' }),
      ];
      const result = normalizeObservations(items);
      expect(result).toHaveLength(2);
    });

    it('returns empty array for empty input', () => {
      expect(normalizeObservations([])).toEqual([]);
    });
  });

  describe('rankObservation', () => {
    it('averages all signal values', () => {
      const obs = makeObs({ signals: { textRelevance: 0.8, sourceQuality: 0.6, temporalConsistency: 0.4 } });
      const score = rankObservation(obs);
      expect(score).toBeCloseTo(0.6, 5);
    });

    it('returns providerScore when no signals', () => {
      const obs = makeObs({ providerScore: 0.7 });
      expect(rankObservation(obs)).toBe(0.7);
    });

    it('returns 0 when no signals and no providerScore', () => {
      const obs = makeObs();
      expect(rankObservation(obs)).toBe(0);
    });

    it('ignores undefined signal values', () => {
      const obs = makeObs({ signals: { textRelevance: 0.9, faceSimilarity: undefined, sourceQuality: 0.3 } });
      const score = rankObservation(obs);
      expect(score).toBeCloseTo(0.6, 5);
    });
  });
});
