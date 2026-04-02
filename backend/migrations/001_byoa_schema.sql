-- BYOA (Bring Your Own Agent) - Production Database Schema
-- PostgreSQL 12+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- BYOA Agents
-- ============================================================================
CREATE TABLE IF NOT EXISTS byoa_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  public_key VARCHAR(56) NOT NULL UNIQUE,
  secret_key_encrypted VARCHAR(512) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'blocked', 'deleted')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  contact_email VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  last_intent_at TIMESTAMP,
  
  CONSTRAINT valid_email CHECK (contact_email IS NULL OR contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_byoa_agents_status ON byoa_agents(status);
CREATE INDEX idx_byoa_agents_public_key ON byoa_agents(public_key);
CREATE INDEX idx_byoa_agents_created_at ON byoa_agents(created_at DESC);

-- ============================================================================
-- BYOA Credentials (Control Tokens)
-- ============================================================================
CREATE TABLE IF NOT EXISTS byoa_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL UNIQUE REFERENCES byoa_agents(id) ON DELETE CASCADE,
  control_token_hash VARCHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  rotated_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  CONSTRAINT valid_hash_length CHECK (LENGTH(control_token_hash) = 64)
);

CREATE INDEX idx_byoa_credentials_agent_id ON byoa_credentials(agent_id);

-- ============================================================================
-- BYOA Permissions & Quotas
-- ============================================================================
CREATE TABLE IF NOT EXISTS byoa_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL UNIQUE REFERENCES byoa_agents(id) ON DELETE CASCADE,
  can_submit_intents BOOLEAN NOT NULL DEFAULT true,
  can_modify_config BOOLEAN NOT NULL DEFAULT false,
  can_view_balance BOOLEAN NOT NULL DEFAULT true,
  can_view_transaction_history BOOLEAN NOT NULL DEFAULT true,
  intent_types_allowed TEXT[] NOT NULL DEFAULT ARRAY['TRANSFER_XLM', 'CREATE_TRUSTLINE'],
  max_transfer_amount VARCHAR(50) NOT NULL DEFAULT '1000000.00',
  max_intents_per_hour INTEGER NOT NULL DEFAULT 100,
  max_intents_per_request INTEGER NOT NULL DEFAULT 50,
  max_requests_per_hour INTEGER NOT NULL DEFAULT 1000,
  max_xem_transferred_per_day VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_byoa_permissions_agent_id ON byoa_permissions(agent_id);

-- ============================================================================
-- BYOA Webhooks
-- ============================================================================
CREATE TABLE IF NOT EXISTS byoa_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES byoa_agents(id) ON DELETE CASCADE,
  url VARCHAR(2048) NOT NULL,
  secret_encrypted VARCHAR(512) NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY['intent.submitted', 'intent.executed', 'intent.failed'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_tried_at TIMESTAMP,
  last_success_at TIMESTAMP,
  failure_count INTEGER NOT NULL DEFAULT 0,
  
  CONSTRAINT valid_webhook_url CHECK (url ~* '^https://')
);

CREATE INDEX idx_byoa_webhooks_agent_id ON byoa_webhooks(agent_id);
CREATE INDEX idx_byoa_webhooks_active ON byoa_webhooks(is_active) WHERE is_active = true;

-- ============================================================================
-- BYOA Webhook Events (Event Queue)
-- ============================================================================
CREATE TABLE IF NOT EXISTS byoa_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES byoa_agents(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'expired')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMP,
  next_retry_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_byoa_webhook_events_agent_status ON byoa_webhook_events(agent_id, status);
CREATE INDEX idx_byoa_webhook_events_retry ON byoa_webhook_events(next_retry_at) WHERE status = 'pending';
CREATE INDEX idx_byoa_webhook_events_created ON byoa_webhook_events(created_at DESC);

