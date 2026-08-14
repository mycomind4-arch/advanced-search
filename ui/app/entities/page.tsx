'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { EntitiesIcon } from '@/lib/icons';

export default function EntitiesPage() {
  const router = useRouter();
  const { state } = useApp();

  const allEntities = state.investigations.flatMap((inv) =>
    inv.entities.map((e) => ({ ...e, investigationTitle: inv.title, investigationId: inv.id }))
  );

  if (allEntities.length === 0) {
    return (
      <div className="main-content-scroll">
        <div className="empty-state" style={{ paddingTop: 120 }}>
          <div className="icon"><EntitiesIcon size={48} /></div>
          <div className="title">No entities resolved</div>
          <div className="desc">Entity resolution identifies people, organizations, locations, and other entities across sources. Entities will appear here once discovered during investigations.</div>
          <div className="actions">
            <a href="/search" className="btn btn-primary btn-sm">Start Searching</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content-scroll">
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
        <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, margin: 0 }}>Resolved Entities</h2>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          {allEntities.length} entities across {state.investigations.length} investigations
        </p>
      </div>
      <div style={{ padding: 20, display: 'grid', gap: 8 }}>
        {allEntities.map((e) => (
          <div
            key={e.id}
            className="card"
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            onClick={() => router.push(`/entities/${e.id}`)}
          >
            <span className={`entity-chip ${e.type}`} style={{ padding: '6px 12px', fontSize: 'var(--fs-sm)' }}>{e.name}</span>
            <div style={{ flex: 1 }}>
              <div className="text-sm text-secondary">{e.type}</div>
              {e.aliases.length > 0 && <div className="text-xs text-dim">Aliases: {e.aliases.join(', ')}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="text-xs text-muted">Confidence</div>
              <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>{Math.round(e.confidence * 100)}%</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="text-xs text-muted">Sources</div>
              <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>{e.sources.length}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
