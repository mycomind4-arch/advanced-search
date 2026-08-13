import type { AgentFinding, AgentTask, SearchAgent } from './agent-types.js';

abstract class PlannedAgent implements SearchAgent {
  abstract readonly id: SearchAgent['id'];
  abstract readonly capabilities: string[];
  async run(task: AgentTask): Promise<AgentFinding[]> {
    return [{ agent: this.id, title: `${this.id} task planned`, notes: [task.objective, 'Provider adapters execute the plan when credentials and permitted access are configured.'] }];
  }
}

export class WebDiscoveryAgent extends PlannedAgent { readonly id = 'web-discovery' as const; readonly capabilities = ['web', 'search-engine']; }
export class ReverseImageAgent extends PlannedAgent { readonly id = 'reverse-image' as const; readonly capabilities = ['reverse-image', 'image']; }
export class FaceSearchAgent extends PlannedAgent { readonly id = 'face-search' as const; readonly capabilities = ['face', 'identity-candidate']; }
export class ArchiveAgent extends PlannedAgent { readonly id = 'archive' as const; readonly capabilities = ['wayback', 'common-crawl', 'historical']; }
export class DocumentAgent extends PlannedAgent { readonly id = 'document' as const; readonly capabilities = ['pdf', 'ocr', 'document-images']; }
export class VideoAgent extends PlannedAgent { readonly id = 'video' as const; readonly capabilities = ['video', 'keyframes']; }
export class MetadataAgent extends PlannedAgent { readonly id = 'metadata' as const; readonly capabilities = ['exif', 'ocr', 'filename']; }
export class VisualContextAgent extends PlannedAgent { readonly id = 'visual-context' as const; readonly capabilities = ['objects', 'scene', 'location-clues']; }
export class SourceProvenanceAgent extends PlannedAgent { readonly id = 'source-provenance' as const; readonly capabilities = ['provenance', 'deduplication']; }
export class EntityResolutionAgent extends PlannedAgent { readonly id = 'entity-resolution' as const; readonly capabilities = ['entities', 'cross-source']; }
export class CrossCorroborationAgent extends PlannedAgent { readonly id = 'cross-corroboration' as const; readonly capabilities = ['corroboration', 'ranking']; }
