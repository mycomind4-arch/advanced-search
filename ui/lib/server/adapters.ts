// Server-side search adapters — real implementations that query live APIs.
// These run on the Cloudflare Worker and use fetch to reach external services.

import type { SearchObservation, SearchRequest, SearchMode, MatchSignals, ExtractedEntity } from '../types';

// -- Wayback CDX Adapter --
// Queries the Internet Archive CDX API for archived URL snapshots.
// Public, no credentials required.
export async function searchWayback(request: SearchRequest): Promise<SearchObservation[]> {
  if (!request.query) return [];
  const query = request.query.trim();
  const limit = 50;
  const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(query)}&output=json&limit=${limit}&fl=timestamp,original,statuscode,mimetype,digest&filter=statuscode:200`;

  try {
    const resp = await fetch(cdxUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(request.budget?.timeoutMs ?? 15000),
    });
    if (!resp.ok) return [];
    const data = await resp.json() as any[];
    if (!Array.isArray(data) || data.length < 2) return []; // first row is headers

    const headers = data[0] as string[];
    const rows = data.slice(1) as string[][];
    const observations: SearchObservation[] = [];

    for (const row of rows) {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });

      const ts = obj.timestamp || '';
      const year = ts.slice(0, 4);
      const month = ts.slice(4, 6);
      const day = ts.slice(6, 8);
      const publishedAt = year ? `${year}-${month}-${day}T00:00:00Z` : undefined;
      const waybackUrl = ts ? `https://web.archive.org/web/${ts}/${obj.original}` : obj.original;

      observations.push({
        id: `wayback:${obj.digest}:${ts}`,
        provider: 'wayback',
        providerResultId: ts,
        sourceUrl: waybackUrl,
        title: `Archived: ${obj.original}`,
        snippet: `Captured ${year}-${month}-${day} · ${obj.mimetype}`,
        discoveredAt: new Date().toISOString(),
        publishedAt,
        sourceType: 'archive',
        queryJobId: request.id,
        providerScore: 0.6,
        signals: {
          textRelevance: 0.5,
          sourceQuality: 0.7,
          temporalConsistency: 0.8,
        },
      });
    }
    return observations;
  } catch {
    return [];
  }
}

// -- GitHub Code Search Adapter --
// Searches GitHub for code, repositories, and commits matching the query.
// Uses the GITHUB_TOKEN environment variable for authenticated requests.
export async function searchGitHubCode(request: SearchRequest): Promise<SearchObservation[]> {
  if (!request.query) return [];
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
  if (!token) return [];

  const query = request.query.trim();
  const perPage = 30;
  const observations: SearchObservation[] = [];

  // Search code
  try {
    const resp = await fetch(
      `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=${perPage}`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'advanced-search-engine',
        },
        signal: AbortSignal.timeout(request.budget?.timeoutMs ?? 15000),
      }
    );
    if (resp.ok) {
      const data = await resp.json() as { items: any[]; total_count: number };
      for (const item of data.items ?? []) {
        observations.push({
          id: `github-code:${item.sha}:${item.repository?.id}`,
          provider: 'github',
          providerResultId: item.sha,
          sourceUrl: item.html_url,
          title: `${item.repository?.full_name}/${item.path}`,
          snippet: item.name,
          discoveredAt: new Date().toISOString(),
          sourceType: 'github-code',
          queryJobId: request.id,
          providerScore: item.score ?? 0.5,
          signals: { textRelevance: item.score ?? 0.5, sourceQuality: 0.8 },
          entities: extractGitHubEntities(item),
        });
      }
    }
  } catch { /* continue to next search type */ }

  // Search repositories
  try {
    const resp = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=${perPage}&sort=stars&order=desc`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'advanced-search-engine',
        },
        signal: AbortSignal.timeout(request.budget?.timeoutMs ?? 15000),
      }
    );
    if (resp.ok) {
      const data = await resp.json() as { items: any[]; total_count: number };
      for (const item of data.items ?? []) {
        observations.push({
          id: `github-repo:${item.id}`,
          provider: 'github',
          providerResultId: String(item.id),
          sourceUrl: item.html_url,
          title: item.full_name,
          snippet: item.description ?? item.full_name,
          discoveredAt: new Date().toISOString(),
          publishedAt: item.created_at,
          sourceType: 'github-repo',
          queryJobId: request.id,
          providerScore: 0.7,
          signals: {
            textRelevance: 0.6,
            sourceQuality: Math.min(0.95, 0.5 + (item.stargazers_count ?? 0) / 10000),
          },
          entities: [
            { type: 'organization', value: item.owner?.login ?? '', confidence: 0.9 },
            ...(item.language ? [{ type: 'other' as const, value: item.language, confidence: 0.8 }] : []),
          ],
        });
      }
    }
  } catch { /* continue */ }

  // Search commits
  try {
    const resp = await fetch(
      `https://api.github.com/search/commits?q=${encodeURIComponent(query)}&per_page=20&sort=author-date&order=desc`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.cloak-preview+json',
          'User-Agent': 'advanced-search-engine',
        },
        signal: AbortSignal.timeout(request.budget?.timeoutMs ?? 15000),
      }
    );
    if (resp.ok) {
      const data = await resp.json() as { items: any[]; total_count: number };
      for (const item of data.items ?? []) {
        observations.push({
          id: `github-commit:${item.sha}`,
          provider: 'github',
          providerResultId: item.sha,
          sourceUrl: item.html_url,
          title: item.commit?.message?.split('\n')[0]?.slice(0, 120) ?? 'Commit',
          snippet: item.commit?.message?.slice(0, 200),
          discoveredAt: new Date().toISOString(),
          publishedAt: item.commit?.author?.date,
          sourceType: 'github-commit',
          queryJobId: request.id,
          providerScore: item.score ?? 0.5,
          signals: { textRelevance: item.score ?? 0.5, sourceQuality: 0.7 },
          entities: [
            { type: 'person', value: item.commit?.author?.name ?? '', confidence: 0.7 },
            ...(item.commit?.author?.date ? [{ type: 'date' as const, value: item.commit.author.date, confidence: 0.9 }] : []),
          ],
        });
      }
    }
  } catch { /* continue */ }

  // Search issues/PRs
  try {
    const resp = await fetch(
      `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=20&sort=created&order=desc`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'advanced-search-engine',
        },
        signal: AbortSignal.timeout(request.budget?.timeoutMs ?? 15000),
      }
    );
    if (resp.ok) {
      const data = await resp.json() as { items: any[]; total_count: number };
      for (const item of data.items ?? []) {
        observations.push({
          id: `github-issue:${item.id}`,
          provider: 'github',
          providerResultId: String(item.id),
          sourceUrl: item.html_url,
          title: item.title ?? 'Issue',
          snippet: item.body?.slice(0, 200),
          discoveredAt: new Date().toISOString(),
          publishedAt: item.created_at,
          sourceType: item.pull_request ? 'github-pr' : 'github-issue',
          queryJobId: request.id,
          providerScore: item.score ?? 0.5,
          signals: { textRelevance: item.score ?? 0.5, sourceQuality: 0.6 },
          entities: [
            { type: 'person', value: item.user?.login ?? '', confidence: 0.7 },
            ...(item.repository_url ? [{ type: 'organization' as const, value: item.repository_url.split('/').slice(-2).join('/'), confidence: 0.8 }] : []),
          ],
        });
      }
    }
  } catch { /* continue */ }

  return observations;
}

