# Autonomous Agent Guide - Agentic Wallet Platform

This guide explains how autonomous AI agents (like OpenClaw, Claude, GPT-4, and other LLM-based agents) can integrate with the Agentic Wallet Platform to control Stellar wallets securely.

## Overview

The Agentic Wallet Platform enables autonomous agents to:

✅ **Create and own Stellar wallets** - Generate secure keypairs with encrypted private keys  
✅ **Control financial operations** - Submit intents for transfers, payments, and blockchain operations  
✅ **Execute transactions** - Have intents validated and executed automatically  
✅ **Receive webhooks** - Get real-time callbacks when intents execute or fail  
✅ **Track transaction history** - Full audit trail and transparency  
✅ **Manage rate limits & permissions** - Fine-grained control over what agents can do  

## How It Works

### Architecture: Intent-Based Execution

```
                      Autonomous Agent (AI)
                              │
                              ▼
              ┌───────────────────────────────┐
              │  Agent submits INTENTS         │
              │  (I want to transfer 100 XLM) │
              └───────────────┬─────────────────┘
                              │
              ┌───────────────▼─────────────────┐
              │  Agentic Wallet Platform        │
              │  - Validate intent              │
              │  - Check permissions/rate limit │
              │  - Build Stellar transaction    │
              │  - Sign with private key        │
              │  - Submit to Stellar network    │
              └───────────────┬─────────────────┘
                              │
              ┌───────────────▼─────────────────┐
              │  Stellar Network                │
              │  - Execute transaction          │
              │  - Update ledger                │
              │  - Return receipt               │
              └───────────────┬─────────────────┘
                              │
              ┌───────────────▼─────────────────┐
              │  Webhook Callback               │
              │  (Agent receives notification)  │
              └────────────────────────────────┘
```

**Key Principle**: Agents submit _intents_ (high-level goals), not raw transactions. The wallet layer is the only entity that touches private keys.

---

## Setup for Autonomous Agents

### Step 1: Register Your Autonomous Agent

**Scenario A: Internal Agent** (runs in same system)
```bash
curl -X POST http://localhost:3001/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenClaw Trading Agent",
    "type": "accumulator",   # or "distributor"
    "config": {
      "accumulationTarget": "1000.00",
      "refreshInterval": 3600000
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "agentId": "agent_1775043556925",
    "publicKey": "GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  }
}
```

**Scenario B: BYOA Agent** (external system, gets own wallet)
```bash
curl -X POST http://localhost:3001/byoa/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Claude Trading Bot",
    "description": "AI agent for arbitrage trading on Stellar",
    "contact_email": "claude-bot@example.com",
    "webhookUrl": "https://your-system.com/stellar-webhooks",
    "webhookSecret": "secret-key-at-least-32-chars-long"
  }'
```

**Response:**
```json
{
  "success": true,
  "agent": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Claude Trading Bot",
    "wallet": "GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "status": "active",
    "created_at": "2026-04-01T12:00:00Z"
  },
  "credentials": {
    "control_token": "a1b2c3d4e5f6...64-char-hex-string...",
    "note": "Save this token securely. You will not see it again."
  },
  "wallet_info": {
    "public_key": "GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "needs_funding": true,
    "min_funded_amount": "10.00"
  }
}
```

### Step 2: Fund Your Agent's Wallet

The agent needs at least 10 XLM to pay transaction fees. Use any Stellar wallet:

```bash
# Send XLM to the agent's public key
stellar send --to GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX --amount 50.00
```

### Step 3: Authenticate & Submit Intents

For BYOA agents, every request requires authentication headers:

```bash
# 1. Hash the control token (SHA-256)
TOKEN="a1b2c3d4e5f6...64-char-hex..."
TOKEN_HASH=$(echo -n "$TOKEN" | sha256sum | cut -d' ' -f1)

# 2. Submit an intent
curl -X POST http://localhost:3001/byoa/agents/550e8400-e29b-41d4-a716-446655440000/intents \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -H "X-Control-Token-Hash: $TOKEN_HASH" \
  -d '{
    "intents": [
      {
        "type": "TRANSFER_XLM",
        "params": {
          "destination": "GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTINYENAE2QGRL32H3XSNMF6QH",
          "amount": "10.50",
          "memo": "Payment for services"
        }
      }
    ],
    "idempotency_key": "unique-id-for-this-batch"
  }'
```

