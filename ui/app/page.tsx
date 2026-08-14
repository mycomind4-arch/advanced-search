'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import type { SearchMode } from '@/lib/types';
import {
  SearchIcon, UploadIcon, LinkIcon, ImageIcon, FileIcon,
  ChevronDownIcon, ChevronRightIcon, PlayIcon, ClockIcon,
  EvidenceIcon, GraphIcon, TimelineIcon,
} from '@/lib/icons';

const MODE_OPTIONS: { value: SearchMode; label: string; icon: typeof SearchIcon; desc: string }[] = [
  { value: 'text', label: 'Quick Search', icon: SearchIcon, desc: 'Fast multi-source text discovery' },
  { value: 'image', label: 'Visual Search', icon: ImageIcon, desc: 'Reverse image and visual similarity' },
  { value: 'face', label: 'Face Search', icon: SearchIcon, desc: 'Face similarity over permitted corpora' },
  { value: 'document', label: 'Document Search', icon: FileIcon, desc: 'PDF and embedded-image extraction' },
  { value: 'archive', label: 'Archive Search', icon: SearchIcon, desc: 'Historical and deleted-page discovery' },
  { value: 'video', label: 'Video Search', icon: SearchIcon, desc: 'Keyframe extraction and visual search' },
  { value: 'metadata', label: 'Metadata Search', icon: SearchIcon, desc: 'EXIF, OCR, hashing, and filename analysis' },
];

export default function HomePage() {
  const router = useRouter();
  const { state, dispatch, createInvestigation, runSearch } = useApp();
  const [query, setQuery] = React.useState('');
  const [mode, setMode] = React.useState<SearchMode>('text');
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [attachments, setAttachments] = React.useState<{ type: string; name: string }[]>([]);
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [domainFilter, setDomainFilter] = React.useState('');

  const handleSubmit = async () => {
    if (!query.trim()) return;
    dispatch({ type: 'SET_SEARCH_QUERY', query });
    dispatch({ type: 'SET_SEARCH_MODE', mode });
    createInvestigation(query, mode);
    await runSearch(query, mode);
    router.push('/search');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="main-content-scroll">
      <div className="launcher">
        <div className="launcher-header">
          <h1 className="launcher-title">What are you investigating?</h1>
          <p className="launcher-subtitle">
            Launch a coordinated investigation across multiple discovery sources — web, images, archives, documents, and metadata.
          </p>
        </div>

        {/* Mode selector */}
        <div className="launcher-mode-bar">
          {MODE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                className={`mode-chip ${mode === opt.value ? 'active' : ''}`}
                onClick={() => setMode(opt.value)}
                title={opt.desc}
              >
                <Icon size={14} />
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Composer */}
        <div className="launcher-composer" onKeyDown={handleKeyDown}>
          <div className="launcher-input-row">
            <textarea
              className="textarea"
              placeholder="Describe what you are looking for — a name, a domain, a research question, or a natural-language investigation query…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ minHeight: 80 }}
              aria-label="Investigation query"
            />
            <button
              className="btn btn-primary submit-btn"
              onClick={handleSubmit}
              disabled={!query.trim()}
            >
              <PlayIcon size={16} /> Launch
            </button>
          </div>

          {/* Attachment row */}
          <div className="launcher-attach-row">
            <label className="attach-chip" title="Upload an image">
              <ImageIcon size={14} /> Image
              <input type="file" accept="image/*" hidden onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setAttachments((a) => [...a, { type: 'image', name: f.name }]);
              }} />
            </label>
            <label className="attach-chip" title="Upload a document">
              <FileIcon size={14} /> Document
              <input type="file" accept=".pdf,.doc,.docx,.txt" hidden onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setAttachments((a) => [...a, { type: 'document', name: f.name }]);
              }} />
            </label>
            <button
              className="attach-chip"
              onClick={() => {
                const url = prompt('Enter a URL to investigate:');
                if (url) setAttachments((a) => [...a, { type: 'url', name: url }]);
              }}
              title="Investigate a URL"
            >
              <LinkIcon size={14} /> URL
            </button>
            {attachments.map((att, i) => (
              <span key={i} className="attach-chip uploaded">
                {att.type === 'image' && <ImageIcon size={12} />}
                {att.type === 'document' && <FileIcon size={12} />}
                {att.type === 'url' && <LinkIcon size={12} />}
                {att.name.length > 30 ? att.name.slice(0, 30) + '…' : att.name}
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit' }}
                  onClick={(e) => { e.stopPropagation(); setAttachments((a) => a.filter((_, idx) => idx !== i)); }}
                >×</button>
              </span>
            ))}
          </div>

          {/* Advanced options */}
          <div className={`launcher-advanced ${showAdvanced ? '' : 'hidden'}`}>
            <span className="advanced-label">Date range:</span>
            <input type="date" className="input" style={{ width: 'auto' }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <span className="text-dim">→</span>
            <input type="date" className="input" style={{ width: 'auto' }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <span className="advanced-label" style={{ marginLeft: 12 }}>Domain:</span>
            <input className="input" style={{ width: 140 }} placeholder="example.com" value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} />
          </div>

          {/* Options row */}
          <div className="launcher-options" style={{ marginTop: 10 }}>
            <button className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
              {showAdvanced ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
              Advanced options
            </button>
            <span className="text-xs text-dim">
              {MODE_OPTIONS.find((m) => m.value === mode)?.desc}
            </span>
          </div>
        </div>

        {/* Recent investigations */}
        {state.investigations.length > 0 && (
          <div className="recent-investigations">
            <h3>Recent Investigations</h3>
            <div className="recent-inv-list">
              {state.investigations.slice(0, 5).map((inv) => (
                <div
                  key={inv.id}
                  className="recent-inv-item"
                  onClick={() => router.push(`/investigation/${inv.id}`)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="info">
                    <div className="title">{inv.title}</div>
                    <div className="meta">
                      {inv.mode} · {inv.evidence.length} evidence · {new Date(inv.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <ChevronRightIcon size={16} className="text-dim" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Capability overview */}
        <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div className="stat-tile">
            <div className="label">Agents</div>
            <div className="value">14</div>
            <div className="sub">Specialized workers</div>
          </div>
          <div className="stat-tile">
            <div className="label">Sources</div>
            <div className="value">{state.sources.filter((s) => s.configured).length}/{state.sources.length}</div>
            <div className="sub">Configured providers</div>
          </div>
          <div className="stat-tile">
            <div className="label">Evidence Signals</div>
            <div className="value">6</div>
            <div className="sub">Fusion signals</div>
          </div>
          <div className="stat-tile">
            <div className="label">Investigations</div>
            <div className="value">{state.investigations.length}</div>
            <div className="sub">Total created</div>
          </div>
        </div>
      </div>
    </div>
  );
}
