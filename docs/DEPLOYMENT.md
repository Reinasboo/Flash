# Deployment & Production Guide

Instructions for deploying the agentic wallet platform to production on Stellar mainnet.

---

## Pre-Deployment Checklist

### Security
- [ ] Wallet encryption password is strong (>20 chars, random)
- [ ] Encryption password stored in secure secret manager (not git)
- [ ] HTTPS/TLS enabled (certificate provisioned)
- [ ] CORS configured for frontend domain only
- [ ] Rate limiting enabled on all endpoints
- [ ] Input validation (Zod) on all endpoints
- [ ] Error handling: No secrets in error responses
- [ ] Logging: No secrets logged ever
- [ ] API auth configured (OAuth, API keys, etc.)

### Testing
- [ ] All unit tests passing
- [ ] Integration tests on testnet passing
- [ ] End-to-end scenario tested (agent creation → payment)
- [ ] Load test completed (10+ concurrent agents)
- [ ] Failure scenarios tested (insufficient balance, invalid address, etc.)

### Infrastructure
- [ ] Database configured (for persistent key storage - Phase 2)
- [ ] Backup strategy implemented
- [ ] Monitoring & alerting configured
- [ ] Log aggregation setup
- [ ] CDN provisioned (for frontend)
- [ ] Domain configured

---

## Stellar Mainnet Configuration

### 1. Update Environment Variables

**Backend** (`.env`):
```bash
# Network
STELLAR_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015
HORIZON_API_URL=https://horizon.stellar.org

# Security
WALLET_ENCRYPTION_PASSWORD=${VAULT_WALLET_PASSWORD}  # From secret manager
NODE_ENV=production

# Server
PORT=443
DOMAIN=api.example.com

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=${SENTRY_DSN}  # Error tracking
```

**Frontend** (`.env.production`):
```bash
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_ENVIRONMENT=production
```

### 2. Generate Stellar Account (Operations Account)

For the system to have an operational wallet (optional, for agent coordination):

