'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';

interface BYOAAgent {
  id: string;
  name: string;
  description?: string;
  wallet: string;
  status: 'active' | 'suspended' | 'blocked';
  created_at: string;
  balance?: Record<string, string>;
  permissions?: Record<string, any>;
  contact_email?: string;
}

export default function ByoaDashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: agentsData = [], isLoading } = useQuery({
    queryKey: ['byoa-agents'],
    queryFn: async () => {
      return [];
    },
    enabled: mounted,
  });

  if (!mounted) return null;

  const agents = agentsData || [];
  const activeCount = agents.filter((a: any) => a.status === 'active').length;
  const suspendedCount = agents.filter((a: any) => a.status === 'suspended').length;

  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="border-b border-gray-200 bg-gray-50 sticky top-16 z-40">
        <div className="container-base py-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">BYOA (Bring Your Own Agent)</h1>
              <p className="text-gray-600">
                Register external agents to securely submit intents via API
              </p>
            </div>
            <Link href="/byoa/register">
              <Button variant="primary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Register Agent
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container-base py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { label: 'Total Agents', value: agents.length, icon: '🔗' },
            { label: 'Active', value: activeCount, icon: '✅', color: 'success' },
            { label: 'Suspended', value: suspendedCount, icon: '⏸️', color: 'warning' },
          ].map((stat, idx) => (
            <Card key={idx}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <span className="text-3xl">{stat.icon}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Agents List */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Registered Agents</h2>

          {isLoading ? (
            <Card className="p-12 text-center">
              <div className="animate-spin inline-block">
                <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                </svg>
              </div>
            </Card>
          ) : agents.length === 0 ? (
            <Card className="p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No agents registered yet</h3>
              <p className="text-gray-600 mb-6">Get started by registering your first external agent</p>
              <Link href="/byoa/register">
                <Button variant="primary">Register Your First Agent</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent: BYOAAgent) => (
                <Link key={agent.id} href={`/byoa/${agent.id}`}>
                  <Card hoverable className="h-full flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg">{agent.name || 'Unnamed Agent'}</h3>
                        {agent.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {agent.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Wallet */}
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">Wallet</p>
                      <p className="text-xs font-mono text-gray-700 break-all">
                        {agent.wallet.substring(0, 16)}...{agent.wallet.substring(-4)}
                      </p>
                    </div>

                    {/* Status & Meta */}
                    <div className="flex-1 mb-4 space-y-2">
                      {agent.permissions && (
                        <>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Max Intents/Hour</span>
                            <span className="font-mono font-semibold">
                              {agent.permissions.max_intents_per_hour || '—'}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Max Transfer</span>
                            <span className="font-mono font-semibold">
                              {agent.permissions.max_transfer_amount || '—'} XLM
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <Badge
                        variant={agent.status === 'active' ? 'success' : agent.status === 'suspended' ? 'warning' : 'error'}
                        size="sm"
                        dot
                      >
                        {agent.status === 'active' ? 'Active' : agent.status === 'suspended' ? 'Suspended' : 'Blocked'}
                      </Badge>
                      <span className="text-primary-600 text-sm font-medium">View →</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* How It Works */}
        <Card
          header={
            <h2 className="text-lg font-bold text-gray-900">How BYOA Works</h2>
          }
        >
          <div className="space-y-6">
            {[
              {
                num: '1',
                title: 'Register Agent',
                desc: 'Create a new external agent and receive a unique control token for authentication',
              },
              {
                num: '2',
                title: 'Configure & Secure',
                desc: 'Set rate limits, permissions, and store your credentials securely (SHA-256 hashed)',
              },
              {
                num: '3',
                title: 'Submit Intents',
                desc: 'Use the REST API to submit transaction intents with proper authentication headers',
              },
              {
                num: '4',
                title: 'Monitor & Verify',
                desc: 'Track execution status, view logs, and receive webhook notifications on completion',
              },
            ].map((step, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600 font-bold">
                    {step.num}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                  <p className="text-gray-600 text-sm">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
