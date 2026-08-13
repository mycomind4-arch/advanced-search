import type { AgentFinding, AgentTask, SearchAgent } from './agent-types.js';

abstract class PlannedAgent implements SearchAgent {
  abstract readonly id: SearchAgent['id'];
  abstract readonly capabilities: string[];
  async run(task: AgentTask): Promise<AgentFinding[]> {
    return [{ agent: this.id, title: `${this.id} task planned`, notes: [task.objective, 'Provider adapters execute the plan when credentials and permitted access are configured.'] }];
  }
}

export class WebDiscoveryAgent extends PlannedAgent { readonly id = 'web-discovery' as const; readonly capabilities = ['web', 'search-engine', 'query-expansion']; }
export class ReverseImageAgent extends PlannedAgent { readonly id = 'reverse-image' as const; readonly capabilities = ['reverse-image', 'image', 'near-duplicate']; }
export class FaceSearchAgent extends PlannedAgent { readonly id = 'face-search' as const; readonly capabilities = ['face', 'identity-candidate', 'multi-reference-face']; }
export class ArchiveAgent extends PlannedAgent { readonly id = 'archive' as const; readonly capabilities = ['wayback', 'common-crawl', 'historical', 'deleted-page-discovery']; }
export class DocumentAgent extends PlannedAgent { readonly id = 'document' as const; readonly capabilities = ['pdf', 'ocr', 'document-images', 'attachment-extraction']; }
export class VideoAgent extends PlannedAgent { readonly id = 'video' as const; readonly capabilities = ['video', 'keyframes', 'frame-deduplication']; }
export class MetadataAgent extends PlannedAgent { readonly id = 'metadata' as const; readonly capabilities = ['exif', 'ocr', 'filename', 'hashing']; }
export class VisualContextAgent extends PlannedAgent { readonly id = 'visual-context' as const; readonly capabilities = ['objects', 'scene', 'location-clues', 'visual-embeddings']; }
export class SourceProvenanceAgent extends PlannedAgent { readonly id = 'source-provenance' as const; readonly capabilities = ['provenance', 'deduplication', 'earliest-source']; }
export class EntityResolutionAgent extends PlannedAgent { readonly id = 'entity-resolution' as const; readonly capabilities = ['entities', 'cross-source', 'alias-resolution']; }
export class CrossCorroborationAgent extends PlannedAgent { readonly id = 'cross-corroboration' as const; readonly capabilities = ['corroboration', 'ranking', 'independence-analysis']; }
export class FtpResearchAgent extends PlannedAgent { readonly id = 'ftp-research' as const; readonly capabilities = ['ftp', 'legacy-source', 'public-directory-search', 'file-discovery']; }
export class NewsgroupResearchAgent extends PlannedAgent { readonly id = 'newsgroup-research' as const; readonly capabilities = ['nntp', 'newsgroups', 'message-search', 'legacy-source']; }
export class ComputerSourceHunterAgent extends PlannedAgent { readonly id = 'computer-source-hunter' as const; readonly capabilities = ['browser', 'computer-runtime', 'ftp', 'nntp', 'archives', 'shell-tools', 'evidence-packaging']; }
