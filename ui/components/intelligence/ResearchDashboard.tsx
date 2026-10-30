'use client';

import React, { useMemo, useState } from 'react';

type Observation = {
  id: string; domain: string; source: string; url: string; title: string;
  summary?: string; publishedAt?: string | null;
  verification: 'official-source-record' | 'unverified-lead' | string;
};
type SourceStatus = { source: string; status: string; accepted: number; inspected?: number; error?: string };
type ReviewCandidate = {
  title: string; officialPublishers: string[];
  independentlyCorroborated: boolean; assessment: string;
};
type ResearchReport = {
  runId: string; generatedAt: string;
  counts: { officialRecords: number; unverifiedLeads: number; failedOfficialSources: number };
  sourceStatus: SourceStatus[];
  observations: Observation[];
  assessment?: { coordinatedGlobalEvent?: string; predictedDate?: string | null };
  changes?: {
    baselineAvailable: boolean; newlyObserved: number | null;
    newlyObservedOfficial: number | null; newInSample?: number;
    newlyObservedIds: string[]; notSeenInCurrentSample: number | null;
    reviewCandidates: ReviewCandidate[]; independentlyVerifiedClaims: number;
  };
};
type HistoryIndex = {
  updatedAt: string;
  retentionWindowDays: number;
  runs: Array<{ id: string; generatedAt: string; officialRecords: number;
    unverifiedLeads: number; failedSources: number; newOfficial?: number | null;
    reviewCandidates?: number }>;
};
type Props = { latest: unknown; history: unknown };

const root: React.CSSProperties = { padding: '24px', maxWidth: 1500, margin: '0 auto' };
const card: React.CSSProperties = {
  border: '1px solid var(--border-default)', background: 'var(--bg-elevated)',
  padding: 18, borderRadius: 12,
};
const label: React.CSSProperties = { color: 'var(--text-muted)', fontSize: 12 };
const muted: React.CSSProperties = { color: 'var(--text-muted)' };
const ghost: React.CSSProperties = {
  background: 'var(--bg-input)', border: '1px solid var(--border-default)',
  borderRadius: 8, padding: '8px 11px', color: 'var(--text-primary)',
};
const pretty = (date?: string | null) => {
  if (!date || !Number.isFinite(Date.parse(date))) return 'Unknown date';
  return new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};
function isReport(value: unknown): value is ResearchReport {
  if (!value || typeof value !== 'object') return false;
  const x = value as Partial<ResearchReport>;
  return typeof x.runId === 'string' && Array.isArray(x.observations) &&
    Array.isArray(x.sourceStatus) && typeof x.generatedAt === 'string' &&
    typeof x.counts?.officialRecords === 'number';
}
function isIndex(value: unknown): value is HistoryIndex {
  return Boolean(value && typeof value === 'object' &&
    Array.isArray((value as HistoryIndex).runs));
}
const officialText = (verification: string) =>
  verification === 'official-source-record' ? 'Official publication' : 'Unverified lead';
const permittedLink = (value: string) => {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch { return null; }
};
function Metric({ name, value, detail }: { name: string; value: React.ReactNode; detail: string }) {
  return <div style={card}>
    <div style={label}>{name}</div>
    <div style={{ fontSize: 30, fontWeight: 720, marginTop: 7, letterSpacing: '-0.04em' }}>{value}</div>
    <div style={{ ...muted, fontSize: 11, marginTop: 4 }}>{detail}</div>
  </div>;
}

