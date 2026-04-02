# API Documentation

Complete reference for all REST endpoints.

---

## Base URL

```
http://localhost:3001  (development)
https://api.agenticwallet.stellar.xyz  (production)
```

All responses are JSON with standard envelope:

```json
{
  "success": boolean,
  "data": any,
  "error": optional string,
  "timestamp": number
}
```

---

## Health & Stats

### GET /health

Check server health.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 12345678
  },
  "timestamp": 1699564800000
}
```

**Status Codes:**
- `200` - Server healthy
- `500` - Server error

---

### GET /stats

Get system statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAgents": 5,
    "runningAgents": 3,
    "totalTransactions": 42
  },
  "timestamp": 1699564800000
}
```

---

## Agent Management

### POST /agents

Create a new agent.

**Request:**
```json
{
  "name": "My Agent",
  "type": "accumulator",
  "config": {
    "vaultAddress": "GXXXXXXX...",
    "targetMinimum": 50,
    "targetMaximum": 100
  }
}
```

**Schema Validation:**
- `name` (string, 1-100 chars) - Required
- `type` (enum: "accumulator", "distributor") - Required
- `config` (object) - Required, varies by type

**Type-specific Config:**

**accumulator:**
```json
{
  "vaultAddress": "GXXXXXXX...",  // Where to sweep excess
  "targetMinimum": 50,             // Keep at least this much
  "targetMaximum": 100,            // Sweep when above this
  "sweepThreshold": 1              // Min amount to sweep
}
```

**distributor:**
```json
{
  "payments": [
    {
      "address": "GXXXXXXX...",
      "amount": "10.5",
      "memo": "Salary"
    }
  ],
  "minRequired": 10  // Don't distribute below this
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "agentId": "agent_1699564800000",
    "publicKey": "GXXXXXXX..."
  },
  "timestamp": 1699564800000
}
```

**Status Codes:**
- `201` - Agent created
- `400` - Invalid request (see schema)
- `500` - Server error

---

### GET /agents

