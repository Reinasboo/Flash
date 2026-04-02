# Production-Ready Agentic Wallet Platform - Complete System Prompt

## VISION & REQUIREMENTS

You are tasked with building a **production-grade Agentic Wallet Platform on Stellar (XLM)** with the following non-negotiable constraints:

### Core Security Model
1. **Private Keys Never Leave Wallet Layer** - This is architectural enforcement, not a guideline. Only the WalletManager class touches encrypted private keys.
2. **Agents Are Pure Decision-Makers** - They propose intents (financial actions) without access to signing capability. Zero cryptographic authority.
3. **Intent-Based Execution** - Agents think, validate, execute flow separated into distinct layers.
4. **Encryption at Rest** - All private keys encrypted with AES-256-GCM + scrypt key derivation.
5. **Audit Trail** - Every action logged without exposing secrets. Zero secret leakage in logs or API responses.

### Technology Stack
- **Blockchain**: Stellar (XLM) with Stellar SDK (JavaScript)
- **Backend**: Node.js 18+, Express.js, TypeScript 5.3+, Zod validation
- **Frontend**: Next.js 14, React 18, TailwindCSS, TanStack Query, Zustand
- **Database**: PostgreSQL (Phase 2), currently file-based for MVP
- **Deployment**: Docker, Kubernetes-ready, HTTPS, monitoring

### Design System (Constellation Blue Glassmorphism)
- Primary Colors: Orion Blue (#0D1B4D), Pegasus Cyan (#00D9FF), Sirius Purple (#7C3AED)
- Components: All glass cards with backdrop-blur(20px), cyan borders (rgba 0.2 opacity)
- Animations: 0.2-0.4s smooth transitions, glow effects on hover/active
- Dark mode primary (light mode secondary), responsive mobile-first
- WCAG AA accessibility compliance with 4.5:1 contrast minimum

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                  │
│  Pages: Dashboard, Agents, Agent Detail, BYOA, Transactions │
│  Components: Glass cards, status badges, charts, forms      │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST (Port 3000)
┌──────────────────────▼──────────────────────────────────────┐
│                   EXPRESS API SERVER                        │
│  ├── GET  /health                                          │
│  ├── POST /agents (create with encrypted wallet)           │
│  ├── GET  /agents, /agents/:id                             │
│  ├── POST /agents/:id/start, /agents/:id/stop              │
│  ├── POST /byoa/register, /byoa/intents                    │
│  └── GET  /stats, /transactions                            │
└──────────────────────┬──────────────────────────────────────┘
                       │ Coordinates agents
┌──────────────────────▼──────────────────────────────────────┐
│                    ORCHESTRATOR                             │
│  ├── Executes agent think() → intent validation            │
│  ├── Queries read-only account state (no key access)       │
│  ├── Routes valid intents to wallet.signTransaction()      │
│  ├── Submits signed txs to Stellar                         │
│  └── Emits events for frontend polling                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   ┌────▼────┐    ┌────▼────┐    ┌───▼──────┐
   │ Wallet  │    │ Stellar │    │  Agents  │
   │ Manager │    │ Client  │    │ (Think)  │
   │(Sign)   │    │(Build)  │    │          │
   └─────────┘    └─────────┘    └──────────┘
        │              │              │
        └──────────────┼──────────────┘
                       │ 
            ┌──────────▼──────────┐
            │  Stellar Network    │
            │  (Testnet/Mainnet)  │
            └─────────────────────┘
```

---

## BACKEND IMPLEMENTATION CHECKLIST

### 1. Type Definitions (`backend/src/types/index.ts`)
```typescript
// Core types
interface Intent {
  type: 'TRANSFER_XLM' | 'CREATE_TRUSTLINE' | 'MANAGE_OFFER';
  params: Record<string, any>;
}

interface AgentContext {
  agentId: string;
  publicKey: string;
  balances: { native: string; [asset: string]: string };
  sequence: bigint;
  lastExecution: Date;
}

interface EncryptedKeypair {
  publicKey: string;
  encryptedSecretKey: string;
  salt: string;
  iv: string;
  authTag: string;
}

interface ExecutionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  timestamp: Date;
}
```

### 2. Wallet Layer (`backend/src/wallet/WalletManager.ts`)
**CRITICAL: Only class that ever decrypts private keys**

```typescript
class WalletManager {
  // Encrypt keypair with AES-256-GCM + scrypt
  async encryptKeypair(publicKey: string, secretKey: string): Promise<EncryptedKeypair>
  
  // ONLY method accessing decrypted key - called during signing only
  async signTransaction(agentId: string, envelope: string, networkPassphrase: string): Promise<string>
    // 1. Load encrypted keypair from storage
    // 2. Decrypt with scrypt + AES-256-GCM
    // 3. Sign transaction
    // 4. Clear keypair from memory immediately
    // 5. Return signed envelope (never return raw key)
  
