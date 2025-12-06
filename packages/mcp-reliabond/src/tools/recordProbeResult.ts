// ===========================================
// MCP TOOL: record_probe_result
// ===========================================

import { storage } from '../storage/kvStore';
import type {
  RecordProbeResultRequest,
  RecordProbeResultResponse,
  ProbeResult,
  McpToolDefinition,
} from '../types';

export const recordProbeResultDefinition: McpToolDefinition = {
  name: 'record_probe_result',
  description: `Records a probe result from a health check performed on a registered service. Updates rolling metrics and triggers status recalculation. Called by probe agents after each health check.`,
  inputSchema: {
    type: 'object',
    properties: {
      serviceId: {
        type: 'string',
        description: 'ID of the service that was probed',
      },
      probeAgentId: {
        type: 'string',
        description: 'ID of the probe agent that performed the check',
      },
      latencyMs: {
        type: 'number',
        description: 'Response latency in milliseconds',
      },
      statusCode: {
        type: 'number',
        description: 'HTTP status code received (0 if connection failed)',
      },
      ok: {
        type: 'boolean',
        description: 'Whether the check was successful (2xx response, within timeout)',
      },
      timestamp: {
        type: 'number',
        description: 'Unix timestamp of the check (defaults to now)',
      },
      errorMessage: {
        type: 'string',
        description: 'Error message if the check failed',
      },
    },
    required: ['serviceId', 'probeAgentId', 'latencyMs', 'statusCode', 'ok'],
  },
};

export async function recordProbeResult(
  params: RecordProbeResultRequest
): Promise<RecordProbeResultResponse> {
  const service = await storage.getService(params.serviceId);
  
  if (!service) {
    throw new Error(`Service not found: ${params.serviceId}`);
  }

  // Create probe result record
  const probeResult: ProbeResult = {
    id: `probe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    serviceId: params.serviceId,
    probeAgentId: params.probeAgentId,
    timestamp: params.timestamp || Date.now(),
    latencyMs: params.latencyMs,
    statusCode: params.statusCode,
    ok: params.ok,
    errorMessage: params.errorMessage,
  };

  // Store the probe result
  await storage.addProbeResult(probeResult);

  // Calculate updated rolling metrics
  const metrics = await storage.calculateRollingMetrics(params.serviceId);

  // Update service status based on metrics
  const slo = service.sloConfig;
  let newStatus = service.status;
  
  if (metrics.totalChecks >= 3) { // Need minimum samples
    const latencyBreached = metrics.p99LatencyMs > slo.maxLatencyP99Ms;
    const availabilityBreached = metrics.uptimePercent < slo.minUptimePercent;

    if (latencyBreached || availabilityBreached) {
      // Check if this is sustained breach
      const breachStart = storage.getBreachStartTime(params.serviceId);
      const now = Date.now();
      
      if (!breachStart) {
        // Start tracking breach
        storage.setBreachStartTime(params.serviceId, now);
        newStatus = 'WARN';
      } else {
        const breachDuration = (now - breachStart) / 1000;
        if (breachDuration >= slo.breachThresholdSeconds) {
          newStatus = 'BREACHED';
        } else {
          newStatus = 'WARN';
        }
      }
    } else {
      // Clear breach tracking if metrics recovered
      storage.clearBreachStartTime(params.serviceId);
      newStatus = 'OK';
    }
  }

  // Calculate new reliability score (weighted moving average)
  const successRate = metrics.uptimePercent;
  const latencyScore = Math.max(0, 100 - (metrics.p99LatencyMs / slo.maxLatencyP99Ms) * 50);
  const newReliabilityScore = Math.round(
    (service.reliabilityScore * 0.9 + (successRate * 0.6 + latencyScore * 0.4) * 0.1) * 10
  ) / 10;

  // Update service
  await storage.updateService(params.serviceId, {
    status: newStatus,
    reliabilityScore: Math.min(100, Math.max(0, newReliabilityScore)),
    lastCheckTime: probeResult.timestamp,
  });

  return {
    success: true,
    probeResultId: probeResult.id,
    updatedMetrics: metrics,
  };
}
