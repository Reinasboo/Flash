# Stellar vs Solana: Key Differences & Adaptations

When adapting an agentic wallet platform from **Solana to Stellar**, the architecture must fundamentally change to fit each blockchain's paradigm. This document explains the critical differences and how we've adapted.

---

## 1. Blockchain Paradigm

### Solana: Instruction-Based (Program Authority Model)

**Architecture:**
- Smart contracts are **programs** deployed on-chain
- Programs contain logic; they are the source of truth
- Transactions contain **instructions** (calls to programs)
- Instruction execution is **atomic per transaction**
- Programs can authorize signers and manage PDAs (Program Derived Accounts)

**Example Transaction:**
```
Instruction 1: Call Program A
Instruction 2: Call Program B (reads output of A)
Instruction 3: Call Program C (reads output of B)
```

**Key Implication for Agents:**
- Agents could theoretically construct instructions (bad) or call program-level auth checks
- We had to **enforce intent model to prevent direct instruction construction**
- Programs handle state mutations; agents see aggregate results

### Stellar: Operation-Based (Account Authority Model)

**Architecture:**
- **No programs** on base layer (native operations only)
- Transactions contain **operations** on accounts (payment, changeTrust, etc.)
- Each operation is **atomic**, but a transaction succeeds/fails as a whole
- Account signers control authority (multi-sig native)
- State is purely account balances and trust lines

**Example Transaction:**
```
Operation 1: Payment (sender→receiver, amount)
Operation 2: SetOptions (update account flags)
Operation 3: ManageBuyOffer (place DEX order)
```

**Impact on Agents:**
- **Agents cannot execute "operations" directly** → cleaner intent model naturally
- No program-level authority → simpler security model
- Operations are **passive** (no custom logic), so agents must work with what Stellar provides
- Intent model becomes the **only way** to execute (perfect enforcement)

**Verdict:** Stellar's design **naturally enforces** the intent model more strictly than Solana.

---

## 2. Transaction Model

### Solana

```typescript
// Transaction structure
{
  instructions: Instruction[],
  signers: Keypair[],
  recentBlockhash: string  // Proves recency (~2min window)
}

// Blockhash prevents duplicate txs in time window
// Duplicate tx submitted? Fails (same blockhash expired)
// Retry after blockhash expires? New one used
```

**Implications:**
- No explicit **sequencing**; relying on blockhash for ordering
- Multiple transactions can execute in **any order** (if different blockhashes)
- Parallel execution is possible; ordering is implicit
- For agents: Must handle **concurrent tx submission** carefully

### Stellar

```typescript
// Transaction structure
{
  sourceAccount: {
    accountId: string,
    sequence: bigint  // Next sequence number for this account
  },
  operations: Operation[],
  baseFee: number,  // Per operation
  timebounds: {
    minTime: number,  // Unix timestamp
    maxTime: number   // Expires after
  }
}

// Sequence number is EXPLICIT and REQUIRED
// Each tx increments account's sequence
// Submit tx with sequence N twice? Second fails (sequence mismatch)
```

**Implications:**
- **Strict ordering per account** (sequence number enforcement)
- Multiple agents on same account need **careful coordination**
- **Concurrent submissions to same account = sequence conflicts** (one will fail)
- **Timebounds** ensure tx expires if not submitted quickly

**Adaptation for Agents:**
- **One wallet per agent** (1:1 mapping) to avoid sequence conflicts
- Orchestrator uses **optimistic locking**: load sequence → build tx → submit → retry if conflict
- Each agent's sequence is deterministic; no race conditions between agents (due to 1:1 mapping)

---

## 3. Key Management & Authority

### Solana

```typescript
// Keypair signs all instructions
const keypair = Keypair.generate();
const instruction = new TransactionInstruction({
  keys: [
    { pubkey: keypair.publicKey, isSigner: true, isWritable: true }
  ],
  programId: PROGRAM_ID,
  data: Buffer.from([...])
});

// Signing
const tx = new Transaction().add(instruction);
tx.sign(keypair);
```

**Authority Model:**
- Signers are **explicit** in transaction
- Each instruction can check signer pubkeys
- Programs implement **custom authorization logic**
- Multi-sig via **custom program logic** (not native)

**Challenge for Agents:**
- Agents could potentially construct instructions with wrong signers
- Programs must validate signer authority
- We enforced intent validation at wallet layer

### Stellar

```typescript
// Account has native signers + weights
{
  id: "GXXXXX...",
  signers: [
    { key: "GXXXXX...", weight: 1 },  // Public key signer
    { key: "TXXXXX...", weight: 1 }   // Hash signer (for preauth tx)
  ]
}

// Signing (simpler)
const tx = new TransactionBuilder(sourceAccount)
  .addOperation(Operation.payment({ ... }))
  .build();

tx.sign(keypair);  // Keypair must be in account signers

// Multi-sig is NATIVE
// Require 2 of 3 signers? Set account's signersCount to 2
```

