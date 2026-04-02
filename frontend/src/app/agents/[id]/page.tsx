'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { FiPause, FiPlay, FiCheck, FiCopy } from 'react-icons/fi';
import { apiClient } from '@/lib/api';
import { GlassCard, GlassButton } from '@/components/glass';
import { StatusBadge } from '@/components/common/StatusBadge';

export default function AgentDetailPage({ params }: { params: { id: string } }) {
  const agentId = params.id;
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const isNewAgent = searchParams.get('newAgent') === 'true';
  const [publicKeyCopied, setPublicKeyCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'config' | 'transactions'>('overview');

  const { data: agent, isLoading, error } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: async () => {
      const res = await apiClient.getAgent(agentId);
      return res.data.data;
    },
    refetchInterval: 5000,
  });

  const startMutation = useMutation({
    mutationFn: () => apiClient.startAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', agentId] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => apiClient.stopAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', agentId] });
    },
  });

  const copyPublicKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setPublicKeyCopied(true);
    setTimeout(() => setPublicKeyCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-constellation-blue to-constellation-indigo pb-20">
        <div className="container-base py-12 text-center">
          <div className="flex justify-center items-center gap-2">
            <div className="w-3 h-3 bg-constellation-cyan rounded-full animate-pulse"></div>
            <span className="text-constellation-silver">Loading agent details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-constellation-blue to-constellation-indigo pb-20">
        <div className="container-base py-12">
          <GlassCard className="p-8 text-center">
            <p className="text-constellation-silver mb-4">Agent not found</p>
            <Link href="/agents">
              <GlassButton variant="primary">Back to Agents</GlassButton>
            </Link>
          </GlassCard>
        </div>
      </div>
    );
  }

  const isRunning = agent.status === 'running';

  return (
    <div className="min-h-screen bg-gradient-to-b from-constellation-blue to-constellation-indigo pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-constellation-blue to-constellation-indigo/80 border-b border-constellation-cyan/20 py-8">
        <div className="container-base">
          <Link href="/agents" className="text-constellation-cyan hover:text-constellation-white transition-colors mb-4 inline-block">
            ← Back to Agents
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-constellation-white mb-2">{agentId}</h1>
              <div className="flex items-center gap-3">
                <StatusBadge status={isRunning ? 'active' : 'idle'} pulse={isRunning} />
                {isNewAgent && (
                  <span className="text-constellation-cyan text-sm">✨ New Agent Created</span>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              {isRunning ? (
                <GlassButton
                  variant="secondary"
                  onClick={() => stopMutation.mutate()}
                  disabled={stopMutation.isPending}
                >
                  {stopMutation.isPending ? 'Stopping...' : '⏸ Stop'}
                </GlassButton>
              ) : (
                <GlassButton
                  variant="primary"
                  onClick={() => startMutation.mutate()}
                  disabled={startMutation.isPending}
                >
                  {startMutation.isPending ? 'Starting...' : '▶ Start'}
                </GlassButton>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container-base py-12">
        {/* Hero Balance Card */}
        <div className="flex gap-3">
          {agent.status === "running" ? (
            <button
              onClick={() => stopMutation.mutate()}
              disabled={stopMutation.isPending}
              className="button-secondary flex items-center gap-2"
            >
              <FiPause className="w-4 h-4" />
              Stop
            </button>
          ) : (
            <button
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              className="button-primary flex items-center gap-2"
            >
              <FiPlay className="w-4 h-4" />
              Start
            </button>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Public Key */}
        <div className="card-base p-6">
          <p className="text-muted text-sm font-medium mb-3">Public Key</p>
          <div className="flex items-center gap-2">
            <code className="text-sm bg-slate-100 px-3 py-2 rounded flex-1 break-all font-mono">
              {agent.publicKey}
            </code>
            <button
              onClick={() => copyPublicKey(agent.publicKey)}
              className="p-2 hover:bg-slate-100 rounded transition"
            >
              {publicKeyCopied ? (
                <FiCheck className="w-4 h-4 text-green-600" />
              ) : (
                <FiCopy className="w-4 h-4 text-muted" />
              )}
            </button>
          </div>
        </div>

        {/* Balance */}
        <div className="card-base p-6">
          <p className="text-muted text-sm font-medium mb-3">Balance</p>
          <div>
            <p className="text-2xl font-bold mb-2">
              {agent.balance.native} XLM
            </p>
            {agent.balance.assets.length > 0 && (
              <div className="text-sm text-muted">
                {agent.balance.assets.length} asset(s)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card-base p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Recent Transactions</h2>
        {agent.recentTransactions.length > 0 ? (
          <div className="space-y-2">
            {agent.recentTransactions.slice(0, 5).map((tx: any) => (
              <div key={tx.hash} className="flex justify-between items-center p-3 bg-slate-50 rounded">
                <div>
                  <p className="font-mono text-sm">{tx.hash.substring(0, 16)}...</p>
                  <p className="text-muted text-xs">
                    {new Date(tx.timestamp).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    tx.status === "success"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {tx.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted text-sm">No transactions yet</p>
        )}
      </div>
    </div>
  );
}
