/**
 * API Client - Communication with backend
 * Fully integrated with production BYOA subsystem
 */

import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface BYOAAuthContext {
  agentId: string;
  controlTokenHash: string;
}

class APIClient {
  private client: AxiosInstance;
  private byoaAuth: BYOAAuthContext | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // ============ Authentication ============
  setBYOAAuth(agentId: string, controlTokenHash: string) {
    this.byoaAuth = { agentId, controlTokenHash };
    // Use sessionStorage instead of localStorage for security:
    // - sessionStorage is cleared when browser tab closes
    // - Reduces exposure window of credentials if XSS occurs
    // - Still vulnerable to XSS but much shorter-lived
    if (typeof window !== "undefined") {
      sessionStorage.setItem("byoa-auth", JSON.stringify(this.byoaAuth));
    }
  }

  loadBYOAAuth() {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem("byoa-auth");
    if (stored) {
      try {
        this.byoaAuth = JSON.parse(stored);
      } catch (error) {
        // Invalid JSON in sessionStorage, clear it
        sessionStorage.removeItem("byoa-auth");
        this.byoaAuth = null;
      }
    }
  }

  clearBYOAAuth() {
    this.byoaAuth = null;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("byoa-auth");
    }
  }

  private getBYOAHeaders(): Record<string, string> {
    if (!this.byoaAuth) {
      throw new Error("BYOA authentication not configured");
    }
    return {
      "X-Agent-ID": this.byoaAuth.agentId,
      "X-Control-Token-Hash": this.byoaAuth.controlTokenHash,
    };
  }

  // ============ Health & Stats ============
  async getHealth() {
    return this.client.get("/health");
  }

  async getStats() {
    return this.client.get("/stats");
  }

  // ============ Internal Agents ============
  async createAgent(data: { name: string; type: string; config: any }) {
    return this.client.post("/agents", data);
  }

  async listAgents() {
    return this.client.get("/agents");
  }

  async getAgent(id: string) {
    return this.client.get(`/agents/${id}`);
  }

  async startAgent(id: string) {
    return this.client.post(`/agents/${id}/start`);
  }

  async stopAgent(id: string) {
    return this.client.post(`/agents/${id}/stop`);
  }

  // ============ BYOA Endpoints (6 Core Operations) ============

  /**
   * POST /byoa/register
   * Public endpoint to register external agent
   * Rate limited: 10/hour per IP
   */
  async registerBYOAAgent(data: {
    name: string;
    description?: string;
    webhook_url?: string;
    webhook_secret?: string;
    contact_email?: string;
    metadata?: Record<string, any>;
  }) {
    return this.client.post("/byoa/register", data);
  }

  /**
   * GET /byoa/agents/:id
   * Requires authentication
   * Returns agent info with balance and permissions
   */
  async getBYOAAgent(agentId: string) {
    const config: AxiosRequestConfig = {
      headers: this.getBYOAHeaders(),
    };
    return this.client.get(`/byoa/agents/${agentId}`, config);
  }

  /**
   * PUT /byoa/agents/:id/config
   * Requires authentication
   * Update webhook URL, secret, permissions, metadata
   */
  async updateBYOAAgentConfig(
    agentId: string,
    data: {
      webhook_url?: string;
      webhook_secret?: string;
      permissions?: Record<string, any>;
      metadata?: Record<string, any>;
    }
  ) {
    const config: AxiosRequestConfig = {
      headers: this.getBYOAHeaders(),
    };
    return this.client.put(`/byoa/agents/${agentId}/config`, data, config);
  }

  /**
   * POST /byoa/agents/:id/intents
   * Requires authentication
   * Submit batch of intents (1-50)
   * Returns 202 Accepted with submission ID
   */
  async submitBYOAIntents(
    agentId: string,
    data: {
      idempotency_key: string;
      intents: Array<{
        type: string;
        params: Record<string, any>;
      }>;
    }
  ) {
    const config: AxiosRequestConfig = {
      headers: this.getBYOAHeaders(),
    };
    return this.client.post(`/byoa/agents/${agentId}/intents`, data, config);
  }

  /**
   * GET /byoa/agents/:id/intents/:intent_id
   * Requires authentication
   * Get intent status with history
   */
  async getBYOAIntentStatus(agentId: string, intentId: string) {
    const config: AxiosRequestConfig = {
      headers: this.getBYOAHeaders(),
    };
    return this.client.get(`/byoa/agents/${agentId}/intents/${intentId}`, config);
  }

  /**
   * GET /byoa/agents/:id/transactions
   * Requires authentication
   * Get paginated transaction history with filtering
   * Query params: limit, offset, status, type, startDate, endDate
   */
  async getBYOATransactions(
    agentId: string,
    params?: {
      limit?: number;
      offset?: number;
      status?: string;
      type?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const config: AxiosRequestConfig = {
      headers: this.getBYOAHeaders(),
      params,
    };
    return this.client.get(`/byoa/agents/${agentId}/transactions`, config);
  }

  // ============ Transactions ============
  async getTransactions() {
    return this.client.get("/transactions");
  }

  async getTransaction(id: string) {
    return this.client.get(`/transactions/${id}`);
  }
}

export const apiClient = new APIClient();

// Auto-load BYOA auth on client initialization
if (typeof window !== "undefined") {
  apiClient.loadBYOAAuth();
}
