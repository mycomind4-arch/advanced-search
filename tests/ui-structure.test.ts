import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('UI server adapters (ui/lib/server)', () => {
  const adaptersPath = join(__dirname, '..', 'ui', 'lib', 'server', 'adapters.ts');
  const enginePath = join(__dirname, '..', 'ui', 'lib', 'server', 'engine.ts');

  it('adapters.ts file exists', () => {
    expect(existsSync(adaptersPath)).toBe(true);
  });

  it('engine.ts file exists', () => {
    expect(existsSync(enginePath)).toBe(true);
  });

  it('adapters.ts exports all 8 adapter functions', () => {
    const content = readFileSync(adaptersPath, 'utf-8');
    const exports = [
      'searchWayback',
      'searchGitHubCode',
      'searchCommonCrawl',
      'searchDuckDuckGo',
      'searchWikipedia',
      'searchHackerNews',
      'searchReddit',
      'searchBrave',
    ];
    for (const fn of exports) {
      expect(content).toContain(`export async function ${fn}`);
    }
  });

  it('adapters.ts exports getAvailableAdapters', () => {
    const content = readFileSync(adaptersPath, 'utf-8');
    expect(content).toContain('export function getAvailableAdapters');
  });

  it('engine.ts exports buildPipeline and runPipeline', () => {
    const content = readFileSync(enginePath, 'utf-8');
    expect(content).toContain('export function buildPipeline');
    expect(content).toContain('export async function runPipeline');
  });

  it('engine.ts handles all 7 search stages', () => {
    const content = readFileSync(enginePath, 'utf-8');
    const stageIds = ['github-search', 'ddg', 'wikipedia', 'hackernews', 'reddit', 'archive', 'common-crawl'];
    for (const id of stageIds) {
      expect(content).toContain(`'${id}'`);
    }
  });

  it('engine.ts runs post-processing stages', () => {
    const content = readFileSync(enginePath, 'utf-8');
    expect(content).toContain("'metadata'");
    expect(content).toContain("'entity-resolution'");
    expect(content).toContain("'corroboration'");
  });
});

describe('UI sources (ui/lib/sources.ts)', () => {
  const sourcesPath = join(__dirname, '..', 'ui', 'lib', 'sources.ts');

  it('file exists', () => {
    expect(existsSync(sourcesPath)).toBe(true);
  });

  it('defines all 7 configured sources', () => {
    const content = readFileSync(sourcesPath, 'utf-8');
    const configuredIds = ['github', 'wayback', 'common-crawl', 'duckduckgo', 'wikipedia', 'hackernews', 'reddit'];
    for (const id of configuredIds) {
      expect(content).toContain(`id: '${id}'`);
    }
  });

  it('marks free sources as configured: true', () => {
    const content = readFileSync(sourcesPath, 'utf-8');
    expect(content).toContain("id: 'duckduckgo'");
    expect(content).toMatch(/duckduckgo.*configured: true/s);
  });
});

describe('UI agents (ui/lib/agents.ts)', () => {
  const agentsPath = join(__dirname, '..', 'ui', 'lib', 'agents.ts');

  it('file exists', () => {
    expect(existsSync(agentsPath)).toBe(true);
  });

  it('defines AGENTS array with 14 agents', () => {
    const content = readFileSync(agentsPath, 'utf-8');
    // Count the number of agent definitions (each starts with { id:)
    const matches = content.match(/\{ id: '/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(14);
  });

  it('exports buildPipelineStages function', () => {
    const content = readFileSync(agentsPath, 'utf-8');
    expect(content).toContain('export function buildPipelineStages');
  });

  it('pipeline includes all search adapter stages', () => {
    const content = readFileSync(agentsPath, 'utf-8');
    expect(content).toContain("id: 'github-search'");
    expect(content).toContain("id: 'ddg'");
    expect(content).toContain("id: 'wikipedia'");
    expect(content).toContain("id: 'hackernews'");
    expect(content).toContain("id: 'reddit'");
    expect(content).toContain("id: 'archive'");
    expect(content).toContain("id: 'common-crawl'");
  });
});