-- ============================================================================
-- BYOA Intents (Submitted by external agents)
-- ============================================================================
CREATE TABLE IF NOT EXISTS byoa_intents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES byoa_agents(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL,
  idempotency_key VARCHAR(255),
  type VARCHAR(64) NOT NULL,
  params JSONB NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'validating', 'executing', 'executed', 'rejected', 'failed')),
  status_history JSONB NOT NULL DEFAULT '[]',
  result JSONB,
  tx_hash VARCHAR(64),
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  executed_at TIMESTAMP,
  
  CONSTRAINT valid_tx_hash CHECK (tx_hash IS NULL OR LENGTH(tx_hash) = 64)
);

CREATE INDEX idx_byoa_intents_agent_id ON byoa_intents(agent_id, created_at DESC);
CREATE INDEX idx_byoa_intents_status ON byoa_intents(agent_id, status);
CREATE INDEX idx_byoa_intents_tx_hash ON byoa_intents(tx_hash) WHERE tx_hash IS NOT NULL;
CREATE INDEX idx_byoa_intents_idempotency ON byoa_intents(agent_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- BYOA Rate Limit Tracking (In-memory or Redis in production)
-- ============================================================================
CREATE TABLE IF NOT EXISTS byoa_rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES byoa_agents(id) ON DELETE CASCADE,
  window_start TIMESTAMP NOT NULL,
  intents_count INTEGER NOT NULL DEFAULT 0,
  requests_count INTEGER NOT NULL DEFAULT 0,
  xem_transferred VARCHAR(50) NOT NULL DEFAULT '0.00',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(agent_id, window_start)
);

CREATE INDEX idx_byoa_rate_limits_agent_window ON byoa_rate_limits(agent_id, window_start);

-- ============================================================================
-- BYOA Audit Log (For compliance & security)
-- ============================================================================
CREATE TABLE IF NOT EXISTS byoa_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES byoa_agents(id),
  action VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'success',
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_byoa_audit_agent ON byoa_audit_log(agent_id, created_at DESC);
CREATE INDEX idx_byoa_audit_action ON byoa_audit_log(action, created_at DESC);
CREATE INDEX idx_byoa_audit_created ON byoa_audit_log(created_at DESC);

-- ============================================================================
-- BYOA Circuit Breaker (Auto-suspend on high failure rate)
-- ============================================================================
CREATE TABLE IF NOT EXISTS byoa_circuit_breakers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL UNIQUE REFERENCES byoa_agents(id) ON DELETE CASCADE,
  is_open BOOLEAN NOT NULL DEFAULT false,
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMP,
  opened_at TIMESTAMP,
  closed_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_byoa_circuit_breakers_open ON byoa_circuit_breakers(is_open) WHERE is_open = true;

-- ============================================================================
-- Views for common queries
-- ============================================================================

-- Agent info with permissions and credentials
CREATE OR REPLACE VIEW byoa_agent_info AS
SELECT
  a.id,
  a.name,
  a.description,
  a.public_key,
  a.status,
  a.contact_email,
  a.created_at,
  a.last_intent_at,
  p.can_submit_intents,
  p.can_modify_config,
  p.can_view_balance,
  p.can_view_transaction_history,
  p.intent_types_allowed,
  p.max_transfer_amount,
  p.max_intents_per_hour,
  p.max_intents_per_request,
  p.max_requests_per_hour,
  c.is_active as token_active
FROM byoa_agents a
LEFT JOIN byoa_permissions p ON a.id = p.agent_id
LEFT JOIN byoa_credentials c ON a.id = c.agent_id;

-- Recent intents by agent
CREATE OR REPLACE VIEW byoa_recent_intents AS
SELECT
  i.id,
  i.agent_id,
  i.type,
  i.status,
  i.tx_hash,
  i.created_at,
  i.executed_at,
  a.name as agent_name
FROM byoa_intents i
JOIN byoa_agents a ON i.agent_id = a.id
WHERE i.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
ORDER BY i.created_at DESC;

