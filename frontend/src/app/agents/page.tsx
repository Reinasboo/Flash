'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Skeleton } from '@/components/Skeleton';

export const dynamic = 'force-dynamic';

interface Agent {
  agentId: string;
  publicKey: string;
  status: string;
  createdAt?: string;
}

export default function AgentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await apiClient.listAgents();
      return res.data.data || [];
    },
    refetchInterval: 5000,
  });

  const filteredAgents = agents.filter((agent: Agent) => {
    const matchesSearch = agent.agentId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="border-b border-gray-200 bg-gray-50 sticky top-16 z-40">
        <div className="container-base py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Agents</h1>
              <p className="text-gray-600">Manage and monitor all your autonomous agents</p>
            </div>
            <Link href="/agents/create">
              <Button variant="primary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Agent
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container-base py-8">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            fullWidth
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            }
          />
          <Select
            options={[
              { label: 'All Status', value: 'all' },
              { label: 'Running', value: 'running' },
              { label: 'Idle', value: 'idle' },
            ]}
            value={statusFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
            className="md:w-48"
          />
        </div>

        {/* Agents Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="h-64 animate-pulse bg-gray-100">
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredAgents.length === 0 ? (
          <Card className="p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No agents found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first agent to get started'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Link href="/agents/create">
                <Button variant="primary">Create First Agent</Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent: Agent) => (
              <Link key={agent.agentId} href={`/agents/${agent.agentId}`}>
                <Card hoverable className="h-full flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg break-all">{agent.agentId}</h3>
                      <code className="text-xs text-gray-500 line-clamp-1">{agent.publicKey}</code>
                    </div>
                  </div>

                  <div className="flex-1 mb-4">
                    <p className="text-sm text-gray-600">
                      Created {agent.createdAt ? new Date(agent.createdAt).toLocaleDateString() : 'Recently'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <Badge
                      variant={agent.status === 'running' ? 'success' : 'neutral'}
                      size="sm"
                      dot
                    >
                      {agent.status === 'running' ? 'Active' : 'Inactive'}
                    </Badge>
                    <span className="text-primary-600 font-medium text-sm">View →</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Results summary */}
        {!isLoading && filteredAgents.length > 0 && (
          <div className="mt-8 text-center text-gray-600">
            Showing {filteredAgents.length} of {agents.length} agents
          </div>
        )}
      </div>
    </div>
  );
}