  // Validation only - no key access
  async validateKeypair(publicKey: string, secretKey: string): boolean
}
```

### 3. Stellar Client (`backend/src/stellar/StellarClient.ts`)
**Handles Horizon API, sequence numbers, transaction building/submission**

```typescript
class StellarClient {
  // Build payment transaction (unsigned)
  async buildPaymentTransaction(
    sourceAccount: Account,
    destination: string,
    amount: string,
    asset: Asset,
    memo?: string
  ): Promise<string> // Returns XDR

  // Handle Stellar's strict sequence numbers
  async submitWithSequenceHandling(
    publicKey: string,
    txBuilder: (sequence: bigint) => Transaction,
    maxRetries: number = 3
  ): Promise<{ success: boolean; txHash?: string }>

  // Read-only queries for agent context
  async getAccountState(publicKey: string): Promise<AgentContext>
  async getBalance(publicKey: string): Promise<{ native: string; assets: Record<string, string> }>
}
```

### 4. Agent System (`backend/src/agent/`)

**BaseAgent.ts - Abstract base**
```typescript
abstract class BaseAgent {
  abstract think(context: AgentContext): Promise<Intent[]>;
  
  // Safe helpers - no key access possible
  protected proposeTransferXLM(destination: string, amount: string): Intent
  protected proposeCreateTrustline(assetCode: string, issuer: string): Intent
  
  // NOT available - enforced by class design
  // getSecretKey() ❌
  // signTransaction() ❌
}
```

**AccumulatorAgent.ts** - Maintains target XLM balance
- Monitors balance vs min/max thresholds
- Sweeps excess to vault when above max
- Config: { vaultAddress, targetMinimum, targetMaximum, sweepThreshold }

**DistributorAgent.ts** - Sends regular payments
- Distributes to list of recipients
- Validates min balance maintained
- Config: { payments: [{address, amount, memo}], frequency, minRequired }

### 5. Orchestrator (`backend/src/orchestrator/Orchestrator.ts`)
**Execution loop - validates intents, signs, submits**

```typescript
class Orchestrator {
  async executeLoop(intervalMs: number) {
    while (running) {
      // 1. Build read-only context
      const context = await buildContext(agentId);
      
      // 2. Call agent (no key access)
      const intents = await agent.think(context);
      
      // 3. Validate intents (can check balances without keys)
      for (const intent of intents) {
        const validation = validateIntent(intent, context);
        if (!validation.valid) {
          emit('intent-rejected', { intent, reason: validation.reason });
          continue;
        }
        
        // 4. Execute (sign + submit)
        const result = await walletManager.signTransaction(
          agentId,
          txEnvelope,
          networkPassphrase
        );
        
        // 5. Emit event for frontend
        emit('intent-executed', { txHash: result });
      }
      
      await sleep(intervalMs);
    }
  }
}
```

### 6. Express API (`backend/src/api/server.ts`)

**Required Endpoints (all Zod-validated)**
```typescript
// Health check
GET /health
  Response: { success: true, status: 'healthy', uptime: number }

// Create agent with encrypted wallet
POST /agents
  Body: {
    name: string;
    type: 'accumulator' | 'distributor';
    config: { ... }; // Type-specific config
  }
  Response: {
    agentId: string;
    publicKey: string;
    status: 'created';
  }

// List/get agents
GET /agents
GET /agents/:id
  Response: { id, name, type, publicKey, status, balance, config }

// Control agents
POST /agents/:id/start
POST /agents/:id/stop
  Response: { success: true, status: 'running|stopped' }

// BYOA (Bring Your Own Agent)
POST /byoa/register
  Body: { name: string; description: string; webhookUrl?: string }
  Response: {
    agentId: string;
    wallet: string;
    controlToken: string; // Save securely - not returned again
  }

POST /byoa/intents
  Headers: { 'x-agent-id': string; 'x-control-token-hash': string }
  Body: [{ type, params }]
  Response: { success: true; intents_accepted: number }
