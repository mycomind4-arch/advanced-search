import { describe, it, expect } from 'vitest';
import { AdapterRegistry } from '../src/core/registry.js';
import { SearchOrchestrator } from '../src/core/orchestrator.js';
import type { SearchObservation, SearchRequest, SearchAdapter, SearchMode } from '../src/core/types.js';

// -- Mock adapter for orchestrator tests --
class MockAdapter implements SearchAdapter {
  constructor(
    readonly id: string,
    readonly modes: SearchMode[],
    private available: boolean,
    private results: SearchObservation[] = [],
  ) {}
  async isAvailable(): Promise<boolean> { return this.available; }
  async search(_request: SearchRequest): Promise<SearchObservation[]> { return this.results; }
}

describe('AdapterRegistry', () => {
  it('lists adapters for a given mode', () => {
    const reg = new AdapterRegistry();
    reg.registerMany([
      new MockAdapter('a', ['text', 'image'], true),
      new MockAdapter('b', ['text'], true),
      new MockAdapter('c', ['image'], true),
    ]);
    expect(reg.list('text').map((a) => a.id)).toEqual(['a', 'b']);
    expect(reg.list('image').map((a) => a.id)).toEqual(['a', 'c']);
  });

  it('finds adapter by id', () => {
    const reg = new AdapterRegistry();
    reg.register(new MockAdapter('github', ['text'], true));
    expect(reg.get('github')).toBeDefined();
    expect(reg.get('nonexistent')).toBeUndefined();
  });

  it('throws on duplicate registration', () => {
    const reg = new AdapterRegistry();
    reg.register(new MockAdapter('dup', ['text'], true));
    expect(() => reg.register(new MockAdapter('dup', ['text'], true))).toThrow();
  });
});

describe('SearchOrchestrator', () => {
  it('runs available adapters and merges results', async () => {
    const makeObs = (id: string, provider: string): SearchObservation => ({
      id, provider, discoveredAt: new Date().toISOString(), queryJobId: 'q1',
    });
    const reg = new AdapterRegistry();
    reg.registerMany([
      new MockAdapter('a', ['text'], true, [makeObs('1', 'a'), makeObs('2', 'a')]),
      new MockAdapter('b', ['text'], true, [makeObs('3', 'b')]),
      new MockAdapter('c', ['text'], false), // unavailable
    ]);
    const orch = new SearchOrchestrator(reg);
    const results = await orch.execute({ id: 'q1', mode: 'text', query: 'test' });
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.id).sort()).toEqual(['1', '2', '3']);
  });

  it('deduplicates results by sourceUrl', async () => {
    const makeObs = (id: string, url: string): SearchObservation => ({
      id, provider: 'test', sourceUrl: url, discoveredAt: new Date().toISOString(), queryJobId: 'q1',
    });
    const reg = new AdapterRegistry();
    reg.registerMany([
      new MockAdapter('a', ['text'], true, [makeObs('1', 'https://example.com/page'), makeObs('2', 'https://example.com/page')]),
      new MockAdapter('b', ['text'], true, [makeObs('3', 'https://example.com/other')]),
    ]);
    const orch = new SearchOrchestrator(reg);
    const results = await orch.execute({ id: 'q1', mode: 'text', query: 'test' });
    expect(results).toHaveLength(2);
  });

  it('sorts results by rank score descending', async () => {
    const makeObs = (id: string, score: number): SearchObservation => ({
      id, provider: 'test', discoveredAt: new Date().toISOString(), queryJobId: 'q1',
      signals: { textRelevance: score },
    });
    const reg = new AdapterRegistry();
    reg.register(new MockAdapter('a', ['text'], true, [makeObs('low', 0.3), makeObs('high', 0.9), makeObs('mid', 0.5)]));
    const orch = new SearchOrchestrator(reg);
    const results = await orch.execute({ id: 'q1', mode: 'text', query: 'test' });
    expect(results[0].id).toBe('high');
    expect(results[1].id).toBe('mid');
    expect(results[2].id).toBe('low');
  });

  it('handles adapter failures gracefully', async () => {
    const failingAdapter: SearchAdapter = {
      id: 'fail',
      modes: ['text'],
      isAvailable: async () => true,
      search: async () => { throw new Error('API down'); },
    };
    const goodAdapter = new MockAdapter('good', ['text'], true, [
      { id: '1', provider: 'good', discoveredAt: new Date().toISOString(), queryJobId: 'q1' },
    ]);
    const reg = new AdapterRegistry();
    reg.registerMany([failingAdapter, goodAdapter]);
    const orch = new SearchOrchestrator(reg);
    const results = await orch.execute({ id: 'q1', mode: 'text', query: 'test' });
    // The failing adapter should not crash the orchestrator (Promise.allSettled)
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.find((r) => r.id === '1')).toBeDefined();
  });
});
