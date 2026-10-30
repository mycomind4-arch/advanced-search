// Research topics are independent watchlists, not ten autonomous language models.
// Official feeds expose only publicly available government science/administrative records.
export const ROLES = Object.freeze([
  { id: 'government', title: 'Government Preparedness', query: 'FEMA emergency response exercises official public notice' },
  { id: 'military', title: 'Military Activity', query: 'NATO military exercise schedule official announcement' },
  { id: 'geopolitics', title: 'Geopolitical Risk', query: 'diplomatic crisis security advisory government' },
  { id: 'finance', title: 'Financial Stability', query: 'central bank financial stability emergency liquidity warning' },
  { id: 'infrastructure-cyber', title: 'Cyber and Infrastructure', query: 'CISA cybersecurity critical infrastructure advisory' },
  { id: 'public-health', title: 'Public Health', query: 'WHO disease outbreak notice surveillance' },
  { id: 'earth-space', title: 'Earth and Space Hazards', query: 'NOAA severe weather geomagnetic storm alert' },
  { id: 'open-source-media', title: 'Open-Source Reporting', query: 'emergency preparedness public drills global news' },
  { id: 'public-records', title: 'Government Records', query: 'Federal Register emergency preparedness rule notice' },
  { id: 'skeptical-verification', title: 'Skeptical Verification', query: 'fact check emergency exercise rumors conventional explanations' },
]);

export function queriesFor(asOf = new Date()) {
  const date = new Date(asOf);
  if (!Number.isFinite(date.valueOf())) throw new TypeError('Invalid research date');
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 3, 1));
  const range = date.toISOString().slice(0, 7) + ' through ' + next.toISOString().slice(0, 7);
  return ROLES.map(r => ({ ...r, query: r.query + ' ' + range }));
}

export const OFFICIAL_FEEDS = Object.freeze([
  {
    id: 'usgs', domain: 'earth-space', kind: 'observed-hazard',
    url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson',
    extract: j => (j.features ?? []).map(x => ({
      url: x.properties?.url, title: x.properties?.title,
      description: 'Recorded significant earthquake; not a future-event forecast',
      publishedAt: x.properties?.time ? new Date(x.properties.time).toISOString() : null,
    })),
  },
  {
    id: 'noaa-space-weather', domain: 'earth-space', kind: 'forecast-or-alert',
    url: 'https://services.swpc.noaa.gov/products/alerts.json',
    extract: j => (Array.isArray(j) ? j : []).map(x => ({
      url: 'https://www.swpc.noaa.gov/products/alerts-watches-and-warnings',
      title: x.message?.slice(0, 170) || 'NOAA space weather alert',
      description: x.message, publishedAt: x.issue_datetime,
    })),
  },
  {
    id: 'nasa-natural-events', domain: 'earth-space', kind: 'observed-hazard',
    url: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=75',
    extract: j => (j.events ?? []).map(x => ({
      url: x.link, title: x.title,
      description: 'Ongoing event (may have begun much earlier than this report)',
      publishedAt: x.geometry?.at(-1)?.date,
    })),
  },
  {
    id: 'cisa-exploited-vulnerabilities', domain: 'infrastructure-cyber', kind: 'security-advisory',
    url: 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
    extract: j => (j.vulnerabilities ?? [])
      .slice().sort((a,b) => (b.dateAdded ?? '').localeCompare(a.dateAdded ?? ''))
      .slice(0, 150).map(x => ({
        url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
        title: (x.cveID ?? 'CVE') + ': ' + (x.vulnerabilityName ?? 'Vulnerability'),
        description: x.shortDescription, publishedAt: x.dateAdded,
      })),
  },
  {
    id: 'federal-register', domain: 'public-records', kind: 'government-publication',
    url: 'https://www.federalregister.gov/api/v1/documents.json?per_page=30&order=newest&conditions%5Bterm%5D=emergency%20preparedness',
    extract: j => (j.results ?? []).map(x => ({
      url: x.html_url, title: x.title, description: x.abstract ?? x.type, publishedAt: x.publication_date,
    })),
  },
  {
    id: 'fema-declarations', domain: 'government', kind: 'government-declaration',
    url: 'https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=50&$orderby=declarationDate%20desc',
    extract: j => (j.DisasterDeclarationsSummaries ?? []).map(x => ({
      url: 'https://www.fema.gov/disaster/' + encodeURIComponent(x.disasterNumber),
      title: 'FEMA disaster declaration ' + x.disasterNumber + ': ' + (x.declarationTitle ?? x.incidentType ?? ''),
      description: 'State: ' + (x.state ?? '') + '; type: ' + (x.declarationType ?? ''),
      publishedAt: x.declarationDate,
    })),
  },
]);
