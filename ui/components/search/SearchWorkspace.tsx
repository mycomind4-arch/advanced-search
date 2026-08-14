'use client';

import React from 'react';
import { useApp } from '@/lib/store';
import type { SearchObservation, SearchMode, ResultsView } from '@/lib/types';
import {
  SearchIcon, PlayIcon, FilterIcon, ListIcon, CardsIcon, TableIcon,
  TimelineIcon, GraphIcon, SaveIcon, ExternalIcon, CheckIcon,
  AlertIcon, ClockIcon, ChevronDownIcon, ChevronRightIcon,
} from '@/lib/icons';
import { EvidenceInspector } from '@/components/evidence/EvidenceInspector';

const MODE_OPTIONS: { value: SearchMode; label: string }[] = [
  { value: 'text', label: 'Quick Search' },
  { value: 'image', label: 'Visual Search' },
  { value: 'face', label: 'Face Search' },
  { value: 'document', label: 'Document Search' },
  { value: 'archive', label: 'Archive Search' },
  { value: 'video', label: 'Video Search' },
  { value: 'metadata', label: 'Metadata Search' },
];

const VIEW_OPTIONS: { value: ResultsView; label: string; icon: typeof ListIcon }[] = [
  { value: 'list', label: 'List', icon: ListIcon },
  { value: 'cards', label: 'Cards', icon: CardsIcon },
  { value: 'table', label: 'Table', icon: TableIcon },
  { value: 'timeline', label: 'Timeline', icon: TimelineIcon },
];

