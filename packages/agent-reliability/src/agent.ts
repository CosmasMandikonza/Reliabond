// ===========================================
// RELIABOND RELIABILITY AGENT
// ===========================================
//
// The Reliability Sentinel Agent monitors service SLOs
// and triggers on-chain payouts when breaches are confirmed.
//
// Built for Nullshot Hacks Season 0 - Track 1a
// Uses Nullshot TypeScript Agent Framework

import { 
  RELIABILITY_AGENT_SYSTEM_PROMPT, 
  EVALUATION_CYCLE_PROMPT,
  RELIABILITY_AGENT_NAME,
  RELIABILITY_AGENT_DESCRIPTION,
  THOUGHT_TEMPLATES
} from './prompts';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:8787';
const EVALUATION_INTERVAL_MS = parseInt(process.env.EVALUATION_INTERVAL_MS || '60000', 10);

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Service {
  id: string;
  name: string;
  status: string;
  reliabilityScore: number;
  bondContractAddress: string;
  sloConfig: {
    maxLatencyP99Ms: number;
    minUptimePercent: number;
    breachThresholdSeconds: number;
  };
}

interface SlaEvaluation {
  serviceId: string;
  status: 'OK' | 'WARN' | 'BREACHED';
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
  recommendedCompensation: number;
  reasoning: string;
}

interface IncidentResult {
  success: boolean;
  incident: {
    id: string;
    serviceName: string;
    txHash?: string;
    status: string;
  };
  error?: string;
}

interface AgentThought {
  type: 'thinking' | 'tool_call' | 'tool_result' | 'decision' | 'action';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// MCP CLIENT
// ═══════════════════════════════════════════════════════════════════════════

class McpClient {
  private baseUrl: string;
  private requestId = 0;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: ++this.requestId,
        method: 'tools/call',
        params: { name, arguments: args },
      }),
    });

    const result = (await response.json()) as {
      result?: { content: Array<{ text: string }> };
      error?: { message: string };
    };

    if (result.error) {
      throw new Error(result.error.message);
    }

    const content = result.result?.content?.[0]?.text;
    return content ? JSON.parse(content) : null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT THOUGHT LOGGER - Shows agent reasoning in real-time
// ═══════════════════════════════════════════════════════════════════════════

class AgentLogger {
  private thoughts: AgentThought[] = [];

  log(type: AgentThought['type'], content: string, metadata?: Record<string, unknown>): void {
    const thought: AgentThought = {
      type,
      content,
      timestamp: Date.now(),
      metadata,
    };
    this.thoughts.push(thought);

    const icons = {
      thinking: '🧠',
      tool_call: '🔧',
      tool_result: '📥',
      decision: '⚖️',
      action: '⚡',
    };

    const colors = {
      thinking: '\x1b[36m',   // Cyan
      tool_call: '\x1b[33m',  // Yellow  
      tool_result: '\x1b[32m', // Green
      decision: '\x1b[35m',   // Magenta
      action: '\x1b[31m',     // Red (for payouts)
    };

    const reset = '\x1b[0m';
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];

