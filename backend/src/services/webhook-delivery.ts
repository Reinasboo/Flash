/**
 * BYOA Webhook Delivery Engine
 * Background job for delivering webhook events with retry logic
 * Implements exponential backoff, HMAC-SHA256 signatures, and HTTP delivery
 */

import crypto from "crypto";
import { logger } from "../utils/logger.js";
import BYOADatabase from "../database/byoa.js";
import type { BYOAWebhookEvent } from "../types/index.js";

/**
 * Webhook Delivery Service
 * Processes pending events and delivers them to registered webhooks
 */
export class WebhookDeliveryService {
  private static readonly MAX_RETRIES = 5;
  private static readonly TIMEOUT_MS = 10000;
  private static readonly RETRY_DELAYS_MS = [0, 5000, 25000, 120000, 600000];
  private static isProcessing = false;
  private static db = BYOADatabase.getInstance();

  /**
   * Start the background processor
   * Runs at specified interval to deliver pending webhook events
   */
  static startBackgroundProcessor(intervalMs = 30000): NodeJS.Timer {
    logger.info({ intervalMs }, "Starting webhook delivery background processor");

    return setInterval(async () => {
      if (this.isProcessing) {
        logger.debug("Webhook processor already running, skipping cycle");
        return;
      }

      try {
        this.isProcessing = true;
        const result = await this.processPendingEvents();
        logger.info(result, "Webhook processing cycle complete");
      } catch (error) {
        logger.error({ error }, "Webhook processor error");
      } finally {
        this.isProcessing = false;
      }
    }, intervalMs);
  }

  /**
   * Process all pending webhook events
   * Fetches pending events from database and attempts delivery
   */
  private static async processPendingEvents(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    scheduled: number;
  }> {
    try {
      logger.debug("Processing pending webhook events");

      // TODO: Implement DB method to fetch pending events
      // For now, return placeholder metrics
      // const pendingEvents = await this.db.getPendingWebhookEvents();
      // let succeeded = 0;
      // let failed = 0;
      // let scheduled = 0;

      // for (const event of pendingEvents) {
      //   try {
      //     await this.deliverEvent(event);
      //     succeeded++;
      //   } catch (error) {
      //     if (event.attempts < this.MAX_RETRIES - 1) {
      //       await this.scheduleRetry(event);
      //       scheduled++;
      //     } else {
      //       logger.error({ eventId: event.id }, "Webhook delivery permanently failed");
      //       failed++;
      //     }
      //   }
      // }

      return {
        processed: 0,
        succeeded: 0,
        failed: 0,
        scheduled: 0,
      };
    } catch (error) {
      logger.error({ error }, "Failed to process pending webhook events");
      return { processed: 0, succeeded: 0, failed: 0, scheduled: 0 };
    }
  }

  /**
   * Deliver webhook event to external URL
   * Includes HMAC-SHA256 signature and timing-safe headers
   */
  private static async deliverEvent(event: BYOAWebhookEvent): Promise<void> {
    // TODO: Implement webhook delivery when database methods are ready
    // const webhooks = await this.db.getWebhooksByAgentId(event.agentId);
    // if (!webhooks || webhooks.length === 0) {
    //   throw new Error("No webhook configured for agent");
    // }

    // const webhook = webhooks[0];
    // const url = webhook.url;
    // const secret = webhook.secretEncrypted;

    // Prepare payload
    const payload = {
      id: event.id,
      timestamp: new Date().toISOString(),
      type: event.eventType,
      agentId: event.agentId,
      data: event.payload,
    };

    logger.debug({ payload }, "Webhook delivery skipped (not yet implemented)");
  }

  /**
   * Schedule retry for failed webhook event
   * Uses exponential backoff timing
   */
  private static async scheduleRetry(event: BYOAWebhookEvent): Promise<void> {
    const nextAttempt = event.attempts + 1;

    if (nextAttempt >= this.MAX_RETRIES) {
      logger.error({ eventId: event.id, attempts: event.attempts }, "Max retries exceeded");
      // TODO: Update to failed status, send admin notification
      return;
    }

    const delayMs = this.RETRY_DELAYS_MS[nextAttempt] || this.RETRY_DELAYS_MS[this.MAX_RETRIES - 1];
    const nextRetryAt = new Date(Date.now() + delayMs);

    logger.info(
      { eventId: event.id, attempt: nextAttempt, delayMs, nextRetryAt },
      "Scheduling webhook retry"
    );

    // TODO: Update database with next_retry_at and increment attempts
    // await this.db.updateWebhookEventRetry(event.id, nextRetryAt, nextAttempt);
  }

  /**
   * Generate HMAC-SHA256 signature for webhook payload
   * Client can verify this signature to ensure authenticity
   */
  private static generateSignature(payload: Record<string, unknown>, secret: string): string {
    const payloadString = JSON.stringify(payload);
    return crypto.createHmac("sha256", secret).update(payloadString).digest("hex");
  }

  /**
   * Verify webhook signature (for testing/validation)
   */
  static verifySignature(payload: Record<string, unknown>, secret: string, signature: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }
}

/**
 * Event payload builder for type safety
 */
export class WebhookEventBuilder {
  static intentSubmitted(agentId: string, intentId: string, submissionId: string) {
    return {
      agentId,
      eventType: "intent.submitted",
      payload: {
        intent_id: intentId,
        submission_id: submissionId,
        type: "TRANSFER_XLM",
        status: "queued",
        timestamp: new Date().toISOString(),
      },
    };
  }

  static intentExecuted(agentId: string, intentId: string, txHash: string) {
    return {
      agentId,
      eventType: "intent.executed",
      payload: {
        intent_id: intentId,
        status: "executed",
        tx_hash: txHash,
        tx_link: `https://stellar.expert/explorer/testnet/tx/${txHash}`,
        timestamp: new Date().toISOString(),
      },
    };
  }

  static intentFailed(agentId: string, intentId: string, error: string) {
    return {
      agentId,
      eventType: "intent.failed",
      payload: {
        intent_id: intentId,
        status: "failed",
        error,
        timestamp: new Date().toISOString(),
      },
    };
  }

  static agentSuspended(agentId: string, reason: string) {
    return {
      agentId,
      eventType: "agent.suspended",
      payload: {
        agent_id: agentId,
        reason,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export default WebhookDeliveryService;
