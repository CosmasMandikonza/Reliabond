# 🏗️ Reliabond Architecture

This document details the technical architecture of Reliabond, an Agent Reliability Exchange built for Nullshot Hacks Season 0.

---

## System Overview

Reliabond consists of five main components:

1. **MCP Server** - Central coordination and data layer
2. **Probe Agents** - Health monitoring agents
3. **Reliability Agent** - SLA enforcement agent
4. **SLA Bond Contract** - On-chain bond management
5. **Web Dashboard** - Visualization and monitoring

---

## Component Architecture

### 1. MCP Server (Cloudflare Worker)

The MCP server is the central nervous system of Reliabond, deployed as a Cloudflare Worker for edge performance.

```mermaid
graph TB
    subgraph MCP["MCP Server"]
        H[HTTP Handler]
        MCP_P[MCP Protocol Handler]
        REST[REST API Handler]
        
        subgraph Tools["MCP Tools"]
            LS[list_services]
            RP[record_probe_result]
            ES[evaluate_sla]
            RI[register_incident]
        end
        
        subgraph Storage["Storage Layer"]
            KV[(KV Store)]
            MEM[(In-Memory)]
        end
    end
    
    H --> MCP_P
    H --> REST
    MCP_P --> Tools
    REST --> Tools
    Tools --> Storage
```

**Endpoints:**
- `POST /mcp` - MCP protocol (JSON-RPC 2.0)
- `GET /api/services` - List all services
- `GET /api/incidents` - List all incidents
- `GET /api/stats` - Network statistics
- `GET /api/health` - Health check

### 2. Probe Agent (Nullshot)

The Probe Agent performs synthetic health checks on all registered services.

```mermaid
sequenceDiagram
    participant PA as Probe Agent
    participant MCP as MCP Server
    participant SVC as Target Service
    
    loop Every 30 seconds
        PA->>MCP: list_services()
        MCP-->>PA: [services]
        
        loop For each service
            PA->>SVC: HTTP GET /health
            SVC-->>PA: Response + Latency
            PA->>MCP: record_probe_result()
            MCP-->>PA: Updated metrics
        end
    end
```

**Responsibilities:**
- Discover services via MCP
- Perform HTTP health checks
- Measure latency and availability
- Report metrics honestly

### 3. Reliability Agent (Nullshot)

The Reliability Agent monitors SLOs and triggers payouts when breaches are confirmed.

```mermaid
sequenceDiagram
    participant RA as Reliability Agent
    participant MCP as MCP Server
    participant TW as Thirdweb Contract
    participant EL as Edenlayer
    
    loop Every 60 seconds
        RA->>MCP: list_services()
        MCP-->>RA: [services]
        
        loop For each service
            RA->>MCP: evaluate_sla(serviceId)
            MCP-->>RA: SLA Evaluation
            
            alt status == BREACHED
                RA->>RA: Verify metrics & thresholds
                RA->>MCP: register_incident_and_payout()
                MCP->>TW: payoutIncident()
                TW-->>MCP: tx hash
                MCP->>EL: POST reliability event
                MCP-->>RA: Incident record
            end
        end
    end
```

**Decision Framework:**
1. Service status must be "BREACHED"
2. Breach duration must exceed threshold
3. Compensation must be within bounds (0-10%)
4. Clear reasoning must be documented

### 4. SLA Bond Contract (Solidity/Thirdweb)

The smart contract manages bond deposits and automated payouts.

```mermaid
graph TB
    subgraph Contract["ReliabondSlaBond"]
        D[deposit]
        W[withdraw]
        P[payoutIncident]
        
        subgraph State["Contract State"]
            BT[Bond Token]
            BB[Bond Balance]
            CU[Covered Users]
            PI[Processed Incidents]
        end
    end
    
    SO[Service Operator] -->|deposit/withdraw| D
    SO --> W
    AE[Agent Executor] -->|payoutIncident| P
    P --> CU
    P -->|transfer| U[Users]
```

