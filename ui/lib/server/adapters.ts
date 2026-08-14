// Server-side search adapters — real implementations that query live APIs.
// These run on the Cloudflare Worker and use fetch to reach external services.

import type { SearchObservation, SearchRequest, SearchMode, ExtractedEntity } from '../types';

// ============================================================
// Wayback CDX Adapter
// For URL queries, searches archived snapshots. For text queries, tries domain inference.
// Public, no credentials required.
// ============================================================
export async function searchWayback(request: SearchRequest): Promise<SearchObservation[]> {
  if (!request.query) return [];
  let query = request.query.trim();
  const isUrl = /^(https?:\/\/|www\.|[\w-]+\.[\w-]+)/.test(query);
  if (!isUrl) {
    const domainGuess = query.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    if (domainGuess.length <= 2) return [];
    query = `*.${domainGuess}.com/*` as string;
  }
  const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(query)}&output=json&limit=50&fl=timestamp,original,statuscode,mimetype,digest&filter=statuscode:200`;
  try {
    const resp = await fetch(cdxUrl, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return [];
    const data = await resp.json() as any[];
    if (!Array.isArray(data) || data.length < 2) return [];
    const headers = data[0] as string[];
    const observations: SearchObservation[] = [];
    for (const row of data.slice(1) as string[][]) {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
      const ts = obj.timestamp || '';
      observations.push({
        id: `wayback:${obj.digest}:${ts}`, provider: 'wayback', providerResultId: ts,
        sourceUrl: ts ? `https://web.archive.org/web/${ts}/${obj.original}` : obj.original,
        title: `Archived: ${obj.original}`,
        snippet: `Captured ${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)} · ${obj.mimetype}`,
        discoveredAt: new Date().toISOString(),
        publishedAt: ts ? `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}T00:00:00Z` : undefined,
        sourceType: 'archive', queryJobId: request.id, providerScore: 0.6,
        signals: { textRelevance: 0.5, sourceQuality: 0.7, temporalConsistency: 0.8 },
      });
    }
    return observations;
  } catch { return []; }
}

