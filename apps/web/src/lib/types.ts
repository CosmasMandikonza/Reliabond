// ===========================================
// RELIABOND FRONTEND - TYPE DEFINITIONS
// ===========================================

export interface Service {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  healthCheckUrl: string;
  owner: string;
  bondContractAddress: string;
  sloConfig: SloConfig;
  reliabilityScore: number;
  status: ServiceStatus;
  lastCheckTime: number;
  createdAt: number;
  currentMetrics?: {
    uptimePercent: number;
    p99LatencyMs: number;
    avgLatencyMs: number;
    totalChecks: number;
  };
}

export interface SloConfig {
  maxLatencyP99Ms: number;
  minUptimePercent: number;
  checkIntervalSeconds: number;
  breachThresholdSeconds: number;
}

export type ServiceStatus = 'OK' | 'WARN' | 'BREACHED' | 'UNKNOWN';

export interface Incident {
  id: string;
  serviceId: string;
  serviceName: string;
  createdAt: number;
  breachType: 'latency' | 'availability' | 'both';
  breachDurationSeconds: number;
  compensationPercent: number;
  payoutAmountPerUser: string;
  affectedUsers: string[];
  txHash?: string;
  status: 'pending' | 'executed' | 'failed';
  summary: string;
  edenlayerRecordId?: string;
}

export interface Stats {
  totalServices: number;
  totalBondedValueEth: number;
  totalPaidOutThisWeekWei: number;
  activeBonds: number;
  incidentsThisWeek: number;
  totalIncidents: number;
}

export interface TimelineEvent {
  id: string;
  type: 'probe' | 'breach' | 'payout' | 'recovery';
  timestamp: number;
  serviceId: string;
  serviceName: string;
  data: Record<string, unknown>;
}

// Graph node for visualization
export interface GraphNode {
  id: string;
  type: 'service' | 'agent';
  label: string;
  status: ServiceStatus;
  reliabilityScore: number;
  bondSize: number; // For sizing nodes
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'monitors';
}
