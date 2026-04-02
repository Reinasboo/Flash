'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Select } from '@/components/Select';
import { Badge } from '@/components/Badge';
import { Table } from '@/components/Table';

interface Transaction {
  hash: string;
  type: string;
  source: string;
  destination?: string;
  amount?: string;
  asset?: string;
  timestamp: number;
  status: 'success' | 'failed';
}

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      // Placeholder - will be implemented when backend endpoint is ready
      return [];
    },
    refetchInterval: 10000,
  });

  const filteredTransactions = (transactions || []).filter((tx: Transaction) => {
    const matchesSearch =
      tx.hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.destination?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const successCount = transactions.filter((tx: Transaction) => tx.status === 'success').length;
  const failedCount = transactions.filter((tx: Transaction) => tx.status === 'failed').length;
  const totalAmount = transactions
    .filter((tx: Transaction) => tx.status === 'success' && tx.amount)
    .reduce((sum: number, tx: Transaction) => sum + parseFloat(tx.amount || '0'), 0);

  const columns = [
    { key: 'type', label: 'Type', render: (val: any) => (
      <span>{val === 'payment' ? '💸' : '🔄'} {val}</span>
    )},
    { key: 'hash', label: 'Hash', render: (val: any) => (
      <code className="text-xs">{val?.substring(0, 16)}...</code>
    )},
    { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status', render: (val: any) => (
      <Badge variant={val === 'success' ? 'success' : 'error'} size="sm">
        {val}
      </Badge>
    )},
    { key: 'timestamp', label: 'Date', render: (val: any) => (
      <span>{new Date(val * 1000).toLocaleDateString()}</span>
    )},
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="border-b border-gray-200 bg-gray-50 sticky top-16 z-40">
        <div className="container-base py-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Transactions</h1>
            <p className="text-gray-600">View and track all wallet transactions</p>
          </div>
        </div>
      </div>

      <div className="container-base py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Total', value: transactions.length, icon: '📊' },
            { label: 'Successful', value: successCount, icon: '✅', color: 'success' },
            { label: 'Failed', value: failedCount, icon: '❌', color: 'error' },
            { label: 'Total Volume', value: `${totalAmount.toFixed(2)} XLM`, icon: '💰' },
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

        {/* Filters */}
        <div className="mb-8 flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Search by hash or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
              { label: 'All Statuses', value: 'all' },
              { label: 'Successful', value: 'success' },
              { label: 'Failed', value: 'failed' },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'success' | 'failed')}
            className="md:w-48"
          />

          <Button variant="secondary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </Button>
        </div>

        {/* Transactions Table */}
        {isLoading ? (
          <Card className="p-12 text-center">
            <div className="animate-spin inline-block">
              <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
            <p className="text-gray-600 mt-4">Loading transactions...</p>
          </Card>
        ) : filteredTransactions.length === 0 ? (
          <Card className="p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {transactions.length === 0 ? 'No transactions yet' : 'No matching transactions'}
            </h3>
            <p className="text-gray-600">
              {transactions.length === 0 
                ? 'Create agents and execute intents to see transactions'
                : 'Try adjusting your filters'}
            </p>
          </Card>
        ) : (
          <Table
            columns={columns}
            data={filteredTransactions}
            isLoading={isLoading}
            hoverable
            striped
          />
        )}
      </div>
    </div>
  );
}