**Key Functions:**
- `deposit(amount)` - Operator deposits bond
- `withdraw(amount)` - Operator withdraws bond
- `payoutIncident(incidentId, users, amount)` - Agent triggers payout
- `addCoveredUsers(users)` - Add users to coverage

**Security:**
- Only agent executor can trigger payouts
- Max payout capped at 10% per incident
- Incident IDs prevent double payouts

### 5. Web Dashboard (Next.js)

The dashboard provides real-time visualization of the reliability network.

```mermaid
graph LR
    subgraph Frontend["Next.js App"]
        RM[Reliability Map]
        IT[Incident Timeline]
        PD[Passport Drawer]
        BV[Bond Vault]
    end
    
    subgraph State["State Management"]
        RQ[React Query]
        ZS[Zustand Store]
    end
    
    subgraph API["API Layer"]
        MCP_API[MCP REST API]
    end
    
    Frontend --> State
    State --> API
    API --> MCP_API
```

---

## Data Flow

### Service Registration & Probing

```mermaid
flowchart LR
    A[Service Owner] -->|1. Register Service| B[MCP Server]
    B -->|2. Store| C[(Storage)]
    D[Probe Agent] -->|3. list_services| B
    D -->|4. Health Check| E[Service]
    D -->|5. record_probe_result| B
    B -->|6. Update Metrics| C
```

### Breach Detection & Payout

```mermaid
flowchart TB
    A[Reliability Agent] -->|1. evaluate_sla| B[MCP Server]
    B -->|2. Calculate Metrics| C[(Storage)]
    B -->|3. Return Evaluation| A
    
    A -->|4. status == BREACHED| D{Verify Breach}
    D -->|5. Confirmed| E[register_incident_and_payout]
    E -->|6. Call Contract| F[SLA Bond Contract]
    F -->|7. Transfer Tokens| G[Affected Users]
    E -->|8. Post Event| H[Edenlayer]
```

---

## Technology Mapping

### Nullshot Integration

| Component | Nullshot Usage |
|-----------|----------------|
| Probe Agent | Built with Nullshot TypeScript Agent Framework |
| Reliability Agent | Built with Nullshot TypeScript Agent Framework |
| MCP Server | Implements MCP protocol specification |
| Tool Definitions | Standard MCP tool schema |

### Thirdweb Integration

| Feature | Thirdweb Usage |
|---------|----------------|
| Contract Deployment | Thirdweb deploy CLI |
| Contract Interaction | Thirdweb SDK |
| Wallet Connection | Thirdweb React hooks |
| Chain Support | Base Sepolia testnet |

### Edenlayer Integration

| Feature | Edenlayer Usage |
|---------|-----------------|
| Event Publishing | POST reliability events |
| Agent Discovery | Query by reliability scores |
| Trust Records | Reliability Passports |

---

## Scaling Considerations

### Current (Demo)
- In-memory storage
- Single probe agent
- Single reliability agent

### Production Ready
- Cloudflare KV for persistence
- Multiple probe agents (geographic distribution)
- Reliability agent redundancy
- Rate limiting and circuit breakers
- Event sourcing for audit trail

---

## Security Model

### Agent Authorization
- Agent executor address whitelisted in contract
- Private key secured via environment variables
- Thirdweb secret key for SDK auth

### Payout Safety
- Maximum 10% payout per incident
- Incident ID prevents double payouts
- Only covered users receive payouts
- Breach must exceed threshold duration

### Data Integrity
- Probe results timestamped
- Rolling metrics prevent gaming
- Multiple probes required for breach

---

## API Reference

See the MCP server source code for detailed API documentation:

- [packages/mcp-reliabond/src/tools/](../packages/mcp-reliabond/src/tools/)

---

## Deployment

### Cloudflare Workers
```bash
cd packages/mcp-reliabond
wrangler deploy
```

### Smart Contract
```bash
cd packages/contracts
pnpm deploy:testnet
```

### Frontend
```bash
cd apps/web
pnpm build
# Deploy to Vercel/Netlify
```

---

*Architecture document for Nullshot Hacks Season 0 - Track 1a*