**Authority Model:**
- Signers are **account properties**, not instruction properties
- Native **multi-sig** and **thresholds**
- **Sponsorships** allow account A to sponsor account B's fee
- Simple, elegant, fewer custom checks needed

**Advantage for Agents:**
- Agents can NEVER construct transactions (no SDK methods for raw signing)
- Wallet layer is **clearly the only signer**
- Multi-sig can be leveraged for BYOA (external agents sponsored)

---

## 4. State Management

### Solana

```typescript
// Programs own accounts; accounts store data
// Account structure:
{
  owner: Pubkey,    // Which program controls this?
  lamports: u64,    // SOL balance
  data: Vec<u8>,    // Program-specific state
  executable: bool
}

// Programs mutate and own state
// Off-chain agents see final state via RPC
// But can't directly know WHAT changed
```

**For Agents:**
- Must query accounts to learn state
- State mutations are **implicit** in program logic
- Agents must understand program semantics
- Hard to reason about side effects

### Stellar

```typescript
// Accounts are simple ledger entries
{
  id: "GXXXXX...",
  balances: [
    { asset_type: "native", balance: "100.5" },
    { asset_type: "credit_alphanum4", code: "USD", issuer: "GXXXXX...", balance: "50.0" }
  ],
  num_sponsoring: 0,
  num_sponsored: 0,
  flags: 0
}

// State is purely balances + trust lines
// Operations modify state predictably
// Payment reduces sender balance, increases receiver balance (always)
```

**For Agents:**
- State is **simple and predictable**
- No custom program logic to reason about
- Agents can **easily predict outcome** of operations
- No need to understand custom state semantics

---

## 5. RPC & Querying

### Solana

```typescript
const connection = new Connection(RPC_URL, "confirmed");

// Get account
const accountInfo = await connection.getAccountInfo(pubkey);

// Get recent transactions
const signatures = await connection.getSignaturesForAddress(pubkey);

// Custom program data (must know format)
const state = await connection.getAccountInfo(programStateAccount);
const decoded = MyProgram.decode(state.data);
```

**Challenges:**
- Must know program state encoding to decode
- Rich but requires understanding contract ABI
- Good for reading state, not for simple queries

### Stellar (Horizon API)

```typescript
const server = new Server("https://horizon-testnet.stellar.org");

// Get account (full info)
const account = await server.loadAccount(pubkey);
const balances = account.balances;  // Easy to use!

// Stream transactions
const txStream = server
  .transactions()
  .forAccount(pubkey)
  .stream({ reconnect: true });

// Query operations
const ops = await server
  .operations()
  .forAccount(pubkey)
  .limit(10)
  .call();
```

**Advantages:**
- **REST API** (not binary RPC)
- **Human-readable JSON responses**
- **Built-in filtering** (by account, operation type, etc.)
- **Natural streaming** for real-time updates
- **Easy to query** without ABI knowledge

**For Agents:**
- Simple to fetch context (balances, recent tx)
- No custom decoding
- Natural fit for intent-based system

---

## 6. Fee Model

### Solana

```
// Per transaction
fee = prioritizationFee + baseFee

// baseFee = (number of signers * lamport/signature)
// prioritizationFee = optional (for faster inclusion)

// Typical cost: ~5,000 lamports (~0.0005 cents)
```

**For Agents:**
- Low fees, but must account for signer count
- Fee market can spike (prioritization needed)

### Stellar

```
// Per operation
fee = baseFeeRate * numOperations

// baseFeeRate = 100 stroops (0.00001 XLM) per operation
// Typical 1-op tx = 0.00001 XLM (~0.0003 cents)
// Typical 3-op tx = 0.00003 XLM (~0.0009 cents)

// Fee is EXPLICIT and FIXED (no market spikes)
```

**For Agents:**
- Extremely predictable fees
- Fixed per operation
- Easy to factor into intent validation
- No fee market surprises

---

## 7. Transaction Finality

### Solana

```
// Confirmation levels
- Processed: In memory pool
- Confirmed: 31 block confirmations (~13 seconds)
- Finalized: 32 slots of confirmation (~12 seconds)

// Practical: Check signature status repeatedly
```

**For Agents:**
- Must poll to confirm finality
- Temporary uncertainty

### Stellar

```
// Ledger closes every ~5 seconds
// Transaction is either:
- In latest ledger (confirmed in ~5 seconds)
- Not in ledger (failed or pending)

// Check via:
const tx = await server.transactions().transaction(hash).call();
// Returns { id, ledger_sequence, result_code, ... }
```

**For Agents:**
- Fast, clear finality (~5 seconds)
- Easy to check: "Is it in a closed ledger?"
- No polling needed; can use WebSocket streams

---

## 8. Multi-Agent Coordination

### Solana Design Challenge

