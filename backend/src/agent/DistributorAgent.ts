/**
 * Distributor Agent
 * 
 * Sends regular payments to configured recipients
 * Useful for payouts, allowances, or periodic distributions
 */

import { BaseAgent } from "./BaseAgent.js";
import { AgentContext, Intent, AgentConfig } from "../types/index.js";
import { logger } from "../utils/logger.js";

/**
 * Configuration interface for DistributorAgent
 */
interface DistributorConfig {
  payments: Array<{
    address: string;
    amount: string;
    memo?: string;
    frequency?: "every-cycle" | "daily" | "weekly"; // For phase 2
  }>;
  minRequired: number; // Minimum XLM to keep; don't distribute below this
}

export class DistributorAgent extends BaseAgent {
  async think(context: AgentContext): Promise<Intent[]> {
    try {
      const config = (this.config.config as unknown) as DistributorConfig;
      const currentXLM = parseFloat(context.balances.native);
      const minRequired = config.minRequired || 10;

      logger.debug("Distributor thinking", {
        agentId: this.agentId,
        currentXLM,
        minRequired,
        paymentCount: config.payments.length,
      });

      // Check if sufficient balance
      if (currentXLM < minRequired) {
        logger.debug("Distributor insufficient balance", {
          agentId: this.agentId,
          current: currentXLM,
          required: minRequired,
        });
        return []; // Not enough balance
      }

      // Check if we have enough for all payments + fees
      const totalPayment = config.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const fees = config.payments.length * 0.00001;
      const totalNeeded = totalPayment + fees;

      if (currentXLM - totalNeeded < minRequired) {
        logger.debug("Distributor payment would violate minimum", {
          agentId: this.agentId,
          totalPayment,
          fees,
          current: currentXLM,
          minRequired,
        });
        return []; // Would violate minimum
      }

      // Propose all payments
      const intents: Intent[] = [];
      for (const payment of config.payments) {
        intents.push(
          this.proposeTransferXLM(
            payment.address,
            payment.amount,
            payment.memo || `Distribution from ${this.name}`
          )
        );
      }

      logger.info("Distributor proposing payments", {
        agentId: this.agentId,
        count: intents.length,
        total: totalPayment.toString(),
      });

      return intents;
    } catch (err) {
      logger.error("Distributor think error", {
        agentId: this.agentId,
        error: (err as Error).message,
      });
      return [];
    }
  }
}
