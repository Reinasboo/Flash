# System Architecture: Agentic Wallet Platform on Stellar

## Layered Architecture Overview

This platform implements **strict separation of concerns** across six layers:

```
┌─────────────────────────────────────────────────────────┐
│                    Layer 6: Frontend                     │
│          (Dashboard, read-only, WebSocket updates)       │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/WS
┌────────────────────────▼────────────────────────────────┐
│                    Layer 5: API                          │
│      (Express, validation, orchestration, no secrets)    │
└────────────────────────┬────────────────────────────────┘
                         │ Function calls
    ┌────────────────────┼────────────────────┐
    │                    │                    │
┌───▼──────┐  ┌─────────▼──────┐   ┌────────▼────┐
│  Layer 3  │  │    Layer 4     │   │   Layer 2   │
│   Agent   │  │  Orchestrator  │   │   BYOA      │
│  (Decide) │  │  (Coordinate)  │   │  (External) │
└───┬──────┘  └─────────┬──────┘   └────────┬────┘
    │                   │                    │
    └───────────────────┼────────────────────┘
                        │ Intent execution
                 ┌──────▼────────┐
                 │   Layer 1a:   │
                 │   Wallet      │ (Key management, signing)
                 └──────┬────────┘
                        │ Transactions
                 ┌──────▼────────┐
                 │   Layer 1b:   │
                 │  Stellar      │ (SDK, Horizon, building)
                 │   Client      │
                 └──────┬────────┘
                        │
                   Stellar Network
```

---

## Layer 1a: Wallet Layer

**Responsibility**: Manage all cryptographic keys and transaction signing. SINGLE source of truth for private keys.

### Design Principles

1. **Keys Never Leave**: Secret keys are decrypted only for signing, then re-encrypted immediately.
2. **Encryption at Rest**: AES-256-GCM with scrypt-derived keys.
3. **No Exposure**: Keys never logged, serialized, or exposed via API.
4. **Atomic Operations**: Signing is atomic; partial exports impossible.

### Key Components

#### `WalletManager`
```typescript
class WalletManager {
  private encryptedKeys: Map<agentId, EncryptedKeypair>;
  private encryptionPassword: string;

  // Generate new keypair (never exposed)
  async createWallet(agentId: string): Promise<{ publicKey: string }>;

  // Sign transaction (only during execution)
  async signTransaction(
    agentId: string,
    transactionEnvelope: string
  ): Promise<{ signedTransaction: string }>;

  // Get public key only (safe to expose)
  async getPublicKey(agentId: string): Promise<string>;

  // Get balance (via client layer, not keys)
  async getBalance(agentId: string): Promise<BalanceInfo>;
}
```

#### Key Encryption
```typescript
// Derivation: scrypt(password, salt)
// Encryption: AES-256-GCM(derivedKey, keypair)
// Storage: { salt, iv, ciphertext, authTag }

interface EncryptedKeypair {
  salt: string;        // 32 bytes, hex
  iv: string;          // 12 bytes, hex
  ciphertext: string;  // encrypted keypair, hex
  authTag: string;     // GCM auth tag, hex
  publicKey: string;   // unencrypted (needed for accounts)
}
```

#### Security Guarantees

✅ Key material never serialized to JSON (except encrypted)
✅ In-memory keys cleared after signing
✅ No logging of decrypted keys
✅ Decryption requires wallet password
✅ Each wallet independently encrypted

---

## Layer 1b: Stellar Client

**Responsibility**: Abstraction over Stellar SDK and Horizon API. Handles transaction building, submission, and state queries.

### Key Components

#### `StellarClient`
```typescript
class StellarClient {
  // Queries (read-only)
  async getAccountInfo(publicKey: string): Promise<Account>;
  async getBalance(publicKey: string): Promise<BalanceInfo>;
  async getTransactionHistory(publicKey: string): Promise<Transaction[]>;
  async getAssetInfo(assetCode: string, issuer: string): Promise<Asset>;

  // Building (signs via wallet, doesn't build directly)
  async buildPaymentIntent(
    sourcePublicKey: string,
    destination: string,
    amount: string,
    asset: Asset
  ): Promise<TransactionIntent>;

  // Submit (wallet has already signed)
  async submitTransaction(
    signedEnvelope: string
  ): Promise<{ hash: string; result: SubmitResult }>;

  // State
  async getSequenceNumber(publicKey: string): Promise<bigint>;
}
```

#### Transaction Building Flow