// ============================================================
// GitHub Search Adapter — code, repos, commits, issues
// Uses GITHUB_TOKEN environment variable.
// ============================================================
export async function searchGitHubCode(request: SearchRequest): Promise<SearchObservation[]> {
  if (!request.query) return [];
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
  if (!token) return [];
  let query = request.query.trim();
  const perPage = 30;
  const timeout = 12000;
  const observations: SearchObservation[] = [];
  const ghHeaders: Record<string, string> = {
    'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'advanced-search-engine',
  };

  // Code search
  try {
    const resp = await fetch(`https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=${perPage}`, { headers: ghHeaders, signal: AbortSignal.timeout(timeout) });
    if (resp.ok) {
      const data = await resp.json() as { items: any[] };
      for (const item of data.items ?? []) {
        observations.push({
          id: `github-code:${item.sha}:${item.repository?.id}`, provider: 'github', providerResultId: item.sha,
          sourceUrl: item.html_url, title: `${item.repository?.full_name}/${item.path}`,
          snippet: item.name, discoveredAt: new Date().toISOString(), sourceType: 'github-code',
          queryJobId: request.id, providerScore: item.score ?? 0.5,
          signals: { textRelevance: item.score ?? 0.5, sourceQuality: 0.8 },
          entities: [{ type: 'organization', value: item.repository?.owner?.login ?? '', confidence: 0.9 }, { type: 'other', value: item.repository?.name ?? '', confidence: 0.7 }],
        });
      }
    }
  } catch {}

  // Repository search
  try {
    const resp = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=${perPage}&sort=stars&order=desc`, { headers: ghHeaders, signal: AbortSignal.timeout(timeout) });
    if (resp.ok) {
      const data = await resp.json() as { items: any[] };
      for (const item of data.items ?? []) {
        observations.push({
          id: `github-repo:${item.id}`, provider: 'github', providerResultId: String(item.id),
          sourceUrl: item.html_url, title: item.full_name, snippet: item.description ?? item.full_name,
          discoveredAt: new Date().toISOString(), publishedAt: item.created_at, sourceType: 'github-repo',
          queryJobId: request.id, providerScore: 0.7,
          signals: { textRelevance: 0.6, sourceQuality: Math.min(0.95, 0.5 + (item.stargazers_count ?? 0) / 10000) },
          entities: [{ type: 'organization', value: item.owner?.login ?? '', confidence: 0.9 }, ...(item.language ? [{ type: 'other' as const, value: item.language, confidence: 0.8 }] : [])],
        });
      }
    }
  } catch {}

  // Commit search
  try {
    const resp = await fetch(`https://api.github.com/search/commits?q=${encodeURIComponent(query)}&per_page=20&sort=author-date&order=desc`, { headers: { ...ghHeaders, Accept: 'application/vnd.github.cloak-preview+json' }, signal: AbortSignal.timeout(timeout) });
    if (resp.ok) {
      const data = await resp.json() as { items: any[] };
      for (const item of data.items ?? []) {
        observations.push({
          id: `github-commit:${item.sha}`, provider: 'github', providerResultId: item.sha,
          sourceUrl: item.html_url, title: item.commit?.message?.split('\n')[0]?.slice(0, 120) ?? 'Commit',
          snippet: item.commit?.message?.slice(0, 200), discoveredAt: new Date().toISOString(),
          publishedAt: item.commit?.author?.date, sourceType: 'github-commit', queryJobId: request.id,
          providerScore: item.score ?? 0.5, signals: { textRelevance: item.score ?? 0.5, sourceQuality: 0.7 },
          entities: [{ type: 'person', value: item.commit?.author?.name ?? '', confidence: 0.7 }, ...(item.commit?.author?.date ? [{ type: 'date' as const, value: item.commit.author.date, confidence: 0.9 }] : [])],
        });
      }
    }
  } catch {}

  // Issue/PR search
  try {
    const resp = await fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=20&sort=created&order=desc`, { headers: ghHeaders, signal: AbortSignal.timeout(timeout) });
    if (resp.ok) {
      const data = await resp.json() as { items: any[] };
      for (const item of data.items ?? []) {
        observations.push({
          id: `github-issue:${item.id}`, provider: 'github', providerResultId: String(item.id),
          sourceUrl: item.html_url, title: item.title ?? 'Issue', snippet: item.body?.slice(0, 200),
          discoveredAt: new Date().toISOString(), publishedAt: item.created_at,
          sourceType: item.pull_request ? 'github-pr' : 'github-issue', queryJobId: request.id,
          providerScore: item.score ?? 0.5, signals: { textRelevance: item.score ?? 0.5, sourceQuality: 0.6 },
          entities: [{ type: 'person', value: item.user?.login ?? '', confidence: 0.7 }, ...(item.repository_url ? [{ type: 'organization' as const, value: item.repository_url.split('/').slice(-2).join('/'), confidence: 0.8 }] : [])],
        });
      }
    }
  } catch {}

  return observations;
}

// ============================================================
// Common Crawl Adapter — queries CC index for crawled URLs
// Public, no credentials. URL queries only.
// ============================================================
export async function searchCommonCrawl(request: SearchRequest): Promise<SearchObservation[]> {
  if (!request.query) return [];
  let query = request.query.trim();
  if (!/^(https?:\/\/|www\.|[\w-]+\.[\w-]+)/.test(query)) return [];
  for (const crawlId of ['CC-MAIN-2024-38', 'CC-MAIN-2024-33']) {
    try {
      const resp = await fetch(`https://index.commoncrawl.org/${crawlId}-index?url=${encodeURIComponent(query)}&output=json&limit=30`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      if (!resp.ok) continue;
      const data = await resp.json() as any[];
      if (!Array.isArray(data)) continue;
      return data.map((item: any): SearchObservation => ({
        id: `cc:${crawlId}:${item.digest ?? item.url}`, provider: 'common-crawl', providerResultId: item.digest,
        sourceUrl: item.url, title: `Crawled: ${item.url}`, snippet: `${crawlId} · ${item.mime ?? 'unknown'}`,
        discoveredAt: new Date().toISOString(), sourceType: 'archive', queryJobId: request.id, providerScore: 0.5,
        signals: { textRelevance: 0.4, sourceQuality: 0.6 },
      }));
    } catch { continue; }
  }
  return [];
}

