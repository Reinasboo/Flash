# BYOA (Bring Your Own Agent) - Production System Prompt

## VISION & SCOPE

Build a **production-grade BYOA (Bring Your Own Agent) subsystem** that allows external entities to register autonomous agents and submit financial intents to the Agentic Wallet Platform on Stellar. BYOA must be:

- **Secure**: External agents cannot escalate privileges, access other agents' wallets, or compromise the system
- **Scalable**: Handle 1000s of external agents and 10,000s of intents/hour
- **Observable**: Full audit trail, monitoring, rate limiting, and metrics
- **Reliable**: Graceful degradation, retry logic, webhook redundancy
- **Developer-friendly**: Clear API, SDKs, documentation, sandbox environment

---

## SECURITY MODEL

### Control Token Architecture
```
1. Registration Flow:
   POST /byoa/register
   ├── System generates agent_id (UUID)
   ├── System generates control_token (crypto.randomBytes(32).toString('hex'))
   ├── System hashes control_token with SHA-256
   ├── Returns: { agent_id, wallet, control_token } (token shown ONCE only)
   └── Stores: { agent_id, token_hash, created_at, created_by, permissions }

2. Intent Submission Flow:
   POST /byoa/intents
   ├── Header: X-Agent-ID: <agent_id>
   ├── Header: X-Control-Token-Hash: SHA-256(control_token)
   ├── System retrieves agent config by agent_id
   ├── System compares submitted hash to stored hash
   ├── If match: agent is authenticated
   ├── If mismatch: 401 Unauthorized (log attempt, increment failure counter)
   └── Rate limit applied per agent
```

### Permission Model
```typescript
interface AgentPermissions {
  can_submit_intents: boolean;
  can_modify_config: boolean;
  can_view_balance: boolean;
  can_view_transaction_history: boolean;
  intent_types_allowed: ['TRANSFER_XLM', 'CREATE_TRUSTLINE'];
  max_transfer_amount: string; // XLM
  max_intents_per_hour: number;
}
```

### Isolation Guarantees
- ✅ External agents cannot revoke their own control token
- ✅ External agents cannot access another agent's wallet
- ✅ External agents cannot modify another agent's config
- ✅ External agents cannot read other agents' transaction history
- ✅ External agents cannot modify system settings or escalate permissions
- ✅ Rate limiting prevents DDoS from single agent
- ✅ Intent validation prevents invalid operations from reaching wallet layer

---

## API SPECIFICATION

### 1. Register External Agent

**Endpoint**: `POST /byoa/register`

**Purpose**: Register a new external agent and create a wallet for it

**Request**:
```json
{
  "name": "Treasury Bot v2",
  "description": "Automated treasury management for protocol treasury",
  "webhook_url": "https://external-system.com/webhook/stellar",
  "webhook_secret": "secret_for_hmac_verification",
  "contact_email": "contact@example.com",
  "metadata": {
    "organization": "MyProtocol",
    "environment": "production"
  }
}
```

**Validation**:
- `name`: 1-128 characters, alphanumeric + spaces
- `description`: 0-512 characters
- `webhook_url`: Valid HTTPS URL (required for production)
- `webhook_secret`: 32+ characters (used for HMAC-SHA256 signing)
- `contact_email`: Valid email format

**Response** (201 Created):
```json
{
  "success": true,
  "agent": {
    "id": "agent_550e8400e29b41d4a716446655440000",
    "name": "Treasury Bot v2",
    "wallet": "GBGFNCNRFXYXFNX5PXQVS3YZAZAQVKFQMXQJ7VVZC3MXVVJVZC3MXQV2",
    "status": "active",
    "created_at": "2026-04-01T10:30:00Z",
    "created_by": "user_id_or_email"
  },
  "wallet_info": {
    "public_key": "GBGFNCNRFXYXFNX5PXQVS3YZAZAQVKFQMXQJ7VVZC3MXVVJVZC3MXQV2",
    "needs_funding": true,
    "min_funded_amount": "10.00"
  },
  "credentials": {
    "control_token": "550e8400e29b41d4a716446655440000550e8400e29b41d4a716446655440000",
    "note": "Save this token securely. You will not be able to see it again. Use it in the X-Control-Token-Hash header (value: SHA-256(control_token)) for all requests."
  },
  "api_docs": "https://docs.agentic-wallet.io/byoa"
}
```

