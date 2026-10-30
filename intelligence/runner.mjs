import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const DOMAINS = [
  'government', 'military', 'geopolitics', 'finance',
  'infrastructure-cyber', 'public-health', 'earth-space',
  'open-source-media', 'public-records', 'skeptical-verification',
];

export const SEARCH_TASKS = [
  ['government', 'FEMA emergency exercise November 2026 national alert'],
  ['military', 'military NATO exercises November December 2026'],
  ['geopolitics', 'international crisis security warnings October 2026'],
  ['finance', 'central bank financial stability liquidity October 2026'],
  ['infrastructure-cyber', 'CISA critical infrastructure cyber advisory October 2026'],
  ['public-health', 'WHO disease outbreak emergency October 2026'],
  ['earth-space', 'NOAA space weather hazards October 2026'],
  ['open-source-media', 'emergency preparedness government drills November 2026'],
  ['public-records', 'federal register emergency preparedness exercise October 2026'],
  ['skeptical-verification', 'FEMA emergency alert routine exercise fact check 2026'],
];

const MAX_PER_SOURCE = 12;
const MAX_AGE_DAYS = 45;
const idFor = (v) => createHash('sha256').update(v).digest('hex').slice(0, 24);
const shorten = (v, n = 450) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const dateString = (s) => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.valueOf()) ? null : d.toISOString();
};
const withinDays = (date, now, days = MAX_AGE_DAYS) =>
  Boolean(date && Date.parse(date) <= Date.parse(now) + 86400000 &&
    Date.parse(date) >= Date.parse(now) - days * 86400000);

export function canonicalUrl(raw) {
  try {
    const u = new URL(raw);
    if (!['https:', 'http:'].includes(u.protocol)) return null;
    u.hash = '';
    u.hostname = u.hostname.toLowerCase();
    for (const k of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|mc_)/i.test(k)) u.searchParams.delete(k);
    }
    if (u.pathname !== '/') u.pathname = u.pathname.replace(/\/+$/, '');
    u.searchParams.sort();
    return u.toString();
  } catch { return null; }
}

export function makeRecord(data, now) {
  const url = canonicalUrl(data.url);
  if (!url || !data.title) return null;
  const publishedAt = dateString(data.publishedAt);
  return {
    id: idFor(url + '|' + String(data.source) + '|' + String(data.title)),
    domain: data.domain,
    source: data.source,
    url,
    title: shorten(data.title, 230),
    summary: shorten(data.summary),
    publishedAt,
    collectedAt: now,
    type: data.type,
    verification: data.verification ?? 'official-source-record',
    independentlyCorroborated: false,
    predictedEventDate: null,
  };
}

export function consolidate(records) {
  const unique = new Map();
  for (const r of records) {
    if (!r) continue;
    const key = r.url + '|' + r.title.toLowerCase();
    const existing = unique.get(key);
    if (!existing || (existing.verification === 'unverified-lead' && r.verification !== 'unverified-lead')) {
      unique.set(key, r);
    }
  }
  return [...unique.values()].sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
}

