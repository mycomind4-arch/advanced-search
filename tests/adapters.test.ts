import { describe, it, expect } from 'vitest';
import { builtInAdapters, createComputerLegacyAdapters } from '../src/adapters/builtins.js';

describe('builtInAdapters registry', () => {
  it('includes all 11 built-in adapters', () => {
    expect(builtInAdapters).toHaveLength(11);
  });

  it('has unique adapter IDs', () => {
    const ids = builtInAdapters.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes GitHub adapter', () => {
    const gh = builtInAdapters.find((a) => a.id === 'github');
    expect(gh).toBeDefined();
    expect(gh!.modes).toContain('text');
    expect(gh!.modes).toContain('metadata');
  });

  it('includes all free adapters', () => {
    const freeIds = ['duckduckgo', 'wikipedia', 'hackernews', 'reddit', 'wayback', 'common-crawl'];
    for (const id of freeIds) {
      expect(builtInAdapters.find((a) => a.id === id)).toBeDefined();
    }
  });

  it('includes credential-gated adapters as stubs', () => {
    const gated = ['brave-search', 'tineye', 'google-vision', 'insightface'];
    for (const id of gated) {
      const adapter = builtInAdapters.find((a) => a.id === id);
      expect(adapter).toBeDefined();
    }
  });

  it('free adapters report isAvailable=true', async () => {
    const freeIds = ['duckduckgo', 'wikipedia', 'hackernews', 'reddit', 'wayback', 'common-crawl'];
    for (const id of freeIds) {
      const adapter = builtInAdapters.find((a) => a.id === id)!;
      expect(await adapter.isAvailable()).toBe(true);
    }
  });

  it('credential-gated adapters return empty results from search()', async () => {
    const gated = builtInAdapters.filter((a) => ['brave-search', 'tineye', 'google-vision', 'insightface'].includes(a.id));
    for (const adapter of gated) {
      const results = await adapter.search({ id: 'test', mode: 'text', query: 'test' });
      expect(results).toEqual([]);
    }
  });

  it('GitHub adapter returns empty array without token', async () => {
    const gh = builtInAdapters.find((a) => a.id === 'github')!;
    // GITHUB_TOKEN may or may not be set in test env, but search should not throw
    const results = await gh.search({ id: 'test', mode: 'text', query: '' });
    expect(results).toEqual([]);
  });

  it('Wayback adapter handles non-URL short queries gracefully', async () => {
    const wb = builtInAdapters.find((a) => a.id === 'wayback')!;
    const results = await wb.search({ id: 'test', mode: 'archive', query: 'ab' });
    expect(results).toEqual([]);
  });

  it('Common Crawl adapter skips text-only queries', async () => {
    const cc = builtInAdapters.find((a) => a.id === 'common-crawl')!;
    const results = await cc.search({ id: 'test', mode: 'archive', query: 'some text query' });
    expect(results).toEqual([]);
  });
});

describe('createComputerLegacyAdapters', () => {
  it('returns FTP and NNTP adapters', () => {
    const adapters = createComputerLegacyAdapters(undefined);
    expect(adapters).toHaveLength(2);
    expect(adapters[0].id).toBe('computer-ftp');
    expect(adapters[1].id).toBe('computer-nntp');
  });
});
