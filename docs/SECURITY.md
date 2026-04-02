# Security Model & Key Management

This document details the security architecture for the agentic wallet platform, with explicit focus on **private key protection**, **threat modeling**, and **audit trails**.

---

## Core Security Principle

**Private keys are the crown jewels. They never leave the Wallet Layer. Ever.**

```
┌────────────────────────────────────────────────────────────┐
│ EXTERNAL (Agents, API, Frontend, BYOA)                     │
│ → Can see: Public keys, balances, transaction hashes       │
│ → Cannot see: Secret keys, passwhen decrypting             │
└────────┬─────────────────────────────────────────────────┘
         │ (Intents only, no signing)
         │
┌────────▼──────────────────────────────────────────────────┐
│ WALLET LAYER (Key Management)                              │
│ → Secret keys encrypted at rest (AES-256-GCM + scrypt)    │
│ → Decrypted ONLY during signing                            │
│ → Re-encrypted immediately after                           │
│ → Never logged, never serialized                           │
└──────────────────────────────────────────────────────────┘
         │ (Signed transactions only)
         │
┌────────▼──────────────────────────────────────────────────┐
│ STELLAR CLIENT LAYER (RPC)                                 │
│ → Receives: Signed envelope (no keys)                      │
│ → Submits: To Horizon                                      │
│ → Returns: Transaction hash (no secrets)                   │
└──────────────────────────────────────────────────────────┘
```

---

## Key Encryption & Storage

### Encryption Scheme

```typescript
// Algorithm: AES-256-GCM (Galois/Counter Mode)
// Key Derivation: scrypt
// IV: 12 bytes (random per encryption)
// Auth Tag: Prevents tampering detection

interface EncryptedKeypair {
  // Public representation (safe to log)
  publicKey: string;
  
  // Encryption metadata
  algorithm: "aes-256-gcm";
  derivationFunction: "scrypt";
  
  // Key derivation parameters
  salt: string;          // 32 bytes (hex)
  scryptParams: {
    N: 2^14,            // CPU/memory cost
    r: 8,               // Block size
    p: 1                // Parallelization
  };
  
  // Encryption result
  iv: string;           // 12 bytes (hex)
  ciphertext: string;   // Encrypted keypair (hex)
  authTag: string;      // GCM auth tag (hex)
}
```

### Encryption/Decryption Process

```typescript
import crypto from "crypto";
import { scrypt } from "crypto";

class KeyEncryption {
  private password: string;

  // Encryption
  async encrypt(keypair: Keypair): Promise<EncryptedKeypair> {
    // 1. Derive key from password
    const salt = crypto.randomBytes(32);
    const derivedKey = await new Promise<Buffer>((resolve, reject) => {
      scrypt(this.password, salt, 32, { N: 16384, r: 8, p: 1 }, (err, key) => {
        if (err) reject(err);
        resolve(key);
      });
    });

    // 2. Encrypt keypair
    const iv = crypto.randomBytes(12);
    const keypairJson = JSON.stringify({
      publicKey: keypair.publicKey(),
      secretKey: keypair.secret()  // SECRET - will be encrypted
    });

    const cipher = crypto.createCipheriv("aes-256-gcm", derivedKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(keypairJson, "utf8"),
      cipher.final()
    ]);
    const authTag = cipher.getAuthTag();

    // 3. Return encrypted package
    return {
      publicKey: keypair.publicKey(),
      algorithm: "aes-256-gcm",
      derivationFunction: "scrypt",
      salt: salt.toString("hex"),
      scryptParams: { N: 16384, r: 8, p: 1 },
      iv: iv.toString("hex"),
      ciphertext: encrypted.toString("hex"),
      authTag: authTag.toString("hex")
    };
  }

  // Decryption
  async decrypt(encrypted: EncryptedKeypair): Promise<Keypair> {
    // 1. Derive key from password (same params as encryption)
    const salt = Buffer.from(encrypted.salt, "hex");
    const derivedKey = await new Promise<Buffer>((resolve, reject) => {
      scrypt(
        this.password,
        salt,
        32,
        { N: encrypted.scryptParams.N, r: encrypted.scryptParams.r, p: encrypted.scryptParams.p },
        (err, key) => {
          if (err) reject(err);
          resolve(key);
        }
      );
    });

    // 2. Decrypt ciphertext
    const iv = Buffer.from(encrypted.iv, "hex");
    const ciphertext = Buffer.from(encrypted.ciphertext, "hex");
    const authTag = Buffer.from(encrypted.authTag, "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", derivedKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);

    // 3. Parse keypair
    const keypairData = JSON.parse(decrypted.toString("utf8"));
    
    // ⚠️ SECRET KEY IN MEMORY HERE - CRITICAL SECTION ⚠️
    const keypair = Keypair.fromSecret(keypairData.secretKey);
    
    // IMMEDIATELY clear sensitive data
    keypairData.secretKey = null;
    
    return keypair;
  }
}
```