**Errors**:
- `400 Bad Request`: Invalid input (name too long, invalid email, etc.)
- `409 Conflict`: Agent name already exists
- `500 Internal Server Error`: Wallet creation failed (log internally, return generic message)

**Rate Limiting**: 10 registrations per IP per hour

---

### 2. Update External Agent Config

**Endpoint**: `PUT /byoa/agents/:agent_id/config`

**Purpose**: Update webhook URL, permissions, or metadata

**Request**:
```json
{
  "webhook_url": "https://new-webhook.com/stellar",
  "webhook_secret": "new_secret_for_hmac",
  "permissions": {
    "can_submit_intents": true,
    "can_modify_config": false,
    "can_view_balance": true,
    "max_transfer_amount": "100000.00",
    "max_intents_per_hour": 100
  },
  "metadata": {
    "environment": "staging"
  }
}
```

**Authentication**: Required
- Header: `X-Agent-ID: <agent_id>`
- Header: `X-Control-Token-Hash: SHA-256(control_token)`

**Response** (200 OK):
```json
{
  "success": true,
  "agent": { ... updated agent object ... }
}
```

**Errors**:
- `401 Unauthorized`: Invalid control token
- `403 Forbidden`: Agent doesn't have permission to modify config
- `404 Not Found`: Agent doesn't exist
- `422 Unprocessable Entity`: Invalid permission values

---

### 3. Submit Intents

**Endpoint**: `POST /byoa/agents/:agent_id/intents`

**Purpose**: Submit financial intents for execution

**Request**:
```json
{
  "idempotency_key": "550e8400-e29b-41d4-a716-446655440000",
  "intents": [
    {
      "type": "TRANSFER_XLM",
      "params": {
        "destination": "GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTTNUVES35LSKNQRMTFSLOGGJU",
        "amount": "50.00",
        "memo": "monthly_distribution"
      }
    },
    {
      "type": "CREATE_TRUSTLINE",
      "params": {
        "assetCode": "STABLE",
        "issuer": "GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTTNUVES35LSKNQRMTFSLOGGJU"
      }
    }
  ]
}
```

**Fields**:
- `idempotency_key`: UUID (prevents duplicate processing if request retried)
- `intents`: Array of 1-50 intents per request
- `type`: TRANSFER_XLM, CREATE_TRUSTLINE, MANAGE_OFFER
- `params`: Type-specific parameters

**Authentication**: Required
- Header: `X-Agent-ID: <agent_id>`
- Header: `X-Control-Token-Hash: SHA-256(control_token)`

**Response** (202 Accepted - async processing):
```json
{
  "success": true,
  "submission_id": "sub_550e8400e29b41d4a716446655440000",
  "intents_accepted": 2,
  "intents_rejected": 0,
  "queue_position": 1,
  "estimated_execution_time_ms": 5000,
  "details": [
    {
      "intent_index": 0,
      "type": "TRANSFER_XLM",
      "status": "queued",
      "intent_id": "intent_550e8400e29b41d4a716446655440000",
      "message": "Queued for execution"
    },
    {
      "intent_index": 1,
      "type": "CREATE_TRUSTLINE",
      "status": "queued",
      "intent_id": "intent_550e8400e29b41d4a716446655440001",
      "message": "Queued for execution"
    }
  ]
}
```

