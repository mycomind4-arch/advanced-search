import type { AgentTask, SearchAgent } from './agent-types.js';
import { SearchAgentRegistry } from './agent-registry.js';

export class AgentSearchCoordinator {
  constructor(private readonly registry: SearchAgentRegistry) {}

  async run(task: AgentTask, requested: string[] = []): Promise<ReturnType<SearchAgent['run']> extends Promise<infer T> ? T : never> {
    const agents = requested.length
      ? requested.map((id) => this.registry.get(id as never)).filter((a): a is SearchAgent => Boolean(a))
      : this.registry.all();
    const results = await Promise.all(agents.map((agent) => agent.run(task).catch(() => [])));
    return results.flat() as never;
  }
}

export function defaultAgentBudget(depth: number): AgentTask['budget'] {
  return { maxRequests: Math.max(10, 40 - depth * 5), timeoutMs: Math.max(5_000, 20_000 - depth * 1_000) };
}
