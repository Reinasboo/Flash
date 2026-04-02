/**
 * Core type definitions for the agentic wallet platform
 */

// Agent & Wallet
export interface WalletInfo {
  agentId: string;
  publicKey: string;
  status: "active" | "inactive";
  createdAt: number;
}

export interface AgentConfig {
  agentId: string;
  name: string;
  type: "accumulator" | "distributor" | "custom";
  status: "running" | "stopped";
  config: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

// Intents
export type IntentType =
  | "REQUEST_AIRDROP"
  | "TRANSFER_XLM"
  | "TRANSFER_ASSET"
  | "CREATE_TRUST_LINE"
  | "MANAGE_OFFER"
  | "CHECK_BALANCE"
  | "CUSTOM";

export interface Intent {
  type: IntentType;
  params: Record<string, unknown>;
  constraints?: {
    maxFee?: number;
    minBalance?: string;
    memo?: string;
  };
}

// Execution Results
export interface ExecutionResult {
  intentId: string;
  intent: Intent;
  status: "success" | "failed" | "rejected";
  txHash?: string;
  error?: string;
  timestamp: number;
}

// Agent Context (read-only)
export interface BalanceInfo {
  native: string; // XLM amount
  assets: Array<{
    code: string;
    issuer: string;
    balance: string;
  }>;
}

export interface Transaction {
  hash: string;
  type: string;
  source: string;
  destination?: string;
  amount?: string;
  asset?: string;
  timestamp: number;
  status: "success" | "failed";
}

export interface AgentContext {
  agentId: string;
  publicKey: string;
  balances: BalanceInfo;
  recentTransactions: Transaction[];
  ledgerTime: number;
  ledgerSequence: number;
  config: AgentConfig;
}

// Encryption
export interface EncryptedKeypair {
  publicKey: string;
  algorithm: "aes-256-gcm";
  derivationFunction: "scrypt";
  salt: string; // hex
  scryptParams: {
    N: number;
    r: number;
    p: number;
  };
  iv: string; // hex
  ciphertext: string; // hex
  authTag: string; // hex
}

// BYOA (Bring Your Own Agent)
export interface BYOAAgent {
  id: string;
  name: string;
  walletPublicKey: string;
  controlTokenHash: string;
  status: "active" | "inactive";
  createdAt: number;
  lastUsed?: number;
}

export interface BYOAIntentSubmission {
  agentId: string;
  intent: Intent;
  timestamp: number;
}

// BYOA Extended Types for Production System
export interface BYOAAgentFull {
  id: string;
  name: string;
  description?: string;
  publicKey: string;
  secretKeyEncrypted: string;
  status: "active" | "suspended" | "blocked" | "deleted";
  createdAt: Date;
  createdBy?: string;
  updatedAt: Date;
  contactEmail?: string;
  metadata?: Record<string, unknown>;
  lastIntentAt?: Date;
}

export interface BYOACredentials {
  agentId: string;
  controlTokenHash: string;
  createdAt: Date;
  rotatedAt?: Date;
  isActive: boolean;
}

export interface BYOAPermissions {
  agentId: string;
  canSubmitIntents: boolean;
  canModifyConfig: boolean;
  canViewBalance: boolean;
  canViewTransactionHistory: boolean;
  intentTypesAllowed: IntentType[];
  maxTransferAmount: string; // decimal format "1000000.00"
  maxIntentsPerHour: number;
  maxIntentsPerRequest: number;
  maxRequestsPerHour: number;
  maxXemTransferredPerDay?: string;
}

export interface BYOAWebhook {
  id: string;
  agentId: string;
  url: string;
  secretEncrypted: string;
  events: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastTriedAt?: Date;
  lastSuccessAt?: Date;
  failureCount: number;
}

export interface BYOAWebhookEvent {
  id: string;
  agentId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: "pending" | "delivered" | "failed" | "expired";
  attempts: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  errorMessage?: string;
  createdAt: Date;
}

export interface BYOAIntent {
  id: string;
  agentId: string;
  submissionId: string;
  idempotencyKey?: string;
  type: IntentType;
  params: Record<string, unknown>;
  status: "queued" | "validating" | "executing" | "executed" | "rejected" | "failed";
  statusHistory: Array<{
    status: string;
    timestamp: Date;
    txHash?: string;
  }>;
  result?: Record<string, unknown>;
  txHash?: string;
  errorMessage?: string;
  createdAt: Date;
  executedAt?: Date;
}

export interface BYOAIntentSubmissionRequest {
  idempotencyKey: string;
  intents: Array<{
    type: IntentType;
    params: Record<string, unknown>;
  }>;
}

export interface BYOAIntentSubmissionResponse {
  success: boolean;
  submissionId: string;
  intentsAccepted: number;
  intentsRejected: number;
  queuePosition: number;
  estimatedExecutionTimeMs: number;
  details: Array<{
    intentIndex: number;
    type: IntentType;
    status: string;
    intentId: string;
    message: string;
  }>;
}

export interface BYOARegistrationRequest {
  name: string;
  description?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  contactEmail?: string;
  metadata?: Record<string, unknown>;
}

export interface BYOARegistrationResponse {
  success: boolean;
  agent: {
    id: string;
    name: string;
    wallet: string;
    status: string;
    createdAt: Date;
    createdBy?: string;
  };
  walletInfo: {
    publicKey: string;
    needsFunding: boolean;
    minFundedAmount: string;
  };
  credentials: {
    controlToken: string;
    note: string;
  };
  apiDocs: string;
}

export interface BYOARateLimitStatus {
  intentsSubmittedThisHour: number;
  maxIntentsPerHour: number;
  requestsMadeThisHour: number;
  maxRequestsPerHour: number;
}

export interface BYOAAgentInfo {
  id: string;
  name: string;
  wallet: string;
  status: string;
  balance: BalanceInfo;
  permissions: BYOAPermissions;
  rateLimitStatus: BYOARateLimitStatus;
  statistics: {
    totalIntentsSubmitted: number;
    totalIntentsExecuted: number;
    totalIntentsFailed: number;
    totalXemTransferred: string;
    createdAt: Date;
    lastIntentAt?: Date;
  };
}

export interface BYOAAuditLog {
  id: string;
  agentId?: string;
  action: string;
  status: "success" | "error";
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface BYOACircuitBreakerState {
  agentId: string;
  isOpen: boolean;
  failureCount: number;
  lastFailureAt?: Date;
  openedAt?: Date;
  closedAt?: Date;
}

export interface BYOAAuthContext {
  agentId: string;
  controlTokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
}

// Events
export type EventType =
  | "agent-created"
  | "agent-started"
  | "agent-stopped"
  | "intent-proposed"
  | "intent-validated"
  | "intent-executed"
  | "intent-failed"
  | "intent-rejected"
  | "cycle-complete"
  | "cycle-error"
  | "byoa-registered"
  | "byoa-intent-received";

export interface SystemEvent {
  type: EventType;
  timestamp: number;
  data: Record<string, unknown>;
}

// Stellar-specific
export interface Account {
  id: string;
  sequence: bigint;
  balances: Array<{
    asset_type: string;
    balance: string;
    asset_code?: string;
    asset_issuer?: string;
  }>;
  signers: Array<{
    key: string;
    weight: number;
    type: string;
  }>;
}

export interface SubmitResult {
  success: boolean;
  hash?: string;
  resultCode?: string;
  resultXdr?: string;
  errorCode?: string;
  errorMessage?: string;
}

// Validation
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

// Orchestrator State
export interface OrchestratorState {
  isRunning: boolean;
  lastExecution?: {
    timestamp: number;
    intents: Intent[];
    results: ExecutionResult[];
  };
  pendingIntents: Intent[];
  executionHistory: ExecutionResult[];
  errorCount: number;
  lastError?: Error;
}

// API Response Envelope
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}
