import { AdapterRegistry } from './registry.js';
import type { SearchObservation, SearchRequest } from './types.js';
import { normalizeObservations, rankObservation } from './normalizer.js';

export class SearchOrchestrator {
  constructor(private readonly registry: AdapterRegistry) {}

  async execute(request: SearchRequest): Promise<SearchObservation[]> {
    const adapters = this.registry.list(request.mode);
    const available = await Promise.all(
      adapters.map(async (adapter) => ({ adapter, available: await adapter.isAvailable() })),
    );
    const jobs = available
      .filter(({ available }) => available)
      .slice(0, request.budget?.maxJobs ?? available.length)
      .map(({ adapter }) => Promise.race([
        adapter.search(request),
        new Promise<SearchObservation[]>((_, reject) => setTimeout(() => reject(new Error(`adapter timeout: ${adapter.id}`)), request.budget?.timeoutMs ?? 15000)),
      ]));
    const batches = await Promise.allSettled(jobs);
    return normalizeObservations(batches.flatMap((result) => result.status === 'fulfilled' ? result.value : []))
      .sort((a, b) => rankObservation(b) - rankObservation(a));
  }
}
