import type { SearchAdapter, SearchMode, SearchObservation, SearchRequest } from '../core/types.js';
import { PublicFtpAdapter, PublicNntpAdapter, type ComputerExecutor } from './ftp-nntp.js';

// -- GitHub Search Adapter (real) --
// Uses GITHUB_TOKEN env var for authenticated API requests.
// Searches code, repos, commits, and issues.
class GitHubSearchAdapter implements SearchAdapter {
  readonly id = 'github';
  readonly modes: SearchMode[] = ['text', 'metadata'];
  async isAvailable(): Promise<boolean> { return Boolean(process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN); }
  async search(request: SearchRequest): Promise<SearchObservation[]> {
    const token = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
    if (!token || !request.query) return [];
    const query = request.query.trim();
    const headers: Record<string, string> = {
      'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'advanced-search-engine',
    };
    const observations: SearchObservation[] = [];

    // Code search
    try {
      const resp = await fetch(`https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=30`, { headers });
      if (resp.ok) {
        const data = await resp.json() as any;
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
      const resp = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=30&sort=stars&order=desc`, { headers });
      if (resp.ok) {
        const data = await resp.json() as any;
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
      const resp = await fetch(`https://api.github.com/search/commits?q=${encodeURIComponent(query)}&per_page=20&sort=author-date&order=desc`, { headers: { ...headers, Accept: 'application/vnd.github.cloak-preview+json' } });
      if (resp.ok) {
        const data = await resp.json() as any;
        for (const item of data.items ?? []) {
          observations.push({
            id: `github-commit:${item.sha}`, provider: 'github', providerResultId: item.sha,
            sourceUrl: item.html_url, title: item.commit?.message?.split('\n')[0]?.slice(0, 120) ?? 'Commit',
            snippet: item.commit?.message?.slice(0, 200), discoveredAt: new Date().toISOString(),
            publishedAt: item.commit?.author?.date, sourceType: 'github-commit', queryJobId: request.id,
            providerScore: item.score ?? 0.5, signals: { textRelevance: item.score ?? 0.5, sourceQuality: 0.7 },
            entities: [{ type: 'person', value: item.commit?.author?.name ?? '', confidence: 0.7 }],
          });
        }
      }
    } catch {}

    // Issue/PR search
    try {
      const resp = await fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=20&sort=created&order=desc`, { headers });
      if (resp.ok) {
        const data = await resp.json() as any;
        for (const item of data.items ?? []) {
          observations.push({
            id: `github-issue:${item.id}`, provider: 'github', providerResultId: String(item.id),
            sourceUrl: item.html_url, title: item.title ?? 'Issue', snippet: item.body?.slice(0, 200),
            discoveredAt: new Date().toISOString(), publishedAt: item.created_at,
            sourceType: item.pull_request ? 'github-pr' : 'github-issue', queryJobId: request.id,
            providerScore: item.score ?? 0.5, signals: { textRelevance: item.score ?? 0.5, sourceQuality: 0.6 },
            entities: [{ type: 'person', value: item.user?.login ?? '', confidence: 0.7 }],
          });
        }
      }
    } catch {}

    return observations;
  }
}

// -- DuckDuckGo Instant Answer Adapter (real, free) --
class DuckDuckGoAdapter implements SearchAdapter {
  readonly id = 'duckduckgo';
  readonly modes: SearchMode[] = ['text'];
  async isAvailable(): Promise<boolean> { return true; }
  async search(request: SearchRequest): Promise<SearchObservation[]> {
    if (!request.query) return [];
    try {
      const resp = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(request.query)}&format=json&no_html=1`);
      if (!resp.ok) return [];
      const data = await resp.json() as any;
      const observations: SearchObservation[] = [];
      if (data.AbstractText) {
        observations.push({
          id: `ddg:abstract:${request.query}`, provider: 'duckduckgo',
          sourceUrl: data.AbstractURL ?? '', title: data.Heading ?? request.query,
          snippet: data.AbstractText, discoveredAt: new Date().toISOString(),
          sourceType: 'web', queryJobId: request.id, providerScore: 0.8,
          signals: { textRelevance: 0.9, sourceQuality: 0.7 },
        });
      }
      for (const topic of (data.RelatedTopics ?? []).slice(0, 15)) {
        if (topic.Text && topic.FirstURL) {
          observations.push({
            id: `ddg:topic:${topic.FirstURL}`, provider: 'duckduckgo',
            sourceUrl: topic.FirstURL, title: topic.Text.split(' - ')[0] ?? topic.Text.slice(0, 80),
            snippet: topic.Text, discoveredAt: new Date().toISOString(),
            sourceType: 'web', queryJobId: request.id, providerScore: 0.5,
            signals: { textRelevance: 0.6, sourceQuality: 0.5 },
          });
        }
      }
      return observations;
    } catch { return []; }
  }
}