export const FEEDS = [
  {
    id: 'usgs', domain: 'earth-space', type: 'observed-hazard',
    url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson',
    extract: (j) => (j.features ?? []).map((x) => ({
      url: x.properties?.url, title: x.properties?.title,
      summary: 'USGS significant earthquake feed; observed event, not a future prediction.',
      publishedAt: new Date(x.properties?.time ?? 0).toISOString(),
    })),
  },
  {
    id: 'noaa-swpc', domain: 'earth-space', type: 'alert-or-forecast',
    url: 'https://services.swpc.noaa.gov/products/alerts.json',
    extract: (j) => (Array.isArray(j) ? j : []).map((x) => ({
      url: 'https://www.swpc.noaa.gov/products/alerts-watches-and-warnings',
      title: shorten(x.message, 190) || 'NOAA SWPC alert',
      summary: shorten(x.message, 400),
      publishedAt: x.issue_datetime,
    })),
  },
  {
    id: 'nasa-eonet', domain: 'earth-space', type: 'observed-hazard',
    url: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=75',
    extract: (j) => (j.events ?? []).map((x) => ({
      url: x.link, title: x.title,
      summary: 'NASA EONET open natural event; ongoing does not mean newly started.',
      publishedAt: x.geometry?.at(-1)?.date,
    })),
  },
  {
    id: 'cisa-kev', domain: 'infrastructure-cyber', type: 'security-advisory',
    url: 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
    extract: (j) => (j.vulnerabilities ?? []).slice(-200).map((x) => ({
      url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
      title: x.cveID + ': ' + x.vulnerabilityName,
      summary: x.shortDescription,
      publishedAt: x.dateAdded,
    })),
  },
  {
    id: 'federal-register', domain: 'public-records', type: 'government-publication',
    url: 'https://www.federalregister.gov/api/v1/documents.json?per_page=25&order=newest&conditions%5Bterm%5D=emergency%20preparedness',
    extract: (j) => (j.results ?? []).map((x) => ({
      url: x.html_url, title: x.title,
      summary: x.abstract || x.type,
      publishedAt: x.publication_date,
    })),
  },
  {
    id: 'fema-declarations', domain: 'government', type: 'disaster-declaration',
    url: 'https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=40&$orderby=declarationDate%20desc',
    extract: (j) => (j.DisasterDeclarationsSummaries ?? []).map((x) => ({
      url: 'https://www.fema.gov/disaster/' + encodeURIComponent(x.disasterNumber),
      title: 'FEMA declaration ' + x.disasterNumber + ': ' + (x.declarationTitle || x.incidentType || 'Disaster'),
      summary: 'State: ' + (x.state ?? '') + '; declaration type: ' + (x.declarationType ?? ''),
      publishedAt: x.declarationDate,
    })),
  },
];

