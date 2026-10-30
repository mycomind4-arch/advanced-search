import { createHash } from 'node:crypto';
import { OFFICIAL_FEEDS, queriesFor } from './config.mjs';

const short = (value, n = 450) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export function canonicalUrl(input) {
  try {
    const u = new URL(input);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    u.hash = '';
    u.hostname = u.hostname.toLowerCase();
    for (const p of [...u.searchParams.keys()]) {
      if (/^(utm_|gclid$|fbclid$|mc_)/i.test(p)) u.searchParams.delete(p);
    }
    if (u.pathname !== '/') u.pathname = u.pathname.replace(/\/+$/, '');
    u.searchParams.sort();
    return u.href;
  } catch { return null; }
}
export function dateISO(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isFinite(d.valueOf()) ? d.toISOString() : null;
}
export function recent(value, now, days = 45) {
  const at = Date.parse(value ?? '');
  const reference = Date.parse(now);
  return Number.isFinite(at) && Number.isFinite(reference) &&
    at >= reference - days * 86400_000 && at <= reference + 86400_000;
}
function hash(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 24);
}
export function record(entry, context) {
  const url = canonicalUrl(entry.url);
  const title = short(entry.title, 230);
  if (!url || !title) return null;
  return {
    id: hash(context.source + '|' + url + '|' + title),
    title, url, source: context.source, domain: context.domain,
    kind: context.kind, classification: context.classification,
    description: short(entry.description),
    publishedAt: dateISO(entry.publishedAt),
    collectedAt: context.now,
    independentlyVerified: false,
    predictedDate: null,
  };
}
export function unique(records) {
  const seen = new Set();
  return records.filter(r => {
    if (!r) return false;
    const k = r.url + '|' + r.title.toLocaleLowerCase('en');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).sort((a,b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
}
export async function fetchOfficial({ fetchImpl = fetch, now = new Date().toISOString(),
  feeds = OFFICIAL_FEEDS, perFeed = 12 } = {}) {
  const jobs = await Promise.all(feeds.map(async feed => {
    try {
      const response = await fetchImpl(feed.url, {
        headers: { Accept: 'application/json', 'User-Agent': 'GlobalIntelligenceNetwork/0.1' },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const raw = feed.extract(await response.json()).slice(0, 300);
      const entries = raw.filter(x => recent(dateISO(x.publishedAt), now))
        .slice(0, perFeed).map(x => record(x, {
          source: feed.id, domain: feed.domain, kind: feed.kind,
          classification: 'official-record', now,
        })).filter(Boolean);
      return { id: feed.id, status: 'ok', inspected: raw.length, accepted: entries.length, entries };
    } catch (err) {
      return { id: feed.id, status: 'failed', accepted: 0, error: short(err.message, 200), entries: [] };
    }
  }));
  return {
    status: jobs.map(({ entries, ...rest }) => rest),
    entries: unique(jobs.flatMap(x => x.entries)),
  };
}

const decode = text => String(text ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
function xmlTag(block, name) {
  const found = block.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '>', 'i'));
  return found ? decode(found[1].trim()) : '';
}
export function parseNewsRSS(xml) {
  return [...String(xml).matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)]
    .map(match => ({
      title: xmlTag(match[1], 'title'),
      url: xmlTag(match[1], 'link'),
      publishedAt: xmlTag(match[1], 'pubDate'),
      description: xmlTag(match[1], 'description').replace(/<[^>]*>/g, ''),
    })).filter(x => x.title && canonicalUrl(x.url));
}
export async function fetchNews(query, fetchImpl = fetch) {
  const url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(query + ' when:14d') +
    '&hl=en-US&gl=US&ceid=US:en';
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/rss+xml, application/xml' },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error('RSS HTTP ' + response.status);
  return parseNewsRSS(await response.text());
}
export async function fetchRoles({ now = new Date().toISOString(), roles = queriesFor(now),
  newsSearch = fetchNews, fetchImpl = fetch, perRole = 3 } = {}) {
  const results = [];
  let next = 0;
  async function worker() {
    while (next < roles.length) {
      const task = roles[next++];
      try {
        const found = await newsSearch(task.query, fetchImpl);
        const entries = found.filter(x => recent(dateISO(x.publishedAt), now, 21))
          .slice(0, perRole).map(x => record(x, {
            source: 'news-rss', domain: task.id,
            kind: 'public-reporting', classification: 'unverified-lead', now,
          })).filter(Boolean);
        results.push({ role: task.id, status: 'ok', inspected: found.length, entries });
      } catch (err) {
        results.push({ role: task.id, status: 'failed', error: short(err.message), entries: [] });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, roles.length) }, () => worker()));
  results.sort((a,b) => roles.findIndex(r => r.id === a.role) - roles.findIndex(r => r.id === b.role));
  return {
    status: results.map(({ entries, ...rest }) => ({ ...rest, accepted: entries.length })),
    entries: unique(results.flatMap(x => x.entries)),
  };
}
export async function collect({ now = new Date().toISOString(), fetchImpl = fetch,
  feeds = OFFICIAL_FEEDS, roles = queriesFor(now), newsSearch = fetchNews } = {}) {
  const [official, discovery] = await Promise.all([
    fetchOfficial({ now, fetchImpl, feeds }),
    fetchRoles({ now, fetchImpl, roles, newsSearch }),
  ]);
  return {
    generatedAt: now,
    officialSourceStatus: official.status,
    researchRoleStatus: discovery.status,
    observations: unique([...official.entries, ...discovery.entries]),
  };
}
