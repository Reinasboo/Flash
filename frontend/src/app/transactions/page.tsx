'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';



export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await apiClient.getTransactions();
      return res.data?.data || [];
    },
    refetchInterval: 10000,
  });

  const filteredTransactions = (transactions || []).filter((tx: any) => {
    const matchesSearch =
      tx.hash?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.source?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.destination?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const successCount = transactions.filter((tx: any) => tx.status === 'success').length;
  const failedCount = transactions.filter((tx: any) => tx.status === 'failed').length;
  const totalAmount = transactions
    .filter((tx: any) => tx.status === 'success' && tx.amount)
    .reduce((sum: number, tx: any) => sum + parseFloat(tx.amount || '0'), 0);

  return (
    <main className="min-h-screen bg-dark-900">
      {/* Header Section */}
      <section className="relative overflow-hidden pt-16 pb-16">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-blue rounded-full blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-gradient-cyan rounded-full blur-3xl opacity-15 animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="container-base relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-3">
            <span className="text-gradient">Transactions</span>
          </h1>
          <p className="text-xl text-slate-100 max-w-2xl">View and track all wallet transactions in real-time</p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-t border-cyan-900/20">
        <div className="container-base">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card glass-hover">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-100 font-semibold">Total</h3>
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-3xl font-bold text-gradient">{transactions.length}</p>
              <p className="text-slate-200 text-sm mt-2">All transactions</p>
            </div>

            <div className="card glass-hover">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-100 font-semibold">Successful</h3>
                <span className="text-2xl">✅</span>
              </div>
              <p className="text-3xl font-bold text-success">{successCount}</p>
              <p className="text-slate-200 text-sm mt-2">Completed</p>
            </div>

            <div className="card glass-hover">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-100 font-semibold">Failed</h3>
                <span className="text-2xl">❌</span>
              </div>
              <p className="text-3xl font-bold text-error">{failedCount}</p>
              <p className="text-slate-200 text-sm mt-2">Errors</p>
            </div>

            <div className="card glass-hover">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-100 font-semibold">Volume</h3>
                <span className="text-2xl">💰</span>
              </div>
              <p className="text-3xl font-bold text-cyan-400">{totalAmount.toFixed(2)}</p>
              <p className="text-slate-200 text-sm mt-2">XLM Moved</p>
            </div>
          </div>
        </div>
      </section>

      {/* Transactions List */}
      <section className="py-24 border-t border-cyan-900/20">
        <div className="container-base">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-4xl font-bold mb-2">Transaction History</h2>
                <p className="text-slate-100">All recorded wallet transactions</p>
              </div>
              <button className="btn-secondary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="Search by hash or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 glass px-4 py-2 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'success' | 'failed')}
                className="glass px-4 py-2 rounded-lg text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500 md:w-48"
              >
                <option value="all" style={{ color: '#000' }}>All Statuses</option>
                <option value="success" style={{ color: '#000' }}>Successful</option>
                <option value="failed" style={{ color: '#000' }}>Failed</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="card text-center py-16">
              <div className="animate-spin inline-block">
                <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                </svg>
              </div>
              <p className="text-slate-100 mt-4">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="card text-center py-16">
              <span className="text-6xl mb-4 block">📭</span>
              <h3 className="text-2xl font-bold text-white mb-3">
                {transactions.length === 0 ? 'No transactions yet' : 'No matching transactions'}
              </h3>
              <p className="text-slate-100">
                {transactions.length === 0 
                  ? 'Create agents and execute intents to see transactions'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx: any, index: number) => (
                <div
                  key={tx.hash}
                  className="card glass-hover px-6 py-4 flex items-center justify-between hover:bg-cyan-900/20"
                  style={{ animation: `slideInUp 0.5s ease-out ${index * 30}ms both` }}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <span className="text-2xl">{tx.type === 'payment' ? '💸' : '🔄'}</span>
                    <div className="flex-1">
                      <p className="text-white font-semibold">{tx.type}</p>
                      <p className="text-cyan-400 font-mono text-xs">{tx.hash?.substring(0, 24)}...</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    {tx.amount && (
                      <div className="text-right">
                        <p className="text-slate-100 text-sm">{tx.amount} {tx.asset || 'XLM'}</p>
                        <p className="text-slate-200 text-xs">Amount</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                        tx.status === 'success' ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
                      }`}>
                        {tx.status === 'success' ? '✓ Success' : '✗ Failed'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
