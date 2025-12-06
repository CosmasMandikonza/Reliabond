# 🛡️ Reliabond – Agent Reliability Exchange

> **Autonomous SLA enforcement where AI agents stake bonds, verify reliability, and trigger on-chain payouts when promises break.**

[![Nullshot Hacks](https://img.shields.io/badge/Nullshot_Hacks-Season_0-blue?style=for-the-badge)](https://nullshot.com)
[![Track](https://img.shields.io/badge/Track-1a_MCPs%2FAgents-green?style=for-the-badge)](https://nullshot.com)
[![Built With](https://img.shields.io/badge/Built_With-Nullshot_Framework-purple?style=for-the-badge)](https://nullshot.com)
[![Thirdweb](https://img.shields.io/badge/Web3-Thirdweb-orange?style=for-the-badge)](https://thirdweb.com)

---

## 🎯 The Problem

In the emerging **agentic economy**, AI agents depend on services that promise reliability guarantees. But:

- ❌ Traditional SLAs are **unenforceable paper agreements**
- ❌ Disputes require manual intervention and take **weeks**
- ❌ Affected users **rarely receive timely compensation**
- ❌ There's no way for agents to **assess service trustworthiness**

## 💡 The Solution

**Reliabond** creates trustless, autonomous SLA enforcement:

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Service   │      │   Probe     │      │ Reliability │      │    Bond     │
│   Stakes    │─────▶│   Agent     │─────▶│   Agent     │─────▶│  Contract   │
│   Bond      │      │  Monitors   │      │  Enforces   │      │   Pays Out  │
└─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘
```

1. **Services register** with declared SLOs and stake bonds on-chain
2. **Probe Agents** continuously monitor service health via MCP
3. **Reliability Agent** detects sustained breaches and triggers payouts
4. **Users receive automatic compensation** from slashed bonds

---

## 🏆 Nullshot Hacks Season 0 – Track 1a

This project demonstrates **deep integration** with the Nullshot ecosystem:

### ✅ Nullshot Agent Patterns

Both agents are built following the Nullshot TypeScript Agent Framework patterns and are designed for MCP + Cloudflare Workers deployment:

- **Service-based architecture** following Nullshot's `ToolboxService` and `MiddlewareService` patterns
- **Nullshot Runtime** entry points for each agent (`src/nullshotRuntime.ts`)
- **System prompts** that drive agentic behavior
- **MCP tool bindings** for service discovery and actions
- **Visible reasoning** – agents log their "thoughts" and decisions
- **Ready for Workers deployment** – can be adapted to Cloudflare Durable Objects

```typescript
// Nullshot-compatible service wrapper
class ReliabondProbeService implements NullshotService {
  name = '@reliabond/agent-probe/service';
  
  async initialize(): Promise<void> {
    this.agentInstance = createNullshotProbeAgent().createInstance();
  }
  
  getTools() {
    return this.agentConfig.tools; // MCP-compatible tool definitions
  }
}
```

**Running the agents:**
```bash
# Standard CLI daemon mode
cd packages/agent-probe && pnpm start

# Nullshot service wrapper mode
cd packages/agent-probe && pnpm start:nullshot

# Reliability Sentinel
cd packages/agent-reliability && pnpm start:nullshot
```

### ✅ MCP Server Implementation

Full Model Context Protocol implementation on Cloudflare Workers:

- **4 MCP Tools**: `list_services`, `record_probe_result`, `evaluate_sla`, `register_incident_and_payout`
- **JSON-RPC 2.0** protocol with proper error handling
- **REST API fallback** for frontend integration

### ✅ Thirdweb + Edenlayer Integration

**Thirdweb (On-Chain Payouts):**
- Uses **Thirdweb SDK** to deploy and execute payouts on Base Sepolia
- **Real payout path** activates when `THIRDWEB_SECRET_KEY` and `AGENT_EXECUTOR_PRIVATE_KEY` are set
- **Simulated path** for local demos when keys are not set (tx hashes prefixed with `0xdead`)
- Contract: `ReliabondSlaBond.sol` with `payoutIncident()` function

**Edenlayer (Reliability Event Discovery):**
- Posts `sla_breach_payout` events to Edenlayer when `EDENLAYER_API_KEY` is configured
- Makes reliability incidents discoverable by other agents in the network
- **Graceful fallback** – Edenlayer failures don't block payouts (non-fatal)

```env
# Real Thirdweb payout (optional)
THIRDWEB_SECRET_KEY=your_secret_key
AGENT_EXECUTOR_PRIVATE_KEY=0x...

# Edenlayer discovery (optional)
EDENLAYER_API_URL=https://api.edenlayer.com
EDENLAYER_API_KEY=your_api_key
```

---

## 🎯 Nullshot Track 1a Alignment

| Requirement | Implementation |
|-------------|----------------|
| Nullshot agent patterns | ✅ Both agents use `NullshotService` interface with `ToolboxService` patterns |
| MCP server with discoverable tools | ✅ Cloudflare Worker exposing 4 tools via JSON-RPC 2.0 |
| Probe Agent | ✅ Synthetic health checks with visible reasoning and MCP tool calls |
| Reliability Sentinel | ✅ SLA enforcement + autonomous on-chain payout execution |
| Agentic behavior | ✅ Agents think, decide, and act with logged reasoning |
| Cloudflare Workers ready | ✅ MCP server deploys to Workers, agents follow Durable Object patterns |
| Thirdweb integration | ✅ Real payout path when configured, simulated fallback |
| Edenlayer integration | ✅ Posts reliability events when configured |

---

## 🏗️ Architecture

```
reliabond/
├── packages/
│   ├── mcp-reliabond/          # MCP Server (Cloudflare Worker)
│   │   └── src/
│   │       ├── tools/          # MCP tool implementations
│   │       └── storage/        # In-memory demo storage
│   ├── agent-probe/            # Probe Agent (Nullshot Framework)
│   │   └── src/
│   │       ├── agent.ts        # NullshotProbeAgent class
│   │       └── prompts.ts      # System prompt & identity
│   ├── agent-reliability/      # Reliability Agent (Nullshot Framework)
│   │   └── src/
│   │       ├── agent.ts        # NullshotReliabilityAgent class
│   │       └── prompts.ts      # System prompt & decision framework
│   └── contracts/              # Solidity contracts (Thirdweb)
├── apps/
│   └── web/                    # Next.js Dashboard
└── docs/                       # Architecture, demo script, submissions
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and pnpm 9+
- Cloudflare account (for Workers deployment)
- Thirdweb account (for Web3 features)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/reliabond.git
cd reliabond
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required for MCP Server
MCP_SERVER_URL=http://localhost:8787

# Required for real Thirdweb payouts (optional for demo)
THIRDWEB_CLIENT_ID=your_client_id
THIRDWEB_SECRET_KEY=your_secret_key
AGENT_EXECUTOR_PRIVATE_KEY=0x...

# Optional: Edenlayer integration
EDENLAYER_API_URL=https://api.edenlayer.com
EDENLAYER_API_KEY=your_key
```

### 3. Start the System

**Terminal 1: MCP Server**
```bash
cd packages/mcp-reliabond
pnpm dev
# Server running at http://localhost:8787
```

**Terminal 2: Probe Agent**
```bash
cd packages/agent-probe
pnpm start
# Agent starts probing services every 30s
```

**Terminal 3: Reliability Agent**
```bash
cd packages/agent-reliability
pnpm start
# Agent evaluates SLOs every 60s
```

**Terminal 4: Frontend (optional)**
```bash
cd apps/web
pnpm dev
# Dashboard at http://localhost:3000
```

### 4. Watch It Work

The demo includes a **simulated failing service** (ML Inference Engine returns 503).

Watch the terminal output:
1. **Probe Agent** detects failures
2. Service status changes: `OK` → `WARN` → `BREACHED`
3. **Reliability Agent** verifies breach duration
4. Agent triggers **on-chain payout**
5. Transaction hash displayed (simulated in demo mode)

---

## 🔧 Enabling Real Payouts

### Step 1: Deploy the Smart Contract

```bash
cd packages/contracts

# Fund your deployer wallet with Base Sepolia ETH first
# Get some from: https://www.coinbase.com/faucets

pnpm deploy:testnet
```

### Step 2: Update Environment

Add the deployed contract address to `.env`:

```env
SLA_BOND_CONTRACT_ADDRESS=0x...
```

### Step 3: Configure Thirdweb

Ensure these are set:

```env
THIRDWEB_SECRET_KEY=your_secret_key
AGENT_EXECUTOR_PRIVATE_KEY=0x...
```

### Step 4: Restart Agents

The system will now execute **real on-chain transactions** when breaches occur!

---

## 🧪 Running Tests

```bash
cd packages/mcp-reliabond
pnpm test
```

Tests cover:
- SLA evaluation logic
- Breach detection thresholds
- Compensation calculation
- Recovery handling

---

## 📊 API Reference

### MCP Tools

| Tool | Description |
|------|-------------|
| `list_services` | Get all registered services with metrics |
| `record_probe_result` | Record health check results |
| `evaluate_sla` | Evaluate SLA compliance for a service |
| `register_incident_and_payout` | Trigger on-chain compensation |

### REST API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/services` | GET | List all services |
| `/api/services` | POST | Register new service |
| `/api/services/:id` | GET | Get service details |
| `/api/incidents` | GET | List all incidents |
| `/api/stats` | GET | Network statistics |
| `/api/health` | GET | Health check |

---

## 🎬 Demo Video

See [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) for a complete 3-5 minute demo walkthrough.

---

## 📁 Key Files

### Agent Definitions (Nullshot Framework)

- [`packages/agent-probe/src/agent.ts`](packages/agent-probe/src/agent.ts) – `NullshotProbeAgent` class with agentic reasoning
- [`packages/agent-reliability/src/agent.ts`](packages/agent-reliability/src/agent.ts) – `NullshotReliabilityAgent` with decision framework
- [`packages/agent-*/src/prompts.ts`](packages/agent-probe/src/prompts.ts) – System prompts defining agent behavior

### MCP Server

- [`packages/mcp-reliabond/src/index.ts`](packages/mcp-reliabond/src/index.ts) – Main server with MCP + REST
- [`packages/mcp-reliabond/src/tools/`](packages/mcp-reliabond/src/tools/) – Tool implementations

### Smart Contracts

- [`packages/contracts/contracts/ReliabondSlaBond.sol`](packages/contracts/contracts/ReliabondSlaBond.sol) – Bond management
- [`packages/contracts/scripts/deploy.ts`](packages/contracts/scripts/deploy.ts) – Thirdweb deployment

---

## 🔑 What Makes This Stand Out

### 1. **Real Agentic Behavior**
Agents show their reasoning, not just results. Watch them think through decisions.

### 2. **Financial Authority**
The Reliability Agent can autonomously trigger **real on-chain fund transfers**.

### 3. **Multi-Agent Coordination**
Probe agents measure, Reliability agent decides. Clear separation of concerns.

### 4. **Production-Ready Architecture**
MCP server on Cloudflare Workers, proper error handling, graceful degradation.

### 5. **Demo → Production Path**
Clear documentation for moving from simulated to real payouts.

---

## 📄 License

MIT License – see [LICENSE](LICENSE)

---

## 🙏 Acknowledgments

- **Nullshot** – Agent framework and hackathon
- **Thirdweb** – Web3 SDK and infrastructure
- **Edenlayer** – Agent discovery network
- **Cloudflare** – Edge computing platform

---

<div align="center">

**Built with 🛡️ for Nullshot Hacks Season 0**

[Demo Video](#) · [DoraHacks](https://dorahacks.io) · [Nullshot](https://nullshot.com)

</div>
