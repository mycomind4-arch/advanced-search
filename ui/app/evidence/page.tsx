'use client';

import React from 'react';
import { useApp } from '@/lib/store';
import { EvidenceIcon, AlertIcon, PinIcon } from '@/lib/icons';

export default function EvidenceBoardPage() {
  const { state, dispatch } = useApp();
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });

  const allEvidence = state.investigations.flatMap((inv) =>
    inv.evidence.map((ev) => ({
      ...ev,
      investigationTitle: inv.title,
      boardPos: ev.boardPosition ?? { x: 50 + Math.random() * 600, y: 50 + Math.random() * 400 },
    }))
  );

  const handleMouseDown = (e: React.MouseEvent, id: string, pos: { x: number; y: number }) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.parentElement!.getBoundingClientRect();
    setDraggingId(id);
    setDragOffset({ x: e.clientX - rect.left - pos.x, y: e.clientY - rect.top - pos.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingId) return;
    const canvas = e.currentTarget as HTMLElement;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;
    const inv = state.investigations.find((i) => i.evidence.some((ev) => ev.id === draggingId));
    if (inv) {
      dispatch({ type: 'UPDATE_EVIDENCE', investigationId: inv.id, evidenceId: draggingId, updates: { boardPosition: { x, y } } });
    }
  };

  const handleMouseUp = () => setDraggingId(null);

  if (allEvidence.length === 0) {
    return (
      <div className="main-content-scroll">
        <div className="empty-state" style={{ paddingTop: 120 }}>
          <div className="icon"><EvidenceIcon size={48} /></div>
          <div className="title">No evidence on the board</div>
          <div className="desc">Save results from your searches to add them to the evidence board. Drag items to organize them into groups and build your case.</div>
          <div className="actions">
            <a href="/search" className="btn btn-primary btn-sm">Start Searching</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="evidence-board">
      <div className="evidence-board-toolbar">
        <button className="btn btn-ghost btn-sm"><PinIcon size={12} /> Add Note</button>
        <span className="text-xs text-muted" style={{ padding: '0 8px' }}>{allEvidence.length} items</span>
      </div>
      <div
        className="evidence-board-canvas"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {allEvidence.map((ev) => (
          <div
            key={ev.id}
            className={`evidence-board-item ${draggingId === ev.id ? 'dragging' : ''}`}
            style={{ left: ev.boardPos.x, top: ev.boardPos.y }}
            onMouseDown={(e) => handleMouseDown(e, ev.id, ev.boardPos)}
          >
            <div className="item-title">{ev.observation.title ?? 'Untitled'}</div>
            <div className="item-meta">{ev.observation.provider} · {ev.observation.sourceType ?? 'unknown'}</div>
            <div className="item-source">{ev.investigationTitle}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
