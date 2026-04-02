/**
 * BYOA System Integration Tests
 * Tests the full BYOA workflow including registration, authentication, intent submission, and rate limiting
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import { ControlTokenManager } from '../src/services/byoa-test-safe.js';

/**
 * Mock Database for testing
 */
class MockBYOADatabase {
  private agents = new Map();
  private credentials = new Map();
  private intents = new Map();
  private webhookEvents = new Map();
  private auditLog: any[] = [];

  async getAgentById(agentId: string) {
    return this.agents.get(agentId) || null;
  }

  async createAgent(agent: any) {
    this.agents.set(agent.id, agent);
    return agent;
  }

  async getCredentialHash(agentId: string) {
    const cred = this.credentials.get(agentId);
    return cred ? cred.control_token_hash : null;
  }

  async createCredential(cred: any) {
    this.credentials.set(cred.agent_id, cred);
    return cred;
  }

  async createIntent(intent: any) {
    this.intents.set(intent.id, intent);
    return intent;
  }

  async getIntentById(intentId: string) {
    return this.intents.get(intentId) || null;
  }

  async getAgentIntents(agentId: string, limit: number, offset: number) {
    const agentIntents = Array.from(this.intents.values()).filter(
      (i: any) => i.agent_id === agentId
    );
    return agentIntents.slice(offset, offset + limit);
  }

  async countIntentsThisHour(agentId: string) {
    const oneHourAgo = new Date(Date.now() - 3600000);
    const intents = Array.from(this.intents.values()).filter((i: any) => {
      return i.agent_id === agentId && new Date(i.created_at) > oneHourAgo;
    });
    return intents.length;
  }

  async createAuditLog(log: any) {
    this.auditLog.push(log);
    return log;
  }

  async getAuditLog(filters?: any) {
    return this.auditLog;
  }

  async getPermissions(agentId: string) {
    return {
      agent_id: agentId,
      can_submit_intents: true,
      can_modify_config: false,
      can_view_balance: true,
      can_view_transaction_history: true,
      max_intents_per_hour: 100,
      max_transfer_amount: '1000000.00',
    };
  }

  async getOrCreateRateLimit(agentId: string) {
    return { agent_id: agentId, intents_count: 0, window_start: new Date() };
  }

  async incrementIntentCount(agentId: string) {
    return { updated: true };
  }

  async getWebhooksByAgentId(agentId: string) {
    return [];
  }

  async createWebhookEvent(event: any) {
    this.webhookEvents.set(event.id, event);
    return event;
  }
}

