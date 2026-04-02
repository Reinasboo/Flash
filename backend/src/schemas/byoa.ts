/**
 * BYOA (Bring Your Own Agent) - Zod validation schemas
 * Ensures all external input is validated before processing
 */

import { z } from "zod";

// ============================================================================
// Utility schemas
// ============================================================================

const UUIDSchema = z.string().uuid("Invalid UUID format");
const EmailSchema = z.string().email("Invalid email address");
const StellarPublicKeySchema = z.string().regex(/^G[A-Z0-9]{55}$/, "Invalid Stellar public key");
const ControlTokenSchema = z.string().length(64, "Control token must be 64 hex characters");
const TxHashSchema = z.string().length(64, "Transaction hash must be 64 hex characters");
const DecimalSchema = z.string().regex(/^\d+(\.\d{1,8})?$/, "Must be a valid decimal amount");
const URLSchema = z.string().url("Invalid URL").startsWith("https://", "Must use HTTPS");
const WebhookSecretSchema = z.string().min(32, "Webhook secret must be at least 32 characters");
const AssetCodeSchema = z.string().regex(/^[A-Z0-9]{1,12}$/, "Asset code must be 1-12 alphanumeric characters");

// ============================================================================
// Registration endpoint
// ============================================================================

export const BYOARegistrationRequestSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(128, "Name must be 128 characters or less")
    .regex(/^[a-zA-Z0-9\s]+$/, "Name must contain only alphanumeric characters and spaces"),
  description: z
    .string()
    .max(512, "Description must be 512 characters or less")
    .optional(),
  webhookUrl: URLSchema.optional().nullable(),
  webhookSecret: WebhookSecretSchema.optional().nullable(),
  contactEmail: EmailSchema.optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export type BYOARegistrationRequest = z.infer<typeof BYOARegistrationRequestSchema>;

// ============================================================================
// Intent submission
// ============================================================================

export const BYOAIntentParamsSchema = z.record(z.unknown());

export const BYOASingleIntentSchema = z.object({
  type: z
    .enum(["TRANSFER_XLM", "TRANSFER_ASSET", "CREATE_TRUST_LINE", "MANAGE_OFFER", "CHECK_BALANCE", "CUSTOM"])
    .describe("Type of intent"),
  params: BYOAIntentParamsSchema,
});

export const BYOAIntentSubmissionRequestSchema = z.object({
  idempotencyKey: UUIDSchema,
  intents: z
    .array(BYOASingleIntentSchema)
    .min(1, "At least one intent is required")
    .max(50, "Maximum 50 intents per request"),
});

export type BYOAIntentSubmissionRequest = z.infer<typeof BYOAIntentSubmissionRequestSchema>;

// ============================================================================
// Config update
// ============================================================================

export const BYOAPermissionsSchema = z.object({
  canSubmitIntents: z.boolean().optional(),
  canModifyConfig: z.boolean().optional(),
  canViewBalance: z.boolean().optional(),
  canViewTransactionHistory: z.boolean().optional(),
  intentTypesAllowed: z
    .array(z.enum(["TRANSFER_XLM", "TRANSFER_ASSET", "CREATE_TRUST_LINE", "MANAGE_OFFER", "CHECK_BALANCE", "CUSTOM"]))
    .optional(),
  maxTransferAmount: DecimalSchema.optional(),
  maxIntentsPerHour: z.number().int().positive().optional(),
  maxRequestsPerHour: z.number().int().positive().optional(),
  maxXemTransferredPerDay: DecimalSchema.optional(),
});