### Key Durability & Recovery

```typescript
// Never store raw secrets
// ✅ GOOD: Store encrypted key + password hash
{
  agentId: "agent_123",
  encryptedKeypair: EncryptedKeypair,
  passwordHash: sha256(password)  // For password validation
}

// ❌ BAD: Store raw secret
{
  agentId: "agent_123",
  secretKey: "SBXXXXX...",  // NEVER!
}

// Recovery
// User provides password → Leads to passwordHash match → Decrypt key
// Lost password? Key is lost (by design - no recovery backdoor)
```

---

## Wallet Layer Security

### Signing Operations

```typescript
class WalletManager {
  private encryptedKeys: Map<string, EncryptedKeypair> = new Map();
  private encryption: KeyEncryption;

  async signTransaction(
    agentId: string,
    transactionEnvelope: string
  ): Promise<string> {
    // 1. Verify agent exists
    const encrypted = this.encryptedKeys.get(agentId);
    if (!encrypted) throw new Error("Agent not found");

    // 2. Decrypt key (CRITICAL SECTION)
    let keypair: Keypair | null = null;
    try {
      keypair = await this.encryption.decrypt(encrypted);

      // 3. Sign transaction
      const tx = TransactionBuilder.fromXDR(transactionEnvelope, NETWORK);
      tx.sign(keypair);

      // 4. Extract signature (never expose whole tx)
      const signedEnvelope = tx.toXDR();

      // 5. CLEAR keypair from memory
      keypair = null; // GC will clean up
      // Consider also: Using Buffer.alloc for sensitive data, then zeroing

      return signedEnvelope;
    } finally {
      // Ensure cleanup even if error
      keypair = null;
    }
  }

  // ❌ Never implement this
  async getSecretKey(agentId: string): Promise<string> {
    throw new Error("Secret keys never exported!");
  }

  // ✅ Only export what's needed
  async getPublicKey(agentId: string): Promise<string> {
    const encrypted = this.encryptedKeys.get(agentId);
    return encrypted?.publicKey;
  }
}
```

### Key Isolation

```typescript
// One wallet per agent (1:1 mapping)
// Prevents key sharing and implicit trust

Wallet.mapping = {
  agent_1: { publicKey: "GXXXXX...", encryptedKey: {...} },
  agent_2: { publicKey: "GYYYYY...", encryptedKey: {...} },
  agent_3: { publicKey: "GZZZZZ...", encryptedKey: {...} },
  byoa_external: { publicKey: "GWWWWW...", encryptedKey: {...} }
};

// Each agent's keypair is independent
// Compromise of one agent's key ≠ compromise of others
```

---

## API Security

### No Secret Exposure

```typescript
// Backend API contract
interface APIResponse {
  // ✅ These are fine to return
  agentId: string;
  publicKey: string;
  status: "running" | "stopped";
  balances: { asset: string; balance: string }[];
  transactions: Transaction[];
  
  // ❌ NEVER return these
  // secretKey: string;
  // password: string;
  // encryptedKeypair: any;
  // masterKey: string;
}
```

### Input Validation

All API inputs validated with Zod:

```typescript
import { z } from "zod";

// Intent validation
const transferIntentSchema = z.object({
  type: z.literal("TRANSFER_XLM"),
  params: z.object({
    destination: z.string().regex(/^G[A-Z0-9]{55}$/, "Invalid Stellar address"),
    amount: z.string().regex(/^\d+(\.\d{1,7})?$/, "Invalid XLM amount"),
    memo: z.string().optional().max(28),
  }),
  constraints: z.object({
    maxFee: z.number().optional(),
    minBalance: z.string().optional(),
  }).optional(),
});

// Use
try {
  const validated = transferIntentSchema.parse(req.body);
  // Process validated intent
} catch (err) {
  res.status(400).json({ error: "Invalid intent structure" });
}
```

### Error Handling (No Information Leakage)

```typescript
// ✅ Good: Generic error, logged server-side
app.post("/agents/:id/intents", async (req, res) => {
  try {
    const intent = validateIntent(req.body); // throws if invalid
    await orchestrator.executeIntent(agentId, intent);
    res.json({ status: "executed" });
  } catch (err) {
    logger.error("Intent execution failed", { 
      agentId, 
      error: err.message,
      detail: err  // Logged, not sent to client
    });
    res.status(500).json({ error: "Execution failed. Check logs." });
  }
});

// ❌ Bad: Information leakage
app.post("/agents/:id/intents", async (req, res) => {
  try {
    // ...
  } catch (err) {
    // Exposes implementation detail
    res.status(500).json({ 
      error: "Secret key decryption failed",  // ← Key indicator!
      details: err.stack  // ← Stack trace!
    });
  }
});
```