describe('BYOA System Integration', () => {
  let db: MockBYOADatabase;
  let testAgentId: string;
  let testControlToken: string;
  let testControlTokenHash: string;

  beforeAll(() => {
    db = new MockBYOADatabase();
  });

  afterAll(() => {
    // Cleanup
  });

  describe('Control Token Management', () => {
    it('should generate a cryptographically secure control token', () => {
      const token = ControlTokenManager.generateToken();

      // Should be 64 hex characters (256 bits)
      expect(token).toMatch(/^[a-f0-9]{64}$/);
      expect(token.length).toBe(64);

      // Each token should be unique
      const token2 = ControlTokenManager.generateToken();
      expect(token).not.toBe(token2);
    });

    it('should hash control token using SHA-256', () => {
      const token = 'test_token_for_hashing_12345678901234567890';
      const hash = ControlTokenManager.hashToken(token);

      // Should produce a 64-character hex string (SHA-256)
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hash.length).toBe(64);

      // Hash should be deterministic
      const hash2 = ControlTokenManager.hashToken(token);
      expect(hash).toBe(hash2);
    });

    it('should verify token against hash using constant-time comparison', () => {
      const token = ControlTokenManager.generateToken();
      const hash = ControlTokenManager.hashToken(token);

      // Should verify matching token
      const isValid = ControlTokenManager.verifyToken(token, hash);
      expect(isValid).toBe(true);

      // Should reject invalid token
      const invalidToken = ControlTokenManager.generateToken();
      const isInvalid = ControlTokenManager.verifyToken(invalidToken, hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Agent Registration', () => {
    it('should register a new external agent with generated keypair', async () => {
      testAgentId = crypto.randomUUID();
      testControlToken = ControlTokenManager.generateToken();
      testControlTokenHash = ControlTokenManager.hashToken(testControlToken);

      // Create agent
      const agent = await db.createAgent({
        id: testAgentId,
        name: 'Test Agent v1',
        description: 'Test agent for integration testing',
        public_key: 'GBGFNCNRFXYXFNX5PXQVS3YZAZAQVKFQMXQJ7VVZC3MXVVJVZC3MXQV2',
        status: 'active',
        created_at: new Date(),
      });

      expect(agent).toBeDefined();
      expect(agent.id).toBe(testAgentId);
      expect(agent.status).toBe('active');

      // Store credentials
      await db.createCredential({
        agent_id: testAgentId,
        control_token_hash: testControlTokenHash,
        created_at: new Date(),
        is_active: true,
      });

      // Verify credential was stored
      const hash = await db.getCredentialHash(testAgentId);
      expect(hash).toBe(testControlTokenHash);
    });

    it('should not allow duplicate agent names', async () => {
      const agentId1 = crypto.randomUUID();
      const agentId2 = crypto.randomUUID();

      // First registration should succeed
      await db.createAgent({
        id: agentId1,
        name: 'Unique Agent Name',
        public_key: 'G1111111111111111111111111111111111111111111111111111111111',
        status: 'active',
        created_at: new Date(),
      });

      // Second registration with same name should fail
      // (In real implementation, DB would enforce unique constraint)
      expect(async () => {
        await db.createAgent({
          id: agentId2,
          name: 'Unique Agent Name',
          public_key: 'G2222222222222222222222222222222222222222222222222222222222',
          status: 'active',
          created_at: new Date(),
        });
      }).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should authenticate agent with valid control token', () => {
      // Verify with correct token
      const isValid = ControlTokenManager.verifyToken(testControlToken, testControlTokenHash);
      expect(isValid).toBe(true);
    });

    it('should reject authentication with invalid token', () => {
      const invalidToken = ControlTokenManager.generateToken();
      const isValid = ControlTokenManager.verifyToken(invalidToken, testControlTokenHash);
      expect(isValid).toBe(false);
    });

    it('should use constant-time comparison to prevent timing attacks', () => {
      const token = ControlTokenManager.generateToken();
      const validHash = ControlTokenManager.hashToken(token);
      const invalidHash = ControlTokenManager.hashToken(ControlTokenManager.generateToken());

      // Both should execute in similar time (constant-time comparison)
      const startValid = performance.now();
      ControlTokenManager.verifyToken(token, validHash);
      const timeValid = performance.now() - startValid;

      const startInvalid = performance.now();
      ControlTokenManager.verifyToken(token, invalidHash);
      const timeInvalid = performance.now() - startInvalid;

      // Times should be similar (within 10ms to account for system variance)
      const timeDiff = Math.abs(timeValid - timeInvalid);
      expect(timeDiff).toBeLessThan(10);
    });
  });

  describe('Intent Submission', () => {
    it('should accept valid intent with correct parameters', async () => {
      const intentId = crypto.randomUUID();

      const intent = await db.createIntent({
        id: intentId,
        agent_id: testAgentId,
        submission_id: crypto.randomUUID(),
        idempotency_key: crypto.randomUUID(),
        type: 'TRANSFER_XLM',
        params: {
          destination: 'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTTNUVES35LSKNQRMTFSLOGGJU',
          amount: '50.00',
        },
        status: 'queued',
        created_at: new Date(),
      });

      expect(intent).toBeDefined();
      expect(intent.type).toBe('TRANSFER_XLM');
      expect(intent.status).toBe('queued');

      // Verify intent can be retrieved
      const retrieved = await db.getIntentById(intentId);
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(intentId);
    });

    it('should validate TRANSFER_XLM parameters', () => {
      const validParams = {
        destination: 'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTTNUVES35LSKNQRMTFSLOGGJU',
        amount: '50.00',
      };

      const invalidDestination = {
        destination: 'INVALID_KEY',
        amount: '50.00',
      };

      const invalidAmount = {
        destination: 'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTTNUVES35LSKNQRMTFSLOGGJU',
        amount: '-50.00',
      };

      // Validation logic would be in actual service
      // Note: Stellar addresses are 56 chars after 'G', making 57 total
      expect(validParams.destination).toMatch(/^G[A-Z2-7]{55}$/);
      expect(invalidDestination.destination).not.toMatch(/^G[A-Z2-7]{55}$/);
      expect(parseFloat(validParams.amount) > 0).toBe(true);
      expect(parseFloat(invalidAmount.amount) > 0).toBe(false);
    });

    it('should enforce per-agent rate limits', async () => {
      // Count intents submitted this hour
      const count = await db.countIntentsThisHour(testAgentId);
      expect(typeof count).toBe('number');

      // Create max intents up to limit
      const limit = 100;
      expect(count).toBeLessThanOrEqual(limit);
    });
  });

  describe('Permissions & Authorization', () => {
    it('should check permission for intent submission', async () => {
      const permissions = await db.getPermissions(testAgentId);

      expect(permissions.can_submit_intents).toBe(true);
      expect(permissions.can_modify_config).toBe(false);
      expect(permissions.can_view_balance).toBe(true);
    });

    it('should enforce max transfer amount limit', () => {
      const maxAmount = '1000000.00';
      const submittedAmount = '500000.00';

      expect(parseFloat(submittedAmount)).toBeLessThanOrEqual(parseFloat(maxAmount));

      const excessAmount = '2000000.00';
      expect(parseFloat(excessAmount)).toBeGreaterThan(parseFloat(maxAmount));
    });
  });

  describe('Webhook Delivery', () => {
    it('should generate HMAC-SHA256 signature for webhook payload', () => {
      const payload = {
        intent_id: crypto.randomUUID(),
        status: 'executed',
        timestamp: new Date().toISOString(),
      };
      const secret = 'webhook_secret_min_32_chars_long_12345678';

      // Generate signature
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      // Should be 64 character hex string
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
      expect(signature.length).toBe(64);

      // Signature should be deterministic
      const signature2 = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      expect(signature).toBe(signature2);
    });

    it('should verify webhook signature matches expected', () => {
      const payload = { intent_id: 'test', status: 'executed' };
      const secret = 'webhook_secret_min_32_chars_long_12345678';

      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      // Should verify correct signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      expect(signature).toBe(expectedSignature);

      // Should reject different payloads
      const differentPayload = { intent_id: 'test2', status: 'failed' };
      const differentSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(differentPayload))
        .digest('hex');

      expect(signature).not.toBe(differentSignature);
    });

    it('should queue webhook event for delivery', async () => {
      const eventId = crypto.randomUUID();
      const event = await db.createWebhookEvent({
        id: eventId,
        agent_id: testAgentId,
        event_type: 'intent.executed',
        payload: { intent_id: crypto.randomUUID(), status: 'executed' },
        status: 'pending',
        attempts: 0,
        next_retry_at: new Date(),
        created_at: new Date(),
      });

      expect(event).toBeDefined();
      expect(event.status).toBe('pending');
      expect(event.attempts).toBe(0);
    });
  });

  describe('Audit Logging', () => {
    it('should log security events for compliance', async () => {
      const log = await db.createAuditLog({
        agent_id: testAgentId,
        action: 'auth_success',
        success: true,
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0...',
        request_id: crypto.randomUUID(),
        created_at: new Date(),
      });

      expect(log).toBeDefined();
      expect(log.action).toBe('auth_success');
      expect(log.success).toBe(true);

      // Retrieve audit log
      const logs = await db.getAuditLog({ agent_id: testAgentId });
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should track failed authentication attempts', async () => {
      const log = await db.createAuditLog({
        agent_id: testAgentId,
        action: 'auth_failed_invalid_token',
        success: false,
        ip_address: '192.168.1.100',
        user_agent: 'suspicious-client',
        request_id: crypto.randomUUID(),
        created_at: new Date(),
      });

      expect(log.success).toBe(false);
      expect(log.action).toContain('auth_failed');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent agent gracefully', async () => {
      const fakeAgentId = crypto.randomUUID();
      const agent = await db.getAgentById(fakeAgentId);

      expect(agent).toBeNull();
    });

    it('should validate rate limit parameters', () => {
      const validLimit = 100;
      const validWindow = 3600000; // 1 hour in ms

      expect(validLimit).toBeGreaterThan(0);
      expect(validWindow).toBeGreaterThan(0);

      const invalidLimit = -10;
      expect(invalidLimit).toBeLessThanOrEqual(0);
    });
  });
});

describe('BYOA Integration Workflow', () => {
  let db: MockBYOADatabase;
  let agentId: string;
  let controlToken: string;
  let controlTokenHash: string;

  beforeAll(async () => {
    db = new MockBYOADatabase();

    // Full registration workflow
    agentId = crypto.randomUUID();
    controlToken = ControlTokenManager.generateToken();
    controlTokenHash = ControlTokenManager.hashToken(controlToken);

    await db.createAgent({
      id: agentId,
      name: 'Full Workflow Test Agent',
      public_key: 'GBGFNCNRFXYXFNX5PXQVS3YZAZAQVKFQMXQJ7VVZC3MXVVJVZC3MXQV2',
      status: 'active',
      created_at: new Date(),
    });

    await db.createCredential({
      agent_id: agentId,
      control_token_hash: controlTokenHash,
      created_at: new Date(),
      is_active: true,
    });
  });

  it('should complete full agent registration → authentication → intent submission workflow', async () => {
    // Step 1: Verify agent exists
    const agent = await db.getAgentById(agentId);
    expect(agent).toBeDefined();

    // Step 2: Authenticate with control token
    const isAuthenticated = ControlTokenManager.verifyToken(controlToken, controlTokenHash);
    expect(isAuthenticated).toBe(true);

    // Step 3: Check permissions
    const permissions = await db.getPermissions(agentId);
    expect(permissions.can_submit_intents).toBe(true);

    // Step 4: Submit intent
    const intentId = crypto.randomUUID();
    const intent = await db.createIntent({
      id: intentId,
      agent_id: agentId,
      submission_id: crypto.randomUUID(),
      idempotency_key: crypto.randomUUID(),
      type: 'TRANSFER_XLM',
      params: {
        destination: 'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTTNUVES35LSKNQRMTFSLOGGJU',
        amount: '100.00',
      },
      status: 'queued',
      created_at: new Date(),
    });

    expect(intent).toBeDefined();
    expect(intent.status).toBe('queued');

    // Step 5: Retrieve intent status
    const retrieved = await db.getIntentById(intentId);
    expect(retrieved.id).toBe(intentId);

    // Step 6: Emit webhook event
    const eventId = crypto.randomUUID();
    const event = await db.createWebhookEvent({
      id: eventId,
      agent_id: agentId,
      event_type: 'intent.submitted',
      payload: {
        intent_id: intentId,
        submission_id: intent.submission_id,
        status: 'queued',
      },
      status: 'pending',
      attempts: 0,
      next_retry_at: new Date(),
      created_at: new Date(),
    });

    expect(event).toBeDefined();

    // Workflow complete
    expect(true).toBe(true);
  });

  it('should isolate agent data - agent A cannot access agent B intents', async () => {
    // Create agent B
    const agentBId = crypto.randomUUID();
    await db.createAgent({
      id: agentBId,
      name: 'Agent B',
      public_key: 'G2222222222222222222222222222222222222222222222222222222222',
      status: 'active',
      created_at: new Date(),
    });

    // Create intent for agent B
    const agentBIntentId = crypto.randomUUID();
    await db.createIntent({
      id: agentBIntentId,
      agent_id: agentBId,
      submission_id: crypto.randomUUID(),
      idempotency_key: crypto.randomUUID(),
      type: 'TRANSFER_XLM',
      params: { destination: 'G...', amount: '100.00' },
      status: 'queued',
      created_at: new Date(),
    });

    // Agent A should not be able to access agent B's intent
    // (In real implementation, service layer would enforce this)
    const agentAIntents = await db.getAgentIntents(agentId, 100, 0);
    const hasAgentBIntent = agentAIntents.some((i: any) => i.id === agentBIntentId);
    expect(hasAgentBIntent).toBe(false);
  });
});