```
Intent from Agent
       ↓
Client builds unsignedTx:
  - Source account (public key only)
  - Operations (payment, changeTrust, etc.)
  - Fee, timebounds
       ↓
Wallet signs (secret key involved HERE ONLY)
       ↓
Client submits signed envelope to Horizon
       ↓
Response logged (no secrets)
```

#### Sequence Number Management

Stellar requires strict sequence number ordering per account:
```typescript
// Problem: Concurrent requests need unique sequence numbers
// Solution: Optimistic locking with retry

async submitWithSequenceHandling(
  publicKey: string,
  txBuilder: (seq: bigint) => Transaction,
  maxRetries: 3
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const account = await getAccount(publicKey);
    const tx = txBuilder(account.sequence + 1n);
    
    try {
      const result = await submitTransaction(tx);
      return result;
    } catch (err) {
      if (isSequenceError(err)) {
        // Retry with latest sequence
        continue;
      }
      throw err;
    }
  }
}
```

#### Horizon Integration

```typescript
// All network calls go through Horizon
const horizonUrl = "https://horizon-testnet.stellar.org";
const server = new Horizon.Server(horizonUrl);

// Load account (includes current sequence)
const account = await server.loadAccount(publicKey);

// Submit transaction
const response = await server.submitTransaction(tx);

// Stream events (for WebSocket updates)
const eventStream = server
  .transactions()
  .forAccount(publicKey)
  .stream({ reconnect: true });
```

---

## Layer 2: BYOA (Bring Your Own Agent)

**Responsibility**: External agent registration, control token management, and intent submission.

### Design

External agents register once, receive a **control token**, then submit intents via API.

```typescript
// Registration flow
POST /byoa/register
{
  "name": "MyAgent",
  "publicKey": "GXXXXXX..."
}

Response:
{
  "agentId": "byoa_xxxxx",
  "controlToken": "ctr_xxxxx",  // Hash of secret token
  "walletAddress": "GXXXXXX..."  // Pre-created wallet
}

// External agent stores controlToken
// Uses it to submit intents
```

### Components

#### `BYOARegistry`
```typescript
class BYOARegistry {
  // Registration
  async registerAgent(
    name: string,
    publicKey: string
  ): Promise<{ agentId: string; controlToken: string; wallet: string }>;

  // Verification
  async verifyToken(agentId: string, controlTokenHash: string): Promise<boolean>;

  // Rate limiting
  async checkRateLimit(agentId: string): Promise<{ allowed: boolean; reset: Date }>;

  // Lifecycle
  async deactivateAgent(agentId: string): Promise<void>;
}
```

#### Intent Submission API

```typescript
POST /byoa/intents
HeaderX-Agent-ID: byoa_xxxxx
Headers-Control-Token: ctr_xxxxx

{
  "intent": {
    "type": "TRANSFER_XLM",
    "params": {
      "destination": "GXXXXXX...",
      "amount": "10.5",
      "memo": "Payment for service"
    }
  }
}

Response: { intentId, status: "pending", expiresAt }
```

### Security Model

✅ Control tokens hashed (never stored raw)
✅ Per-agent rate limiting (e.g., 10 intents/minute)
✅ Intent validation at API boundary
✅ No backend key exposure to external agents
✅ Wallet binding is 1:1 (one external agent → one wallet)
✅ Audit log of all external intents

---

## Layer 3: Agent System

**Responsibility**: AI agents make financial decisions through `think()` function. Produce intents, never sign.

### Design Principles

1. **No Key Access**: Agents never see private keys
2. **No Transaction Building**: Agents propose intents, not transactions
3. **Context-Only Input**: Agents receive read-only financial context
4. **Deterministic Output**: Intents are unambiguous and validated

### Base Agent

```typescript
abstract class BaseAgent {
  agentId: string;
  name: string;
  config: AgentConfig;

  /**
   * Called every orchestration cycle.
   * Returns a list of intents to execute, or empty if no action needed.
   */ 
  abstract think(context: AgentContext): Promise<Intent[]>;

  // Helpers for decision-making (read-only)
  protected async getContext(): Promise<AgentContext>;
  protected proposeIntent(type: string, params: any): Intent;
}
```

### Agent Context

```typescript
interface AgentContext {
  // Account state
  publicKey: string;
  balances: {
    native: string;  // XLM amount
    assets: Array<{ code: string; issuer: string; balance: string }>;
  };

  // Recent transactions (audit trail)
  recentTransactions: Transaction[];

  // Time
  ledgerTime: number;
  ledgerSequence: number;

  // Config (strategy parameters)
  config: AgentConfig;
}
```

### Intent Model