---

## Threat Model & Mitigations

### Threat 1: Brute-Force Attack on Wallet Password

**Threat:** Attacker has encrypted key, attempts password guessing.

**Mitigation:**
- scrypt with cost parameters (N=16384, r=8, p=1)
- Each password guess requires ~100ms computation
- 10,000 guesses = 1000 seconds (~17 minutes)
- Combined with rate limiting on API

```typescript
// Rate limiting on sign operations
const signRateLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 60,              // Max 60 signs per minute
  message: "Too many sign operations"
});

app.post("/agents/:id/sign", signRateLimiter, async (req, res) => {
  // ...
});
```

### Threat 2: Leaked Transaction in Transit

**Threat:** Signed transaction captured in transit to Horizon.

**Mitigation:**
- HTTPS/TLS (enforced)
- Signed transaction is **public** (already broadcast to network)
- No secret keys in transit

```typescript
// Enforce HTTPS
app.use((req, res, next) => {
  if (!req.secure && process.env.NODE_ENV === "production") {
    return res.redirect(307, `https://${req.host}${req.originalUrl}`);
  }
  next();
});
```

### Threat 3: Memory Dump During Signing

**Threat:** Process memory dumped while keypair is decrypted.

**Mitigation:**
- Keypair cleared immediately after signing (null assignment)
- Consider using OS-level memory protection (advanced)
- Keep signing window small

```typescript
// Minimize window
async signTransaction(agentId: string, envelope: string) {
  const encrypted = this.encryptedKeys.get(agentId);
  const keypair = await this.encryption.decrypt(encrypted);
  
  // ⚠️ CRITICAL SECTION (minimize duration)
  const tx = TransactionBuilder.fromXDR(envelope, NETWORK);
  tx.sign(keypair);
  const signedEnvelope = tx.toXDR();
  keypair = null;  // Immediately clear
  // ✓ END CRITICAL SECTION
  
  return signedEnvelope;
}
```

### Threat 4: Agent Manipulation

**Threat:** Agent code modified to extract keys (malicious agent).

**Mitigation:**
- Agents have ZERO key access (architectural)
- Agents can only call `think(context)` which is read-only
- No methods expose keys or raw signing

```typescript
// Agent interface
abstract class BaseAgent {
  // ✅ Allowed
  abstract think(context: AgentContext): Promise<Intent[]>;
  
  // ❌ Not available
  // async getSecretKey(): Promise<string> { }
  // async signCustomData(): Promise<string> { }
  // async getWalletPassword(): Promise<string> { }
}

// Agents CANNOT do:
const maliciousAgent = {
  async think(context) {
    // Can't access: context.secretKey, walletPassword, etc.
    // context only has: balances, transactions, config
    return [];
  }
};
```

### Threat 5: BYOA Agent Abuse

**Threat:** External agent registered, then submits malicious intents.

**Mitigation:**
- Intent validation at API layer
- Rate limiting per agent
- Control token hashed (can't be reused if leaked)
- Audit log of all intents

```typescript
// BYOA intent submission
POST /byoa/intents
Headers:
  X-Agent-ID: byoa_xxxxx
  X-Control-Token: ctr_yyyyy_hash

Body: { intent: {...} }

Processing:
1. Verify agent is registered: X-Agent-ID ✓
2. Hash X-Control-Token, compare to stored hash ✓
3. Validate intent structure (Zod) ✓
4. Validate intent safety (e.g., max transfer amount) ✓
5. Check rate limit (e.g., 10 intents/min) ✓
6. Execute or queue
7. Log: { timestamp, agentId, intent, result } ✓
```

### Threat 6: Stolen Frontend Token

**Threat:** Frontend token leaked → attacker calls API.

**Mitigation:**
- Frontend is **read-only** (no sensitive operations)
- No token needed for read endpoints
- Write endpoints (BYOA) use control token (not frontend token)
- Rate limiting on all endpoints

```typescript
// Read endpoints (public)
GET /agents
GET /agents/:id
GET /transactions
GET /events
// → No auth needed (read-only data)

// Write endpoints (BYOA)
POST /byoa/intents
// → Auth: X-Agent-ID + X-Control-Token hash
// → Rate limited per agent
```

---

## Audit & Monitoring

### Logging Strategy

```typescript
// ✅ Log these events
logger.info("Agent created", { agentId, publicKey });
logger.info("Intent executed", { agentId, intentType, txHash });
logger.warn("Intent rejected", { agentId, reason });
logger.error("Signing failed", { agentId, errorMsg });  // No key!
logger.info("BYOA register", { externalAgentId, wallet });
logger.warn("Rate limit exceeded", { agentId, endpoint });