export default function ResearchDashboard({ latest, history }: Props) {
  const [term, setTerm] = useState('');
  const [source, setSource] = useState('all');
  const [kind, setKind] = useState('all');
  const [newOnly, setNewOnly] = useState(false);
  const report = isReport(latest) ? latest : null;
  const index = isIndex(history) ? history : null;
  const sources = useMemo(() => {
    return [...new Set((report?.observations ?? []).map((x) => x.source))].sort();
  }, [report]);
  const newIds = useMemo(() => new Set(report?.changes?.newlyObservedIds ?? []), [report]);
  const entries = useMemo(() => (report?.observations ?? []).filter((x) => {
    if (source !== 'all' && x.source !== source) return false;
    if (kind !== 'all' && x.verification !== kind) return false;
    if (newOnly && !newIds.has(x.id)) return false;
    const q = term.toLowerCase().trim();
    return !q || [x.title, x.summary, x.domain, x.source].some((v) => (v ?? '').toLowerCase().includes(q));
  }), [report, source, kind, newOnly, newIds, term]);
  const trends = useMemo(() => [...(index?.runs ?? [])].slice(0, 32).reverse(), [index]);
  const peak = Math.max(1, ...trends.map((r) => (r.officialRecords ?? 0) + (r.unverifiedLeads ?? 0)));

  return <div className="main-content-scroll">
    <main style={root}>
      <header style={{ marginBottom: 22, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: 'var(--accent-hover)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Research operations / 90-day horizon</div>
          <h1 style={{ fontSize: 27, fontWeight: 750, margin: '5px 0 6px' }}>Global Intelligence Network</h1>
          <div style={{ ...muted, fontSize: 13 }}>
            Source evidence, run-to-run changes, and skeptical verification.
          </div>
        </div>
        <a style={{ ...ghost, fontSize: 12 }} href="https://github.com/mycomind4-arch/advanced-search/actions/workflows/global-intelligence.yml" target="_blank" rel="noreferrer">Research executions ↗</a>
      </header>

      {!report ? <div style={card} role="status">
        <h2 style={{ marginTop: 0 }}>No published history yet</h2>
        <p style={muted}>The collector can run without publishing a historical dataset. The first successful default-branch publication will populate this dashboard. This is not evidence that no emergencies exist.</p>
        <a href="https://github.com/mycomind4-arch/advanced-search/actions/workflows/global-intelligence.yml" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-hover)' }}>Inspect collection and publication checks ↗</a>
      </div> : <>
        <div style={{ ...card, marginBottom: 16, borderColor: 'var(--border-strong)', background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
            <div><strong style={{ fontSize: 13 }}>Latest research run</strong>
              <div style={{ ...muted, fontSize: 12, marginTop: 3 }}>{pretty(report.generatedAt)} · Run {report.runId.slice(0, 12)}</div></div>
            <span style={{ fontSize: 12, background: 'var(--warning-muted)', color: 'var(--warning)', borderRadius: 50, padding: '6px 11px' }}>
              Global event prediction: not established
            </span>
          </div>
          <p style={{ ...muted, fontSize: 12, marginBottom: 0 }}>These are bounded samples of publicly available records. Multiple alerts or scheduled exercises do not imply one connected event. Sources are identified, but independent corroboration requires additional review.</p>
        </div>

        <section aria-label="Research statistics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 12, marginBottom: 18 }}>
          <Metric name="Official publications" value={report.counts.officialRecords} detail="Publication confirmed, not event prediction" />
          <Metric name="Unverified leads" value={report.counts.unverifiedLeads} detail="News and public-search discovery" />
          <Metric name="New to sampled runs" value={report.changes?.newlyObserved ?? '—'} detail={report.changes?.baselineAvailable ? 'Not necessarily a newly occurring event' : 'No prior baseline available'} />
          <Metric name="History snapshots" value={index?.runs.length ?? '—'} detail="Indexed run history, capped at 100 days" />
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 14, marginBottom: 18 }}>
          <div style={card}>
            <h2 style={{ margin: '0 0 8px', fontSize: 15 }}>Collection history</h2>
            <p style={{ ...muted, fontSize: 12, margin: 0 }}>Latest {trends.length} runs · official vs unverified counts</p>
            {trends.length > 0 ? <div style={{ display: 'flex', gap: 3, alignItems: 'end', height: 140, marginTop: 20 }}>
              {trends.map((run) => {
                const officialH = (run.officialRecords / peak) * 120;
                const leadH = (run.unverifiedLeads / peak) * 120;
                return <div key={run.id} title={pretty(run.generatedAt) + ': ' + run.officialRecords + ' official, ' + run.unverifiedLeads + ' leads'} style={{ flex: 1, minWidth: 3, display: 'flex', flexDirection: 'column', justifyContent: 'end', height: 130 }}>
                  <div style={{ height: leadH, background: 'var(--warning)', opacity: 0.75, borderRadius: '3px 3px 0 0' }} />
                  <div style={{ height: officialH, background: 'var(--accent-hover)', borderRadius: '0 0 2px 2px' }} />
                </div>;
              })}
            </div> : <p style={muted}>Awaiting historical snapshots.</p>}
            <div style={{ display: 'flex', gap: 15, marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
              <span><span style={{ color: 'var(--accent-hover)' }}>■</span> Official records</span>
              <span><span style={{ color: 'var(--warning)' }}>■</span> Unverified leads</span>
            </div>
            <p style={{ ...muted, fontSize: 11 }}>Counts are capped per feed and reflect collection coverage, not incident severity.</p>
          </div>

          <div style={card}>
            <h2 style={{ margin: '0 0 11px', fontSize: 15 }}>Official source health</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {report.sourceStatus.map((status) => <div key={status.source} style={{ padding: 11, background: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 12, fontWeight: 620, display: 'flex', justifyContent: 'space-between', gap: 5 }}>
                  <span style={{ overflowWrap: 'anywhere' }}>{status.source}</span>
                  <span title={status.error || status.status} style={{ color: status.status === 'ok' ? 'var(--success)' : 'var(--error)' }}>●</span>
                </div>
                <div style={{ ...muted, fontSize: 11, marginTop: 4 }}>{status.status === 'ok' ? status.accepted + ' accepted' : 'Failed'}</div>
              </div>)}
            </div>
            <p style={{ ...muted, fontSize: 11 }}>Feed failures indicate unavailable coverage, not a lack of events.</p>
          </div>
        </section>

        <section style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ fontSize: 15, margin: '0 0 7px' }}>Independent evidence review</h2>
          <p style={{ ...muted, fontSize: 12 }}>The system found {report.changes?.reviewCandidates.length ?? 0} similar-title cross-publisher candidates. These require manual comparison of the underlying claims, provenance and publishing relationships.</p>
          {(report.changes?.reviewCandidates.length ?? 0) > 0
            ? report.changes?.reviewCandidates.slice(0, 4).map((x) => <div key={x.title} style={{ padding: 10, border: '1px solid var(--border-subtle)', borderRadius: 8, marginBottom: 8 }}>
                <strong style={{ fontSize: 12 }}>{x.title}</strong>
                <div style={{ ...muted, fontSize: 11 }}>{x.officialPublishers.join(' · ')} · Needs independent review</div>
              </div>)
            : <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>No cross-agency claims established in this run. Syndicated headlines are not counted as independent corroboration.</p>}
          <div style={{ color: 'var(--warning)', fontSize: 12 }}>Independently verified claims: {report.changes?.independentlyVerifiedClaims ?? 0} (automated verification is intentionally conservative)</div>
        </section>

        <section style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 14 }}>
            <div><h2 style={{ margin: 0, fontSize: 16 }}>Evidence ledger</h2><div style={{ ...muted, fontSize: 12, marginTop: 4 }}>{entries.length} matching records</div></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <input value={term} onChange={(e) => setTerm(e.target.value)} aria-label="Search evidence" placeholder="Search evidence..." style={{ ...ghost, width: 185 }} />
              <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Filter source" style={ghost}>
                <option value="all">All sources</option>
                {sources.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filter verification" style={ghost}>
                <option value="all">All classifications</option>
                <option value="official-source-record">Official publications</option>
                <option value="unverified-lead">Unverified leads</option>
              </select>
              <label style={{ ...muted, display: 'flex', gap: 5, alignItems: 'center', fontSize: 12 }}>
                <input type="checkbox" checked={newOnly} onChange={(e) => setNewOnly(e.target.checked)} /> New to sample
              </label>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12, minWidth: 670 }}>
              <thead><tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>
                {['Evidence / source', 'Domain', 'Published', 'Classification'].map((x) =>
                  <th key={x} style={{ padding: '10px 8px', fontWeight: 600 }}>{x}</th>)}
              </tr></thead>
              <tbody>
                {entries.slice(0, 120).map((x) => <tr key={x.id} style={{ borderBottom: '1px solid var(--border-subtle)', verticalAlign: 'top' }}>
                  <td style={{ padding: '12px 8px', maxWidth: 430 }}>
                    {permittedLink(x.url)
                      ? <a href={permittedLink(x.url) || '#'} target="_blank" rel="noreferrer" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{x.title} ↗</a>
                      : <strong>{x.title}</strong>}
                    {newIds.has(x.id) && <span style={{ marginLeft: 8, color: 'var(--accent-hover)', fontSize: 11 }}>New to sample</span>}
                    <div style={{ ...muted, fontSize: 11, marginTop: 4 }}>{x.source}</div>
                  </td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{x.domain}</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{pretty(x.publishedAt)}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <span style={{ color: x.verification === 'official-source-record' ? 'var(--accent-hover)' : 'var(--warning)' }}>{officialText(x.verification)}</span>
                  </td>
                </tr>)}
              </tbody>
            </table>
            {entries.length === 0 && <p style={{ ...muted, padding: 14 }}>No evidence matches the selected filters.</p>}
          </div>
        </section>
        <footer style={{ ...muted, fontSize: 11, padding: '15px 0 4px' }}>
          Live source collection is limited to approved public endpoints. Report history is published on a separate branch. No threat score or predicted catastrophe date is generated.
        </footer>
      </>}
    </main>
  </div>;
}
