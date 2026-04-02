'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { GlassCard, GlassButton, GlassInput } from '@/components/glass';

type AgentType = 'accumulator' | 'distributor';
type FormStep = 'info' | 'config' | 'review';

interface AgentFormData {
  name: string;
  type: AgentType;
  config: {
    vaultAddress?: string;
    targetMinimum?: number;
    targetMaximum?: number;
    sweepThreshold?: number;
    payments?: Array<{ address: string; amount: string; memo?: string }>;
    minRequired?: number;
  };
}

export default function CreateAgentPage() {
  const router = useRouter();
  const [step, setStep] = useState<FormStep>('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "accumulator",
    vaultAddress: "",
    targetMinimum: "50",
    targetMaximum: "100",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const config: any = {};

      if (formData.type === "accumulator") {
        config.vaultAddress = formData.vaultAddress;
        config.targetMinimum = parseFloat(formData.targetMinimum);
        config.targetMaximum = parseFloat(formData.targetMaximum);
      }

      return apiClient.createAgent({
        name: formData.name,
        type: formData.type,
        config,
      });
    },
    onSuccess: (res: any) => {
      const agentId = res.data.data.agentId;
      router.push(`/agents/${agentId}`);
    },
  });

  return (
    <div className="container-base section-spacing">
      <Link href="/agents" className="text-blue-600 hover:underline mb-6 block">
        ← Back to Agents
      </Link>

      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">Create Agent</h1>

        <div className="card-base p-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="space-y-6"
          >
            {/* Agent Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Agent Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="My Agent"
                required
              />
            </div>

            {/* Agent Type */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Agent Type
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="accumulator">Accumulator</option>
                <option value="distributor">Distributor</option>
              </select>
            </div>

            {/* Accumulator Config */}
            {formData.type === "accumulator" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Vault Address
                  </label>
                  <input
                    type="text"
                    value={formData.vaultAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, vaultAddress: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="GXXXXXXX..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Minimum XLM
                    </label>
                    <input
                      type="number"
                      value={formData.targetMinimum}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          targetMinimum: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Maximum XLM
                    </label>
                    <input
                      type="number"
                      value={formData.targetMaximum}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          targetMaximum: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="button-primary"
              >
                {createMutation.isPending ? "Creating..." : "Create Agent"}
              </button>
              <Link href="/agents">
                <button type="button" className="button-secondary">
                  Cancel
                </button>
              </Link>
            </div>

            {createMutation.isError && (
              <div className="p-4 bg-red-100 text-red-700 rounded-lg">
                Failed to create agent
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