```

### 7. Environment Configuration
```bash
# backend/.env.example
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
HORIZON_API_URL=https://horizon-testnet.stellar.org
WALLET_ENCRYPTION_PASSWORD=your-strong-password-min-8-chars
PORT=3001
NODE_ENV=development
AGENT_EXECUTION_INTERVAL=30000 # ms between agent runs
RATE_LIMIT_BYOA=1000 # requests per hour
```

---

## FRONTEND IMPLEMENTATION CHECKLIST

### Design: Constellation Blue Glassmorphism
- **Colors**: Orion Blue #0D1B4D, Pegasus Cyan #00D9FF, Sirius Purple #7C3AED
- **Glass Effect**: `backdrop-filter: blur(20px)`, `rgba(30, 58, 95, 0.4)` background
- **Borders**: `1px solid rgba(0, 217, 255, 0.2)`
- **Typography**: Inter font, H1-H4 hierarchy with text shadows
- **Animations**: All 0.2-0.4s ease transitions, glow on hover

### Pages (Next.js App Router)

#### 1. Dashboard (`app/page.tsx`)
- Hero stats: Total Agents, Active Now, Transactions Today
- Agent overview grid (3 columns, responsive)
- Activity timeline (last 10 transactions)
- Quick action buttons
- Network status footer

#### 2. Agents List (`app/agents/page.tsx`)
- Filter bar: Status, Type, Sort
- Grid of agent cards (2-4 columns responsive)
- Each card: name, type, balance, status badge, control buttons
- Empty state with icon + setup guide

#### 3. Agent Detail (`app/agents/[id]/page.tsx`)
- Sidebar: Agent info, status, quick stats
- Tabs: Live View, Settings, Transaction History, Activity Log
- Hero balance card with sparkline
- Live execution monitor (steps: thinking → validating → executing → done)
- Configuration summary cards
- Recent transactions list

#### 4. Create Agent (`app/agents/create/page.tsx`)
- Multi-step form (2-3 steps)
- Step 1: Basic info (name, type)
- Step 2: Wallet config (type-specific fields with validation)
- Step 3: Execution settings + review
- Loading state during wallet creation
- Success screen with next steps

#### 5. BYOA (`app/byoa/page.tsx`)
- Tabs: My External Agents, Integration Guide, API Credentials
- Register form modal
- Display: Agent ID, Wallet, Control Token (hidden, show/hide toggle)
- Code examples for API integration
- API key management + rate limit display

#### 6. Transactions (`app/transactions/page.tsx`)
- Search + filter bar (date range, type, status, agent)
- Timeline view (grouped by date) or chart view
- Each tx: icon, details, amount, status badge
- Summary stats: Total sent, received, fees, recipients
- Export CSV button

### Component Library

**Core Glass Components**:
- `GlassCard`: Standard card with blur + cyan border
- `GlassButton`: Teal glass button with glow hover
- `GlassInput`: Dark input with cyan focus glow
- `GlassBadge`: Status badge (active/idle/warning/pending)
- `StatusBadge`: Animated badge with pulsing glow for running agents

**Layout Components**:
- `TopNav`: Sticky header with logo, nav links, notifications, settings
- `MobileNav`: Bottom tab bar for mobile (home, agents, txs, byoa, menu)

**Domain Components**:
- `AgentCard`: Full agent overview card with stats and controls
- `AgentDetailPanel`: Sidebar with agent info
- `LiveExecutionMonitor`: Shows agent state transitions
- `BalanceDisplay`: Hero card with large XLM value + sparkline
- `TransactionListItem`: Single tx in timeline

### API Integration (`lib/api.ts`)
```typescript
interface ApiClient {
  getHealth(): Promise<{ status: string }>
  getStats(): Promise<{ totalAgents: number; activeCount: number; ... }>
  listAgents(): Promise<Agent[]>
  getAgent(id: string): Promise<Agent>
  createAgent(config): Promise<{ agentId: string; publicKey: string }>
  startAgent(id: string): Promise<void>
  stopAgent(id: string): Promise<void>
  registerBYOAAgent(name, description, webhookUrl?): Promise<{ agentId, token, ... }>
  submitBYOAIntent(agentId, token, intents): Promise<{ accepted: number }>
  listTransactions(filters?): Promise<Transaction[]>
}
```

### Styling
- **Tailwind Config**: Custom constellation colors, glass blur, shadows
- **Global CSS**: Button/input/badge base styles, keyframe animations
- **Responsive**: Mobile <640px single column, tablet 640-1024px 2-col, desktop >1024px 3-col

---

## TESTING & VALIDATION

### Unit Tests (Vitest)
- WalletManager: encryption/decryption, key isolation
- StellarClient: transaction building, sequence handling
- Orchestrator: intent validation, execution flow
- Agents: think() output validation

### Integration Tests
- Agent creation → fund wallet → execute → verify balance change
- BYOA registration → intent submission → execution
- Multi-agent coordination (sequence safety)
- Error scenarios (insufficient balance, invalid address)

### Manual Testing Checklist
1. Create accumulator agent → sweep excess XLM to vault
2. Create distributor → send payments to recipients
3. Register external agent (BYOA) → submit intents
4. Verify no secrets in logs, API responses, or browser storage
5. Check UI on mobile, tablet, desktop
6. Verify real-time updates via TanStack Query

---

## DEPLOYMENT

### Docker
```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3001
CMD ["node", "dist/index.js"]

