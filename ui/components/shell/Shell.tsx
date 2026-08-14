'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from '@/lib/store';
import { useKeyboardShortcuts } from '@/hooks/useKeyboard';
import {
  SearchIcon, InvestigateIcon, EvidenceIcon, GraphIcon, TimelineIcon,
  SourcesIcon, EntitiesIcon, SettingsIcon, ChevronLeftIcon,
  ChevronRightIcon, XIcon, CommandIcon, GlobeIcon, MenuIcon,
} from '@/lib/icons';

const NAV_SECTIONS = [
  {
    label: 'Workspace',
    items: [
      { href: '/', label: 'Investigations', icon: InvestigateIcon },
      { href: '/search', label: 'Search', icon: SearchIcon },
      { href: '/evidence', label: 'Evidence', icon: EvidenceIcon },
      { href: '/graph', label: 'Graph', icon: GraphIcon },
      { href: '/timeline', label: 'Timeline', icon: TimelineIcon },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/sources', label: 'Sources', icon: SourcesIcon },
      { href: '/entities', label: 'Entities', icon: EntitiesIcon },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
];

function Sidebar() {
  const { state, dispatch } = useApp();
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="logo">AS</div>
        <div style={{ overflow: 'hidden' }}>
          <div className="name">Advanced Search</div>
          <div className="name-sub">Investigation Platform</div>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="sidebar-section">
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              const count = item.href === '/' ? state.investigations.length : undefined;
              return (
                <a key={item.href} href={item.href} className={`sidebar-link ${active ? 'active' : ''}`}>
                  <span className="icon"><Icon size={16} /></span>
                  <span className="label">{item.label}</span>
                  {count !== undefined && count > 0 && <span className="badge-count">{count}</span>}
                </a>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-status">
          <span className="status-dot" />
          <span>Engine online · 14 agents</span>
        </div>
      </div>

      <button
        className="sidebar-collapse-btn"
        onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
        aria-label="Toggle sidebar"
      >
        {state.sidebarCollapsed ? <ChevronRightIcon size={14} /> : <ChevronLeftIcon size={14} />}
      </button>
    </aside>
  );
}

function TopBar() {
  const { state, dispatch, activeInvestigation } = useApp();

  return (
    <header className="topbar">
      {state.sidebarCollapsed && (
        <button
          className="topbar-btn"
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          aria-label="Expand sidebar"
        >
          <MenuIcon size={16} />
        </button>
      )}

      <div className="topbar-search" onClick={() => dispatch({ type: 'TOGGLE_COMMAND_PALETTE', open: true })}>
        <span className="search-icon"><SearchIcon size={14} /></span>
        <input
          readOnly
          placeholder="Search or run a command…"
          aria-label="Open command palette"
        />
        <span className="kbd-hint">⌘K</span>
      </div>

      {activeInvestigation && (
        <div className="topbar-investigation">
          <span className="inv-label">Investigation</span>
          <span className="inv-name">{activeInvestigation.title}</span>
        </div>
      )}

      <div className="topbar-spacer" />

      <div className="topbar-actions">
        <a href="/sources" className="topbar-btn" title="Sources">
          <GlobeIcon size={16} />
          <span>{state.sources.filter((s) => s.configured).length}</span>
          <span className="text-dim">/ {state.sources.length}</span>
        </a>
        <div className="topbar-divider" />
        <a href="/settings" className="topbar-btn" title="Settings">
          <SettingsIcon size={16} />
        </a>
      </div>
    </header>
  );
}

function CommandPalette() {
  const { state, dispatch } = useApp();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState('');
  const [selectedIdx, setSelectedIdx] = React.useState(0);

  const commands = React.useMemo(() => {
    const items = [
      { section: 'Navigation', label: 'New Investigation', href: '/' },
      { section: 'Navigation', label: 'Search', href: '/search' },
      { section: 'Navigation', label: 'Evidence Board', href: '/evidence' },
      { section: 'Navigation', label: 'Evidence Graph', href: '/graph' },
      { section: 'Navigation', label: 'Timeline', href: '/timeline' },
      { section: 'Navigation', label: 'Sources', href: '/sources' },
      { section: 'Navigation', label: 'Entities', href: '/entities' },
      { section: 'Navigation', label: 'Settings', href: '/settings' },
    ];
    if (query) return items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()));
    return items;
  }, [query]);

  React.useEffect(() => {
    if (state.commandPaletteOpen) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [state.commandPaletteOpen]);

  if (!state.commandPaletteOpen) return null;

  const handleExecute = (cmd: typeof commands[0]) => {
    dispatch({ type: 'TOGGLE_COMMAND_PALETTE', open: false });
    if (cmd.href) window.location.href = cmd.href;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, commands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (commands[selectedIdx]) handleExecute(commands[selectedIdx]);
    } else if (e.key === 'Escape') {
      dispatch({ type: 'TOGGLE_COMMAND_PALETTE', open: false });
    }
  };

  return (
    <div className="cmdk-overlay" onClick={() => dispatch({ type: 'TOGGLE_COMMAND_PALETTE', open: false })}>
      <div className="cmdk-panel" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="cmdk-input-wrap">
          <span className="icon"><SearchIcon size={18} /></span>
          <input
            ref={inputRef}
            className="cmdk-input"
            placeholder="Type a command or search…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
            onKeyDown={handleKeyDown}
            aria-label="Command palette input"
          />
        </div>
        <div className="cmdk-results">
          {commands.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px' }}>
              <div className="title">No results</div>
              <div className="desc">Try a different search term.</div>
            </div>
          ) : (
            commands.map((cmd, idx) => (
              <div
                key={cmd.label}
                className={`cmdk-item ${idx === selectedIdx ? 'selected' : ''}`}
                onClick={() => handleExecute(cmd)}
                onMouseEnter={() => setSelectedIdx(idx)}
                role="option"
                aria-selected={idx === selectedIdx}
              >
                <span><CommandIcon size={14} /></span>
                <span>{cmd.label}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { state } = useApp();
  useKeyboardShortcuts();

  return (
    <div className={`app-shell ${state.sidebarCollapsed ? 'sidebar-collapsed' : ''} ${state.sidebarOpenMobile ? 'sidebar-open' : ''}`}>
      <Sidebar />
      <TopBar />
      <div className="main-content">
        {children}
      </div>
      <CommandPalette />
    </div>
  );
}
