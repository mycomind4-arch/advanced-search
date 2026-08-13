import { SearchAgentRegistry } from './agent-registry.js';
import {
  ArchiveAgent, CrossCorroborationAgent, DocumentAgent, EntityResolutionAgent,
  FaceSearchAgent, FtpResearchAgent, MetadataAgent, NewsgroupResearchAgent,
  ReverseImageAgent, SourceProvenanceAgent, VideoAgent, VisualContextAgent,
  WebDiscoveryAgent, ComputerSourceHunterAgent
} from './builtin-agents.js';

export function createDefaultAgentRegistry(): SearchAgentRegistry {
  const registry = new SearchAgentRegistry();
  [
    new WebDiscoveryAgent(), new ReverseImageAgent(), new FaceSearchAgent(), new ArchiveAgent(),
    new DocumentAgent(), new VideoAgent(), new MetadataAgent(), new VisualContextAgent(),
    new SourceProvenanceAgent(), new EntityResolutionAgent(), new CrossCorroborationAgent(),
    new FtpResearchAgent(), new NewsgroupResearchAgent(), new ComputerSourceHunterAgent(),
  ].forEach((agent) => registry.register(agent));
  return registry;
}
