/**
 * BYOA (Bring Your Own Agent) API Endpoints
 * POST   /byoa/register                      - Register external agent
 * GET    /byoa/agents/:agent_id              - Get agent info
 * PUT    /byoa/agents/:agent_id/config       - Update agent config
 * POST   /byoa/agents/:agent_id/intents      - Submit intents
 * GET    /byoa/agents/:agent_id/intents/:id  - Get intent status
 * GET    /byoa/agents/:agent_id/transactions - Get transaction history
 */

import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";
import {
  byoaAuthMiddleware,
  byoaRateLimitMiddleware,
  requireBYOAAuth,
  byoaAuditLog,
} from "../middleware/byoa-auth";
import { BYOAAgentService, BYOAIntentService } from "../services/byoa";
import {
  BYOARegistrationRequestSchema,
  BYOAIntentSubmissionRequestSchema,
  BYOAConfigUpdateRequestSchema,
  BYOATransactionFilterSchema,
  validateIntentParams,
} from "../schemas/byoa";
import type { BYOARegistrationRequest, BYOAIntentSubmissionRequest } from "../schemas/byoa";

const router = Router();

// Apply audit logging to all BYOA routes
router.use(byoaAuditLog);

// ============================================================================
// 1. POST /byoa/register - Register External Agent
// ============================================================================
/**
 * Register a new external agent and create a wallet for it.
 *
 * Request body:
 * {
 *   "name": "Treasury Bot v2",
 *   "description": "Automated treasury management",
 *   "webhook_url": "https://external-system.com/webhook/stellar",
 *   "webhook_secret": "secret_for_hmac_verification",
 *   "contact_email": "contact@example.com",
 *   "metadata": { "organization": "MyProtocol" }
 * }
 *
 * Response (201 Created):
 * {
 *   "success": true,
 *   "agent": { "id", "name", "wallet", "status", "created_at" },
 *   "wallet_info": { "public_key", "needs_funding", "min_funded_amount" },
 *   "credentials": { "control_token", "note" }
 * }
 */
router.post("/register", async (req: Request, res: Response) => {
  const requestId = uuidv4();

  try {
    // Validate request body
    const result = BYOARegistrationRequestSchema.safeParse(req.body);
    if (!result.success) {
      logger.warn(
        {
          requestId,
          errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        },
        "BYOA registration validation failed"
      );

      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid registration request",
          details: result.error.errors,
        },
        requestId,
      });
      return;
    }

    const data: BYOARegistrationRequest = result.data;

    // Register agent
    const agent = await BYOAAgentService.registerAgent({
      name: data.name,
      description: data.description,
      webhookUrl: data.webhookUrl || undefined,
      webhookSecret: data.webhookSecret || undefined,
      contactEmail: data.contactEmail || undefined,
      metadata: data.metadata,
    });

    logger.info(
      { requestId, agentName: data.name, agentId: agent.agentId },
      "External agent registered"
    );

    res.status(201).json({
      success: true,
      agent: {
        id: agent.agentId,
        name: data.name,
        wallet: agent.publicKey,
        status: "active",
        created_at: new Date().toISOString(),
        created_by: req.ip,
      },
      wallet_info: {
        public_key: agent.publicKey,
        needs_funding: true,
        min_funded_amount: "10.00",
      },
      credentials: {
        control_token: agent.controlToken,
        note: "Save this token securely. You will not be able to see it again. Use it in the X-Control-Token-Hash header (value: SHA-256(control_token)) for all requests.",
      },
      api_docs: "https://docs.agentic-wallet.io/byoa",
      requestId,
    });
  } catch (error) {
    logger.error({ requestId, error }, "BYOA registration failed");

    res.status(500).json({
      success: false,
      error: {
        code: "REGISTRATION_FAILED",
        message: "Failed to create agent",
      },
      requestId,
    });
  }
});

// ============================================================================
// 2. GET /byoa/agents/:agent_id - Get Agent Info
// ============================================================================
/**
 * Get current agent status, balance, permissions, and statistics.
 */