// -- Common Crawl Adapter --
// Queries the Common Crawl index for crawled URLs matching the query.
// Public, no credentials required.
export async function searchCommonCrawl(request: SearchRequest): Promise<SearchObservation[]> {
  if (!request.query) return [];
  const query = request.query.trim();

  // Use the most recent CC index. Try a known recent crawl ID.
  const crawlIds = ['CC-MAIN-2024-38', 'CC-MAIN-2024-33', 'CC-MAIN-2024-22', 'CC-MAIN-2024-10'];
  const observations: SearchObservation[] = [];

  for (const crawlId of crawlIds) {
    try {
      const url = `https://index.commoncrawl.org/${crawlId}-index?url=${encodeURIComponent(query)}&output=json&limit=30`;
      const resp = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) continue;
      const data = await resp.json() as any[];
      if (!Array.isArray(data)) continue;

      for (const item of data) {
        const ts = item.timestamp ?? '';
        const year = ts.slice(0, 4);
        const month = ts.slice(4, 6);
        const day = ts.slice(6, 8);
        observations.push({
          id: `cc:${crawlId}:${item.digest ?? item.url}`,
          provider: 'common-crawl',
          providerResultId: item.digest,
          sourceUrl: item.url,
          title: `Crawled: ${item.url}`,
          snippet: `${crawlId} · ${item.mime ?? 'unknown'} · ${item.status ?? '?'}`,
          discoveredAt: new Date().toISOString(),
          publishedAt: year ? `${year}-${month}-${day}T00:00:00Z` : undefined,
          sourceType: 'archive',
          queryJobId: request.id,
          providerScore: 0.5,
          signals: { textRelevance: 0.4, sourceQuality: 0.6 },
        });
      }
      if (observations.length > 0) break; // got results from this crawl
    } catch {
      continue;
    }
  }

  return observations;
}

// -- Metadata Fetch Adapter --
// Fetches HTTP headers from discovered URLs to extract metadata.
export async function fetchMetadata(sourceUrls: string[], timeoutMs = 10000): Promise<Map<string, Record<string, string>>> {
  const results = new Map<string, Record<string, string>>();
  const batch = sourceUrls.slice(0, 10); // limit to avoid hammering

  await Promise.allSettled(
    batch.map(async (url) => {
      try {
        // For archive.org URLs, do a HEAD request to get metadata
        const resp = await fetch(url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(timeoutMs),
          redirect: 'follow',
        });
        const headers: Record<string, string> = {};
        resp.headers.forEach((value, key) => { headers[key] = value; });
        results.set(url, headers);
      } catch {
        // skip on error
      }
    })
  );

  return results;
}

// -- Entity extraction helpers --
function extractGitHubEntities(item: any): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  if (item.repository?.owner?.login) {
    entities.push({ type: 'organization', value: item.repository.owner.login, confidence: 0.9 });
  }
  if (item.repository?.name) {
    entities.push({ type: 'other', value: item.repository.name, confidence: 0.7 });
  }
  if (item.repository?.language) {
    entities.push({ type: 'other', value: item.repository.language, confidence: 0.6 });
  }
  return entities;
}

// -- Adapter availability checks --
export function getAvailableAdapters(): { id: string; available: boolean; modes: SearchMode[] }[] {
  const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
  return [
    { id: 'wayback', available: true, modes: ['archive', 'image', 'text', 'document'] },
    { id: 'common-crawl', available: true, modes: ['archive', 'image', 'text', 'document'] },
    { id: 'github', available: Boolean(githubToken), modes: ['text', 'metadata'] },
  ];
}