List all agents.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "agentId": "agent_1699564800000",
      "publicKey": "GXXXXXXX...",
      "status": "running"
    },
    {
      "agentId": "agent_1699564800001",
      "publicKey": "GYYYYYYY...",
      "status": "stopped"
    }
  ],
  "timestamp": 1699564800000
}
```

---

### GET /agents/:id

Get agent details.

**Path Parameters:**
- `id` (string) - Agent ID (e.g., "agent_1699564800000")

**Response:**
```json
{
  "success": true,
  "data": {
    "agentId": "agent_1699564800000",
    "publicKey": "GXXXXXXX...",
    "status": "running",
    "balance": {
      "native": "100.5",
      "assets": [
        {
          "code": "USD",
          "issuer": "GZZZZZZZ...",
          "balance": "50.0"
        }
      ]
    },
    "recentTransactions": [
      {
        "hash": "abcd1234...",
        "type": "payment",
        "source": "GXXXXXXX...",
        "destination": "GYYYYYY...",
        "amount": "10",
        "asset": "native",
        "timestamp": 1699564700000,
        "status": "success"
      }
    ]
  },
  "timestamp": 1699564800000
}
```

**Status Codes:**
- `200` - Success
- `404` - Agent not found
- `500` - Server error

---

### POST /agents/:id/start

Start agent's orchestrator loop.

**Path Parameters:**
- `id` (string) - Agent ID

**Response:**
```json
{
  "success": true,
  "data": {
    "agentId": "agent_1699564800000",
    "status": "running"
  },
  "timestamp": 1699564800000
}
```

**Status Codes:**
- `200` - Agent started
- `404` - Agent not found
- `500` - Server error

---

### POST /agents/:id/stop

Stop agent's orchestrator loop.

**Path Parameters:**
- `id` (string) - Agent ID

**Response:**
```json
{
  "success": true,
  "data": {
    "agentId": "agent_1699564800000",
    "status": "stopped"
  },
  "timestamp": 1699564800000
}
```

---

## Bring Your Own Agent (BYOA)

### POST /byoa/register

Register an external agent.

**Request:**
```json
{
  "name": "External Service",
  "publicKey": "GXXXXXXX..."
}
```

**Schema Validation:**
- `name` (string, 1-100 chars) - Required
- `publicKey` (Stellar address) - Optional; if omitted, wallet generated

**Response:**
```json
{
  "success": true,
  "data": {
    "agentId": "byoa_1699564800000",
    "walletAddress": "GXXXXXXX...",
    "controlToken": "ctr_xxxxx_yyyyy"
  },
  "timestamp": 1699564800000
}
```

**⚠️ Important:** Control token only returned once. Save securely.

**Status Codes:**
- `201` - Agent registered
- `400` - Invalid request
- `500` - Server error

---

### POST /byoa/intents

Submit intent from external agent.

**Headers (Required):**
- `X-Agent-ID: byoa_1699564800000`
- `X-Control-Token: ctr_xxxxx_yyyyy`
- `Content-Type: application/json`

**Request:**
```json
{
  "intent": {
    "type": "TRANSFER_XLM",
    "params": {
      "destination": "GXXXXXXX...",
      "amount": "5.5",
      "memo": "Payment for service"
    }
  }
}
```

**Intent Types:**

**TRANSFER_XLM:**
```json
{
  "type": "TRANSFER_XLM",
  "params": {
    "destination": "GXXXXXXX...",
    "amount": "5.5",
    "memo": "Optional memo (max 28 chars)"
  }
}
```

**TRANSFER_ASSET:**
```json
{
  "type": "TRANSFER_ASSET",
  "params": {
    "assetCode": "USD",
    "issuer": "GZZZZZZZ...",
    "destination": "GXXXXXXX...",
    "amount": "100.0",
    "memo": "Optional"
  }
}
```

**CREATE_TRUST_LINE:**
```json
{
  "type": "CREATE_TRUST_LINE",
  "params": {
    "assetCode": "USD",
    "issuer": "GZZZZZZZ..."
  }
}
```

**CHECK_BALANCE:**
```json
{
  "type": "CHECK_BALANCE",
  "params": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "intentId": "intent_1699564800000",
    "status": "queued"
  },
  "timestamp": 1699564800000
}
```

**Status Codes:**
- `200` - Intent queued
- `400` - Invalid intent structure
- `401` - Missing or invalid auth headers
- `404` - Agent not found
- `500` - Server error

**Auth Errors:**
```json
{
  "success": false,
  "error": "Missing authentication headers",
  "timestamp": 1699564800000
}
```

```json
{
  "success": false,
  "error": "Invalid control token",
  "timestamp": 1699564800000
}
```

---

## Error Responses

### 400 Bad Request

**Invalid Schema:**
```json
{
  "success": false,
  "error": "Invalid request",
  "timestamp": 1699564800000
}
```

### 401 Unauthorized

**Missing Auth:**
```json
{
  "success": false,
  "error": "Missing authentication headers",
  "timestamp": 1699564800000
}
```

**Invalid Token:**
```json
{
  "success": false,
  "error": "Invalid control token",
  "timestamp": 1699564800000
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": "Agent not found",
  "timestamp": 1699564800000
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Internal server error",
  "timestamp": 1699564800000
}
```

**Note:** Never includes implementation details. Check backend logs for debugging.

---

## Rate Limiting

- **Per Endpoint:** 100 requests/minute
- **Per Agent (BYOA):** 10 intents/minute
- **Headers Returned:**
  - `X-RateLimit-Limit: 100`
  - `X-RateLimit-Remaining: 99`
  - `X-RateLimit-Reset: 1699564860`

---

## Curl Examples

### Create Agent
```bash
curl -X POST http://localhost:3001/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Accumulator",
    "type": "accumulator",
    "config": {
      "vaultAddress": "GXXXXXXX...",
      "targetMinimum": 50,
      "targetMaximum": 100
    }
  }'
```

### List Agents
```bash
curl http://localhost:3001/agents
```

### Get Agent
```bash
curl http://localhost:3001/agents/agent_1699564800000
```

### Start Agent
```bash
curl -X POST http://localhost:3001/agents/agent_1699564800000/start
```

### Register BYOA Agent
```bash
curl -X POST http://localhost:3001/byoa/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "External Service",
    "publicKey": "GXXXXXXX..."
  }'
```

### Submit BYOA Intent
```bash
curl -X POST http://localhost:3001/byoa/intents \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: byoa_1699564800000" \
  -H "X-Control-Token: ctr_xxxxx_yyyyy" \
  -d '{
    "intent": {
      "type": "TRANSFER_XLM",
      "params": {
        "destination": "GXXXXXXX...",
        "amount": "5.5",
        "memo": "Test"
      }
    }
  }'
```

---

## Future Endpoints (Phase 2+)

- `GET /transactions` - Global transaction history
- `GET /events` - Event stream
- `WebSocket /events` - Real-time event subscription
- Smart contract interaction endpoints
- Multi-sig agent coordination
- Soroban contract deployment

---

## Versioning

Current API Version: **v1**

Future versions may introduce breaking changes. Subscribe to [GitHub releases](https://github.com/your-repo/releases) for updates.
