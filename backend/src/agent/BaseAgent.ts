/**
 * Base Agent - Abstract class for all agents
 * 
 * Agents NEVER access private keys or sign transactions
 * Agents only call think() to propose intents
 */

import { AgentContext, Intent, AgentConfig } from "../types/index.js";

export abstract class BaseAgent {
  protected agentId: string;
  protected name: string;
  protected config: AgentConfig;

  constructor(agentId: string, name: string, config: AgentConfig) {
    this.agentId = agentId;
    this.name = name;
    this.config = config;
  }

  /**
   * Called every orchestration cycle
   * Returns list of intents to execute, or empty if no action needed
   * 
   * CRITICAL: This is the ONLY decision-making method
   * Agents have ZERO access to private keys or raw signing
   */
  abstract think(context: AgentContext): Promise<Intent[]>;

  /**
   * Helper: Propose a transfer XLM intent
   */
  protected proposeTransferXLM(destination: string, amount: string, memo?: string): Intent {
    return {
      type: "TRANSFER_XLM",
      params: {
        destination,
        amount,
        memo,
      },
    };
  }

  /**
   * Helper: Propose a transfer asset intent
   */
  protected proposeTransferAsset(
    assetCode: string,
    issuer: string,
    destination: string,
    amount: string,
    memo?: string
  ): Intent {
    return {
      type: "TRANSFER_ASSET",
      params: {
        assetCode,
        issuer,
        destination,
        amount,
        memo,
      },
    };
  }

  /**
   * Helper: Propose creating a trust line
   */
  protected proposeCreateTrustLine(assetCode: string, issuer: string): Intent {
    return {
      type: "CREATE_TRUST_LINE",
      params: {
        assetCode,
        issuer,
      },
    };
  }

  /**
   * Helper: Propose checking balance
   */
  protected proposeCheckBalance(): Intent {
    return {
      type: "CHECK_BALANCE",
      params: {},
    };
  }

  /**
   * Getters
   */
  getAgentId(): string {
    return this.agentId;
  }

  getName(): string {
    return this.name;
  }

  getConfig(): AgentConfig {
    return this.config;
  }
}
