// ===========================================
// RELIABOND MCP SERVER - KV STORAGE LAYER
// ===========================================
//
// DEMO STORAGE IMPLEMENTATION
// ============================
// This is an IN-MEMORY storage layer for hackathon demo purposes.
// All data is lost when the worker restarts.
//
// PRODUCTION UPGRADE PATH:
// To enable persistent storage with Cloudflare KV:
// 1. Uncomment the KV binding in wrangler.toml
// 2. Create a KV namespace: `wrangler kv:namespace create RELIABOND_KV`
// 3. Replace Map operations with KV.get/put calls
// 4. Add proper error handling for KV operations
//
// The interface is designed to make this migration straightforward.

import type {
  Service,
  ProbeResult,
  RollingMetrics,
  Incident,
  SloConfig,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// DEMO ETHEREUM ADDRESSES
// ═══════════════════════════════════════════════════════════════════════════
// These are valid-format addresses for demo purposes only.
// They are derived from well-known test accounts (e.g., Hardhat/Anvil defaults).
// DO NOT use these for any real funds.

const DEMO_ADDRESSES = {
  // Service operators (from Hardhat default accounts)
  operators: [
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
  ],
  // Bond contracts (placeholder addresses)
  bondContracts: [
    '0x1234567890AbcdEF1234567890aBcdef12345678',
    '0xaBcDeF1234567890AbCdEf1234567890AbCdEf12',
    '0x567890AbCdEf1234567890aBcDeF1234567890Ab',
    '0xCdEf1234567890AbCdEf1234567890AbCdEf1234',
    '0xEf1234567890AbCdEf1234567890aBcDeF123456',
  ],
  // Affected users for payouts
  users: [
    '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
    '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
    '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// RELIABOND STORAGE CLASS
// ═══════════════════════════════════════════════════════════════════════════

class ReliabondStorage {
  private services: Map<string, Service> = new Map();
  private probeResults: Map<string, ProbeResult[]> = new Map();
  private incidents: Map<string, Incident> = new Map();
  private breachStartTimes: Map<string, number> = new Map();

  constructor() {
    this.seedDemoData();
  }

  /**
   * Seeds demo data for hackathon demonstration.
   * In production, this would be replaced with actual service registrations.
   */
  private seedDemoData(): void {
    const demoServices: Service[] = [
      {
        id: 'svc_pricing_api',
        name: 'Dynamic Pricing API',
        description: 'Real-time pricing engine for marketplace',
        baseUrl: 'https://api.example.com',
        healthCheckUrl: 'https://httpstat.us/200?sleep=50',
        owner: DEMO_ADDRESSES.operators[0],
        bondContractAddress: DEMO_ADDRESSES.bondContracts[0],
        sloConfig: {
          maxLatencyP99Ms: 300,
          minUptimePercent: 99.9,
          checkIntervalSeconds: 30,
          breachThresholdSeconds: 300,
        },
        reliabilityScore: 98.5,
        status: 'OK',
        lastCheckTime: Date.now(),
        createdAt: Date.now() - 86400000 * 30,
      },
      {
        id: 'svc_auth_gateway',
        name: 'Authentication Gateway',
        description: 'OAuth2 and JWT validation service',
        baseUrl: 'https://auth.example.com',
        healthCheckUrl: 'https://httpstat.us/200?sleep=30',
        owner: DEMO_ADDRESSES.operators[1],
        bondContractAddress: DEMO_ADDRESSES.bondContracts[1],
        sloConfig: {
          maxLatencyP99Ms: 150,
          minUptimePercent: 99.99,
          checkIntervalSeconds: 15,
          breachThresholdSeconds: 180,
        },
        reliabilityScore: 99.2,
        status: 'OK',
        lastCheckTime: Date.now(),
        createdAt: Date.now() - 86400000 * 45,
      },
      {
        id: 'svc_ml_inference',
        name: 'ML Inference Engine',
        description: 'AI model serving endpoint',
        baseUrl: 'https://ml.example.com',
        // This returns 503 to simulate a failing service for demo
        healthCheckUrl: 'https://httpstat.us/503',
        owner: DEMO_ADDRESSES.operators[2],
        bondContractAddress: DEMO_ADDRESSES.bondContracts[2],
        sloConfig: {
          maxLatencyP99Ms: 500,
          minUptimePercent: 99.5,
          checkIntervalSeconds: 60,
          breachThresholdSeconds: 600,
        },
        reliabilityScore: 87.3,
        status: 'WARN',
        lastCheckTime: Date.now(),
        createdAt: Date.now() - 86400000 * 15,
      },
      {
        id: 'svc_payment_processor',
        name: 'Payment Processing',
        description: 'Crypto payment rails',
        baseUrl: 'https://pay.example.com',
        healthCheckUrl: 'https://httpstat.us/200?sleep=100',
        owner: DEMO_ADDRESSES.operators[3],
        bondContractAddress: DEMO_ADDRESSES.bondContracts[3],
        sloConfig: {
          maxLatencyP99Ms: 200,
          minUptimePercent: 99.95,
          checkIntervalSeconds: 20,
          breachThresholdSeconds: 120,
        },
        reliabilityScore: 99.8,
        status: 'OK',
        lastCheckTime: Date.now(),
        createdAt: Date.now() - 86400000 * 60,
      },
      {
        id: 'svc_data_oracle',
        name: 'On-Chain Data Oracle',
        description: 'Price feeds and external data',
        baseUrl: 'https://oracle.example.com',
        healthCheckUrl: 'https://httpstat.us/200?sleep=80',
        owner: DEMO_ADDRESSES.operators[4],
        bondContractAddress: DEMO_ADDRESSES.bondContracts[4],
        sloConfig: {
          maxLatencyP99Ms: 250,
          minUptimePercent: 99.9,
          checkIntervalSeconds: 45,
          breachThresholdSeconds: 240,
        },
        reliabilityScore: 96.4,
        status: 'OK',
        lastCheckTime: Date.now(),
        createdAt: Date.now() - 86400000 * 20,
      },
    ];

    for (const service of demoServices) {
      this.services.set(service.id, service);
      this.probeResults.set(service.id, []);
    }

    // Seed historical incidents for demo
    const demoIncidents: Incident[] = [
      {
        id: 'inc_001',
        serviceId: 'svc_ml_inference',
        serviceName: 'ML Inference Engine',
        createdAt: Date.now() - 86400000 * 3,
        breachType: 'availability',
        breachDurationSeconds: 720,
        compensationPercent: 5,
        payoutAmountPerUser: '50000000000000000', // 0.05 ETH in wei
        affectedUsers: DEMO_ADDRESSES.users,
        txHash: '0xabc123def456789012345678901234567890123456789012345678901234abcd',
        status: 'executed',
        summary: 'ML service unavailable for 12 minutes due to model loading failure',
      },
      {
        id: 'inc_002',
        serviceId: 'svc_pricing_api',
        serviceName: 'Dynamic Pricing API',
        createdAt: Date.now() - 86400000 * 7,
        breachType: 'latency',
        breachDurationSeconds: 420,
        compensationPercent: 2,
        payoutAmountPerUser: '20000000000000000', // 0.02 ETH in wei
        affectedUsers: [DEMO_ADDRESSES.users[0], DEMO_ADDRESSES.users[1]],
        txHash: '0xdef789012345678901234567890123456789012345678901234567890123efgh',
        status: 'executed',
        summary: 'P99 latency exceeded 300ms threshold for 7 minutes during peak load',
      },
    ];

    for (const incident of demoIncidents) {
      this.incidents.set(incident.id, incident);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SERVICE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async getServices(): Promise<Service[]> {
    return Array.from(this.services.values());
  }

  async getService(id: string): Promise<Service | undefined> {
    return this.services.get(id);
  }

  async addService(service: Service): Promise<void> {
    this.services.set(service.id, service);
    this.probeResults.set(service.id, []);
  }

  async updateService(id: string, updates: Partial<Service>): Promise<void> {
    const service = this.services.get(id);
    if (service) {
      this.services.set(id, { ...service, ...updates });
    }
  }

  async deleteService(id: string): Promise<boolean> {
    const existed = this.services.has(id);
    this.services.delete(id);
    this.probeResults.delete(id);
    return existed;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROBE RESULT OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async addProbeResult(result: ProbeResult): Promise<void> {
    const results = this.probeResults.get(result.serviceId) || [];
    results.push(result);
    
    // Keep only last 100 results per service to prevent memory bloat
    if (results.length > 100) {
      results.shift();
    }
    
    this.probeResults.set(result.serviceId, results);
  }

  async getProbeResults(
    serviceId: string,
    windowMs: number = 600000 // default 10 minutes
  ): Promise<ProbeResult[]> {
    const results = this.probeResults.get(serviceId) || [];
    const cutoff = Date.now() - windowMs;
    return results.filter((r) => r.timestamp >= cutoff);
  }

  /**
   * Calculate rolling metrics for a service over a time window.
   * Used for SLA evaluation.
   */
  async calculateRollingMetrics(serviceId: string): Promise<RollingMetrics> {
    const results = await this.getProbeResults(serviceId);
    
    const totalChecks = results.length;
    const successfulChecks = results.filter((r) => r.ok).length;
    const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
    
    // Handle edge case of no data
    const uptimePercent = totalChecks > 0 
      ? (successfulChecks / totalChecks) * 100 
      : 100; // Assume healthy if no data
    
    // Calculate P99 latency (handle empty array)
    const p99Index = latencies.length > 0 
      ? Math.min(Math.floor(latencies.length * 0.99), latencies.length - 1)
      : 0;
    const p99LatencyMs = latencies[p99Index] || 0;
    
    // Calculate average latency
    const avgLatencyMs = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;

    return {
      serviceId,
      windowStartTime: Date.now() - 600000,
      totalChecks,
      successfulChecks,
      latencies,
      uptimePercent,
      p99LatencyMs,
      avgLatencyMs,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BREACH TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  getBreachStartTime(serviceId: string): number | undefined {
    return this.breachStartTimes.get(serviceId);
  }

  setBreachStartTime(serviceId: string, time: number): void {
    this.breachStartTimes.set(serviceId, time);
  }

  clearBreachStartTime(serviceId: string): void {
    this.breachStartTimes.delete(serviceId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INCIDENT OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async addIncident(incident: Incident): Promise<void> {
    this.incidents.set(incident.id, incident);
  }

  async getIncidents(serviceId?: string): Promise<Incident[]> {
    const all = Array.from(this.incidents.values());
    if (serviceId) {
      return all.filter((i) => i.serviceId === serviceId);
    }
    return all.sort((a, b) => b.createdAt - a.createdAt);
  }

  async updateIncident(id: string, updates: Partial<Incident>): Promise<void> {
    const incident = this.incidents.get(id);
    if (incident) {
      this.incidents.set(id, { ...incident, ...updates });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get demo affected users for payout simulation
   */
  getDemoAffectedUsers(): string[] {
    return [...DEMO_ADDRESSES.users];
  }
}

// Singleton instance
export const storage = new ReliabondStorage();

// Export demo addresses for use in other modules
export { DEMO_ADDRESSES };
