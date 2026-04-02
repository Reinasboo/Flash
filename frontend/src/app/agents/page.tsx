'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export const dynamic = 'force-dynamic';



export default function AgentsPage() {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await apiClient.listAgents();
      return res.data?.data || [];
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="min-h-screen bg-dark-900" />;

  return (
    <main className="min-h-screen bg-dark-900">
      {/* Header Section */}
      <section className="relative overflow-hidden pt-16 pb-16">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-blue rounded-full blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-gradient-cyan rounded-full blur-3xl opacity-15 animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="container-base relative z-10">
          <div className="flex items-start justify-between mb-12">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold mb-3">
                <span className="text-gradient">Agents</span>
              </h1>
              <p className="text-xl text-slate-100">Manage your autonomous agents</p>
            </div>
            <Link href="/agents/create" className="btn-primary">
              + New Agent
            </Link>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-3 w-fit">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                viewMode === 'grid'
                  ? 'bg-gradient-blue text-white'
                  : 'glass text-slate-300 hover:text-white'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-gradient-blue text-white'
                  : 'glass text-slate-300 hover:text-white'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </section>

      {/* Agents Section */}
      <section className="py-24 border-t border-cyan-900/20">
        <div className="container-base">
          {isLoading ? (
            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : ''}`}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="card animate-pulse h-64"></div>
              ))}
            </div>
          ) : agents && agents.length > 0 ? (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {agents.map((agent: any, index: number) => (
                    <Link key={agent.agentId} href={`/agents/${agent.agentId}`}>
                      <div
                        className="card glass-hover h-full"
                        style={{ animation: `slideInUp 0.5s ease-out ${index * 50}ms both` }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-xl font-bold text-white flex-1">{agent.agentId}</h3>
                          <span className="text-2xl">🤖</span>
                        </div>

                        <div className="flex items-center gap-2 mb-6">
                          <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
                          <span className="text-success text-sm font-semibold">Active</span>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <p className="text-slate-200 text-xs uppercase tracking-wider">Public Key</p>
                            <p className="text-cyan-400 font-mono text-xs mt-1 truncate">
                              {agent.publicKey?.substring(0, 24)}...
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-200 text-xs uppercase tracking-wider">Balance</p>
                            <p className="text-gradient font-semibold mt-1">
                              {agent.balance ? `${agent.balance} XLM` : 'Syncing...'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-cyan-900/20">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500" />
                          <span className="text-slate-200 text-sm">Click to view details</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {agents.map((agent: any, index: number) => (
                    <Link key={agent.agentId} href={`/agents/${agent.agentId}`}>
                      <div
                        className="card glass-hover px-6 py-4 flex items-center justify-between hover:bg-cyan-900/20"
                        style={{ animation: `slideInUp 0.5s ease-out ${index * 30}ms both` }}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <span className="text-2xl">🤖</span>
                          <div>
                            <h3 className="text-lg font-bold text-white">{agent.agentId}</h3>
                            <p className="text-cyan-400 font-mono text-xs">
                              {agent.publicKey?.substring(0, 40)}...
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-slate-200 text-xs uppercase tracking-wider">Balance</p>
                            <p className="text-gradient font-semibold">
                              {agent.balance ? `${agent.balance} XLM` : 'Syncing...'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
                            <span className="text-success text-sm font-semibold">Active</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="card text-center py-16 max-w-2xl mx-auto">
              <span className="text-6xl mb-4 block">🤖</span>
              <h3 className="text-2xl font-bold text-white mb-3">No agents yet</h3>
              <p className="text-slate-100 mb-6">Create your first agent to get started</p>
              <Link href="/agents/create" className="btn-primary">
                Create Agent
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