// -- Wikipedia Search Adapter (real, free) --
class WikipediaAdapter implements SearchAdapter {
  readonly id = 'wikipedia';
  readonly modes: SearchMode[] = ['text'];
  async isAvailable(): Promise<boolean> { return true; }
  async search(request: SearchRequest): Promise<SearchObservation[]> {
    if (!request.query) return [];
    try {
      const resp = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(request.query)}&srlimit=15&format=json&origin=*`);
      if (!resp.ok) return [];
      const data = await resp.json() as any;
      return (data?.query?.search ?? []).map((result: any): SearchObservation => ({
        id: `wiki:${result.pageid}`, provider: 'wikipedia', providerResultId: String(result.pageid),
        sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/\s/g, '_'))}`,
        title: `${result.title} — Wikipedia`,
        snippet: (result.snippet ?? '').replace(/<[^>]+>/g, '').slice(0, 200),
        discoveredAt: new Date().toISOString(), publishedAt: result.timestamp,
        sourceType: 'web', queryJobId: request.id, providerScore: 0.7,
        signals: { textRelevance: 0.8, sourceQuality: 0.85 },
      }));
    } catch { return []; }
  }
}

// -- Hacker News (Algolia) Adapter (real, free) --
class HackerNewsAdapter implements SearchAdapter {
  readonly id = 'hackernews';
  readonly modes: SearchMode[] = ['text'];
  async isAvailable(): Promise<boolean> { return true; }
  async search(request: SearchRequest): Promise<SearchObservation[]> {
    if (!request.query) return [];
    try {
      const resp = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(request.query)}&tags=story&hitsPerPage=20`);
      if (!resp.ok) return [];
      const data = await resp.json() as any;
      return (data?.hits ?? []).map((hit: any): SearchObservation => ({
        id: `hn:${hit.objectID}`, provider: 'hackernews', providerResultId: hit.objectID,
        sourceUrl: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
        title: hit.title ?? hit.story_title ?? 'HN Story',
        snippet: (hit.story_text ?? '').slice(0, 200) || `Points: ${hit.points ?? 0} · Comments: ${hit.num_comments ?? 0}`,
        discoveredAt: new Date().toISOString(), publishedAt: hit.created_at,
        sourceType: 'web', queryJobId: request.id, providerScore: Math.min(1, (hit.points ?? 0) / 100 + 0.3),
        signals: { textRelevance: Math.min(1, (hit.relevance_score ?? 0.5) + 0.2), sourceQuality: Math.min(0.9, 0.4 + (hit.points ?? 0) / 500) },
      }));
    } catch { return []; }
  }
}

// -- Reddit Search Adapter (real, free) --
class RedditAdapter implements SearchAdapter {
  readonly id = 'reddit';
  readonly modes: SearchMode[] = ['text'];
  async isAvailable(): Promise<boolean> { return true; }
  async search(request: SearchRequest): Promise<SearchObservation[]> {
    if (!request.query) return [];
    try {
      const resp = await fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(request.query)}&limit=20&sort=relevance`, { headers: { 'User-Agent': 'advanced-search-engine/1.0' } });
      if (!resp.ok) return [];
      const data = await resp.json() as any;
      return (data?.data?.children ?? []).map((post: any): SearchObservation => {
        const p = post.data;
        return {
          id: `reddit:${p.id}`, provider: 'reddit', providerResultId: p.id,
          sourceUrl: `https://www.reddit.com${p.permalink}`, title: p.title ?? 'Reddit Post',
          snippet: (p.selftext ?? '').slice(0, 200) || `r/${p.subreddit} · ${p.score} points`,
          discoveredAt: new Date().toISOString(), publishedAt: new Date(p.created_utc * 1000).toISOString(),
          sourceType: 'web', queryJobId: request.id, providerScore: Math.min(1, (p.score ?? 0) / 1000 + 0.3),
          signals: { textRelevance: 0.6, sourceQuality: Math.min(0.8, 0.3 + (p.score ?? 0) / 5000) },
        };
      });
    } catch { return []; }
  }
}

