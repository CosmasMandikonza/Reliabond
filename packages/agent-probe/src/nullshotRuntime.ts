// ===========================================
// NULLSHOT RUNTIME ENTRY POINT - Probe Agent
// ===========================================
//
// This file demonstrates integration with the @nullshot/agent framework.
// The @nullshot/agent package is designed for Cloudflare Workers with
// Durable Objects. This runtime provides a Node.js-compatible wrapper
// that follows Nullshot patterns and can be adapted for Workers deployment.
//
// For Cloudflare Workers deployment, see the Nullshot docs:
// https://nullshot.ai/en/docs/developers/agents-framework/overview
//
// Usage:
//   pnpm start:nullshot
//   # or
//   tsx src/nullshotRuntime.ts

import { createNullshotProbeAgent, NullshotProbeAgent } from './agent';

// ═══════════════════════════════════════════════════════════════════════════
// NULLSHOT AGENT SERVICE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════
// 
// The @nullshot/agent package uses a Service pattern for modular functionality.
// This interface mirrors the Nullshot Service pattern for compatibility.

interface NullshotService {
  name: string;
  initialize?(): Promise<void>;
}

/**
 * ReliabondProbeService - Nullshot-compatible service wrapper
 * 
 * This service wraps our probe agent functionality in a pattern
 * compatible with @nullshot/agent's ToolboxService and MiddlewareService.
 */
class ReliabondProbeService implements NullshotService {
  name = '@reliabond/agent-probe/service';
  private agentConfig: ReturnType<typeof createNullshotProbeAgent>;
  private agentInstance: NullshotProbeAgent | null = null;

  constructor() {
    this.agentConfig = createNullshotProbeAgent();
  }

  async initialize(): Promise<void> {
    console.log(`[${this.name}] Initializing probe service...`);
    this.agentInstance = this.agentConfig.createInstance() as NullshotProbeAgent;
  }

  getAgentConfig() {
    return this.agentConfig;
  }

  getAgentInstance() {
    return this.agentInstance;
  }

  /**
   * Get tools for Nullshot ToolboxService integration
   * These can be exposed via MCP or used directly by the agent
   */
  getTools() {
    return this.agentConfig.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      execute: async (params: Record<string, unknown>) => {
        // In a full Nullshot integration, this would call the MCP server
        const mcpUrl = this.agentConfig.mcpServer.url;
        const response = await fetch(`${mcpUrl}/mcp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'tools/call',
            params: { name: tool.name, arguments: params },
          }),
        });
        return response.json();
      },
    }));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RUNTIME CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:8787';
const CHECK_INTERVAL_MS = parseInt(process.env.CHECK_INTERVAL_MS || '30000', 10);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n' + '╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(12) + '🔍 RELIABOND PROBE AGENT - NULLSHOT RUNTIME' + ' '.repeat(13) + '║');
  console.log('║' + ' '.repeat(68) + '║');
  console.log('║  Using @nullshot/agent service patterns' + ' '.repeat(27) + '║');
  console.log('║  MCP Server: ' + MCP_SERVER_URL.padEnd(54) + '║');
  console.log('║  Interval: ' + `${CHECK_INTERVAL_MS / 1000}s`.padEnd(56) + '║');
  console.log('╚' + '═'.repeat(68) + '╝\n');

  try {
    // Initialize the Nullshot-compatible service
    const probeService = new ReliabondProbeService();
    await probeService.initialize();

    console.log('📋 Agent Configuration:');
    console.log(`   Name: ${probeService.getAgentConfig().name}`);
    console.log(`   Version: ${probeService.getAgentConfig().version}`);
    console.log(`   Tools: ${probeService.getTools().map(t => t.name).join(', ')}`);
    console.log('');

    // Get the agent instance and start it
    const agent = probeService.getAgentInstance();
    if (!agent) {
      throw new Error('Failed to create agent instance');
    }

    console.log('🚀 Starting Nullshot-compatible agent runtime...\n');
    
    // Start the agent loop
    await agent.start(CHECK_INTERVAL_MS);

  } catch (error) {
    console.error('❌ Failed to start Nullshot runtime:', error);
    
    // Fallback: run the agent directly
    console.log('\n📋 Falling back to direct agent execution...\n');
    const agentConfig = createNullshotProbeAgent();
    const agent = agentConfig.createInstance() as NullshotProbeAgent;
    await agent.start(CHECK_INTERVAL_MS);
  }
}

// Handle graceful shutdown
const shutdown = () => {
  console.log('\n🛑 Shutting down Nullshot Runtime...');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Run the main function
main().catch((err) => {
  console.error('Failed to start Nullshot probe agent runtime:', err);
  process.exit(1);
});