**Response:**
```json
{
  "success": true,
  "submissionId": "bae3dd97-4c2a-4e9d-9c08-6a3b5c2d1e0f",
  "intentsAccepted": 1,
  "intentsRejected": 0,
  "details": [
    {
      "intentIndex": 0,
      "type": "TRANSFER_XLM",
      "status": "queued",
      "intentId": "f7e3d4c5-b6a7-4d8e-9f0a-1b2c3d4e5f6g",
      "message": "Queued for execution"
    }
  ]
}
```

---

## API Reference for Autonomous Agents

### Core Endpoints

#### 1. **Register BYOA Agent** (Agent creates its own wallet)
```
POST /byoa/register
Content-Type: application/json

{
  "name": "Agent Name",
  "description": "What this agent does",
  "webhookUrl": "https://your-webhook.com/stellar",
  "webhookSecret": "secret_key_min_32_chars",
  "contactEmail": "contact@example.com",
  "metadata": { "custom": "data" }
}

Response: 201 Created
{
  "agent": { "id", "name", "wallet", "status", "created_at" },
  "credentials": { "control_token" },
  "wallet_info": { "public_key", "needs_funding", "min_funded_amount" }
}
```

#### 2. **Submit Intents** (Agent proposes transactions)
```
POST /byoa/agents/{agent_id}/intents
Headers:
  - X-Agent-ID: {agent_id}
  - X-Control-Token-Hash: {sha256(control_token)}

{
  "intents": [
    {
      "type": "TRANSFER_XLM",
      "params": {
        "destination": "GXXX...XXX",
        "amount": "100.50",
        "memo": "optional message"
      }
    }
  ],
  "idempotency_key": "unique-batch-id"
}

Response: 200 OK
{
  "submissionId": "uuid",
  "intentsAccepted": 1,
  "intentsRejected": 0,
  "details": [ ... ]
}
```

#### 3. **Check Intent Status** (Track execution)
```
GET /byoa/agents/{agent_id}/intents/{intent_id}
Headers:
  - X-Agent-ID: {agent_id}
  - X-Control-Token-Hash: {sha256(control_token)}

Response: 200 OK
{
  "success": true,
  "intent": {
    "id": "intent-uuid",
    "agent_id": "agent-uuid",
    "type": "TRANSFER_XLM",
    "params": { ... },
    "status": "executed",  // or: queued, pending, failed
    "created_at": "2026-04-01T12:00:00Z",
    "executed_at": "2026-04-01T12:00:15Z",
    "result": { ... }
  }
}
```

#### 4. **Get Agent Info** (Check balance & permissions)
```
GET /byoa/agents/{agent_id}
Headers:
  - X-Agent-ID: {agent_id}
  - X-Control-Token-Hash: {sha256(control_token)}

Response: 200 OK
{
  "success": true,
  "agent": {
    "id": "agent-uuid",
    "name": "My Trading Bot",
    "wallet": "GXXX...XXX",
    "status": "active",
    "balance": { "XLM": "50.25" },
    "permissions": {
      "can_submit_intents": true,
      "can_modify_config": false,
      "can_view_balance": true,
      "can_view_transaction_history": true,
      "max_intents_per_hour": 100,
      "max_transfer_amount": "1000000.00"
    },
    "rateLimitStatus": {
      "remaining": 95,
      "limit": 100,
      "resetAt": "2026-04-01T13:00:00Z"
    },
    "statistics": {
      "totalIntents": 5,
      "createdAt": "2026-04-01T10:00:00Z"
    }
  }
}
```

#### 5. **Get Transaction History** (Audit trail)
```
GET /byoa/agents/{agent_id}/transactions?limit=50&offset=0
Headers:
  - X-Agent-ID: {agent_id}
  - X-Control-Token-Hash: {sha256(control_token)}

Response: 200 OK
{
  "success": true,
  "transactions": [
    {
      "id": "tx-uuid",
      "type": "TRANSFER_XLM",
      "status": "success",
      "amount": "10.50",
      "destination": "GXXX...XXX",
      "created_at": "2026-04-01T12:00:00Z",
      "executed_at": "2026-04-01T12:00:15Z",
      "tx_hash": "abc123def456..."
    }
  ],
  "total": 25,
  "limit": 50,
  "offset": 0
}
```

---

## Intent Types Supported

### 1. **TRANSFER_XLM** - Transfer Stellar Lumens
```json
{
  "type": "TRANSFER_XLM",
  "params": {
    "destination": "GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTINYENAE2QGRL32H3XSNMF6QH",
    "amount": "100.00",
    "memo": "optional transaction memo"
  }
}
```

### 2. **CHECK_BALANCE** - Verify Available Funds
```json
{
  "type": "CHECK_BALANCE",
  "params": {
    "asset": "XLM"
  }
}
```

