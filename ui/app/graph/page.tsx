'use client';

import React from 'react';
import { useApp } from '@/lib/store';
import { GraphIcon, ZoomInIcon, ZoomOutIcon } from '@/lib/icons';

const NODE_COLORS: Record<string, string> = {
  person: '#a5b4fc',
  organization: '#86efac',
  location: '#93c5fd',
  event: '#fde047',
  document: '#4ade80',
  image: '#c084fc',
  url: '#60a5fa',
  video: '#f87171',
  claim: '#fb923c',
};

export default function GraphPage() {
  const { state } = useApp();
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [hiddenTypes, setHiddenTypes] = React.useState<Set<string>>(new Set());
  const [isPanning, setIsPanning] = React.useState(false);
  const [panStart, setPanStart] = React.useState({ x: 0, y: 0 });

  // Build graph from evidence and entities
  const { nodes, edges } = React.useMemo(() => {
    const nodeList: { id: string; type: string; label: string; x: number; y: number }[] = [];
    const edgeList: { id: string; source: string; target: string }[] = [];
    let angle = 0;

    // Add evidence nodes
    state.investigations.forEach((inv) => {
      inv.evidence.forEach((ev, i) => {
        const radius = 200 + (i % 3) * 80;
        angle += 0.4;
        nodeList.push({
          id: ev.id,
          type: ev.observation.sourceType === 'image' ? 'image' : ev.observation.sourceType === 'video' ? 'video' : 'document',
          label: ev.observation.title?.slice(0, 30) ?? 'Untitled',
          x: 400 + Math.cos(angle) * radius,
          y: 300 + Math.sin(angle) * radius,
        });
      });
    });

    // Add entity nodes
    state.investigations.forEach((inv) => {
      inv.entities.forEach((e, i) => {
        angle += 0.5;
        nodeList.push({
          id: `entity-${e.id}`,
          type: e.type,
          label: e.name,
          x: 400 + Math.cos(angle) * 150,
          y: 300 + Math.sin(angle) * 150,
        });
        // Connect entities to evidence
        inv.evidence.forEach((ev) => {
          if (e.appearances.includes(ev.observation.id)) {
            edgeList.push({ id: `edge-${e.id}-${ev.id}`, source: `entity-${e.id}`, target: ev.id });
          }
        });
      });
    });

    return { nodes: nodeList, edges: edgeList };
  }, [state.investigations]);

  const visibleNodes = nodes.filter((n) => !hiddenTypes.has(n.type));
  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = edges.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  const toggleType = (type: string) => {
    const next = new Set(hiddenTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    setHiddenTypes(next);
  };

  if (nodes.length === 0) {
    return (
      <div className="main-content-scroll">
        <div className="empty-state" style={{ paddingTop: 120 }}>
          <div className="icon"><GraphIcon size={48} /></div>
          <div className="title">No graph data yet</div>
          <div className="desc">The evidence graph visualizes relationships between entities, evidence items, and sources. Collect evidence and resolve entities to populate the graph.</div>
          <div className="actions">
            <a href="/search" className="btn btn-primary btn-sm">Start Searching</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="graph-container">
      <div className="graph-legend">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div
            key={type}
            className={`graph-legend-item ${hiddenTypes.has(type) ? 'disabled' : ''}`}
            onClick={() => toggleType(type)}
          >
            <span className="legend-dot" style={{ background: color }} />
            <span style={{ textTransform: 'capitalize' }}>{type}</span>
          </div>
        ))}
      </div>

      <svg
        ref={svgRef}
        className="graph-svg"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {visibleEdges.map((edge) => {
            const s = visibleNodes.find((n) => n.id === edge.source);
            const t = visibleNodes.find((n) => n.id === edge.target);
            if (!s || !t) return null;
            return (
              <line
                key={edge.id}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                className="graph-edge"
              />
            );
          })}
          {/* Nodes */}
          {visibleNodes.map((node) => (
            <g key={node.id} className="graph-node" transform={`translate(${node.x}, ${node.y})`}>
              <circle r={8} fill={NODE_COLORS[node.type] ?? '#94a3b8'} fillOpacity={0.2} stroke={NODE_COLORS[node.type] ?? '#94a3b8'} />
              <text className="graph-node-label" y={-14}>
                {node.label.length > 20 ? node.label.slice(0, 20) + '…' : node.label}
              </text>
            </g>
          ))}
        </g>
      </svg>

      <div className="graph-controls">
        <button className="graph-control-btn" onClick={() => setZoom((z) => Math.min(z * 1.2, 3))} title="Zoom in">
          <ZoomInIcon size={16} />
        </button>
        <button className="graph-control-btn" onClick={() => setZoom((z) => Math.max(z / 1.2, 0.2))} title="Zoom out">
          <ZoomOutIcon size={16} />
        </button>
        <button className="graph-control-btn" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Reset view">
          <span style={{ fontSize: 10 }}>⟲</span>
        </button>
      </div>
    </div>
  );
}
