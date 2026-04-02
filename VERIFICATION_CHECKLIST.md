# Project Checklist & Verification Guide

Complete this checklist after cloning to verify the project is ready to run.

---

## File Structure Verification

### Backend
- [ ] `backend/package.json` - Contains stellar-sdk, express, zod
- [ ] `backend/tsconfig.json` - TypeScript config
- [ ] `backend/src/index.ts` - Main entry point
- [ ] `backend/src/wallet/WalletManager.ts` - Key management
- [ ] `backend/src/stellar/StellarClient.ts` - Stellar integration
- [ ] `backend/src/agent/BaseAgent.ts` - Agent abstraction
- [ ] `backend/src/orchestrator/Orchestrator.ts` - Execution loop
- [ ] `backend/src/api/server.ts` - Express routes
- [ ] `backend/src/types/index.ts` - TypeScript definitions
- [ ] `backend/.env.example` - Environment template

### Frontend
- [ ] `frontend/package.json` - Contains next, react, @tanstack/react-query
- [ ] `frontend/tsconfig.json` - TypeScript config
- [ ] `frontend/src/app/page.tsx` - Dashboard
- [ ] `frontend/src/app/agents/create/page.tsx` - Create agent
- [ ] `frontend/src/app/agents/[id]/page.tsx` - Agent detail
- [ ] `frontend/src/lib/api.ts` - API client
- [ ] `frontend/tailwind.config.ts` - Tailwind config
- [ ] `frontend/.env.example` - Environment template

### Documentation
- [ ] `docs/README.md` - Project overview
- [ ] `docs/ARCHITECTURE.md` - System design
- [ ] `docs/STELLAR_DIFFERENCES.md` - Stellar vs Solana
- [ ] `docs/SECURITY.md` - Key handling
- [ ] `docs/GETTING_STARTED.md` - Quickstart
- [ ] `docs/API.md` - API reference
- [ ] `docs/TESTING.md` - Test guide
- [ ] `docs/DEPLOYMENT.md` - Production guide

### Root Files
- [ ] `README.md` - Main project description
- [ ] `IMPLEMENTATION_SUMMARY.md` - What was built
- [ ] `.gitignore` - Git ignore patterns

---

## Environment Setup

### Clone Repository
```bash
# Clone if needed
git clone <repo-url> agentic-wallet
cd agentic-wallet
```

### Backend Environment

```bash
cd backend

# Verify package.json exists
ls -la package.json

# Check dependencies listed
cat package.json | grep dependencies

# Verify .env.example exists
ls -la .env.example

# Create .env file
cp .env.example .env

# Edit .env - IMPORTANT
# Set WALLET_ENCRYPTION_PASSWORD to a strong password (min 8 chars)
nano .env  # or your preferred editor
```

**Required .env vars:**
```
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
HORIZON_API_URL=https://horizon-testnet.stellar.org
WALLET_ENCRYPTION_PASSWORD=your-strong-password-min-8-chars
PORT=3001
NODE_ENV=development
```

### Frontend Environment

```bash
cd ../frontend

# Verify .env.example exists
ls -la .env.example

# Create .env.local
cp .env.example .env.local

# Edit .env.local (usually just needs API URL)
nano .env.local
```

**Required .env.local vars:**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Dependency Installation

### Backend

```bash
cd backend

# Install Node packages
npm install

# Verify key packages installed
npm list stellar-sdk express zod

# Check TypeScript installed
npx tsc --version
```

Expected output:
```
stellar-sdk@11.0.0
express@4.18.2
zod@3.22.4
Version X.X.X
```

### Frontend

```bash
cd ../frontend

# Install Node packages
npm install

# Verify key packages
npm list next react @tanstack/react-query tailwindcss

# Check TypeScript
npx tsc --version
```

---

## Code Quality Checks

### Backend TypeScript

```bash
cd backend

# Check for type errors (should pass)
npm run type-check

# Expected: No errors/warnings
```

