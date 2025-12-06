// ===========================================
// RELIABOND MCP SERVER - CLOUDFLARE WORKER
// ===========================================
// 
// This is the main MCP server that exposes tools for:
// - Listing registered services
// - Recording probe results
// - Evaluating SLA compliance
// - Registering incidents and triggering payouts
//
// Deployed as a Cloudflare Worker for edge performance.

import { listServices, listServicesDefinition } from './tools/listServices';
import { recordProbeResult, recordProbeResultDefinition } from './tools/recordProbeResult';
import { evaluateSla, evaluateSlaDefinition } from './tools/evaluateSla';
import { registerIncidentAndPayout, registerIncidentDefinition } from './tools/registerIncident';
import { storage } from './storage/kvStore';
import type { McpRequest, McpResponse, McpToolDefinition } from './types';

// Tool registry
const TOOLS: Record<string, {
  definition: McpToolDefinition;
  handler: (params: any, env?: any) => Promise<any>;
}> = {
  list_services: {
    definition: listServicesDefinition,
    handler: listServices,
  },
  record_probe_result: {
    definition: recordProbeResultDefinition,
    handler: recordProbeResult,
  },
  evaluate_sla: {
    definition: evaluateSlaDefinition,
    handler: evaluateSla,
  },
  register_incident_and_payout: {
    definition: registerIncidentDefinition,
    handler: registerIncidentAndPayout,
  },
};

// MCP Protocol Handler
async function handleMcpRequest(
  request: McpRequest,
  env: Env
): Promise<McpResponse> {
  const { id, method, params } = request;

  try {
    switch (method) {
      case 'initialize': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'reliabond-mcp',
              version: '0.1.0',
            },
          },
        };
      }

      case 'tools/list': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: Object.values(TOOLS).map((t) => t.definition),
          },
        };
      }

      case 'tools/call': {
        const { name, arguments: args } = params as {
          name: string;
          arguments: Record<string, unknown>;
        };

        const tool = TOOLS[name];
        if (!tool) {
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Unknown tool: ${name}`,
            },
          };
        }

        const result = await tool.handler(args || {}, env);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          },
        };
      }

      default: {
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Unknown method: ${method}`,
          },
        };
      }
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal error',
      },
    };
  }
}

// REST API Handler (for frontend)
async function handleRestApi(
  path: string,
  method: string,
  body: any,
  env: Env
): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    switch (true) {
      // GET /api/services
      case path === '/api/services' && method === 'GET': {
        const result = await listServices({ includeMetrics: true });
        return new Response(JSON.stringify(result), { headers });
      }

      // POST /api/services - Register a new service
      case path === '/api/services' && method === 'POST': {
        const result = await registerService(body);
        return new Response(JSON.stringify(result), { 
          status: result.success ? 201 : 400,
          headers 
        });
      }

      // GET /api/services/:id
      case path.startsWith('/api/services/') && method === 'GET': {
        const serviceId = path.split('/')[3];
        const service = await storage.getService(serviceId);
        if (!service) {
          return new Response(JSON.stringify({ error: 'Service not found' }), {
            status: 404,
            headers,
          });
        }
        const metrics = await storage.calculateRollingMetrics(serviceId);
        return new Response(JSON.stringify({ service, metrics }), { headers });
      }

      // GET /api/incidents
      case path === '/api/incidents' && method === 'GET': {
        const incidents = await storage.getIncidents();
        return new Response(JSON.stringify({ incidents }), { headers });
      }

      // GET /api/incidents/:serviceId
      case path.startsWith('/api/incidents/') && method === 'GET': {
        const serviceId = path.split('/')[3];
        const incidents = await storage.getIncidents(serviceId);
        return new Response(JSON.stringify({ incidents }), { headers });
      }

      // POST /api/probe (simplified probe endpoint for testing)
      case path === '/api/probe' && method === 'POST': {
        const result = await recordProbeResult(body);
        return new Response(JSON.stringify(result), { headers });
      }

      // GET /api/health
      case path === '/api/health' && method === 'GET': {
        return new Response(
          JSON.stringify({
            status: 'healthy',
            version: '0.1.0',
            timestamp: Date.now(),
          }),
          { headers }
        );
      }

      // GET /api/stats
      case path === '/api/stats' && method === 'GET': {
        const services = await storage.getServices();
        const incidents = await storage.getIncidents();
        
        const totalBondedValue = services.length * 1; // Simplified: 1 ETH per service
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recentIncidents = incidents.filter((i) => i.createdAt > weekAgo);
        
        // Safe calculation for total paid out
        let totalPaidOut = 0;
        for (const incident of recentIncidents) {
          try {
            const perUser = parseFloat(incident.payoutAmountPerUser) || 0;
            const userCount = incident.affectedUsers?.length || 0;
            totalPaidOut += perUser * userCount;
          } catch {
            // Skip malformed incidents
          }
        }

        return new Response(
          JSON.stringify({
            totalServices: services.length,
            totalBondedValueEth: totalBondedValue,
            totalPaidOutThisWeekWei: totalPaidOut,
            activeBonds: services.length,
            incidentsThisWeek: recentIncidents.length,
            totalIncidents: incidents.length,
          }),
          { headers }
        );
      }

      default:
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers,
        });
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal error',
      }),
      { status: 500, headers }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

