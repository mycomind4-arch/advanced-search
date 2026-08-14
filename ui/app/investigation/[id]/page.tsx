'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import {
  ChevronDownIcon, SaveIcon, TagIcon, ExternalIcon, CopyIcon,
  EvidenceIcon, GraphIcon, TimelineIcon, EntitiesIcon, SourcesIcon,
  CheckIcon, AlertIcon, ClockIcon, XIcon,
} from '@/lib/icons';
import { EvidenceInspector } from '@/components/evidence/EvidenceInspector';

type Tab = 'overview' | 'results' | 'evidence' | 'entities' | 'graph' | 'timeline' | 'sources' | 'notes';

export default function InvestigationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { state, dispatch } = useApp();
  const [tab, setTab] = React.useState<Tab>('overview');

  const investigation = state.investigations.find((i) => i.id === params.id);

  if (!investigation) {
    return (
      <div className="main-content-scroll">
        <div className="empty-state" style={{ paddingTop: 120 }}>
          <div className="icon"><AlertIcon size={48} /></div>
          <div className="title">Investigation not found</div>
          <div className="desc">This investigation may have been deleted or never existed.</div>
          <div className="actions">
            <button className="btn btn-primary btn-sm" onClick={() => router.push('/')}>New Investigation</button>
          </div>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'results', label: 'Results', count: investigation.resultCount },
    { id: 'evidence', label: 'Evidence', count: investigation.evidence.length },
    { id: 'entities', label: 'Entities', count: investigation.entities.length },
    { id: 'graph', label: 'Graph' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'sources', label: 'Sources', count: investigation.sources.length },
    { id: 'notes', label: 'Notes' },
  ];

  return (
    <div className="inv-workspace">
      <div className="inv-header">
        <div className="inv-header-top">
          <div>
            <div className="inv-title">{investigation.title}</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
              {investigation.query}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => router.push('/search')}>
              <AlertIcon size={12} /> Re-run Search
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                dispatch({ type: 'DELETE_INVESTIGATION', id: investigation.id });
                router.push('/');
              }}
            >
              <XIcon size={12} /> Delete
            </button>
          </div>
        </div>
        <div className="inv-status-row">
          <span className="inv-stat">
            <span className={`status-dot ${investigation.status === 'active' ? '' : investigation.status === 'completed' ? 'warn' : 'error'}`} />
            <span className="value">{investigation.status}</span>
          </span>
          <span className="inv-stat">Mode: <span className="value">{investigation.mode}</span></span>
          <span className="inv-stat">Evidence: <span className="value">{investigation.evidence.length}</span></span>
          <span className="inv-stat">Entities: <span className="value">{investigation.entities.length}</span></span>
          <span className="inv-stat">Sources: <span className="value">{investigation.sources.filter((s) => s.configured).length}/{investigation.sources.length}</span></span>
          <span className="inv-stat">Created: <span className="value">{new Date(investigation.createdAt).toLocaleDateString()}</span></span>
        </div>
      </div>

      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && <span className="count">{t.count}</span>}
          </button>
        ))}
      </div>

      <div className="inv-body">
        <div className="inv-tab-content">
          {tab === 'overview' && <OverviewTab investigation={investigation} />}
          {tab === 'results' && <ResultsTab investigation={investigation} />}
          {tab === 'evidence' && <EvidenceTab investigation={investigation} />}
          {tab === 'entities' && <EntitiesTab investigation={investigation} />}
          {tab === 'graph' && <GraphTab investigation={investigation} />}
          {tab === 'timeline' && <TimelineTab investigation={investigation} />}
          {tab === 'sources' && <SourcesTab investigation={investigation} />}
          {tab === 'notes' && <NotesTab investigation={investigation} />}
        </div>
      </div>

      {state.inspectorOpen && <EvidenceInspector />}
    </div>
  );
}