export async function collectOfficial({ fetchImpl = fetch, now = new Date().toISOString(), feeds = FEEDS } = {}) {
  const jobs = await Promise.all(feeds.map(async (feed) => {
    try {
      const response = await fetchImpl(feed.url, {
        headers: { Accept: 'application/json', 'User-Agent': 'GlobalIntelligenceResearch/0.1 (public-data)' },
        signal: AbortSignal.timeout(11000),
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const parsed = feed.extract(await response.json()).slice(0, 250);
      const records = parsed
        .filter((x) => withinDays(dateString(x.publishedAt), now))
        .slice(0, MAX_PER_SOURCE)
        .map((x) => makeRecord({ ...x, domain: feed.domain, source: feed.id, type: feed.type }, now))
        .filter(Boolean);
      return { source: feed.id, status: 'ok', records, inspected: parsed.length };
    } catch (e) {
      return { source: feed.id, status: 'failed', records: [], error: shorten(e.message, 180) };
    }
  }));
  return {
    sources: jobs.map(({ records, ...rest }) => ({ ...rest, accepted: records.length })),
    records: consolidate(jobs.flatMap((x) => x.records)),
  };
}

export async function collectSearchLeads({ searchFn, now = new Date().toISOString(), tasks = SEARCH_TASKS } = {}) {
  if (!searchFn) return { records: [], searches: [], status: 'not-configured' };
  const searches = [];
  const records = [];
  for (const [domain, query] of tasks) {
    try {
      const observations = await searchFn(query, domain);
      const selected = observations.slice(0, 3);
      for (const x of selected) {
        const rec = makeRecord({
          domain, source: x.provider, type: 'unverified-public-mention',
          verification: 'unverified-lead',
          url: x.sourceUrl, title: x.title,
          summary: x.snippet, publishedAt: x.publishedAt,
        }, now);
        if (rec) records.push(rec);
      }
      searches.push({ domain, status: 'ok', count: selected.length });
    } catch (e) {
      searches.push({ domain, status: 'failed', error: shorten(e.message, 160) });
    }
  }
  return { records: consolidate(records), searches, status: 'completed' };
}

export async function searchWithExistingAdapters(query, domain) {
  const [{ AdapterRegistry }, { SearchOrchestrator }, { builtInAdapters }] = await Promise.all([
    import('../dist/src/core/registry.js'),
    import('../dist/src/core/orchestrator.js'),
    import('../dist/src/adapters/builtins.js'),
  ]);
  const registry = new AdapterRegistry();
  registry.registerMany(builtInAdapters.filter((x) =>
    ['duckduckgo', 'hackernews'].includes(x.id)));
  const orchestrator = new SearchOrchestrator(registry);
  return orchestrator.execute({
    id: 'intelligence-' + domain, mode: 'text', query,
    budget: { maxJobs: 2, timeoutMs: 8000 },
  });
}

export async function buildReport({
  fetchImpl = fetch, searchFn = searchWithExistingAdapters,
  now = new Date().toISOString(), feeds = FEEDS, tasks = SEARCH_TASKS,
} = {}) {
  const [official, publicSearch] = await Promise.all([
    collectOfficial({ fetchImpl, now, feeds }),
    collectSearchLeads({ searchFn, now, tasks }),
  ]);
  const observations = consolidate([...official.records, ...publicSearch.records]);
  return {
    schemaVersion: 1,
    runId: idFor(now),
    generatedAt: now,
    horizonDays: 90,
    sourceStatus: official.sources,
    agentStatus: publicSearch.searches,
    counts: {
      officialRecords: observations.filter((x) => x.verification === 'official-source-record').length,
      unverifiedLeads: observations.filter((x) => x.verification === 'unverified-lead').length,
      failedOfficialSources: official.sources.filter((x) => x.status === 'failed').length,
      agentsAttempted: publicSearch.searches.length,
    },
    assessment: {
      coordinatedGlobalEvent: 'not-established',
      predictedDate: null,
      rationale: 'Public notices, emergencies and scheduled exercises are not evidence of a common planned event. No automatic corroboration or causal inference is claimed.',
      limitation: 'This collector does not establish independence of reporting chains or prove a forecast. Human source validation is necessary.',
    },
    observations,
  };
}

export async function persistReport(report, { env = process.env, fetchImpl = fetch } = {}) {
  const endpoint = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!endpoint && !key) return { status: 'not-configured' };
  if (!endpoint || !key) return { status: 'incomplete-configuration' };
  const base = new URL(endpoint);
  if (base.protocol !== 'https:') return { status: 'invalid-endpoint' };
  const headers = {
    apikey: key, Authorization: 'Bearer ' + key,
    'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal',
  };
  const runPayload = {
    id: report.runId, generated_at: report.generatedAt,
    assessment: report.assessment, counts: report.counts,
    source_status: report.sourceStatus, agent_status: report.agentStatus,
  };
  const send = async (table, records, keyField) => {
    const u = new URL('/rest/v1/' + table + '?on_conflict=' + keyField, base);
    const res = await fetchImpl(u.toString(), {
      method: 'POST', headers, body: JSON.stringify(records),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error('Database ' + table + ' HTTP ' + res.status);
  };
  try {
    await send('intelligence_runs', [runPayload], 'id');
    if (report.observations.length) {
      await send('intelligence_observations',
        report.observations.map((x) => ({
          id: x.id, run_id: report.runId, url: x.url,
          domain: x.domain, source: x.source, title: x.title,
          published_at: x.publishedAt, verification: x.verification,
          payload: x,
        })), 'id');
    }
    return { status: 'stored', count: report.observations.length };
  } catch (e) {
    return { status: 'failed', error: shorten(e.message, 180) };
  }
}

async function main() {
  const outIndex = process.argv.indexOf('--out');
  const output = outIndex === -1 ? 'intelligence-report.json' : process.argv[outIndex + 1];
  if (!output || output.startsWith('-')) throw new Error('Invalid output path');
  const officialOnly = process.argv.includes('--official-only');
  const report = await buildReport({
    searchFn: officialOnly ? null : searchWithExistingAdapters,
  });
  const storage = await persistReport(report);
  report.storage = storage;
  await writeFile(output, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({
    runId: report.runId, generatedAt: report.generatedAt,
    counts: report.counts, storage: storage.status,
    officialSources: report.sourceStatus,
    leadingRecords: report.observations.slice(0, 12).map((x) => ({
      title: x.title, source: x.source, url: x.url,
      publishedAt: x.publishedAt, verification: x.verification,
    })),
    assessment: report.assessment,
  }, null, 2));
  if (report.sourceStatus.every((x) => x.status === 'failed')) {
    process.exitCode = 2;
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error('Run failed:', e.message); process.exitCode = 1; });
}
