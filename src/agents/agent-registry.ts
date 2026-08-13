import type { SearchAgent, SearchAgentId } from './agent-types.js';

export class SearchAgentRegistry {
  private readonly agents = new Map<SearchAgentId, SearchAgent>();

  register(agent: SearchAgent): void { this.agents.set(agent.id, agent); }
  get(id: SearchAgentId): SearchAgent | undefined { return this.agents.get(id); }
  all(): SearchAgent[] { return [...this.agents.values()]; }
  capable(capability: string): SearchAgent[] {
    return this.all().filter((agent) => agent.capabilities.includes(capability));
  }
}
