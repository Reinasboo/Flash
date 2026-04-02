/**
 * Accumulator Agent
 * 
 * Maintains a target XLM balance by sweeping excess to a vault address
 * Useful for accumulating fees or managing buffer balances
 */

import { BaseAgent } from "./BaseAgent.js";
import { AgentContext, Intent, AgentConfig } from "../types/index.js";
import { logger } from "../utils/logger.js";

/**
 * Configuration interface for AccumulatorAgent
 */
interface AccumulatorConfig {
  vaultAddress: string; // Where to sweep excess XLM
  targetMinimum: number; // Minimum XLM to keep
  targetMaximum: number; // Maximum XLM before sweeping
  sweepThreshold?: number; // Min amount before sweeping (default 1)
}

export class AccumulatorAgent extends BaseAgent {
  async think(context: AgentContext): Promise<Intent[]> {
    try {
      const config = (this.config.config as unknown) as AccumulatorConfig;
      const currentXLM = parseFloat(context.balances.native);
      const targetMin = config.targetMinimum || 50;
      const targetMax = config.targetMaximum || 100;
      const sweepThreshold = config.sweepThreshold || 1;

      logger.debug("Accumulator thinking", {
        agentId: this.agentId,
        currentXLM,
        targetMin,
        targetMax,
      });

      // Check if excess and above maximum
      if (currentXLM > targetMax) {
        const excessBeforeFee = currentXLM - targetMin;
        const fee = 0.00001; // Stellar base fee
        const excess = excessBeforeFee - fee;

        // Only sweep if threshold exceeded
        if (excess >= sweepThreshold) {
          logger.info("Accumulator proposing sweep", {
            agentId: this.agentId,
            excess: excess.toString(),
            vault: config.vaultAddress,
          });

          return [
            this.proposeTransferXLM(
              config.vaultAddress,
              excess.toFixed(7),
              `Sweep from ${this.name}`
            ),
          ];
        }
      }

      // No action needed
      return [];
    } catch (err) {
      logger.error("Accumulator think error", {
        agentId: this.agentId,
        error: (err as Error).message,
      });
      return [];
    }
  }
}
