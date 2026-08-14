import { describe, it, expect } from 'vitest';
import {
  WebDiscoveryAgent,
  ReverseImageAgent,
  FaceSearchAgent,
  ArchiveAgent,
  DocumentAgent,
  VideoAgent,
  MetadataAgent,
  VisualContextAgent,
  SourceProvenanceAgent,
  EntityResolutionAgent,
  CrossCorroborationAgent,
  FtpResearchAgent,
  NewsgroupResearchAgent,
  ComputerSourceHunterAgent,
} from '../src/agents/builtin-agents.js';
import type { AgentTask } from '../src/agents/agent-types.js';

describe('builtin agents', () => {
  const agents = [
    new WebDiscoveryAgent(),
    new ReverseImageAgent(),
    new FaceSearchAgent(),
    new ArchiveAgent(),
    new DocumentAgent(),
    new VideoAgent(),
    new MetadataAgent(),
    new VisualContextAgent(),
    new SourceProvenanceAgent(),
    new EntityResolutionAgent(),
    new CrossCorroborationAgent(),
    new FtpResearchAgent(),
    new NewsgroupResearchAgent(),
    new ComputerSourceHunterAgent(),
  ];

  it('has 14 agents', () => {
    expect(agents).toHaveLength(14);
  });

  it('all agents have unique IDs', () => {
    const ids = agents.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all agents have non-empty capabilities', () => {
    for (const agent of agents) {
      expect(agent.capabilities.length).toBeGreaterThan(0);
    }
  });

  it('all agents return findings from run()', async () => {
    const task: AgentTask = {
      id: 'task-1',
      mode: 'text',
      objective: 'test objective',
      depth: 1,
      budget: { maxRequests: 10, timeoutMs: 5000 },
      constraints: {},
    };
    for (const agent of agents) {
      const findings = await agent.run(task);
      expect(findings).toBeDefined();
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0]?.agent).toBe(agent.id);
    }
  });

  it('archive agent has wayback and common-crawl capabilities', () => {
    const archive = new ArchiveAgent();
    expect(archive.capabilities).toContain('wayback');
    expect(archive.capabilities).toContain('common-crawl');
  });

  it('entity resolution agent has cross-source capability', () => {
    const er = new EntityResolutionAgent();
    expect(er.capabilities).toContain('entities');
    expect(er.capabilities).toContain('cross-source');
  });

  it('cross-corroboration agent has ranking capability', () => {
    const cc = new CrossCorroborationAgent();
    expect(cc.capabilities).toContain('corroboration');
    expect(cc.capabilities).toContain('ranking');
  });
});
