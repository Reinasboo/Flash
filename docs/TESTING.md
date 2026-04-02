# Testing Guide - Agentic Wallet Platform on Stellar

This document provides comprehensive testing instructions for the agentic wallet platform.

---

## Setup: Stellar Testnet

### 1. Create Accounts via Stellar Lab

Visit [Stellar Lab](https://developers.stellar.org/docs/tools/lab).

**Generate 3 accounts:**
1. **Agent Wallet** - Used by the platform
2. **Vault Wallet** - Where excess XLM is swept (for Accumulator)
3. **Payment Recipient** - Receives payments (for Distributor)

Save the secret keys securely.

### 2. Fund with Testnet XLM

Use Friendbot to fund each account with 10,000 XLM:

```bash
curl "https://friendbot.stellar.org?addr=GXXXXXXX..."
```

Do this for all 3 accounts.

### 3. Verify Funding

```bash
curl "https://horizon-testnet.stellar.org/accounts/GXXXXXXX..."
```

You should see balances in the response.

---

## Backend Testing

### 1. Install & Configure

```bash
cd backend
npm install
cp .env.example .env
```

Update `.env`:
```
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
HORIZON_API_URL=https://horizon-testnet.stellar.org
WALLET_ENCRYPTION_PASSWORD=test-password-min-8-chars
PORT=3001
NODE_ENV=development
```

### 2. Start Backend

```bash
npm run dev
```

Expected output:
```
[INFO] Starting Agentic Wallet Platform Backend
[INFO] Wallet Manager initialized
[INFO] Stellar Client initialized
[INFO] API Server ready { port: 3001, url: http://localhost:3001 }
```

### 3. Test Health Endpoint

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 1234.567
  },
  "timestamp": 1699564800000
}
```

### 4. Create Agent

```bash
curl -X POST http://localhost:3001/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Accumulator Agent",
    "type": "accumulator",
    "config": {
      "vaultAddress": "GXXXXXXX...",
      "targetMinimum": 50,
      "targetMaximum": 100
    }
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "agentId": "agent_1699564800000",
    "publicKey": "GYYYYYYY..."
  }
}
```

**Important:** Save the `agentId` and `publicKey` for next steps.

### 5. Fund Agent Wallet

Use the `publicKey` from step 4 to fund it via Friendbot:

```bash
curl "https://friendbot.stellar.org?addr=GYYYYYYY..."
```

Wait for confirmation.

### 6. List Agents

```bash
curl http://localhost:3001/agents
```

### 7. Get Agent Details

```bash
curl http://localhost:3001/agents/agent_1699564800000
```

Expected response shows agent with balances and recent transactions (currently empty).

### 8. Start Agent

```bash
curl -X POST http://localhost:3001/agents/agent_1699564800000/start
```

Agent is now running and will execute its think() loop every 30 seconds.

### 9. Monitor Execution

Check logs in terminal:
```
[DEBUG] Accumulator thinking { agentId: agent_1699564800000, currentXLM: 10000, targetMin: 50, targetMax: 100 }
[INFO] Accumulator proposing sweep { agentId: agent_1699564800000, excess: 9949.99999, vault: GXXXXXXX... }
```

### 10. Stop Agent

```bash
curl -X POST http://localhost:3001/agents/agent_1699564800000/stop
```

---

## Frontend Testing

### 1. Install & Configure

```bash
cd frontend
npm install
cp .env.example .env.local
```

`.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 2. Start Frontend

```bash
npm run dev
```

Expected output:
```
  ▲  Next.js 14.0.0
  - Local:        http://localhost:3000
```

