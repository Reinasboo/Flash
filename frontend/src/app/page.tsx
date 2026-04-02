'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const [animateMetrics, setAnimateMetrics] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [agentCount, setAgentCount] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);

  // Animate counters on mount
  useEffect(() => {
    setAnimateMetrics(true);
    const timer = setTimeout(() => {
      setWalletBalance(1250.45);
      setAgentCount(3);
      setTransactionCount(27);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-dark-900">
      {/* Hero Section with Animated Background */}
      <section className="relative overflow-hidden pt-16 pb-24">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-blue rounded-full blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-gradient-cyan rounded-full blur-3xl opacity-15 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-40 -left-20 w-64 h-64 bg-blue-600 rounded-full blur-3xl opacity-10"></div>
        </div>

        <div className="container-base relative z-10">
          {/* Hero Header */}
          <div className="max-w-4xl mx-auto mb-16 animate-slide-up">
            <div className="inline-block mb-6">
              <span className="px-4 py-2 rounded-full glass text-cyan-400 text-sm font-semibold flex items-center gap-2 w-fit">
                <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
                Live on Stellar Testnet
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="text-gradient">Autonomous</span>
              <br />
              <span className="text-white">Agent Wallet</span>
            </h1>

            <p className="text-xl text-slate-100 mb-8 max-w-2xl leading-relaxed">
              Secure, intent-based wallet automation powered by autonomous agents on the Stellar network.
              Enable your agents to make financial decisions with confidence.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/agents"
                className="btn-primary inline-flex items-center justify-center gap-2 group"
              >
                <span>🚀 Launch Agent</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>

              <button className="btn-secondary inline-flex items-center justify-center gap-2">
                <span>📖 Learn More</span>
              </button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Wallet Balance Card */}
            <div className="card group glass-hover">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-100 font-semibold">Total Balance</h3>
                <span className="text-2xl">💰</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold text-gradient ${animateMetrics ? 'animate-count-up' : ''}`}>
                  ${walletBalance.toFixed(2)}
                </span>
                <span className="text-success text-sm font-semibold">+5.2%</span>
              </div>
              <p className="text-slate-200 text-sm mt-2">XLM across all agents</p>
            </div>

            {/* Active Agents Card */}
            <div className="card group glass-hover">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-100 font-semibold">Active Agents</h3>
                <span className="text-2xl">🤖</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold text-cyan-400 ${animateMetrics ? 'animate-count-up' : ''}`}>
                  {agentCount}
                </span>
                <span className="text-success text-sm font-semibold">All healthy</span>
              </div>
              <p className="text-slate-200 text-sm mt-2">Running smoothly</p>
            </div>

            {/* Total Transactions Card */}
            <div className="card group glass-hover">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-100 font-semibold">Transactions</h3>
                <span className="text-2xl">⚙️</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold text-blue-400 ${animateMetrics ? 'animate-count-up' : ''}`}>
                  {transactionCount}
                </span>
                <span className="text-sm text-slate-200">this month</span>
              </div>
              <p className="text-slate-200 text-sm mt-2">All successful</p>
            </div>
          </div>
        </div>
      </section>

      {/* Agents Overview Section */}
      <section className="py-24 border-t border-cyan-900/20">
        <div className="container-base">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl font-bold mb-3">Your Agents</h2>
              <p className="text-slate-100">Manage and monitor all your autonomous agents</p>
            </div>
            <Link href="/agents/create" className="btn-primary">
              + Create Agent
            </Link>
          </div>

          {/* Agent Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Sample Agent Cards */}
            {[
              { name: 'Accumulator Bot', type: 'Accumulator', balance: '450.32 XLM', status: 'Active', icon: '📈' },
              { name: 'Distribution Bot', type: 'Distributor', balance: '320.15 XLM', status: 'Active', icon: '📤' },
              { name: 'Trading Bot', type: 'Accumulator', balance: '480.98 XLM', status: 'Active', icon: '📊' },
            ].map((agent, index) => (
              <div
                key={index}
                className="group cursor-pointer"
                style={{ animation: `slideInUp 0.5s ease-out ${index * 100}ms both` }}
              >
                <Link href={`/agents/1`} >
                  <div className="card glass-hover h-full">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <p className="text-cyan-400 text-sm font-semibold mb-1">{agent.type}</p>
                        <h3 className="text-xl font-bold text-white">{agent.name}</h3>
                      </div>
                      <span className="text-3xl">{agent.icon}</span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 mb-6">
                      <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
                      <span className="text-success text-sm font-semibold">{agent.status}</span>
                    </div>

                    {/* Balance */}
                    <div className="mb-6 pb-6 border-b border-cyan-900/20">
                      <p className="text-slate-100 text-sm mb-1">Wallet Balance</p>
                      <p className="text-2xl font-bold text-cyan-400">{agent.balance}</p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-200">View details →</span>
                      <div className="w-8 h-8 rounded-full bg-gradient-cyan/20 flex items-center justify-center group-hover:bg-gradient-cyan/40 transition-colors">
                        <svg className="w-4 h-4 text-cyan-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Transactions Section */}
      <section className="py-24 border-t border-cyan-900/20">
        <div className="container-base">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl font-bold mb-3">Recent Transactions</h2>
              <p className="text-slate-100">Latest activity across all agents</p>
            </div>
            <Link href="/transactions" className="text-cyan-400 font-semibold flex items-center gap-2 hover:gap-3 transition-all">
              View all <span>→</span>
            </Link>
          </div>

          {/* Transaction List */}
          <div className="space-y-3">
            {[
              { agent: 'Accumulator Bot', type: 'Deposit', amount: '+50 XLM', time: '2 hours ago', status: 'Success' },
              { agent: 'Distribution Bot', type: 'Transfer', amount: '-25 XLM', time: '4 hours ago', status: 'Success' },
              { agent: 'Trading Bot', type: 'Trade', amount: '+30 XLM', time: '6 hours ago', status: 'Success' },
              { agent: 'Accumulator Bot', type: 'Deposit', amount: '+75 XLM', time: '1 day ago', status: 'Success' },
            ].map((tx, index) => (
              <div
                key={index}
                className="card p-4 flex items-center justify-between group glass-hover"
                style={{ animation: `slideInUp 0.5s ease-out ${index * 75}ms both` }}
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-lg bg-gradient-blue/20 flex items-center justify-center">
                    <span className="text-lg">
                      {tx.type === 'Deposit' && '⬇️'}
                      {tx.type === 'Transfer' && '↔️'}
                      {tx.type === 'Trade' && '🔄'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <p className="font-semibold text-white">{tx.agent}</p>
                    <p className="text-sm text-slate-200">{tx.type} • {tx.time}</p>
                  </div>
                </div>

                {/* Amount & Status */}
                <div className="text-right">
                  <p className={`font-bold ${tx.amount.startsWith('+') ? 'text-success' : 'text-white'}`}>
                    {tx.amount}
                  </p>
                  <p className="text-sm text-success">{tx.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-24 border-t border-cyan-900/20">
        <div className="container-base">
          <div className="card-lg text-center bg-gradient-hero">
            <h2 className="text-4xl font-bold mb-4">Ready to build your first agent?</h2>
            <p className="text-xl text-slate-100 mb-8">
              Get started in minutes with our intuitive agent creation wizard.
            </p>
            <Link href="/agents/create" className="btn-primary inline-flex gap-2">
              <span>🚀 Create Your First Agent</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
              <p className="text-sm text-gray-500 mb-4">Network Status</p>
              <div className="flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 bg-success-500 rounded-full animate-pulse"></span>
                <span className="text-gray-900 font-medium">Stellar Testnet - Operational</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-spacing bg-gray-50">
        <div className="container-base">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need to manage autonomous agents and their wallets
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '🤖',
                title: 'Agent Management',
                description: 'Create, monitor, and control autonomous agents with ease',
              },
              {
                icon: '💳',
                title: 'Wallet Control',
                description: 'Secure wallet management with granular permission controls',
              },
              {
                icon: '⚡',
                title: 'Real-time Transactions',
                description: 'View and track all agent transactions in real-time',
              },
              {
                icon: '🔐',
                title: 'Enterprise Security',
                description: 'Bank-grade security with multi-layer authentication',
              },
              {
                icon: '📊',
                title: 'Analytics Dashboard',
                description: 'Comprehensive insights into agent activity and performance',
              },
              {
                icon: '🔗',
                title: 'Stellar Integration',
                description: 'Native integration with the Stellar blockchain network',
              },
            ].map((feature, idx) => (
              <Card
                key={idx}
                hoverable
                className="flex flex-col items-start"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-spacing">
        <div className="container-base">
          <div className="bg-gradient-hero text-white rounded-2xl px-8 py-16 md:px-16 md:py-24 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to get started?
            </h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Join thousands of teams managing autonomous agents with confidence
            </p>
            <Link href="/dashboard">
              <Button variant="secondary" size="lg" className="px-8">
                Access Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="container-base">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-bold mb-4">Agentic Wallet</h4>
              <p className="text-sm">Autonomous agent wallet management on Stellar</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition">Features</Link></li>
                <li><Link href="#" className="hover:text-white transition">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white transition">Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Developers</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition">Docs</Link></li>
                <li><Link href="#" className="hover:text-white transition">API</Link></li>
                <li><Link href="#" className="hover:text-white transition">SDK</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition">About</Link></li>
                <li><Link href="#" className="hover:text-white transition">Blog</Link></li>
                <li><Link href="#" className="hover:text-white transition">Contact</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm">&copy; 2024 Agentic Wallet. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0 text-sm">
              <Link href="#" className="hover:text-white transition">Privacy</Link>
              <Link href="#" className="hover:text-white transition">Terms</Link>
              <Link href="#" className="hover:text-white transition">Status</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