### Linting (Optional)

```bash
# If ESLint configured
npm run lint

# Expected: No errors
```

---

## Network Access Verification

### Testnet Access

```bash
# Check Horizon API is reachable
curl https://horizon-testnet.stellar.org/health

# Expected: HTTP 200 with JSON response
```

### Friendbot Access

```bash
# Friendbot used to fund testnet accounts
# Will test during agent creation
```

---

## Stellar Testnet Setup

### Create Test Accounts

Visit [Stellar Lab](https://developers.stellar.org/docs/tools/lab):

1. **Account 1: Agent Wallet**
   - Generate keypair
   - Fund with Friendbot (10,000 XLM)
   - Note public key

2. **Account 2: Vault Wallet**
   - Generate keypair
   - Fund with Friendbot (~1,000 XLM initial)
   - Note public key

3. **Account 3: Recipient Wallet**
   - Generate keypair
   - Fund with Friendbot (~100 XLM)
   - Note public key

Verification:
```bash
# Check each account has XLM
curl "https://horizon-testnet.stellar.org/accounts/GXXXXXXX..."

# Should see: "balance": "10000.0000000" or similar
```

---

## Backend Startup Verification

### Start Backend

```bash
cd backend
npm run dev

# Should output:
# [INFO] Starting Agentic Wallet Platform Backend
# [INFO] Wallet Manager initialized
# [INFO] Stellar Client initialized
# [INFO] API Server ready { port: 3001, url: http://localhost:3001 }
```

### Test Health Endpoint

In NEW terminal:
```bash
curl http://localhost:3001/health

# Should return:
# {"success":true,"data":{"status":"healthy","uptime":1234.5},"timestamp":1699564800000}
```

---

## Frontend Startup Verification

### Start Frontend

```bash
cd frontend
npm run dev

# Should output:
# ▲  Next.js 14.0.0
#   - Local:        http://localhost:3000
```

### Test Dashboard

Visit [http://localhost:3000](http://localhost:3000) in browser:

- [ ] Page loads
- [ ] Dashboard visible
- [ ] "Create Agent" button present
- [ ] No console errors (check DevTools)

---

## Create Test Agent

### Step 1: Create Agent via Dashboard

1. Click "Create Agent"
2. Fill form:
   - Name: "Test Accumulator"
   - Type: "accumulator"
   - Vault Address: (use your Vault account public key)
   - Min XLM: 50
   - Max XLM: 100
3. Click "Create"
4. Note the agentId and publicKey

### Step 2: Fund Agent Wallet

```bash
# Use the public key from step 1
AGENT_PUBLIC_KEY="GXXXXXXX..."

curl "https://friendbot.stellar.org?addr=$AGENT_PUBLIC_KEY"

# Wait 10 seconds for confirmation
sleep 10

# Verify funding
curl "https://horizon-testnet.stellar.org/accounts/$AGENT_PUBLIC_KEY"
```

### Step 3: Start Agent

Via dashboard:
1. Click agent name from list
2. Click "Start" button
3. Check backend logs for execution

Expected logs:
```
[DEBUG] Accumulator thinking { agentId: agent_xxx, currentXLM: 10000, ... }
[INFO] Accumulator proposing sweep { agentId: agent_xxx, excess: 9949.99999, ... }
[INFO] Transaction signed { agentId: agent_xxx }
[INFO] Transaction submitted { hash: abcd1234... }
```

### Step 4: Verify on Stellar Expert

Visit [Stellar Expert](https://stellar.expert/explorer/testnet):

1. Search for agent's public key
2. Should show:
   - Current balance (~50 XLM)
   - Transaction history (sweep tx visible)
   - Vault received excess XLM

---

## Security Verification

### Check No Secrets Logged

```bash
# Run backend in dev mode
cd backend
npm run dev 2>&1 | grep -i "secret\|password\|key"

# Should return NOTHING (no matches)
```

### Check API Doesn't Expose Secrets

```bash
# Get agent details
curl http://localhost:3001/agents/agent_xxx | jq

# Check response:
# - Should have: agentId, publicKey, status, balance
# - Should NOT have: secretKey, encryptedKeypair, password
```

---

## Integration Test

### Full End-to-End Scenario

1. ✅ Backend running
2. ✅ Frontend accessible
3. ✅ Agent created
4. ✅ Wallet funded
5. ✅ Agent started
6. ✅ Transaction executed
7. ✅ Balances changed
8. ✅ View on Stellar Expert

---

## Documentation Completion

### Essential Reading

- [ ] [README.md](../README.md) - Overview
- [ ] [GETTING_STARTED.md](../docs/GETTING_STARTED.md) - Quickstart
- [ ] [ARCHITECTURE.md](../docs/ARCHITECTURE.md) - How it works

### Reference Docs

- [ ] [API.md](../docs/API.md) - Endpoints
- [ ] [SECURITY.md](../docs/SECURITY.md) - Key handling
- [ ] [DEPLOYMENT.md](../docs/DEPLOYMENT.md) - Production

### Testing & Operations

- [ ] [TESTING.md](../docs/TESTING.md) - Test scenarios
- [ ] Backend logs understanding
- [ ] Frontend console understanding

---

## Common Issues & Solutions

### Issue: Backend won't start

```
Error: Missing required environment variable: WALLET_ENCRYPTION_PASSWORD
```

**Fix:**
```bash
# Check .env file exists
cat backend/.env

# If not, create it
cp backend/.env.example backend/.env
nano backend/.env  # Add WALLET_ENCRYPTION_PASSWORD
```

### Issue: Frontend can't reach backend

```
Failed to fetch http://localhost:3001/health
```

**Fix:**
1. Ensure backend running: `npm run dev` in `backend/` directory
2. Check NEXT_PUBLIC_API_URL in `frontend/.env.local`
3. Restart frontend: Stop and `npm run dev` again

### Issue: Wallet funding fails

```
"Error: No test network available"
```

**Fix:**
```bash
# Friendbot may be rate-limited, try:
# 1. Wait 1 minute and retry
# 2. Or manually fund with transaction via Stellar Lab
```

### Issue: Agent doesn't execute

**Check 1:** Agent is started
- Visit dashboard, click agent, see "Start" button turned to "Stop"?

**Check 2:** Wallet is funded
- Agent detail should show balance in XLM

**Check 3:** Vault address is valid
- Example vault: `GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTTNUVES35LSKNQRMTFSLOGGJU`

---

## Final Verification Checklist

### Functionality
- [ ] Backend starts without errors
- [ ] Frontend loads
- [ ] Health endpoint responds
- [ ] Agent can be created
- [ ] Agent can be started
- [ ] Transaction is submitted
- [ ] Balance changes on Stellar Expert

### Security
- [ ] No secrets in logs
- [ ] No secrets in API responses
- [ ] Password protected encryption
- [ ] No raw private keys stored

### Documentation
- [ ] README understood
- [ ] ARCHITECTURE understood
- [ ] Can follow GETTING_STARTED
- [ ] Can read API.md for all endpoints

---

## Ready to Proceed?

If all checks pass, you're ready to:

1. **Explore:** Create multiple agents, test Distributor strategy
2. **Register:** External agents (BYOA)
3. **Integrate:** Custom agents
4. **Deploy:** Follow [DEPLOYMENT.md](../docs/DEPLOYMENT.md)

---

## Support

If issues found:

1. Check [TESTING.md](../docs/TESTING.md) troubleshooting section
2. Review backend logs for errors
3. Check frontend DevTools console
4. Verify Stellar testnet access
5. Open GitHub issue with logs + environment

---

**✅ Once all checks pass, you have a fully functional agentic wallet platform running on Stellar testnet!**