```typescript
interface Intent {
  type: 
    | "REQUEST_AIRDROP"      // Friendbot (testnet only)
    | "TRANSFER_XLM"         // Native payment
    | "TRANSFER_ASSET"       // Non-native asset payment
    | "CREATE_TRUST_LINE"    // Allow asset reception
    | "CHECK_BALANCE"        // Read-only query
    | "CUSTOM";              // For extensions

  params: Record<string, any>;
  constraints?: {
    maxFee?: number;
    minBalance?: string;
    memo?: string;
  };
}
```

### Built-in Strategies

#### Accumulator Agent
Maintains a target XLM balance by sweeping excess to a vault.

```typescript
class AccumulatorAgent extends BaseAgent {
  async think(context: AgentContext): Promise<Intent[]> {
    const { balances, config } = context;
    const currentXLM = parseFloat(balances.native);
    const targetMin = config.params.targetMinimum || 50;
    const targetMax = config.params.targetMaximum || 100;

    if (currentXLM > targetMax) {
      // Sweep excess
      const excess = currentXLM - targetMin;
      return [
        {
          type: "TRANSFER_XLM",
          params: {
            destination: config.params.vaultAddress,
            amount: excess.toString(),
          }
        }
      ];
    }

    return []; // No action needed
  }
}
```

#### Distributor Agent
Sends regular payments to configured recipients.

```typescript
class DistributorAgent extends BaseAgent {
  async think(context: AgentContext): Promise<Intent[]> {
    const { balances, config } = context;
    const currentXLM = parseFloat(balances.native);
    const minBalance = config.params.minRequired || 10;

    if (currentXLM < minBalance) {
      return []; // Insufficient balance
    }

    const intents: Intent[] = [];
    for (const payment of config.params.payments) {
      intents.push({
        type: "TRANSFER_XLM",
        params: {
          destination: payment.address,
          amount: payment.amount,
          memo: payment.memo,
        }
      });
    }

    return intents;
  }
}
```

---

## Layer 4: Orchestrator

**Responsibility**: Coordinate agent execution, intent validation, and transaction flow.

### Design

```
Create Agent ↓
      ↓Wallet Layer
      ↓
┌─────────────────────┐
│  Orchestrator Loop  │ (repeating)
├─────────────────────┤
│ 1. Get context      │
│    (balances, tx)   │
├─────────────────────┤
│ 2. Call agent.think │
│    → intents[]      │
├─────────────────────┤
│ 3. Validate intents │
│    against state    │
├─────────────────────┤
│ 4. Execute intents  │
│    (build, sign,    │
│     submit)         │
├─────────────────────┤
│ 5. Emit events      │
│    (for frontend)   │
├─────────────────────┤
│ Sleep (interval)    │
└─────────────────────┘
```

### Core Components

#### `Orchestrator`
```typescript
class Orchestrator {
  private agentId: string;
  private agent: BaseAgent;
  private wallet: WalletManager;
  private client: StellarClient;
  private state: OrchestratorState;
  private eventEmitter: EventEmitter;

  async start(intervalMs: number = 30000): Promise<void>;
  async stop(): Promise<void>;
  async executeIntent(intent: Intent): Promise<ExecutionResult>;

  private async buildContext(): Promise<AgentContext>;
  private async validateIntent(intent: Intent): Promise<ValidationResult>;
  private async executeIntentAsTransaction(intent: Intent): Promise<string>;
}
```

#### Orchestrator State

```typescript
interface OrchestratorState {
  isRunning: boolean;
  lastExecution: {
    timestamp: number;
    intents: Intent[];
    results: ExecutionResult[];
  };
  pendingIntents: Intent[];
  executionHistory: ExecutionResult[];
  errorCount: number;
  lastError?: Error;
}
```

#### Intent Validation

```typescript
async validateIntent(intent: Intent): Promise<ValidationResult> {
  const context = await this.buildContext();

  switch (intent.type) {
    case "TRANSFER_XLM": {
      const amount = parseFloat(intent.params.amount);
      const fee = 0.00001; // Stellar base fee
      const totalNeeded = amount + fee;
      const available = parseFloat(context.balances.native);

      if (available < totalNeeded) {
        return { valid: false, reason: "Insufficient balance" };
      }
      break;
    }

    case "TRANSFER_ASSET": {
      const { assetCode, issuer, amount } = intent.params;
      const asset = context.balances.assets.find(
        a => a.code === assetCode && a.issuer === issuer
      );

      if (!asset) {
        return { valid: false, reason: "Asset not found or no trust line" };
      }

      if (parseFloat(asset.balance) < parseFloat(amount)) {
        return { valid: false, reason: "Insufficient asset balance" };
      }
      break;
    }
  }

  return { valid: true };
}
```