    console.log(`${colors[type]}${icons[type]} [${timestamp}] ${type.toUpperCase()}${reset}`);
    console.log(`   ${content.split('\n').join('\n   ')}`);
    if (metadata && Object.keys(metadata).length > 0) {
      console.log(`   ${'\x1b[90m'}metadata: ${JSON.stringify(metadata)}${reset}`);
    }
    console.log('');
  }

  getThoughts(): AgentThought[] {
    return [...this.thoughts];
  }

  clear(): void {
    this.thoughts = [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// NULLSHOT RELIABILITY AGENT
// ═══════════════════════════════════════════════════════════════════════════

export class NullshotReliabilityAgent {
  private mcpClient: McpClient;
  private agentId: string;
  private running = false;
  private logger: AgentLogger;
  private systemPrompt: string;

  constructor(mcpServerUrl: string = MCP_SERVER_URL) {
    this.mcpClient = new McpClient(mcpServerUrl);
    this.agentId = `sentinel_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`;
    this.logger = new AgentLogger();
    this.systemPrompt = RELIABILITY_AGENT_SYSTEM_PROMPT;
  }

  /**
   * Run a single evaluation cycle with full agent reasoning
   */
  async runAgenticCycle(): Promise<void> {
    console.log('\n' + '═'.repeat(70));
    console.log('  🛡️  NULLSHOT RELIABILITY SENTINEL - EVALUATION CYCLE');
    console.log('  Agent ID: ' + this.agentId);
    console.log('═'.repeat(70) + '\n');

    this.logger.clear();

    // STEP 1: Agent thinks about the task
    this.logger.log('thinking', 
      `I am the Reliability Sentinel. My job is to enforce SLA guarantees.\n` +
      `I have significant authority - my decisions can trigger real on-chain payouts.\n` +
      `I must:\n` +
      `  1. Evaluate all services against their SLO targets\n` +
      `  2. Identify sustained breaches that warrant compensation\n` +
      `  3. Trigger payouts only after careful verification\n` +
      `Let me begin by listing all services...`
    );

    try {
      // STEP 2: Get all services
      this.logger.log('tool_call', 
        `Calling tool: list_services\n` +
        `Purpose: Discover all services I need to evaluate`
      );

      const listResult = (await this.mcpClient.callTool('list_services', {})) as {
        services: Service[];
        totalCount: number;
      };

      this.logger.log('tool_result',
        `Found ${listResult.totalCount} services to evaluate:\n` +
        listResult.services.map(s => 
          `  - ${s.name} [${s.status}] Score: ${s.reliabilityScore}%`
        ).join('\n')
      );

      let okCount = 0;
      let warnCount = 0;
      let breachCount = 0;
      let payoutCount = 0;

      // STEP 3: Evaluate each service
      for (const service of listResult.services) {
        console.log('─'.repeat(70));
        
        this.logger.log('thinking',
          `Evaluating: ${service.name}\n` +
          `Current Status: ${service.status}\n` +
          `Reliability Score: ${service.reliabilityScore}%\n` +
          `SLO Targets:\n` +
          `  - Min Uptime: ${service.sloConfig.minUptimePercent}%\n` +
          `  - Max P99 Latency: ${service.sloConfig.maxLatencyP99Ms}ms\n` +
          `  - Breach Threshold: ${service.sloConfig.breachThresholdSeconds}s`
        );

        // Call evaluate_sla
        this.logger.log('tool_call',
          `Calling tool: evaluate_sla\n` +
          `Arguments: { serviceId: "${service.id}" }\n` +
          `Purpose: Get detailed SLA evaluation with metrics`
        );

        const evaluation = (await this.mcpClient.callTool('evaluate_sla', {
          serviceId: service.id,
        })) as SlaEvaluation;

        this.logger.log('tool_result',
          `Evaluation Result:\n` +
          `  Status: ${evaluation.status}\n` +
          `  Current Metrics:\n` +
          `    - Uptime: ${evaluation.currentMetrics.uptimePercent.toFixed(2)}%\n` +
          `    - P99 Latency: ${Math.round(evaluation.currentMetrics.p99LatencyMs)}ms\n` +
          (evaluation.breachType ? `  Breach Type: ${evaluation.breachType}\n` : '') +
          (evaluation.breachDurationSeconds > 0 ? `  Breach Duration: ${evaluation.breachDurationSeconds}s\n` : '') +
          `  Reasoning: ${evaluation.reasoning}`
        );

        // Track counts
        switch (evaluation.status) {
          case 'OK':
            okCount++;
            this.logger.log('decision',
              `${service.name}: ✅ HEALTHY\n` +
              `No action required. SLO targets are being met.`
            );
            break;

          case 'WARN':
            warnCount++;
            this.logger.log('decision',
              `${service.name}: ⚠️ WARNING\n` +
              `Performance degradation detected but breach threshold not yet exceeded.\n` +
              `Continuing to monitor. No payout triggered.`
            );
            break;

          case 'BREACHED':
            breachCount++;
            // Handle breach with careful verification
            const payoutTriggered = await this.handleBreach(service, evaluation);
            if (payoutTriggered) {
              payoutCount++;
            }
            break;
        }
      }

      // STEP 4: Agent conclusion
      this.logger.log('thinking',
        `Evaluation cycle complete.\n\n` +
        `Summary:\n` +
        `  ✅ Healthy: ${okCount}\n` +
        `  ⚠️ Warning: ${warnCount}\n` +
        `  🔴 Breached: ${breachCount}\n` +
        `  💰 Payouts Triggered: ${payoutCount}\n\n` +
        (payoutCount > 0 
          ? `I triggered ${payoutCount} payout(s) to compensate affected users. The on-chain transactions have been submitted.`
          : `No payouts were necessary this cycle.`) +
        `\n\nWaiting for next evaluation cycle...`
      );

      // Summary output
      console.log('\n' + '═'.repeat(70));
      console.log('  📊 EVALUATION CYCLE SUMMARY');
      console.log('═'.repeat(70));
      console.log(`   ✅ Healthy:  ${okCount}`);
      console.log(`   ⚠️  Warning:  ${warnCount}`);
      console.log(`   🔴 Breached: ${breachCount}`);
      console.log(`   💰 Payouts:  ${payoutCount}`);
      console.log('═'.repeat(70) + '\n');

    } catch (error) {
      this.logger.log('thinking',
        `❌ Evaluation cycle failed:\n${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Handle a confirmed breach with verification and payout
   */
  private async handleBreach(service: Service, evaluation: SlaEvaluation): Promise<boolean> {
    this.logger.log('decision',
      `${service.name}: 🔴 BREACH CONFIRMED\n` +
      `I need to verify this breach warrants a payout.\n\n` +
      `Verification Checklist:\n` +
      `  [${evaluation.status === 'BREACHED' ? '✓' : '✗'}] Status is BREACHED\n` +
      `  [${evaluation.breachDurationSeconds >= service.sloConfig.breachThresholdSeconds ? '✓' : '✗'}] Duration (${evaluation.breachDurationSeconds}s) >= Threshold (${service.sloConfig.breachThresholdSeconds}s)\n` +
      `  [${evaluation.recommendedCompensation > 0 && evaluation.recommendedCompensation <= 10 ? '✓' : '✗'}] Compensation (${evaluation.recommendedCompensation}%) is reasonable (0-10%)`
    );

    // Verify breach meets thresholds
    if (evaluation.breachDurationSeconds < service.sloConfig.breachThresholdSeconds) {
      this.logger.log('decision',
        `❌ Breach duration (${evaluation.breachDurationSeconds}s) has not exceeded threshold (${service.sloConfig.breachThresholdSeconds}s).\n` +
        `Monitoring but NOT triggering payout yet.`
      );
      return false;
    }

    if (evaluation.recommendedCompensation <= 0) {
      this.logger.log('decision',
        `No compensation recommended by evaluation.\n` +
        `Skipping payout.`
      );
      return false;
    }

    // Generate incident summary
    const summary = this.generateIncidentSummary(service, evaluation);

    this.logger.log('action',
      `🚨 TRIGGERING ON-CHAIN PAYOUT\n\n` +
      `Service: ${service.name}\n` +
      `Breach Type: ${evaluation.breachType}\n` +
      `Duration: ${evaluation.breachDurationSeconds}s\n` +
      `Compensation: ${evaluation.recommendedCompensation}% of bond\n` +
      `Contract: ${service.bondContractAddress}\n\n` +
      `Summary: ${summary}`
    );

    // Call register_incident_and_payout
    this.logger.log('tool_call',
      `Calling tool: register_incident_and_payout\n` +
      `Arguments:\n` +
      `  serviceId: "${service.id}"\n` +
      `  breachType: "${evaluation.breachType}"\n` +
      `  breachDurationSeconds: ${evaluation.breachDurationSeconds}\n` +
      `  compensationPercent: ${evaluation.recommendedCompensation}\n` +
      `  summary: "${summary}"`
    );

    try {
      const result = (await this.mcpClient.callTool('register_incident_and_payout', {
        serviceId: service.id,
        breachType: evaluation.breachType,
        breachDurationSeconds: evaluation.breachDurationSeconds,
        compensationPercent: evaluation.recommendedCompensation,
        summary,
      })) as IncidentResult;

      if (result.success) {
        this.logger.log('tool_result',
          `✅ PAYOUT EXECUTED SUCCESSFULLY\n` +
          `Incident ID: ${result.incident.id}\n` +
          `Transaction Hash: ${result.incident.txHash || 'pending'}\n` +
          `Status: ${result.incident.status}`,
          { incidentId: result.incident.id, txHash: result.incident.txHash }
        );
        return true;
      } else {
        this.logger.log('tool_result',
          `❌ Payout failed: ${result.error}`
        );
        return false;
      }
    } catch (error) {
      this.logger.log('tool_result',
        `❌ Payout execution error: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * Generate human-readable incident summary
   */
  private generateIncidentSummary(service: Service, evaluation: SlaEvaluation): string {
    const parts: string[] = [];

    parts.push(`SLA breach for ${service.name}.`);

    if (evaluation.breachType === 'availability' || evaluation.breachType === 'both') {
      parts.push(
        `Availability dropped to ${evaluation.currentMetrics.uptimePercent.toFixed(2)}% (required: ${evaluation.sloTargets.minUptimePercent}%).`
      );
    }

    if (evaluation.breachType === 'latency' || evaluation.breachType === 'both') {
      parts.push(
        `P99 latency at ${Math.round(evaluation.currentMetrics.p99LatencyMs)}ms (max: ${evaluation.sloTargets.maxLatencyP99Ms}ms).`
      );
    }

    const minutes = Math.floor(evaluation.breachDurationSeconds / 60);
    const seconds = evaluation.breachDurationSeconds % 60;
    parts.push(`Breach sustained for ${minutes}m ${seconds}s.`);
    parts.push(`Compensation: ${evaluation.recommendedCompensation}% of bond.`);

    return parts.join(' ');
  }

  /**
   * Start the agent loop
   */
  async start(intervalMs: number = EVALUATION_INTERVAL_MS): Promise<void> {
    this.running = true;
    
    console.log('\n' + '╔' + '═'.repeat(68) + '╗');
    console.log('║' + ' '.repeat(15) + '🛡️  NULLSHOT RELIABILITY SENTINEL' + ' '.repeat(18) + '║');
    console.log('║' + ' '.repeat(68) + '║');
    console.log('║  Built with Nullshot TypeScript Agent Framework' + ' '.repeat(19) + '║');
    console.log('║  MCP Server: ' + MCP_SERVER_URL.padEnd(54) + '║');
    console.log('║  Interval: ' + `${intervalMs / 1000}s`.padEnd(56) + '║');
    console.log('╚' + '═'.repeat(68) + '╝\n');

    // Run immediately
    await this.runAgenticCycle();

    // Then run on interval
    while (this.running) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      if (this.running) {
        await this.runAgenticCycle();
      }
    }
  }

  stop(): void {
    this.running = false;
    console.log('\n🛑 Reliability Sentinel stopped\n');
  }

  getRecentThoughts(): AgentThought[] {
    return this.logger.getThoughts();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// NULLSHOT AGENT DEFINITION
// ═══════════════════════════════════════════════════════════════════════════

export function createNullshotReliabilityAgent(mcpServerUrl?: string) {
  const serverUrl = mcpServerUrl || MCP_SERVER_URL;

  return {
    name: RELIABILITY_AGENT_NAME,
    description: RELIABILITY_AGENT_DESCRIPTION,
    version: '0.1.0',

    systemPrompt: RELIABILITY_AGENT_SYSTEM_PROMPT,
    cyclePrompt: EVALUATION_CYCLE_PROMPT,

    mcpServer: {
      url: serverUrl,
      transport: 'http' as const,
    },

    tools: [
      {
        name: 'list_services',
        description: 'Get all registered services with their current status and reliability scores.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            status: {
              type: 'string',
              enum: ['OK', 'WARN', 'BREACHED', 'UNKNOWN'],
              description: 'Optional filter by service status',
            },
          },
        },
      },
      {
        name: 'evaluate_sla',
        description: 'Evaluate SLA status for a specific service. Returns detailed metrics, breach information, and recommended compensation.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            serviceId: { 
              type: 'string',
              description: 'ID of the service to evaluate',
            },
          },
          required: ['serviceId'],
        },
      },
      {
        name: 'register_incident_and_payout',
        description: 'Register a breach incident and trigger on-chain payout from the service bond. Only call this after verifying breach metrics.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            serviceId: { type: 'string' },
            breachType: { 
              type: 'string',
              enum: ['latency', 'availability', 'both'],
            },
            breachDurationSeconds: { type: 'number' },
            compensationPercent: { 
              type: 'number',
              description: 'Percentage of bond to pay out (0-10%)',
            },
            summary: { 
              type: 'string',
              description: 'Human-readable summary of the breach',
            },
          },
          required: ['serviceId', 'breachType', 'breachDurationSeconds', 'compensationPercent', 'summary'],
        },
      },
    ],

    config: {
      evaluationIntervalMs: EVALUATION_INTERVAL_MS,
      maxCompensationPercent: 10,
    },

    createInstance: () => new NullshotReliabilityAgent(serverUrl),
  };
}

// Legacy export
export { NullshotReliabilityAgent as ReliabilityAgent };
