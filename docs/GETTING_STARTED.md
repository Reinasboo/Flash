# Getting Started - Agentic Wallet Platform on Stellar

**5-minute quickstart to get agents running.**

---

## Prerequisites

- Node.js 18+
- npm or yarn
- Stellar testnet account with XLM (via Friendbot)

---

## Quick Setup

### 1. Clone & Install

```bash
cd c:\Users\Admin\FLASH

# Backend
cd backend
npm install

# Frontend (in new terminal)
cd ../frontend
npm install
```

### 2. Configure Environment

**Backend** (`backend/.env`):
```
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
HORIZON_API_URL=https://horizon-testnet.stellar.org
WALLET_ENCRYPTION_PASSWORD=your-secure-8-char-password
PORT=3001
NODE_ENV=development
```

**Frontend** (`frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Start Services

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Expected:
```
[INFO] Starting Agentic Wallet Platform Backend
[INFO] Wallet Manager initialized
[INFO] Stellar Client initialized
[INFO] API Server ready { port: 3001 }
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Expected:
```
▲  Next.js 14.0.0
  - Local:        http://localhost:3000
```

---

## Create Your First Agent

### Via Dashboard (Easiest)

1. Open http://localhost:3000
2. Click "Create Agent"
3. Fill form:
   - **Name:** "My First Agent"
   - **Type:** "Accumulator"
   - **Vault Address:** GXXXXXXX... (your vault wallet)
   - **Min XLM:** 50
   - **Max XLM:** 100
4. Click "Create Agent"
5. Note the **public key**

### Fund the Wallet

Fund the agent's wallet with XLM via Friendbot:

```bash
curl "https://friendbot.stellar.org?addr=GXXXXXXX..."
```

(Use the public key from step 5)

### Run the Agent

1. Go to Agent detail page (click on agent name)
2. Click "Start" button
3. Agent runs every 30 seconds

**What happens:**
- Agent checks balance (should be ~10,000 XLM from Friendbot)
- Balance > Max (100) → Sweeps excess to vault
- Balance drops to ~50 XLM (target minimum)
- Vault receives ~9,950 XLM

Verify on [Stellar Expert](https://stellar.expert/explorer/testnet/account/GXXXXXXX...).

---

## Next Steps

1. **Create Distributor Agent** - Makes regular payments
2. **Register External Agent** - Allow external systems to submit intents
3. **Monitor Transactions** - Check transaction history

See [TESTING.md](docs/TESTING.md) for detailed test scenarios.

---

## Key Endpoints

### Health Check
```bash
curl http://localhost:3001/health
```

### List Agents
```bash
curl http://localhost:3001/agents
```

### Get Agent Details
```bash
curl http://localhost:3001/agents/agent_xxxxx
```

### Start Agent
```bash
curl -X POST http://localhost:3001/agents/agent_xxxxx/start
```

See [API.md](docs/API.md) for full endpoint reference.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend won't start | Check `WALLET_ENCRYPTION_PASSWORD` is set in `.env` |
| Agent balance shows 0 | Fund wallet via Friendbot: `curl "https://friendbot.stellar.org?addr=GXXXXXXX..."` |
| Frontend can't connect | Ensure backend running on 3001, check `NEXT_PUBLIC_API_URL` |
| Signing fails | Check wallet password is minimum 8 characters |

See [TESTING.md](docs/TESTING.md) for more troubleshooting.

---

## Architecture

- **Wallet Layer:** Encrypts keys at rest (AES-256-GCM)
- **Agent Layer:** Makes decisions via `think()` method
- **Orchestrator:** Runs agent loop, validates intents, executes transactions
- **Express API:** REST endpoints for control
- **Next.js Dashboard:** Real-time monitoring

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

---

## Security Notes

✅ **Private keys encrypted at rest**
✅ **Keys decrypted only during signing**
✅ **Agents have zero key access**
✅ **No secrets in logs or API responses**

See [SECURITY.md](docs/SECURITY.md) for threat model.

---

## What's Next?

- Deploy to production (Stellar mainnet)
- Integrate with BYOA partners
- Add smart contract interactions (Soroban)
- Set up monitoring and alerts

---

## Get Help

- **Docs:** See `/docs` folder
- **Issues:** Open an issue with logs and reproduction steps
- **Community:** [Stellar Developers](https://developers.stellar.org)