**Response** (400 Bad Request - validation error):
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "intent_index": 0,
      "error": "Destination address invalid: must be valid Stellar public key"
    },
    {
      "intent_index": 2,
      "error": "Amount 50000.00 XLM exceeds max allowed 10000.00 XLM"
    }
  ]
}
```

**Validation Rules**:
- Max 50 intents per request
- Idempotency key checked - if duplicate found within 24h, return previous result
- Total XLM requested across all TRANSFER intents vs agent's permission limit
- Destination addresses must be valid Stellar public keys
- Amounts must be positive, max 2 decimal places
- Asset codes must be 1-12 alphanumeric characters
- No more than X intents per hour per agent (rate limit)

**Rate Limiting**:
- 100 requests/hour per agent (configurable per agent)
- 50 intents/hour per agent (configurable)
- 429 Too Many Requests if exceeded

**Errors**:
- `400 Bad Request`: Invalid intent parameters
- `401 Unauthorized`: Invalid control token
- `403 Forbidden`: Agent exceeded rate limit or permission limits
- `404 Not Found`: Agent doesn't exist
- `409 Conflict`: Idempotency key collision
- `422 Unprocessable Entity`: Intent type not allowed for this agent

---

### 4. Get Intent Status

**Endpoint**: `GET /byoa/agents/:agent_id/intents/:intent_id`

**Purpose**: Poll for intent execution status

**Authentication**: Required (same headers)

**Response**:
```json
{
  "success": true,
  "intent": {
    "id": "intent_550e8400e29b41d4a716446655440000",
    "agent_id": "agent_550e8400e29b41d4a716446655440000",
    "type": "TRANSFER_XLM",
    "params": {
      "destination": "GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTTNUVES35LSKNQRMTFSLOGGJU",
      "amount": "50.00"
    },
    "status": "executed",
    "status_history": [
      {
        "status": "queued",
        "timestamp": "2026-04-01T10:30:00Z"
      },
      {
        "status": "validating",
        "timestamp": "2026-04-01T10:30:01Z"
      },
      {
        "status": "executing",
        "timestamp": "2026-04-01T10:30:02Z"
      },
      {
        "status": "executed",
        "timestamp": "2026-04-01T10:30:03Z",
        "tx_hash": "5f22de17e79e4f3ac559b8c1fddec2dcc3c38c996dd2bdf8ce1b387c20e68f02"
      }
    ],
    "execution_result": {
      "success": true,
      "tx_hash": "5f22de17e79e4f3ac559b8c1fddec2dcc3c38c996dd2bdf8ce1b387c20e68f02",
      "tx_link": "https://stellar.expert/explorer/testnet/tx/5f22de17e79e4f3ac559b8c1fddec2dcc3c38c996dd2bdf8ce1b387c20e68f02"
    }
  }
}
```

**Status Progression**:
```
queued → validating → executing → executed (success)
                   ↓
                 rejected (validation error)
                   ↓
                  failed (execution error)
```

---

### 5. Get Agent Info

**Endpoint**: `GET /byoa/agents/:agent_id`

**Purpose**: Get current agent status, balance, permissions

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "agent": {
    "id": "agent_550e8400e29b41d4a716446655440000",
    "name": "Treasury Bot v2",
    "wallet": "GBGFNCNRFXYXFNX5PXQVS3YZAZAQVKFQMXQJ7VVZC3MXVVJVZC3MXQV2",
    "status": "active",
    "balance": {
      "native": "1500.5000000",
      "assets": {
        "STABLE": { "balance": "5000.0000000", "issuer": "G..." }
      }
    },
    "permissions": {
      "can_submit_intents": true,
      "can_view_balance": true,
      "intent_types_allowed": ["TRANSFER_XLM", "CREATE_TRUSTLINE"],
      "max_transfer_amount": "100000.00",
      "max_intents_per_hour": 100
    },
    "rate_limit_status": {
      "intents_submitted_this_hour": 23,
      "max_intents_per_hour": 100,
      "requests_made_this_hour": 45,
      "max_requests_per_hour": 200
    },
    "statistics": {
      "total_intents_submitted": 1250,
      "total_intents_executed": 1245,
      "total_intents_failed": 5,
      "total_xem_transferred": "125000.00",
      "created_at": "2026-01-01T00:00:00Z",
      "last_intent_at": "2026-04-01T10:30:00Z"
    }
  }
}
```

---

### 6. Get Agent Transactions

**Endpoint**: `GET /byoa/agents/:agent_id/transactions?limit=50&offset=0`

**Purpose**: View transaction history (read-only, if permission granted)

**Query Parameters**:
- `limit`: 1-500 (default 50)
- `offset`: 0+
- `status`: all, success, pending, failed
- `type`: all, transfer, trustline, offer
- `start_date`: ISO 8601 date
- `end_date`: ISO 8601 date

**Response**:
```json
{
  "success": true,
  "transactions": [
    {
      "tx_hash": "5f22de17e79e4f3ac559b8c1fddec2dcc3c38c996dd2bdf8ce1b387c20e68f02",
      "intent_id": "intent_...",
      "type": "TRANSFER_XLM",
      "status": "success",
      "amount": "50.00",
      "destination": "GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTTNUVES35LSKNQRMTFSLOGGJU",
      "memo": "monthly_distribution",
      "created_at": "2026-04-01T10:30:00Z",
      "confirmed_at": "2026-04-01T10:30:05Z",
      "link": "https://stellar.expert/explorer/testnet/tx/..."
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 1245
  }
}
```