// -- Wayback CDX Adapter (real, free) --
class WaybackAdapter implements SearchAdapter {
  readonly id = 'wayback';
  readonly modes: SearchMode[] = ['archive', 'image', 'text', 'document'];
  async isAvailable(): Promise<boolean> { return true; }
  async search(request: SearchRequest): Promise<SearchObservation[]> {
    if (!request.query) return [];
    let query = request.query.trim();
    const isUrl = /^(https?:\/\/|www\.|[\w-]+\.[\w-]+)/.test(query);
    if (!isUrl) {
      const domainGuess = query.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
      if (domainGuess.length <= 2) return [];
      query = `*.${domainGuess}.com/*`;
    }
    try {
      const resp = await fetch(`https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(query)}&output=json&limit=50&fl=timestamp,original,statuscode,mimetype,digest&filter=statuscode:200`);
      if (!resp.ok) return [];
      const data = await resp.json() as any[];
      if (!Array.isArray(data) || data.length < 2) return [];
      const headers = data[0] as string[];
      return data.slice(1).map((row: string[]): SearchObservation => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
        const ts = obj.timestamp || '';
        return {
          id: `wayback:${obj.digest}:${ts}`, provider: 'wayback', providerResultId: ts,
          sourceUrl: ts ? `https://web.archive.org/web/${ts}/${obj.original ?? ""}` : (obj.original ?? ""),
          title: `Archived: ${obj.original}`,
          snippet: `Captured ${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)} · ${obj.mimetype}`,
          discoveredAt: new Date().toISOString(), sourceType: 'archive', queryJobId: request.id, providerScore: 0.6,
          signals: { textRelevance: 0.5, sourceQuality: 0.7, temporalConsistency: 0.8 },
        };
      });
    } catch { return []; }
  }
}

// -- Common Crawl Adapter (real, free) --
class CommonCrawlAdapter implements SearchAdapter {
  readonly id = 'common-crawl';
  readonly modes: SearchMode[] = ['archive', 'image', 'text', 'document'];
  async isAvailable(): Promise<boolean> { return true; }
  async search(request: SearchRequest): Promise<SearchObservation[]> {
    if (!request.query) return [];
    const query = request.query.trim();
    if (!/^(https?:\/\/|www\.|[\w-]+\.[\w-]+)/.test(query)) return [];
    for (const crawlId of ['CC-MAIN-2024-38', 'CC-MAIN-2024-33']) {
      try {
        const resp = await fetch(`https://index.commoncrawl.org/${crawlId}-index?url=${encodeURIComponent(query)}&output=json&limit=30`);
        if (!resp.ok) continue;
        const data = await resp.json() as any[];
        if (!Array.isArray(data)) continue;
        return data.map((item: any): SearchObservation => ({
          id: `cc:${crawlId}:${item.digest ?? item.url}`, provider: 'common-crawl',
          sourceUrl: item.url, title: `Crawled: ${item.url}`, snippet: `${crawlId} · ${item.mime ?? 'unknown'}`,
          discoveredAt: new Date().toISOString(), sourceType: 'archive', queryJobId: request.id, providerScore: 0.5,
          signals: { textRelevance: 0.4, sourceQuality: 0.6 },
        }));
      } catch { continue; }
    }
    return [];
  }
}

// -- Credential-gated adapters (stubs until configured) --
class BraveSearchAdapter implements SearchAdapter {
  readonly id = 'brave-search'; readonly modes: SearchMode[] = ['text'];
  async isAvailable(): Promise<boolean> { return Boolean(process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_API_KEY); }
  async search(): Promise<SearchObservation[]> { return []; }
}

class TinEyeAdapter implements SearchAdapter {
  readonly id = 'tineye'; readonly modes: SearchMode[] = ['image'];
  async isAvailable(): Promise<boolean> { return Boolean(process.env.TINEYE_API_KEY); }
  async search(): Promise<SearchObservation[]> { return []; }
}

class GoogleVisionAdapter implements SearchAdapter {
  readonly id = 'google-vision'; readonly modes: SearchMode[] = ['image', 'text', 'metadata'];
  async isAvailable(): Promise<boolean> { return Boolean(process.env.GOOGLE_VISION_API_KEY); }
  async search(): Promise<SearchObservation[]> { return []; }
}

class InsightFaceAdapter implements SearchAdapter {
  readonly id = 'insightface'; readonly modes: SearchMode[] = ['face', 'image'];
  async isAvailable(): Promise<boolean> { return Boolean(process.env.INSIGHTFACE_API_URL); }
  async search(): Promise<SearchObservation[]> { return []; }
}

// -- Builtins registry --
export const builtInAdapters: SearchAdapter[] = [
  new GitHubSearchAdapter(),
  new DuckDuckGoAdapter(),
  new WikipediaAdapter(),
  new HackerNewsAdapter(),
  new RedditAdapter(),
  new WaybackAdapter(),
  new CommonCrawlAdapter(),
  new BraveSearchAdapter(),
  new TinEyeAdapter(),
  new GoogleVisionAdapter(),
  new InsightFaceAdapter(),
];

export function createComputerLegacyAdapters(computer: ComputerExecutor | undefined): SearchAdapter[] {
  const ftp = new PublicFtpAdapter(computer);
  const nntp = new PublicNntpAdapter(computer, (process.env.ADVANCED_SEARCH_NNTP_SERVERS ?? '').split(',').map((x) => x.trim()).filter(Boolean));
  return [ftp, nntp];
}
