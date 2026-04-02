/**
 * API Client - Communication with backend
 */

import axios, { AxiosInstance } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // ============ Health ============
  async getHealth() {
    return this.client.get("/health");
  }

  async getStats() {
    return this.client.get("/stats");
  }

  // ============ Agents ============
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

  // ============ BYOA ============
  async registerBYOAAgent(data: { name: string; publicKey: string }) {
    return this.client.post("/byoa/register", data);
  }

  async submitBYOAIntent(
    agentId: string,
    controlToken: string,
    intent: any
  ) {
    return this.client.post(
      "/byoa/intents",
      { intent },
      {
        headers: {
          "X-Agent-ID": agentId,
          "X-Control-Token": controlToken,
        },
      }
    );
  }
}

export const apiClient = new APIClient();