### 3. **CREATE_TRUST_LINE** - Trust Custom Assets
```json
{
  "type": "CREATE_TRUST_LINE",
  "params": {
    "asset_code": "USDC",
    "issuer": "GBBD47UZQ5CUBK4G2C5QLTSL47DRSRHZ4JS5CI42OP4RTOHYQWWRKH6"
  }
}
```

### 4. **TRANSFER_ASSET** - Transfer Custom Assets
```json
{
  "type": "TRANSFER_ASSET",
  "params": {
    "destination": "GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTINYENAE2QGRL32H3XSNMF6QH",
    "amount": "50.00",
    "asset_code": "USDC",
    "issuer": "GBBD47UZQ5CUBK4G2C5QLTSL47DRSRHZ4JS5CI42OP4RTOHYQWWRKH6"
  }
}
```

More intent types coming soon (swaps, offers, payments, etc.)

---

## Webhook Integration

Your autonomous agent can receive real-time callbacks when intents execute:

### Webhook Events

Your `webhookUrl` will receive POST requests:

```json
{
  "eventType": "intent.submitted",
  "timestamp": "2026-04-01T12:00:00Z",
  "agentId": "550e8400-e29b-41d4-a716-446655440000",
  "payload": {
    "submissionId": "bae3dd97-4c2a-4e9d-9c08-6a3b5c2d1e0f",
    "intentsAccepted": 1,
    "intentsRejected": 0
  }
}
```

**Event Types:**
- `intent.submitted` - Intents received and queued
- `intent.executing` - Intent is being processed
- `intent.executed` - Intent succeeded, transaction confirmed
- `intent.failed` - Intent failed (insufficient funds, validation error, etc.)
- `rate_limit.approaching` - Agent nearing hourly limit
- `rate_limit.exceeded` - Agent hit rate limit

### Verify Webhook Authenticity

All webhooks include an `X-Webhook-Signature` header:

```bash
# Verify the signature
PAYLOAD_BODY="..."
SECRET="your_webhook_secret"
EXPECTED_SIG=$(echo -n "$PAYLOAD_BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex)
ACTUAL_SIG=$(curl -i ... | grep X-Webhook-Signature)

# Compare EXPECTED_SIG and ACTUAL_SIG
```

---

## Security Best Practices

### 1. **Control Token Management**
```
⚠️  NEVER commit tokens to version control
⚠️  NEVER log the full token
⚠️  NEVER send token in URL parameters
✅  Store in environment variables: AGENT_CONTROL_TOKEN
✅  Hash before sending in headers (X-Control-Token-Hash)
✅  Rotate tokens regularly
```

### 2. **Secure Agent Communication**
```
✅  Always use HTTPS for production
✅  Enable CORS restrictions appropriately
✅  Use request signing for additional security
✅  Implement rate limiting on agent side
✅  Validate all webhook payloads
```

### 3. **Permission Least Privilege**
```
✅  Request only needed permissions
✅  Set transfer limits appropriate for your use case
✅  Monitor agent activity in dashboards
✅  Revoke credentials if suspicious activity detected
✅  Archive old tokens
```

### 4. **Private Key Security**
```
The platform uses:
✅  AES-256-GCM encryption
✅  Scrypt key derivation (N=16384, r=8, p=1)
✅  Random salt and IV per keypair
✅  Keys stored encrypted at rest
✅  Keys decrypted only during signing
✅  Immediate memory clearing after use
```

---

## Implementation Examples

### Example 1: Python Autonomous Agent

```python
import requests
import hashlib
import json
from datetime import datetime

class AutonomousAgent:
    def __init__(self, agent_id, control_token, api_base="http://localhost:3001"):
        self.agent_id = agent_id
        self.control_token = control_token
        self.api_base = api_base
    
    def _get_auth_headers(self):
        token_hash = hashlib.sha256(self.control_token.encode()).hexdigest()
        return {
            "X-Agent-ID": self.agent_id,
            "X-Control-Token-Hash": token_hash,
            "Content-Type": "application/json"
        }
    
    def submit_transfer(self, destination, amount, memo=None):
        """Submit a transfer intent"""
        payload = {
            "intents": [
                {
                    "type": "TRANSFER_XLM",
                    "params": {
                        "destination": destination,
                        "amount": amount,
                        "memo": memo or ""
                    }
                }
            ],
            "idempotency_key": f"transfer-{datetime.utcnow().timestamp()}"
        }
        
        response = requests.post(
            f"{self.api_base}/byoa/agents/{self.agent_id}/intents",
            headers=self._get_auth_headers(),
            json=payload
        )
        
        return response.json()
    
    def check_balance(self):
        """Get agent's account info"""
        response = requests.get(
            f"{self.api_base}/byoa/agents/{self.agent_id}",
            headers=self._get_auth_headers()
        )
        return response.json()["agent"]["balance"]

# Usage
agent = AutonomousAgent(
    agent_id="550e8400-e29b-41d4-a716-446655440000",
    control_token="a1b2c3d4e5f6...64-char-hex..."
)

# CheckBalance
balance = agent.check_balance()
print(f"Agent balance: {balance}")

# Submit transfer
result = agent.submit_transfer(
    destination="GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTINYENAE2QGRL32H3XSNMF6QH",
    amount="10.50",
    memo="Autonomous payment"
)
print(f"Intent submitted: {result['submissionId']}")
```

