# Agentic Wallet Platform on Stellar

A production-grade **autonomous agent wallet system** built natively for Stellar (XLM), enabling AI agents to control wallets securely through an **intent-based execution model**—without ever accessing private keys.

## Overview

This platform allows:
- **Autonomous AI agents** to make financial decisions and execute transactions
- **Secure key management** with encrypted at-rest storage and signing-only access
- **Intent-based control** (agents propose, wallet layer disposes)
- **Multi-agent orchestration** with independent wallets and strategies
- **BYOA (Bring Your Own Agent)** integration for external agents
- **Real-time dashboard** for monitoring agents, balances, and transaction history
- **x402 payment protocol** support for agent-to-service payments

## Key Principles

✅ **Agents NEVER access private keys**
✅ **Agents NEVER construct raw transactions**
✅ **Wallet layer is the only signer**
✅ **Intent-based, not transaction-based control**
✅ **Full observability and audit trails**
✅ **Strict separation of concerns**

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Dashboard                    │
│               (Next.js - Read-only views)                │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                   Express API Layer                      │
│      (REST endpoints, validation, orchestration)         │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    ┌───▼────┐  ┌─────▼─────┐  ┌────▼──────┐
    │ Agent  │  │ BYOA Mgmt │  │Orchestrator
    │ Layer  │  │           │  │
    └────────┘  └───────────┘  └────┬───────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
              ┌─────▼────┐   ┌───────▼────┐   ┌─────▼──────┐
              │  Wallet  │   │  Agent Mgr │   │  Scheduler │
              │  Layer   │   │   (Orchest)│   │            │
              └─────┬────┘   └────────────┘   └────────────┘
                    │
            ┌───────▼────────┐
            │ Stellar Client │
            │ (Horizon + SDK)│
            └────────────────┘
                    │
            ┌───────▼────────┐
            │ Stellar Network│
            │    (Testnet)   │
            └────────────────┘
```

## For Autonomous AI Agents

This platform is designed specifically for **autonomous agents** (like OpenClaw, Claude, GPT, and custom LLM systems) to:

✅ **Create and own Stellar wallets** - Generate secure keypairs with AES-256 encryption  
✅ **Submit financial intents** - Propose transfers, swaps, and blockchain operations  
✅ **Execute transactions autonomously** - Have intents validated and auto-executed  
✅ **Receive webhooks** - Get real-time notifications of execution results  
✅ **Track transaction history** - Full audit trail for transparency  

### Agent Documentation

| Document | Purpose |
|----------|---------|
| [AGENT_QUICK_START.md](docs/AGENT_QUICK_START.md) | 📖 1-minute overview + code snippets |
| [AUTONOMOUS_AGENT_GUIDE.md](docs/AUTONOMOUS_AGENT_GUIDE.md) | 📚 Complete integration guide (Python & JS) |
| [AGENT_PLATFORMS_GUIDE.md](docs/AGENT_PLATFORMS_GUIDE.md) | 🎯 Positioning for OpenClaw, Claude, GPT, etc. |

**Quick Start**:
```bash
# 1. Register agent → get wallet
curl -X POST http://localhost:3001/byoa/register \
  -d '{"name":"My Agent","webhookUrl":"https://..."}'

# 2. Fund wallet (send 10+ XLM)

# 3. Submit intents
curl -X POST http://localhost:3001/byoa/agents/{ID}/intents \
  -H "X-Agent-ID: {ID}" \
  -H "X-Control-Token-Hash: {SHA256(token)}" \
  -d '{"intents":[{"type":"TRANSFER_XLM","params":{...}}]}'

# 4. Listen for webhooks
# Platform notifies when intent executes
```

```bash
# Example: Register an autonomous agent
curl -X POST http://localhost:3001/byoa/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Claude Trading Bot",
    "description": "AI agent for Stellar arbitrage",
    "webhookUrl": "https://your-system.com/webhooks",
    "webhookSecret": "secret-key-32-chars-minimum"
  }'
```

Response includes:
- 🔑 **Agent ID** - Unique identifier  
- 💰 **Public Key** - Stellar wallet address  
- 🔐 **Control Token** - For authenticated requests  

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Stellar testnet account (funded via Friendbot)

### Environment Setup

```bash
# Clone or navigate to project
cd c:\Users\Admin\FLASH

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update with your configuration:
# - STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
# - HORIZON_API_URL=https://horizon-testnet.stellar.org
# - AGENT_KEY_ENCRYPTION_PASSWORD=your-secure-password
```

### Running the System

```bash
# Terminal 1: Start backend server
npm run dev:backend

# Terminal 2: Start frontend
npm run dev:frontend

