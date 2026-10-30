// Pure analysis functions; no claim here constitutes a verified prediction.
const keyOf = (r) => typeof r?.id === 'string' ? r.id : null;
const stableTitle = (r) => {
  let title = String(r?.title ?? '').normalize('NFKC').toLowerCase();
  // News aggregator publisher suffixes do not count as separate primary sources.
  if (r?.source === 'google-news-rss') {
    title = title.replace(/\s+-\s+[^-]{2,45}$/, '');
  }
  return title.replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
};
const validTime = (x) => typeof x === 'string' && Number.isFinite(Date.parse(x));
const sourceAvailable = (entry, report) => {
  const status = (report.sourceStatus ?? []).find((s) => s.source === entry.source);
  if (status) return status.status === 'ok';
  // The ten public search topics are bounded and their absence means nothing.
  return false;
};

export function reviewCrossSourceCandidates(observations = []) {
  const groups = new Map();
  for (const item of observations) {
    const fingerprint = stableTitle(item);
    if (!fingerprint || fingerprint.length < 20) continue;
    const group = groups.get(fingerprint) ?? [];
    group.push(item);
    groups.set(fingerprint, group);
  }
  return [...groups.entries()].flatMap(([fingerprint, members]) => {
    // Only distinct *official* publishers are eligible. Repeated RSS stories,
    // different URLs on a common aggregator, and reprints never qualify.
    const official = members.filter((m) => m.verification === 'official-source-record');
    const publishers = [...new Set(official.map((m) => m.source))];
    if (publishers.length < 2) return [];
    return [{
      fingerprint,
      title: official[0]?.title ?? fingerprint,
      officialPublishers: publishers,
      recordIds: official.map((m) => m.id),
      assessment: 'requires-independent-source-review',
      independentlyCorroborated: false,
      caution: 'Two agencies published similarly titled records. Their independence and underlying claims have not been verified.',
    }];
  });
}

export function compareReports(current, previous = null) {
  const prior = new Map((previous?.observations ?? []).filter((x) => keyOf(x)).map((x) => [x.id, x]));
  const now = new Set((current.observations ?? []).map(keyOf).filter(Boolean));
  const added = (current.observations ?? []).filter((r) => keyOf(r) && !prior.has(r.id));
  const notSeen = [...prior.values()].filter((r) => !now.has(r.id) && sourceAvailable(r, current));
  const candidates = reviewCrossSourceCandidates(current.observations);
  return {
    baselineRunId: previous?.runId ?? null,
    baselineAvailable: Boolean(previous),
    newlyObserved: previous ? added.length : null,
    newlyObservedOfficial: previous ? added.filter((x) => x.verification === 'official-source-record').length : null,
    newlyObservedLeads: previous ? added.filter((x) => x.verification === 'unverified-lead').length : null,
    notSeenInCurrentSample: previous ? notSeen.length : null,
    newlyObservedIds: previous ? added.map((x) => x.id) : [],
    reviewCandidates: candidates,
    independentlyVerifiedClaims: 0,
    limits: [
      'Newly observed means new to two bounded collection snapshots, not a newly occurring event.',
      'Records not seen may have aged out, been truncated or changed; absence is not resolution.',
      'Two publications are not automatically two independent investigations.',
      'No automated evidence establishes a coordinated global event or predicts its date.',
    ],
  };
}

export function buildHistory(current, previous, oldIndex = null, { maxRuns = 400, days = 100 } = {}) {
  if (!current || typeof current.runId !== 'string' || !validTime(current.generatedAt)
    || !Array.isArray(current.observations) || !Array.isArray(current.sourceStatus)) {
    throw new Error('Invalid intelligence report');
  }
  const changes = compareReports(current, previous);
  const updated = { ...current, changes };
  const path = 'intelligence/data/snapshots/' +
    current.generatedAt.slice(0, 10).replace(/-/g, '/') + '/' + current.runId + '.json';
  const entry = {
    id: current.runId, generatedAt: current.generatedAt, path,
    officialRecords: current.counts?.officialRecords ?? 0,
    unverifiedLeads: current.counts?.unverifiedLeads ?? 0,
    failedSources: current.counts?.failedOfficialSources ?? 0,
    newOfficial: changes.newlyObservedOfficial,
    newLeads: changes.newlyObservedLeads,
    notSeenInSample: changes.notSeenInCurrentSample,
    reviewCandidates: changes.reviewCandidates.length,
  };
  const minDate = Date.parse(current.generatedAt) - days * 86400000;
  const rows = [entry, ...(oldIndex?.runs ?? [])]
    .filter((e) => validTime(e.generatedAt) && Date.parse(e.generatedAt) >= minDate)
    .filter((e, i, all) => all.findIndex((z) => z.id === e.id) === i)
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
    .slice(0, maxRuns);
  return {
    latest: updated,
    index: { schemaVersion: 1, updatedAt: current.generatedAt, retentionWindowDays: days, runs: rows },
    snapshotPath: path,
  };
}