---

## WEBHOOK INTEGRATION

### Event Payload Structure
```json
{
  "id": "event_550e8400e29b41d4a716446655440000",
  "timestamp": "2026-04-01T10:30:00Z",
  "type": "intent.executed",
  "agent_id": "agent_550e8400e29b41d4a716446655440000",
  "data": {
    "intent_id": "intent_...",
    "submission_id": "sub_...",
    "type": "TRANSFER_XLM",
    "status": "executed",
    "result": {
      "success": true,
      "tx_hash": "5f22de17e79e4f3ac559b8c1fddec2dcc3c38c996dd2bdf8ce1b387c20e68f02"
    }
  },
  "signature": "HMAC-SHA256(webhook_secret, JSON.stringify(data))"
}
```

### Webhook Events
```
- intent.submitted     : Intent received and queued
- intent.validating    : Intent in validation phase
- intent.executing     : Intent being submitted to blockchain
- intent.executed      : Intent successfully executed
- intent.rejected      : Intent validation failed
- intent.failed        : Intent execution failed
- agent.registered     : New agent created
- agent.suspended      : Agent suspended (too many errors)
- agent.balance_low    : Agent balance dropped below threshold
```

### Webhook Retry Logic
```
Attempt 1: Immediate
Attempt 2: 5 seconds delay
Attempt 3: 25 seconds delay
Attempt 4: 120 seconds delay
Attempt 5: 600 seconds delay

Max retries: 5
Timeout: 10 seconds per attempt
```

### Webhook Security
- ✅ Always HTTPS (no HTTP allowed in production)
- ✅ HMAC-SHA256 signature verification mandatory
- ✅ Signature in header: `X-Webhook-Signature`
- ✅ Timestamp in header: `X-Webhook-Timestamp` (prevent replay > 5 min)
- ✅ Event ID in header: `X-Webhook-Event-ID` (prevent duplicate processing)
- ✅ Idempotency: events with same ID should be idempotent on receiver

---

## RATE LIMITING & QUOTAS

### Default Limits (Per Agent)
| Metric | Limit | Window | Configurable |
|--------|-------|--------|--------------|
| Intent Submissions | 100 | hour | Yes |
| API Requests | 1000 | hour | Yes |
| Registration | 10 | hour | System-wide |
| Intents per Request | 50 | per request | No |
| Max Transfer Amount | 1,000,000 XLM | per transfer | Yes |
| Webhook Retries | 5 | per attempt | System |

### Rate Limit Headers
All responses include:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1712052600
X-RateLimit-ResetIn: 3599
```

### Quota Enforcement
```typescript
// Per-agent quota tracking
interface AgentQuota {
  agent_id: string;
  reset_time: Date;
  intents_submitted: number;
  intents_limit: number;
  requests_made: number;
  requests_limit: number;
  xem_transferred: string;
  xem_limit: string;
}

// When quota exceeded:
// 1. Log event (agent_id, quota_type, current, limit)
// 2. Return 429 with retry-after header
// 3. Send webhook event (agent.quota_exceeded)
// 4. After 3 quota violations in 24h: suspend agent, send admin notification
```

---

## AUTHENTICATION & AUTHORIZATION

### Control Token Hashing Flow
```typescript
// Client side
control_token = "550e8400e29b41d4a716446655440000..."
token_hash = SHA256(control_token)

// Header
X-Agent-ID: agent_550e8400...
X-Control-Token-Hash: 5f22de17e79e4f3ac559b8c1fddec2dcc3c38c996dd2bdf8ce1b387c20e68f02

// Server side
stored_hash = get_agent_token_hash(agent_id)
if (constant_time_compare(token_hash, stored_hash)) {
  // Authenticated
} else {
  // Log security event
  // 401 Unauthorized
}
```

### Permission Checks
```typescript
// Before executing intent
const agent = await db.agents.get(agent_id);
const validation = {
  has_permission_for_type: agent.permissions.intent_types_allowed.includes(intent.type),
  respects_amount_limit: intent.params.amount <= agent.permissions.max_transfer_amount,
  respects_rate_limit: current_hour_count < agent.permissions.max_intents_per_hour,
  agent_is_active: agent.status === 'active',
};

