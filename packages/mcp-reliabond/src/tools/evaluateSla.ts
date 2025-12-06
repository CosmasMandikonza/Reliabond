// ===========================================
// MCP TOOL: evaluate_sla
// ===========================================

import { storage } from '../storage/kvStore';
import type {
  EvaluateSlaRequest,
  SlaEvaluation,
  ServiceStatus,
  McpToolDefinition,
} from '../types';

export const evaluateSlaDefinition: McpToolDefinition = {
  name: 'evaluate_sla',
  description: `Evaluates the SLA status for a specific service based on recent probe results. Returns detailed analysis including breach type, duration, current metrics vs SLO targets, and recommended compensation percentage. Use this to determine if an incident should be registered.`,
  inputSchema: {
    type: 'object',
    properties: {
      serviceId: {
        type: 'string',
        description: 'ID of the service to evaluate',
      },
    },
    required: ['serviceId'],
  },
};

export async function evaluateSla(
  params: EvaluateSlaRequest
): Promise<SlaEvaluation> {
  const service = await storage.getService(params.serviceId);
  
  if (!service) {
    throw new Error(`Service not found: ${params.serviceId}`);
  }

  const metrics = await storage.calculateRollingMetrics(params.serviceId);
  const slo = service.sloConfig;

  // Evaluate breach conditions
  const latencyBreached = metrics.p99LatencyMs > slo.maxLatencyP99Ms;
  const availabilityBreached = metrics.uptimePercent < slo.minUptimePercent;

  let status: ServiceStatus = 'OK';
  let breachType: 'latency' | 'availability' | 'both' | undefined;
  let breachDurationSeconds = 0;
  let recommendedCompensation = 0;
  let reasoning = '';

  if (latencyBreached && availabilityBreached) {
    breachType = 'both';
  } else if (latencyBreached) {
    breachType = 'latency';
  } else if (availabilityBreached) {
    breachType = 'availability';
  }

  if (breachType) {
    const breachStart = storage.getBreachStartTime(params.serviceId);
    const now = Date.now();

    if (breachStart) {
      breachDurationSeconds = Math.floor((now - breachStart) / 1000);
      
      if (breachDurationSeconds >= slo.breachThresholdSeconds) {
        status = 'BREACHED';
        
        // Calculate compensation based on severity and duration
        // Base: 1% per breach threshold period, max 10%
        const periodsBreached = Math.floor(
          breachDurationSeconds / slo.breachThresholdSeconds
        );
        
        // Severity multiplier
        let severityMultiplier = 1;
        if (breachType === 'both') {
          severityMultiplier = 2;
        } else if (breachType === 'availability') {
          // Availability breaches are more severe
          const availabilityGap = slo.minUptimePercent - metrics.uptimePercent;
          severityMultiplier = 1 + (availabilityGap / 10);
        } else {
          // Latency breaches
          const latencyOverage = metrics.p99LatencyMs / slo.maxLatencyP99Ms;
          severityMultiplier = Math.min(2, latencyOverage);
        }

        recommendedCompensation = Math.min(
          10,
          Math.round(periodsBreached * severityMultiplier * 10) / 10
        );

        reasoning = generateBreachReasoning(
          breachType,
          metrics,
          slo,
          breachDurationSeconds,
          recommendedCompensation
        );
      } else {
        status = 'WARN';
        reasoning = `Service is showing degraded performance but has not exceeded the breach threshold of ${slo.breachThresholdSeconds}s. Current breach duration: ${breachDurationSeconds}s. Monitoring closely.`;
      }
    } else {
      status = 'WARN';
      reasoning = 'Performance degradation detected. Breach tracking initiated.';
    }
  } else {
    reasoning = 'All SLO targets are being met. Service is operating normally.';
  }

  return {
    serviceId: params.serviceId,
    evaluatedAt: Date.now(),
    status,
    breachType,
    breachDurationSeconds,
    currentMetrics: {
      uptimePercent: Math.round(metrics.uptimePercent * 100) / 100,
      p99LatencyMs: Math.round(metrics.p99LatencyMs),
      avgLatencyMs: Math.round(metrics.avgLatencyMs),
    },
    sloTargets: {
      minUptimePercent: slo.minUptimePercent,
      maxLatencyP99Ms: slo.maxLatencyP99Ms,
    },
    recommendedCompensation,
    reasoning,
  };
}

function generateBreachReasoning(
  breachType: 'latency' | 'availability' | 'both',
  metrics: { uptimePercent: number; p99LatencyMs: number; avgLatencyMs: number },
  slo: { minUptimePercent: number; maxLatencyP99Ms: number },
  duration: number,
  compensation: number
): string {
  const parts: string[] = [];

  parts.push(`SLA BREACH CONFIRMED for ${Math.floor(duration / 60)} minutes ${duration % 60} seconds.`);

  if (breachType === 'both' || breachType === 'availability') {
    const gap = (slo.minUptimePercent - metrics.uptimePercent).toFixed(2);
    parts.push(
      `Availability: ${metrics.uptimePercent.toFixed(2)}% (target: ${slo.minUptimePercent}%, gap: ${gap}%).`
    );
  }

  if (breachType === 'both' || breachType === 'latency') {
    const overage = Math.round(metrics.p99LatencyMs - slo.maxLatencyP99Ms);
    parts.push(
      `P99 Latency: ${Math.round(metrics.p99LatencyMs)}ms (target: ${slo.maxLatencyP99Ms}ms, overage: ${overage}ms).`
    );
  }

  parts.push(
    `Based on breach severity and duration, recommended compensation: ${compensation}% of bond balance.`
  );

  return parts.join(' ');
}
