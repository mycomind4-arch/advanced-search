import type { SearchAdapter, SearchMode } from './types.js';

export class AdapterRegistry {
  private readonly adapters = new Map<string, SearchAdapter>();

  register(adapter: SearchAdapter): void {
    if (this.adapters.has(adapter.id)) throw new Error(`Adapter already registered: ${adapter.id}`);
    this.adapters.set(adapter.id, adapter);
  }
  registerMany(adapters: SearchAdapter[]): void { for (const adapter of adapters) this.register(adapter); }
  get(id: string): SearchAdapter | undefined { return this.adapters.get(id); }
  list(mode?: SearchMode): SearchAdapter[] {
    const adapters = [...this.adapters.values()];
    return mode ? adapters.filter((adapter) => adapter.modes.includes(mode)) : adapters;
  }
}