router.get("/agents/:agent_id", byoaAuthMiddleware, requireBYOAAuth, async (req: Request, res: Response) => {
  const { agent_id } = req.params;
  const { requestId } = req.byoaAuth!;

  try {
    // Verify agent can only access own info
    if (req.byoaAuth!.agentId !== agent_id) {
      logger.warn(
        { requestId, requestedAgentId: agent_id, authenticatedAgentId: req.byoaAuth!.agentId },
        "Agent attempted to access another agent's info"
      );

      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You can only access your own agent information",
        },
        requestId,
      });
      return;
    }

    const agentInfo = await BYOAAgentService.getAgentInfo(agent_id);

    res.status(200).json({
      success: true,
      agent: {
        id: agentInfo.id,
        name: agentInfo.name,
        wallet: agentInfo.wallet,
        status: agentInfo.status,
        balance: agentInfo.balance,
        permissions: agentInfo.permissions,
        rate_limit_status: agentInfo.rateLimitStatus,
        statistics: agentInfo.statistics,
      },
      requestId,
    });
  } catch (error) {
    logger.error({ requestId, agent_id, error }, "Failed to get agent info");

    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to retrieve agent information" },
      requestId,
    });
  }
});

// ============================================================================
// 3. PUT /byoa/agents/:agent_id/config - Update Agent Config
// ============================================================================
/**
 * Update webhook URL, permissions, or metadata.
 */
router.put(
  "/agents/:agent_id/config",
  byoaAuthMiddleware,
  requireBYOAAuth,
  async (req: Request, res: Response) => {
    const { agent_id } = req.params;
    const { requestId, agentId } = req.byoaAuth!;

    try {
      // Verify agent is updating own config
      if (agentId !== agent_id) {
        res.status(403).json({
          success: false,
          error: { code: "FORBIDDEN", message: "Can only update own agent config" },
          requestId,
        });
        return;
      }

      // Validate request body
      const result = BYOAConfigUpdateRequestSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid config update",
            details: result.error.errors,
          },
          requestId,
        });
        return;
      }

      await BYOAAgentService.updateAgentConfig(agent_id, result.data);

      logger.info({ requestId, agent_id }, "Agent config updated");

      res.status(200).json({
        success: true,
        agent: await BYOAAgentService.getAgentInfo(agent_id),
        requestId,
      });
    } catch (error) {
      logger.error({ requestId, agent_id, error }, "Failed to update agent config");

      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to update config" },
        requestId,
      });
    }
  }
);

// ============================================================================
// 4. POST /byoa/agents/:agent_id/intents - Submit Intents
// ============================================================================
/**
 * Submit financial intents for execution.
 * Returns 202 Accepted for async processing.
 */
router.post(
  "/agents/:agent_id/intents",
  byoaAuthMiddleware,
  byoaRateLimitMiddleware,
  async (req: Request, res: Response) => {
    const { agent_id } = req.params;
    const { requestId, agentId } = req.byoaAuth!;

    try {
      // Verify agent can only submit own intents
      if (agentId !== agent_id) {
        res.status(403).json({
          success: false,
          error: { code: "FORBIDDEN", message: "Can only submit intents for own agent" },
          requestId,
        });
        return;
      }

      // Validate request body
      const result = BYOAIntentSubmissionRequestSchema.safeParse(req.body);
      if (!result.success) {
        logger.warn({ requestId, errors: result.error.errors }, "Intent validation failed");

        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid intent submission",
            details: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          },
          requestId,
        });
        return;
      }

      const submission: BYOAIntentSubmissionRequest = result.data;

      // Validate intent parameters
      const validationErrors = [];
      for (let i = 0; i < submission.intents.length; i++) {
        const intent = submission.intents[i];
        const validation = validateIntentParams(intent.type, intent.params);
        if (!validation.valid) {
          validationErrors.push({
            intent_index: i,
            error: validation.error,
          });
        }
      }

      if (validationErrors.length > 0) {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          details: validationErrors,
          requestId,
        });
        return;
      }

      // Submit intents
      const result2 = await BYOAIntentService.submitIntents(agent_id, submission);

      logger.info(
        {
          requestId,
          agent_id,
          submissionId: result2.submissionId,
          accepted: result2.intentsAccepted,
          rejected: result2.intentsRejected,
        },
        "Intent batch submitted"
      );

      res.status(202).json({
        success: true,
        submission_id: result2.submissionId,
        intents_accepted: result2.intentsAccepted,
        intents_rejected: result2.intentsRejected,
        queue_position: 1,
        estimated_execution_time_ms: 5000,
        details: result2.details,
        requestId,
      });
    } catch (error) {
      logger.error({ requestId, agent_id, error }, "Intent submission failed");

      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to submit intents" },
        requestId,
      });
    }
  }
);