if (!all_valid(validation)) {
  return 403 Forbidden with specific reason
}
```

---

## ERROR HANDLING & RESILIENCE

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded the 100 intents per hour limit",
    "details": {
      "limit": 100,
      "current": 100,
      "reset_at": "2026-04-01T11:30:00Z"
    }
  },
  "request_id": "req_550e8400e29b41d4a716446655440000"
}
```

### HTTP Status Codes
```
200 OK                 - Synchronous success
201 Created            - Resource created
202 Accepted           - Async request accepted
400 Bad Request        - Invalid parameters
401 Unauthorized       - Invalid authentication
403 Forbidden          - Permission denied / rate limited
404 Not Found          - Resource doesn't exist
409 Conflict           - Idempotency key collision
422 Unprocessable      - Semantic error (invalid intent)
429 Too Many Requests  - Rate limit exceeded
500 Internal Error     - Server error (generic, log internally)
503 Service Unavailable- Maintenance mode
```

### Circuit Breaker (Per Agent)
```
If agent's last 10 intents have >50% failure rate:
1. Reduce max_intents_per_hour to 10
2. Require manual review for next intent
3. Send webhook event: agent.circuit_breaker_activated
4. Send email notification to agent contact
5. Auto-reset after 24h if errors resolve
```

---

## MONITORING & OBSERVABILITY

### Metrics to Track
```
COUNTER:
  byoa_registrations_total{status: success|fail}
  byoa_intent_submissions_total{type, status}
  byoa_authentication_failures_total{reason}
  byoa_rate_limit_violations_total{agent_id}

GAUGE:
  byoa_active_agents
  byoa_agents_suspended
  byoa_queued_intents
  byoa_webhooks_failing

HISTOGRAM:
  byoa_intent_execution_duration_ms
  byoa_api_response_time_ms{endpoint, status}
  byoa_webhook_delivery_time_ms

HISTOGRAM (percentiles for SLA):
  intent_submission_latency_p50, p95, p99
  intent_execution_time_p50, p95, p99
```

### Logs
```
Every operation logs:
{
  timestamp: ISO 8601,
  service: "byoa",
  request_id: uuid,
  agent_id: encrypted_if_sensitive,
  action: "intent_submitted|authentication_failed|rate_limited",
  status: "success|error",
  metadata: {
    intent_type: "TRANSFER_XLM",
    intents_count: 5,
    error_code: "VALIDATION_FAILED",
    error_message: generic_no_secrets
  }
}
```

### Alerts
```
Alert if:
1. Agent submission rate > 150% of configured limit (30 min window)
2. Single agent's webhook failure rate > 20% (continuous)
3. System intent queue depth > 10,000 intents
4. API response time p95 > 5 seconds
5. Authentication failure rate > 100/min (potential attack)
6. More than 10 agents suspended in last hour
```

---

## SDK & CLIENT LIBRARIES

### TypeScript/JavaScript SDK
```typescript
import { ByoaClient } from '@agentic-wallet/byoa-sdk';

const client = new ByoaClient({
  apiUrl: 'https://api.agentic-wallet.io',
  agentId: 'agent_...',
  controlToken: '550e8400...',
  webhookSecret: 'webhook_secret_...',
});

// Register intent
const submission = await client.submitIntents([
  {
    type: 'TRANSFER_XLM',
    params: {
      destination: 'G...',
      amount: '50.00',
      memo: 'payment',
    },
  },
]);

// Listen for events
client.onIntentExecuted((intent) => {
  console.log(`Intent ${intent.id} executed:`, intent.tx_hash);
});

// Poll for status
const status = await client.getIntentStatus(submission.intents[0].intent_id);
```

### Python SDK
```python
from agentic_wallet_byoa import ByoaClient

client = ByoaClient(
    api_url="https://api.agentic-wallet.io",
    agent_id="agent_...",
    control_token="550e8400..."
)

response = client.submit_intents(intents=[
    {
        "type": "TRANSFER_XLM",
        "params": {
            "destination": "G...",
            "amount": "50.00"
        }
    }
])

status = client.get_intent_status(response.intents[0].intent_id)
```

