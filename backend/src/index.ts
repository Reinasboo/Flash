/**
 * Main Entry Point - Agentic Wallet Platform Backend
 * 
 * Initializes:
 * - Wallet Layer
 * - Stellar Client
 * - Express API Server
 */

import dotenv from "dotenv";
import { WalletManager } from "./wallet/WalletManager.js";
import { StellarClient } from "./stellar/StellarClient.js";
import BYOADatabase from "./database/byoa.js";
import { createAPIServer } from "./api/server.js";
import { Orchestrator } from "./orchestrator/Orchestrator.js";
import { logger } from "./utils/logger.js";

// Load environment variables
dotenv.config();

async function main() {
  const requiredEnvVars = [
    "STELLAR_NETWORK_PASSPHRASE",
    "HORIZON_API_URL",
    "WALLET_ENCRYPTION_PASSWORD",
  ];

  // Validate environment
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  const port = parseInt(process.env.PORT || "3001", 10);
  const networkPassphrase = process.env.STELLAR_NETWORK_PASSPHRASE!;
  const horizonUrl = process.env.HORIZON_API_URL!;
  const walletPassword = process.env.WALLET_ENCRYPTION_PASSWORD!;

  logger.info("Starting Agentic Wallet Platform Backend", {
    port,
    network: networkPassphrase,
    horizon: horizonUrl,
  });

  try {
    // 1. Initialize Wallet Layer
    const wallet = new WalletManager(walletPassword);
    logger.info("Wallet Manager initialized");

    // 2. Initialize Stellar Client
    const client = new StellarClient(horizonUrl, networkPassphrase);
    logger.info("Stellar Client initialized");

    // 3. Initialize BYOA Database
    const dbConnectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/agentic_wallet";
    BYOADatabase.initialize(dbConnectionString);
    logger.info("BYOA Database initialized");

    // 4. Initialize orchestrators map
    const orchestrators = new Map<string, Orchestrator>();

    // 5. Create Express API
    const app = createAPIServer(wallet, client, orchestrators);

    // 6. Start server
    app.listen(port, () => {
      logger.info("API Server ready", { port, url: `http://localhost:${port}` });
    });
  } catch (err) {
    logger.error("Failed to start server", { error: (err as Error).message });
    process.exit(1);
  }
}

main();