#### Execution Loop

```typescript
async executeLoop(intervalMs: number): Promise<void> {
  while (this.state.isRunning) {
    try {
      // 1. Build read-only context
      const context = await this.buildContext();

      // 2. Call agent
      const intents = await this.agent.think(context);

      // 3. Validate each intent
      const valid = [];
      for (const intent of intents) {
        const validation = await this.validateIntent(intent);
        if (validation.valid) {
          valid.push(intent);
        } else {
          this.emit("intent-rejected", { intent, reason: validation.reason });
        }
      }

      // 4. Execute valid intents
      const results = [];
      for (const intent of valid) {
        try {
          const txHash = await this.executeIntentAsTransaction(intent);
          results.push({ intent, status: "success", txHash });
          this.emit("intent-executed", { intent, txHash });
        } catch (err) {
          results.push({ intent, status: "failed", error: err.message });
          this.emit("intent-failed", { intent, error: err.message });
        }
      }

      // 5. Update state
      this.state.lastExecution = { timestamp: Date.now(), intents, results };

      this.emit("cycle-complete", this.state.lastExecution);

    } catch (err) {
      this.state.errorCount++;
      this.state.lastError = err;
      this.emit("cycle-error", err);
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}
```

---

## Layer 5: Express API

**Responsibility**: Expose system via REST endpoints. Validate all inputs. Never expose secrets.

### Endpoint Categories

#### Health & Stats
```
GET /health
  → { status: "healthy", uptime: ms, agents: count }

GET /stats
  → { totalValueLocked: string, transactionCount: number, ... }
```

#### Agent Management
```
GET /agents
  → [ { id, name, status, publicKey, balance, ... } ]

POST /agents
  → Create new agent + wallet

GET /agents/:id
  → { id, name, status, config, balance, recent transactions }

PATCH /agents/:id
  → Update agent config (strategy params, etc.)

POST /agents/:id/start
  → Start orchestrator loop

POST /agents/:id/stop
  → Stop orchestrator loop
```

#### Transactions & Events
```
GET /transactions
  → [ { hash, from, to, amount, timestamp, status } ]

GET /transactions/:hash
  → { hash, details, result }

GET /events
  → [ { type, timestamp, data } ]
```

#### BYOA Endpoints
```
POST /byoa/register
  → { agentId, controlToken, walletAddress }

POST /byoa/intents
  [Headers: X-Agent-ID, X-Control-Token]
  → { intentId, status, expiresAt }

GET /byoa/status/:agentId
  → { status, pendingIntents, rateLimit }
```

### Validation & Security

```typescript
// All requests validated with Zod
import { z } from "zod";

const transferIntentSchema = z.object({
  type: z.literal("TRANSFER_XLM"),
  params: z.object({
    destination: z.string().startsWith("G"),
    amount: z.string().regex(/^\d+(\.\d+)?$/),
    memo: z.string().optional(),
  }),
});

app.post("/byoa/intents", async (req, res) => {
  try {
    const { intent } = transferIntentSchema.parse(req.body);
    // Process
  } catch (err) {
    res.status(400).json({ error: "Invalid intent" });
  }
});
```

### Error Handling

No secrets in error responses:

```typescript
// ✅ Good
res.status(400).json({ error: "Invalid public key format" });

// ❌ Bad
res.status(400).json({ 
  error: `Failed to load account GXXXXX...`, 
  seed: "SBXXXXXX..." 
});
```

---

## Layer 6: Frontend Dashboard

**Responsibility**: Real-time monitoring and configuration. Read-only views only.

### Pages

1. **Dashboard**
   - Overview of all agents
   - Total balances (native + assets)
   - Recent transactions
   - System health

2. **Agents List**
   - All agents with status
   - Run/stop controls
   - Quick balance view
   - Edit config link

3. **Agent Detail**
   - Full agent config
   - Current context (balances, recent tx)
   - Update strategy parameters
   - Execution history (intents, results)
   - Events (real-time via WebSocket)

4. **Transactions**
   - Full transaction history
   - Filter by agent, status, type
   - Link to Stellar Expert (explorer)
   - Raw transaction details

5. **Manage BYOA**
   - List external agents
   - Register new agents
   - View pending intents
   - Deactivate agents

### Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: TanStack Query + Zustand
- **Real-time**: WebSocket (for event streaming)
- **Theme**: Claude-inspired (warm, minimal, high-quality spacing)

### WebSocket Integration