-- Failed intents requiring attention
CREATE OR REPLACE VIEW byoa_failed_intents_alert AS
SELECT
  a.id,
  a.name,
  COUNT(*) as failed_count,
  COUNT(*) FILTER (WHERE i.created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour') as failed_last_hour,
  MAX(i.created_at) as last_failure
FROM byoa_agents a
LEFT JOIN byoa_intents i ON a.id = i.agent_id AND (i.status = 'failed' OR i.status = 'rejected')
WHERE i.created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY a.id, a.name
HAVING COUNT(*) FILTER (WHERE i.created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour') > 5;

-- Agent statistics
CREATE OR REPLACE VIEW byoa_agent_statistics AS
SELECT
  a.id,
  a.name,
  COUNT(i.id) FILTER (WHERE i.status = 'executed') as total_executed,
  COUNT(i.id) FILTER (WHERE i.status = 'failed') as total_failed,
  COUNT(i.id) FILTER (WHERE i.status = 'rejected') as total_rejected,
  COUNT(i.id) FILTER (WHERE i.created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as intents_last_24h,
  MAX(i.executed_at) as last_execution
FROM byoa_agents a
LEFT JOIN byoa_intents i ON a.id = i.agent_id
GROUP BY a.id, a.name;

-- ============================================================================
-- Functions for common operations
-- ============================================================================

-- Update agent last_intent_at timestamp
CREATE OR REPLACE FUNCTION update_agent_last_intent()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE byoa_agents
  SET last_intent_at = CURRENT_TIMESTAMP
  WHERE id = NEW.agent_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_last_intent_trigger
AFTER INSERT ON byoa_intents
FOR EACH ROW
EXECUTE FUNCTION update_agent_last_intent();

-- Update webhook failure tracking
CREATE OR REPLACE FUNCTION track_webhook_failure()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'failed' THEN
    UPDATE byoa_webhooks
    SET failure_count = failure_count + 1,
        last_tried_at = CURRENT_TIMESTAMP
    WHERE agent_id = NEW.agent_id AND is_active = true;
  ELSIF NEW.status = 'delivered' THEN
    UPDATE byoa_webhooks
    SET failure_count = 0,
        last_success_at = CURRENT_TIMESTAMP,
        last_tried_at = CURRENT_TIMESTAMP
    WHERE agent_id = NEW.agent_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_webhook_failure_trigger
AFTER UPDATE ON byoa_webhook_events
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION track_webhook_failure();

-- Auto-suspend agents with high failure rate
CREATE OR REPLACE FUNCTION check_circuit_breaker()
RETURNS TRIGGER AS $$
DECLARE
  failure_rate DECIMAL;
  total_intents INTEGER;
  failed_intents INTEGER;
BEGIN
  -- Check failure rate in last 24 hours
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status IN ('failed', 'rejected'))
  INTO total_intents, failed_intents
  FROM byoa_intents
  WHERE agent_id = NEW.agent_id AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours';
  
  IF total_intents >= 10 THEN
    failure_rate := (failed_intents::DECIMAL / total_intents) * 100;
    
    IF failure_rate > 50 THEN
      -- Activate circuit breaker
      INSERT INTO byoa_circuit_breakers (agent_id, is_open, failure_count, last_failure_at, opened_at)
      VALUES (NEW.agent_id, true, failed_intents, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (agent_id)
      DO UPDATE SET
        is_open = true,
        failure_count = failed_intents,
        last_failure_at = CURRENT_TIMESTAMP;
      
      -- Suspend agent
      UPDATE byoa_agents
      SET status = 'suspended'
      WHERE id = NEW.agent_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_circuit_breaker_trigger
AFTER INSERT ON byoa_intents
FOR EACH ROW
WHEN (NEW.status IN ('failed', 'rejected'))
EXECUTE FUNCTION check_circuit_breaker();

-- ============================================================================
-- Grants (adjust roles as needed)
-- ============================================================================
-- Grant permissions to application role (if using role-based security)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_role;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_role;

COMMIT;
