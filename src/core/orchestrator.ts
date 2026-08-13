import { AdapterRegistry } from './registry';
import type { SearchObservation, SearchRequest } from './types';

export class SearchOrchestrator {
  constructor(private readonly registry: AdapterRegistry) {}

  async execute(request: SearchRequest): Promise<SearchObservation[]> {
    const adapters = this.registry.list(request.mode);
    const available = await Promise.all(
      adapters.map(async (adapter) => ({ adapter, available: await adapter.isAvailable() })),
    );

    const jobs = available
      .filter(({ available }) => available)
      .map(({ adapter }) => adapter.search(request));

    const batches = await Promise.allSettled(jobs);
    return batches.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  }
}
