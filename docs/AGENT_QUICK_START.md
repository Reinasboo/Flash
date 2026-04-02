# Autonomous Agent Integration - Quick Reference

For: OpenClaw, Claude, GPT-4, and other autonomous AI agents

## One-Minute Overview

The Agentic Wallet Platform lets **autonomous agents**:
1. **Create a wallet** - `POST /byoa/register` → Get Agent ID, Public Key, Control Token
2. **Get funded** - Someone sends 10+ XLM to your public key
3. **Submit intents** - `POST /byoa/agents/{id}/intents` → Transfer XLM, create trust lines, etc.
4. **Track execution** - Webhooks notify when intents execute

**Key**: You submit **intents** (what you want), not raw transactions (wallet signs)

---

## Setup (3 Steps)

### Step 1: Register Your Agent
```bash
curl -X POST http://localhost:3001/byoa/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Agent Name",
    "webhookUrl": "https://your-webhook-receiver.com/stellar",
    "webhookSecret": "must-be-at-least-32-characters-long-secret"
  }'
```

**Save the response:**
```json
{
  "agent": { "id": "550e8400-e29b-41d4-a716-446655440000", "wallet": "GXXX..." },
  "credentials": { "control_token": "abc123...def456" }
}
```

### Step 2: Fund Your Wallet
Send 10+ XLM to your public key (`GXXX...`)

### Step 3: Start Submitting Intents

---

## Core API Reference

### 1. Submit a Transfer
```bash
AGENT_ID="550e8400-e29b-41d4-a716-446655440000"
TOKEN="abc123...def456"
TOKEN_HASH=$(echo -n "$TOKEN" | sha256sum | cut -d' ' -f1)

curl -X POST http://localhost:3001/byoa/agents/$AGENT_ID/intents \
  -H "X-Agent-ID: $AGENT_ID" \
  -H "X-Control-Token-Hash: $TOKEN_HASH" \
  -H "Content-Type: application/json" \
  -d '{
    "intents": [{
      "type": "TRANSFER_XLM",
      "params": {
        "destination": "GBUQWP3...",
        "amount": "100.50"
      }
    }],
    "idempotency_key": "unique-id"
  }'
```

### 2. Check Your Balance
```bash
curl -X GET http://localhost:3001/byoa/agents/$AGENT_ID \
  -H "X-Agent-ID: $AGENT_ID" \
  -H "X-Control-Token-Hash: $TOKEN_HASH"
```

Response includes: `balance`, `permissions`, `rateLimitStatus`

### 3. Check Intent Status
```bash
curl -X GET http://localhost:3001/byoa/agents/$AGENT_ID/intents/$INTENT_ID \
  -H "X-Agent-ID: $AGENT_ID" \
  -H "X-Control-Token-Hash: $TOKEN_HASH"
```

---

## Intent Types

| Type | Description | Example |
|------|-------------|---------|
| `TRANSFER_XLM` | Send lumens | `{ destination, amount }` |
| `CHECK_BALANCE` | Check balance | `{ asset: "XLM" }` |
| `CREATE_TRUST_LINE` | Trust custom asset | `{ asset_code, issuer }` |
| `TRANSFER_ASSET` | Send custom asset | `{ destination, amount, asset_code, issuer }` |

---

## Webhook Events

Your webhook receives POST requests:

```json
{
  "eventType": "intent.executed",
  "timestamp": "2026-04-01T12:00:00Z",
  "agentId": "550e8400-...",
  "payload": { }
}
```

**Event Types**: `intent.submitted`, `intent.executing`, `intent.executed`, `intent.failed`

---

## Security

✅ **Hash your token** before sending in headers:
```
Token → SHA-256 → Hex String → Put in X-Control-Token-Hash header
```

✅ **Never commit tokens** to version control  
✅ **Use HTTPS** for production  

---

## Python Example

```python
import hashlib
import requests
import json

class Agent:
    def __init__(self, agent_id, control_token):
        self.agent_id = agent_id
        self.token_hash = hashlib.sha256(control_token.encode()).hexdigest()
        self.base = "http://localhost:3001"
    
    def headers(self):
        return {
            "X-Agent-ID": self.agent_id,
            "X-Control-Token-Hash": self.token_hash,
            "Content-Type": "application/json"
        }
    
    def transfer(self, destination, amount):
        return requests.post(
            f"{self.base}/byoa/agents/{self.agent_id}/intents",
            headers=self.headers(),
            json={
                "intents": [{
                    "type": "TRANSFER_XLM",
                    "params": {"destination": destination, "amount": amount}
                }],
                "idempotency_key": str(time.time())
            }
        ).json()

# Usage
agent = Agent("550e8400-...", "abc123...def456")
result = agent.transfer("GBUQWP3...", "10.50")
print(result["submissionId"])
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| "Agent not found" | Wrong agent ID | Verify from registration response |
| "Unauthorized" | Invalid token hash | SHA-256 the control token |
| "Rate limit exceeded" | Too many intents this hour | Wait or request higher limit |
| "Insufficient balance" | Not enough XLM | Send >10 XLM to wallet |
| "Invalid destination" | Bad Stellar address | Must start with `G`, 56 chars |

---

## Endpoints

**Fully Documented**: See [AUTONOMOUS_AGENT_GUIDE.md](docs/AUTONOMOUS_AGENT_GUIDE.md)

---

## Next Steps

1. ✅ Register agent → Get ID, token, wallet
2. ✅ Fund wallet → Send 10+ XLM
3. ✅ Submit intent → `POST /intents`
4. ✅ Set up webhook → Receive events
5. ✅ Monitor & scale → Track execution

---

**Questions?** See full docs at `docs/AUTONOMOUS_AGENT_GUIDE.md`
