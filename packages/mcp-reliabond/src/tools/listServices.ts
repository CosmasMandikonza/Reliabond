// ===========================================
// MCP TOOL: list_services
// ===========================================

import { storage } from '../storage/kvStore';
import type { ListServicesResponse, McpToolDefinition } from '../types';

export const listServicesDefinition: McpToolDefinition = {
  name: 'list_services',
  description: `Lists all registered services in the Reliabond network with their current status, SLO configuration, reliability scores, and bond information. Use this to discover services to monitor or to get an overview of the network health.`,
  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['OK', 'WARN', 'BREACHED', 'UNKNOWN'],
        description: 'Optional filter by service status',
      },
      includeMetrics: {
        type: 'boolean',
        description: 'Include recent rolling metrics in response',
      },
    },
  },
};

export async function listServices(params: {
  status?: string;
  includeMetrics?: boolean;
}): Promise<ListServicesResponse> {
  let services = await storage.getServices();

  // Filter by status if provided
  if (params.status) {
    services = services.filter((s) => s.status === params.status);
  }

  // Optionally enrich with metrics
  if (params.includeMetrics) {
    services = await Promise.all(
      services.map(async (service) => {
        const metrics = await storage.calculateRollingMetrics(service.id);
        return {
          ...service,
          currentMetrics: {
            uptimePercent: metrics.uptimePercent,
            p99LatencyMs: metrics.p99LatencyMs,
            avgLatencyMs: metrics.avgLatencyMs,
            totalChecks: metrics.totalChecks,
          },
        };
      })
    );
  }

  return {
    services,
    totalCount: services.length,
  };
}
