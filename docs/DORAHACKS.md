# DoraHacks BUIDL Submission

## Project Name
**Reliabond – Agent Reliability Exchange**

---

## Short Description (100 words)

Reliabond is an Agent Reliability Exchange where services stake SLA bonds on-chain, and autonomous Nullshot agents enforce reliability guarantees. Probe Agents continuously monitor service health, while a Reliability Sentinel Agent evaluates SLO compliance and triggers automatic on-chain payouts when breaches are detected. Built with Nullshot TypeScript Agent Framework, MCP protocol, and Thirdweb smart contracts on Base Sepolia. No disputes, no delays – just trustless SLA enforcement for the agentic economy.

---

## Full Description

### The Problem

Traditional SLAs are unenforceable. When services fail:
- Users face lengthy dispute processes
- Compensation is manual and delayed
- There's no standard for agents to assess service trust
- The agentic economy lacks reliability infrastructure

### Our Solution

**Reliabond** creates trustless SLA enforcement:

1. **Services stake bonds** on-chain as collateral for their promises
2. **Probe Agents** (Nullshot) continuously monitor health metrics
3. **Reliability Agents** (Nullshot) detect breaches and trigger payouts
4. **Users receive automatic compensation** from slashed bonds
5. **Reliability Passports** create discoverable trust records

### Key Features

- **Autonomous Enforcement**: No human intervention required
- **On-Chain Bonds**: Real assets at stake (ERC20 tokens)
- **Real-Time Monitoring**: Probe agents check every 30 seconds
- **Transparent Payouts**: All transactions verifiable on-chain
- **Agent Discovery**: Reliability data for trust decisions

### Technical Architecture

| Component | Technology |
|-----------|------------|
| Probe Agent | Nullshot TypeScript Agent Framework |
| Reliability Agent | Nullshot TypeScript Agent Framework |
| MCP Server | Cloudflare Workers |
| Smart Contracts | Solidity + Thirdweb |
| Chain | Base Sepolia Testnet |
| Frontend | Next.js + TailwindCSS |
| Discovery | Edenlayer (optional) |

### How to Test

1. Visit the live demo at [DEPLOYED_URL]
2. View the reliability network map showing monitored services
3. Watch real-time probe events on the timeline
4. Observe automatic breach detection and payout triggers
5. Explore Reliability Passports for incident history

### Local Setup

```bash
git clone https://github.com/yourusername/reliabond.git
cd reliabond
pnpm install
cp .env.example .env
# Add your keys
pnpm dev
```

---

## Track

**Track 1a: MCPs/Agents using the Nullshot Framework**

---

## Tech Used

- Nullshot TypeScript Agent Framework
- MCP (Model Context Protocol)
- Thirdweb SDK
- Cloudflare Workers
- Base Sepolia
- Next.js 14
- TailwindCSS
- Zustand
- React Query

---

## Links

| Resource | URL |
|----------|-----|
| GitHub Repository | https://github.com/yourusername/reliabond |
| Demo Video (3-5 min) | [YouTube URL] |
| Live Demo | [Deployed URL] |
| Nullshot Brainstorm | [Brainstorm URL] |

---

## Screenshots

1. **Reliability Network Map** - Visual graph of services and monitoring agents
2. **Incident Timeline** - Real-time breach detection and payout events
3. **Reliability Passport** - Service details with SLO config and history
4. **Bond Vault** - Network-wide statistics and total bonded value
5. **Agent Logs** - Terminal showing autonomous agent activity

---

## Video Outline

1. **Hook** (30s): The problem with unenforceable SLAs
2. **Overview** (60s): Dashboard walkthrough
3. **Architecture** (60s): Agent system explanation
4. **Live Demo** (60s): Trigger and observe a breach + payout
5. **Passport** (30s): Explore reliability records
6. **Tech Stack** (30s): Nullshot, Thirdweb, Edenlayer
7. **Close** (30s): Vision for agentic economy

---

## Team

Solo builder

---

## Prizes Targeted

- **$5,000 Track 1a Prize** - MCPs/Agents using Nullshot Framework
- **Thirdweb Sponsor Prize** - Meaningful Web3 integration
- **Edenlayer Bonus** - Agent discovery integration

---

*Built for Nullshot Hacks: Season 0* 🚀