---

## TESTING STRATEGY

### Unit Tests
- Token hashing and comparison (no timing attacks)
- Permission validation logic
- Rate limit enf enforcement
- Intent parameter validation
- Idempotency key deduplication

### Integration Tests
- Full registration → funding → intent submission → execution flow
- Multi-intent batch processing
- Webhook delivery and retry
- Rate limiting across multiple agents
- Permission boundary testing (agent A cannot access agent B)
- Token rotation and revocation

### Load Testing
- 1000 concurrent agents submitting intents
- 10,000 intents/hour sustained
- Webhook delivery at scale
- Database query performance under load
- Rate limiting accurate under high load

### Security Tests
- Attempt token reuse with different agent_id
- Attempt to submit intents for non-existent agent
- Brute force control token (should be costly)
- SQL injection in parameters
- XSS in webhook payload names
- CSRF on POST endpoints

### Chaos Testing
- Webhook service down (should retry, eventually succeed)
- Database failure (should circuit break gracefully)
- Rate limiter misconfiguration
- Network latency on Stellar submission

---

## PRODUCTION DEPLOYMENT

### Database Schema (PostgreSQL)
```sql
CREATE TABLE byoa_agents (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  public_key VARCHAR(56) NOT NULL UNIQUE,
  secret_key_encrypted VARCHAR(512) NOT NULL,
  status ENUM('active', 'suspended', 'blocked', 'deleted'),
  created_at TIMESTAMP NOT NULL,
  created_by VARCHAR(255),
  updated_at TIMESTAMP NOT NULL,
  contact_email VARCHAR(255),
  metadata JSONB
);

CREATE TABLE byoa_credentials (
  agent_id UUID PRIMARY KEY REFERENCES byoa_agents(id),
  control_token_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  rotated_at TIMESTAMP
);

CREATE TABLE byoa_permissions (
  agent_id UUID PRIMARY KEY REFERENCES byoa_agents(id),
  can_submit_intents BOOLEAN DEFAULT true,
  can_modify_config BOOLEAN DEFAULT false,
  can_view_balance BOOLEAN DEFAULT true,
  intent_types_allowed TEXT[],
  max_transfer_amount DECIMAL(20, 8),
  max_intents_per_hour INTEGER,
  permissions_json JSONB
);

CREATE TABLE byoa_webhooks (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES byoa_agents(id),
  url VARCHAR(2048) NOT NULL,
  secret_encrypted VARCHAR(512),
  events TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  last_tried_at TIMESTAMP,
  last_success_at TIMESTAMP
);

CREATE TABLE byoa_webhook_events (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES byoa_agents(id),
  event_type VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  status ENUM('pending', 'delivered', 'failed'),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP,
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP
);

CREATE TABLE byoa_intents (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES byoa_agents(id),
  submission_id UUID NOT NULL,
  type VARCHAR(64) NOT NULL,
  params JSONB NOT NULL,
  status ENUM('queued', 'validating', 'executing', 'executed', 'rejected', 'failed'),
  result JSONB,
  tx_hash VARCHAR(64),
  created_at TIMESTAMP,
  executed_at TIMESTAMP
);

CREATE TABLE byoa_audit_log (
  id UUID PRIMARY KEY,
  agent_id UUID,
  action VARCHAR(64),
  success BOOLEAN,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_byoa_agents_status ON byoa_agents(status);
CREATE INDEX idx_byoa_intents_agent ON byoa_intents(agent_id, created_at DESC);
CREATE INDEX idx_byoa_webhook_events_agent ON byoa_webhook_events(agent_id, status);
```

### Environment Variables
```bash
# API Configuration
BYOA_API_ENABLED=true
BYOA_MAX_INTENTS_PER_REQUEST=50
BYOA_DEFAULT_RATE_LIMIT=100

# Webhook Configuration
BYOA_WEBHOOK_TIMEOUT_MS=10000
BYOA_WEBHOOK_MAX_RETRIES=5
BYOA_WEBHOOK_VERIFY_SSL=true

# Rate Limiting
BYOA_REDIS_URL=redis://localhost:6379
BYOA_RATE_LIMIT_WINDOW_MS=3600000

# Database
BYOA_DB_URL=postgresql://user:pass@localhost/agentic_wallet
BYOA_DB_POOL_SIZE=20
BYOA_DB_STATEMENT_CACHE_SIZE=100

# Monitoring
BYOA_METRICS_ENABLED=true
BYOA_METRICS_PORT=9090
BYOA_TRACING_ENABLED=true
BYOA_TRACING_SAMPLE_RATE=0.1
```