function ConfidenceIndicator({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const level = pct >= 70 ? 'high' : pct >= 40 ? 'med' : 'low';
  return (
    <div className="confidence-bar">
      <div className="confidence-track">
        <div className={`confidence-fill ${level}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`confidence-label ${level}`}>{pct}%</span>
    </div>
  );
}

function getSourceBadgeClass(sourceType?: string): string {
  if (!sourceType) return 'source-badge web';
  const map: Record<string, string> = {
    archive: 'source-badge archive',
    image: 'source-badge image',
    video: 'source-badge video',
    document: 'source-badge document',
    metadata: 'source-badge metadata',
    ftp: 'source-badge ftp',
    newsgroup: 'source-badge newsgroup',
  };
  return map[sourceType] ?? 'source-badge web';
}

function PipelineStageIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed': return <CheckIcon size={14} />;
    case 'failed': return <AlertIcon size={14} />;
    case 'running': return <ClockIcon size={14} />;
    case 'not-configured': return <span style={{ fontSize: 10, fontWeight: 600 }}>—</span>;
    default: return <span style={{ fontSize: 10, fontWeight: 600 }}>•</span>;
  }
}

function Pipeline() {
  const { state } = useApp();
  if (state.pipelineStages.length === 0) return null;

  return (
    <div className="pipeline" role="region" aria-label="Search pipeline">
      {state.pipelineStages.map((stage, idx) => (
        <React.Fragment key={stage.id}>
          <div className={`pipeline-stage ${stage.status}`} title={stage.error ?? stage.name}>
            <div className="pipeline-stage-icon">
              <PipelineStageIcon status={stage.status} />
            </div>
            <div className="pipeline-stage-name">{stage.name}</div>
            {stage.status === 'completed' && stage.resultCount !== undefined && (
              <div className="pipeline-stage-count">{stage.resultCount} results</div>
            )}
            {stage.status === 'running' && (
              <div className="pipeline-stage-count">running…</div>
            )}
            {stage.status === 'not-configured' && (
              <div className="pipeline-stage-count">not configured</div>
            )}
          </div>
          {idx < state.pipelineStages.length - 1 && (
            <div className="pipeline-connector">
              <ChevronRightIcon size={12} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function ResultCard({ result, selected, onSelect }: {
  result: SearchObservation;
  selected: boolean;
  onSelect: () => void;
}) {
  const { addEvidence, isEvidenceSaved } = useApp();
  const saved = isEvidenceSaved(result.id);

  return (
    <div className={`result-card ${selected ? 'selected' : ''}`} onClick={onSelect} role="article">
      <div className="thumb">
        {result.mediaUrl ? (
          <img src={result.mediaUrl} alt={result.title ?? ''} loading="lazy" />
        ) : (
          <span className="thumb-placeholder">No preview</span>
        )}
      </div>
      <div className="content">
        <div className="title-row">
          <div className="title">{result.title ?? 'Untitled'}</div>
        </div>
        <div className="meta-row">
          <span className={getSourceBadgeClass(result.sourceType)}>{result.provider}</span>
          {result.publishedAt && (
            <span className="text-xs text-muted">
              {new Date(result.publishedAt).toLocaleDateString()}
            </span>
          )}
          {result.sourceUrl && (
            <span className="text-xs text-dim truncate" style={{ maxWidth: 200 }}>
              {(() => { try { return new URL(result.sourceUrl).hostname; } catch { return result.sourceUrl; } })()}
            </span>
          )}
        </div>
        {result.snippet && <div className="snippet">{result.snippet}</div>}
        <div className="footer-row">
          {result.signals?.textRelevance && <ConfidenceIndicator score={result.signals.textRelevance} />}
          {result.signals?.corroboration !== undefined && (
            <span className="corroboration">
              <CheckIcon size={12} /> {result.signals.corroboration > 0 ? 'Corroborated' : 'Single source'}
            </span>
          )}
          <div className="actions">
            <button
              className={`action-btn ${saved ? 'saved' : ''}`}
              onClick={(e) => { e.stopPropagation(); addEvidence(result); }}
              title={saved ? 'Saved to evidence' : 'Add to evidence'}
            >
              {saved ? <CheckIcon size={14} /> : <SaveIcon size={14} />}
            </button>
            {result.sourceUrl && (
              <a
                className="action-btn"
                href={result.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Open source"
              >
                <ExternalIcon size={14} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultsTable({ results, selectedId, onSelect }: {
  results: SearchObservation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <table className="results-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Source</th>
          <th>Type</th>
          <th>Date</th>
          <th>Relevance</th>
        </tr>
      </thead>
      <tbody>
        {results.map((r) => (
          <tr
            key={r.id}
            className={r.id === selectedId ? 'selected' : ''}
            onClick={() => onSelect(r.id)}
          >
            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.title ?? 'Untitled'}</td>
            <td>{r.provider}</td>
            <td>{r.sourceType ?? '—'}</td>
            <td>{r.publishedAt ? new Date(r.publishedAt).toLocaleDateString() : '—'}</td>
            <td>{r.signals?.textRelevance ? `${Math.round(r.signals.textRelevance * 100)}%` : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SearchWorkspace() {
  const { state, dispatch, runSearch, createInvestigation } = useApp();
  const [view, setView] = React.useState<ResultsView>('list');

  const handleSearch = async () => {
    if (!state.searchQuery.trim()) return;
    createInvestigation(state.searchQuery, state.searchMode);
    await runSearch(state.searchQuery, state.searchMode);
  };

  const handleSelectResult = (id: string) => {
    dispatch({ type: 'SELECT_RESULT', resultId: id });
  };

  const hasResults = state.searchResults.length > 0;
  const hasSearched = state.pipelineStages.length > 0;

  return (
    <div className="search-workspace">
      {/* Search header */}
      <div className="search-header">
        <div className="search-query-row">
          <input
            className="input"
            placeholder="Describe what you are looking for, paste a URL, or enter a research question…"
            value={state.searchQuery}
            onChange={(e) => dispatch({ type: 'SET_SEARCH_QUERY', query: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSearch(); } }}
            aria-label="Search query"
          />
          <select
            className="input"
            style={{ width: 'auto', minWidth: 140 }}
            value={state.searchMode}
            onChange={(e) => dispatch({ type: 'SET_SEARCH_MODE', mode: e.target.value as SearchMode })}
            aria-label="Search mode"
          >
            {MODE_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <button className="btn btn-primary" onClick={handleSearch} disabled={state.isSearching || !state.searchQuery.trim()}>
            {state.isSearching ? <><span className="spin" style={{ display: 'inline-block' }}><ClockIcon size={14} /></span> Searching</> : <><PlayIcon size={14} /> Start Search</>}
          </button>
        </div>

        {/* Filter row */}
        {hasResults && (
          <div className="search-filters-row">
            <FilterIcon size={12} className="text-dim" />
            <button className="filter-chip">All sources</button>
            <button className="filter-chip">Any date</button>
            <button className="filter-chip">Any type</button>
          </div>
        )}
      </div>

      {/* Pipeline visualization */}
      <Pipeline />

      {/* Results area */}
      <div className="results-area" style={{ gridTemplateColumns: state.inspectorOpen ? `1fr var(--inspector-w)` : '1fr' }}>
        <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Results toolbar */}
          {hasSearched && (
            <div className="results-toolbar">
              <div className="results-toolbar-left">
                <span className="text-sm text-muted">
                  {hasResults ? `${state.searchResults.length} results` : state.isSearching ? 'Searching…' : 'No results found'}
                </span>
              </div>
              <div className="results-toolbar-right">
                <div className="view-toggle" role="tablist">
                  {VIEW_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        className={view === opt.value ? 'active' : ''}
                        onClick={() => setView(opt.value)}
                        role="tab"
                        aria-selected={view === opt.value}
                      >
                        <Icon size={12} /> {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Results content */}
          <div className="results-list">
            {!hasSearched && !state.isSearching && (
              <div className="empty-state">
                <div className="icon"><SearchIcon size={48} /></div>
                <div className="title">Start a new search</div>
                <div className="desc">Enter a query above to begin an investigation. The system will coordinate multiple discovery sources and show results as they arrive.</div>
              </div>
            )}

            {state.isSearching && !hasResults && state.pipelineStages.length > 0 && (
              <div className="loading-state">
                <div className="loading-dots"><span /><span /><span /></div>
                <div className="loading-label">Coordinating investigation across sources…</div>
              </div>
            )}

            {hasResults && view === 'list' && (
              <div>
                {state.searchResults.map((r) => (
                  <ResultCard
                    key={r.id}
                    result={r}
                    selected={r.id === state.selectedResultId}
                    onSelect={() => handleSelectResult(r.id)}
                  />
                ))}
              </div>
            )}

            {hasResults && view === 'cards' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {state.searchResults.map((r) => (
                  <div
                    key={r.id}
                    className={`card ${r.id === state.selectedResultId ? 'selected' : ''}`}
                    style={{ cursor: 'pointer', borderColor: r.id === state.selectedResultId ? 'var(--accent)' : undefined }}
                    onClick={() => handleSelectResult(r.id)}
                  >
                    <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', marginBottom: 6 }}>{r.title}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: 8 }}>{r.snippet}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={getSourceBadgeClass(r.sourceType)}>{r.provider}</span>
                      {r.signals?.textRelevance && <ConfidenceIndicator score={r.signals.textRelevance} />}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {hasResults && view === 'table' && (
              <ResultsTable results={state.searchResults} selectedId={state.selectedResultId} onSelect={handleSelectResult} />
            )}

            {hasResults && view === 'timeline' && (
              <div className="timeline-track">
                {[...state.searchResults]
                  .sort((a, b) => new Date(a.publishedAt ?? a.discoveredAt).getTime() - new Date(b.publishedAt ?? b.discoveredAt).getTime())
                  .map((r) => (
                    <div key={r.id} className={`timeline-event ${r.sourceType ?? 'web'}`} onClick={() => handleSelectResult(r.id)}>
                      <div className="timeline-event-content">
                        <div className="timeline-event-date">{new Date(r.publishedAt ?? r.discoveredAt).toLocaleString()}</div>
                        <div className="timeline-event-title">{r.title}</div>
                        <div className="timeline-event-meta">{r.provider} · {r.sourceType}</div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {hasSearched && !hasResults && !state.isSearching && (
              <div className="empty-state">
                <div className="icon"><AlertIcon size={48} /></div>
                <div className="title">No results found</div>
                <div className="desc">No sources returned results for this query. This may be because most providers are not configured. Try a different query or configure providers in Settings.</div>
                <div className="actions">
                  <a href="/sources" className="btn btn-secondary btn-sm">View Sources</a>
                  <a href="/settings" className="btn btn-ghost btn-sm">Configure Providers</a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Evidence inspector */}
        {state.inspectorOpen && <EvidenceInspector />}
      </div>
    </div>
  );
}
