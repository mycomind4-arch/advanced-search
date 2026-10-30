// Never convert publication frequency, joint drill calendars or repeated headlines into event predictions.
export function titleFingerprint(title) {
  return String(title ?? '').normalize('NFKC').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
}
export function candidatesForReview(items) {
  const groups = new Map();
  for (const item of items) {
    if (item.classification !== 'official-record') continue;
    const key = titleFingerprint(item.title);
    if (!key || key.length < 22) continue;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return [...groups.values()].flatMap(records => {
    const publishers = [...new Set(records.map(x => x.source))];
    return publishers.length > 1 ? [{
      title: records[0].title,
      publishers, ids: records.map(x => x.id),
      status: 'human-source-review-required', independentlyVerified: false,
    }] : [];
  });
}

export function compareSamples(current, previous) {
  if (!previous) return { baselineAvailable: false, newInSample: null,
    absentFromSample: null, newObservationIds: [] };
  const oldIds = new Set((previous.observations ?? []).map(x => x.id));
  const newIds = new Set((current.observations ?? []).map(x => x.id));
  const newInSample = current.observations.filter(x => !oldIds.has(x.id));
  const healthy = new Set(current.officialSourceStatus
    .filter(x => x.status === 'ok').map(x => x.id));
  const absent = (previous.observations ?? []).filter(x =>
    !newIds.has(x.id) && x.classification === 'official-record' && healthy.has(x.source));
  return {
    baselineAvailable: true, previousRunId: previous.runId,
    newInSample: newInSample.length,
    newOfficialRecords: newInSample.filter(x => x.classification === 'official-record').length,
    newUnverifiedLeads: newInSample.filter(x => x.classification === 'unverified-lead').length,
    absentFromSample: absent.length,
    newObservationIds: newInSample.map(x => x.id),
    note: 'Run-to-run sample differences are not necessarily new or resolved world events.',
  };
}

export function makeReport(collected, previous = null) {
  if (!collected || !Array.isArray(collected.observations) ||
    !Array.isArray(collected.officialSourceStatus) ||
    !Array.isArray(collected.researchRoleStatus)) {
    throw new Error('Invalid research collection result');
  }
  const official = collected.observations.filter(x => x.classification === 'official-record');
  const leads = collected.observations.filter(x => x.classification === 'unverified-lead');
  const comparisons = compareSamples(collected, previous);
  const candidates = candidatesForReview(collected.observations);
  return {
    schemaVersion: 1,
    runId: String(collected.generatedAt).replace(/[^0-9]/g, '').slice(0, 17),
    generatedAt: collected.generatedAt,
    horizonDays: 90,
    officialSourceStatus: collected.officialSourceStatus,
    researchRoleStatus: collected.researchRoleStatus,
    counts: {
      officialRecords: official.length,
      unverifiedLeads: leads.length,
      failedOfficialSources: collected.officialSourceStatus.filter(x => x.status === 'failed').length,
      failedRoleSearches: collected.researchRoleStatus.filter(x => x.status === 'failed').length,
    },
    comparisons,
    reviewCandidates: candidates,
    assessment: {
      coordinatedGlobalEvent: 'not-established',
      predictedEventDate: null,
      independentlyVerifiedClaims: 0,
      meaning: 'The system records public data and generates leads; it does not establish hidden coordination, causal connections or a date for a global catastrophe.',
      limitations: 'Official publication establishes a source record, not the truth of all associated claims. Search news is unverified. Feeds are bounded samples; failures reduce coverage.',
    },
    observations: collected.observations,
  };
}
export function updateIndex(index, report, { maxEntries = 400, retentionDays = 100 } = {}) {
  const earliest = Date.parse(report.generatedAt) - retentionDays * 86400_000;
  const current = {
    runId: report.runId, generatedAt: report.generatedAt,
    counts: report.counts,
    newInSample: report.comparisons?.newInSample ?? null,
    reviewCandidateCount: report.reviewCandidates?.length ?? 0,
  };
  const entries = [current, ...(index?.entries ?? [])]
    .filter(x => Number.isFinite(Date.parse(x.generatedAt)) && Date.parse(x.generatedAt) >= earliest)
    .filter((x, i, all) => all.findIndex(y => y.runId === x.runId) === i)
    .sort((a,b) => b.generatedAt.localeCompare(a.generatedAt))
    .slice(0, maxEntries);
  return { schemaVersion: 1, updatedAt: report.generatedAt,
    retentionDays, entries };
}
