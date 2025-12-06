// ===========================================
// RELIABOND PROBE AGENT
// ===========================================
// 
// This agent uses the Nullshot TypeScript Agent Framework
// to perform synthetic health checks on registered services.
// 
// Built for Nullshot Hacks Season 0 - Track 1a
// 
// The agent:
// 1. Discovers services via MCP tools
// 2. Performs HTTP health checks  
// 3. Reports metrics back to the MCP server
// 4. Logs all reasoning and tool calls for transparency

import { 
  PROBE_AGENT_SYSTEM_PROMPT, 
  PROBE_CYCLE_PROMPT,
  PROBE_AGENT_NAME,
  PROBE_AGENT_DESCRIPTION 
} from './prompts';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:8787';
const CHECK_INTERVAL_MS = parseInt(process.env.CHECK_INTERVAL_MS || '30000', 10);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Service {
  id: string;
  name: string;
  healthCheckUrl: string;
  sloConfig: {
    checkIntervalSeconds: number;
    maxLatencyP99Ms: number;
    minUptimePercent: number;
  };
}

interface ProbeResult {
  serviceId: string;
  probeAgentId: string;
  latencyMs: number;
  statusCode: number;
  ok: boolean;
  errorMessage?: string;
}

interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

interface AgentThought {
  type: 'thinking' | 'tool_call' | 'tool_result' | 'conclusion';
  content: string;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// MCP CLIENT - Implements MCP protocol for tool calls
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

    const result = await response.json() as {
      result?: { content: Array<{ text: string }> };
      error?: { message: string };
    };

    if (result.error) {
      throw new Error(result.error.message);
    }