interface RegisterServiceRequest {
  name: string;
  description?: string;
  healthCheckUrl: string;
  owner: string;
  bondContractAddress: string;
  sloConfig: {
    maxLatencyP99Ms: number;
    minUptimePercent: number;
    checkIntervalSeconds?: number;
    breachThresholdSeconds?: number;
  };
}

async function registerService(body: RegisterServiceRequest): Promise<{
  success: boolean;
  service?: Service;
  error?: string;
}> {
  // Validate required fields
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return { success: false, error: 'Service name is required' };
  }

  if (!body.healthCheckUrl || typeof body.healthCheckUrl !== 'string') {
    return { success: false, error: 'Health check URL is required' };
  }

  // Validate URL format
  try {
    new URL(body.healthCheckUrl);
  } catch {
    return { success: false, error: 'Invalid health check URL format' };
  }

  if (!body.owner || typeof body.owner !== 'string' || !body.owner.startsWith('0x')) {
    return { success: false, error: 'Valid owner address (0x...) is required' };
  }

  if (!body.bondContractAddress || typeof body.bondContractAddress !== 'string' || !body.bondContractAddress.startsWith('0x')) {
    return { success: false, error: 'Valid bond contract address (0x...) is required' };
  }

  if (!body.sloConfig || typeof body.sloConfig !== 'object') {
    return { success: false, error: 'SLO configuration is required' };
  }

  const { maxLatencyP99Ms, minUptimePercent } = body.sloConfig;

  if (typeof maxLatencyP99Ms !== 'number' || maxLatencyP99Ms <= 0) {
    return { success: false, error: 'maxLatencyP99Ms must be a positive number' };
  }

  if (typeof minUptimePercent !== 'number' || minUptimePercent < 0 || minUptimePercent > 100) {
    return { success: false, error: 'minUptimePercent must be between 0 and 100' };
  }

  // Generate service ID
  const serviceId = `svc_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`;

  // Create service object
  const service: Service = {
    id: serviceId,
    name: body.name.trim(),
    description: body.description?.trim() || `Service ${body.name}`,
    baseUrl: new URL(body.healthCheckUrl).origin,
    healthCheckUrl: body.healthCheckUrl,
    owner: body.owner,
    bondContractAddress: body.bondContractAddress,
    sloConfig: {
      maxLatencyP99Ms: body.sloConfig.maxLatencyP99Ms,
      minUptimePercent: body.sloConfig.minUptimePercent,
      checkIntervalSeconds: body.sloConfig.checkIntervalSeconds || 30,
      breachThresholdSeconds: body.sloConfig.breachThresholdSeconds || 300,
    },
    reliabilityScore: 100, // Start at 100%
    status: 'UNKNOWN',
    lastCheckTime: Date.now(),
    createdAt: Date.now(),
  };

  // Add to storage
  await storage.addService(service);

  return { success: true, service };
}

// Type for service (inline definition for this handler)
interface Service {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  healthCheckUrl: string;
  owner: string;
  bondContractAddress: string;
  sloConfig: {
    maxLatencyP99Ms: number;
    minUptimePercent: number;
    checkIntervalSeconds: number;
    breachThresholdSeconds: number;
  };
  reliabilityScore: number;
  status: string;
  lastCheckTime: number;
  createdAt: number;
}

// Environment interface
interface Env {
  THIRDWEB_SECRET_KEY?: string;
  EDENLAYER_API_KEY?: string;
  // Add KV namespace when using Cloudflare KV
  // RELIABOND_KV: KVNamespace;
}

// Main Worker Export
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // MCP endpoint (POST /mcp)
    if (path === '/mcp' && method === 'POST') {
      const body = (await request.json()) as McpRequest;
      const response = await handleMcpRequest(body, env);
      return new Response(JSON.stringify(response), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // REST API endpoints
    if (path.startsWith('/api/')) {
      const body = method === 'POST' ? await request.json() : null;
      return handleRestApi(path, method, body, env);
    }

    // Root - return server info
    if (path === '/') {
      return new Response(
        JSON.stringify({
          name: 'Reliabond MCP Server',
          description: 'Agent Reliability Exchange - MCP server for SLA monitoring and enforcement',
          version: '0.1.0',
          endpoints: {
            mcp: 'POST /mcp',
            services: 'GET /api/services',
            incidents: 'GET /api/incidents',
            stats: 'GET /api/stats',
            health: 'GET /api/health',
          },
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    return new Response('Not Found', { status: 404 });
  },
};
