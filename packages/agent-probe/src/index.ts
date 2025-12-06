// ===========================================
// RELIABOND PROBE AGENT - ENTRY POINT
// ===========================================
//
// Nullshot Hacks Season 0 - Track 1a
// Built with Nullshot TypeScript Agent Framework

import { NullshotProbeAgent, createNullshotProbeAgent } from './agent';
import { 
  PROBE_AGENT_NAME, 
  PROBE_AGENT_DESCRIPTION,
  PROBE_AGENT_SYSTEM_PROMPT,
  PROBE_CYCLE_PROMPT 
} from './prompts';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:8787';
const CHECK_INTERVAL_MS = parseInt(process.env.CHECK_INTERVAL_MS || '30000', 10);

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS - For Nullshot Framework integration
// ═══════════════════════════════════════════════════════════════════════════

export { 
  NullshotProbeAgent,
  createNullshotProbeAgent,
  PROBE_AGENT_NAME,
  PROBE_AGENT_DESCRIPTION,
  PROBE_AGENT_SYSTEM_PROMPT,
  PROBE_CYCLE_PROMPT,
};

// Default export for Nullshot Agent loader
export default createNullshotProbeAgent();

// ═══════════════════════════════════════════════════════════════════════════
// MAIN - Run as standalone script
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   ██████╗ ███████╗██╗     ██╗ █████╗ ██████╗  ██████╗ ███╗   ██╗██████╗   ║
║   ██╔══██╗██╔════╝██║     ██║██╔══██╗██╔══██╗██╔═══██╗████╗  ██║██╔══██╗  ║
║   ██████╔╝█████╗  ██║     ██║███████║██████╔╝██║   ██║██╔██╗ ██║██║  ██║  ║
║   ██╔══██╗██╔══╝  ██║     ██║██╔══██║██╔══██╗██║   ██║██║╚██╗██║██║  ██║  ║
║   ██║  ██║███████╗███████╗██║██║  ██║██████╔╝╚██████╔╝██║ ╚████║██████╔╝  ║
║   ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝╚═╝  ╚═╝╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚═════╝   ║
║                                                                           ║
║                    🔍 PROBE AGENT                                         ║
║                    Built with Nullshot TypeScript Agent Framework         ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
  `);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  MCP Server:     ${MCP_SERVER_URL}`);
  console.log(`  Check Interval: ${CHECK_INTERVAL_MS / 1000}s`);
  console.log(`  Agent Name:     ${PROBE_AGENT_NAME}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const agent = new NullshotProbeAgent(MCP_SERVER_URL);

  // Handle graceful shutdown
  const shutdown = () => {
    console.log('\n\n🛑 Received shutdown signal...');
    agent.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start the agent
  try {
    await agent.start(CHECK_INTERVAL_MS);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run as CLI entrypoint
main().catch((error) => {
  console.error("Fatal error in agent-probe:", error);
  process.exit(1);
});
