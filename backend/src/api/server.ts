/**
 * Express API Server
 * 
 * REST endpoints for:
 * - Health & stats
 * - Agent management (CRUD)
 * - Transaction history
 * - Event streaming
 * - BYOA (Bring Your Own Agent)
 */

import express, { Express, Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import crypto from "crypto";
import { z } from "zod";
import { WalletManager } from "../wallet/WalletManager.js";
import { StellarClient } from "../stellar/StellarClient.js";
import { Orchestrator } from "../orchestrator/Orchestrator.js";
import { BaseAgent } from "../agent/BaseAgent.js";
import { AccumulatorAgent } from "../agent/AccumulatorAgent.js";
import { DistributorAgent } from "../agent/DistributorAgent.js";
import { APIResponse, AgentConfig, Intent } from "../types/index.js";
import { logger } from "../utils/logger.js";
import byoaRouter from "./byoa.js";

/**
 * Validation schemas
 */
const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["accumulator", "distributor"]),
  config: z.record(z.unknown()),
});

/**
 * Create Express app with API routes
 */
export function createAPIServer(
  wallet: WalletManager,
  client: StellarClient,
  orchestrators: Map<string, Orchestrator>
): Express {
  const app = express();

  // Security headers middleware
  app.use((req: Request, res: Response, next: Function) => {
    res.set({
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
    });
    next();
  });

  // Middleware
  // CORS restricted to frontend origin (fail secure if not configured)
  const frontendOrigin = process.env.FRONTEND_ORIGIN;
  if (!frontendOrigin) {
    logger.warn("FRONTEND_ORIGIN not configured - CORS will be restrictive");
  }
  
  app.use(cors({
    origin: frontendOrigin || false, // false = reject all origins if not configured
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Agent-ID", "X-Control-Token-Hash"],
    credentials: false,
    maxAge: 3600, // 1 hour preflight cache
  }));
  app.use(bodyParser.json({ limit: "10kb" })); // Limit payload size to prevent DoS

  // Error handler middleware (do not leak details)
  app.use((err: any, req: Request, res: Response, next: Function) => {
    logger.error("API error", { 
      code: err.code || "UNKNOWN",
      path: req.path,
      method: req.method,
      // Do not log error.message or stack traces to prevent information disclosure
    });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: Date.now(),
    });
  });

  // ============ HEALTH & STATS ============

  app.get("/health", (req: Request, res: Response) => {
    const response: APIResponse<{ status: string; uptime: number }> = {
      success: true,
      data: {
        status: "healthy",
        uptime: process.uptime() * 1000,
      },
      timestamp: Date.now(),
    };
    res.json(response);
  });

  app.get("/stats", async (req: Request, res: Response) => {
    try {
      const wallets = wallet.getAllWallets();
      const response: APIResponse<{
        totalAgents: number;
        runningAgents: number;
        totalTransactions: number;
      }> = {
        success: true,
        data: {
          totalAgents: wallets.length,
          runningAgents: Array.from(orchestrators.values()).filter((o) =>
            o.getState().isRunning
          ).length,
          totalTransactions: 0, // TODO: Count from DB
        },
        timestamp: Date.now(),
      };
      res.json(response);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Failed to get stats",
        timestamp: Date.now(),
      });
    }
  });

  // ============ AGENT MANAGEMENT ============

  /**
   * POST /agents - Create new agent
   */
  app.post("/agents", async (req: Request, res: Response) => {
    try {
      const validated = createAgentSchema.parse(req.body);
      const agentId = `agent_${Date.now()}`;

      // Create wallet
      const { publicKey } = await wallet.createWallet(agentId);

      // Create agent instance
      let agent: BaseAgent;
      const agentConfig: AgentConfig = {
        agentId,
        name: validated.name,
        type: validated.type as "accumulator" | "distributor",
        status: "stopped",
        config: validated.config,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      if (validated.type === "accumulator") {
        agent = new AccumulatorAgent(agentId, validated.name, agentConfig);
      } else {
        agent = new DistributorAgent(agentId, validated.name, agentConfig);
      }

      // Create orchestrator
      const orchestrator = new Orchestrator(agentId, agent, wallet, client);
      orchestrators.set(agentId, orchestrator);

      logger.info("Agent created", { agentId, name: validated.name, type: validated.type });

      const response: APIResponse<{ agentId: string; publicKey: string }> = {
        success: true,
        data: { agentId, publicKey },
        timestamp: Date.now(),
      };
      res.status(201).json(response);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid request",
          timestamp: Date.now(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to create agent",
          timestamp: Date.now(),
        });
      }
    }
  });

  /**
   * GET /agents - List all agents
   */
  app.get("/agents", async (req: Request, res: Response) => {
    try {
      const wallets = wallet.getAllWallets();
      const agents = wallets.map((w) => {
        const orch = orchestrators.get(w.agentId);
        return {
          agentId: w.agentId,
          publicKey: w.publicKey,
          status: orch?.getState().isRunning ? "running" : "stopped",
        };
      });

      const response: APIResponse<typeof agents> = {
        success: true,
        data: agents,
        timestamp: Date.now(),
      };
      res.json(response);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Failed to list agents",
        timestamp: Date.now(),
      });
    }
  });

  /**
   * GET /agents/:id - Get agent details
   */
  app.get("/agents/:id", async (req: Request, res: Response) => {
    try {
      const agentId = req.params.id;
      const publicKey = wallet.getPublicKey(agentId);

      if (!publicKey) {
        return res.status(404).json({
          success: false,
          error: "Agent not found",
          timestamp: Date.now(),
        });
      }

      const balance = await client.getBalance(publicKey);
      const transactions = await client.getTransactionHistory(publicKey, 10);
      const orchestrator = orchestrators.get(agentId);

      const response: APIResponse<{
        agentId: string;
        publicKey: string;
        status: string;
        balance: any;
        recentTransactions: any[];
      }> = {
        success: true,
        data: {
          agentId,
          publicKey,
          status: orchestrator?.getState().isRunning ? "running" : "stopped",
          balance,
          recentTransactions: transactions,
        },
        timestamp: Date.now(),
      };
      res.json(response);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Failed to get agent details",
        timestamp: Date.now(),
      });
    }
  });

  /**
   * POST /agents/:id/start - Start agent orchestrator
   */
  app.post("/agents/:id/start", async (req: Request, res: Response) => {
    try {
      const agentId = req.params.id;
      const orchestrator = orchestrators.get(agentId);

      if (!orchestrator) {
        return res.status(404).json({
          success: false,
          error: "Agent not found",
          timestamp: Date.now(),
        });
      }

      await orchestrator.start();
      logger.info("Agent started", { agentId });

      res.json({
        success: true,
        data: { agentId, status: "running" },
        timestamp: Date.now(),
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Failed to start agent",
        timestamp: Date.now(),
      });
    }
  });

  /**
   * POST /agents/:id/stop - Stop agent orchestrator
   */
  app.post("/agents/:id/stop", async (req: Request, res: Response) => {
    try {
      const agentId = req.params.id;
      const orchestrator = orchestrators.get(agentId);

      if (!orchestrator) {
        return res.status(404).json({
          success: false,
          error: "Agent not found",
          timestamp: Date.now(),
        });
      }

      await orchestrator.stop();
      logger.info("Agent stopped", { agentId });

      res.json({
        success: true,
        data: { agentId, status: "stopped" },
        timestamp: Date.now(),
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Failed to stop agent",
        timestamp: Date.now(),
      });
    }
  });

  // ============ BYOA (Bring Your Own Agent) ============
  // Production database-driven BYOA implementation with persistent storage
  // All BYOA routes are handled by byoaRouter with database persistence and proper authentication
  // Routes: POST /byoa/register, POST /byoa/agents/:agent_id/intents, GET /byoa/agents/:agent_id, etc.
  app.use("/byoa", byoaRouter);

  return app;
}