// ============================================================
// DuckDuckGo Instant Answer Adapter
// Free, no API key. Returns abstracts, related topics, definitions.
// ============================================================
export async function searchDuckDuckGo(request: SearchRequest): Promise<SearchObservation[]> {
  if (!request.query) return [];
  let query = request.query.trim();
  const observations: SearchObservation[] = [];
  try {
    const resp = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return [];
    const data = await resp.json() as any;
    if (data.AbstractText) {
      observations.push({
        id: `ddg:abstract:${query}`, provider: 'duckduckgo', sourceUrl: data.AbstractURL ?? `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        title: data.Heading ?? query, snippet: data.AbstractText, discoveredAt: new Date().toISOString(),
        sourceType: 'web', queryJobId: request.id, providerScore: 0.8,
        signals: { textRelevance: 0.9, sourceQuality: 0.7 },
        entities: data.AbstractSource ? [{ type: 'organization', value: data.AbstractSource, confidence: 0.7 }] : [],
      });
    }
    for (const topic of (data.RelatedTopics ?? []).slice(0, 15)) {
      if (topic.Text && topic.FirstURL) {
        observations.push({
          id: `ddg:topic:${topic.FirstURL}`, provider: 'duckduckgo', sourceUrl: topic.FirstURL,
          title: topic.Text.split(' - ')[0] ?? topic.Text.slice(0, 80), snippet: topic.Text,
          discoveredAt: new Date().toISOString(), sourceType: 'web', queryJobId: request.id,
          providerScore: 0.5, signals: { textRelevance: 0.6, sourceQuality: 0.5 },
        });
      }
    }
    if (data.Definition && data.DefinitionURL) {
      observations.push({
        id: `ddg:def:${query}`, provider: 'duckduckgo', sourceUrl: data.DefinitionURL,
        title: `Definition: ${query}`, snippet: data.Definition, discoveredAt: new Date().toISOString(),
        sourceType: 'web', queryJobId: request.id, providerScore: 0.7,
        signals: { textRelevance: 0.8, sourceQuality: 0.6 },
      });
    }
  } catch {}
  return observations;
}

// ============================================================
// Wikipedia Search Adapter — searches Wikipedia articles
// Free, no API key.
// ============================================================
export async function searchWikipedia(request: SearchRequest): Promise<SearchObservation[]> {
  if (!request.query) return [];
  let query = request.query.trim();
  const observations: SearchObservation[] = [];
  try {
    const resp = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=15&format=json&origin=*`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return [];
    const data = await resp.json() as any;
    for (const result of data?.query?.search ?? []) {
      observations.push({
        id: `wiki:${result.pageid}`, provider: 'wikipedia', providerResultId: String(result.pageid),
        sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/\s/g, '_'))}`,
        title: `${result.title} — Wikipedia`,
        snippet: (result.snippet ?? '').replace(/<[^>]+>/g, '').slice(0, 200) || `Wikipedia article about ${result.title}`,
        discoveredAt: new Date().toISOString(), publishedAt: result.timestamp, sourceType: 'web',
        queryJobId: request.id, providerScore: 0.7,
        signals: { textRelevance: 0.8, sourceQuality: 0.85 },
      });
    }
  } catch {}
  return observations;
}

// ============================================================
// Hacker News (Algolia) Search Adapter — searches HN stories
// Free, no API key.
// ============================================================
export async function searchHackerNews(request: SearchRequest): Promise<SearchObservation[]> {
  if (!request.query) return [];
  let query = request.query.trim();
  const observations: SearchObservation[] = [];
  try {
    const resp = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=20`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return [];
    const data = await resp.json() as any;
    for (const hit of data?.hits ?? []) {
      observations.push({
        id: `hn:${hit.objectID}`, provider: 'hackernews', providerResultId: hit.objectID,
        sourceUrl: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
        title: hit.title ?? hit.story_title ?? 'HN Story',
        snippet: (hit.story_text ?? '').slice(0, 200) || `Points: ${hit.points ?? 0} · Comments: ${hit.num_comments ?? 0}`,
        discoveredAt: new Date().toISOString(), publishedAt: hit.created_at, sourceType: 'web',
        queryJobId: request.id, providerScore: Math.min(1, (hit.points ?? 0) / 100 + 0.3),
        signals: { textRelevance: Math.min(1, (hit.relevance_score ?? 0.5) + 0.2), sourceQuality: Math.min(0.9, 0.4 + (hit.points ?? 0) / 500) },
        entities: [{ type: 'person', value: hit.author ?? '', confidence: 0.6 }, ...(hit.created_at ? [{ type: 'date' as const, value: hit.created_at, confidence: 0.9 }] : [])],
      });
    }
  } catch {}
  return observations;
}

// ============================================================
// Reddit Search Adapter — searches Reddit posts
// Free, no API key (public JSON endpoints).
// ============================================================
export async function searchReddit(request: SearchRequest): Promise<SearchObservation[]> {
  if (!request.query) return [];
  let query = request.query.trim();
  const observations: SearchObservation[] = [];
  try {
    const resp = await fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=20&sort=relevance`, { headers: { Accept: 'application/json', 'User-Agent': 'advanced-search-engine/1.0' }, signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return [];
    const data = await resp.json() as any;
    for (const post of data?.data?.children ?? []) {
      const p = post?.data;
      if (!p) continue;
      observations.push({
        id: `reddit:${p.id}`, provider: 'reddit', providerResultId: p.id,
        sourceUrl: `https://www.reddit.com${p.permalink}`, title: p.title ?? 'Reddit Post',
        snippet: (p.selftext ?? '').slice(0, 200) || `r/${p.subreddit} · ${p.score} points · ${p.num_comments} comments`,
        discoveredAt: new Date().toISOString(), publishedAt: new Date(p.created_utc * 1000).toISOString(),
        sourceType: 'web', queryJobId: request.id, providerScore: Math.min(1, (p.score ?? 0) / 1000 + 0.3),
        signals: { textRelevance: 0.6, sourceQuality: Math.min(0.8, 0.3 + (p.score ?? 0) / 5000) },
        entities: [{ type: 'organization', value: `r/${p.subreddit}`, confidence: 0.7 }, { type: 'person', value: p.author ?? '', confidence: 0.5 }],
      });
    }
  } catch {}
  return observations;
}

