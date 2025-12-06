// ===========================================
// RELIABOND RELIABILITY AGENT - ENTRY POINT
// ===========================================
//
// Nullshot Hacks Season 0 - Track 1a
// Built with Nullshot TypeScript Agent Framework

import { NullshotReliabilityAgent, createNullshotReliabilityAgent } from './agent';
import { 
  RELIABILITY_AGENT_NAME,
  RELIABILITY_AGENT_DESCRIPTION,
  RELIABILITY_AGENT_SYSTEM_PROMPT,
  EVALUATION_CYCLE_PROMPT 
} from './prompts';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:8787';
const EVALUATION_INTERVAL_MS = parseInt(process.env.EVALUATION_INTERVAL_MS || '60000', 10);

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS - For Nullshot Framework integration
// ═══════════════════════════════════════════════════════════════════════════

export { 
  NullshotReliabilityAgent,
  createNullshotReliabilityAgent,
  RELIABILITY_AGENT_NAME,
  RELIABILITY_AGENT_DESCRIPTION,
  RELIABILITY_AGENT_SYSTEM_PROMPT,
  EVALUATION_CYCLE_PROMPT,
};

// Default export for Nullshot Agent loader
export default createNullshotReliabilityAgent();

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
║                    🛡️  RELIABILITY SENTINEL AGENT                         ║
║                    Built with Nullshot TypeScript Agent Framework         ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
  `);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  MCP Server:         ${MCP_SERVER_URL}`);
  console.log(`  Evaluation Interval: ${EVALUATION_INTERVAL_MS / 1000}s`);
  console.log(`  Agent Name:          ${RELIABILITY_AGENT_NAME}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const agent = new NullshotReliabilityAgent(MCP_SERVER_URL);

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
    await agent.start(EVALUATION_INTERVAL_MS);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run as CLI entrypoint
main().catch((error) => {
  console.error("Fatal error in agent-reliability:", error);
  process.exit(1);
});