// ============================================================================
// 5. GET /byoa/agents/:agent_id/intents/:intent_id - Get Intent Status
// ============================================================================
/**
 * Poll for intent execution status.
 */
router.get(
  "/agents/:agent_id/intents/:intent_id",
  byoaAuthMiddleware,
  requireBYOAAuth,
  async (req: Request, res: Response) => {
    const { agent_id, intent_id } = req.params;
    const { requestId, agentId } = req.byoaAuth!;

    try {
      // Verify agent can only access own intents
      if (agentId !== agent_id) {
        res.status(403).json({
          success: false,
          error: { code: "FORBIDDEN", message: "Can only access own intents" },
          requestId,
        });
        return;
      }

      const intent = await BYOAIntentService.getIntentStatus(agent_id, intent_id);

      if (!intent) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Intent not found" },
          requestId,
        });
        return;
      }

      res.status(200).json({
        success: true,
        intent: {
          id: intent.id,
          agent_id: intent.agentId,
          type: intent.type,
          params: intent.params,
          status: intent.status,
          status_history: intent.statusHistory,
          execution_result: intent.result,
        },
        requestId,
      });
    } catch (error) {
      logger.error({ requestId, intent_id, error }, "Failed to get intent status");

      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to retrieve intent status" },
        requestId,
      });
    }
  }
);

// ============================================================================
// 6. GET /byoa/agents/:agent_id/transactions - Get Transaction History
// ============================================================================
/**
 * View transaction history with filtering.
 */
router.get(
  "/agents/:agent_id/transactions",
  byoaAuthMiddleware,
  requireBYOAAuth,
  async (req: Request, res: Response) => {
    const { agent_id } = req.params;
    const { requestId, agentId } = req.byoaAuth!;

    try {
      // Verify agent can only access own transactions
      if (agentId !== agent_id) {
        res.status(403).json({
          success: false,
          error: { code: "FORBIDDEN", message: "Can only access own transactions" },
          requestId,
        });
        return;
      }

      // Parse and validate query parameters
      const filterResult = BYOATransactionFilterSchema.safeParse(req.query);
      if (!filterResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_FILTER",
            message: "Invalid filter parameters",
            details: filterResult.error.errors,
          },
          requestId,
        });
        return;
      }

      const filter = filterResult.data;

      // TODO: Fetch intents with filters from database
      // const { intents, total } = await BYOAIntentService.getAgentIntents(
      //   agent_id,
      //   filter.limit,
      //   filter.offset
      // );

      // Mock response
      res.status(200).json({
        success: true,
        transactions: [
          {
            tx_hash: "5f22de17e79e4f3ac559b8c1fddec2dcc3c38c996dd2bdf8ce1b387c20e68f02",
            intent_id: "intent_...",
            type: "TRANSFER_XLM",
            status: "success",
            amount: "50.00",
            destination: "GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTTNUVES35LSKNQRMTFSLOGGJU",
            memo: "monthly_distribution",
            created_at: new Date().toISOString(),
            confirmed_at: new Date().toISOString(),
            link: "https://stellar.expert/explorer/testnet/tx/...",
          },
        ],
        pagination: {
          limit: filter.limit,
          offset: filter.offset,
          total: 1245,
        },
        requestId,
      });
    } catch (error) {
      logger.error({ requestId, agent_id, error }, "Failed to get transactions");

      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to retrieve transactions" },
        requestId,
      });
    }
  }
);

export default router;
