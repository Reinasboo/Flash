'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';



export default function ByoaDashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: agentsData = [], isLoading } = useQuery({
    queryKey: ['byoa-agents'],
    queryFn: async () => {
      // BYOA agents endpoint coming from backend
      // For now, return empty array
      return [];
    },
  });

  if (!mounted) return <div className="min-h-screen bg-dark-900" />;

  const agents = agentsData || [];
  const activeCount = agents.filter((a: any) => a.status === 'active').length;
  const suspendedCount = agents.filter((a: any) => a.status === 'suspended').length;

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
                <span className="text-gradient">BYOA</span>
              </h1>
              <p className="text-xl text-slate-100">Bring Your Own Agent - Register external agents to submit intents via API</p>
            </div>
            <Link href="/byoa/register" className="btn-primary">
              + Register Agent
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card glass-hover">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-100 font-semibold">Total Agents</h3>
                <span className="text-2xl">🔗</span>
              </div>
              <p className="text-gradient text-3xl font-bold">{agents.length}</p>
              <p className="text-slate-200 text-sm mt-2">Registered</p>
            </div>

            <div className="card glass-hover">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-100 font-semibold">Active</h3>
                <span className="text-2xl">✅</span>
              </div>
              <p className="text-success text-3xl font-bold">{activeCount}</p>
              <p className="text-slate-200 text-sm mt-2">Running</p>
            </div>

            <div className="card glass-hover">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-100 font-semibold">Suspended</h3>
                <span className="text-2xl">⏸️</span>
              </div>
              <p className="text-warning text-3xl font-bold">{suspendedCount}</p>
              <p className="text-slate-200 text-sm mt-2">Paused</p>
            </div>
          </div>
        </div>
      </section>

      {/* Agents Section */}
      <section className="py-24 border-t border-cyan-900/20">
        <div className="container-base">
          <div className="mb-12">
            <h2 className="text-4xl font-bold mb-3">Registered Agents</h2>
            <p className="text-slate-100">Manage your external agents</p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card animate-pulse h-64"></div>
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div className="card text-center py-16 max-w-2xl mx-auto">
              <span className="text-6xl mb-4 block">🔗</span>
              <h3 className="text-2xl font-bold text-white mb-3">No agents registered yet</h3>
              <p className="text-slate-100 mb-6">Get started by registering your first external agent</p>
              <Link href="/byoa/register" className="btn-primary">
                Register Your First Agent
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent: any, index: number) => (
                <Link key={agent.id} href={`/byoa/${agent.id}`}>
                  <div
                    className="card glass-hover h-full"
                    style={{ animation: `slideInUp 0.5s ease-out ${index * 50}ms both` }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-xl font-bold text-white flex-1">{agent.name || 'Unnamed Agent'}</h3>
                      <span className="text-2xl">🤖</span>
                    </div>

                    {agent.description && (
                      <p className="text-slate-200 text-sm mb-4 line-clamp-2">{agent.description}</p>
                    )}

                    <div className="space-y-3 mb-6">
                      <div>
                        <p className="text-slate-200 text-xs uppercase tracking-wider">Wallet</p>
                        <p className="text-cyan-400 font-mono text-xs mt-1 truncate">
                          {agent.wallet?.substring(0, 20)}...
                        </p>
                      </div>
                      {agent.permissions && (
                        <>
                          <div>
                            <p className="text-slate-200 text-xs uppercase tracking-wider">Max Intents/Hour</p>
                            <p className="text-gradient font-semibold mt-1">
                              {agent.permissions.max_intents_per_hour || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-200 text-xs uppercase tracking-wider">Max Transfer</p>
                            <p className="text-gradient font-semibold mt-1">
                              {agent.permissions.max_transfer_amount || '—'} XLM
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-cyan-900/20">
                      <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                        agent.status === 'active' ? 'bg-success/20 text-success' :
                        agent.status === 'suspended' ? 'bg-warning/20 text-warning' :
                        'bg-error/20 text-error'
                      }`}>
                        {agent.status === 'active' ? '✓ Active' : agent.status === 'suspended' ? '⏸ Suspended' : '✗ Blocked'}
                      </span>
                      <span className="text-slate-200 text-sm">View →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 border-t border-cyan-900/20">
        <div className="container-base">
          <h2 className="text-4xl font-bold mb-12">How BYOA Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                num: '1',
                icon: '📝',
                title: 'Register Agent',
                desc: 'Create a new external agent and receive credentials',
              },
              {
                num: '2',
                icon: '🔒',
                title: 'Configure & Secure',
                desc: 'Set rate limits and permissions securely',
              },
              {
                num: '3',
                icon: '📤',
                title: 'Submit Intents',
                desc: 'Use REST API to submit transaction intents',
              },
              {
                num: '4',
                icon: '📊',
                title: 'Monitor & Verify',
                desc: 'Track execution and receive notifications',
              },
            ].map((step, idx) => (
              <div
                key={idx}
                className="card glass-hover"
                style={{ animation: `slideInUp 0.5s ease-out ${idx * 100}ms both` }}
              >
                <span className="text-4xl mb-4 block">{step.icon}</span>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-slate-200 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
