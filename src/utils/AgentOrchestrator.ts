import { AgentPayload, SemanticGroundingService, HyperlocalContextFilter } from './AgentSemanticOrchestrator';

export class HermesOrchestrator {
  private semanticService = new SemanticGroundingService();
  private contextFilter = new HyperlocalContextFilter();

  async processRequest(payload: AgentPayload) {
    // Parallel Execution for latency minimization
    const [filteredPayload, groundedContext] = await Promise.all([
      this.contextFilter.applyFilter(payload),
      this.semanticService.groundQuery(payload.query, payload.postcode)
    ]);

    return {
      ...filteredPayload,
      groundedContext
    };
  }
}