    const content = result.result?.content?.[0]?.text;
    return content ? JSON.parse(content) : null;
  }

  async listTools(): Promise<Array<{ name: string; description: string }>> {
    const response = await fetch(`${this.baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: ++this.requestId,
        method: 'tools/list',
      }),
    });

    const result = await response.json() as {
      result?: { tools: Array<{ name: string; description: string }> };
    };

    return result.result?.tools || [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

async function performHealthCheck(
  url: string,
  timeoutMs: number = 10000
): Promise<{ latencyMs: number; statusCode: number; ok: boolean; error?: string }> {
  const start = Date.now();
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Reliabond-Probe-Agent/0.1.0',
      },
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - start;

    return {
      latencyMs,
      statusCode: response.status,
      ok: response.status >= 200 && response.status < 300,
    };
  } catch (error) {
    const latencyMs = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      latencyMs,
      statusCode: 0,
      ok: false,
      error: errorMessage,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT THOUGHT LOGGER - Shows agent reasoning in real-time
// ═══════════════════════════════════════════════════════════════════════════

class AgentLogger {
  private thoughts: AgentThought[] = [];

  log(type: AgentThought['type'], content: string): void {
    const thought: AgentThought = {
      type,
      content,
      timestamp: Date.now(),
    };
    this.thoughts.push(thought);

    // Visual logging for demo
    const icons = {
      thinking: '🧠',
      tool_call: '🔧',
      tool_result: '📥',
      conclusion: '✨',
    };

    const colors = {
      thinking: '\x1b[36m',   // Cyan
      tool_call: '\x1b[33m',  // Yellow  
      tool_result: '\x1b[32m', // Green
      conclusion: '\x1b[35m', // Magenta
    };

    const reset = '\x1b[0m';
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];

    console.log(`${colors[type]}${icons[type]} [${timestamp}] ${type.toUpperCase()}${reset}`);
    console.log(`   ${content.split('\n').join('\n   ')}`);
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
// NULLSHOT PROBE AGENT - Agentic health check implementation
// ═══════════════════════════════════════════════════════════════════════════

export class NullshotProbeAgent {
  private mcpClient: McpClient;
  private agentId: string;
  private running = false;
  private logger: AgentLogger;
  private systemPrompt: string;

  constructor(mcpServerUrl: string = MCP_SERVER_URL) {
    this.mcpClient = new McpClient(mcpServerUrl);
    this.agentId = `probe_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`;
    this.logger = new AgentLogger();
    this.systemPrompt = PROBE_AGENT_SYSTEM_PROMPT;
  }

  /**
   * Run a single probe cycle with full agent reasoning
   * This demonstrates the agentic behavior - the agent:
   * 1. Thinks about what to do
   * 2. Calls tools
   * 3. Processes results
   * 4. Makes decisions
   */
  async runAgenticCycle(): Promise<void> {
    console.log('\n' + '═'.repeat(70));
    console.log('  🤖 NULLSHOT PROBE AGENT - AGENTIC CYCLE');
    console.log('  Agent ID: ' + this.agentId);
    console.log('═'.repeat(70) + '\n');

    this.logger.clear();

    // STEP 1: Agent thinks about the task
    this.logger.log('thinking', 
      `I am the Probe Agent. My job is to monitor service health.\n` +
      `I will:\n` +
      `  1. Discover all registered services\n` +
      `  2. Perform health checks on each\n` +
      `  3. Report metrics honestly to the MCP server\n` +
      `Let me start by listing the services...`
    );

    try {
      // STEP 2: Call list_services tool
      this.logger.log('tool_call', 
        `Calling tool: list_services\n` +
        `Arguments: {}\n` +
        `Purpose: Discover all services I need to monitor`
      );

      const listResult = await this.mcpClient.callTool('list_services', {}) as {
        services: Service[];
        totalCount: number;
      };

      this.logger.log('tool_result',
        `Received ${listResult.totalCount} services to monitor:\n` +
        listResult.services.map(s => `  - ${s.name} (${s.id})`).join('\n')
      );

      // STEP 3: Think about what was found
      this.logger.log('thinking',
        `Good. I found ${listResult.totalCount} services.\n` +
        `Now I need to probe each one and measure:\n` +
        `  - Response time (latency)\n` +
        `  - HTTP status code\n` +
        `  - Whether the check succeeded\n` +
        `I must report honestly - even failures.`
      );

      let successful = 0;
      let failed = 0;
      const results: Array<{ service: Service; result: ProbeResult }> = [];

      // STEP 4: Probe each service
      for (const service of listResult.services) {
        this.logger.log('thinking',
          `Probing service: ${service.name}\n` +
          `Health check URL: ${service.healthCheckUrl}\n` +
          `SLO: max ${service.sloConfig.maxLatencyP99Ms}ms latency, ${service.sloConfig.minUptimePercent}% uptime`
        );

        // Perform the actual health check
        const checkResult = await performHealthCheck(service.healthCheckUrl);
        
        const probeResult: ProbeResult = {
          serviceId: service.id,
          probeAgentId: this.agentId,
          latencyMs: checkResult.latencyMs,
          statusCode: checkResult.statusCode,
          ok: checkResult.ok,
          errorMessage: checkResult.error,
        };

        // Report result via MCP
        this.logger.log('tool_call',
          `Calling tool: record_probe_result\n` +
          `Arguments:\n` +
          `  serviceId: "${service.id}"\n` +
          `  latencyMs: ${checkResult.latencyMs}\n` +
          `  statusCode: ${checkResult.statusCode}\n` +
          `  ok: ${checkResult.ok}\n` +
          (checkResult.error ? `  errorMessage: "${checkResult.error}"` : '')
        );

        await this.mcpClient.callTool('record_probe_result', probeResult);

        this.logger.log('tool_result',
          checkResult.ok
            ? `✅ ${service.name}: ${checkResult.latencyMs}ms (HTTP ${checkResult.statusCode})`
            : `❌ ${service.name}: FAILED - ${checkResult.error || `HTTP ${checkResult.statusCode}`}`
        );

        if (checkResult.ok) {
          successful++;
        } else {
          failed++;
        }

        results.push({ service, result: probeResult });
      }

      // STEP 5: Agent concludes
      this.logger.log('conclusion',
        `Probe cycle complete.\n` +
        `Results: ${successful} healthy, ${failed} failed out of ${listResult.totalCount} services.\n` +
        (failed > 0 
          ? `⚠️  Some services are experiencing issues. The Reliability Agent will evaluate if SLO breaches warrant payouts.`
          : `All services are responding normally.`) +
        `\nWaiting for next cycle...`
      );

      // Summary output
      console.log('─'.repeat(70));
      console.log('📊 CYCLE SUMMARY');
      console.log('─'.repeat(70));
      console.log(`   Total Services: ${listResult.totalCount}`);
      console.log(`   ✅ Healthy: ${successful}`);
      console.log(`   ❌ Failed: ${failed}`);
      console.log('─'.repeat(70) + '\n');

    } catch (error) {
      this.logger.log('conclusion',
        `❌ Probe cycle failed with error:\n${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Start the agent loop
   */
  async start(intervalMs: number = CHECK_INTERVAL_MS): Promise<void> {
    this.running = true;
    
    console.log('\n' + '╔' + '═'.repeat(68) + '╗');
    console.log('║' + ' '.repeat(20) + '🔍 NULLSHOT PROBE AGENT' + ' '.repeat(25) + '║');
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
    console.log('\n🛑 Probe Agent stopped\n');
  }

  /**
   * Get agent thoughts for external consumption (e.g., UI)
   */
  getRecentThoughts(): AgentThought[] {
    return this.logger.getThoughts();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// NULLSHOT AGENT DEFINITION - For Nullshot Framework integration
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a Nullshot-compatible agent definition.
 * This can be loaded by the Nullshot Agent Framework or used in a Jam.
 */
export function createNullshotProbeAgent(mcpServerUrl?: string) {
  const serverUrl = mcpServerUrl || MCP_SERVER_URL;

  return {
    // Agent identity
    name: PROBE_AGENT_NAME,
    description: PROBE_AGENT_DESCRIPTION,
    version: '0.1.0',

    // Agent behavior
    systemPrompt: PROBE_AGENT_SYSTEM_PROMPT,
    cyclePrompt: PROBE_CYCLE_PROMPT,

    // MCP connection
    mcpServer: {
      url: serverUrl,
      transport: 'http' as const,
    },

    // Tool definitions (these map to MCP tools)
    tools: [
      {
        name: 'list_services',
        description: 'Get all registered services from the Reliabond MCP server. Returns service IDs, names, health check URLs, and SLO configurations.',
        inputSchema: {
          type: 'object' as const,
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
      },
      {
        name: 'record_probe_result',
        description: 'Record a probe result for a service. Updates rolling metrics and service status.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            serviceId: { 
              type: 'string',
              description: 'ID of the service that was probed',
            },
            probeAgentId: { 
              type: 'string',
              description: 'ID of this probe agent',
            },
            latencyMs: { 
              type: 'number',
              description: 'Response latency in milliseconds',
            },
            statusCode: { 
              type: 'number',
              description: 'HTTP status code (0 if connection failed)',
            },
            ok: { 
              type: 'boolean',
              description: 'Whether the check succeeded',
            },
            errorMessage: { 
              type: 'string',
              description: 'Error message if check failed',
            },
          },
          required: ['serviceId', 'probeAgentId', 'latencyMs', 'statusCode', 'ok'],
        },
      },
    ],

    // Agent configuration
    config: {
      checkIntervalMs: CHECK_INTERVAL_MS,
      healthCheckTimeoutMs: 10000,
    },

    // Factory function to create agent instance
    createInstance: () => new NullshotProbeAgent(serverUrl),
  };
}

// Legacy export for backwards compatibility
export { NullshotProbeAgent as ProbeAgent };