// ❌ Never log these
logger.info("Signed transaction", { signedEnvelope });  // Contains proof!
logger.debug("Key decryption", { secret, password });
logger.info("Agent config", { encryptedKeys, masterPassword });
```

### Audit Trail

```typescript
interface AuditLog {
  timestamp: number;
  agentId: string;
  eventType: 
    | "create_agent"
    | "execute_intent"
    | "reject_intent"
    | "sign_transaction"
    | "submit_transaction"
    | "byoa_register"
    | "byoa_intents"
    | "rate_limit_exceeded"
    | "error";
  details: {
    intentType?: string;
    reason?: string;
    txHash?: string;
    error?: string;
  };
  // Never includes: secretKey, password, encryptedData
}

// Stored in database + streamed to monitoring
const auditDb = new Database("audit.db");
auditDb.insert(auditLog);  // Immutable append-only log
```

### Monitoring & Alerts

```typescript
// Setup alerting
monitoring.alert(
  condition: (audit) => {
    // Alert if many failed intents from single agent
    return failedIntentsInLast5Min(agentId) > 10;
  },
  message: "Agent {{agentId}} has high failure rate"
);

monitoring.alert(
  condition: (audit) => {
    // Alert if rate limit exceeded multiple times
    return rateLimitExceededInLast10Min() > 5;
  },
  message: "Possible attack: rate limit exceeded frequently"
);
```

---

## Operational Security

### Deployment Checklist

- [ ] Wallet password stored in secure secret manager (not .env)
- [ ] HTTPS enforced (TLS 1.2+)
- [ ] CORS properly configured (frontend domain only)
- [ ] Rate limiting enabled on all endpoints
- [ ] Logging enabled (no secrets in logs)
- [ ] Audit trail persisted
- [ ] Monitoring + alerting configured
- [ ] Regular backups of encrypted keys
- [ ] Password rotation policy (e.g., every 90 days)
- [ ] Access control on API (use API keys or OAuth if needed)

### Password Management

```typescript
// Wallet password should be:
// 1. Random, >20 characters
// 2. Stored in environment (CI/CD secret manager)
// 3. NOT in code repository
// 4. Rotated periodically

// Set via environment
process.env.WALLET_ENCRYPTION_PASSWORD = "secure-random-string";

// Never hardcode
const password = "my-password";  // ❌ BAD

// Check at startup
if (!process.env.WALLET_ENCRYPTION_PASSWORD) {
  throw new Error("WALLET_ENCRYPTION_PASSWORD not set");
}
```

---

## Disaster Recovery

### Key Backup Strategy

```
Encrypted key backup:
  ✅ Encrypted with same password
  ✅ Stored in secure location (S3 + encryption, vault, etc.)
  ✅ Versioned (daily snapshots)
  ✅ ACL restricted (minimal access)

Recovery:
  1. Confirm password known
  2. Restore encrypted backup
  3. Decrypt with password
  4. Verify public keys match
  5. Replace in-memory storage
```

### Key Rotation (Future)

```typescript
// If password compromised:
async rotatePassword(
  agentId: string,
  oldPassword: string,
  newPassword: string
) {
  // 1. Decrypt with old password
  const keypair = await decrypt(agentId, oldPassword);

  // 2. Re-encrypt with new password
  this.encryption.password = newPassword;
  const re_encrypted = await encrypt(keypair);

  // 3. Update storage
  this.encryptedKeys.set(agentId, re_encrypted);

  // 4. Log rotation
  auditLog("password_rotated", { agentId, oldHash: hash(oldPassword) });
}
```

---

## Compliance & Standards

### Followed Standards

- **NIST SP 800-132**: Password-Based Key Derivation (scrypt alignment)
- **NIST SP 800-38D**: GCM Mode of Operation (AES-256-GCM)
- **OWASP**: Secure Coding Guidelines
- **CWE-327**: Use of Broken/Risky Cryptographic Algorithm (avoided)
- **CWE-798**: Use of Hard-Coded Credentials (X)

### Testing & Validation

```bash
npm run test:security
  - Key encryption/decryption round-trip
  - Failed decryption with wrong password
  - Memory cleanup after signing
  - Intent validation
  - API error handling (no leakage)
  - BYOA token security
  - Rate limiting
```

---

## Conclusion

The security model is built on **strict enforcement of separation of concerns**:

✅ Keys encrypted at rest (AES-256-GCM)
✅ Keys decrypted only during signing (minimal window)
✅ Keys cleared immediately (null assignment)
✅ Agents have zero key access (architectural)
✅ All API inputs validated (Zod)
✅ All operations audited (immutable log)
✅ Full observability (monitoring + alerts)

The system prioritizes **defense in depth**: multiple layers of protection so that compromise of one layer doesn't expose keys.
