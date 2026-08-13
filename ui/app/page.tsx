'use client';

import { useState } from 'react';

const modes = ['Web', 'Images', 'Faces', 'Archives', 'Documents', 'Video', 'FTP', 'Newsgroups'];
const agents = [
  ['Web Discovery', 'Broad public-web discovery', '68%'],
  ['Reverse Image', 'Image copies and derivatives', '74%'],
  ['Face Search', 'Face similarity and candidates', '82%'],
  ['Archive', 'Historical and deleted-page discovery', '61%'],
  ['Document', 'PDF and embedded-image extraction', '55%'],
  ['Provenance', 'Source lineage and deduplication', '91%'],
];

export default function Home() {
  const [mode, setMode] = useState('Web');
  const [query, setQuery] = useState('');
  const [running, setRunning] = useState(false);
  const [ran, setRan] = useState(false);
  const run = async () => { setRunning(true); setRan(false); await new Promise(r => setTimeout(r, 900)); setRunning(false); setRan(true); };
  return <div className="shell">
    <header className="top"><div className="brand">ADVANCED SEARCH</div><div className="status">● Engine online · 12 agents available</div></header>
    <div className="layout">
      <aside className="side"><h3>Workspace</h3><div className="nav"><div className="active">Search</div><div>Investigations</div><div>Evidence Graph</div><div>Sources</div><div>Saved Searches</div></div><h3>System</h3><div className="nav"><div>Agents</div><div>Providers</div><div>Budgets</div><div>Audit Log</div></div></aside>
      <main className="main">
        <div className="hero"><div><h1>Research anything. Find the hard-to-find.</h1><div className="muted">Multi-source discovery, visual search, archives and evidence fusion.</div></div></div>
        <section className="search"><div className="row">{modes.map(m => <button key={m} className={`chip ${mode===m?'active':''}`} onClick={()=>setMode(m)}>{m}</button>)}</div><textarea value={query} onChange={e=>setQuery(e.target.value)} placeholder="Describe what you are looking for, paste a URL, or enter a research question…"/><div className="row" style={{justifyContent:'space-between',alignItems:'center'}}><span className="small">Mode: {mode} · parallel agents · provenance enabled</span><button className="primary" onClick={run} disabled={running}>{running?'Searching…':'Start search'}</button></div></section>
        <section className="grid"><div className="card"><h2>AGENTS</h2><div className="metric">12</div><div className="small">specialized workers</div></div><div className="card"><h2>SOURCES</h2><div className="metric">24+</div><div className="small">provider classes</div></div><div className="card"><h2>EVIDENCE</h2><div className="metric">6</div><div className="small">fusion signals</div></div></section>
        <section className="card results"><h2>SEARCH ORCHESTRATION</h2>{agents.map(([name,desc,pct])=><div className="result" key={name}><div className="thumb"/><div><strong>{name}</strong><div className="small">{desc}</div><div className="bar"><i style={{width:pct}}/></div></div><div className="score">{ran ? pct : '—'}</div></div>)}{ran && <div className="small" style={{paddingTop:14}}>Demo orchestration completed locally in the UI. Production provider credentials and Computer runtime are intentionally not simulated.</div>}</section>
      </main>
    </div>
  </div>;
}
