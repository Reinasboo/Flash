#!/bin/bash

# Agentic Wallet Platform - Complete Quick Start Guide

## 🚀 Installation & Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Backend Setup  

```bash
cd backend
npm install

# Setup environment
cp .env.example .env

# Edit .env with your settings:
# WALLET_ENCRYPTION_PASSWORD=your-secure-password-here
# STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
# HORIZON_API_URL=https://horizon-testnet.stellar.org
# PORT=3001

# Start development server
npm run dev

# In another terminal, if you want to build for production:
npm run build
npm start
```

**Backend runs on:** `http://localhost:3001`

### Frontend Setup

```bash
cd frontend
npm install

# Setup environment
cp .env.example .env

# Ensure NEXT_PUBLIC_API_URL=http://localhost:3001

# Start development server
npm run dev

# For production build:
npm run build
npm start
```

**Frontend runs on:** `http://localhost:3000`

---

## 📋 API Endpoints Reference

### Health & Stats
- `GET /health` - System health check
- `GET /stats` - Statistics (total agents, running agents, etc.)

### Agent Management
- `POST /agents` - Create new agent
  ```json
  {
    "name": "My Agent",
    "type": "accumulator",
    "config": {
      "vaultAddress": "GXXXXXX...",
      "targetMinimum": 50,
      "targetMaximum": 100
    }
  }
  ```
- `GET /agents` - List all agents
- `GET /agents/:id` - Get agent details
- `POST /agents/:id/start` - Start agent execution
- `POST /agents/:id/stop` - Stop agent execution

### BYOA (External Agents)
- `POST /byoa/register` - Register external agent
  ```json
  {
    "name": "External Agent",
    "publicKey": "GXXXXXX..."
  }
  ```
- `POST /byoa/intents` - Submit intent from external agent
  - Headers: `X-Agent-ID`, `X-Control-Token`

---

## 💡 Frontend Pages

### Dashboard (`/dashboard`)
- Overview stats (total agents, running count, total transactions)
- Quick create agent button
- Agent list with status badges
- Real-time refresh (10 second intervals)

### Agents List (`/agents`)
- Search agents by ID or public key
- Filter by status
- Grid view of agents
- Create agent button

### Create Agent (`/agents/create`)
- **Step 1: Basic Info** - Name & type selection
- **Step 2: Configuration** - Type-specific settings
  - **Accumulator:** Vault address, min/max targets, sweep threshold
  - **Distributor:** Min balance, payment recipients (address, amount, memo)
- **Step 3: Review** - Confirm before creating
- Progress indicator
- Form validation with error messages

### Agent Details (`/agents/[id]`)
- Agent public key (copyable)
- Current status with badge
- Balance information
- Recent transactions
- Start/Stop buttons
- Configuration summary
- Live execution monitor (coming)

### Transactions (`/transactions`)
- Transaction history with timeline
- Filter by date, status, agent
- Search functionality
- Export to CSV (coming)

### BYOA Management (`/byoa`)
- Register external agent form
- List of registered agents
- API credentials display (Agent ID, Control Token)
- Integration guide with code examples
- Rate limit info

---

## 🔐 Security Features Implemented

### Wallet Encryption
- ✅ AES-256-GCM encryption at rest
- ✅ scrypt key derivation (N=16384, r=8, p=1)
- ✅ Unique salt per agent, random IV per encryption
- ✅ Keys only decrypted during signing
- ✅ Memory cleared after use

### Key Isolation
- ✅ WalletManager is the ONLY class that touches private keys
- ✅ Agents receive read-only context (no key access)
- ✅ Intent-based execution (agents propose, wallet disposes)
- ✅ Each agent has isolated encrypted keypair

### Input Validation
- ✅ All API inputs validated with Zod
- ✅ Stellar public key format verified
- ✅ XLM amounts validated (positive floats)
- ✅ Memo length checked (28 char max)
- ✅ Address format validation

### Logging & Auditing  
- ✅ No privat keys in logs
- ✅ No secrets in API responses
- ✅ Generic error messages (no info leakage)
- ✅ Structured JSON logging with Pino
- ✅ All critical operations logged

---

## 🧪 Testing Workflow

### Create Test Agent (Accumulator)

```bash
# 1. Get testnet XLM for the vault address
# Visit: https://friendbot.stellar.org
# Paste your agent public key

# 2. Via frontend: /agents/create
# Name: "Test Accumulator"
# Type: Accumulator
# Vault: (testnet address)
# Min: 50 XLM
# Max: 100 XLM
# Sweep Threshold: 1 XLM

# 3. Fund the agent wallet with testnet XLM
# Use the public key from agent details

# 4. Start the agent
# Dashboard → click agent → Start button

# 5. Monitor execution
# Agent details → view recent transactions
```

### Create Test Agent (Distributor)

```bash
# 1. Via frontend: /agents/create
# Name: "Test Distributor"
# Type: Distributor
# Recipient 1: (testnet address)
#   Amount: 10 XLM
# Min Balance: 5 XLM

# 2. Fund agent wallet

# 3. Start agent

# 4. Agent will distribute to recipients every execution cycle
```

---

## 📦 Deployment Guide

### Docker Build