```typescript
// Backend
const ws = new WebSocket.Server({ port: 8080 });
ws.on("connection", (socket) => {
  orchestrator.on("cycle-complete", (data) => {
    socket.send(JSON.stringify({ type: "cycle", data }));
  });
});

// Frontend
useEffect(() => {
  const ws = new WebSocket("ws://localhost:8080");
  ws.onmessage = (event) => {
    const { type, data } = JSON.parse(event.data);
    if (type === "cycle") {
      updateLocalState(data);
    }
  };
}, []);
```

---

## Data Flow Example: Payment Intent

```
┌─────────────────────────────────────────────┐
│ User triggers: Send 10 XLM to Bob           │
│ (via GUI or external BYOA request)          │
└────────────────────┬────────────────────────┘
                     │
                ┌────▼────────────────────────────┐
                │ API: POST /agents/:id/intents   │
                │ or /byoa/intents                │
                └────┬─────────────────────────────┘
                     │ Validation (Zod)
                     ▼
            ┌────────────────────┐
            │ Orchestrator       │
            │ validateIntent()   │
            │ ✓ Sufficient XLM   │
            │ ✓ Valid address    │
            └────┬───────────────┘
                 │
                 ▼
    ┌─────────────────────────────────────────┐
    │ StellarClient.buildPayment()            │
    │ Creates unsigned transaction:           │
    │  - source: agent public key             │
    │  - destination: Bob's address           │
    │  - amount: 10 XLM                       │
    │  - fee: Stellar base fee                │
    │  - sequence: next from account          │
    └────┬────────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │ WalletManager.signTransaction()      │
    │ 1. Decrypt secret key (AES-256-GCM) │
    │ 2. Sign tx envelope                  │
    │ 3. Re-encrypt key immediately       │
    │ 4. Return signed envelope            │
    └────┬─────────────────────────────────┘
         │
         ▼
    ┌───────────────────────────────────────┐
    │ StellarClient.submitTransaction()     │
    │ POST to Horizon:                      │
    │ /transactions (with signed envelope)  │
    └────┬──────────────────────────────────┘
         │
         ▼
    ┌────────────────────┐
    │ Stellar Network    │
    │ (Testnet)          │
    │ Validates & applies│
    │ transaction        │
    └────┬───────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │ Response: { hash, result }           │
    │ Success: Bob receives 10 XLM         │
    │ Logged: { timestamp, hash, status }  │
    │ (NO KEYS LOGGED)                     │
    └──────────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────┐
    │ Frontend updates via WS       │
    │ New balance: 90 XLM           │
    │ New transaction entry         │
    │ Event: "intent-executed"      │
    └──────────────────────────────┘
```

---

## Stellar-Specific Considerations

### Sequence Numbers
- **Problem**: Each account has a sequence number; transactions must be in strict order.
- **Solution**: Optimistic locking with retry; load latest sequence from Ledger before each tx.

### Timebounds
- **Problem**: Transactions can expire if not submitted quickly.
- **Solution**: Set `minTime` (now) and `maxTime` (now + 5 minutes) on all transactions.

### Fees
- **Problem**: Stellar requires explicit fee (in stroops).
- **Solution**: Fixed base fee + per-operation multiplier. Default: 100 stroops per operation.

### Asset Trust Lines
- **Problem**: To hold non-native assets, account must have a trust line.
- **Solution**: Before any asset transfer, ensure trust line exists; orchestrator can auto-create on first use.

### Multi-sig & Sponsorships
- **Opportunity**: Stellar's native multi-sig and sponsorship model can enhance BYOA (sponsored external agents).
- **Not in MVP**: Reserved for Phase 2.

---

## Testing Strategy

### Unit Tests
- Wallet encryption/decryption
- Intent validation logic
- Agent decision-making
- Transaction building

### Integration Tests
- Full orchestrator loop
- API endpoint interactions
- BYOA registration and submission
- Stellar testnet transactions (if testnet available)

### End-to-End Tests
- Create agent
- Fund wallet (Friendbot)
- Execute payment intent
- Verify balance change
- Check transaction history

See [TESTING.md](TESTING.md) for detailed test plan.

---

## Conclusion

This architecture **preserves the intent-based, layered design** from the Solana version while adapting completely for Stellar's account and operation model. The strict separation of concerns ensures:

✅ Keys are never exposed
✅ Agents cannot construct raw transactions
✅ Wallet is the sole signer
✅ Full observability and audit trails
✅ Multi-agent orchestration works seamlessly
✅ BYOA integration is secure and scalable

The system is designed to scale from a single agent to dozens of concurrent agents, all managed by a single orchestrator loop, sharing a clean abstraction layer to Stellar's network.
