/**
 * Orchestrator
 * 
 * Coordinates agent execution, intent validation, and transaction flow
 * Responsible for:
 * - Building read-only context for agents
 * - Calling agent.think()
 * - Validating intents
 * - Executing intents via wallet + stellar client
 * - Emitting events
 */

import { EventEmitter } from "events";
import { Account as AccountType, AgentContext, Intent, ExecutionResult, ValidationResult, EventType, SystemEvent } from "../types/index.js";
import { WalletManager } from "../wallet/WalletManager.js";
import { StellarClient } from "../stellar/StellarClient.js";
import { BaseAgent } from "../agent/BaseAgent.js";
import { logger } from "../utils/logger.js";

export class Orchestrator extends EventEmitter {
  private agentId: string;
  private agent: BaseAgent;
  private wallet: WalletManager;
  private client: StellarClient;
  private isRunning: boolean = false;
  private executionHistory: ExecutionResult[] = [];
  private errorCount: number = 0;

  constructor(
    agentId: string,
    agent: BaseAgent,
    wallet: WalletManager,
    client: StellarClient
  ) {
    super();
    this.agentId = agentId;
    this.agent = agent;
    this.wallet = wallet;
    this.client = client;
  }

  /**
   * Start the orchestration loop
   */
  async start(intervalMs: number = 30000): Promise<void> {
    if (this.isRunning) {
      logger.warn("Orchestrator already running", { agentId: this.agentId });
      return;
    }

    this.isRunning = true;
    logger.info("Orchestrator started", { agentId: this.agentId, intervalMs });
    this.emit("started");

    this.executeLoop(intervalMs);
  }

