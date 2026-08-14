'use client';

import React from 'react';
import { useApp } from '@/lib/store';
import type { SourceCategory } from '@/lib/types';
import { TimelineIcon } from '@/lib/icons';

const FILTER_OPTIONS: { label: string; value: SourceCategory | 'entity' }[] = [
  { label: 'Web', value: 'web' },
  { label: 'Images', value: 'image' },
  { label: 'Archives', value: 'archive' },
  { label: 'Documents', value: 'document' },
  { label: 'Metadata', value: 'metadata' },
  { label: 'Entities', value: 'entity' },
];

export default function TimelinePage() {
  const { state } = useApp();
  const [activeFilters, setActiveFilters] = React.useState<Set<string>>(new Set());

  const events = React.useMemo(() => {
    const evs: { id: string; date: string; type: SourceCategory | 'entity'; title: string; description?: string; sourceUrl?: string }[] = [];
    state.investigations.forEach((inv) => {
      inv.evidence.forEach((ev) => {
        evs.push({
          id: ev.id,
          date: ev.observation.publishedAt ?? ev.observation.discoveredAt,
          type: (ev.observation.sourceType ?? 'web') as SourceCategory,
          title: ev.observation.title ?? 'Untitled',
          description: ev.observation.snippet,
          sourceUrl: ev.observation.sourceUrl,
        });
      });
      inv.entities.forEach((e) => {
        evs.push({
          id: `entity-${e.id}`,
          date: e.firstSeen,
          type: 'entity',
          title: `Entity discovered: ${e.name}`,
          description: `${e.type} · ${e.sources.length} sources`,
        });
      });
    });
    return evs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [state.investigations]);

  const filteredEvents = activeFilters.size === 0
    ? events
    : events.filter((e) => activeFilters.has(e.type));

  const toggleFilter = (value: string) => {
    const next = new Set(activeFilters);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setActiveFilters(next);
  };

  if (events.length === 0) {
    return (
      <div className="main-content-scroll">
        <div className="empty-state" style={{ paddingTop: 120 }}>
          <div className="icon"><TimelineIcon size={48} /></div>
          <div className="title">No timeline events</div>
          <div className="desc">The timeline shows discovery dates, publication dates, entity activity, and archive snapshots. Collect evidence to populate the timeline.</div>
          <div className="actions">
            <a href="/search" className="btn btn-primary btn-sm">Start Searching</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content-scroll">
      <div className="timeline-container">
        <div className="timeline-filters">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value}
              className={`filter-chip ${activeFilters.has(f.value) ? 'active' : ''}`}
              onClick={() => toggleFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
          {activeFilters.size > 0 && (
            <button className="filter-chip" onClick={() => setActiveFilters(new Set())}>Clear filters</button>
          )}
        </div>

        <div className="timeline-track">
          {filteredEvents.map((ev) => (
            <div key={ev.id} className={`timeline-event ${ev.type}`}>
              <div className="timeline-event-content">
                <div className="timeline-event-date">{new Date(ev.date).toLocaleString()}</div>
                <div className="timeline-event-title">{ev.title}</div>
                {ev.description && <div className="timeline-event-meta">{ev.description}</div>}
              </div>
            </div>
          ))}
          {filteredEvents.length === 0 && (
            <div className="empty-state" style={{ paddingTop: 24 }}>
              <div className="title">No events match filters</div>
              <div className="desc">Try clearing some filters to see more events.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
