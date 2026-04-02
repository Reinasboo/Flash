/**
 * BYOA Database Client/Repository
 * Handles all database operations for the BYOA subsystem
 * Abstracts PostgreSQL queries with proper error handling and type safety
 */

import { Pool, QueryResult } from "pg";
import { logger } from "../utils/logger.js";
import type {
  BYOAAgentFull,
  BYOACredentials,
  BYOAPermissions,
  BYOAWebhook,
  BYOAWebhookEvent,
  BYOAIntent,
  BYOAAuditLog,
  BYOACircuitBreakerState,
} from "../types/index.js";

/**
 * BYOA Database Client
 * Singleton pattern for database access throughout the application
 */
export class BYOADatabase {
  private static instance: BYOADatabase;
  private pool: Pool;

  private constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 20, // Connection pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      application_name: "agentic-wallet-byoa",
    });

    this.pool.on("error", (err: Error) => {
      logger.error({ error: err }, "Unexpected error on idle client");
    });
  }

  /**
   * Initialize database connection
   */
  static initialize(connectionString: string): void {
    if (!BYOADatabase.instance) {
      BYOADatabase.instance = new BYOADatabase(connectionString);
      logger.info("BYOA database client initialized");
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): BYOADatabase {
    if (!BYOADatabase.instance) {
      throw new Error("BYOADatabase not initialized. Call initialize() first.");
    }
    return BYOADatabase.instance;
  }

  /**
   * Get connection pool for transactions
   */
  getPool(): Pool {
    return this.pool;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info("BYOA database connection closed");
  }

  // ========================================================================
  // AGENTS
  // ========================================================================

  /**
   * Create a new external agent
   */
  async createAgent(data: {
    id: string;
    name: string;
    description?: string;
    publicKey: string;
    secretKeyEncrypted: string;
    status: string;
    createdBy?: string;
    contactEmail?: string;
    metadata?: Record<string, unknown>;
  }): Promise<BYOAAgentFull> {
    const query = `
      INSERT INTO byoa_agents
        (id, name, description, public_key, secret_key_encrypted, status, created_by, contact_email, metadata)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, name, description, public_key as "publicKey", secret_key_encrypted as "secretKeyEncrypted",
                status, created_at as "createdAt", created_by as "createdBy", updated_at as "updatedAt",
                contact_email as "contactEmail", metadata;
    `;

    try {
      const result = await this.pool.query(query, [
        data.id,
        data.name,
        data.description || null,
        data.publicKey,
        data.secretKeyEncrypted,
        data.status,
        data.createdBy || null,
        data.contactEmail || null,
        JSON.stringify(data.metadata || {}),
      ]);

      return result.rows[0] as BYOAAgentFull;
    } catch (error) {
      logger.error(
        { error, agentName: data.name },
        "Failed to create agent"
      );
      throw new Error(`Failed to create agent: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Get agent by ID
   */
  async getAgentById(agentId: string): Promise<BYOAAgentFull | null> {
    const query = `
      SELECT id, name, description, public_key as "publicKey", secret_key_encrypted as "secretKeyEncrypted",
             status, created_at as "createdAt", created_by as "createdBy", updated_at as "updatedAt",
             contact_email as "contactEmail", metadata, last_intent_at as "lastIntentAt"
      FROM byoa_agents
      WHERE id = $1;
    `;

    try {
      const result = await this.pool.query(query, [agentId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ error, agentId }, "Failed to get agent");
      throw error;
    }
  }

  /**
   * Get agent by name
   */
  async getAgentByName(name: string): Promise<BYOAAgentFull | null> {
    const query = `
      SELECT id, name, description, public_key as "publicKey", secret_key_encrypted as "secretKeyEncrypted",
             status, created_at as "createdAt", created_by as "createdBy", updated_at as "updatedAt",
             contact_email as "contactEmail", metadata
      FROM byoa_agents
      WHERE name = $1;
    `;

    try {
      const result = await this.pool.query(query, [name]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ error, name }, "Failed to get agent by name");
      throw error;
    }
  }

  /**
   * List all agents with optional filters
   */
  async listAgents(status?: string, limit = 100, offset = 0): Promise<{ agents: BYOAAgentFull[]; total: number }> {
    const whereClause = status ? "WHERE status = $1" : "";
    const params = status ? [status, limit, limit + offset] : [limit, offset];

    const query = `
      SELECT id, name, description, public_key as "publicKey", secret_key_encrypted as "secretKeyEncrypted",
             status, created_at as "createdAt", created_by as "createdBy", updated_at as "updatedAt",
             contact_email as "contactEmail", metadata, last_intent_at as "lastIntentAt"
      FROM byoa_agents
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${status ? 2 : 1} OFFSET $${status ? 3 : 2};
    `;

    const countQuery = `SELECT COUNT(*) as count FROM byoa_agents ${whereClause};`;

    try {
      const [result, countResult] = await Promise.all([
        this.pool.query(query, params),
        this.pool.query(countQuery, status ? [status] : []),
      ]);

      return {
        agents: result.rows,
        total: parseInt(countResult.rows[0].count, 10),
      };
    } catch (error) {
      logger.error({ error }, "Failed to list agents");
      throw error;
    }
  }

  /**
   * Update agent
   */
  async updateAgent(
    agentId: string,
    data: Partial<BYOAAgentFull>
  ): Promise<BYOAAgentFull> {
    const updates = [];
    const values: unknown[] = [agentId];
    let paramCount = 2;

    if (data.name !== undefined) updates.push(`name = $${paramCount++}`), values.push(data.name);
    if (data.description !== undefined) updates.push(`description = $${paramCount++}`), values.push(data.description);
    if (data.status !== undefined) updates.push(`status = $${paramCount++}`), values.push(data.status);
    if (data.metadata !== undefined) updates.push(`metadata = $${paramCount++}`), values.push(JSON.stringify(data.metadata));

    if (updates.length === 0) {
      const result = await this.pool.query(
        "SELECT * FROM byoa_agents WHERE id = $1;",
        [agentId]
      );
      return result.rows[0];
    }

    updates.push(`updated_at = NOW()`);

    const query = `
      UPDATE byoa_agents
      SET ${updates.join(", ")}
      WHERE id = $1
      RETURNING id, name, description, public_key as "publicKey", secret_key_encrypted as "secretKeyEncrypted",
                status, created_at as "createdAt", created_by as "createdBy", updated_at as "updatedAt",
                contact_email as "contactEmail", metadata;
    `;

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error({ error, agentId }, "Failed to update agent");
      throw error;
    }
  }

  // ========================================================================
  // CREDENTIALS (Control Tokens)
  // ========================================================================

  /**
   * Create control token hash for agent
   */
  async createCredential(agentId: string, controlTokenHash: string): Promise<void> {
    const query = `
      INSERT INTO byoa_credentials (agent_id, control_token_hash, created_at, is_active)
      VALUES ($1, $2, NOW(), true)
      ON CONFLICT (agent_id) DO NOTHING;
    `;

    try {
      await this.pool.query(query, [agentId, controlTokenHash]);
      logger.debug({ agentId }, "Credential created");
    } catch (error) {
      logger.error({ error, agentId }, "Failed to create credential");
      throw error;
    }
  }

  /**
   * Get control token hash for agent (for verification)
   */
  async getCredentialHash(agentId: string): Promise<string | null> {
    const query = `
      SELECT control_token_hash as "controlTokenHash"
      FROM byoa_credentials
      WHERE agent_id = $1 AND is_active = true;
    `;

    try {
      const result = await this.pool.query(query, [agentId]);
      return result.rows[0]?.controlTokenHash || null;
    } catch (error) {
      logger.error({ error, agentId }, "Failed to get credential hash");
      throw error;
    }
  }

  /**
   * Rotate control token (invalidate old, create new)
   */
  async rotateToken(agentId: string, newTokenHash: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Deactivate old token
      await client.query(
        "UPDATE byoa_credentials SET is_active = false WHERE agent_id = $1;",
        [agentId]
      );

      // Create new token
      await client.query(
        `INSERT INTO byoa_credentials (agent_id, control_token_hash, created_at, is_active, rotated_at)
         VALUES ($1, $2, NOW(), true, NOW());`,
        [agentId, newTokenHash]
      );

      await client.query("COMMIT");
      logger.info({ agentId }, "Token rotated");
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error({ error, agentId }, "Failed to rotate token");
      throw error;
    } finally {
      client.release();
    }
  }

  // ========================================================================
  // PERMISSIONS
  // ========================================================================

  /**
   * Get agent permissions
   */
  async getPermissions(agentId: string): Promise<BYOAPermissions | null> {
    const query = `
      SELECT agent_id as "agentId", can_submit_intents as "canSubmitIntents",
             can_modify_config as "canModifyConfig", can_view_balance as "canViewBalance",
             can_view_transaction_history as "canViewTransactionHistory",
             intent_types_allowed as "intentTypesAllowed",
             max_transfer_amount as "maxTransferAmount", max_intents_per_hour as "maxIntentsPerHour",
             max_intents_per_request as "maxIntentsPerRequest",
             max_requests_per_hour as "maxRequestsPerHour",
             max_xem_transferred_per_day as "maxXemTransferredPerDay"
      FROM byoa_permissions
      WHERE agent_id = $1;
    `;

    try {
      const result = await this.pool.query(query, [agentId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ error, agentId }, "Failed to get permissions");
      throw error;
    }
  }

  /**
   * Create default permissions for new agent
   */
  async createDefaultPermissions(agentId: string): Promise<void> {
    const query = `
      INSERT INTO byoa_permissions
        (agent_id, can_submit_intents, can_modify_config, can_view_balance,
         can_view_transaction_history, intent_types_allowed, max_transfer_amount,
         max_intents_per_hour, max_intents_per_request, max_requests_per_hour)
      VALUES
        ($1, true, false, true, true, ARRAY['TRANSFER_XLM', 'CREATE_TRUSTLINE'],
         '1000000.00', 100, 50, 1000)
      ON CONFLICT (agent_id) DO NOTHING;
    `;

    try {
      await this.pool.query(query, [agentId]);
    } catch (error) {
      logger.error({ error, agentId }, "Failed to create default permissions");
      throw error;
    }
  }

  // ========================================================================
  // INTENTS
  // ========================================================================

  /**
   * Create intent submission
   */
  async createIntent(data: {
    id: string;
    agentId: string;
    submissionId: string;
    idempotencyKey?: string;
    type: string;
    params: Record<string, unknown>;
  }): Promise<BYOAIntent> {
    const query = `
      INSERT INTO byoa_intents
        (id, agent_id, submission_id, idempotency_key, type, params, status, status_history, created_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, 'queued', '[]', NOW())
      RETURNING id, agent_id as "agentId", submission_id as "submissionId",
                idempotency_key as "idempotencyKey", type, params, status,
                status_history as "statusHistory", tx_hash as "txHash",
                error_message as "errorMessage", created_at as "createdAt";
    `;

    try {
      const result = await this.pool.query(query, [
        data.id,
        data.agentId,
        data.submissionId,
        data.idempotencyKey || null,
        data.type,
        JSON.stringify(data.params),
      ]);

      return result.rows[0] as BYOAIntent;
    } catch (error) {
      logger.error({ error, agentId: data.agentId }, "Failed to create intent");
      throw error;
    }
  }

  /**
   * Get intent by ID
   */
  async getIntentById(intentId: string): Promise<BYOAIntent | null> {
    const query = `
      SELECT id, agent_id as "agentId", submission_id as "submissionId",
             idempotency_key as "idempotencyKey", type, params, status,
             status_history as "statusHistory", result, tx_hash as "txHash",
             error_message as "errorMessage", created_at as "createdAt",
             executed_at as "executedAt"
      FROM byoa_intents
      WHERE id = $1;
    `;

    try {
      const result = await this.pool.query(query, [intentId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ error, intentId }, "Failed to get intent");
      throw error;
    }
  }

  /**
   * Update intent status with history tracking
   */
  async updateIntentStatus(
    intentId: string,
    status: string,
    data?: { result?: Record<string, unknown>; txHash?: string; errorMessage?: string }
  ): Promise<void> {
    const query = `
      UPDATE byoa_intents
      SET status = $2,
          status_history = jsonb_append(
            status_history,
            jsonb_build_object('status', $2, 'timestamp', NOW())
          ),
          result = $3,
          tx_hash = $4,
          error_message = $5,
          executed_at = CASE WHEN $2 IN ('executed', 'failed', 'rejected') THEN NOW() ELSE executed_at END
      WHERE id = $1;
    `;

    try {
      await this.pool.query(query, [
        intentId,
        status,
        data?.result ? JSON.stringify(data.result) : null,
        data?.txHash || null,
        data?.errorMessage || null,
      ]);
    } catch (error) {
      logger.error({ error, intentId }, "Failed to update intent status");
      throw error;
    }
  }

  /**
   * Get agent's recent intents
   */
  async getAgentIntents(
    agentId: string,
    limit = 50,
    offset = 0
  ): Promise<{ intents: BYOAIntent[]; total: number }> {
    const query = `
      SELECT id, agent_id as "agentId", submission_id as "submissionId",
             idempotency_key as "idempotencyKey", type, params, status,
             status_history as "statusHistory", result, tx_hash as "txHash",
             error_message as "errorMessage", created_at as "createdAt",
             executed_at as "executedAt"
      FROM byoa_intents
      WHERE agent_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;

    const countQuery = "SELECT COUNT(*) as count FROM byoa_intents WHERE agent_id = $1;";

    try {
      const [result, countResult] = await Promise.all([
        this.pool.query(query, [agentId, limit, offset]),
        this.pool.query(countQuery, [agentId]),
      ]);

      return {
        intents: result.rows,
        total: parseInt(countResult.rows[0].count, 10),
      };
    } catch (error) {
      logger.error({ error, agentId }, "Failed to get agent intents");
      throw error;
    }
  }

  /**
   * Count intents submitted this hour
   */
  async countIntentsThisHour(agentId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM byoa_intents
      WHERE agent_id = $1 AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour';
    `;

    try {
      const result = await this.pool.query(query, [agentId]);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error({ error, agentId }, "Failed to count intents this hour");
      throw error;
    }
  }

  // ========================================================================
  // AUDIT LOG
  // ========================================================================

  /**
   * Create audit log entry
   */
  async createAuditLog(data: {
    agentId?: string;
    action: string;
    status: "success" | "error";
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const query = `
      INSERT INTO byoa_audit_log
        (agent_id, action, status, ip_address, user_agent, request_id, metadata, created_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, NOW());
    `;

    try {
      await this.pool.query(query, [
        data.agentId || null,
        data.action,
        data.status,
        data.ipAddress || null,
        data.userAgent || null,
        data.requestId || null,
        JSON.stringify(data.metadata || {}),
      ]);
    } catch (error) {
      logger.error({ error, agentId: data.agentId }, "Failed to create audit log");
    }
  }

  /**
   * Get audit log for agent (or global if no agentId)
   */
  async getAuditLog(
    agentId?: string,
    limit = 100,
    offset = 0
  ): Promise<{ logs: BYOAAuditLog[]; total: number }> {
    const whereClause = agentId ? "WHERE agent_id = $1" : "";
    const params = agentId ? [agentId, limit, offset] : [limit, offset];

    const query = `
      SELECT id, agent_id as "agentId", action, status,
             ip_address as "ipAddress", user_agent as "userAgent",
             request_id as "requestId", metadata, created_at as "createdAt"
      FROM byoa_audit_log
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${agentId ? 2 : 1} OFFSET $${agentId ? 3 : 2};
    `;

    const countQuery = `SELECT COUNT(*) as count FROM byoa_audit_log ${whereClause};`;

    try {
      const [result, countResult] = await Promise.all([
        this.pool.query(query, params),
        this.pool.query(countQuery, agentId ? [agentId] : []),
      ]);

      return {
        logs: result.rows,
        total: parseInt(countResult.rows[0].count, 10),
      };
    } catch (error) {
      logger.error({ error }, "Failed to get audit log");
      throw error;
    }
  }

  // ========================================================================
  // RATE LIMITS
  // ========================================================================

  /**
   * Get or create rate limit window for agent
   */
  async getOrCreateRateLimit(
    agentId: string,
    windowStart: Date
  ): Promise<{ intentsCount: number; requestsCount: number; xemTransferred: string }> {
    const query = `
      INSERT INTO byoa_rate_limits
        (agent_id, window_start, intents_count, requests_count, xem_transferred)
      VALUES
        ($1, $2, 0, 0, '0.00')
      ON CONFLICT (agent_id, window_start)
      DO UPDATE SET updated_at = NOW()
      RETURNING intents_count as "intentsCount", requests_count as "requestsCount",
                xem_transferred as "xemTransferred";
    `;

    try {
      const result = await this.pool.query(query, [agentId, windowStart]);
      return result.rows[0];
    } catch (error) {
      logger.error({ error, agentId }, "Failed to get/create rate limit");
      throw error;
    }
  }

  /**
   * Increment intent count for rate limit window
   */
  async incrementIntentCount(agentId: string, windowStart: Date): Promise<void> {
    const query = `
      UPDATE byoa_rate_limits
      SET intents_count = intents_count + 1
      WHERE agent_id = $1 AND window_start = $2;
    `;

    try {
      await this.pool.query(query, [agentId, windowStart]);
    } catch (error) {
      logger.error({ error, agentId }, "Failed to increment intent count");
      throw error;
    }
  }

  // ========================================================================
  // CIRCUIT BREAKER
  // ========================================================================

  /**
   * Check and update circuit breaker state
   */
  async getCircuitBreakerState(agentId: string): Promise<BYOACircuitBreakerState | null> {
    const query = `
      SELECT agent_id as "agentId", is_open as "isOpen", failure_count as "failureCount",
             last_failure_at as "lastFailureAt", opened_at as "openedAt", closed_at as "closedAt"
      FROM byoa_circuit_breakers
      WHERE agent_id = $1;
    `;

    try {
      const result = await this.pool.query(query, [agentId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ error, agentId }, "Failed to get circuit breaker state");
      throw error;
    }
  }

  /**
   * Activate circuit breaker for agent
   */
  async activateCircuitBreaker(agentId: string, failureCount: number): Promise<void> {
    const query = `
      INSERT INTO byoa_circuit_breakers
        (agent_id, is_open, failure_count, last_failure_at, opened_at)
      VALUES
        ($1, true, $2, NOW(), NOW())
      ON CONFLICT (agent_id)
      DO UPDATE SET
        is_open = true,
        failure_count = $2,
        last_failure_at = NOW();
    `;

    try {
      await this.pool.query(query, [agentId, failureCount]);
      logger.warn({ agentId, failureCount }, "Circuit breaker activated");
    } catch (error) {
      logger.error({ error, agentId }, "Failed to activate circuit breaker");
      throw error;
    }
  }
}

export default BYOADatabase;