```bash
# Backend
cd backend
docker build -t agentic-wallet-backend:latest .
docker run -p 3001:3001 \
  -e STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015" \
  -e HORIZON_API_URL="https://horizon-testnet.stellar.org" \
  -e WALLET_ENCRYPTION_PASSWORD="your-password" \
  agentic-wallet-backend:latest

# Frontend
cd frontend
docker build -t agentic-wallet-frontend:latest .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL="http://localhost:3001" \
  agentic-wallet-frontend:latest
```

### Docker Compose (TODO)

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      STELLAR_NETWORK_PASSPHRASE: "Test SDF Network ; September 2015"
      HORIZON_API_URL: "https://horizon-testnet.stellar.org"
      WALLET_ENCRYPTION_PASSWORD: "${WALLET_ENCRYPTION_PASSWORD}"

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: "http://localhost:3001"
```

Run: `docker-compose up`

### Production Checklist
- [ ] Use strong encryption password (min 32 characters)
- [ ] Setup database (PostgreSQL) for Phase 2
- [ ] Enable HTTPS/TLS
- [ ] Setup monitoring/alerting
- [ ] Configure CORS properly
- [ ] Setup rate limiting
- [ ] Setup log aggregation
- [ ] Setup health checks
- [ ] Remove debug mode from logs

---

## 🐛 Troubleshooting

### "Insufficient balance" error
- **Cause:** Agent wallet doesn't have enough XLM
- **Fix:** Fund wallet via https://friendbot.stellar.org with testnet XLM

### "Invalid destination address"
- **Cause:** Address doesn't start with 'G' (not a valid Stellar address)
- **Fix:** Use valid Stellar testnet addresses (start with G)

### "Cannot decrypt keypair"
- **Cause:** Wrong encryption password or corrupted wallet data
- **Fix:** Check WALLET_ENCRYPTION_PASSWORD matches when restarting

### Agent not executing
- **Cause:** Agent not started or orchestrator crashed
- **Fix:** Restart agent via dashboard, check server logs

### Frontend can't connect to backend
- **Cause:** Backend not running or wrong API URL
- **Fix:** Verify backend running on 3001, check NEXT_PUBLIC_API_URL

---

## 📚 Architecture Overview

```
FRONTEND (Next.js)
├── Dashboard - Agent overview & stats
├── Agents - Create, manage agents
├── Agent Details - View balance, control, transactions
├── Transactions - History & filtering
├── BYOA - External agent registration
└── Glass Components - Constellation UI design

         ↓ HTTP/REST (Port 3000→3001)

EXPRESS API (Node.js)
├── Health & Stats endpoints
├── Agent CRUD operations
├── Agent control (start/stop)
├── BYOA registration & intents
└── Input validation (Zod)

         ↓ Orchestrates

AGENTS & WALLET LAYER
├── WalletManager - Encryption/signing (AES-256-GCM + scrypt)
├── AccumulatorAgent - Maintains target XLM balance
├── DistributorAgent - Sends regular payments
├── Orchestrator - Validation, execution, event emission
└── StellarClient - Horizon API integration

         ↓ Communicates with

STELLAR NETWORK (Testnet/Mainnet)
└── blockchain operations
```

---

## 📖 Project Structure

```
FLASH/
├── backend/
│   ├── src/
│   │   ├── wallet/ → Encryption & signing
│   │   ├── stellar/ → Horizon API integration
│   │   ├── agent/ → Agent strategies
│   │   ├── orchestrator/ → Execution loop
│   │   ├── api/ → Express endpoints
│   │   ├── types/ → TypeScript definitions
│   │   ├── utils/ → Logger & helpers
│   │   └── index.ts → Entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx → Landing page
│   │   │   ├── dashboard/ → Dashboard
│   │   │   ├── agents/ → Agent pages
│   │   │   ├── transactions/ → History
│   │   │   ├── byoa/ → External agents
│   │   │   ├── layout.tsx → Root layout
│   │   │   └── Providers.tsx → TanStack Query
│   │   ├── components/
│   │   │   ├── glass/ → Glass component library
│   │   │   ├── layout/ → TopNav, MobileNav
│   │   │   └── common/ → StatusBadge, etc
│   │   ├── lib/
│   │   │   └── api.ts → API client
│   │   └── styles/ → Constellation theme
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── .env.example
│
└── docs/
    ├── ARCHITECTURE.md
    ├── API.md
    ├── SECURITY.md
    ├── DEPLOYMENT.md
    └── TESTING.md
```

---

## 🎨 Design System

### Colors (Constellation Blue Glassmorphism)
- **Orion Blue:** #0D1B4D (primary background)
- **Pegasus Cyan:** #00D9FF (accents, active states)
- **Sirius Purple:** #7C3AED (secondary, gradients)
- **Nebula Indigo:** #312E81 (variant)
- **Polaris White:** #F8FAFC (text default)

### Glass Effect
- Backdrop blur: 20px
- Background: rgba(30, 58, 95, 0.4)
- Border: 1px solid rgba(0, 217, 255, 0.2)
- Box shadow: 0 8px 32px rgba(0, 0, 0, 0.2)

### Animations
- Transitions: 0.2-0.4s ease
- Glow effects on hover
- Pulse animation on active agents
- Float-up entrance animations

---

## 📝 License

MIT License - See LICENSE file

---

## 🤝 Contributing

This project is production-ready. For modifications:

1. Maintain security constraints (keys never leave WalletManager)
2. Validate all inputs with Zod
3. Keep agent context read-only
4. Log without exposing secrets
5. Test on testnet before mainnet

---

**Ready to deploy!** Fund test wallets and create your first agent via the dashboard.