Visit [http://localhost:3000](http://localhost:3000).

### 3. Dashboard Tests

- **Stats**: Should show "1 Total Agents"
- **Agents**: Should list the agent created earlier
- **Links**: Click "Create Agent" and "External Agents"

### 4. Create Agent via Dashboard

1. Navigate to `/agents/create`
2. Fill in form:
   - Name: "My Second Agent"
   - Type: "accumulator"
   - Vault: Your vault address
   - Min: 50, Max: 100
3. Click "Create Agent"
4. Redirect to agent detail page

Fund this wallet via Friendbot.

### 5. Agent Detail Page

1. Click into an agent
2. Should show:
   - Agent ID
   - Public key (copyable)
   - Balance (XLM + assets)
   - Start/Stop button
   - Recent transactions
3. Click "Start" to run the agent

### 6. External Agents (BYOA)

1. Navigate to `/byoa`
2. Click "Register External Agent"
3. Fill form:
   - Name: "External Service"
   - Public Key: Leave empty
4. Submit
5. Receive control token

**Important:** Save this token for API testing.

---

## API Testing (Advanced)

### Test BYOA Intent Submission

```bash
curl -X POST http://localhost:3001/byoa/intents \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: byoa_1699564800000" \
  -H "X-Control-Token: ctr_xxxxx" \
  -d '{
    "intent": {
      "type": "TRANSFER_XLM",
      "params": {
        "destination": "GXXXXXXX...",
        "amount": "5.5",
        "memo": "Test payment"
      }
    }
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "intentId": "intent_1699564800000",
    "status": "queued"
  }
}
```

---

## Stellar Explorer Verification

After a transaction is submitted, verify on [Stellar Expert](https://stellar.expert/explorer/testnet):

1. Visit https://stellar.expert/explorer/testnet/account/GYYYYYYY...
2. Should show:
   - Agent wallet address
   - Balance history
   - Recent transactions with hashes, amounts, timestamps

---

## Security Testing

### 1. Verify Keys Never Exposed

**Test 1: Check logs for secrets**

```bash
npm run dev 2>&1 | grep -i "secret\|password\|key"
```

Should output NO matches (clean logs).

**Test 2: Check API responses**

```bash
curl http://localhost:3001/agents/agent_xxx | jq
```

Response should NEVER contain:
- `secretKey`
- `password`
- `encryptedData`
- `decryptedKey`

### 2. Test Wallet Password Requirement

In backend code, delete `WALLET_ENCRYPTION_PASSWORD` from `.env`:

```bash
npm run dev
```

Expected error:
```
[ERROR] Failed to start server { error: 'Missing required environment variable: WALLET_ENCRYPTION_PASSWORD' }
```

### 3. Test Invalid Encryption Password

Edit `.env`:
```
WALLET_ENCRYPTION_PASSWORD=wrong-password
```

Restart backend, then create an agent. Stop and restart with different password:

```
WALLET_ENCRYPTION_PASSWORD=different-password
```

Try to start agent → Expected: Signing fails (key decryption fails).

---

## End-to-End Test Scenario

### Setup

- 2 Agent Wallets (Agent A, Agent B)
- 1 Vault Wallet
- 1 Recipient Wallet

### Steps

1. **Create Accumulator Agent A**
   - Config: Vault = Vault Wallet, Min = 50, Max = 100
   - Fund with 500 XLM

2. **Create Distributor Agent B**
   - Config: Recipient = Recipient Wallet, Amount = 10 XLM
   - Fund with 100 XLM

3. **Start Both Agents**
   - Via API or dashboard

4. **Monitor Execution** (30 seconds)
   - Agent A thinks: 500 > 100 (max) → Sweep (500 - 50 - fee) XLM to vault
   - Agent B thinks: 100 > 10 (min) → Send 10 XLM to recipient

5. **Verify Results**
   - Agent A balance: ~50 XLM
   - Vault balance: ~450 XLM
   - Agent B balance: ~90 XLM
   - Recipient balance: +10 XLM

6. **Check Stellar Expert**
   - Verify transaction hashes
   - Confirm amounts and timestamps

---

## Troubleshooting

### Backend won't start

```
Error: WALLET_ENCRYPTION_PASSWORD not set
```

**Fix:** Add to `.env`

### API returns 500 error

```json
{ "success": false, "error": "Internal server error" }
```

**Debug:** Check backend console logs

### Agent balance always shows 0

**Cause:** Friendbot didn't fund wallet

**Fix:** 
```bash
curl "https://friendbot.stellar.org?addr=GXXXXXXX..."
```

Wait 10 seconds, refresh frontend.

### Transaction fails with "Invalid signature"

**Cause:** Wallet password is wrong

**Fix:** Verify `WALLET_ENCRYPTION_PASSWORD` in `.env`

### Frontend won't connect to backend

```
Failed to fetch http://localhost:3001/health
```

**Fix:** Ensure backend is running on port 3001 and `NEXT_PUBLIC_API_URL` is correct

---

## Performance Testing

### Load Test: 10 Concurrent Agents

```bash
# Create 10 agents in a loop
for i in {1..10}; do
  curl -X POST http://localhost:3001/agents \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Agent $i\",
      \"type\": \"accumulator\",
      \"config\": { \"vaultAddress\": \"GXXXXXXX...\", ... }
    }"
done
```

**Expected:** All agents created successfully.

### Stress Test: 100 Intents per Agent

Submit 100 intents via BYOA (thread count test).

**Expected:** All queued without dropping.

---

## Cleanup

### Reset Wallets

If you want to start fresh:

1. Generate new Stellar accounts via Stellar Lab
2. Update agent config with new vault address
3. Delete backend state (re-create agents)
4. Re-fund via Friendbot

---

## Continuous Testing (CI/CD)

The test suite can be automated:

```bash
# Backend tests
cd backend && npm run test

# Frontend tests  
cd frontend && npm run test

# Type checking
npm run type-check

# Linting
npm run lint
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for test strategy details.

---

## Reporting Issues

If tests fail, provide:

1. **Environment:** OS, Node.js version
2. **Logs:** Full stderr/stdout
3. **Code:** Relevant .env and API request/response
4. **Reproduction:** Steps to reproduce issue

Open an issue with this information.