// ============================================================
// Brave Search Adapter — web search via Brave API
// Requires BRAVE_SEARCH_API_KEY environment variable.
// ============================================================
export async function searchBrave(request: SearchRequest): Promise<SearchObservation[]> {
  if (!request.query) return [];
  const apiKey = process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_API_KEY;
  if (!apiKey) return [];
  let query = request.query.trim();
  const observations: SearchObservation[] = [];
  try {
    const resp = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=20`, { headers: { 'X-Subscription-Token': apiKey, Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return [];
    const data = await resp.json() as any;
    for (const result of data?.web?.results ?? []) {
      observations.push({
        id: `brave:${result.url ?? result.title}`, provider: 'brave-search', sourceUrl: result.url,
        title: result.title ?? 'Search Result', snippet: result.description ?? '',
        discoveredAt: new Date().toISOString(), publishedAt: result.age ? new Date(result.age).toISOString() : undefined,
        sourceType: 'web', queryJobId: request.id, providerScore: 0.7,
        signals: { textRelevance: 0.7, sourceQuality: 0.6 },
      });
    }
  } catch {}
  return observations;
}

// -- Adapter availability --
export function getAvailableAdapters(): { id: string; available: boolean; modes: SearchMode[] }[] {
  const ghToken = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
  const braveKey = process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_API_KEY;
  return [
    { id: 'wayback', available: true, modes: ['archive', 'image', 'text', 'document'] },
    { id: 'common-crawl', available: true, modes: ['archive', 'image', 'text', 'document'] },
    { id: 'github', available: Boolean(ghToken), modes: ['text', 'metadata'] },
    { id: 'duckduckgo', available: true, modes: ['text'] },
    { id: 'wikipedia', available: true, modes: ['text'] },
    { id: 'hackernews', available: true, modes: ['text'] },
    { id: 'reddit', available: true, modes: ['text'] },
    { id: 'brave-search', available: Boolean(braveKey), modes: ['text'] },
  ];
}