# Terminal 3: Run an agent
npm run dev:agent
```

Dashboard available at: **http://localhost:3000**

## System Components

### 1. **Wallet Layer**
Handles all key management and signing. Secret keys never leave this module.
- AES-256-GCM encryption at rest
- scrypt key derivation
- In-memory encrypted storage
- Transaction signing only

### 2. **Agent Layer**
AI agents that propose financial intents. Zero access to keys or transaction construction.
- `BaseAgent` abstraction
- `think(context)` → decision
- Built-in strategies: Accumulator, Distributor
- BYOA support for external agents

### 3. **Stellar Client Layer**
Abstraction over Stellar SDK and Horizon API.
- Account balance queries
- Transaction building (payments, trust lines, etc.)
- Submission via Horizon
- Sequence number management
- Retry logic and error classification

### 4. **Orchestrator**
Coordinates agent execution, state management, and transaction flow.
- Agent lifecycle management
- Read-only context building
- Intent validation and execution
- Event emission
- Sequence conflict resolution

### 5. **BYOA Integration**
Allow external agents to submit intents securely.
- Agent registration
- Control tokens (hashed)
- Rate limiting
- Intent submission API
- Wallet binding (1:1)

### 6. **Express API**
RESTful endpoints for all system operations.
- Read endpoints: health, stats, agents, transactions, events
- Write endpoints: create agent, update config
- BYOA endpoints: register, submit intent, lifecycle

### 7. **Frontend Dashboard**
Real-time monitoring and configuration.
- Agent overview and details
- Balance display (XLM + assets)
- Transaction history
- Connected external agents
- WebSocket updates

## Development Guide

### Project Structure

```
FLASH/
├── backend/
│   ├── src/
│   │   ├── wallet/          # Key management & signing
│   │   ├── stellar/         # Stellar SDK client
│   │   ├── agent/           # Agent system
│   │   ├── orchestrator/     # Execution orchestration
│   │   ├── byoa/            # External agent integration
│   │   ├── api/             # Express server
│   │   └── types/           # TypeScript definitions
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Next.js pages
│   │   ├── hooks/           # Custom hooks
│   │   └── types/           # TypeScript definitions
│   ├── package.json
│   └── tsconfig.json
│
├── docs/
│   ├── ARCHITECTURE.md      # System design deep-dive
│   ├── STELLAR_DIFFERENCES.md
│   ├── SECURITY.md          # Key handling & threat model
│   ├── API.md               # API documentation
│   └── TESTING.md           # Test instructions
│
└── README.md
```

## Key Differences vs Solana

This system is **not** a Solana port. Critical adaptations for Stellar:

### Account Model
- **Solana**: Program-based with PDAs (Program Derived Accounts)
- **Stellar**: Account-based with direct operations
- **Impact**: No program-level access control; instead, agents submit intents to wallet layer

### Transaction Model
- **Solana**: Instructions in a transaction
- **Stellar**: Operations with sequence numbers, fees, and timebounds
- **Impact**: Sequence number management is critical; transactions are atomic per-account

### Key Management
- **Solana**: Keypairs sign Instructions
- **Stellar**: Keypairs sign transactions with clear signers/weights
- **Impact**: Can leverage multi-sig and sponsorships natively

### RPC & State
- **Solana**: Stateful programs; on-chain state mutations
- **Stellar**: Stateless operations; Ledger-based state
- **Impact**: Read-only context building is cleaner; less complex state reasoning

See [STELLAR_DIFFERENCES.md](docs/STELLAR_DIFFERENCES.md) for detailed analysis.

## Security Model

### Private Key Handling
- Keys encrypted with AES-256-GCM + scrypt derivation
- Decrypted only during signing operations
- Never logged, serialized, or exposed via API
- Cleared from memory immediately after signing

### Intent Validation
- Agents propose intents with constraints
- Wallet layer validates against account state
- Sequence numbers managed atomically
- Failed transactions logged with error classification

### BYOA Security
- External agents authenticated via hashed control tokens
- Rate limiting per agent
- Intent validation at API boundary
- No backend key exposure to external systems

See [SECURITY.md](docs/SECURITY.md) for threat model and mitigation strategies.

## x402 Integration (Optional)

This platform includes optional support for [x402](https://developers.stellar.org/docs/build/apps/x402)—a pay-per-request HTTP payment protocol for agents.

Agents can use x402 to:
- Pay per API request to protected services
- Use signature-based auth without HTTP headers
- Operate autonomously without operator intervention

See [x402 Quickstart](https://developers.stellar.org/docs/build/apps/x402/quickstart-guide) for setup.

## Testing

Full test suite covering:
- Wallet encryption/decryption
- Stellar transaction building
- Agent decision-making
- Orchestrator state management
- Intent validation
- BYOA registration and submission
- API endpoint validation

```bash
npm run test              # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

See [TESTING.md](docs/TESTING.md) for detailed test strategy.

## Production Checklist

- [ ] Key encryption password rotated
- [ ] Rate limiting configured per agent
- [ ] Logging in place (no secrets)
- [ ] Error handling validated
- [ ] Sequence number management tested
- [ ] BYOA tokens rotated
- [ ] Frontend deployed
- [ ] API deployed with auth
- [ ] Monitoring/alerting configured
- [ ] Disaster recovery tested

## Contributing

This is a reference implementation. Contributions welcome for:
- Additional agent strategies
- Protocol integrations (Soroswap, Blend, etc.)
- Performance optimizations
- Additional test coverage

## License

MIT

## Resources

- [Stellar Documentation](https://developers.stellar.org/)
- [Stellar SDK (JavaScript)](https://developers.stellar.org/docs/tools/sdks)
- [Horizon API](https://developers.stellar.org/docs/data/rpc/api-reference)
- [x402 Protocol](https://developers.stellar.org/docs/build/apps/x402)
- [Soroban Smart Contracts](https://developers.stellar.org/docs/build/smart-contracts)

## Questions?

Open an issue or refer to the documentation in `/docs`.
