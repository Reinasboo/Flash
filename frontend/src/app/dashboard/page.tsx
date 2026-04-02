'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export const dynamic = 'force-dynamic';



export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [animateMetrics, setAnimateMetrics] = useState(false);

  const { data: stats = {}, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await apiClient.getStats();
      return res.data?.data || {};
    },
    refetchInterval: 5000,
  });

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await apiClient.listAgents();
      return res.data?.data || [];
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    setMounted(true);
    setTimeout(() => setAnimateMetrics(true), 300);
  }, []);

  if (!mounted) return <div className="min-h-screen bg-dark-900" />;

  return (
    <main className="min-h-screen bg-dark-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-blue rounded-full blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-gradient-cyan rounded-full blur-3xl opacity-15 animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="container-base relative z-10">
          <div className="max-w-4xl mx-auto mb-16 animate-slide-up">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              <span className="text-gradient">Dashboard</span>
            </h1>
            <p className="text-xl text-slate-100 mb-8 max-w-2xl leading-relaxed">
              Overview of your agents, balances, and recent activity
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card group glass-hover">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-100 font-semibold">Total Balance</h3>
                <span className="text-2xl">💰</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold text-gradient ${animateMetrics ? 'animate-count-up' : ''}`}>
                  ${stats?.totalBalance?.toFixed(2) || '0.00'}
                </span>
              </div>
              <p className="text-slate-200 text-sm mt-2">XLM across all agents</p>
            </div>

            <div className="card group glass-hover">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-100 font-semibold">Active Agents</h3>
                <span className="text-2xl">🤖</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold text-cyan-400 ${animateMetrics ? 'animate-count-up' : ''}`}>
                  {agents?.length || 0}
                </span>
              </div>
              <p className="text-slate-200 text-sm mt-2">Running smoothly</p>
            </div>

            <div className="card group glass-hover">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-100 font-semibold">System Status</h3>
                <span className="text-2xl">✓</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
                <span className="text-success font-semibold">All Systems</span>
              </div>
              <p className="text-slate-200 text-sm mt-2">Operational</p>
            </div>
          </div>
        </div>
      </section>

      {/* Agents Section */}
      <section className="py-24 border-t border-cyan-900/20">
        <div className="container-base">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl font-bold mb-3">Your Agents</h2>
              <p className="text-slate-100">Quick overview of all agents</p>
            </div>
            <Link href="/agents/create" className="btn-primary">
              + Create Agent
            </Link>
          </div>

          {agentsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map((i) => (
                <div key={i} className="card animate-pulse h-64"></div>
              ))}
            </div>
          ) : agents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.slice(0, 3).map((agent: any, index: number) => (
                <Link key={agent.agentId} href={`/agents/${agent.agentId}`}>
                  <div className="card glass-hover h-full" style={{ animation: `slideInUp 0.5s ease-out ${index * 100}ms both` }}>
                    <h3 className="text-xl font-bold text-white mb-4">{agent.agentId}</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
                      <span className="text-success text-sm font-semibold">Active</span>
                    </div>
                    <p className="text-slate-200 text-sm">Public Key</p>
                    <p className="text-cyan-400 font-mono text-xs mt-2">{agent.publicKey?.substring(0, 20)}...</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <p className="text-slate-100 mb-4">No agents yet</p>
              <Link href="/agents/create" className="btn-primary">
                Create First Agent
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