export const BYOAConfigUpdateRequestSchema = z.object({
  webhookUrl: URLSchema.optional(),
  webhookSecret: WebhookSecretSchema.optional(),
  permissions: BYOAPermissionsSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type BYOAConfigUpdateRequest = z.infer<typeof BYOAConfigUpdateRequestSchema>;

// ============================================================================
// Query parameters
// ============================================================================

export const BYOATransactionFilterSchema = z.object({
  limit: z
    .string()
    .transform((v) => parseInt(v, 10))
    .refine((v) => v >= 1 && v <= 500, "Limit must be between 1 and 500")
    .default("50"),
  offset: z
    .string()
    .transform((v) => parseInt(v, 10))
    .refine((v) => v >= 0, "Offset must be non-negative")
    .default("0"),
  status: z.enum(["all", "success", "pending", "failed"]).default("all"),
  type: z.enum(["all", "transfer", "trustline", "offer"]).default("all"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type BYOATransactionFilter = z.infer<typeof BYOATransactionFilterSchema>;

// ============================================================================
// Response schemas (for documentation & validation)
// ============================================================================

export const BYOAIntentStatusSchema = z.object({
  status: z.enum(["queued", "validating", "executing", "executed", "rejected", "failed"]),
  timestamp: z.string().datetime(),
  txHash: TxHashSchema.optional(),
});

export const BYOAIntentDetailsSchema = z.object({
  id: UUIDSchema,
  agentId: UUIDSchema,
  type: z.string(),
  params: z.record(z.unknown()),
  status: z.enum(["queued", "validating", "executing", "executed", "rejected", "failed"]),
  statusHistory: z.array(BYOAIntentStatusSchema),
  executionResult: z
    .object({
      success: z.boolean(),
      txHash: TxHashSchema.optional(),
      txLink: z.string().url().optional(),
    })
    .optional(),
});

export const BYOAAgentInfoResponseSchema = z.object({
  success: z.literal(true),
  agent: z.object({
    id: UUIDSchema,
    name: z.string(),
    wallet: StellarPublicKeySchema,
    status: z.enum(["active", "suspended", "blocked", "deleted"]),
    balance: z.object({
      native: DecimalSchema,
      assets: z.record(
        z.object({
          balance: DecimalSchema,
          issuer: StellarPublicKeySchema,
        })
      ),
    }),
    permissions: BYOAPermissionsSchema,
    rateLimitStatus: z.object({
      intentsSubmittedThisHour: z.number(),
      maxIntentsPerHour: z.number(),
      requestsMadeThisHour: z.number(),
      maxRequestsPerHour: z.number(),
    }),
    statistics: z.object({
      totalIntentsSubmitted: z.number(),
      totalIntentsExecuted: z.number(),
      totalIntentsFailed: z.number(),
      totalXemTransferred: DecimalSchema,
      createdAt: z.string().datetime(),
      lastIntentAt: z.string().datetime().optional(),
    }),
  }),
});

// ============================================================================
// Error response schema
// ============================================================================

export const BYOAErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
  requestId: UUIDSchema,
});

// ============================================================================
// Validation functions
// ============================================================================

export function isValidStellarAddress(address: string): boolean {
  return StellarPublicKeySchema.safeParse(address).success;
}

export function isValidEmail(email: string): boolean {
  return EmailSchema.safeParse(email).success;
}

export function isValidControlToken(token: string): boolean {
  return ControlTokenSchema.safeParse(token).success;
}

export function isValidDecimalAmount(amount: string): boolean {
  return DecimalSchema.safeParse(amount).success;
}

export function validateIntentParams(type: string, params: unknown): { valid: boolean; error?: string } {
  try {
    switch (type) {
      case "TRANSFER_XLM": {
        const schema = z.object({
          destination: StellarPublicKeySchema,
          amount: DecimalSchema,
          memo: z.string().max(28).optional(),
        });
        schema.parse(params);
        return { valid: true };
      }

      case "TRANSFER_ASSET": {
        const schema = z.object({
          destination: StellarPublicKeySchema,
          assetCode: AssetCodeSchema,
          issuer: StellarPublicKeySchema,
          amount: DecimalSchema,
          memo: z.string().max(28).optional(),
        });
        schema.parse(params);
        return { valid: true };
      }

      case "CREATE_TRUST_LINE": {
        const schema = z.object({
          assetCode: AssetCodeSchema,
          issuer: StellarPublicKeySchema,
          limit: DecimalSchema.optional(),
        });
        schema.parse(params);
        return { valid: true };
      }

      case "MANAGE_OFFER": {
        const schema = z.object({
          selling: z.object({
            assetCode: AssetCodeSchema,
            issuer: StellarPublicKeySchema,
          }),
          buying: z.object({
            assetCode: AssetCodeSchema,
            issuer: StellarPublicKeySchema,
          }),
          amount: DecimalSchema,
          price: z.string(),
          offerId: z.string().optional(),
        });
        schema.parse(params);
        return { valid: true };
      }

      case "CHECK_BALANCE": {
        // No parameters required
        return { valid: true };
      }

      default:
        return { valid: true }; // CUSTOM type allows any params
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        error: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
      };
    }
    return { valid: false, error: "Unknown validation error" };
  }
}

// ============================================================================
// Authentication header validation
// ============================================================================

export const BYOAAuthHeadersSchema = z.object({
  "x-agent-id": UUIDSchema,
  "x-control-token-hash": ControlTokenSchema,
});

export type BYOAAuthHeaders = z.infer<typeof BYOAAuthHeadersSchema>;