  /**
   * Stop the orchestration loop
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    logger.info("Orchestrator stopped", { agentId: this.agentId });
    this.emit("stopped");
  }

  /**
   * Main execution loop
   */
  private async executeLoop(intervalMs: number): Promise<void> {
    while (this.isRunning) {
      try {
        // 1. Build read-only context
        const context = await this.buildContext();

        // 2. Call agent.think()
        const intents = await this.agent.think(context);

        if (intents.length > 0) {
          logger.debug("Agent proposed intents", {
            agentId: this.agentId,
            count: intents.length,
          });
        }

        // 3. Validate and execute intents
        const results: ExecutionResult[] = [];
        for (const intent of intents) {
          try {
            const validation = await this.validateIntent(intent, context);

            if (!validation.valid) {
              logger.debug("Intent rejected", {
                agentId: this.agentId,
                reason: validation.reason,
              });
              results.push({
                intentId: `${Date.now()}-${Math.random()}`,
                intent,
                status: "rejected",
                error: validation.reason,
                timestamp: Date.now(),
              });
              this.emit("intent-rejected", { intent, reason: validation.reason });
              continue;
            }

            // Execute intent
            const result = await this.executeIntent(intent, context);
            results.push(result);

            if (result.status === "success") {
              logger.info("Intent executed", {
                agentId: this.agentId,
                intentType: intent.type,
                txHash: result.txHash,
              });
              this.emit("intent-executed", { intent, txHash: result.txHash });
            } else {
              logger.warn("Intent execution failed", {
                agentId: this.agentId,
                intentType: intent.type,
                error: result.error,
              });
              this.emit("intent-failed", { intent, error: result.error });
            }
          } catch (err) {
            const error = err as Error;
            logger.error("Intent execution error", {
              agentId: this.agentId,
              intentType: intent.type,
              error: error.message,
            });
            results.push({
              intentId: `${Date.now()}-${Math.random()}`,
              intent,
              status: "failed",
              error: error.message,
              timestamp: Date.now(),
            });
          }
        }

        // 4. Store and emit cycle completion
        this.executionHistory = this.executionHistory.concat(results).slice(-100); // Keep last 100
        this.emit("cycle-complete", {
          timestamp: Date.now(),
          intents: intents.length,
          results,
        });

        this.errorCount = 0; // Reset error count on successful cycle

      } catch (err) {
        const error = err as Error;
        this.errorCount++;
        logger.error("Orchestrator cycle error", {
          agentId: this.agentId,
          error: error.message,
          errorCount: this.errorCount,
        });
        this.emit("cycle-error", { error: error.message, errorCount: this.errorCount });

        // Stop if too many consecutive errors
        if (this.errorCount > 5) {
          logger.error("Orchestrator stopping due to repeated errors", { agentId: this.agentId });
          await this.stop();
          break;
        }
      }

      // Sleep before next cycle
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  /**
   * Build read-only context for agent
   */
  private async buildContext(): Promise<AgentContext> {
    const publicKey = this.wallet.getPublicKey(this.agentId);

    const [account, transactions] = await Promise.all([
      this.client.getAccount(publicKey),
      this.client.getTransactionHistory(publicKey, 10),
    ]);

    const balances: { native: string; assets: Array<{ code: string; issuer: string; balance: string }> } = { native: "", assets: [] };
    for (const b of account.balances) {
      if (b.asset_type === "native") {
        balances.native = b.balance;
      } else {
        balances.assets.push({
          code: b.asset_code!,
          issuer: b.asset_issuer!,
          balance: b.balance,
        });
      }
    }

    return {
      agentId: this.agentId,
      publicKey,
      balances,
      recentTransactions: transactions,
      ledgerTime: Math.floor(Date.now() / 1000),
      ledgerSequence: 0, // TODO: Fetch from server
      config: this.agent.getConfig(),
    };
  }

  /**
   * Validate intent against current state
   */
  private async validateIntent(
    intent: Intent,
    context: AgentContext
  ): Promise<ValidationResult> {
    switch (intent.type) {
      case "TRANSFER_XLM": {
        const amount = parseFloat(intent.params.amount as string);
        const fee = 0.00001;
        const totalNeeded = amount + fee;
        const available = parseFloat(context.balances.native);

        if (!Number.isFinite(amount) || amount <= 0) {
          return { valid: false, reason: "Invalid amount" };
        }

        if (!(intent.params.destination as string).startsWith("G")) {
          return { valid: false, reason: "Invalid destination address" };
        }

        if (available < totalNeeded) {
          return { valid: false, reason: "Insufficient balance" };
        }

        return { valid: true };
      }

      case "TRANSFER_ASSET": {
        const { assetCode, issuer, amount, destination } = intent.params;
        const asset = context.balances.assets.find(
          (a) => a.code === assetCode && a.issuer === issuer
        );

        if (!asset) {
          return { valid: false, reason: "Asset not found or no trust line" };
        }

        if (parseFloat(asset.balance) < parseFloat(amount as string)) {
          return { valid: false, reason: "Insufficient asset balance" };
        }

        if (!(destination as string).startsWith("G")) {
          return { valid: false, reason: "Invalid destination address" };
        }

        return { valid: true };
      }

      case "CREATE_TRUST_LINE": {
        const { assetCode, issuer } = intent.params;

        // Check if already has trust line
        const exists = context.balances.assets.some(
          (a) => a.code === assetCode && a.issuer === issuer
        );

        if (exists) {
          return { valid: false, reason: "Trust line already exists" };
        }

        // Check fee
        const fee = 0.00001;
        if (parseFloat(context.balances.native) < fee) {
          return { valid: false, reason: "Insufficient XLM for trust line fee" };
        }

        return { valid: true };
      }

      case "CHECK_BALANCE": {
        return { valid: true };
      }

      default:
        return { valid: false, reason: "Unknown intent type" };
    }
  }

  /**
   * Execute a single intent
   */
  private async executeIntent(
    intent: Intent,
    context: AgentContext
  ): Promise<ExecutionResult> {
    const intentId = `${Date.now()}-${Math.random()}`;

    try {
      let signedEnvelope: string;
      let account: AccountType;

      switch (intent.type) {
        case "TRANSFER_XLM": {
          account = await this.client.getAccount(context.publicKey);
          const destination = intent.params.destination as string;
          const amount = intent.params.amount as string;
          const memo = intent.params.memo as string | undefined;

          const unsignedEnvelope = this.client.buildPaymentTransaction(
            account,
            destination,
            amount,
            undefined,
            memo
          );

          signedEnvelope = await this.wallet.signTransaction(
            this.agentId,
            unsignedEnvelope,
            this.client.getNetworkPassphrase()
          );

          const result = await this.client.submitTransaction(signedEnvelope);

          if (result.success) {
            return {
              intentId,
              intent,
              status: "success",
              txHash: result.hash,
              timestamp: Date.now(),
            };
          } else {
            return {
              intentId,
              intent,
              status: "failed",
              error: result.errorMessage,
              timestamp: Date.now(),
            };
          }
        }

        case "CHECK_BALANCE": {
          // No-op, just log
          return {
            intentId,
            intent,
            status: "success",
            timestamp: Date.now(),
          };
        }

        default:
          return {
            intentId,
            intent,
            status: "failed",
            error: "Intent type not implemented",
            timestamp: Date.now(),
          };
      }
    } catch (err) {
      return {
        intentId,
        intent,
        status: "failed",
        error: (err as Error).message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get execution history
   */
  getExecutionHistory(): ExecutionResult[] {
    return [...this.executionHistory];
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isRunning: this.isRunning,
      errorCount: this.errorCount,
      executionCount: this.executionHistory.length,
    };
  }
}