function OverviewTab({ investigation }: { investigation: import('@/lib/types').Investigation }) {
  return (
    <div>
      <div className="inv-overview">
        <div className="stat-tile">
          <div className="label">Evidence Items</div>
          <div className="value">{investigation.evidence.length}</div>
          <div className="sub">Collected from results</div>
        </div>
        <div className="stat-tile">
          <div className="label">Resolved Entities</div>
          <div className="value">{investigation.entities.length}</div>
          <div className="sub">People, orgs, locations</div>
        </div>
        <div className="stat-tile">
          <div className="label">Sources Queried</div>
          <div className="value">{investigation.sources.filter((s) => s.configured).length}</div>
          <div className="sub">Of {investigation.sources.length} available</div>
        </div>
        <div className="stat-tile">
          <div className="label">Confidence</div>
          <div className="value">{Math.round(investigation.confidenceSummary.overall * 100) || '—'}%</div>
          <div className="sub">Overall assessment</div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <span className="card-title">Pipeline Stages</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {investigation.pipelineStages.map((stage) => (
            <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-xs)', padding: '6px 10px', background: 'var(--bg-input)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-subtle)' }}>
              <span className={`status-dot ${stage.status === 'completed' ? '' : stage.status === 'failed' ? 'error' : stage.status === 'running' ? '' : 'warn'}`} />
              <span>{stage.name}</span>
              <span className="text-dim">{stage.status}</span>
            </div>
          ))}
        </div>
      </div>

      {investigation.evidence.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Evidence</span>
          </div>
          {investigation.evidence.slice(0, 5).map((ev) => (
            <div key={ev.id} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 'var(--fs-sm)' }}>
              <CheckIcon size={14} className="text-muted" />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.observation.title ?? 'Untitled'}</span>
              <span className="text-xs text-dim">{ev.observation.provider}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultsTab({ investigation }: { investigation: import('@/lib/types').Investigation }) {
  return (
    <div className="empty-state">
      <div className="icon"><AlertIcon size={48} /></div>
      <div className="title">Results are shown in the search workspace</div>
      <div className="desc">Run a search from the search page to see results. This tab will show saved results from this investigation's search sessions.</div>
      <div className="actions">
        <button className="btn btn-primary btn-sm" onClick={() => window.location.href = '/search'}>Go to Search</button>
      </div>
    </div>
  );
}

function EvidenceTab({ investigation }: { investigation: import('@/lib/types').Investigation }) {
  if (investigation.evidence.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon"><EvidenceIcon size={48} /></div>
        <div className="title">No evidence collected yet</div>
        <div className="desc">Save results from your search to build an evidence trail. Each saved result becomes an evidence item with provenance and metadata.</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {investigation.evidence.map((ev) => (
        <div key={ev.id} className="card" style={{ display: 'flex', gap: 12, alignItems: 'start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', marginBottom: 4 }}>{ev.observation.title ?? 'Untitled'}</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>{ev.observation.snippet}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 'var(--fs-xs)' }}>
              <span className="text-dim">{ev.observation.provider}</span>
              <span className="text-dim">·</span>
              <span className="text-dim">{new Date(ev.addedAt).toLocaleString()}</span>
            </div>
          </div>
          {ev.observation.sourceUrl && (
            <a className="btn btn-ghost btn-icon" href={ev.observation.sourceUrl} target="_blank" rel="noopener noreferrer" title="Open source">
              <ExternalIcon size={14} />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function EntitiesTab({ investigation }: { investigation: import('@/lib/types').Investigation }) {
  if (investigation.entities.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon"><EntitiesIcon size={48} /></div>
        <div className="title">No entities resolved yet</div>
        <div className="desc">Entity resolution runs during search to identify people, organizations, locations, and other entities across sources. Entities will appear here once discovered.</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {investigation.entities.map((e) => (
        <div key={e.id} className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span className={`entity-chip ${e.type}`}>{e.name}</span>
            <span className="text-xs text-muted">{e.type}</span>
          </div>
          {e.aliases.length > 0 && <div className="text-xs text-dim">Aliases: {e.aliases.join(', ')}</div>}
          <div className="text-xs text-muted">Confidence: {Math.round(e.confidence * 100)}% · Sources: {e.sources.length}</div>
        </div>
      ))}
    </div>
  );
}

function GraphTab({ investigation }: { investigation: import('@/lib/types').Investigation }) {
  return (
    <div className="empty-state">
      <div className="icon"><GraphIcon size={48} /></div>
      <div className="title">Evidence graph will appear here</div>
      <div className="desc">The graph shows relationships between entities, evidence items, and sources. Navigate to the Graph page for the full visualization.</div>
      <div className="actions">
        <button className="btn btn-primary btn-sm" onClick={() => window.location.href = '/graph'}>Open Graph</button>
      </div>
    </div>
  );
}

function TimelineTab({ investigation }: { investigation: import('@/lib/types').Investigation }) {
  if (investigation.evidence.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon"><TimelineIcon size={48} /></div>
        <div className="title">No timeline events yet</div>
        <div className="desc">Timeline events are generated from evidence discovery dates, publication dates, and entity activity.</div>
      </div>
    );
  }
  return (
    <div className="timeline-track">
      {investigation.evidence
        .sort((a, b) => new Date(a.observation.publishedAt ?? a.addedAt).getTime() - new Date(b.observation.publishedAt ?? b.addedAt).getTime())
        .map((ev) => (
          <div key={ev.id} className={`timeline-event ${ev.observation.sourceType ?? 'web'}`}>
            <div className="timeline-event-content">
              <div className="timeline-event-date">{new Date(ev.observation.publishedAt ?? ev.addedAt).toLocaleString()}</div>
              <div className="timeline-event-title">{ev.observation.title ?? 'Untitled'}</div>
              <div className="timeline-event-meta">{ev.observation.provider} · {ev.observation.sourceType}</div>
            </div>
          </div>
        ))}
    </div>
  );
}

function SourcesTab({ investigation }: { investigation: import('@/lib/types').Investigation }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
      {investigation.sources.map((s) => (
        <div key={s.id} className={`source-card ${!s.configured ? 'not-configured' : ''}`}>
          <div className="source-card-header">
            <div className="source-card-title">
              <span className={`source-badge ${s.category}`}><span className="dot" /></span>
              {s.name}
            </div>
            {s.configured ? (
              <span className="badge badge-success">Configured</span>
            ) : (
              <span className="badge badge-default">Not configured</span>
            )}
          </div>
          <div className="source-card-body">
            <div className="source-card-row"><span className="label">Category</span><span className="value">{s.category}</span></div>
            <div className="source-card-row"><span className="label">Available</span><span className="value">{s.available ? 'Yes' : 'No'}</span></div>
            <div className="source-card-row"><span className="label">Results</span><span className="value">{s.resultCount}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function NotesTab({ investigation }: { investigation: import('@/lib/types').Investigation }) {
  const { dispatch } = useApp();
  const [notes, setNotes] = React.useState(investigation.notes);

  React.useEffect(() => { setNotes(investigation.notes); }, [investigation.id]);

  const save = () => dispatch({ type: 'UPDATE_INVESTIGATION', id: investigation.id, updates: { notes } });

  return (
    <div className="notes-editor">
      <textarea
        className="textarea"
        placeholder="Add investigation notes, hypotheses, observations, and conclusions…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={save}
        aria-label="Investigation notes"
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn btn-secondary btn-sm" onClick={save}><SaveIcon size={12} /> Save Notes</button>
      </div>
    </div>
  );
}