# Frontend Dockerfile  
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
EXPOSE 3000
CMD ["npm", "run", "start"]
```

### The Twelve-Factor App
1. Store all secrets in environment variables (never in code)
2. Stateless API servers (agent state in database Phase 2)
3. Health check endpoint for orchestration
4. Logs to stdout, structured JSON format
5. Separate build, release, run stages

### Monitoring & Observability
- Pino JSON logging (structure: timestamp, level, service, message, context)
- Prometheus metrics: agent_executions_total, transaction_submissions, errors
- Stellar transaction confirmation tracking
- API response times per endpoint

---

## SECURITY CHECKLIST

### Key Management
- ✅ Keys encrypted at rest (AES-256-GCM)
- ✅ Scrypt KDF: N=16384, r=8, p=1, dklen=32
- ✅ Unique salt per agent, random IV per encryption
- ✅ Keys cleared from memory immediately after signing
- ✅ Never logged, never in API responses, never in error messages

### Input Validation
- ✅ All API inputs validated with Zod
- ✅ Stellar public key format verified
- ✅ XLM amounts are positive floats
- ✅ Intent params match type schema
- ✅ Rate limiting on BYOA endpoints

### API Security
- ✅ CORS configured (frontend origin only)
- ✅ No sensitive headers exposed
- ✅ 404 on non-existent agents (no info leakage)
- ✅ Control token hashing for BYOA
- ✅ TLS/HTTPS in production

### Agent Isolation
- ✅ Each agent has isolated keypair
- ✅ Agents can't access other agents' keys
- ✅ BYOA agents can't escalate privileges
- ✅ Rate limiting per external agent

---

## Stellar-Specific Adaptations (Not a Solana Port)

### Differences from Solana
| Aspect | Solana | Stellar |
|--------|--------|---------|
| **Account Model** | Program-based | Account-based |
| **Transactions** | Instructions | Operations |
| **Ordering** | Concurrent | Strict sequence numbers |
| **Fees** | Dynamic, network-dependent | Fixed: 100 stroops/op |
| **Time Locks** | Programmable | Unix timestamp bounds |
| **Native Assets** | All programs | XLM only, rest are trust lines |

### Implementation Changes
1. **No Soroban**: Early-stage, use agent strategies instead
2. **Sequence Numbers**: Each account has strict linear sequence—one wallet per agent recommended
3. **Trust Lines**: Agents must create trust lines before holding non-XLM assets
4. **Fees**: Always 100 stroops × operation count (negligible on mainnet)
5. **Memo**: Optional, 28 bytes max, use for referential integrity

---

## Phase 2 Roadmap (Not in MVP)

- **Database**: PostgreSQL for agent state, audit logs, transaction cache
- **Soroban Integration**: Custom smart contracts for complex logic
- **DEX Support**: Trade on Soroswap, Phoenix, Aqua
- **Multi-sig Agents**: Cosigner coordination with Stellar sponsorships
- **x402 Payment Protocol**: Monetize external agents
- **Analytics Dashboard**: Advanced metrics, agent performance tracking
- **Custom Agent Marketplace**: Share strategies with community

---

## Success Criteria

1. ✅ Create agents without exposing private keys
2. ✅ Run agents autonomously, executing intents every N seconds
3. ✅ Agents sweep XLM and distribute payments as configured
4. ✅ External agents can submit intents via secured API
5. ✅ Frontend shows real-time agent status and transaction history
6. ✅ Zero secrets in logs, API responses, or browser console
7. ✅ Full response in under 3 seconds (API calls)
8. ✅ UI responsive on mobile, tablet, desktop
9. ✅ Constellation blue glassmorphism design throughout
10. ✅ Complete documentation (architecture, API, testing, deployment)

---

## Implementation Notes for AI

- **Start with types** - Define all interfaces first for type safety
- **Encrypt keys before storing** - Never serialize raw secrets
- **Validate everything** - Use Zod for API inputs, strict TypeScript
- **Test agent isolation** - Ensure agents can't access each other's keys
- **Document endpoints** - Every API route needs clear request/response examples
- **Mobile-first CSS** - Build responsive from smallest breakpoint up
- **Accessibility first** - WCAG AA contrast, keyboard nav, semantic HTML
- **Error messages** - Generic for security (don't leak agent IDs or addresses)
- **Rate limiting** - Protect BYOA endpoints from abuse
- **Monitoring hooks** - Emit events for all critical operations

---

## Quick Start After Implementation

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with testnet settings + encryption password
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev

# Browser: http://localhost:3000
# API: http://localhost:3001
```

**Fund test wallets via**: https://friendbot.stellar.org
**Monitor on**: https://stellar.expert/explorer/testnet

---

**This prompt produces a production-grade, security-hardened agentic wallet platform with strict key isolation, intent-based execution, and a premium glassmorphism UI. All requirements are non-negotiable. No shortcuts on security.**