```typescript
// Problem: Multiple agents on same wallet
// Solution attempt: Shared instruction sequencing?

// But instructions are... not sequenced per account
// For payment to work:
// - Agent A sends tx with instruction to transfer SOL
// - Agent B sends tx with instruction to transfer token
// - Both sign same tx? No, each sends own tx
// - Both use same wallet? Signing is still parallel

// Risk: Message ordering becomes implicit
// SOL transfer succeeds, token transfer deferred
```

**We solved it by:**
- **One wallet per agent** (no sharing)
- Agents use different keypairs
- Orchestra coordinates across wallets

### Stellar Design Advantage

```typescript
// Problem: Multiple agents
// Solution: NATIVE via sequence numbers

// Each agent gets own wallet:
Agent A: Account_A (sequence: 10)
Agent B: Account_B (sequence: 20)

// Concurrent submission is safe:
Agent A tx: sequence 11 (increments A)
Agent B tx: sequence 21 (increments B)

// Both succeed, no conflicts

// If both try to use same account (rare):
Agent A tx: sequence 11 (succeeds)
Agent B tx: sequence 11 (fails - already used)
// Agent B retries with sequence 12

// Stellar enforces correctness!
```

**Advantage for Agents:**
- **One wallet per agent is safe and clear**
- **Sequence number provides natural serialization**
- No race conditions between agents

---

## 9. Smart Contract Integration (Future)

### Solana Path (Current MVP)

```typescript
// To interact with Solana programs:
// Create instruction for program
// Agent sends instruction
// Program logic executes

// Challenge: Agent must understand program semantics
```

### Stellar Path (via Soroban, Phase 2)

```typescript
// Stellar has SMART CONTRACTS (Soroban)
// But they're NOT part of base layer

// Base layer: native operations only (simple)
// Smart contracts: For complex logic (optional)

// For agents:
// 1. MVP: Use native operations (payments, trust lines, DEX)
// 2. Phase 2: Contract interaction (invoke contract, custom data)
// 3. Bridge: Intent system bridges both

// Intent: "Swap X for Y"
// Implementation: Invoke contract OR use native DEX
```

**Design Philosophy:**
- **Native operations first** (simpler, more secure)
- **Smart contracts when needed** (DEX, yield vaults, etc.)
- Agents remain **intent-based** (implementation can vary)

---

## 10. Architecture Comparison Table

| Aspect | Solana | Stellar | Our Approach |
|--------|--------|---------|--------------|
| **Tx Structure** | Instructions | Operations | Intent → Operation |
| **Sequencing** | Implicit (blockhash) | Explicit (sequence#) | One wallet/agent (natural) |
| **State** | Program-owned (complex) | Account-based (simple) | Query balances directly |
| **Key Authority** | Custom (per instruction) | Native (per account) | Wallet layer only |
| **Multi-sig** | Programmatic | Native | Leverage native |
| **Fees** | Market-based (variable) | Fixed (100 stroops/op) | Easy to predict |
| **RPC Model** | Binary | REST (JSON) | Horizon API |
| **Finality** | ~13 seconds | ~5 seconds | Fast confirmation |
| **Agent Model** | Intent enforced by design | Intent enforced by SDK | Intent is natural |
| **Shared Wallet** | Complex (instruction order) | Simple (sequence#) | One per agent |

---

## 11. Security Implications

### Solana Risks

```
1. Agents constructing instructions
   → Must validate at program level
   → Complex, error-prone

2. Implicit ordering
   → Race conditions possible
   → Transactions can fail silently

3. Custom authority logic
   → More surface area for bugs
   → Each program implements own checks
```

### Stellar Advantages

```
1. Agents CANNOT construct operations (SDK design)
   → Intent model is inherent, not enforced

2. Explicit sequence numbers
   → Deterministic ordering
   → Clear signer authority

3. Native multi-sig + sponsorship
   → Auditable, simple
   → Less custom code
```

---

## 12. Development Philosophy

### Solana Version
```
"We built a system that PREVENTS agents from misusing transaction construction.
Smart contract programs validate signer authority.
Orchestrator ensures no race conditions via wallet isolation."
```

### Stellar Version
```
"We built a system where agents CAN'T misuse transaction construction.
Stellar SDK provides no methods for raw operation construction.
Explicit sequence numbers prevent race conditions natively."
```

**Result:** Stellar version is **simpler, more auditable, stricter.**

---

## Conclusion

This Stellar-based agentic wallet platform is **not a port**, but a **redesign** that leverages Stellar's strengths:

✅ **Account-based model** → Simple state reasoning
✅ **Native operations** → Clear semantics for agents
✅ **Explicit sequencing** → Natural coordination
✅ **REST Horizon API** → Easy to query
✅ **Fixed fees** → Predictable costs
✅ **Native multi-sig** → Auditable authority

The intent-based control model that had to be **enforced by design** in the Solana version becomes **inherent** in Stellar. The system is simultaneously **simpler, more secure, and more elegant**.
