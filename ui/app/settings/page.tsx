'use client';

import React from 'react';
import { useApp } from '@/lib/store';
import { SettingsIcon, ShieldIcon } from '@/lib/icons';

export default function SettingsPage() {
  const { state } = useApp();
  const [autoSave, setAutoSave] = React.useState(true);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [maxDepth, setMaxDepth] = React.useState(2);
  const [maxJobs, setMaxJobs] = React.useState(40);
  const [timeout, setTimeoutMs] = React.useState(15000);

  return (
    <div className="main-content-scroll">
      <div className="settings-page">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 'var(--fs-xl)', fontWeight: 600, margin: '0 0 6px' }}>Settings</h1>
          <p className="text-sm text-muted">Configure the investigation workspace and search behavior.</p>
        </div>

        {/* Search configuration */}
        <div className="settings-section">
          <h2>Search Configuration</h2>
          <div className="settings-row">
            <div>
              <div className="label">Max Search Depth</div>
              <div className="desc">Maximum recursion depth for follow-up clue expansion.</div>
            </div>
            <input
              type="number"
              className="input"
              style={{ width: 80 }}
              value={maxDepth}
              onChange={(e) => setMaxDepth(Number(e.target.value))}
              min={1}
              max={5}
            />
          </div>
          <div className="settings-row">
            <div>
              <div className="label">Max Concurrent Jobs</div>
              <div className="desc">Maximum number of parallel search adapter jobs.</div>
            </div>
            <input
              type="number"
              className="input"
              style={{ width: 80 }}
              value={maxJobs}
              onChange={(e) => setMaxJobs(Number(e.target.value))}
              min={1}
              max={100}
            />
          </div>
          <div className="settings-row">
            <div>
              <div className="label">Default Timeout (ms)</div>
              <div className="desc">Per-adapter timeout for search requests.</div>
            </div>
            <input
              type="number"
              className="input"
              style={{ width: 100 }}
              value={timeout}
              onChange={(e) => setTimeoutMs(Number(e.target.value))}
              min={5000}
              max={60000}
              step={1000}
            />
          </div>
        </div>

        {/* Provider configuration */}
        <div className="settings-section">
          <h2>Provider Configuration</h2>
          <p className="text-xs text-muted mb-2" style={{ marginBottom: 12 }}>
            Providers require API credentials configured via environment variables. No secrets are stored in the UI.
          </p>
          {state.sources.map((s) => (
            <div key={s.id} className="settings-row">
              <div>
                <div className="label">{s.name}</div>
                <div className="desc">{s.category} · {s.modes.join(', ')}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {s.configured ? (
                  <span className="badge badge-success">Configured</span>
                ) : (
                  <span className="badge badge-default">Not configured</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Interface */}
        <div className="settings-section">
          <h2>Interface</h2>
          <div className="settings-row">
            <div>
              <div className="label">Auto-save investigations</div>
              <div className="desc">Automatically persist investigations to local storage.</div>
            </div>
            <div className={`toggle ${autoSave ? 'on' : ''}`} onClick={() => setAutoSave(!autoSave)} role="switch" aria-checked={autoSave} tabIndex={0} />
          </div>
          <div className="settings-row">
            <div>
              <div className="label">Reduced motion</div>
              <div className="desc">Minimize animations and transitions.</div>
            </div>
            <div className={`toggle ${reducedMotion ? 'on' : ''}`} onClick={() => setReducedMotion(!reducedMotion)} role="switch" aria-checked={reducedMotion} tabIndex={0} />
          </div>
        </div>

        {/* Safety */}
        <div className="settings-section">
          <h2>Safety & Governance</h2>
          <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'start' }}>
            <ShieldIcon size={20} className="text-muted" />
            <div>
              <div className="text-sm text-secondary" style={{ fontWeight: 600, marginBottom: 4 }}>Source policy controls</div>
              <div className="text-xs text-muted" style={{ lineHeight: 1.6 }}>
                FTP and NNTP adapters are read-only and allowlist-driven. The system does not perform credential guessing,
                port scanning, access-control bypass, posting, deletion, or private-source enumeration.
                Provider credentials are isolated and rate-limited per the Computer tool policy.
              </div>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="settings-section">
          <h2>About</h2>
          <div className="card">
            <div className="text-sm text-secondary" style={{ fontWeight: 600, marginBottom: 8 }}>Advanced Search Engine</div>
            <div className="text-xs text-muted" style={{ lineHeight: 1.6 }}>
              A modular, multimodal investigation search platform for discovering publicly accessible images,
              documents, video, pages, archives and other evidence. Core architecture includes agent registry,
              bounded orchestration, evidence normalization, recursive search planning, and Computer integration.
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 16, fontSize: 'var(--fs-xs)', color: 'var(--text-dim)' }}>
              <span>Version 0.1.0</span>
              <span>14 agents</span>
              <span>{state.sources.length} source adapters</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
