# 🎬 Reliabond Demo Script

**Duration:** 3-5 minutes

**Purpose:** Showcase Reliabond for Nullshot Hacks Season 0 - Track 1a

---

## Pre-Demo Setup

1. Start all services:
   ```bash
   # Terminal 1: MCP Server
   cd packages/mcp-reliabond && pnpm dev
   
   # Terminal 2: Probe Agent  
   cd packages/agent-probe && pnpm start
   
   # Terminal 3: Reliability Agent
   cd packages/agent-reliability && pnpm start
   
   # Terminal 4: Frontend
   cd apps/web && pnpm dev
   ```

2. Open browser to `http://localhost:3000`
3. Have terminal windows visible for agent logs
4. Have Base Sepolia explorer ready

---

## Demo Script

### 🎯 [0:00 - 0:30] Hook & Problem Statement

**Show:** Dashboard with healthy network

**Say:**
> "In the agentic economy, AI agents depend on services that promise certain reliability guarantees. But what happens when those promises are broken?
> 
> Traditional SLAs are just words on paper. Disputes take weeks. Compensation rarely arrives.
>
> This is Reliabond – where SLAs have teeth."

---

### 🔍 [0:30 - 1:30] System Overview

**Show:** Full dashboard, point to each component

**Say:**
> "Reliabond is an Agent Reliability Exchange built with the Nullshot Framework.
>
> Here you see our reliability network map. Each node is a service that has staked a bond on-chain – real funds at risk if they fail.
>
> [Point to green nodes]
> Green means healthy – SLO targets are being met.
>
> [Point to timeline]
> This timeline shows probe events and incidents in real-time.
>
> [Point to Bond Vault]
> And here's the bond vault – showing total liquidity backing SLA guarantees."

---

### 🤖 [1:30 - 2:30] Agent Architecture – Visible Reasoning

**Show:** Terminal with Probe Agent logs

**Say:**
> "Behind the scenes, we have two Nullshot agents working autonomously.
>
> [Point to probe agent terminal - show thought logs]
> Watch the Probe Agent thinking out loud. It says 'I need to check all registered services' then calls the list_services tool."

**Highlight terminal output:**
```
🧠 [12:34:56] THINKING
   I am the Probe Agent. My job is to measure and report service health.
   Let me discover what services I need to monitor...

🔧 [12:34:56] TOOL_CALL
   Calling: list_services
   
📥 [12:34:56] TOOL_RESULT  
   Found 5 services to monitor
```

**Say:**
> "This isn't just logging – it's genuine agentic behavior. The agent reasons about its task, decides what tools to use, and acts accordingly."

**Show:** Reliability Agent terminal

**Highlight:**
```
⚖️ [12:35:30] DECISION
   Verification Checklist for ML Inference Engine:
     [✓] Status is BREACHED
     [✓] Duration (312s) exceeds threshold (300s)
     [✓] Compensation (2.5%) is reasonable
   
   VERDICT: All checks pass. Initiating payout.

⚡ [12:35:30] ACTION
   🚨 TRIGGERING ON-CHAIN PAYOUT
   Service: ML Inference Engine
   Affected users: 3
   Per-user: 0.025 ETH
```

**Say:**
> "The Reliability Agent shows its decision-making process. It runs through a verification checklist before triggering any payout. This transparency is key – you can audit exactly why the agent decided to move funds."

---

### ⚡ [2:30 - 3:30] Live Breach Demo

**Action:** Trigger simulated outage (ML Inference service is configured to fail)

**Show:** Dashboard updating in real-time

**Say:**
> "Let's see what happens during a real breach.
>
> [Watch status change from OK to WARN]
> The Probe Agent has detected degraded performance. Status changes to warning.
>
> [Watch breach duration increase]
> The breach is being tracked. Once it exceeds the configured threshold...
>
> [Watch status change to BREACHED]
> Now we're breached. The Reliability Agent is evaluating.
>
> [Show agent terminal - payout execution]
> There it is – the agent has verified the breach and is triggering an on-chain payout."

**Show:** Timeline updating with breach band and payout event

**Say:**
> "On the timeline, you can see the breach period in red, and the payout event marked with a coin icon."

---

### 🎫 [3:30 - 4:00] Reliability Passport

**Action:** Click on the affected service node

**Show:** Passport drawer sliding open

**Say:**
> "Every service has a Reliability Passport. Here you can see:
>
> - The current reliability score, now reduced after the incident
> - SLO configuration and current metrics  
> - Bond balance and contract address on Base Sepolia
> - Full incident history with transaction hashes
>
> [Click explorer link]
> And here's the actual on-chain transaction where affected users received compensation."

---

### 🌐 [4:00 - 4:30] Tech Stack & Integration

**Show:** Architecture diagram or code structure

**Say:**
> "Reliabond uses:
> - Nullshot TypeScript Agent Framework with MCP protocol
> - Thirdweb for smart contracts on Base Sepolia
> - Cloudflare Workers for the MCP server
> - Optional Edenlayer integration for agent discovery
>
> Everything is open source and designed for production scale."

---

### 🏆 [4:30 - 5:00] Closing

**Show:** Dashboard with recovered network

**Say:**
> "Reliabond transforms SLAs from unenforceable promises into autonomous guarantees.
>
> Services stake real value. Agents verify in real-time. Users receive automatic compensation.
>
> This is trustless reliability for the agentic economy.
>
> Check out the code on GitHub, and thank you for watching."

---

## Key Points to Emphasize

1. **Nullshot Framework** - Both agents built with it, MCP protocol implementation
2. **Thirdweb** - Smart contracts, wallet integration, on-chain execution
3. **Autonomous** - No human intervention required for payouts
4. **Real Stakes** - Bonds are real on-chain assets
5. **Auditable** - All incidents have on-chain transaction proof

---

## Demo Tips

- Keep terminal logs visible during breach to show agent activity
- Have the explorer pre-loaded to show transactions quickly
- Practice the breach timing so status changes happen on cue
- Emphasize the "autonomous" nature – this happens without human approval

---

*Good luck with your demo! 🚀*
