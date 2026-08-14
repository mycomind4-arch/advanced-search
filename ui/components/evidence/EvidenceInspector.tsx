'use client';

import React from 'react';
import { useApp } from '@/lib/store';
import type { SearchObservation } from '@/lib/types';
import {
  XIcon, SaveIcon, ExternalIcon, CopyIcon, DownloadIcon, TagIcon,
  ChevronDownIcon, ChevronRightIcon, CheckIcon, LinkIcon, ClockIcon,
} from '@/lib/icons';

function InspectorSection({ title, children, defaultOpen = true }: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="inspector-section">
      <div className="inspector-section-header" onClick={() => setOpen(!open)} role="button" tabIndex={0}>
        <span className="inspector-section-title">{title}</span>
        {open ? <ChevronDownIcon size={14} className="text-dim" /> : <ChevronRightIcon size={14} className="text-dim" />}
      </div>
      {open && <div className="inspector-section-body">{children}</div>}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="inspector-field">
      <span className="field-label">{label}</span>
      <span className={`field-value ${mono ? 'mono' : ''}`}>{value ?? '—'}</span>
    </div>
  );
}

export function EvidenceInspector() {
  const { state, dispatch, selectedResult, addEvidence, isEvidenceSaved } = useApp();

  if (!selectedResult) return null;
  const obs = selectedResult;
  const saved = isEvidenceSaved(obs.id);

  const domain = (() => {
    if (!obs.sourceUrl) return '—';
    try { return new URL(obs.sourceUrl).hostname; } catch { return obs.sourceUrl; }
  })();

  return (
    <div className="drawer" role="complementary" aria-label="Evidence inspector">
      <div className="drawer-header">
        <span className="drawer-title">Evidence Inspector</span>
        <button className="drawer-close" onClick={() => dispatch({ type: 'TOGGLE_INSPECTOR', open: false })} aria-label="Close inspector">
          <XIcon size={16} />
        </button>
      </div>

      <div className="drawer-body">
        {/* Actions */}
        <div className="inspector-actions">
          <button
            className={`btn ${saved ? 'btn-ghost' : 'btn-secondary'} btn-sm`}
            onClick={() => addEvidence(obs)}
            disabled={saved}
          >
            {saved ? <><CheckIcon size={12} /> Saved</> : <><SaveIcon size={12} /> Save</>}
          </button>
          <button className="btn btn-secondary btn-sm"><TagIcon size={12} /> Add Label</button>
          {obs.sourceUrl && (
            <a className="btn btn-secondary btn-sm" href={obs.sourceUrl} target="_blank" rel="noopener noreferrer">
              <ExternalIcon size={12} /> Open
            </a>
          )}
          <button className="btn btn-ghost btn-sm"><CopyIcon size={12} /> Copy</button>
        </div>

        {/* Overview */}
        <InspectorSection title="Overview">
          <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)', lineHeight: 1.4 }}>
            {obs.title ?? 'Untitled'}
          </div>
          {obs.snippet && (
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 8 }}>
              {obs.snippet}
            </div>
          )}
          {obs.caption && (
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              "{obs.caption}"
            </div>
          )}
        </InspectorSection>

        {/* Source */}
        <InspectorSection title="Source">
          <Field label="Provider" value={obs.provider} />
          <Field label="Domain" value={domain} />
          <Field label="URL" value={obs.sourceUrl ? <a href={obs.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-hover)' }}>{obs.sourceUrl}</a> : null} mono />
          <Field label="Media URL" value={obs.mediaUrl ?? 'None'} mono />
          <Field label="Source Type" value={obs.sourceType ?? 'unknown'} />
        </InspectorSection>

        {/* Evidence */}
        <InspectorSection title="Evidence & Signals">
          {obs.signals ? (
            <>
              {obs.signals.textRelevance !== undefined && <Field label="Text Relevance" value={`${Math.round(obs.signals.textRelevance * 100)}%`} />}
              {obs.signals.visualSimilarity !== undefined && <Field label="Visual Similarity" value={`${Math.round(obs.signals.visualSimilarity * 100)}%`} />}
              {obs.signals.faceSimilarity !== undefined && <Field label="Face Similarity" value={`${Math.round(obs.signals.faceSimilarity * 100)}%`} />}
              {obs.signals.sourceQuality !== undefined && <Field label="Source Quality" value={`${Math.round(obs.signals.sourceQuality * 100)}%`} />}
              {obs.signals.temporalConsistency !== undefined && <Field label="Temporal Consistency" value={`${Math.round(obs.signals.temporalConsistency * 100)}%`} />}
              {obs.signals.corroboration !== undefined && <Field label="Corroboration" value={obs.signals.corroboration > 0 ? 'Corroborated' : 'Single source'} />}
            </>
          ) : (
            <div className="text-xs text-muted">No signal data available.</div>
          )}
          <Field label="Provider Score" value={obs.providerScore !== undefined ? `${Math.round(obs.providerScore * 100)}%` : '—'} />
        </InspectorSection>

        {/* Provenance */}
        <InspectorSection title="Provenance" defaultOpen={false}>
          {obs.provenance && obs.provenance.length > 0 ? (
            obs.provenance.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: 'var(--fs-xs)' }}>
                <LinkIcon size={12} className="text-dim" />
                <span className="text-muted">{p.relation}</span>
                <span className="text-secondary mono">{p.targetObservationId}</span>
              </div>
            ))
          ) : (
            <div className="text-xs text-muted">No provenance links recorded.</div>
          )}
        </InspectorSection>

        {/* Metadata */}
        <InspectorSection title="Metadata" defaultOpen={false}>
          <Field label="Discovered" value={new Date(obs.discoveredAt).toLocaleString()} />
          <Field label="Published" value={obs.publishedAt ? new Date(obs.publishedAt).toLocaleString() : 'Unknown'} />
          <Field label="Observation ID" value={obs.id} mono />
          <Field label="Query Job ID" value={obs.queryJobId} mono />
          <Field label="Provider Result ID" value={obs.providerResultId ?? '—'} mono />
        </InspectorSection>

        {/* Entities */}
        <InspectorSection title="Entities" defaultOpen={false}>
          {obs.entities && obs.entities.length > 0 ? (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {obs.entities.map((e, i) => (
                <span key={i} className={`entity-chip ${e.type}`} title={`Confidence: ${e.confidence ?? 'unknown'}`}>
                  {e.value}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted">No entities extracted from this result.</div>
          )}
        </InspectorSection>

        {/* Corroboration */}
        <InspectorSection title="Corroboration" defaultOpen={false}>
          <div className="text-xs text-muted">
            {obs.signals?.corroboration && obs.signals.corroboration > 0
              ? `${Math.round(obs.signals.corroboration * 100)}% corroboration with other sources.`
              : 'This result has not been corroborated by other sources yet.'}
          </div>
        </InspectorSection>

        {/* History */}
        <InspectorSection title="History" defaultOpen={false}>
          <div className="text-xs text-muted">No archive snapshots or version history available.</div>
        </InspectorSection>
      </div>
    </div>
  );
}