### Disaster Recovery
```
1. Agent Control Token Rotation
   - Issue new control token
   - Invalidate old token (but don't delete immediately)
   - 7-day grace period for old token
   - After 7 days: delete old token

2. Agent Suspension / Recovery
   - If >50% failure rate: auto-suspend
   - Manual review required to reactivate
   - Log all suspension/reactivation actions

3. Incident Response
   - Alert to on-call if rate limit violations > 1000/min
   - Automatic agent rate limiting reduction
   - Fallback to non-BYOA operations only if needed
   - Detailed post-mortem in ops channel
```

---

## DOCUMENTATION REQUIREMENTS

### For External Developers
1. **Getting Started Guide**: 5-minute quickstart (register, fund, submit intent)
2. **API Reference**: Every endpoint with example requests/responses
3. **SDK Documentation**: Each SDK with usage examples
4. **Webhook Guide**: Event types, payload format, testing webhooks locally
5. **Best Practices**: Rate limiting, retry logic, error handling
6. **Sandbox Environment**: Separate testnet for development
7. **Status Page**: https://status.agentic-wallet.io

### API Documentation
- OpenAPI 3.0 spec (auto-generated from code)
- Postman collection (importable)
- Interactive API explorer (like Swagger UI)
- cURL examples for every endpoint

---

## SUCCESS CRITERIA

1. ✅ External agents can register without requiring backend access
2. ✅ Control tokens are cryptographically secure (minimum 256 bits entropy)
3. ✅ Intents from external agents execute with same safety guarantees as internal agents
4. ✅ Rate limiting enforced per agent, prevents abuse
5. ✅ Webhook delivery reliable (retry logic works, <5% failure rate)
6. ✅ API responds in <2 seconds under normal load, <5 seconds under high load
7. ✅ Zero security breaches: external agents cannot escalate privileges
8. ✅ Full audit trail: every action logged, timestamps, IP addresses
9. ✅ Error messages secure: no secret leakage in errors
10. ✅ Documentation complete: developers can integrate without support
11. ✅ SDK available in 3+ languages (TS, Python, Go)
12. ✅ Monitoring comprehensive: alerting on anomalies, metrics tracked

---

## Implementation Checklist

### Backend
- [ ] BYOA database schema (PostgreSQL migrations)
- [ ] Agent registration endpoint (POST /byoa/agents)
- [ ] Intent submission endpoint (POST /byoa/agents/:id/intents)
- [ ] Intent status endpoint (GET /byoa/agents/:id/intents/:id)
- [ ] Agent config endpoint (GET/PUT /byoa/agents/:id/config)
- [ ] Agent transactions endpoint (GET /byoa/agents/:id/transactions)
- [ ] Authentication middleware (token hash verification)
- [ ] Rate limiting middleware (Redis-backed)
- [ ] Webhook delivery system (with retries)
- [ ] Audit logging system
- [ ] Error handling & validation (Zod schemas)
- [ ] Unit & integration tests

### Frontend
- [ ] BYOA section in dashboard (registered agents list)
- [ ] Register agent form with webhook URL
- [ ] Agent detail page (token display, config)
- [ ] Webhook test button (send test event)
- [ ] API documentation page (auto-generated from OpenAPI)

### DevOps
- [ ] Docker containers for API + webhooks
- [ ] Kubernetes manifests (deployment, service, ingress)
- [ ] How to docs (deployment guide)
- [ ] Monitoring setup (Prometheus, Grafana)
- [ ] Alerting setup (PagerDuty, Slack)

### SDKs
- [ ] TypeScript/JavaScript SDK (NPM package)
- [ ] Python SDK (PyPI package)
- [ ] Go SDK (github.com repo)
- [ ] Each with proper error handling and type safety

---

**BYOA subsystem must provide a secure, performant, observable interface for external agents while maintaining the same security guarantees as internal agents. No compromises on security or auditability.**
