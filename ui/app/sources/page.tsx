'use client';

import React from 'react';
import { useApp } from '@/lib/store';
import { getSourceStatuses, SOURCE_CATEGORY_LABELS } from '@/lib/sources';
import type { SourceCategory, SourceStatus } from '@/lib/types';
import { SourcesIcon, RefreshIcon, SettingsIcon } from '@/lib/icons';

export default function SourcesPage() {
  const { state } = useApp();
  const sources = state.sources.length > 0 ? state.sources : getSourceStatuses();

  const categories = Object.keys(SOURCE_CATEGORY_LABELS) as SourceCategory[];
  const sourcesByCategory = categories.map((cat) => ({
    category: cat,
    label: SOURCE_CATEGORY_LABELS[cat],
    sources: sources.filter((s) => s.category === cat),
  })).filter((g) => g.sources.length > 0);

  return (
    <div className="main-content-scroll">
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
        <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, margin: 0 }}>Source Intelligence</h2>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          {sources.filter((s) => s.configured).length} of {sources.length} sources configured · showing real availability status
        </p>
      </div>

      {sourcesByCategory.map((group) => (
        <div key={group.category}>
          <div style={{ padding: '16px 24px 8px', fontSize: 'var(--fs-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)' }}>
            {group.label}
          </div>
          <div className="sources-grid">
            {group.sources.map((s) => (
              <SourceCard key={s.id} source={s} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SourceCard({ source }: { source: SourceStatus }) {
  return (
    <div className={`source-card ${!source.configured ? 'not-configured' : ''}`}>
      <div className="source-card-header">
        <div className="source-card-title">
          <span className={`source-badge ${source.category}`}><span className="dot" /></span>
          {source.name}
        </div>
        {source.configured ? (
          <span className="badge badge-success">Configured</span>
        ) : (
          <span className="badge badge-default">Not configured</span>
        )}
      </div>
      <div className="source-card-body">
        <div className="source-card-row"><span className="label">Category</span><span className="value">{source.category}</span></div>
        <div className="source-card-row"><span className="label">Available</span><span className="value">{source.available ? 'Yes' : 'No'}</span></div>
        <div className="source-card-row"><span className="label">Results</span><span className="value">{source.resultCount}</span></div>
        {source.lastQueried && (
          <div className="source-card-row"><span className="label">Last queried</span><span className="value">{new Date(source.lastQueried).toLocaleString()}</span></div>
        )}
        {source.latencyMs !== undefined && (
          <div className="source-card-row"><span className="label">Latency</span><span className="value">{source.latencyMs}ms</span></div>
        )}
        {source.error && (
          <div className="source-card-row"><span className="label">Error</span><span className="value" style={{ color: 'var(--error)' }}>{source.error}</span></div>
        )}
        <div className="source-card-row"><span className="label">Modes</span><span className="value">{source.modes.join(', ')}</span></div>
      </div>
      {!source.configured && (
        <div className="source-card-actions">
          <a href="/settings" className="btn btn-secondary btn-sm"><SettingsIcon size={12} /> Configure</a>
        </div>
      )}
      {source.configured && source.available && (
        <div className="source-card-actions">
          <button className="btn btn-ghost btn-sm"><RefreshIcon size={12} /> Test connection</button>
        </div>
      )}
    </div>
  );
}
