'use client';
export const runtime = 'edge';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { AlertIcon, ChevronRightIcon, ExternalIcon } from '@/lib/icons';

export default function EntityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { state } = useApp();

  const entity = state.investigations
    .flatMap((inv) => inv.entities.map((e) => ({ ...e, investigationId: inv.id, investigationTitle: inv.title })))
    .find((e) => e.id === params.id);

  if (!entity) {
    return (
      <div className="main-content-scroll">
        <div className="empty-state" style={{ paddingTop: 120 }}>
          <div className="icon"><AlertIcon size={48} /></div>
          <div className="title">Entity not found</div>
          <div className="desc">This entity may have been deleted.</div>
          <div className="actions">
            <button className="btn btn-primary btn-sm" onClick={() => router.push('/entities')}>Back to Entities</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content-scroll">
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <a href="/entities" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Entities</a>
          <ChevronRightIcon size={12} className="text-dim" />
          <span className="text-xs text-muted">{entity.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className={`entity-chip ${entity.type}`} style={{ padding: '8px 16px', fontSize: 'var(--fs-lg)' }}>
            {entity.name}
          </span>
          <div>
            <div className="text-sm text-secondary">{entity.type}</div>
            <div className="text-xs text-muted">Confidence: {Math.round(entity.confidence * 100)}%</div>
          </div>
        </div>
      </div>

      <div style={{ padding: 20, maxWidth: 700, display: 'grid', gap: 16 }}>
        {/* Aliases */}
        <div className="card">
          <div className="card-header"><span className="card-title">Aliases</span></div>
          {entity.aliases.length > 0 ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {entity.aliases.map((a, i) => <span key={i} className="entity-chip other">{a}</span>)}
            </div>
          ) : <div className="text-xs text-muted">No aliases recorded.</div>}
        </div>

        {/* Confidence */}
        <div className="card">
          <div className="card-header"><span className="card-title">Confidence</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="confidence-bar">
              <div className="confidence-track" style={{ width: 120 }}>
                <div className={`confidence-fill ${entity.confidence >= 0.7 ? 'high' : entity.confidence >= 0.4 ? 'med' : 'low'}`} style={{ width: `${entity.confidence * 100}%` }} />
              </div>
              <span className={`confidence-label ${entity.confidence >= 0.7 ? 'high' : entity.confidence >= 0.4 ? 'med' : 'low'}`}>{Math.round(entity.confidence * 100)}%</span>
            </div>
            <span className="text-xs text-muted">How confident the system is that records refer to the same entity.</span>
          </div>
        </div>

        {/* Sources */}
        <div className="card">
          <div className="card-header"><span className="card-title">Evidence Sources</span></div>
          {entity.sources.length > 0 ? (
            entity.sources.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 'var(--fs-xs)' }}>
                <span className="status-dot" />
                <span className="text-secondary">{s}</span>
              </div>
            ))
          ) : <div className="text-xs text-muted">No source evidence recorded.</div>}
        </div>

        {/* Relationships */}
        <div className="card">
          <div className="card-header"><span className="card-title">Relationships</span></div>
          {entity.relationships.length > 0 ? (
            entity.relationships.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 'var(--fs-xs)' }}>
                <span className="text-muted">{r.relation}</span>
                <span className="entity-chip other">{r.entityId}</span>
              </div>
            ))
          ) : <div className="text-xs text-muted">No relationships recorded.</div>}
        </div>

        {/* Activity */}
        <div className="card">
          <div className="card-header"><span className="card-title">Activity Timeline</span></div>
          <div className="text-xs text-muted">
            First seen: {new Date(entity.firstSeen).toLocaleString()}<br />
            Last seen: {new Date(entity.lastSeen).toLocaleString()}
          </div>
        </div>

        {/* Appearances */}
        <div className="card">
          <div className="card-header"><span className="card-title">Appearances</span></div>
          {entity.appearances.length > 0 ? (
            entity.appearances.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 'var(--fs-xs)' }}>
                <ExternalIcon size={12} className="text-dim" />
                <span className="text-secondary mono">{a}</span>
              </div>
            ))
          ) : <div className="text-xs text-muted">No appearance references recorded.</div>}
        </div>
      </div>
    </div>
  );
}
