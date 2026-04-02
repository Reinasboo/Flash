/**
 * Stellar Client Layer
 * 
 * Abstraction over Stellar SDK and Horizon API
 * Handles all network communication and transaction building
 */

import {
  TransactionBuilder,
  Operation,
  Asset,
  Account as StellarAccount,
  Keypair,
  Networks,
  Memo,
  Transaction as StellarTransaction,
} from "stellar-sdk";
import { Server } from "stellar-sdk/lib/horizon/server.js";
import { Account as AccountType, BalanceInfo, Transaction, SubmitResult } from "../types/index.js";
import { logger } from "../utils/logger.js";

export class StellarClient {
  private server: Server;
  private networkPassphrase: string;

  constructor(horizonUrl: string, networkPassphrase: string) {
    this.server = new Server(horizonUrl);
    this.networkPassphrase = networkPassphrase;
  }

  /**
   * Get network passphrase (for signing)
   */
  getNetworkPassphrase(): string {
    return this.networkPassphrase;
  }

  /**
   * Fetch account information from Stellar
   */
  async getAccount(publicKey: string): Promise<AccountType> {
    try {
      const account = await this.server.loadAccount(publicKey);
      return {
        id: account.accountId(),
        sequence: BigInt(account.sequenceNumber()),
        balances: account.balances.map((b: any) => ({
          asset_type: b.asset_type,
          balance: b.balance,
          asset_code: b.asset_code,
          asset_issuer: b.asset_issuer,
        })),
        signers: account.signers.map((s: any) => ({
          key: s.key,
          weight: s.weight,
          type: s.type,
        })),
      };
    } catch (err) {
      logger.error("Failed to load account", { publicKey, error: (err as Error).message });
      throw new Error(`Failed to load account ${publicKey}`);
    }
  }

  /**
   * Get balance information (native XLM + assets)
   */
  async getBalance(publicKey: string): Promise<BalanceInfo> {
    try {
      const account = await this.getAccount(publicKey);
      const balances: BalanceInfo = {
        native: "",
        assets: [],
      };

      for (const balance of account.balances) {
        if (balance.asset_type === "native") {
          balances.native = balance.balance;
        } else {
          balances.assets.push({
            code: balance.asset_code!,
            issuer: balance.asset_issuer!,
            balance: balance.balance,
          });
        }
      }

      return balances;
    } catch (err) {
      logger.error("Failed to get balance", { publicKey, error: (err as Error).message });
      throw new Error(`Failed to get balance for ${publicKey}`);
    }
  }

  /**
   * Get transaction history for an account
   */
  async getTransactionHistory(publicKey: string, limit: number = 10): Promise<Transaction[]> {
    try {
      const response = await this.server
        .transactions()
        .forAccount(publicKey)
        .limit(limit)
        .order("desc")
        .call();

      const transactions: Transaction[] = [];
      for (const tx of response.records as any[]) {
        transactions.push({
          hash: tx.id,
          type: tx.type,
          source: tx.source_account,
          timestamp: new Date(tx.created_at).getTime(),
          status: tx.successful ? "success" : "failed",
        });
      }

      return transactions;
    } catch (err) {
      logger.error("Failed to get transaction history", {
        publicKey,
        error: (err as Error).message,
      });
      return [];
    }
  }

  /**
   * Build a payment transaction (unsigned)
   */
  buildPaymentTransaction(
    sourceAccount: AccountType,
    destination: string,
    amount: string,
    asset: Asset = Asset.native(),
    memo?: string
  ): string {
    try {
      let txBuilder = new TransactionBuilder(
        new StellarAccount(sourceAccount.id, sourceAccount.sequence.toString()),
        {
          fee: "100",
          networkPassphrase: this.networkPassphrase,
          timebounds: {
            minTime: Math.floor(Date.now() / 1000), // Now
            maxTime: Math.floor(Date.now() / 1000) + 5 * 60, // 5 minutes
          },
        }
      ).addOperation(
        Operation.payment({
          destination,
          amount,
          asset,
        })
      );

      if (memo) {
        txBuilder = txBuilder.addMemo(this.buildMemo(memo));
      }

      const tx = txBuilder.build();
      return tx.toXDR();
    } catch (err) {
      logger.error("Failed to build payment transaction", {
        destination,
        amount,
        error: (err as Error).message,
      });
      throw new Error("Failed to build payment transaction");
    }
  }

  /**
   * Build a trust line transaction (unsigned)
   */
  buildTrustLineTransaction(
    sourceAccount: AccountType,
    asset: Asset,
    limit: string = "922337203.6855375" // Max Stellar amount
  ): string {
    try {
      const tx = new TransactionBuilder(
        new StellarAccount(sourceAccount.id, sourceAccount.sequence.toString()),
        {
          fee: "100",
          networkPassphrase: this.networkPassphrase,
          timebounds: {
            minTime: Math.floor(Date.now() / 1000),
            maxTime: Math.floor(Date.now() / 1000) + 5 * 60,
          },
        }
      )
        .addOperation(
          Operation.changeTrust({
            asset,
            limit,
          })
        )
        .build();

      return tx.toXDR();
    } catch (err) {
      logger.error("Failed to build trust line transaction", {
        asset: asset.code,
        error: (err as Error).message,
      });
      throw new Error("Failed to build trust line transaction");
    }
  }

  /**
   * Submit a signed transaction to Stellar
   */
  async submitTransaction(signedEnvelope: string): Promise<SubmitResult> {
    try {
      const tx = TransactionBuilder.fromXDR(signedEnvelope, this.networkPassphrase) as StellarTransaction;

      const response = await this.server.submitTransaction(tx);

      logger.info("Transaction submitted", { hash: response.hash });

      return {
        success: true,
        hash: response.hash,
      };
    } catch (err: any) {
      const errorMsg = err.message || "Unknown error";
      const resultCode = err.response?.data?.extras?.result_code;

      logger.error("Transaction submission failed", {
        error: errorMsg,
        resultCode,
      });

      return {
        success: false,
        errorCode: resultCode || "UNKNOWN",
        errorMessage: errorMsg,
      };
    }
  }

  /**
   * Helper: Build memo from string
   */
  private buildMemo(memo: string): any {
    if (memo.length <= 28) {
      return Memo.text(memo);
    } else {
      throw new Error("Memo must be 28 characters or less");
    }
  }

  /**
   * Check if an account exists on the network
   */
  async accountExists(publicKey: string): Promise<boolean> {
    try {
      await this.getAccount(publicKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get asset info
   */
  async getAssetInfo(
    assetCode: string,
    issuer: string
  ): Promise<{ code: string; issuer: string }> {
    // For now, just validate format
    // In phase 2, could query Stellar API for more info
    return {
      code: assetCode,
      issuer,
    };
  }
}