### Example 2: JavaScript/Node.js Agent

```javascript
const crypto = require('crypto');
const fetch = require('node-fetch');

class AutonomousAgent {
  constructor(agentId, controlToken, apiBase = 'http://localhost:3001') {
    this.agentId = agentId;
    this.controlToken = controlToken;
    this.apiBase = apiBase;
  }

  getAuthHeaders() {
    const tokenHash = crypto
      .createHash('sha256')
      .update(this.controlToken)
      .digest('hex');
    
    return {
      'X-Agent-ID': this.agentId,
      'X-Control-Token-Hash': tokenHash,
      'Content-Type': 'application/json'
    };
  }

  async submitTransfer(destination, amount, memo = '') {
    const payload = {
      intents: [
        {
          type: 'TRANSFER_XLM',
          params: { destination, amount, memo }
        }
      ],
      idempotency_key: `transfer-${Date.now()}`
    };

    const response = await fetch(
      `${this.apiBase}/byoa/agents/${this.agentId}/intents`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload)
      }
    );

    return response.json();
  }

  async getBalance() {
    const response = await fetch(
      `${this.apiBase}/byoa/agents/${this.agentId}`,
      { headers: this.getAuthHeaders() }
    );

    const data = await response.json();
    return data.agent.balance;
  }
}

// Usage
const agent = new AutonomousAgent(
  '550e8400-e29b-41d4-a716-446655440000',
  'a1b2c3d4e5f6...64-char-hex...'
);

(async () => {
  const balance = await agent.getBalance();
  console.log('Agent balance:', balance);

  const result = await agent.submitTransfer(
    'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTINYENAE2QGRL32H3XSNMF6QH',
    '10.50'
  );
  console.log('Intent submitted:', result.submissionId);
})();
```

---

## Troubleshooting

### Error: "Agent not found"
- Make sure you registered the agent first
- Check agent ID is correct (UUID format)

### Error: "Unauthorized - Invalid control token"
- Verify control token is correct
- Ensure token hash is SHA-256
- Check X-Agent-ID matches token's agent

### Error: "Rate limit exceeded"
- Agent hit hourly intent limit
- Wait until reset time shown in response
- Request higher limit if needed

### Error: "Insufficient balance"
- Agent wallet needs more XLM
- Send XLM to agent's public key
- Minimum recommended: 10 XLM for fees

### Intent rejected: "Invalid destination"
- Verify destination is valid Stellar public key (starts with `G`)
- Cannot send to agent's own account
- Check destination exists on network

---

## FAQ

**Q: Can my agent create multiple wallets?**  
A: Each registered agent gets one wallet. Create multiple agents if you need multiple wallets.

**Q: What's the minimum transaction amount?**  
A: 0.00001 XLM (1 stroop). Most transactions cost 0.00001 XLM base + optional fees.

**Q: Can agents receive payments?**  
A: Yes. Any Stellar user can send to the agent's public key. Webhook will notify on incoming payments.

**Q: How long do transactions take?**  
A: Typically 4-9 seconds on Stellar network. Webhook fires when confirmed.

**Q: Can I audit agent activity?**  
A: Yes. Full transaction history and audit logs available via `/transactions` endpoint.

**Q: What happens if an intent fails?**  
A: Agent gets webhook notification with failure reason. Intent status shows "failed". Can check and retry.

**Q: Can agents modify their own permissions?**  
A: No. Permissions are set by admin. Agents can only execute within granted permissions.

---

## Getting Help

- **API Documentation**: See [API.md](./API.md)
- **Architecture Details**: See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Security Guide**: See [SECURITY.md](./SECURITY.md)
- **Deployment**: See [DEPLOYMENT.md](./DEPLOYMENT.md)

---

**Last Updated**: April 1, 2026  
**Platform Version**: 1.0.0  
**Stellar Network**: Testnet (configurable)
