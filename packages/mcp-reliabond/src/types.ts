// ===========================================
// RELIABOND MCP SERVER - TYPE DEFINITIONS
// ===========================================

export interface Service {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  healthCheckUrl: string;
  owner: string; // wallet address
  bondContractAddress: string;
  sloConfig: SloConfig;
  reliabilityScore: number; // 0-100
  status: ServiceStatus;
  lastCheckTime: number;
  createdAt: number;
}

export interface SloConfig {
  maxLatencyP99Ms: number;      // e.g., 300
  minUptimePercent: number;     // e.g., 99.9
  checkIntervalSeconds: number; // e.g., 30
  breachThresholdSeconds: number; // sustained breach duration before payout
}

export type ServiceStatus = 'OK' | 'WARN' | 'BREACHED' | 'UNKNOWN';

export interface ProbeResult {
  id: string;
  serviceId: string;
  probeAgentId: string;
  timestamp: number;
  latencyMs: number;
  statusCode: number;
  ok: boolean;
  errorMessage?: string;
}

export interface RollingMetrics {
  serviceId: string;
  windowStartTime: number;
  totalChecks: number;
  successfulChecks: number;
  latencies: number[];
  uptimePercent: number;
  p99LatencyMs: number;
  avgLatencyMs: number;
}

export interface SlaEvaluation {
  serviceId: string;
  evaluatedAt: number;
  status: ServiceStatus;
  breachType?: 'latency' | 'availability' | 'both';
  breachDurationSeconds: number;
  currentMetrics: {
    uptimePercent: number;
    p99LatencyMs: number;
    avgLatencyMs: number;
  };
  sloTargets: {
    minUptimePercent: number;
    maxLatencyP99Ms: number;
  };
  recommendedCompensation: number; // percentage of bond (0-100)
  reasoning: string;
}

export interface Incident {
  id: string;
  serviceId: string;
  serviceName: string;
  createdAt: number;
  breachType: 'latency' | 'availability' | 'both';
  breachDurationSeconds: number;
  compensationPercent: number;
  payoutAmountPerUser: string; // in wei or token units
  affectedUsers: string[]; // wallet addresses
  txHash?: string;
  status: 'pending' | 'executed' | 'failed';
  summary: string;
  edenlayerRecordId?: string;
}

// MCP Tool Request/Response Types
export interface ListServicesResponse {
  services: Service[];
  totalCount: number;
}

export interface RecordProbeResultRequest {
  serviceId: string;
  probeAgentId: string;
  latencyMs: number;
  statusCode: number;
  ok: boolean;
  timestamp?: number;
  errorMessage?: string;
}

export interface RecordProbeResultResponse {
  success: boolean;
  probeResultId: string;
  updatedMetrics: RollingMetrics;
}

export interface EvaluateSlaRequest {
  serviceId: string;
}

export interface RegisterIncidentRequest {
  serviceId: string;
  breachType: 'latency' | 'availability' | 'both';
  breachDurationSeconds: number;
  compensationPercent: number;
  summary: string;
}

export interface RegisterIncidentResponse {
  success: boolean;
  incident: Incident;
  txHash?: string;
  error?: string;
}

// MCP Protocol Types
export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface McpRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface McpResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}