Use [Stellar Lab](https://developers.stellar.org/docs/tools/lab):
- Generate keypair
- Fund via exchange or custodian
- Store secret securely in secret manager

---

## Docker Deployment

### Backend Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine as builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/src ./src
COPY backend/tsconfig.json ./
RUN npm run build

# Runtime stage
FROM node:18-alpine
WORKDIR /app
RUN npm install -g npm@latest
COPY backend/package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### Frontend Dockerfile

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    environment:
      STELLAR_NETWORK_PASSPHRASE: "Public Global Stellar Network ; September 2015"
      HORIZON_API_URL: "https://horizon.stellar.org"
      WALLET_ENCRYPTION_PASSWORD: ${WALLET_ENCRYPTION_PASSWORD}
      NODE_ENV: production
    ports:
      - "3001:3001"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./frontend
    environment:
      NEXT_PUBLIC_API_URL: "https://api.example.com"
    ports:
      - "3000:3000"
    restart: unless-stopped
    depends_on:
      - backend
```

---

## Kubernetes Deployment

### Backend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agentic-wallet-backend
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
  selector:
    matchLabels:
      app: agentic-wallet-backend
  template:
    metadata:
      labels:
        app: agentic-wallet-backend
    spec:
      containers:
      - name: backend
        image: your-registry/agentic-wallet-backend:latest
        ports:
        - containerPort: 3001
        env:
        - name: STELLAR_NETWORK_PASSPHRASE
          value: "Public Global Stellar Network ; September 2015"
        - name: HORIZON_API_URL
          value: "https://horizon.stellar.org"
        - name: WALLET_ENCRYPTION_PASSWORD
          valueFrom:
            secretKeyRef:
              name: wallet-secrets
              key: encryption-password
        - name: NODE_ENV
          value: "production"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

---
apiVersion: v1
kind: Service
metadata:
  name: agentic-wallet-backend
spec:
  selector:
    app: agentic-wallet-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
  type: LoadBalancer
```

---

## Monitoring & Observability

### Sentry (Error Tracking)

```typescript
// backend/src/utils/sentry.ts
import * as Sentry from "@sentry/node";

export function initSentry() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
    });
  }
}

// In main server setup
app.use(Sentry.Handlers.errorHandler());
```

### Datadog (APM & Logs)

```bash
# helm install datadog datadog/datadog \
#   --set datadog.apiKey=$DD_API_KEY \
#   --set datadog.appKey=$DD_APP_KEY
```

### Prometheus Metrics

```typescript
// backend/src/utils/metrics.ts
import prometheus from "prom-client";

export const agentCreatedCounter = new prometheus.Counter({
  name: "agentic_wallet_agents_created_total",
  help: "Total agents created",
});

export const transactionExecutedCounter = new prometheus.Counter({
  name: "agentic_wallet_transactions_executed_total",
  help: "Total transactions executed",
  labelNames: ["status"],
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

---

## Database Setup (Phase 2)

For persistent key storage and audit logs:

### PostgreSQL

```sql
-- Keys table
CREATE TABLE agent_keys (
  id UUID PRIMARY KEY,
  agent_id VARCHAR(255) UNIQUE NOT NULL,
  public_key VARCHAR(56) NOT NULL,
  encrypted_keypair JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit log table
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(255),
  event_type VARCHAR(255),
  details JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_agent_id ON audit_logs(agent_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
```

---

## SSL/TLS Certificate

### Let's Encrypt (Free)

```bash
# Using Certbot
certbot certonly --standalone -d api.example.com

# Certificate will be at:
# /etc/letsencrypt/live/api.example.com/fullchain.pem
# /etc/letsencrypt/live/api.example.com/privkey.pem

# Auto-renewal (runs twice daily)
certbot renew
```

### Configure in Express

```typescript
import https from "https";
import fs from "fs";

const key = fs.readFileSync("/etc/letsencrypt/live/api.example.com/privkey.pem");
const cert = fs.readFileSync("/etc/letsencrypt/live/api.example.com/fullchain.pem");

https.createServer({ key, cert }, app).listen(443, () => {
  logger.info("HTTPS server listening on port 443");
});
```

---

## CDN Setup (Frontend)

### Cloudflare

1. Add domain to Cloudflare
2. Update DNS nameservers
3. Configure cache rules
4. Enable HTTP/2, brotli compression
5. Set security level to "Medium"

### Next.js Export

```bash
npm run build
npm run export  # Generate static site
```

Upload to Cloudflare Pages for automatic deployment.

---

## Backup & Disaster Recovery

### Key Backup

```bash
# Backup encrypted keys daily
aws s3 cp backend/keys.backup s3://my-backups/keys-$(date +%Y%m%d).backup \
  --sse-c --sse-c-key=${BACKUP_KEY}
```

### Database Backup

```bash
# PostgreSQL dump (daily)
pg_dump -h db.prod.example.com -U admin -W > backup-$(date +%Y%m%d).sql

# Encrypt and upload
gpg --symmetric backup-*.sql
aws s3 cp backup-*.sql.gpg s3://my-backups/
```

### Recovery Procedure

1. Restore database from latest backup
2. Restore encrypted keys from S3
3. Update `WALLET_ENCRYPTION_PASSWORD` in secret manager
4. Restart services

---

## Scalability

### Horizontal Scaling

**Backend (stateless):**
- Deploy multiple instances behind load balancer
- Each instance can run any agent
- Scale based on CPU/memory utilization

**Frontend (static):**
- Deploy to CDN edge nodes
- Cache aggressively
- Scale globally

### Database Connections

```typescript
// Connection pooling
import { Pool } from "pg";

const pool = new Pool({
  max: 20,  // Max connections
  min: 5,   // Min connections
  idleTimeoutMillis: 30000,
});
```

---

## Cost Optimization

### Stellar Network Fees

- **Base Fee:** 100 stroops (~$0.0001) per operation
- **Typical Tx:** 1-3 operations = 0.0001-0.0003 XLM per tx
- **Budget:** 10,000 transactions/month ≈ $0.30-0.90 USD

### Compute

- **Backend:** t3.small (AWS) = $10-20/month
- **Frontend CDN:** Cloudflare free tier or Pages
- **Database:** db.t4g.small ≈ $20/month
- **Monitoring:** Datadog free tier

**Monthly Cost:** ~$50-100 for reasonable scale

---

## Compliance & Security

### SOC 2 Compliance

- [ ] Change management
- [ ] Access control & audit logs
- [ ] Incident response plan
- [ ] Regular security audits
- [ ] Penetration testing

### Data Privacy (GDPR, CCPA)

- [ ] Data retention policy (delete logs after 90 days)
- [ ] User data export capability
- [ ] Right to be forgotten implementation
- [ ] Privacy policy on website

### Encryption

- [ ] TLS 1.2+ for all traffic
- [ ] AES-256-GCM for key storage
- [ ] Database encryption at rest
- [ ] Backups encrypted

---

## Post-Deployment

### Monitoring Checklist

- [ ] System uptime >99.5%
- [ ] API response time <500ms
- [ ] Error rate <0.1%
- [ ] Database latency <50ms
- [ ] No unauthorized access attempts

### Gradual Rollout

1. **Week 1:** Beta with testnet funds
2. **Week 2-3:** Trusted partners (early access)
3. **Week 4+:** General availability

### Update Procedure

1. Test updates on staging
2. Blue-green deployment
3. Gradual rollout (10% → 25% → 50% → 100%)
4. Monitor metrics

---

## Support & Questions

For deployment help:
- Email: support@example.com
- Slack: #agentic-wallet-ops
- GitHub: Issues & Discussions

Define SLA:
- Response time: 1 hour
- Resolution time: 4 hours
- Office hours or 24/7 support
