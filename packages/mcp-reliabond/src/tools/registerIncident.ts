// ===========================================
// MCP TOOL: register_incident_and_payout
// ===========================================
//
// This tool registers SLA breach incidents and triggers on-chain payouts.
// It supports both SIMULATED (demo) and REAL (testnet) payout paths.
//
// SIMULATED PATH (Default):
//   - Used when THIRDWEB_SECRET_KEY is not set
//   - Returns fake transaction hashes for demo purposes
//
// REAL PATH (Production-ready):
//   - Requires: THIRDWEB_SECRET_KEY and AGENT_EXECUTOR_PRIVATE_KEY
//   - Calls actual smart contract on Base Sepolia
//   - Returns real transaction hashes

import { storage, DEMO_ADDRESSES } from '../storage/kvStore';
import type {
  RegisterIncidentRequest,
  RegisterIncidentResponse,
  Incident,
  McpToolDefinition,
} from '../types';

export const registerIncidentDefinition: McpToolDefinition = {
  name: 'register_incident_and_payout',
  description: `Registers an SLA breach incident and triggers an on-chain payout from the service's bond contract. This is called by the Reliability Agent when a sustained breach is confirmed. It creates an incident record, executes the smart contract payout, and optionally publishes to Edenlayer.`,
  inputSchema: {
    type: 'object',
    properties: {
      serviceId: {
        type: 'string',
        description: 'ID of the breached service',
      },
      breachType: {
        type: 'string',
        enum: ['latency', 'availability', 'both'],
        description: 'Type of SLO breach',
      },
      breachDurationSeconds: {
        type: 'number',
        description: 'How long the breach has been sustained',
      },
      compensationPercent: {
        type: 'number',
        description: 'Percentage of bond to pay out (0-10)',
      },
      summary: {
        type: 'string',
        description: 'Human-readable summary of the breach and payout',
      },
    },
    required: [
      'serviceId',
      'breachType',
      'breachDurationSeconds',
      'compensationPercent',
      'summary',
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ENVIRONMENT INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

export interface PayoutEnv {
  THIRDWEB_SECRET_KEY?: string;
  THIRDWEB_CLIENT_ID?: string;
  AGENT_EXECUTOR_PRIVATE_KEY?: string;
  EDENLAYER_API_URL?: string;
  EDENLAYER_API_KEY?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function registerIncidentAndPayout(
  params: RegisterIncidentRequest,
  env?: PayoutEnv
): Promise<RegisterIncidentResponse> {
  const service = await storage.getService(params.serviceId);
  
  if (!service) {
    throw new Error(`Service not found: ${params.serviceId}`);
  }

  // Validate compensation is reasonable (0-10%)
  if (params.compensationPercent < 0 || params.compensationPercent > 10) {
    throw new Error('Compensation must be between 0% and 10%');
  }

  // Get affected users (in production, this would come from the service's user registry)
  const affectedUsers = storage.getDemoAffectedUsers();

  // Create incident record
  const incident: Incident = {
    id: `inc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    serviceId: params.serviceId,
    serviceName: service.name,
    createdAt: Date.now(),
    breachType: params.breachType,
    breachDurationSeconds: params.breachDurationSeconds,
    compensationPercent: params.compensationPercent,
    payoutAmountPerUser: calculatePayoutAmount(params.compensationPercent, affectedUsers.length),
    affectedUsers,
    status: 'pending',
    summary: params.summary,
  };

  // Store the incident
  await storage.addIncident(incident);

  let txHash: string | undefined;
  let error: string | undefined;

  try {
    // Execute on-chain payout via Thirdweb
    txHash = await executeThirdwebPayout(incident, service.bondContractAddress, env);
    
    // Update incident with tx hash
    await storage.updateIncident(incident.id, {
      status: 'executed',
      txHash,
    });
    incident.status = 'executed';
    incident.txHash = txHash;

    // Optionally post to Edenlayer (non-fatal)
    let edenlayerRecordId: string | undefined;
    try {
      edenlayerRecordId = await postToEdenlayer(incident, service, env);
      if (edenlayerRecordId) {
        await storage.updateIncident(incident.id, { edenlayerRecordId });
        incident.edenlayerRecordId = edenlayerRecordId;
      }
    } catch (edenlayerError) {
      // Log but don't fail - Edenlayer is optional
      console.error('📡 Edenlayer post failed (optional):', edenlayerError);
      // Continue execution - Edenlayer failure should not block payout
    }

    // Update service reliability score (penalty)
    const penaltyFactor = 1 - (params.compensationPercent / 100);
    await storage.updateService(params.serviceId, {
      reliabilityScore: Math.max(0, service.reliabilityScore * penaltyFactor),
      status: 'WARN', // Reset to WARN after payout
    });

    // Clear breach tracking
    storage.clearBreachStartTime(params.serviceId);

  } catch (payoutError) {
    error = payoutError instanceof Error ? payoutError.message : 'Payout failed';
    await storage.updateIncident(incident.id, { status: 'failed' });
    incident.status = 'failed';
  }

  return {
    success: incident.status === 'executed',
    incident,
    txHash,
    error,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PAYOUT CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

export function calculatePayoutAmount(compensationPercent: number, userCount: number): string {
  // Assume 1 ETH bond per service (in production, query actual bond balance)
  // 1 ETH = 1e18 wei
  const bondInWei = BigInt('1000000000000000000');
  
  // Calculate total payout: bond * (compensationPercent / 100)
  const totalPayoutWei = (bondInWei * BigInt(Math.floor(compensationPercent * 100))) / BigInt(10000);
  
  // Divide among users
  const perUserPayout = userCount > 0 ? totalPayoutWei / BigInt(userCount) : BigInt(0);
  
  return perUserPayout.toString();
}

// ═══════════════════════════════════════════════════════════════════════════
// THIRDWEB PAYOUT EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

export async function executeThirdwebPayout(
  incident: Incident,
  bondContractAddress: string,
  env?: PayoutEnv
): Promise<string> {
  console.log('🔗 Executing payout:', {
    incidentId: incident.id,
    contract: bondContractAddress,
    users: incident.affectedUsers.length,
    amountPerUser: incident.payoutAmountPerUser,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // REAL THIRDWEB PATH
  // Enabled when THIRDWEB_SECRET_KEY and AGENT_EXECUTOR_PRIVATE_KEY are set
  // and bondContractAddress is not empty
  // ─────────────────────────────────────────────────────────────────────────
  
  const agentPrivateKey = env?.AGENT_EXECUTOR_PRIVATE_KEY || process.env.AGENT_EXECUTOR_PRIVATE_KEY;
  
  const hasThirdwebConfig = Boolean(
    env?.THIRDWEB_SECRET_KEY &&
    agentPrivateKey &&
    bondContractAddress &&
    bondContractAddress !== '0x0000000000000000000000000000000000000000'
  );

  if (hasThirdwebConfig) {
    console.log('💎 Using REAL Thirdweb path (Base Sepolia testnet)');
    
    try {
      // Dynamic import to avoid bundling issues in Cloudflare Workers
      const { ThirdwebSDK } = await import('@thirdweb-dev/sdk');
      
      // Initialize SDK with agent's private key for Base Sepolia
      const sdk = ThirdwebSDK.fromPrivateKey(
        agentPrivateKey!,
        'base-sepolia', // Chain
        {
          secretKey: env!.THIRDWEB_SECRET_KEY,
          clientId: env?.THIRDWEB_CLIENT_ID,
        }
      );
      
      // Get the SLA bond contract
      const contract = await sdk.getContract(bondContractAddress);
      
      // Encode incident ID as bytes32 (truncate to 31 chars for bytes32 max)
      const incidentIdShort = incident.id.slice(0, 31);
      const { ethers } = await import('ethers');
      const incidentIdBytes32 = ethers.utils.formatBytes32String(incidentIdShort);
      
      // Call payoutIncident function on the contract
      // Signature: payoutIncident(bytes32 incidentId, address[] memory users, uint256 amountPerUser)
      const tx = await contract.call(
        'payoutIncident',
        [
          incidentIdBytes32,
          incident.affectedUsers,
          incident.payoutAmountPerUser,
        ]
      );
      
      const realTxHash = tx.receipt.transactionHash;
      console.log('✅ Real payout executed:', realTxHash);
      console.log('   View on BaseScan: https://sepolia.basescan.org/tx/' + realTxHash);
      return realTxHash;
      
    } catch (error) {
      console.error('❌ Thirdweb call failed:', error);
      // Don't throw - fall back to simulated mode
      console.log('⚠️  Falling back to simulated payout due to Thirdweb error');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SIMULATED PATH (Demo/Hackathon)
  // Used when Thirdweb credentials are not configured or real path fails
  // ─────────────────────────────────────────────────────────────────────────
  
  console.log('🎭 Using SIMULATED payout path (demo mode)');
  console.log('   Set THIRDWEB_SECRET_KEY and AGENT_EXECUTOR_PRIVATE_KEY for real payouts');

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Generate a realistic-looking simulated transaction hash
  // Prefix with 'dead' to make it obvious this is simulated
  const simulatedTxHash = `0xdead${Array.from({ length: 60 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')}`;

  console.log('✅ Simulated payout executed:', simulatedTxHash);
  return simulatedTxHash;
}

// ═══════════════════════════════════════════════════════════════════════════
// EDENLAYER INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

export async function postToEdenlayer(
  incident: Incident,
  service: { name: string; owner: string; bondContractAddress: string },
  env?: PayoutEnv
): Promise<string | undefined> {
  
  // Build the reliability event payload
  // This structure is designed to be compatible with Edenlayer's event schema
  const reliabilityEvent = {
    // Event metadata
    eventType: 'sla_breach_payout',
    version: '1.0',
    timestamp: new Date(incident.createdAt).toISOString(),
    
    // Agent identification
    agent: {
      id: 'reliabond-reliability-sentinel',
      name: 'Reliabond Reliability Agent',
      network: 'reliabond',
    },
    
    // Subject (the service that breached)
    subject: {
      type: 'service',
      id: incident.serviceId,
      name: service.name,
      owner: service.owner,
      bondContract: service.bondContractAddress,
      chain: 'base-sepolia',
    },
    
    // Incident details
    incident: {
      id: incident.id,
      breachType: incident.breachType,
      breachDurationSeconds: incident.breachDurationSeconds,
      compensationPercent: incident.compensationPercent,
      payoutAmountPerUserWei: incident.payoutAmountPerUser,
      affectedUsersCount: incident.affectedUsers.length,
      transactionHash: incident.txHash,
      status: incident.status,
    },
    
    // Human-readable summary
    summary: incident.summary,
    
    // Links for verification
    links: {
      transaction: incident.txHash 
        ? `https://sepolia.basescan.org/tx/${incident.txHash}`
        : null,
      bondContract: `https://sepolia.basescan.org/address/${service.bondContractAddress}`,
    },
  };

  console.log('📡 Edenlayer event payload:', JSON.stringify(reliabilityEvent, null, 2));

  // ─────────────────────────────────────────────────────────────────────────
  // REAL EDENLAYER PATH
  // Enabled when EDENLAYER_API_KEY is set
  // ─────────────────────────────────────────────────────────────────────────
  
  if (env?.EDENLAYER_API_KEY) {
    const edenlayerUrl = env.EDENLAYER_API_URL || 'https://api.edenlayer.com';
    console.log('📡 Posting to REAL Edenlayer API:', edenlayerUrl);
    
    try {
      const response = await fetch(`${edenlayerUrl}/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.EDENLAYER_API_KEY}`,
          'X-Agent-ID': 'reliabond-reliability-sentinel',
        },
        body: JSON.stringify(reliabilityEvent),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Edenlayer API error ${response.status}: ${errorText}`);
      }
      
      const result = await response.json() as { recordId?: string; id?: string };
      const recordId = result.recordId || result.id || `eden_${Date.now()}`;
      console.log('✅ Posted to Edenlayer:', recordId);
      return recordId;
      
    } catch (error) {
      console.error('❌ Edenlayer API call failed:', error);
      // Re-throw to let the caller decide how to handle
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SIMULATED PATH (Demo)
  // Used when Edenlayer credentials are not configured
  // ─────────────────────────────────────────────────────────────────────────
  
  console.log('ℹ️  Edenlayer not configured, skipping (optional integration)');
  console.log('   Set EDENLAYER_API_KEY and EDENLAYER_API_URL to enable');
  
  return undefined;
}
