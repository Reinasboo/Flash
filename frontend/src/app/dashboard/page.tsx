'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Skeleton } from '@/components/Skeleton';
import { Table } from '@/components/Table';

export const dynamic = 'force-dynamic';

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await apiClient.getStats();
      return res.data.data;
    },
    refetchInterval: 5000,
  });

  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await apiClient.listAgents();
      return res.data.data || [];
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const columns = [
    { key: 'agentId', label: 'Agent ID' },
    { key: 'status', label: 'Status', render: (val: any) => (
      <Badge variant={val === 'running' ? 'success' : 'neutral'} size="sm" dot>
        {val === 'running' ? 'Active' : 'Inactive'}
      </Badge>
    )},
    { key: 'publicKey', label: 'Public Key', render: (val: any) => (
      <code className="text-xs text-gray-600">{val?.substring(0, 16)}...</code>
    )},
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="border-b border-gray-200 bg-gray-50 sticky top-16 z-40">
        <div className="container-base py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
              <p className="text-gray-600">Welcome back! Monitor and manage your autonomous agents</p>
            </div>
            <Link href="/agents/create">
              <Button variant="primary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Agent
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container-base py-12">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          {[
            { label: 'Total Agents', value: stats?.totalAgents || 0, icon: '🤖' },
            { label: 'Running', value: stats?.runningAgents || 0, icon: '▶️', color: 'success' },
            { label: 'Transactions', value: stats?.totalTransactions || 0, icon: '📊' },
            { label: 'External Agents', value: 0, icon: '🔗' },
            { label: 'Network', value: 'Testnet', icon: '⚡', isText: true },
          ].map((metric, idx) => (
            <Card key={idx} className="flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{metric.icon}</span>
                {metric.color === 'success' && (
                  <Badge variant="success" size="sm" dot>Active</Badge>
                )}
              </div>
              <p className="text-gray-600 text-sm mb-1">{metric.label}</p>
              {statsLoading ? (
                <Skeleton width="60%" height="32px" />
              ) : (
                <p className="text-3xl font-bold text-gray-900">
                  {metric.isText ? metric.value : metric.value}
                </p>
              )}
            </Card>
          ))}
        </div>

        {/* Agents Overview */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {/* Internal Agents */}
          <div className="lg:col-span-2">
            <Card
              header={
                <div className="flex justify-between items-center w-full">
                  <h2 className="text-lg font-bold text-gray-900">Internal Agents</h2>
                  <Link href="/agents">
                    <Button variant="tertiary" size="sm">View All →</Button>
                  </Link>
                </div>
              }
            >
              {agentsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton circle width="40px" height="40px" />
                      <div className="flex-1">
                        <Skeleton width="100%" height="20px" />
                        <Skeleton width="80%" height="16px" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : agents && agents.length > 0 ? (
                <div className="space-y-3">
                  {agents.slice(0, 3).map((agent: any, idx: number) => (
                    <Link key={agent.agentId} href={`/agents/${agent.agentId}`}>
                      <div className="p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-primary-300 cursor-pointer">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-gray-900">{agent.agentId}</p>
                            <code className="text-xs text-gray-500">{agent.publicKey?.substring(0, 20)}...</code>
                          </div>
                          <Badge
                            variant={agent.status === 'running' ? 'success' : 'neutral'}
                            size="sm"
                            dot
                          >
                            {agent.status === 'running' ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-gray-600 mb-4">No agents created yet</p>
                  <Link href="/agents/create">
                    <Button variant="primary" size="sm">Create First Agent</Button>
                  </Link>
                </div>
              )}
            </Card>
          </div>

          {/* External Agents Info */}
          <Card
            header={<h2 className="text-lg font-bold text-gray-900">External Agents</h2>}
            className="bg-gradient-to-br from-primary-50 to-blue-50"
          >
            <div className="text-center py-6">
              <p className="text-3xl mb-2">0</p>
              <p className="text-sm text-gray-600 mb-4">No BYOA agents registered</p>
              <Link href="/byoa/register">
                <Button variant="primary" size="sm" fullWidth>
                  Register Agent
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Access</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/agents">
              <Card hoverable className="h-full flex flex-col justify-between">
                <div>
                  <svg className="w-8 h-8 text-primary-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="font-bold text-gray-900 mb-1">Agents</h3>
                  <p className="text-sm text-gray-600">View and manage all autonomous agents</p>
                </div>
                <div className="text-primary-600 text-sm font-medium mt-4">→ View Agents</div>
              </Card>
            </Link>

            <Link href="/transactions">
              <Card hoverable className="h-full flex flex-col justify-between">
                <div>
                  <svg className="w-8 h-8 text-primary-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="font-bold text-gray-900 mb-1">Transactions</h3>
                  <p className="text-sm text-gray-600">View transaction history and details</p>
                </div>
                <div className="text-primary-600 text-sm font-medium mt-4">→ View Transactions</div>
              </Card>
            </Link>

            <Link href="/byoa">
              <Card hoverable className="h-full flex flex-col justify-between">
                <div>
                  <svg className="w-8 h-8 text-primary-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <h3 className="font-bold text-gray-900 mb-1">BYOA Program</h3>
                  <p className="text-sm text-gray-600">Bring Your Own Agent integration</p>
                </div>
                <div className="text-primary-600 text-sm font-medium mt-4">→ Manage BYOA</div>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
