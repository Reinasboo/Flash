/**
 * BYOA Authentication Middleware
 * Validates control tokens and extracts authentication context
 */

import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";
import { BYOAAuthService, ControlTokenManager } from "../services/byoa";
import type { BYOAAuthContext } from "../types";

/**
 * Extend Express Request to include BYOA auth context
 */
declare global {
  namespace Express {
    interface Request {
      byoaAuth?: BYOAAuthContext;
    }
  }
}

/**
 * BYOA Authentication Middleware
 * Extracts and validates control token from headers
 *
 * Expected headers:
 * - X-Agent-ID: UUID of the agent
 * - X-Control-Token-Hash: SHA-256 hash of the control token
 */
export function byoaAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = uuidv4();
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("user-agent");

  // Extract headers (case-insensitive)
  const agentId = req.get("x-agent-id");
  const controlTokenHash = req.get("x-control-token-hash");

  // Validate headers are present
  if (!agentId || !controlTokenHash) {
    logger.warn(
      {
        requestId,
        ipAddress,
        missingHeaders: !agentId ? "x-agent-id" : "x-control-token-hash",
      },
      "Missing BYOA authentication headers"
    );

    res.status(401).json({
      success: false,
      error: {
        code: "MISSING_AUTH_HEADERS",
        message: "Missing required authentication headers: X-Agent-ID and X-Control-Token-Hash",
        details: {
          required: ["X-Agent-ID", "X-Control-Token-Hash"],
        },
      },
      requestId,
    });
    return;
  }

  // Validate header formats
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const hashRegex = /^[a-f0-9]{64}$/i;

  if (!uuidRegex.test(agentId)) {
    logger.warn({ requestId, ipAddress, agentId }, "Invalid agent ID format");

    res.status(401).json({
      success: false,
      error: {
        code: "INVALID_AGENT_ID",
        message: "Agent ID must be a valid UUID",
      },
      requestId,
    });
    return;
  }

  if (!hashRegex.test(controlTokenHash)) {
    logger.warn({ requestId, ipAddress }, "Invalid control token hash format");

    res.status(401).json({
      success: false,
      error: {
        code: "INVALID_TOKEN_HASH",
        message: "Control token hash must be a 64-character hex string",
      },
      requestId,
    });
    return;
  }

  // Set auth context on request
  req.byoaAuth = {
    agentId,
    controlTokenHash,
    ipAddress,
    userAgent,
    requestId,
  };

  // Verify credentials against database (asynchronously, non-blocking)
  BYOAAuthService.authenticateRequest(agentId, controlTokenHash, {
    agentId,
    controlTokenHash,
    ipAddress,
    userAgent,
    requestId,
  })
    .then(() => {
      logger.debug({ requestId, agentId }, "BYOA authentication successful");
      next();
    })
    .catch((error) => {
      logger.warn(
        {
          requestId,
          agentId,
          ipAddress,
          error: error instanceof Error ? error.message : "Unknown",
        },
        "Authentication failed"
      );

      res.status(401).json({
        success: false,
        error: {
          code: "AUTHENTICATION_FAILED",
          message: "Invalid agent credentials",
        },
        requestId,
      });
    });
}

/**
 * Rate Limit Middleware
 * Checks if agent has exceeded rate limits
 */
export async function byoaRateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.byoaAuth) {
    res.status(401).json({
      success: false,
      error: { code: "NO_AUTH_CONTEXT", message: "No auth context" },
    });
    return;
  }

  const { agentId, requestId } = req.byoaAuth;

  try {
    // Check and enforce actual rate limits (intent submissions per hour)
    const rateLimitCheck = await BYOAAuthService.checkRateLimit(agentId);

    if (!rateLimitCheck.allowed) {
      logger.warn(
        {
          requestId,
          agentId,
          current: rateLimitCheck.current,
          limit: rateLimitCheck.limit,
          resetAt: rateLimitCheck.resetAt,
        },
        "Rate limit exceeded"
      );

      const retryAfter = Math.ceil(
        (new Date(rateLimitCheck.resetAt).getTime() - Date.now()) / 1000
      );

      res.status(429);
      res.set("X-RateLimit-Limit", rateLimitCheck.limit.toString());
      res.set("X-RateLimit-Remaining", "0");
      res.set("X-RateLimit-Reset", rateLimitCheck.resetAt.toISOString());
      res.set("Retry-After", retryAfter.toString());

      res.json({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "You have exceeded the maximum number of requests per hour",
          details: {
            retryAfter,
            resetAt: rateLimitCheck.resetAt,
          },
        },
        requestId,
      });
      return;
    }

    // Add rate limit headers to successful responses too
    res.set("X-RateLimit-Limit", rateLimitCheck.limit.toString());
    res.set(
      "X-RateLimit-Remaining",
      (rateLimitCheck.limit - rateLimitCheck.current).toString()
    );
    res.set("X-RateLimit-Reset", rateLimitCheck.resetAt.toISOString());

    next();
  } catch (error) {
    logger.error({ requestId, agentId, error }, "Rate limit check failed");
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Rate limit check failed" },
      requestId,
    });
  }
}

/**
 * Require BYOA Authentication
 * Use this as middleware for protected routes
 */
export function requireBYOAAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.byoaAuth) {
    res.status(401).json({
      success: false,
      error: {
        code: "MISSING_AUTH",
        message: "This endpoint requires BYOA authentication",
      },
    });
    return;
  }

  next();
}

/**
 * Log request/response for audit trail
 */
export function byoaAuditLog(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const auth = req.byoaAuth;

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const success = statusCode >= 200 && statusCode < 300;

    if (auth) {
      logger.info(
        {
          requestId: auth.requestId,
          agentId: auth.agentId,
          method: req.method,
          path: req.path,
          statusCode,
          duration,
          ipAddress: auth.ipAddress,
          success,
        },
        "BYOA request"
      );

      // Write to audit_log table for compliance (synchronous, non-blocking)
      (async () => {
        try {
          const BYOADatabase = (await import("../database/byoa.js")).default;
          const db = BYOADatabase.getInstance();
          await db.createAuditLog({
            agentId: auth.agentId,
            action: `${req.method} ${req.path}`,
            status: success ? "success" : "error",
            ipAddress: auth.ipAddress,
            userAgent: auth.userAgent,
            requestId: auth.requestId,
            metadata: {
              method: req.method,
              path: req.path,
              statusCode,
              duration,
            },
          });
        } catch (logErr) {
          logger.error(
            { logErr, agentId: auth.agentId },
            "Failed to write audit log"
          );
          // Don't block response - audit logging must be non-blocking
        }
      })();
    }
  });

  next();
}
